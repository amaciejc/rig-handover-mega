import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DigestRow, ReadNight, RunStatus } from "./types.js";

type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error: string | null;
};

const isStatus = (v: unknown): v is RunStatus => v === "ok" || v === "retry" || v === "fail";

function parseLine(text: string): RunLine | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const { at, job, status, owner, error } = o;
  if (typeof at !== "string" || at === "" || typeof job !== "string" || job === "") return null;
  if (!isStatus(status)) return null;
  if (owner !== null && typeof owner !== "string") return null;
  if (error !== undefined && error !== null && typeof error !== "string") return null;
  return { at, job, status, owner, error: error ?? null };
}

export const readNight: ReadNight = async (runsDir, night) => {
  const text = await readFile(join(runsDir, `${night}.jsonl`), "utf8");
  const rows = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    const entry = parseLine(line);
    if (!entry) {
      badLines++;
      continue;
    }
    const row = rows.get(entry.job);
    if (!row) {
      rows.set(entry.job, {
        job: entry.job,
        owner: entry.owner,
        runs: 1,
        retries: entry.status === "retry" ? 1 : 0,
        lastStatus: entry.status,
        lastError: entry.error,
        firstAt: entry.at,
        lastAt: entry.at,
      });
      continue;
    }
    row.runs++;
    if (entry.status === "retry") row.retries++;
    row.lastStatus = entry.status;
    row.lastError = entry.error;
    row.lastAt = entry.at;
    row.owner ??= entry.owner;
  }

  return {
    rows: [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0)),
    badLines,
  };
};
