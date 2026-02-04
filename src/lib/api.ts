// New API layer using E2B and GCS directly
import { StorageService } from "./storage-service";
import { getDemoProject } from "./demo-project";
import type { FileTree } from "@/types";

// Storage service instance (will be initialized per project)
let storageService: StorageService | null = null;

// Projects API - simplified (just demo project for now)
export const projectsApi = {
  list: async () => {
    // Return demo project
    const demo = getDemoProject();
    return [
      {
        id: demo.id,
        name: demo.name,
        description: demo.description,
        user_id: "demo",
        s3_prefix: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  },
  get: async (id: string) => {
    if (id === "demo-project") {
      const demo = getDemoProject();
      return {
        id: demo.id,
        name: demo.name,
        description: demo.description,
        user_id: "demo",
        s3_prefix: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    throw new Error("Project not found");
  },
  create: async (data: { name: string; description?: string }) => {
    // For now, just return demo project
    // In future, could create new projects in GCS
    return {
      id: `project-${Date.now()}`,
      name: data.name,
      description: data.description || "",
      user_id: "demo",
      s3_prefix: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },
  delete: async (id: string) => {
    // For demo, just clear localStorage
    if (id === "demo-project") {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith("adk-editor:demo-project:")
      );
      keys.forEach((key) => localStorage.removeItem(key));
    }
  },
};

// Files API - using StorageService
export const filesApi = {
  getTree: async (projectId: string): Promise<FileTree> => {
    storageService = new StorageService(projectId);
    const result = await storageService.getFileTree();
    return result;
  },
  read: async (projectId: string, filePath: string) => {
    if (!storageService || storageService["projectId"] !== projectId) {
      storageService = new StorageService(projectId);
    }
    const content = await storageService.readFile(filePath);
    return { content, path: filePath };
  },
  write: async (projectId: string, filePath: string, content: string) => {
    if (!storageService || storageService["projectId"] !== projectId) {
      storageService = new StorageService(projectId);
    }
    await storageService.writeFile(filePath, content);
    return { message: "File saved successfully", path: filePath };
  },
  create: async (projectId: string, filePath: string, content: string = "") => {
    if (!storageService || storageService["projectId"] !== projectId) {
      storageService = new StorageService(projectId);
    }
    await storageService.createFile(filePath, content);
    return { message: "File created successfully", path: filePath };
  },
  rename: async (projectId: string, oldPath: string, newPath: string) => {
    if (!storageService || storageService["projectId"] !== projectId) {
      storageService = new StorageService(projectId);
    }
    await storageService.renameFile(oldPath, newPath);
    return { message: "File renamed successfully", old_path: oldPath, new_path: newPath };
  },
  delete: async (projectId: string, filePath: string) => {
    if (!storageService || storageService["projectId"] !== projectId) {
      storageService = new StorageService(projectId);
    }
    await storageService.deleteFile(filePath);
  },
};

// Execution API - using E2B via server-side API
export const executionApi = {
  execute: async (
    projectId: string,
    inputData?: Record<string, any>,
    onOutput?: (data: string) => void
  ) => {
    // Get all files for the project
    const fileTree = await filesApi.getTree(projectId);
    
    // Find main file (agent.py or main.py)
    let mainFile = "agent.py";
    if (!fileTree.files[mainFile]) {
      mainFile = Object.keys(fileTree.files).find((f) => f.endsWith(".py")) || mainFile;
    }

    if (!fileTree.files[mainFile]) {
      throw new Error("No Python file found to execute");
    }

    // Call server-side E2B API
    try {
      const response = await fetch("/api/e2b/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: fileTree.files[mainFile],
          files: fileTree.files,
          projectId: projectId,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Execution failed: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          const text = await response.text().catch(() => "");
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Simulate streaming by calling onOutput with the final output
      // In a real implementation, you could use Server-Sent Events or WebSocket for true streaming
      if (onOutput && result.output) {
        onOutput(result.output);
      }

      return {
        id: `exec-${Date.now()}`,
        project_id: projectId,
        status: (result.success ? "completed" : "failed") as "completed" | "failed",
        output: result.output || null,
        error: result.error || null,
        execution_time_ms: result.executionTimeMs,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (onOutput) {
        onOutput(`[ERROR] ${errorMsg}\n`);
      }
      throw error;
    }
  },
  getStatus: async (executionId: string) => {
    // For now, executions are synchronous
    throw new Error("Status checking not implemented for synchronous executions");
  },
  getOutput: async (executionId: string) => {
    throw new Error("Output retrieval not implemented for synchronous executions");
  },
  stop: async (projectId: string) => {
    try {
      const response = await fetch("/api/e2b/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: projectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to stop execution");
      }

      const data = await response.json();
      return { message: data.message || "Execution stopped" };
    } catch (error) {
      console.error("Error stopping execution:", error);
      throw error;
    }
  },
};
