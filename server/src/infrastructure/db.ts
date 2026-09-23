import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/* PGLITE_DIR: فحوص القبول تعمل على نسخة من القاعدة لا على دفتر الشركة */
const PGLITE_DIR = process.env.PGLITE_DIR ?? path.join(SERVER_ROOT, ".pgdata", "pglite");
const DEFAULT_URL = process.env.DATABASE_URL ?? "postgresql://erp:erp@127.0.0.1:5432/startyx";

export type DbKind = "postgres" | "pglite";

export interface Db {
  kind: DbKind;
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

let opened: Db | null = null;
let embeddedStop: (() => Promise<void>) | null = null;

function wrapPg(client: { query: Function; end: Function }, kind: DbKind): Db {
  return {
    kind,
    async query(sql, params = []) {
      const r = await client.query(sql, params);
      return { rows: (r.rows ?? []) as Record<string, unknown>[] };
    },
    async exec(sql) {
      await client.query(sql);
    },
    async close() {
      await client.end();
      if (embeddedStop) {
        await embeddedStop();
        embeddedStop = null;
      }
    },
  };
}

async function tryTcp(url: string): Promise<Db | null> {
  try {
    const pg = await import("pg");
    const Client = pg.Client ?? (pg as { default?: { Client: typeof pg.Client } }).default?.Client;
    if (!Client) return null;
    const c = new Client({ connectionString: url, connectionTimeoutMillis: 800 });
    await c.connect();
    await c.query("SELECT 1");
    return wrapPg(c, "postgres");
  } catch {
    return null;
  }
}

async function tryEmbedded(): Promise<Db | null> {
  try {
    const mod = await import("embedded-postgres");
    const EmbeddedPostgres = (mod as { default?: new (o: object) => any }).default ?? (mod as unknown as new (o: object) => any);
    const dataDir = path.join(SERVER_ROOT, ".pgdata", "cluster");
    fs.mkdirSync(dataDir, { recursive: true });
    const ep = new EmbeddedPostgres({
      databaseDir: dataDir,
      user: "erp",
      password: "erp",
      port: 5432,
      persistent: true,
    });
    await ep.initialise();
    await ep.start();
    try {
      await ep.createDatabase("startyx");
    } catch {
      /* exists */
    }
    embeddedStop = () => ep.stop();
    const tcp = await tryTcp("postgresql://erp:erp@127.0.0.1:5432/startyx");
    if (tcp) return tcp;
    const client = ep.getPgClient();
    await client.connect();
    return wrapPg(client, "postgres");
  } catch (e) {
    process.stderr.write(`embedded-postgres skipped: ${(e as Error).message}\n`);
    return null;
  }
}

async function openPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  fs.mkdirSync(PGLITE_DIR, { recursive: true });
  const pg = new PGlite(PGLITE_DIR);
  if (typeof (pg as { waitReady?: Promise<unknown> }).waitReady !== "undefined") {
    await (pg as { waitReady: Promise<unknown> }).waitReady;
  }
  await pg.query("SELECT 1");
  return {
    kind: "pglite",
    async query(sql, params = []) {
      const r = await pg.query(sql, params as never[]);
      return { rows: ((r as { rows?: Record<string, unknown>[] }).rows ?? []) as Record<string, unknown>[] };
    },
    async exec(sql) {
      await pg.exec(sql);
    },
    async close() {
      if (typeof (pg as { close?: Function }).close === "function") await (pg as { close: Function }).close();
    },
  };
}

export async function openDb(): Promise<Db> {
  if (opened) return opened;
  const tcp = await tryTcp(DEFAULT_URL);
  if (tcp) {
    opened = tcp;
    return opened;
  }
  const emb = await tryEmbedded();
  if (emb) {
    opened = emb;
    return opened;
  }
  opened = await openPglite();
  return opened;
}

export function currentDb(): Db | null {
  return opened;
}

export function serverRoot(): string {
  return SERVER_ROOT;
}