/** @typedef {'before'|'soon'|'peak'|'past'|'unknown'} Season */
/** @typedef {{periodText?: string, periodKind?: string, startDate?: string, endDate?: string}} SeasonSpot */
export const seasonLabels = { before: '未到观赏季', soon: '即将到来', peak: '盛开季节', past: '已过盛开季节', unknown: '时间待确认' };
export const seasonColors = { before: '#93979c', soon: '#4d9163', peak: '#c44336', past: '#d2a528', unknown: '#777382' };
export const SOON_DAYS = 14;
/** @param {Date} [now] */
export function japanDate(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (/** @type {string} */ key) => p.find(x => x.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
/** @param {string} date */
export function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}
/** Parse typical season text into a recurring month/day window; never use admission/event dates as peak dates.
 * @param {string} text
 * @param {number} year
 * @returns {{start: string, end: string} | null}
 */
export function periodWindow(text, year) {
  const normalized = text.normalize('NFKC').replace(/\s+/g, '').replace(/[〜～―−–—]/g, '~').replace(/(\d{1,2})月(上旬|中旬|下旬|初旬)~(上旬|中旬|下旬|初旬)/g, '$1月$2~$1月$3');
  // Multi-window or uncertain periods require manual review rather than a fabricated single season.
  if (/[、,;；]|未定|不明|通年|\d{4}年/.test(normalized)) return null;
  const matches = [...normalized.matchAll(/(\d{1,2})月(?:(上旬|中旬|下旬|初旬)|(?:(\d{1,2})日))?/g)];
  if (matches.length < 1 || matches.length > 2 || (normalized.includes('~') && matches.length < 2)) return null;
  const first = matches[0];
  const last = matches[1] ?? first;
  function boundary(/** @type {RegExpMatchArray} */ m, /** @type {boolean} */ end, /** @type {number} */ y) {
    const month = Number(m[1]);
    if (month < 1 || month > 12) return '';
    const finalDay = new Date(Date.UTC(y, month, 0)).getUTCDate();
    const day = m[3] ? Number(m[3]) : (m[2] === '上旬' || m[2] === '初旬') ? (end ? 10 : 1) : m[2] === '中旬' ? (end ? 20 : 11) : m[2] === '下旬' ? (end ? finalDay : 21) : (end ? finalDay : 1);
    if (day < 1 || day > finalDay) return '';
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const start = boundary(first, false, year);
  const crossesYear = Number(last[1]) < Number(first[1]);
  const end = boundary(last, true, crossesYear ? year + 1 : year);
  return start && end && end >= start ? { start, end } : null;
}
/** @param {SeasonSpot} spot @param {number} year */
export function viewingWindow(spot, year) {
  if (spot.periodKind === 'dated') {
    // Only use structured dates when the source period explicitly specifies that year.
    const start = spot.startDate?.slice(0, 10) ?? '';
    const end = spot.endDate?.slice(0, 10) ?? '';
    const explicitYear = spot.periodText?.match(/(\d{4})年/)?.[1];
    return validDate(start) && validDate(end) && end >= start && explicitYear === start.slice(0, 4) ? { start, end } : null;
  }
  return spot.periodKind === 'typical' ? periodWindow(spot.periodText ?? '', year) : null;
}
/** @param {SeasonSpot} spot
 * @param {string} date Japanese local calendar date
 * @returns {Season}
 */
export function seasonForSpot(spot, date) {
  if (!validDate(date) || !spot.periodText) return 'unknown';
  const year = Number(date.slice(0, 4));
  const previous = spot.periodKind === 'typical' ? viewingWindow(spot, year - 1) : null;
  if (previous && previous.end.slice(0, 4) !== previous.start.slice(0, 4) && date <= previous.end && date >= previous.start) return 'peak';
  const window = viewingWindow(spot, year);
  if (!window) return 'unknown';
  if (date > window.end) return 'past';
  if (date >= window.start) return 'peak';
  const remaining = (Date.parse(window.start) - Date.parse(date)) / 86400000;
  return remaining <= SOON_DAYS ? 'soon' : 'before';
}
/** @param {SeasonSpot[]} spots @param {number} year */
export function regionPeriod(spots, year) {
  const windows = spots.map(s => viewingWindow(s, year)).filter(w => w !== null && Number(w.end.slice(0, 4)) >= year && Number(w.start.slice(0, 4)) <= year);
  if (!windows.length) return '时间待确认';
  const start = windows.map(w => w.start).sort()[0];
  const end = windows.map(w => w.end).sort().at(-1);
  return `${start.slice(5).replace('-', '/')} – ${end?.slice(5).replace('-', '/')}（景点时间跨度）`;
}
