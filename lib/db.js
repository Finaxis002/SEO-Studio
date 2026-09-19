import { MongoClient } from "mongodb";

let client = null;
let dbInstance = null;
let dbPromise = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  if (!dbPromise) {
    dbPromise = (async () => {
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
      if (!mongoUri) throw new Error("MONGODB_URI is not configured");
      if (!process.env.DB_NAME) throw new Error("DB_NAME is not configured");

      const nextClient = new MongoClient(mongoUri);
      await nextClient.connect();
      client = nextClient;
      dbInstance = nextClient.db(process.env.DB_NAME);
      return dbInstance;
    })().catch((error) => {
      client = null;
      dbInstance = null;
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export function clean(doc) {
  if (doc === null || doc === undefined || typeof doc !== "object") return doc;
  if (Array.isArray(doc)) return doc.map(clean);
  const { _id, ...rest } = doc;
  for (const k of Object.keys(rest)) {
    rest[k] = clean(rest[k]);
  }
  return rest;
}
