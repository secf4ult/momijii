'use client';
import { useI18n } from './LanguageProvider';
import { ArrowUpRight, ChevronDown, Leaf, MapPin } from 'lucide-react';
import type { Entry, Spot, Status } from './types';
import { colors, labels } from './types';
import { seasonForSpot } from '../lib/season.mjs';
import SeasonBadge from './SeasonBadge';
export default function SpotCard({ spot, entry, selected, ready, date, onSelect, onStatus }: { spot: Spot; entry: Entry; selected: boolean; ready: boolean; date: string; onSelect: () => void; onStatus: (status: Status) => void }) {
  const { t } = useI18n();
  return <article className={`spot-card ${selected ? 'selected' : ''}`}>
    <button className={`spot-illustration illustration-${spot.rank % 4}`} onClick={onSelect} aria-label={t('在地图查看{spot}', { spot: spot.name })}><span className="rank">{String(spot.rank).padStart(2, '0')}</span><span className="mountain mountain-back" /><span className="mountain mountain-front" /><Leaf size={30} className="card-leaf" /><span className="illustration-caption">AUTUMN IN JAPAN</span></button>
    <div className="spot-info">
      <div className="spot-topline"><span className="place"><MapPin size={12} />{spot.prefecture} · {spot.locality}</span><span className="status-dot" style={{ color: colors[entry.status] }}>● {t(labels[entry.status])}</span></div>
      <button className="spot-name" onClick={onSelect}>{spot.name}</button>
      <p className="season"><span className="period-text">{t('预计：')}{spot.periodText || t('时间待确认')}</span><SeasonBadge season={seasonForSpot(spot, date)} /></p>
      <div className="card-bottom"><label className="status-select"><select aria-label={t('{spot}旅行状态', { spot: spot.name })} value={entry.status} disabled={!ready} onChange={e => onStatus(e.target.value as Status)}>{Object.entries(labels).map(([key, text]) => <option key={key} value={key}>{t(text)}</option>)}</select><ChevronDown size={12} /></label><button className="detail-button" onClick={onSelect}>{t('记录 / 地图')} <ArrowUpRight size={14} /></button></div>
    </div>
  </article>;
}
