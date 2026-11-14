import type { NightDigest } from '../digest/types.js';

const dash = '—';

export function DigestPage({ night, digest }: { night: string; digest: NightDigest }) {
  return (
    <>
      <h1>digest {night}</h1>
      {digest.badLines > 0 && (
        <p class="warn">
          {digest.badLines} bad {digest.badLines === 1 ? 'line' : 'lines'} skipped
        </p>
      )}
      {digest.rows.length === 0 ? (
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
            {digest.rows.map((r) => (
              <tr>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td>
                  {r.retries}
                  {r.retries >= 3 && <span class="warn"> retries</span>}
                </td>
                <td>
                  {r.lastStatus === 'fail' ? <span class="warn">fail</span> : r.lastStatus}
                </td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
