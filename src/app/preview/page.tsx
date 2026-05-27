"use client";

import dynamic from "next/dynamic";

const PreviewContent = dynamic(() => import("./preview-content"), {
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-[var(--color-muted)]">Loading preview...</p>
    </div>
  ),
});

export default function PreviewPage() {
  return <PreviewContent />;
}
