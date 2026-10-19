import { writeFile, rename } from 'node:fs/promises';
import { japanDate, seasonForSpot, viewingWindow } from '../lib/season.mjs';
export async function exportCatalog(snapshot) {
  const date = japanDate();
  const year = Number(date.slice(0, 4));
  const groups = new Map();
  function summarize(spots) {
    const seasons = { before: 0, soon: 0, peak: 0, past: 0, unknown: 0 };
    for (const s of spots) seasons[seasonForSpot(s, date)]++;
    const windows = spots.map(s => viewingWindow(s, year)).filter(w => w && Number(w.end.slice(0, 4)) >= year && Number(w.start.slice(0, 4)) <= year);
    return { count: spots.length, coordinates: spots.filter(s => s.coordinates).length, earliestStart: windows.map(w => w.start).sort()[0] ?? null, latestEnd: windows.map(w => w.end).sort().at(-1) ?? null, seasons };
  }
  for (const s of snapshot.spots) {
    if (!groups.has(s.prefecture)) groups.set(s.prefecture, []);
    groups.get(s.prefecture).push(s);
  }
  const regions = [...groups].map(([prefecture, spots]) => {
    const cities = new Map();
    for (const s of spots) { if (!cities.has(s.municipality)) cities.set(s.municipality, []); cities.get(s.municipality).push(s); }
    return { prefecture, ...summarize(spots), municipalities: [...cities].map(([municipality, places]) => ({ municipality, ...summarize(places), spotIds: places.map(s => s.id) })) };
  });
  const fields = ['id', 'name', 'prefecture', 'municipality', 'locality', 'periodText', 'onsetText', 'season', 'latitude', 'longitude', 'sourceUrl', 'fetchedAt'];
  const csvEscape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = '\ufeff' + [fields, ...snapshot.spots.map(s => fields.map(key => key === 'season' ? seasonForSpot(s, date) : key === 'latitude' ? s.coordinates?.[0] : key === 'longitude' ? s.coordinates?.[1] : s[key]))].map(row => row.map(csvEscape).join(',')).join('\n') + '\n';
  for (const [file, content] of [['data/regions.json', JSON.stringify({ sourceUrl: snapshot.sourceUrl, fetchedAt: snapshot.fetchedAt, coverage: snapshot.coverage, statusAsOfJapanDate: date, note: 'Date-based estimates from typical peak periods; regional earliest/latest is a span, not a uniform peak.', regions }, null, 2) + '\n'], ['data/spots.csv', csv]]) {
    await writeFile(`${file}.tmp`, content); await rename(`${file}.tmp`, file);
  }
}
