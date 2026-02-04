import { NextRequest, NextResponse } from "next/server";

// Store active sandboxes (should match the one in execute route)
const activeSandboxes = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId } = body;

    const sandboxId = projectId || "default";
    const sandbox = activeSandboxes.get(sandboxId);

    if (sandbox) {
      try {
        await sandbox.close();
        activeSandboxes.delete(sandboxId);
        return NextResponse.json({ 
          message: "Execution stopped successfully" 
        });
      } catch (error: any) {
        console.error("Error closing sandbox:", error);
        // Remove from map even if close fails
        activeSandboxes.delete(sandboxId);
        return NextResponse.json({ 
          message: "Execution stopped (with warnings)",
          warning: error?.message 
        });
      }
    } else {
      return NextResponse.json({ 
        message: "No active execution found" 
      });
    }
  } catch (error: any) {
    console.error("E2B stop error:", error);
    return NextResponse.json(
      { 
        error: "Failed to stop execution",
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
