import { useEffect, useRef, useCallback } from "react";
import { useDebounce } from "./useDebounce";

interface UseAutoSaveOptions {
  debounceMs?: number;
  maxIntervalMs?: number;
  onSave: (filePath: string, content: string) => Promise<void>;
  onSaveStatusChange?: (isSaving: boolean) => void;
  onSaveComplete?: (filePath: string, timestamp: Date) => void;
}

export function useAutoSave(
  filePath: string | null,
  content: string,
  options: UseAutoSaveOptions
) {
  const {
    debounceMs = 30000, // 30 seconds
    maxIntervalMs = 120000, // 2 minutes
    onSave,
    onSaveStatusChange,
    onSaveComplete,
  } = options;

  const debouncedContent = useDebounce(content, debounceMs);
  const lastSaveRef = useRef<Date | null>(null);
  const maxIntervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const lastSavedContentRef = useRef<string>("");
  const manualSaveRef = useRef(false);

  const save = useCallback(
    async (filePathToSave: string, contentToSave: string, isManual: boolean = false) => {
      if (isSavingRef.current || !filePathToSave) return;

      // Check if content has actually changed
      if (contentToSave === lastSavedContentRef.current) {
        console.log("Skipping save - no changes detected");
        return;
      }

      isSavingRef.current = true;
      onSaveStatusChange?.(true);

      try {
        await onSave(filePathToSave, contentToSave);
        lastSaveRef.current = new Date();
        lastSavedContentRef.current = contentToSave;
        if (isManual) {
          manualSaveRef.current = true;
          // Reset manual save flag after a short delay
          setTimeout(() => {
            manualSaveRef.current = false;
          }, 1000);
        }
        onSaveComplete?.(filePathToSave, lastSaveRef.current);
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        isSavingRef.current = false;
        onSaveStatusChange?.(false);
      }
    },
    [onSave, onSaveStatusChange, onSaveComplete]
  );

  // Debounced save
  useEffect(() => {
    if (!filePath || !debouncedContent) return;

    // Skip auto-save if manual save just happened
    if (manualSaveRef.current) {
      return;
    }

    // Only save if content has actually changed from last saved version
    const hasChanged = debouncedContent !== lastSavedContentRef.current;
    if (hasChanged && debouncedContent !== content) {
      save(filePath, debouncedContent, false);
    }
  }, [debouncedContent, filePath, save, content]);

  // Max interval save (force save every 2 minutes) - only if changed
  useEffect(() => {
    if (!filePath) return;

    const scheduleMaxIntervalSave = () => {
      if (maxIntervalTimerRef.current) {
        clearTimeout(maxIntervalTimerRef.current);
      }

      maxIntervalTimerRef.current = setTimeout(() => {
        if (filePath && content && content !== lastSavedContentRef.current) {
          save(filePath, content, false);
          scheduleMaxIntervalSave(); // Schedule next save
        } else {
          // Reschedule even if no changes (to keep checking)
          scheduleMaxIntervalSave();
        }
      }, maxIntervalMs);
    };

    scheduleMaxIntervalSave();

    return () => {
      if (maxIntervalTimerRef.current) {
        clearTimeout(maxIntervalTimerRef.current);
      }
    };
  }, [filePath, content, maxIntervalMs, save]);

  // Save on window blur - only if changed
  useEffect(() => {
    const handleBlur = () => {
      if (filePath && content && content !== lastSavedContentRef.current) {
        save(filePath, content, false);
      }
    };

    window.addEventListener("beforeunload", handleBlur);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("beforeunload", handleBlur);
      window.removeEventListener("blur", handleBlur);
    };
  }, [filePath, content, save]);

  return {
    save: (filePathToSave: string, contentToSave: string) => save(filePathToSave, contentToSave, true),
    lastSaved: lastSaveRef.current,
  };
}
