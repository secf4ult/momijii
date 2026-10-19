export function parseRanking(html) {
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const events = blocks.flatMap(block => { const value = JSON.parse(block[1]); return Array.isArray(value) ? value : [value]; }).filter(item => item['@type'] === 'Event');
  if (!events.length) throw new Error('Ranking structure changed: no events. Existing snapshot preserved.');
  return events.map((event, index) => {
    const url = new URL(event.url);
    if (url.origin !== 'https://koyo.walkerplus.com' || !/^\/detail\/ar\d+e\d+\/$/.test(url.pathname)) throw new Error('Unexpected source URL');
    const address = event.location?.address;
    if (!event.location?.name || !address?.addressRegion) throw new Error('Missing place information');
    return { id: url.pathname.split('/')[2], rank: index + 1, name: event.location.name, prefecture: address.addressRegion, locality: address.addressLocality ?? '', startDate: event.startDate ?? '', endDate: event.endDate ?? '', sourceUrl: url.href, coordinates: null };
  });
}
export function parseCoordinates(html) {
  const match = html.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const [lat, lng] = match.slice(1).map(Number);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}
