import type { DigestRow, Night } from '../digest/types.js';

const dash = (v: string | null) => (v === null ? '—' : v);

function DigestLine({ row }: { row: DigestRow }) {
  const warn = row.retries >= 3 || row.lastStatus === 'fail';
  const cls = warn ? 'warn' : undefined;
  return (
    <tr class={cls}>
      <td class={cls}>{row.job}</td>
      <td class={cls}>{dash(row.owner)}</td>
      <td class={cls}>{row.runs}</td>
      <td class={cls}>{row.retries}</td>
      <td class={cls}>{row.lastStatus}</td>
      <td class={cls}>{dash(row.lastError)}</td>
      <td class={cls}>{row.firstAt}</td>
      <td class={cls}>{row.lastAt}</td>
    </tr>
  );
}

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.badLines > 0 ? (
        <p class="mute">
          {night.badLines} {night.badLines === 1 ? 'line did not parse' : 'lines did not parse'}
        </p>
      ) : null}
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => (
              <DigestLine row={row} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
