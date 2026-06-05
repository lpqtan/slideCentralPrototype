"use client";

export default function LogoutButton() {
  return (
    <form
      action="/api/auth/logout"
      method="POST"
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      <button
        type="submit"
        className="rounded border border-[var(--color-border)] px-3 py-1 text-sm font-medium text-[var(--color-muted)] transition-colors hover:border-red-300 hover:text-red-500"
      >
        Sign Out
      </button>
    </form>
  );
}
