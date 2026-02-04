import { useEffect, useRef, useCallback } from "react";

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChanges(options: UseUnsavedChangesOptions) {
  const { hasUnsavedChanges, message = "You have unsaved changes. Are you sure you want to leave?" } = options;
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  const preventNavigation = useCallback(() => {
    if (hasUnsavedChanges && !isNavigatingRef.current) {
      return window.confirm(message);
    }
    return true;
  }, [hasUnsavedChanges, message]);

  return {
    preventNavigation,
    isNavigating: isNavigatingRef.current,
    setNavigating: (value: boolean) => {
      isNavigatingRef.current = value;
    },
  };
}
