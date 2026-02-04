"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

interface TerminalProps {
  output: string;
  isRunning?: boolean;
  onClear?: () => void;
  onClose?: () => void;
}

export function Terminal({ output, isRunning = false, onClear, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const lastOutputRef = useRef<string>("");

  // Only run on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !terminalRef.current) return;

    // Dynamically import xterm only on client
    Promise.all([
      import("xterm"),
      import("xterm-addon-fit"),
    ]).then(([xtermModule, fitAddonModule]) => {
      const { Terminal: XTerm } = xtermModule;
      const { FitAddon } = fitAddonModule;

      const xterm = new XTerm({
        theme: {
          background: "transparent",
          foreground: "#c9d1d9",
          cursor: "#c9d1d9",
        },
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
        lineHeight: 1.6,
      });

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.open(terminalRef.current!);
      fitAddon.fit();

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      return () => {
        xterm.dispose();
      };
    }).catch((error) => {
      console.error("Failed to load xterm:", error);
    });
  }, [isClient]);

  useEffect(() => {
    if (xtermRef.current && output !== undefined) {
      // Clear terminal if output starts with "Starting execution" and we're starting fresh
      if (output.startsWith("🚀 Starting execution") && lastOutputRef.current === "") {
        xtermRef.current.clear();
        lastOutputRef.current = "";
      }
      
      // Only write the new part (difference) to avoid rewriting everything
      const newPart = output.slice(lastOutputRef.current.length);
      if (newPart) {
        xtermRef.current.write(newPart);
      }
      lastOutputRef.current = output;
    }
  }, [output]);

  // Reset on clear
  useEffect(() => {
    if (!output && lastOutputRef.current) {
      lastOutputRef.current = "";
    }
  }, [output]);

  useEffect(() => {
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
    lastOutputRef.current = "";
    onClear?.();
  };

  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl glass-panel">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-200 tracking-wide">Terminal</span>
          {isRunning && (
            <span className="px-2 py-0.5 text-xs bg-blue-500/30 text-blue-300 rounded-md border border-blue-400/20">
              Running...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClear}
            className="h-7 w-7 p-0 hover:bg-white/10 text-gray-400 hover:text-gray-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-7 w-7 p-0 hover:bg-white/10 text-gray-400 hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 p-4 font-mono bg-transparent" style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace', backgroundColor: 'transparent' }} />
    </div>
  );
}
