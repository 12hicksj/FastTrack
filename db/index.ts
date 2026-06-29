import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Defer the neon() call to request time so a missing DATABASE_URL during
// `next build`'s static analysis phase doesn't abort the build.
function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url));
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  },
});
