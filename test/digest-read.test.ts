import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readNight } from "../src/digest/read.js";

const tmp = () => mkdtemp(join(tmpdir(), "rig-runs-"));

describe("readNight", () => {
  it("reads the real night 2026-10-28", async () => {
    const d = await readNight("runs", "2026-10-28");
    expect(d.rows).toHaveLength(5);
    expect(d.badLines).toBe(1);
    const jobs = d.rows.map((r) => r.job);
    expect(jobs).toEqual([...jobs].sort());
    const f = d.rows.find((r) => r.job === "fixtures/refresh");
    expect(f).toMatchObject({ runs: 4, retries: 3, lastStatus: "ok", lastError: null });
    expect(f?.firstAt).toBe("2026-10-29T01:30:00+01:00");
  });

  it("returns no rows for an empty file", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "n.jsonl"), "");
    expect(await readNight(dir, "n")).toEqual({ rows: [], badLines: 0 });
  });

  it("keeps rows with a null owner and counts invalid lines", async () => {
    const dir = await tmp();
    const good = { at: "2026-10-29T05:41:09+01:00", job: "a", status: "fail", owner: null, error: "x" };
    const bad = { at: "t", job: "b", status: "weird", owner: null };
    await writeFile(join(dir, "n.jsonl"), `${JSON.stringify(good)}\n${JSON.stringify(bad)}\n[]\n`);
    const d = await readNight(dir, "n");
    expect(d.badLines).toBe(2);
    expect(d.rows).toEqual([
      { job: "a", owner: null, runs: 1, retries: 0, lastStatus: "fail", lastError: "x", firstAt: good.at, lastAt: good.at },
    ]);
  });

  it("rejects with ENOENT for a missing file", async () => {
    const dir = await tmp();
    await expect(readNight(dir, "nope")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
