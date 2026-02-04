import { GCSService } from "./gcs-service";
import { getDemoProject } from "./demo-project";

// Storage service that uses GCS or falls back to local storage
export class StorageService {
  private gcsService: GCSService | null = null;
  private useGCS: boolean;
  private projectId: string;
  private bucketName: string;

  constructor(projectId: string, bucketName?: string) {
    this.projectId = projectId;
    this.bucketName = bucketName || process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || "";
    this.useGCS = !!this.bucketName;

    if (this.useGCS) {
      this.gcsService = new GCSService(this.bucketName);
      console.log("Using Google Cloud Storage for file storage");
    } else {
      console.log("Using localStorage for file storage");
    }
  }

  private getStorageKey(filePath: string): string {
    return `adk-editor:${this.projectId}:${filePath}`;
  }

  async getFileTree() {
    // Always try GCS first if configured, then fallback to demo/localStorage
    if (this.useGCS && this.gcsService) {
      try {
        const prefix = `projects/${this.projectId}/`;
        const files = await this.gcsService.getAllFiles(prefix);
        if (Object.keys(files).length > 0) {
          // Build tree structure from files
          const tree = this.buildTree(files);
          return { files, tree };
        }
        // If no files in GCS, fall through to demo/localStorage
      } catch (error) {
        console.warn("Failed to load from GCS, falling back:", error);
      }
    }

    // For demo project, return demo files
    if (this.projectId === "demo-project") {
      const demo = getDemoProject();
      return {
        files: demo.files,
        tree: demo.tree,
      };
    }

    // Use localStorage
    const files: Record<string, string> = {};
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.getStorageKey(""))
    );

    for (const key of keys) {
      const filePath = key.replace(this.getStorageKey(""), "");
      files[filePath] = localStorage.getItem(key) || "";
    }

    const tree = this.buildTree(files);
    return { files, tree };
  }

  async readFile(filePath: string): Promise<string> {
    // Try GCS first if configured
    if (this.useGCS && this.gcsService) {
      try {
        const gcsPath = `projects/${this.projectId}/${filePath}`;
        return await this.gcsService.downloadFile(gcsPath);
      } catch (error) {
        console.warn(`Failed to read from GCS, trying fallback:`, error);
      }
    }

    // For demo project, return demo files
    if (this.projectId === "demo-project") {
      const demo = getDemoProject();
      const files = demo.files as Record<string, string>;
      if (files[filePath]) {
        return files[filePath];
      }
    }

    // Use localStorage
    const key = this.getStorageKey(filePath);
    return localStorage.getItem(key) || "";
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    // Always save to GCS if configured
    if (this.useGCS && this.gcsService) {
      try {
        const gcsPath = `projects/${this.projectId}/${filePath}`;
        await this.gcsService.uploadFile(gcsPath, content);
        console.log(`Saved to GCS: ${gcsPath}`);
        // Also save to localStorage as backup
        const key = this.getStorageKey(filePath);
        localStorage.setItem(key, content);
        return;
      } catch (error) {
        console.error("Failed to save to GCS:", error);
        // Fall through to localStorage
      }
    }

    // Use localStorage
    const key = this.getStorageKey(filePath);
    localStorage.setItem(key, content);
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.useGCS && this.gcsService) {
      const gcsPath = `projects/${this.projectId}/${filePath}`;
      await this.gcsService.deleteFile(gcsPath);
    } else {
      // Use localStorage
      const key = this.getStorageKey(filePath);
      localStorage.removeItem(key);
    }
  }

  async createFile(filePath: string, content: string = ""): Promise<void> {
    await this.writeFile(filePath, content);
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const content = await this.readFile(oldPath);
    await this.writeFile(newPath, content);
    await this.deleteFile(oldPath);
  }

  private buildTree(files: Record<string, string>): any[] {
    const tree: any[] = [];
    const seenPaths = new Set<string>();

    const addToTree = (pathParts: string[], currentLevel: any[], parentPath: string = "") => {
      if (pathParts.length === 0) return;

      const currentName = pathParts[0];
      const currentFullPath = parentPath ? `${parentPath}/${currentName}` : currentName;

      if (seenPaths.has(currentFullPath)) return;
      seenPaths.add(currentFullPath);

      const isFile = pathParts.length === 1;
      const node = {
        name: currentName,
        path: currentFullPath,
        type: isFile ? "file" : "directory",
        children: [] as any[],
      };

      if (isFile) {
        currentLevel.push(node);
      } else {
        const existingDir = currentLevel.find(
          (n) => n.name === currentName && n.type === "directory"
        );
        if (existingDir) {
          addToTree(pathParts.slice(1), existingDir.children, currentFullPath);
        } else {
          currentLevel.push(node);
          addToTree(pathParts.slice(1), node.children, currentFullPath);
        }
      }
    };

    for (const filePath of Object.keys(files).sort()) {
      const pathParts = filePath.split("/");
      addToTree(pathParts, tree);
    }

    return tree;
  }
}
