import type { DigestRow, Night } from '../digest/types.js';

// Missing values render as `—`, never as an empty cell (styleguide). Times are shown as written
// in the log, offset included.
const dash = (v: string | null) => v ?? '—';

// A row is marked when a job retried three times or more, or failed at least once.
function isMarked(row: DigestRow): boolean {
  return row.retries >= 3 || row.fails > 0;
}

function DigestTableRow({ row }: { row: DigestRow }) {
  return (
    <tr class={isMarked(row) ? 'warn' : undefined}>
      <td>{row.job}</td>
      <td>{dash(row.owner)}</td>
      <td>{row.runs}</td>
      <td>{row.retries}</td>
      <td>{row.lastStatus}</td>
      <td>{dash(row.lastError)}</td>
      <td>{row.firstAt}</td>
      <td>{row.lastAt}</td>
    </tr>
  );
}

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
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
              <DigestTableRow row={row} />
            ))}
          </tbody>
        </table>
      )}
      {night.badLines > 0 ? <p class="warn">bad lines: {night.badLines}</p> : null}
    </>
  );
}
