import { load } from 'cheerio';
import { parseRanking, parseCoordinates } from './source.mjs';

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/g)].map(m => m[1].replaceAll('&amp;', '&'));
}
export function municipality(locality) {
  // Preserve the source locality separately (including county / ward).
  if (locality.includes('郡')) return locality.replace(/^.*?郡/, '') || '市区町村待确认';
  // Use the last 市: 市川市 / 四日市市 / 廿日市市 contain 市 in the name itself.
  return (locality.match(/^(.+市)/)?.[1] ?? locality.match(/^(.+[区町村])/)?.[1] ?? locality) || '市区町村待确认';
}
export function parseCatalogPage(html, pageUrl) {
  const $ = load(html);
  const facts = new Map();
  $('article').each((_, article) => {
    const link = $(article).find('a[href^="/detail/"]').first().attr('href');
    if (!link || !/^\/detail\/ar\d+e\d+\/$/.test(link)) return;
    const lines = $(article).find('.detail').toArray().map(el => $(el).text().trim());
    const periodText = lines.find(t => t.includes('例年の紅葉見頃'))?.replace(/^.*?例年の紅葉見頃[：:]\s*/, '') ?? '';
    const onsetText = lines.find(t => t.includes('例年の色づき始め'))?.replace(/^.*?例年の色づき始め[：:]\s*/, '') ?? '';
    facts.set(link, { periodText, onsetText });
  });
  const spots = parseRanking(html).map(({ rank, ...s }) => {
    const details = facts.get(new URL(s.sourceUrl).pathname) ?? { periodText: '', onsetText: '' };
    return { ...s, municipality: municipality(s.locality), ...details, periodKind: /\d{4}年/.test(details.periodText) ? 'dated' : 'typical', factsSourceUrl: pageUrl };
  });
  const pagination = $('.pager a[href]').toArray().map(el => new URL($(el).attr('href'), pageUrl).href).filter(url => /^https:\/\/koyo\.walkerplus\.com\/list\/ar\d{4}\/(?:ct\d+\/)?(?:\d+\.html)?$/.test(url));
  return { spots, pagination };
}
export function parseDetailPage(html, pageUrl) {
  const $ = load(html);
  const spot = parseRanking(html)[0];
  const meta = $('meta[name="description"]').attr('content') ?? '';
  const periodText = meta.match(/例年の見頃時期は([^。]+)/)?.[1] ?? '';
  const { rank, ...s } = spot;
  return { ...s, municipality: municipality(s.locality), periodText, onsetText: '', periodKind: /\d{4}年/.test(periodText) ? 'dated' : 'typical', factsSourceUrl: pageUrl };
}
export { parseCoordinates };
