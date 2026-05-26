### `POST /api/parse-pdf` — PDF Text Extraction
- **File:** `src/app/api/parse-pdf/route.ts`
- **Accepts:** `multipart/form-data` with `file` field (PDF)
- **Returns:** JSON `{ text: string }` or `{ error: string }`
- **Uses:** `pdfjs-dist` (Node.js compatible), extracts text from all pages
- **Used by:** Chat Briefing (file upload), Step 5 Content Upload (wizard)