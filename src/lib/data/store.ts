import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { seedData } from "./seed";
import type { SiteData } from "./types";

/**
 * Storage adapter.
 *
 * The whole application talks to `DataStore` only (through repository.ts).
 * The default implementation is a single JSON file with atomic writes — more
 * than enough for one cafe's menu. To move to PostgreSQL, implement this
 * interface with Prisma and return it from `getStore()`; nothing else changes.
 */
export interface DataStore {
  read(): Promise<SiteData>;
  /** Applies `mutate` to a fresh copy and persists the result atomically. */
  update<T>(mutate: (data: SiteData) => T | Promise<T>): Promise<T>;
}

export function dataDir(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR || "./data");
}

export function uploadsDir(): string {
  return path.join(dataDir(), "uploads");
}

class JsonFileStore implements DataStore {
  private file = path.join(dataDir(), "store.json");
  private cache: { mtimeMs: number; data: SiteData } | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private seeding: Promise<void> | null = null;

  private async load(): Promise<SiteData> {
    try {
      const stat = await fs.stat(this.file);
      if (this.cache && this.cache.mtimeMs === stat.mtimeMs) return this.cache.data;
      const data = JSON.parse(await fs.readFile(this.file, "utf8")) as SiteData;
      this.cache = { mtimeMs: stat.mtimeMs, data };
      return data;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // First run: write the demo seed. Parallel first requests share one write.
      this.seeding ??= this.persist(seedData).finally(() => {
        this.seeding = null;
      });
      await this.seeding;
      return seedData;
    }
  }

  private async persist(data: SiteData): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, this.file);
    this.cache = null;
  }

  async read(): Promise<SiteData> {
    return structuredClone(await this.load());
  }

  update<T>(mutate: (data: SiteData) => T | Promise<T>): Promise<T> {
    // Serialise writers so concurrent admin actions never clobber each other.
    const run = this.queue.then(async () => {
      const data = structuredClone(await this.load());
      const result = await mutate(data);
      await this.persist(data);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

const globalStore = globalThis as unknown as { __mammothStore?: DataStore };

export function getStore(): DataStore {
  return (globalStore.__mammothStore ??= new JsonFileStore());
}
