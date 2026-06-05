"use client";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="grid h-dvh grid-rows-[1fr] bg-[var(--color-cpf-mint)] text-[var(--color-fg)] antialiased" suppressHydrationWarning>
        <main className="mx-auto flex w-full max-w-full flex-col overflow-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
