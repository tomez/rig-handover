import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { nightCounts, readNight } from '../src/digest/read.js';

const runs = join(import.meta.dirname, '..', 'runs');

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight(runs, '2026-10-28')!;
  const row = (job: string) => night.rows.find((r) => r.job === job)!;

  it('has 5 jobs and 1 bad line', () => {
    expect(night.rows).toHaveLength(5);
    expect(night.badLines).toBe(1);
  });

  it('folds retries into fixtures/refresh', () => {
    const r = row('fixtures/refresh');
    expect(r.retries).toBe(3);
    expect(r.lastStatus).toBe('ok');
    expect(r.lastError).toBe('upstream 503');
    expect(r.firstAt).toBe('2026-10-29T01:30:00+01:00');
  });

  it('keeps fail and null owner', () => {
    expect(row('notes/backup').lastStatus).toBe('fail');
    expect(row('notes/backup').lastError).toBe('quota exceeded');
    expect(row('digest/render').owner).toBeNull();
  });

  it('counts by last status', () => {
    const c = nightCounts(night);
    expect(c.ok + c.retry + c.fail).toBe(5);
    expect(c.fail).toBe(1);
  });
});

describe('readNight edges', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));

  it('missing file is null', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull();
  });

  it('empty file is a night with no rows', () => {
    writeFileSync(join(dir, '2026-01-02.jsonl'), '\n\n');
    expect(readNight(dir, '2026-01-02')).toEqual({ night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('invalid night string is null', () => {
    expect(readNight(dir, '../etc/passwd')).toBeNull();
  });
});
