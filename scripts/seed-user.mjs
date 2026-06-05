// Create the initial admin user in MongoDB.
// Usage: node --experimental-strip-types scripts/seed-user.mjs

import { getDb } from "../src/lib/mongodb.ts";
import { createUser } from "../src/lib/auth.ts";

async function main() {
  const username = process.argv[2] || "admin";
  const password = process.argv[3] || "slidecentral";

  try {
    const db = await getDb();
    await db.command({ ping: 1 });

    const user = await createUser(username, password);
    console.log(`User '${user.userId}' created successfully.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      console.log(`User '${username}' already exists.`);
    } else {
      console.error("Failed to create user:", error);
      process.exit(1);
    }
  } finally {
    process.exit(0);
  }
}

main();
