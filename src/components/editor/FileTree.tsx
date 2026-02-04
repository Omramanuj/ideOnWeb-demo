"use client";

import { useState, useRef, useEffect } from "react";
import { File, Folder, FolderOpen, Plus, Trash2, Edit2 } from "lucide-react";
import type { FileTreeNode } from "@/types";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  tree: FileTreeNode[];
  currentFile: string | null;
  onFileSelect: (filePath: string) => void;
  onCreateFile?: (parentPath: string, isDirectory: boolean) => void;
  onDeleteFile?: (filePath: string) => void;
  onRenameFile?: (filePath: string) => void;
}

interface ContextMenu {
  x: number;
  y: number;
  filePath: string;
  isDirectory: boolean;
}

export function FileTree({
  tree,
  currentFile,
  onFileSelect,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu]);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      filePath: node.path,
      isDirectory: node.type === "directory",
    });
  };

  const handleNewFile = (parentPath: string) => {
    setContextMenu(null);
    onCreateFile?.(parentPath, false);
  };

  const handleNewFolder = (parentPath: string) => {
    setContextMenu(null);
    onCreateFile?.(parentPath, true);
  };

  const handleRename = (filePath: string) => {
    setContextMenu(null);
    onRenameFile?.(filePath);
  };

  const handleDelete = (filePath: string, name: string) => {
    setContextMenu(null);
    if (confirm(`Delete ${name}?`)) {
      onDeleteFile?.(filePath);
    }
  };

  const renderNode = (node: FileTreeNode, depth: number = 0, parentPath: string = "") => {
    const isExpanded = expanded.has(node.path);
    const isSelected = currentFile === node.path;
    const isDirectory = node.type === "directory";
    const isHovered = hoveredPath === node.path;

    return (
      <div key={node.path}>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/10 rounded-md group transition-colors",
            isSelected && "bg-white/15"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (isDirectory) {
              toggleExpanded(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node)}
          onMouseEnter={() => setHoveredPath(node.path)}
          onMouseLeave={() => setHoveredPath(null)}
        >
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-400" />
            ) : (
              <Folder className="w-4 h-4 text-blue-400" />
            )
          ) : (
            <File className="w-4 h-4 text-gray-400" />
          )}
          <span className="flex-1 text-sm truncate">{node.name}</span>
          {isDirectory && isHovered && onCreateFile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNewFile(node.path);
              }}
              className="opacity-70 hover:opacity-100 p-1 hover:bg-white/10 rounded transition-colors"
              title="New File"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
        {isDirectory && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1, node.path))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-gray-200 relative glass-panel">
      <div className="p-2">
        {tree.map((node) => renderNode(node))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg py-1 z-50 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {contextMenu.isDirectory && onCreateFile && (
            <>
              <button
                onClick={() => handleNewFile(contextMenu.filePath)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2 transition-colors rounded-md mx-1"
              >
                <Plus className="w-4 h-4" />
                New File
              </button>
              <button
                onClick={() => handleNewFolder(contextMenu.filePath)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2 transition-colors rounded-md mx-1"
              >
                <Folder className="w-4 h-4" />
                New Folder
              </button>
              <div className="border-t border-white/10 my-1" />
            </>
          )}
          {onRenameFile && (
            <button
              onClick={() => handleRename(contextMenu.filePath)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Rename
            </button>
          )}
          {onDeleteFile && (
            <>
              <div className="border-t border-white/10 my-1" />
              <button
                onClick={() => handleDelete(contextMenu.filePath, contextMenu.filePath.split("/").pop() || "")}
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-600 text-red-400 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
