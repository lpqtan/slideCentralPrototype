"use client";

import { Suspense } from "react";
import BuildingContent from "./building-content";

export default function BuildingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-cpf-green)] border-t-transparent" />
          <p className="text-sm text-[var(--color-muted)]">Loading...</p>
        </div>
      </div>
    }>
      <BuildingContent />
    </Suspense>
  );
}
