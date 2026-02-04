"use client";

import { Button } from "@/components/ui/button";
import { Save, Play, Download, Settings, Square } from "lucide-react";

interface ToolbarProps {
  onSave: () => void;
  onRun: () => void;
  onStop?: () => void;
  onDownload?: () => void;
  onSettings?: () => void;
  isSaving?: boolean;
  isRunning?: boolean;
}

export function Toolbar({
  onSave,
  onRun,
  onStop,
  onDownload,
  onSettings,
  isSaving = false,
  isRunning = false,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50 glass-panel">
      <h1 className="text-lg font-semibold tracking-wide mr-4" style={{ fontFamily: 'Inter, Geist, sans-serif', letterSpacing: '0.05em' }}>
        ideOnWeb
      </h1>
      <Button
        variant="default"
        size="sm"
        onClick={onSave}
        disabled={isSaving || isRunning}
        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save"}
      </Button>
      {isRunning ? (
        <Button
          variant="default"
          size="sm"
          onClick={onStop}
          className="bg-red-500/30 hover:bg-red-500/40 border border-red-400/20 text-red-200 backdrop-blur-sm"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={onRun}
          disabled={isSaving}
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm disabled:opacity-50"
        >
          <Play className="w-4 h-4 mr-2" />
          Run
        </Button>
      )}
      {onDownload && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onDownload}
          className="bg-white/5 hover:bg-white/10 border border-white/20 text-white backdrop-blur-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      )}
      {onSettings && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSettings}
          className="hover:bg-white/10 text-white backdrop-blur-sm"
        >
          <Settings className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
