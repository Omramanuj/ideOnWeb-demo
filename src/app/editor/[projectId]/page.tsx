"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { MonacoEditor } from "@/components/editor/MonacoEditor";
import { FileTree } from "@/components/editor/FileTree";
import { Terminal } from "@/components/editor/Terminal";
import { Toolbar } from "@/components/editor/Toolbar";
import { StatusBar } from "@/components/editor/StatusBar";
import { useEditorStore } from "@/store/editorStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { filesApi, executionApi } from "@/lib/api";
import type { FileTree as FileTreeType, Execution } from "@/types";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const {
    currentFile,
    files,
    unsavedFiles,
    isSaving,
    lastSaved,
    setCurrentFile,
    setFileContent,
    setOriginalContent,
    hasUnsavedChanges: hasUnsavedChangesInStore,
    markUnsaved,
    markSaved,
    setIsSaving,
    setLastSaved,
  } = useEditorStore();

  const [fileTree, setFileTree] = useState<FileTreeType | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<Execution | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const terminalOutputRef = useRef<string>("");

  // Load file tree
  useEffect(() => {
    if (projectId) {
      loadFileTree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Load file content when selected
  useEffect(() => {
    if (currentFile && projectId) {
      loadFileContent(currentFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile, projectId]);

  // Note: E2B executions are synchronous, so no polling needed
  // Execution completes immediately and returns result

  const loadFileTree = async () => {
    try {
      setLoading(true);
      setError(null);
      const tree = await filesApi.getTree(projectId);
      setFileTree(tree);
      // Load files into store and set original content
      Object.entries(tree.files).forEach(([path, content]) => {
        setFileContent(path, content);
        setOriginalContent(path, content);
        // Mark as saved since we just loaded it
        markSaved(path);
      });
      // Auto-select first file if available and no file is currently selected
      if (tree.tree.length > 0 && !currentFile) {
        const firstFile = findFirstFile(tree.tree);
        if (firstFile) {
          setCurrentFile(firstFile);
        }
      }
    } catch (error) {
      console.error("Error loading file tree:", error);
      setError(error instanceof Error ? error.message : "Failed to load project files");
    } finally {
      setLoading(false);
    }
  };

  const findFirstFile = (nodes: FileTreeType["tree"]): string | null => {
    for (const node of nodes) {
      if (node.type === "file") {
        return node.path;
      }
      if (node.children.length > 0) {
        const found = findFirstFile(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const loadFileContent = async (filePath: string) => {
    // Check if already loaded
    if (files[filePath]) return;

    try {
      const file = await filesApi.read(projectId, filePath);
      const content = file.content;
      setFileContent(filePath, content);
      // Set original content to track changes
      setOriginalContent(filePath, content);
      // Mark as saved since we just loaded it
      markSaved(filePath);
    } catch (error) {
      console.error("Error loading file:", error);
    }
  };

  const handleFileSelect = (filePath: string) => {
    if (unsavedFiles.has(currentFile || "")) {
      setPendingNavigation(() => () => {
        setCurrentFile(filePath);
        setPendingNavigation(null);
      });
      setShowSaveDialog(true);
    } else {
      setCurrentFile(filePath);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!currentFile) return;
    setFileContent(currentFile, value || "");
    markUnsaved(currentFile);
  };

  const saveFile = async (filePath: string, content: string) => {
    // Check if content has actually changed
    if (!hasUnsavedChangesInStore(filePath)) {
      console.log("No changes to save for:", filePath);
      return;
    }

    try {
      console.log("Saving file:", filePath);
      setIsSaving(true);
      await filesApi.write(projectId, filePath, content);
      markSaved(filePath);
      setLastSaved(new Date());
      // Update file in store - no need to reload from GCS
      setFileContent(filePath, content);
      // Don't reload file tree on every save - only reload when structure changes
    } catch (error) {
      console.error("Error saving file:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save hook
  const { save: autoSave } = useAutoSave(currentFile, files[currentFile || ""] || "", {
    onSave: saveFile,
    onSaveStatusChange: setIsSaving,
    onSaveComplete: (filePath, timestamp) => {
      markSaved(filePath);
      setLastSaved(timestamp);
    },
  });

  // Unsaved changes protection
  const hasUnsavedChanges = unsavedFiles.size > 0;
  useUnsavedChanges({ hasUnsavedChanges });

  const handleSave = async () => {
    if (!currentFile) return;
    try {
      await saveFile(currentFile, files[currentFile]);
    } catch (error) {
      alert("Failed to save file");
    }
  };

  const handleRun = async () => {
    if (isRunning) return;

    try {
      setIsRunning(true);
      setTerminalOutput("🚀 Starting execution...\n");
      setCurrentExecution(null);
      
      // Clear terminal output ref
      terminalOutputRef.current = "🚀 Starting execution...\n";
      setTerminalOutput(terminalOutputRef.current);
      
      const execution = await executionApi.execute(
        projectId,
        undefined,
        (data: string) => {
          // Append output as it comes in
          terminalOutputRef.current += data;
          setTerminalOutput(terminalOutputRef.current);
        }
      );
      
      setCurrentExecution(execution);
      
      // Final output update - only if not already included
      const finalOutput = terminalOutputRef.current;
      if (execution.output && !finalOutput.includes(execution.output)) {
        terminalOutputRef.current += execution.output;
        setTerminalOutput(terminalOutputRef.current);
      }
      
      if (execution.error) {
        const errorMsg = `\n[ERROR] ${execution.error}`;
        terminalOutputRef.current += errorMsg;
        setTerminalOutput(terminalOutputRef.current);
      }
      
      // Add completion message
      if (execution.status === "completed") {
        const completionMsg = `\n\n✅ Execution completed in ${execution.execution_time_ms}ms`;
        terminalOutputRef.current += completionMsg;
        setTerminalOutput(terminalOutputRef.current);
      } else {
        const failureMsg = `\n\n❌ Execution failed`;
        terminalOutputRef.current += failureMsg;
        setTerminalOutput(terminalOutputRef.current);
      }
      
      setIsRunning(false);
    } catch (error) {
      console.error("Error executing:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const detailedError = error instanceof Error && error.stack 
        ? `${errorMsg}\n\nDetails: ${error.stack}` 
        : errorMsg;
      setTerminalOutput((prev) => prev + `\n[ERROR] Failed to start execution: ${detailedError}`);
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      // Stop execution using projectId
      await executionApi.stop(projectId);
      setIsRunning(false);
      setTerminalOutput((prev) => prev + "\n\n⏹️ Execution stopped by user");
    } catch (error) {
      console.error("Error stopping execution:", error);
      setIsRunning(false);
    }
  };

  const handleCreateFile = async (parentPath: string, isDirectory: boolean) => {
    const fileName = prompt(isDirectory ? "Folder name:" : "File name:");
    if (!fileName) return;

    const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
    try {
      if (isDirectory) {
        // For directories, we don't actually create a file, just update the tree structure
        // This is handled by the file tree component
      } else {
        await filesApi.create(projectId, filePath, "");
      }
      await loadFileTree();
      if (!isDirectory) {
        setCurrentFile(filePath);
        // Set original content for new file
        setFileContent(filePath, "");
        setOriginalContent(filePath, "");
        // New file starts as saved (empty content)
        markSaved(filePath);
      }
    } catch (error) {
      console.error("Error creating file:", error);
      alert("Failed to create file");
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    try {
      await filesApi.delete(projectId, filePath);
      // Remove from store
      const newFiles = { ...files };
      delete newFiles[filePath];
      Object.keys(newFiles).forEach((key) => {
        if (key.startsWith(filePath + "/")) {
          delete newFiles[key];
        }
      });
      // Update store
      Object.keys(newFiles).forEach((key) => {
        setFileContent(key, newFiles[key]);
      });
      // Clear deleted files from store
      Object.keys(files).forEach((key) => {
        if (!newFiles[key]) {
          const keyToRemove = key;
          // Remove from store
          const updatedFiles = { ...files };
          delete updatedFiles[keyToRemove];
        }
      });
      
      if (currentFile === filePath) {
        setCurrentFile(null);
      }
      // Reload file tree to reflect changes
      await loadFileTree();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    }
  };

  const handleRenameFile = async (filePath: string) => {
    const newName = prompt("New name:", filePath.split("/").pop());
    if (!newName) return;

    const parentPath = filePath.split("/").slice(0, -1).join("/");
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    try {
      await filesApi.rename(projectId, filePath, newPath);
      // Update file in store
      if (files[filePath]) {
        setFileContent(newPath, files[filePath]);
        // Remove old file from store
        const updatedFiles = { ...files };
        delete updatedFiles[filePath];
        // Update all files that were under the old path
        Object.keys(files).forEach((key) => {
          if (key.startsWith(filePath + "/")) {
            const newKey = key.replace(filePath, newPath);
            setFileContent(newKey, files[key]);
            delete updatedFiles[key];
          }
        });
      }
      
      if (currentFile === filePath) {
        setCurrentFile(newPath);
      }
      // Reload file tree to reflect changes
      await loadFileTree();
    } catch (error) {
      console.error("Error renaming file:", error);
      alert("Failed to rename file");
    }
  };

  const handleSaveDialogSave = async () => {
    if (currentFile) {
      await saveFile(currentFile, files[currentFile]);
    }
    setShowSaveDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleSaveDialogDontSave = () => {
    if (currentFile) {
      markSaved(currentFile);
    }
    setShowSaveDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const getSaveStatus = (): "saved" | "saving" | "unsaved" => {
    if (isSaving) return "saving";
    if (currentFile && unsavedFiles.has(currentFile)) return "unsaved";
    return "saved";
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background)] text-white">
        <div className="text-center">
          <div className="text-lg mb-2">Loading project...</div>
          <div className="text-sm text-gray-400">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background)] text-white">
        <div className="text-center max-w-md">
          <div className="text-lg mb-2 text-red-400">Error loading project</div>
          <div className="text-sm text-gray-400 mb-4">{error}</div>
          <button
            onClick={() => {
              setError(null);
              loadFileTree();
            }}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--background)] text-white">
      <Toolbar
        onSave={handleSave}
        onRun={handleRun}
        onStop={handleStop}
        isSaving={isSaving}
        isRunning={isRunning}
      />
      <div className="flex-1 flex overflow-hidden gap-2 p-2">
        <div className="w-64 rounded-xl overflow-hidden">
          {fileTree && (
            <FileTree
              tree={fileTree.tree}
              currentFile={currentFile || null}
              onFileSelect={handleFileSelect}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
            />
          )}
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex-1 rounded-xl overflow-hidden">
            <MonacoEditor
              value={files[currentFile || ""] || ""}
              onChange={handleEditorChange}
              language="python"
            />
          </div>
          <div className="h-64 rounded-xl overflow-hidden">
            <Terminal
              output={terminalOutput}
              isRunning={isRunning}
              onClear={() => setTerminalOutput("")}
            />
          </div>
        </div>
      </div>
      <StatusBar
        saveStatus={getSaveStatus()}
        lastSaved={lastSaved}
        currentFile={currentFile}
        isConnected={true}
        showSavePrompt={showSaveDialog}
        onSavePromptSave={handleSaveDialogSave}
        onSavePromptDontSave={handleSaveDialogDontSave}
        onSavePromptCancel={() => {
          setShowSaveDialog(false);
          setPendingNavigation(null);
        }}
      />
    </div>
  );
}
