import { create } from "zustand";
import type { EditorState } from "@/types";

interface EditorStore extends EditorState {
  originalFiles: Record<string, string>; // Track original/saved content
  setCurrentFile: (filePath: string | null) => void;
  setFileContent: (filePath: string, content: string) => void;
  setOriginalContent: (filePath: string, content: string) => void;
  hasUnsavedChanges: (filePath: string) => boolean;
  markUnsaved: (filePath: string) => void;
  markSaved: (filePath: string) => void;
  clearUnsaved: () => void;
  setIsSaving: (isSaving: boolean) => void;
  setLastSaved: (date: Date | null) => void;
  reset: () => void;
}

const initialState: EditorState & { originalFiles: Record<string, string> } = {
  currentFile: null,
  files: {},
  originalFiles: {},
  unsavedFiles: new Set(),
  isSaving: false,
  lastSaved: null,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,
  setCurrentFile: (filePath) => set({ currentFile: filePath }),
  setFileContent: (filePath, content) =>
    set((state) => ({
      files: { ...state.files, [filePath]: content },
    })),
  setOriginalContent: (filePath, content) =>
    set((state) => ({
      originalFiles: { ...state.originalFiles, [filePath]: content },
    })),
  hasUnsavedChanges: (filePath) => {
    const state = get();
    const current = state.files[filePath] || "";
    const original = state.originalFiles[filePath] || "";
    return current !== original;
  },
  markUnsaved: (filePath) =>
    set((state) => ({
      unsavedFiles: new Set(state.unsavedFiles).add(filePath),
    })),
  markSaved: (filePath) =>
    set((state) => {
      const newSet = new Set(state.unsavedFiles);
      newSet.delete(filePath);
      // Update original content to match current content
      const currentContent = state.files[filePath] || "";
      return {
        unsavedFiles: newSet,
        originalFiles: { ...state.originalFiles, [filePath]: currentContent },
      };
    }),
  clearUnsaved: () => set({ unsavedFiles: new Set() }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (date) => set({ lastSaved: date }),
  reset: () => set(initialState),
}));
