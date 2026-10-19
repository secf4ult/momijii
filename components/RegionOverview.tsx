'use client';
import { useMemo, useState } from 'react';
import type { Spot } from './types';
import { useI18n } from './LanguageProvider';
import { regionPeriod, seasonColors, seasonForSpot, seasonLabels, type Season } from '../lib/season.mjs';
export default function RegionOverview({ spots, prefecture, date, onSelect }: { spots: Spot[]; prefecture: string; date: string; onSelect: (prefecture: string, municipality: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const byCity = prefecture !== 'all';
  const rows = useMemo(() => {
    const groups = new Map<string, Spot[]>();
    for (const s of spots) {
      if (byCity && s.prefecture !== prefecture) continue;
      const key = byCity ? s.municipality : s.prefecture;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return [...groups].map(([name, places]) => ({ name, places, period: regionPeriod(places, Number(date.slice(0, 4)) || new Date().getFullYear()), counts: places.reduce((counts, s) => { counts[seasonForSpot(s, date)]++; return counts; }, { before: 0, soon: 0, peak: 0, past: 0, unknown: 0 }) }));
  }, [spots, prefecture, byCity, date]);
  return <section className="region-overview"><button className="region-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><span>▦ {byCity ? t('{prefecture} · 市区町村数据', { prefecture }) : t('全国 · 都道府县数据')}</span><small>{t('{count} 个{unit} · 点击{action}', { count: rows.length, unit: t(byCity ? '市区町村' : '都道府县'), action: t(open ? '收起' : '展开') })} {open ? '−' : '+'}</small></button>{open && <div className="region-table-wrap"><p>{t('时间范围为本地区各景点例年见顷的最早至最晚日期，不代表整个地区持续盛开。点击地区可筛选景点。')}</p><table className="region-table"><thead><tr><th>{t(byCity ? '市区町村' : '都道府县')}</th><th>{t('景点数')}</th><th>{t('预计观赏期跨度')}</th><th>{t('按景点统计的季节状态')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.name}><td><button onClick={() => onSelect(byCity ? prefecture : row.name, byCity ? row.name : 'all')}>{row.name} ↗</button></td><td>{row.places.length}</td><td>{row.period.replace('时间待确认', t('时间待确认')).replace('景点时间跨度', t('景点时间跨度'))}</td><td><div className="region-season-counts">{Object.entries(row.counts).filter(([, count]) => count > 0).map(([key, count]) => <span key={key} title={t(seasonLabels[key as Season])}><i style={{ background: seasonColors[key as Season] }} />{t(seasonLabels[key as Season])} {count}</span>)}</div></td></tr>)}</tbody></table></div>}</section>;
}
