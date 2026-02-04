'use client';

import { useState } from 'react';
import { EditorLayout, FileMap, ExecutionResult, EditorConfig } from '../../../../cloud-code-editor-package/src';
import '../../../../cloud-code-editor-package/src/styles/index.css';

type TestConfig = 'zero' | 'minimal' | 'full' | 'local-storage' | 'no-terminal' | 'no-filetree' | 'readonly' | 'custom-theme';

export default function TestEditorPage() {
  const [testConfig, setTestConfig] = useState<TestConfig>('zero');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getConfig = (): Partial<EditorConfig> => {
    console.log('⚙️ [TestEditor] Building config for:', testConfig);
    const baseFiles: FileMap = {
      'index.js': {
        content: `// Welcome to Cloud Code Editor Test!
console.log("Hello from Cloud Code Editor!");

function greet(name) {
  return \`Hello, \${name}!\`;
}

const message = greet("World");
console.log(message);

// Try editing this file and see the glassmorphism UI in action!
// The editor features:
// - Beautiful glassmorphism design
// - Monaco editor with syntax highlighting
// - File tree navigation
// - Terminal for code execution
// - Auto-save functionality`,
      },
      'README.md': {
        content: `# Test Project

This is a test project for the Cloud Code Editor package.

## Features

- 🎨 Glassmorphism UI with customizable blur and opacity
- 📝 Monaco Editor with full syntax highlighting
- 📁 File Tree Navigation
- 💻 Terminal with Code Execution
- 💾 Auto-save functionality
- 🎯 Full TypeScript support

## Getting Started

1. Edit the files in the sidebar to see the editor in action
2. Try resizing the panels by dragging the borders
3. Open multiple files and switch between them using tabs
4. Test the terminal (if execution is configured)

Enjoy testing! 🚀`,
      },
      'styles.css': {
        content: `/* Example CSS file */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #8b5cf6;
  --background: #1e1e2e;
  --text: #cdd6f4;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--background);
  color: var(--text);
}

.glass-effect {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}`,
      },
    };

    switch (testConfig) {
      case 'zero':
        // Zero config - test defaults (but still show some files for testing)
        const zeroConfig = {
          initialState: {
            files: baseFiles,
            activeFile: 'index.js',
          },
        };
        console.log('⚙️ [TestEditor] Zero config files:', Object.keys(baseFiles));
        return zeroConfig;

      case 'minimal':
        // Minimal config - just initial files
        return {
          initialState: {
            files: baseFiles,
            activeFile: 'index.js',
          },
        };

      case 'full':
        // Full config with all options
        return {
          layout: {
            showFileTree: true,
            showTerminal: true,
            showTabBar: true,
            fileTreeWidth: 256,
            terminalHeight: 256,
            resizable: true,
          },
          theme: {
            mode: 'dark',
            editorTheme: 'glass-dark',
          },
          editor: {
            fontSize: 14,
            lineNumbers: 'on',
            minimap: true,
            wordWrap: 'on',
            tabSize: 4,
          },
          autoSave: {
            enabled: true,
            debounceMs: 1000,
          },
          initialState: {
            projectId: 'test-project',
            files: baseFiles,
            activeFile: 'index.js',
            openFiles: ['index.js'],
          },
          callbacks: {
            onSave: (files: FileMap) => {
              console.log('✅ [TEST] Files saved:', Object.keys(files));
              toggleCheck('onSave-callback');
            },
            onExecute: (result: ExecutionResult) => {
              console.log('✅ [TEST] Execution result:', result);
              toggleCheck('onExecute-callback');
            },
            onFileSelect: (filePath: string) => {
              console.log('✅ [TEST] File selected:', filePath);
              toggleCheck('onFileSelect-callback');
            },
            onError: (error: Error) => {
              console.error('❌ [TEST] Error:', error);
              toggleCheck('onError-callback');
            },
          },
        };

      case 'local-storage':
        // Test with local storage (using memory storage for browser testing)
        // Note: Local file storage requires server-side, so we'll use memory for browser testing
        return {
          // For browser testing, we'll use memory storage
          // In a real server setup, you'd use: type: 'local', local: { basePath: './test-projects' }
          initialState: {
            files: baseFiles,
            activeFile: 'index.js',
          },
        };

      case 'no-terminal':
        // Test without terminal
        return {
          layout: {
            showTerminal: false,
          },
          initialState: {
            files: baseFiles,
            activeFile: 'index.js',
          },
        };

      case 'no-filetree':
        // Test without file tree
        return {
          layout: {
            showFileTree: false,
          },
          initialState: {
            files: baseFiles,
            activeFile: 'index.js',
          },
        };

      case 'readonly':
        // Test read-only mode
        return {
          editor: {
            readOnly: true,
          },
          initialState: {
            files: baseFiles,
            activeFile: 'index.js',
          },
        };

      case 'custom-theme':
        // Test custom theme
        return {
          theme: {
            mode: 'dark',
            editorTheme: 'glass-dark',
            colors: {
              primary: '#ff6b6b',
              secondary: '#4ecdc4',
              success: '#51cf66',
            },
          },
          initialState: {
            files: baseFiles,
            activeFile: 'index.js',
          },
        };

      default:
        return {};
    }
  };

  const testConfigs: { value: TestConfig; label: string; description: string }[] = [
    { value: 'zero', label: 'Zero Config', description: 'Test with no configuration (all defaults)' },
    { value: 'minimal', label: 'Minimal Config', description: 'Just initial files, everything else default' },
    { value: 'full', label: 'Full Config', description: 'All options configured' },
    { value: 'local-storage', label: 'Local Storage', description: 'Test with local file storage' },
    { value: 'no-terminal', label: 'No Terminal', description: 'Hide terminal panel' },
    { value: 'no-filetree', label: 'No File Tree', description: 'Hide file tree panel' },
    { value: 'readonly', label: 'Read Only', description: 'Editor in read-only mode' },
    { value: 'custom-theme', label: 'Custom Theme', description: 'Custom colors and theme' },
  ];

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Test Controls */}
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-xl font-bold text-white">🧪 Test Editor Configurations</h1>
          <div className="flex-1" />
          <div className="text-sm text-gray-400">
            Current: <span className="text-white font-semibold">{testConfigs.find(c => c.value === testConfig)?.label}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {testConfigs.map((config) => (
            <button
              key={config.value}
              onClick={() => setTestConfig(config.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                testConfig === config.value
                  ? 'bg-blue-500/30 text-blue-200 border border-blue-400/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
              title={config.description}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Quick Checklist */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-2">Quick Tests:</h3>
          <div className="flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={checklist['onSave-callback'] || false}
                onChange={() => {}}
                className="w-4 h-4"
              />
              onSave callback
            </label>
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={checklist['onExecute-callback'] || false}
                onChange={() => {}}
                className="w-4 h-4"
              />
              onExecute callback
            </label>
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={checklist['onFileSelect-callback'] || false}
                onChange={() => {}}
                className="w-4 h-4"
              />
              onFileSelect callback
            </label>
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={checklist['onError-callback'] || false}
                onChange={() => {}}
                className="w-4 h-4"
              />
              onError callback
            </label>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <EditorLayout key={testConfig} config={getConfig()} />
      </div>
    </div>
  );
}
