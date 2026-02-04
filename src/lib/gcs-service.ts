// GCS Service using Next.js API routes (server-side authentication)
export class GCSService {
  private bucketName: string;
  private apiBase: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    this.apiBase = "/api/gcs";
  }

  async uploadFile(filePath: string, content: string): Promise<void> {
    const response = await fetch(this.apiBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "upload",
        bucket: this.bucketName,
        path: filePath,
        content: content,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to upload file: ${response.statusText}`);
    }
  }

  async downloadFile(filePath: string): Promise<string> {
    const url = new URL(this.apiBase, window.location.origin);
    url.searchParams.set("action", "download");
    url.searchParams.set("bucket", this.bucketName);
    url.searchParams.set("path", filePath);

    const response = await fetch(url.toString());

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${filePath}`);
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to download file: ${response.statusText}`);
    }

    return await response.text();
  }

  async deleteFile(filePath: string): Promise<void> {
    const response = await fetch(this.apiBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "delete",
        bucket: this.bucketName,
        path: filePath,
      }),
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(error.error || `Failed to delete file: ${response.statusText}`);
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const url = new URL(this.apiBase, window.location.origin);
    url.searchParams.set("action", "list");
    url.searchParams.set("bucket", this.bucketName);
    url.searchParams.set("prefix", prefix);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to list files: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files.map((f: any) => f.name);
  }

  async fileExists(filePath: string): Promise<boolean> {
    const url = new URL(this.apiBase, window.location.origin);
    url.searchParams.set("action", "exists");
    url.searchParams.set("bucket", this.bucketName);
    url.searchParams.set("path", filePath);

    const response = await fetch(url.toString());

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.exists;
  }

  async getAllFiles(prefix: string): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    const filePaths = await this.listFiles(prefix);

    for (const filePath of filePaths) {
      // Remove prefix to get relative path
      const relativePath = filePath.replace(prefix, "").replace(/^\//, "");
      if (relativePath) {
        try {
          const content = await this.downloadFile(filePath);
          files[relativePath] = content;
        } catch (error) {
          console.warn(`Could not download file ${filePath}:`, error);
        }
      }
    }

    return files;
  }
}
