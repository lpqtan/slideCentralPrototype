import type { ReactNode } from "react";

export default function BriefingLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl">{children}</div>;
}
