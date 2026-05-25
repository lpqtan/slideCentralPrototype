export default function WorkspacePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-fg)]">Open Design Workspace</h1>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Full Open Design interface at localhost:7457
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded border border-[var(--color-border)]">
        <iframe
          src="http://localhost:7457"
          className="h-full w-full border-0"
          title="Open Design Workspace"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
