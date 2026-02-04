"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
}

export function MonacoEditor({
  value,
  onChange,
  language = "python",
  theme = "vs-dark",
  onMount,
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor;
    onMount?.(editor);

    // Configure keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save is handled by parent component
      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });
  };

  return (
    <div className="h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden glass-panel [&_.monaco-editor]:bg-transparent">
      <Editor
        height="100%"
        language={language}
        theme="glass-dark"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount as any}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: "on",
          formatOnPaste: true,
          formatOnType: true,
        }}
        beforeMount={(monaco) => {
          // Read the global CSS variable for consistent editor background
          const root = document.documentElement;
          const editorBg = getComputedStyle(root).getPropertyValue('--editor-background').trim() || '#1a1a1a';
          
          // Use a color that matches the glass panel effect (base + white overlay)
          // This creates a seamless glass effect without black backgrounds
          monaco.editor.defineTheme("glass-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
              // Use global variable for consistent colors throughout
              "editor.background": editorBg,
              "editorWidget.background": editorBg,
              "editorWidget.border": "rgba(255, 255, 255, 0.1)",
              "editor.lineHighlightBackground": "rgba(255, 255, 255, 0.05)",
              "editor.selectionBackground": "rgba(255, 255, 255, 0.15)",
              "minimap.background": editorBg,
              "minimap.selectionHighlight": "rgba(255, 255, 255, 0.2)",
              "minimap.selectionOccurrenceHighlight": "rgba(255, 255, 255, 0.15)",
            },
          });
        }}
      />
    </div>
  );
}

