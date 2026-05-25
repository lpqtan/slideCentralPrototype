import type { Metadata } from "next";
import Link from "next/link";
import DaemonStatusPill from "@/components/shared/DaemonStatusPill";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slide Central — CPF Presentation Builder",
  description: "Generate CPF-branded presentations with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grid h-dvh grid-rows-[auto_auto_1fr] bg-[var(--color-cpf-mint)] text-[var(--color-fg)] antialiased" suppressHydrationWarning>
        {/* Design bar */}
        <div className="h-[3px] bg-[var(--color-cpf-green)]" />

        {/* Header */}
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-cpf-green)]">
                <span className="text-lg font-black text-white">S</span>
              </div>
              <span className="text-sm font-semibold tracking-wide text-[var(--color-fg)]">
                Slide Central
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <DaemonStatusPill />
              <Link
                href="/workspace"
                className="text-sm text-[var(--color-fg-soft)] transition-colors hover:text-[var(--color-cpf-green)]"
              >
                Workspace
              </Link>
              <Link
                href="/settings"
                className="rounded border border-[var(--color-border)] px-3 py-1 text-sm font-medium text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-cpf-green)]"
              >
                AI Settings
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-col overflow-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
