// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  // Owner on the job's last line. null renders as `—`.
  owner: string | null;
  // Lines for this job, whatever their status.
  runs: number;
  // Lines with status `retry`.
  retries: number;
  lastStatus: RunStatus;
  // Error on the job's last line that had one; null if none did.
  lastError: string | null;
  // As written in the log, offset kept. Never converted to UTC.
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  // Sorted by job.
  rows: DigestRow[];
  // Lines that did not parse. Counted, never thrown.
  badLines: number;
};

// Reads runs/<night>.jsonl. null when the night has no file (or is not a YYYY-MM-DD night).
// An empty file is a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
