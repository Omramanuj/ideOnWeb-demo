import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@e2b/code-interpreter";

const activeSandboxes = new Map<string, Sandbox>();

export async function POST(req: NextRequest) {
  try {
    const { code, files, projectId } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing E2B_API_KEY in env" },
        { status: 500 }
      );
    }

    const key = projectId || "default";
    let sandbox = activeSandboxes.get(key);

    if (!sandbox) {
      sandbox = await Sandbox.create({ apiKey });
      activeSandboxes.set(key, sandbox);
    }

    const baseDir = "/home/user/project";

    // upload files safely inside baseDir
    if (files && typeof files === "object") {
      console.log("Uploading files:", Object.keys(files));

      for (const [path, content] of Object.entries(files)) {
        if (typeof content !== "string") continue;

        // make sure no absolute paths are used
        const safeName = path.replace(/^\/+/, "");
        const fullPath = `${baseDir}/${safeName}`;

        try {
          await sandbox.files.write(fullPath, content);
          console.log(`✓ Uploaded: ${fullPath} (${content.length} chars)`);
        } catch (fileError: any) {
          console.error(`✗ Failed to upload ${fullPath}:`, fileError);
          throw new Error(`Failed to upload file ${path}: ${fileError?.message || String(fileError)}`);
        }
      }
    }

    const start = Date.now();
    
    // Determine which file to run (prefer agent.py, fallback to first .py file)
    let mainFile = "agent.py";
    if (files && typeof files === "object") {
      const pyFiles = Object.keys(files).filter(f => f.endsWith(".py"));
      if (pyFiles.length > 0) {
        mainFile = pyFiles.find(f => f.replace(/^\/+/, "") === "agent.py") 
          ? "agent.py" 
          : pyFiles[0].replace(/^\/+/, "");
      }
    }

    const mainFilePath = `${baseDir}/${mainFile}`;
    console.log(`Executing: ${mainFile} from ${mainFilePath}`);

    // Read the file content to execute
    let codeToExecute = code;
    if (!codeToExecute && files && typeof files === "object") {
      codeToExecute = files[mainFile] || files[`/${mainFile}`] || "";
    }

    if (!codeToExecute) {
      // Try to read from sandbox filesystem
      try {
        codeToExecute = await sandbox.files.read(mainFilePath);
        console.log(`✓ Read file from sandbox: ${mainFilePath} (${codeToExecute.length} chars)`);
      } catch (readErr: any) {
        console.error(`✗ Failed to read file:`, readErr);
        return NextResponse.json(
          { success: false, error: `Failed to read file ${mainFile}: ${readErr?.message || String(readErr)}` },
          { status: 500 }
        );
      }
    }

    console.log(`Code to execute (${codeToExecute.length} chars):`, codeToExecute.substring(0, 100));

    // Use runCode() which properly captures stdout/stderr from print statements
    let outputBuffer = "";
    let errorBuffer = "";
    
    const execution = await sandbox.runCode(codeToExecute, {
      onStdout: (data: any) => {
        const line = typeof data === 'string' ? data : data.line || '';
        outputBuffer += line;
        console.log("[stdout]", data);
      },
      onStderr: (data: any) => {
        const line = typeof data === 'string' ? data : data.line || '';
        errorBuffer += line;
        console.log("[stderr]", data);
      },
    });

    console.log("Execution result:", {
      hasResults: !!execution.results,
      resultsCount: execution.results?.length || 0,
      hasError: !!execution.error,
      outputBufferLength: outputBuffer.length,
      errorBufferLength: errorBuffer.length,
    });

    // Collect output from stdout buffer (print statements)
    let output = outputBuffer;
    
    // Add stderr if present
    if (errorBuffer) {
      if (output) output += "\n";
      output += errorBuffer;
    }

    // Results contain the return value/display output (from last expression)
    if (execution.results && execution.results.length > 0) {
      for (const result of execution.results) {
        // Check various result formats
        const text = result.text || (result as any).__str__?.() || (result as any).toString?.() || "";
        if (text) {
          if (output) output += "\n";
          output += text;
        }
      }
    }

    // Check for errors
    let errorMessage: string | undefined;
    if (execution.error) {
      errorMessage = (execution.error as any).value || (execution.error as any).name || execution.error || "Execution error";
      let errorOutput = `[ERROR] ${errorMessage}`;
      if ((execution.error as any).traceback) {
        errorOutput += `\n${(execution.error as any).traceback}`;
      }
      if (output) output += "\n";
      output += errorOutput;
    }

    const executionTime = Date.now() - start;

    return NextResponse.json({
      success: !execution.error,
      output: output || "Execution completed with no output",
      error: errorMessage,
      executionTimeMs: executionTime,
    });
  } catch (err: any) {
    console.error("E2B execution error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// Optional: Clean up sandboxes on server shutdown
export async function DELETE(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    const key = projectId || "default";
    const sandbox = activeSandboxes.get(key);
    
    if (sandbox) {
      await sandbox.kill();
      activeSandboxes.delete(key);
      return NextResponse.json({ success: true, message: "Sandbox closed" });
    } 
    
    
    return NextResponse.json({ success: false, message: "No active sandbox found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}