// Personal-use catalog importer: serial requests, cache, checkpoint and coverage report.
import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { sitemapUrls, parseCatalogPage, parseDetailPage, parseCoordinates } from './catalog.mjs';
import { exportCatalog } from './export.mjs';
const BASE = 'https://koyo.walkerplus.com';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const refresh = process.argv.includes('--refresh');
const skipMaps = process.argv.includes('--skip-maps');
const cacheDir = 'data/.cache';
await mkdir(cacheDir, { recursive: true });
let lock;
try { lock = await open('data/.sync.lock', 'wx'); }
catch { throw new Error('Another sync may be running. If it crashed, remove data/.sync.lock before resuming.'); }
await lock.writeFile(String(process.pid));
let lastRequest = 0;
async function get(url) {
  if (new URL(url).origin !== BASE) throw new Error('Unexpected host');
  const path = `${cacheDir}/${createHash('sha256').update(url).digest('hex')}.json`;
  if (!refresh) { try { return JSON.parse(await readFile(path, 'utf8')); } catch {} }
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(Math.max(0, 1200 - (Date.now() - lastRequest)));
    lastRequest = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'MomijiChecklist/0.2 (local personal-use catalog)' }, redirect: 'error' });
      if (response.status === 403 || response.status === 429) {
        const error = new Error(`Site requested stop: HTTP ${response.status}`); error.stop = true; throw error;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = { html: await response.text(), fetchedAt: new Date().toISOString() };
      await writeFile(path, JSON.stringify(result));
      return result;
    } catch (error) {
      if (error.stop || attempt === 2) throw error;
      await sleep(2500 * (attempt + 1));
    }
  }
}
async function atomic(path, data) {
  await writeFile(`${path}.tmp`, JSON.stringify(data, null, 2) + '\n');
  await rename(`${path}.tmp`, path);
}
try {
  const robots = (await get(`${BASE}/robots.txt`)).html;
  // Fail closed if site policy changes; no attempt to bypass restrictions.
  if (/Disallow:\s*\//i.test(robots)) throw new Error('robots.txt contains a restriction; review before continuing');
  const index = (await get(`${BASE}/sitemap_detail.xml`)).html;
  const expectedUrls = [...new Set(sitemapUrls(index).filter(url => /^https:\/\/koyo\.walkerplus\.com\/detail\/ar\d+e\d+\/$/.test(url)))];
  if (!expectedUrls.length) throw new Error('No detail pages discovered; old snapshot preserved.');
  const expected = new Set(expectedUrls);
  const lists = sitemapUrls((await get(`${BASE}/sitemap_list.xml`)).html).filter(url => /^https:\/\/koyo\.walkerplus\.com\/list\/ar\d{2}(?!00)\d{2}\/(?:ct\d+\/)?(?:\d+\.html)?$/.test(url));
  if (!lists.length) throw new Error('No prefecture list pages discovered');
  const spots = new Map();
  const errors = [];
  const seen = new Set();
  let old = {};
  try { old = JSON.parse(await readFile('data/spots.json', 'utf8')); } catch {}
  const oldById = new Map((old.spots ?? []).map(s => [s.id, s]));
  const oldCoordinates = new Map((old.spots ?? []).filter(s => s.coordinates).map(s => [s.id, s.coordinates]));
  async function checkpoint(phase) {
    const sorted = [...spots.values()].sort((a, b) => a.id.localeCompare(b.id)).map((s, i) => ({ ...s, rank: i + 1 }));
    const coordinatesCount = sorted.filter(s => s.coordinates).length;
    const report = { phase, expected: expected.size, collected: sorted.length, coordinates: coordinatesCount, missing: expectedUrls.filter(url => !spots.has(url)), errors, updatedAt: new Date().toISOString() };
    await atomic('data/sync-report.json', report);
    if (sorted.length) await atomic('data/spots.json', { sourceUrl: `${BASE}/`, fetchedAt: report.updatedAt, coverage: { expected: expected.size, collected: sorted.length, coordinates: coordinatesCount, phase }, spots: sorted });
  }
  function add(s, fetchedAt) {
    if (!expected.has(s.sourceUrl)) return;
    spots.set(s.sourceUrl, { ...s, coordinates: oldCoordinates.get(s.id) ?? null, coordinatesFetchedAt: oldById.get(s.id)?.coordinatesFetchedAt ?? null, fetchedAt });
  }
  for (let i = 0; i < lists.length; i++) {
    const url = lists[i];
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const page = await get(url);
      const result = parseCatalogPage(page.html, url);
      for (const s of result.spots) add(s, page.fetchedAt);
      for (const next of result.pagination) if (!lists.includes(next)) lists.push(next);
      console.log(`LIST ${i + 1}/${lists.length}: ${spots.size}/${expected.size} places (${url})`);
    } catch (error) { if (error.stop) throw error; errors.push({ url, error: error.message }); console.warn(url, error.message); }
    if ((i + 1) % 10 === 0) await checkpoint('catalog');
  }
  for (const url of expectedUrls) {
    if (spots.has(url)) continue;
    try { const page = await get(url); add(parseDetailPage(page.html, url), page.fetchedAt); }
    catch (error) { if (error.stop) throw error; errors.push({ url, error: error.message }); }
  }
  await checkpoint('coordinates');
  if (!skipMaps) {
    let done = 0;
    for (const s of spots.values()) {
      const url = `${s.sourceUrl}map.html`;
      try {
        const page = await get(url);
        s.coordinates = parseCoordinates(page.html);
        s.coordinatesFetchedAt = page.fetchedAt;
        if (!s.coordinates) errors.push({ url, error: 'No coordinates in source (not fabricated)' });
      } catch (error) { if (error.stop) throw error; errors.push({ url, error: error.message }); }
      done++;
      if (done % 10 === 0) { await checkpoint('coordinates'); console.log(`MAP ${done}/${spots.size}`); }
    }
  }
  await checkpoint(spots.size === expected.size ? 'complete' : 'partial');
  await exportCatalog(JSON.parse(await readFile('data/spots.json', 'utf8')));
  console.log(`Finished: ${spots.size}/${expected.size} places. See data/sync-report.json for coordinate coverage and failures.`);
} finally { await lock.close(); await unlink('data/.sync.lock'); }
