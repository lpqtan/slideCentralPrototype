"use client";

import { Suspense } from "react";
import OutlineContent from "./outline-content";

export default function OutlinePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">Loading...</p>
      </div>
    }>
      <OutlineContent />
    </Suspense>
  );
}
