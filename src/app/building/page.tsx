"use client";

import dynamic from "next/dynamic";

const BuildingContent = dynamic(() => import("./building-content"), {
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-cpf-green)] border-t-transparent" />
        <p className="text-sm text-[var(--color-muted)]">Loading...</p>
      </div>
    </div>
  ),
});

export default function BuildingPage() {
  return <BuildingContent />;
}
