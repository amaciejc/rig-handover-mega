export type RunStatus = "ok" | "retry" | "fail";

export type DigestRow = {
  job: string;
  /** null is rendered as an em dash by the view. */
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  /** ISO strings with the offset from the log; never converted to UTC. */
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  rows: DigestRow[];
  /** Lines that did not parse: counted, never thrown. */
  badLines: number;
};

export type ReadNight = (runsDir: string, night: string) => Promise<NightDigest>;
