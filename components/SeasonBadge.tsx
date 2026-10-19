'use client';
import { useI18n } from './LanguageProvider';
import { seasonColors, seasonLabels, type Season } from '../lib/season.mjs';
export default function SeasonBadge({ season }: { season: Season }) {
  const { t } = useI18n();
  return <span className="season-badge" style={{ color: seasonColors[season] }}><i style={{ background: seasonColors[season] }} />{t(seasonLabels[season])}</span>;
}
