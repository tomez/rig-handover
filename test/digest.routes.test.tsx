import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const NORMAL = '2026-10-28';
const EMPTY = '2026-10-27';
const BAD = '2026-10-26';
const MISSING = '2026-01-01';

const lines = [
  { at: '2026-10-28T01:00:00+01:00', job: 'sync-mail', status: 'ok', owner: 'ana' },
  { at: '2026-10-28T01:05:00+01:00', job: 'backup', status: 'retry', owner: 'bo', error: 'timeout' },
  { at: '2026-10-28T01:06:00+01:00', job: 'backup', status: 'fail', owner: 'bo', error: 'disk full' },
  { at: '2026-10-28T02:00:00+01:00', job: 'alerts', status: 'ok', owner: null },
];

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(join(dir, `${NORMAL}.jsonl`), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  writeFileSync(join(dir, `${EMPTY}.jsonl`), '');
  writeFileSync(
    join(dir, `${BAD}.jsonl`),
    [
      JSON.stringify(lines[0]),
      '{"at":"2026-10-26T01:00:00+01:00","job":"sy',
      JSON.stringify(lines[3]),
    ].join('\n') + '\n',
  );
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const app = () =>
  createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });

describe('GET /digest/:night', () => {
  it('200 for a night with a file, listing jobs', async () => {
    const res = await app().request(`/digest/${NORMAL}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain(`digest · ${NORMAL}`);
    expect(html).toContain('sync-mail');
    expect(html).toContain('backup');
    expect(html).toContain('alerts');
  });

  it('404 for a night with no file', async () => {
    const res = await app().request(`/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain(`no run log for ${MISSING}`);
  });

  it('shows "nothing ran" for the empty night', async () => {
    const res = await app().request(`/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('counts a bad line and says so', async () => {
    const res = await app().request(`/digest/${BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line did not parse');
    expect(html).toContain('sync-mail');
    expect(html).toContain('alerts');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 with rows for a night with a file', async () => {
    const res = await app().request(`/api/digest/${NORMAL}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(body.night).toBe(NORMAL);
    expect(body.rows.length).toBe(3);
    expect(body.badLines).toBe(0);
  });

  it('404 for a night with no file', async () => {
    const res = await app().request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log', night: MISSING });
  });

  it('empty night has rows []', async () => {
    const res = await app().request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: EMPTY, rows: [], badLines: 0 });
  });

  it('bad night reports badLines 1', async () => {
    const res = await app().request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { badLines: number };
    expect(body.badLines).toBe(1);
  });
});

describe('page and JSON agree', () => {
  it.each([NORMAL, BAD])('list the same jobs in the same order for %s', async (night) => {
    const json = (await (await app().request(`/api/digest/${night}`)).json()) as {
      rows: { job: string }[];
    };
    const html = await (await app().request(`/digest/${night}`)).text();
    const positions = json.rows.map((r) => html.indexOf(`>${r.job}</td>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
