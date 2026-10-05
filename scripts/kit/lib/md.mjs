// site-kit v0.1.0
/** Markdown table. Cells are stringified; pipes escaped. */
export function table(headers, rows) {
  const cell = (v) => String(v ?? '').replace(/\|/g, '\\|');
  return [
    '| ' + headers.map(cell).join(' | ') + ' |',
    '|' + headers.map(() => '---').join('|') + '|',
    ...rows.map((r) => '| ' + r.map(cell).join(' | ') + ' |'),
  ].join('\n');
}

export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
export const round = (n, d = 1) => Number(Number(n).toFixed(d));
