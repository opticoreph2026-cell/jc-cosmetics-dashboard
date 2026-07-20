import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "./prisma/client/client";

function parseDatabaseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port) || 5432,
    database: u.pathname.replace(/^\//, ""),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
  };
}

export function createPrismaClient() {
  const opts = parseDatabaseUrl(process.env.DATABASE_URL!);
  const pool = new pg.Pool({ ...opts });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
