import type { NightEntry, Status } from '../status.js';

function count(value: number | undefined): string {
  return value === undefined ? '—' : String(value);
}

function NightRow({ entry }: { entry: NightEntry }) {
  const c = entry.counts;
  return (
    <li>
      <a href={`/digest/${entry.night}`}>{entry.night}</a>
      {' '}
      <span class="mute">
        ok {count(c?.ok)} · retry {count(c?.retry)} · fail {count(c?.fail)}
      </span>
    </li>
  );
}

export function StatusBoard({ status }: { status: Status }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nights.map((entry) => (
            <NightRow entry={entry} />
          ))}
        </ul>
      )}
    </>
  );
}
