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
      dbInstance = nextClient.db(process.env.DB_NAME);
      ensureIndexes(dbInstance).catch(() => {});
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

let indexesEnsured = false;
async function ensureIndexes(db) {
  if (indexesEnsured) return;
  indexesEnsured = true;
  try {
    const blogs = db.collection("blogs");
    await Promise.all([
      blogs.createIndex(
        { slug: 1 },
        { unique: true, sparse: true, background: true },
      ),
      blogs.createIndex({ id: 1 }, { unique: true, background: true }),
      blogs.createIndex(
        { status: 1, publishedAt: -1, updatedAt: -1 },
        { background: true },
      ),
      blogs.createIndex({ status: 1, category: 1 }, { background: true }),
      blogs.createIndex({ category: 1 }, { background: true }),
      blogs.createIndex({ tags: 1 }, { background: true }),
      blogs.createIndex({ author: 1 }, { background: true }),
      blogs.createIndex({ "seo.score": 1 }, { background: true }),
    ]);
  } catch (err) {
    // Indexes might already exist
  }
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
