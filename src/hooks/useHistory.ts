"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const MAX_HISTORY = 50;

export interface UseHistoryReturn<T> {
  state: T;
  push: (newState: T, skipHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * @param initial  Initial state value
 * @param enableKeyboard  Whether to register Ctrl+Z / Ctrl+Shift+Z on window.
 *                        Only ONE instance per page should set this to true to
 *                        avoid multiple competing keydown handlers.
 *                        Defaults to true for backwards compatibility.
 */
export function useHistory<T>(initial: T, enableKeyboard = true): UseHistoryReturn<T> {
  const [past, setPast] = useState<T[]>([]);
  const [current, setCurrent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);
  const currentRef = useRef(current);
  currentRef.current = current;

  const push = useCallback((newState: T, skipHistory = false) => {
    if (!skipHistory) {
      setPast((prev) => {
        const next = [...prev, currentRef.current];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
    }
    setCurrent(newState);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture((f) => [currentRef.current, ...f]);
      setCurrent(previous);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      setPast((p) => [...p, currentRef.current]);
      setCurrent(next);
      return prev.slice(1);
    });
  }, []);

  useEffect(() => {
    if (!enableKeyboard) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.shiftKey && e.key === "z") {
          e.preventDefault();
          redo();
        } else if (e.key === "z") {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enableKeyboard, undo, redo]);

  return {
    state: current,
    push,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
