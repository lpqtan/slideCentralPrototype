import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB ?? "slidecentral";

interface MongoCache {
  client: MongoClient;
  db: Db;
  promise: Promise<MongoCache>;
}

const globalCache = globalThis as typeof globalThis & { __mongoCache?: MongoCache };

export async function getDb(): Promise<Db> {
  if (globalCache.__mongoCache) {
    return globalCache.__mongoCache.db;
  }

  const client = new MongoClient(uri);
  const cache: MongoCache = {
    client,
    db: client.db(dbName),
    promise: client.connect().then(() => cache),
  };

  globalCache.__mongoCache = cache;
  await cache.promise;
  return cache.db;
}
