"use client";

import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StatusBarProps {
  saveStatus: "saved" | "saving" | "unsaved";
  lastSaved: Date | null;
  currentFile: string | null;
  isConnected?: boolean;
  showSavePrompt?: boolean;
  onSavePromptSave?: () => void;
  onSavePromptDontSave?: () => void;
  onSavePromptCancel?: () => void;
}

export function StatusBar({
  saveStatus,
  lastSaved,
  currentFile,
  isConnected = true,
  showSavePrompt = false,
  onSavePromptSave,
  onSavePromptDontSave,
  onSavePromptCancel,
}: StatusBarProps) {
  const getStatusText = () => {
    switch (saveStatus) {
      case "saving":
        return "Saving...";
      case "saved":
        return lastSaved ? `Saved at ${formatTime(lastSaved)}` : "Saved";
      case "unsaved":
        return "Unsaved changes";
      default:
        return "";
    }
  };

  const getStatusColor = () => {
    switch (saveStatus) {
      case "saving":
        return "text-yellow-400";
      case "saved":
        return "text-green-400";
      case "unsaved":
        return "text-orange-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-white/5 backdrop-blur-md text-sm relative">
      {showSavePrompt && (
        <div className="absolute inset-x-0 -top-16 bg-orange-500/30 backdrop-blur-md px-4 py-2 rounded-t-xl border-t border-orange-400/20 flex items-center justify-between">
          <span className="text-white text-sm font-medium">
            Unsaved changes. Save before switching?
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSavePromptCancel}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSavePromptDontSave}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              Don&apos;t Save
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onSavePromptSave}
              className="bg-blue-500/30 hover:bg-blue-500/40 border border-blue-400/20 text-blue-200 backdrop-blur-sm"
            >
              Save
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4">
        <span className={getStatusColor()}>{getStatusText()}</span>
        {currentFile && (
          <span className="text-gray-400 truncate max-w-md">{currentFile}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
        <span className="text-gray-400">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>
    </div>
  );
}
