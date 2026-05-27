import type { ReactNode } from "react";

export default function OutlineLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl">{children}</div>;
}
