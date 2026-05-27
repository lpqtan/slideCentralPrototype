"use client";

import dynamic from "next/dynamic";

const OutlineContent = dynamic(() => import("./outline-content"), {
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-[var(--color-muted)]">Loading...</p>
    </div>
  ),
});

export default function OutlinePage() {
  return <OutlineContent />;
}
