"use client";

import { Button } from "@/components/ui/button";

interface SavePromptDialogProps {
  isOpen: boolean;
  onSave: () => void;
  onDontSave: () => void;
  onCancel: () => void;
}

export function SavePromptDialog({
  isOpen,
  onSave,
  onDontSave,
  onCancel,
}: SavePromptDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-2">Unsaved Changes</h2>
        <p className="text-gray-300 mb-6">
          You have unsaved changes. Do you want to save them before leaving?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onDontSave}>
            Don&apos;t Save
          </Button>
          <Button variant="default" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
