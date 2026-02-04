export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  s3_prefix: string;
  created_at: string;
  updated_at: string;
}

export interface FileTree {
  files: Record<string, string>;
  tree: FileTreeNode[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children: FileTreeNode[];
}

export interface FileContent {
  content: string;
  path: string;
}

export interface Execution {
  id: string;
  project_id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  output: string | null;
  error: string | null;
  execution_time_ms: number | null;
  created_at: string;
}

export interface EditorState {
  currentFile: string | null;
  files: Record<string, string>; // path -> content
  unsavedFiles: Set<string>;
  isSaving: boolean;
  lastSaved: Date | null;
}
