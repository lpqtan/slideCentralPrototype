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

export function useHistory<T>(initial: T): UseHistoryReturn<T> {
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
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key === "z" || e.key === "Z") {
          e.preventDefault();
          if (e.shiftKey) { redo(); } else { undo(); }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return {
    state: current,
    push,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
