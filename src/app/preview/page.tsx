"use client";

import { Suspense } from "react";
import PreviewContent from "./preview-content";

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">Loading preview...</p>
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
