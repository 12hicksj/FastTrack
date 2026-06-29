import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Memoised so a warm serverless invocation reuses the same instance.
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  _db = drizzle(neon(url));
  return _db;
}

// Proxy defers neon() to first property access so a missing DATABASE_URL at
// build time (static analysis) doesn't abort the build. Methods are bound to
// the real Drizzle instance so `this` inside them is correct.
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as any)[prop];
    return typeof value === "function" ? (value as Function).bind(instance) : value;
  },
});
