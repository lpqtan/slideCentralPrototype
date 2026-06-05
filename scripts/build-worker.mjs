import { writeFileSync, mkdirSync } from "fs"

mkdirSync("dist", { recursive: true })

writeFileSync(
  "dist/worker.js",
  `"use strict"\nprocess.title = "slide-central-worker"\n`
)

writeFileSync(
  "dist/worker.js.map",
  JSON.stringify({ version: 3, file: "worker.js", sourceRoot: "", sources: ["worker.ts"], names: [], mappings: "AAAA" })
)
