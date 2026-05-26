"use client";

import { useState } from "react";

interface StepContentProps {
  additionalContent: string;
  onChange: (value: string) => void;
}

export default function StepContent({ additionalContent, onChange }: StepContentProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json() as { text?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Parse failed");

      onChange((additionalContent ? additionalContent + "\n\n" : "") + data.text);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to parse PDF");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Content Upload
        </label>
        <p className="text-xs text-[var(--color-muted)]">
          Paste text content or upload a PDF to provide additional context for the AI.
          This helps populate slide body content with real data rather than generic prompts.
          This step is optional.
        </p>
      </div>

      {/* File upload */}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium text-[var(--color-fg-soft)] transition-colors hover:border-[var(--color-cpf-green)]">
          {uploading ? "Parsing..." : "Upload PDF"}
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <span className="text-[10px] text-[var(--color-muted)]">
          Upload a PDF to extract text content
        </span>
      </div>

      {/* Textarea */}
      <textarea
        rows={10}
        value={additionalContent}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste additional content here — reports, meeting notes, proposals, data, or any text that should inform the slide content..."
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-cpf-paper)] px-4 py-3 text-xs text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-cpf-green)] focus:outline-none focus:ring-1 focus:ring-[var(--color-cpf-green)]"
      />

      <div className="text-right text-[10px] text-[var(--color-muted)]">
        {additionalContent.length.toLocaleString()} characters
      </div>
    </div>
  );
}
