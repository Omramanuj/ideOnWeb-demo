import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import path from "path";
import fs from "fs";

// Initialize GCS client with service account
let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) {
    let credentials: Record<string, unknown> | null = null;

    // 1. Prefer JSON in env (required for Vercel/serverless; no filesystem)
    const credsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (credsEnv) {
      try {
        credentials = JSON.parse(credsEnv) as Record<string, unknown>;
      } catch (error) {
        console.warn("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", error);
      }
    }

    // 2. Local dev: optional file path (e.g. GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json)
    if (!credentials && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      try {
        if (fs.existsSync(credPath)) {
          credentials = JSON.parse(fs.readFileSync(credPath, "utf-8")) as Record<string, unknown>;
        }
      } catch (error) {
        console.warn(`Failed to read credentials from ${credPath}:`, error);
      }
    }

    if (!credentials || !credentials.project_id) {
      throw new Error(
        "GCS credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS_JSON (Vercel) or GOOGLE_APPLICATION_CREDENTIALS (local file path)."
      );
    }

    storage = new Storage({
      credentials: credentials as object,
      projectId: String(credentials.project_id),
    });
  }
  return storage;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const bucketName = searchParams.get("bucket") || process.env.NEXT_PUBLIC_GCS_BUCKET_NAME;
    const filePath = searchParams.get("path");

    if (!bucketName) {
      return NextResponse.json({ error: "Bucket name not provided" }, { status: 400 });
    }

    const gcs = getStorage();
    const bucket = gcs.bucket(bucketName);

    switch (action) {
      case "download": {
        if (!filePath) {
          return NextResponse.json({ error: "File path required" }, { status: 400 });
        }
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        if (!exists) {
          return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
        const [content] = await file.download();
        return new NextResponse(content.toString("utf-8"), {
          headers: { "Content-Type": "text/plain" },
        });
      }

      case "list": {
        const prefix = searchParams.get("prefix") || "";
        const [files] = await bucket.getFiles({ prefix });
        return NextResponse.json({
          files: files.map((f) => ({
            name: f.name,
            size: f.metadata.size,
            updated: f.metadata.updated,
          })),
        });
      }

      case "exists": {
        if (!filePath) {
          return NextResponse.json({ error: "File path required" }, { status: 400 });
        }
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        return NextResponse.json({ exists });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("GCS API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, bucket: bucketName, path: filePath, content } = body;

    const bucket = bucketName || process.env.NEXT_PUBLIC_GCS_BUCKET_NAME;
    if (!bucket) {
      return NextResponse.json({ error: "Bucket name not provided" }, { status: 400 });
    }

    const gcs = getStorage();
    const gcsBucket = gcs.bucket(bucket);

    switch (action) {
      case "upload": {
        if (!filePath || content === undefined) {
          return NextResponse.json({ error: "File path and content required" }, { status: 400 });
        }
        const file = gcsBucket.file(filePath);
        await file.save(content, {
          contentType: "text/plain",
          metadata: {
            cacheControl: "public, max-age=3600",
          },
        });
        return NextResponse.json({ success: true, message: "File uploaded" });
      }

      case "delete": {
        if (!filePath) {
          return NextResponse.json({ error: "File path required" }, { status: 400 });
        }
        const file = gcsBucket.file(filePath);
        await file.delete();
        return NextResponse.json({ success: true, message: "File deleted" });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("GCS API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
