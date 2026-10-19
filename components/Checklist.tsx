'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronDown, Download, Leaf, LockKeyhole, MapPin, Search, X } from 'lucide-react';
import type { Coverage, Entries, Entry, Spot, Status } from './types';
import { colors, emptyEntry, labels } from './types';
import { japanDate, seasonForSpot, seasonLabels, seasonColors, viewingWindow, validDate, type Season } from '../lib/season.mjs';
import RegionOverview from './RegionOverview';
import SeasonBadge from './SeasonBadge';
import SpotCard from './SpotCard';
import { LanguageSwitcher, useI18n } from './LanguageProvider';
import { useAccess } from './PasswordGate';
function MapLoading() { const { t } = useI18n(); return <div className="map-loading">{t('正在展开秋日地图…')}</div>; }
const Map = dynamic(() => import('./Map'), { ssr: false, loading: MapLoading });
const STORAGE = 'momiji-checklist-v1';
const PAGE_SIZE = 24;
export default function Checklist({ spots, fetchedAt, coverage }: { spots: Spot[]; fetchedAt: string; coverage?: Coverage }) {
  const { t } = useI18n();
  const { lock } = useAccess();
  const [entries, setEntries] = useState<Entries>({});
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [prefecture, setPrefecture] = useState('all');
  const [municipality, setMunicipality] = useState('all');
  const [seasonFilter, setSeasonFilter] = useState<Season | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<'split' | 'list' | 'map'>('split');
  const [today, setToday] = useState('');
  const [previewDate, setPreviewDate] = useState('');
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const date = previewDate || today;
  useEffect(() => {
    setToday(japanDate());
    const timer = setInterval(() => setToday(japanDate()), 60000);
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const value = JSON.parse(raw);
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid data');
        const clean: Entries = {};
        for (const [id, entry] of Object.entries(value)) {
          const e = entry as Entry;
          if (e && Object.hasOwn(labels, e.status) && typeof e.note === 'string' && typeof e.date === 'string') clean[id] = e;
        }
        setEntries(clean);
      }
    } catch { setStorageError('无法读取本地记录。请先备份浏览器存储；本次修改可能无法保存。'); }
    setReady(true);
    function sync(event: StorageEvent) { if (event.key === STORAGE) window.location.reload(); }
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('storage', sync); clearInterval(timer); };
  }, []);
  function update(id: string, patch: Partial<Entry>) {
    const next = { ...entries, [id]: { ...(entries[id] ?? emptyEntry), ...patch } };
    setEntries(next);
    try { localStorage.setItem(STORAGE, JSON.stringify(next)); setStorageError(''); }
    catch { setStorageError('保存失败：浏览器存储不可用或空间不足，请导出备份。'); }
  }
  function chooseRegion(pref: string, city = 'all') { setPrefecture(pref); setMunicipality(city); setPage(1); }
  const prefectures = useMemo(() => [...new Set(spots.map(s => s.prefecture))], [spots]);
  const cities = useMemo(() => [...new Set(spots.filter(s => prefecture === 'all' || s.prefecture === prefecture).map(s => s.municipality))].sort((a, b) => a.localeCompare(b, 'ja')), [spots, prefecture]);
  const inRegion = useMemo(() => spots.filter(s => (prefecture === 'all' || s.prefecture === prefecture) && (municipality === 'all' || s.municipality === municipality)), [spots, prefecture, municipality]);
  const seasonCounts = useMemo(() => inRegion.reduce((counts, s) => { counts[seasonForSpot(s, date)]++; return counts; }, { before: 0, soon: 0, peak: 0, past: 0, unknown: 0 }), [inRegion, date]);
  const filtered = useMemo(() => inRegion.filter(s => (filter === 'all' || (entries[s.id]?.status ?? 'unvisited') === filter) && (seasonFilter === 'all' || seasonForSpot(s, date) === seasonFilter) && `${s.name}${s.prefecture}${s.locality}${s.municipality}`.toLowerCase().includes(query.trim().toLowerCase())), [inRegion, entries, filter, seasonFilter, date, query]);
  const counts = { all: spots.length, unvisited: spots.filter(s => !entries[s.id] || entries[s.id].status === 'unvisited').length, planned: spots.filter(s => entries[s.id]?.status === 'planned').length, visited: spots.filter(s => entries[s.id]?.status === 'visited').length };
  const current = spots.find(s => s.id === selected);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const progress = spots.length ? Math.round(counts.visited / spots.length * 100) : 0;
  function reset() { setFilter('all'); chooseRegion('all'); setSeasonFilter('all'); setQuery(''); }
  function changePage(next: number) { setPage(next); listRef.current?.scrollTo({ top: 0 }); }
  function backup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'momijii-checklist-backup.json'; a.click(); URL.revokeObjectURL(url);
  }
  const coordinateCount = spots.filter(s => s.coordinates).length;
  const period = current && validDate(date) ? viewingWindow(current, Number(date.slice(0, 4))) : null;
  return <>
    <header className="header"><Link className="brand" href="/"><span className="brand-icon"><Leaf size={25} /></span><span>モミジイ <b>Momijii</b></span></Link><span className="header-caption">{t('你的日本秋日旅行手帐')}</span><div className="header-actions"><LanguageSwitcher /><button className="quiet-button" aria-label={t('导出清单')} onClick={backup} disabled={!ready}><Download size={15} /><span>{t('导出清单')}</span></button><button className="quiet-button" aria-label={t('锁定网站')} title={t('锁定网站')} onClick={lock}><LockKeyhole size={15} /></button></div></header>
    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow">A LITTLE PLAN FOR A BEAUTIFUL AUTUMN</div><h1>{t('把想去的秋天，')}<br />{t('变成')}<span>{t('去过的风景。')}</span></h1><p>{t('从一片红叶出发，收藏下一次相遇。')}<br className="mobile-break" /> {t('在地图上，慢慢点亮你的日本。')}</p><div className="hero-meta"><span><i /> {t('Walkerplus 全国红叶名所')}</span><span>{t('{count} 都道府县 · 本地私人清单', { count: prefectures.length })}</span></div></div><div className="hero-art" aria-hidden="true"><span className="art-circle" /><span className="art-word">秋</span><Leaf className="art-leaf leaf-one" /><Leaf className="art-leaf leaf-two" /><Leaf className="art-leaf leaf-three" /><span className="art-label">日本の秋を、ひとつずつ。</span></div></section>
      <section className="stats" aria-label={t('旅行进度')}><div className="stat-intro"><span>{t('我的秋日足迹')}</span><small>{t('每一个标记，都是旅行的开始')}</small></div>{(['all', 'planned', 'visited'] as const).map(k => <button key={k} className={`stat ${filter === k ? 'stat-active' : ''}`} onClick={() => { setFilter(k); setPage(1); }}><i style={{ background: k === 'all' ? '#a64b36' : colors[k] }} /><strong>{ready ? counts[k] : '—'}</strong><span>{t(k === 'all' ? '收录的名所' : labels[k])}</span></button>)}<div className="progress-block"><span>{t('探索进度')} <b>{ready ? progress : 0}%</b></span><div className="progress-track"><div style={{ width: `${progress}%` }} /></div></div></section>
      <section className="season-dashboard" aria-label={t('红叶季节状态')}>
        <div className="season-heading"><div><div className="eyebrow">AUTUMN CALENDAR · JAPAN TIME</div><h2>{t('此刻，秋意在哪里？')}</h2></div><div className="date-controls"><label>{t(previewDate ? '预览日期' : '日本当地日期')}<input type="date" aria-label={t('季节判断日期')} value={date} onChange={e => { if (validDate(e.target.value)) { setPreviewDate(e.target.value); setPage(1); } }} /></label>{previewDate && <button onClick={() => { setPreviewDate(''); setPage(1); }}>{t('回到今天')}</button>}</div></div>
        <div className="season-tiles">{Object.entries(seasonLabels).map(([key, label]) => <button key={key} aria-pressed={seasonFilter === key} onClick={() => { setSeasonFilter(seasonFilter === key ? 'all' : key as Season); setPage(1); }} style={{ '--season-color': seasonColors[key as Season] } as React.CSSProperties}><i /><span>{t(label)}</span><strong>{ready ? seasonCounts[key as Season] : '—'}</strong></button>)}</div>
        <p className="season-explanation">{t('根据各景点')}<strong>{t('例年见顷或来源指定观赏期')}</strong>{t('估算，非实时实况（特别开放期不保证红叶正盛）。开始前 14 天为绿色；预计期间内为红色；结束后为黄色；更早为灰色。上 / 中 / 下旬按 1–10 / 11–20 / 21–月末计算。例年时段按查看年份推算，每年 1 月重置；明确指定年份的时段不跨年套用。')}</p>
      </section>
      <RegionOverview spots={spots} prefecture={prefecture} date={date} onSelect={chooseRegion} />
      {coverage && <div className={`coverage-note ${coverage.collected < coverage.expected ? 'in-progress' : ''}`} role="status"><span>{t('来源索引 {expected} 处 · 已收录 {count} 处 · 已有坐标 {coordinates} 处', { expected: coverage.expected, count: spots.length, coordinates: coordinateCount })}{coverage.phase !== 'complete' && t(' · 采集进行中，刷新可查看进度')}</span><button onClick={() => window.location.reload()}>{t('刷新数据 ↻')}</button></div>}
      <section className="explore"><div className="section-heading"><div><div className="eyebrow">THE AUTUMN COLLECTION</div><h2>{t('寻找下一站')} <span>{t('红叶名所')}</span></h2></div><div className="view-toggle" aria-label={t('显示方式')}>{([['split', '清单 + 地图'], ['list', '清单'], ['map', '地图']] as const).map(([key, text]) => <button key={key} aria-pressed={view === key} onClick={() => setView(key)}>{t(text)}</button>)}</div></div>
        <div className="toolbar"><div className="tabs" aria-label={t('旅行状态筛选')}>{(['all', 'unvisited', 'planned', 'visited'] as const).map(k => <button key={k} aria-pressed={filter === k} onClick={() => { setFilter(k); setPage(1); }}>{t(k === 'all' ? '全部景点' : labels[k])} <span>{ready ? counts[k] : '—'}</span></button>)}</div><label className="search"><Search size={16} /><input aria-label={t('搜索景点')} placeholder={t('搜索景点、地区…')} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></label></div>
        <div className="geo-filters"><label>{t('都道府县')}<select aria-label={t('筛选地区')} value={prefecture} onChange={e => chooseRegion(e.target.value)}><option value="all">{t('全部都道府县（{count}）', { count: prefectures.length })}</option>{prefectures.map(p => <option key={p} value={p}>{p}（{spots.filter(s => s.prefecture === p).length}）</option>)}</select><ChevronDown size={14} /></label><label>{t('市区町村')}<select aria-label={t('筛选市区町村')} value={municipality} disabled={prefecture === 'all'} onChange={e => { setMunicipality(e.target.value); setPage(1); }}><option value="all">{t(prefecture === 'all' ? '请先选择都道府县' : '全部市区町村')}</option>{prefecture !== 'all' && cities.map(c => <option key={c} value={c}>{c}（{spots.filter(s => s.prefecture === prefecture && s.municipality === c).length}）</option>)}</select><ChevronDown size={14} /></label><label>{t('观赏季节')}<select aria-label={t('筛选观赏季节')} value={seasonFilter} onChange={e => { setSeasonFilter(e.target.value as Season | 'all'); setPage(1); }}><option value="all">{t('全部季节状态')}</option>{Object.entries(seasonLabels).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select><ChevronDown size={14} /></label><button onClick={reset}>{t('重置筛选')}</button></div>
        {storageError && <p className="warning" role="alert">{t(storageError)}</p>}
        <div className="results-meta"><span>{t('共 {count} 处风景 · 第 {page} / {pages} 页', { count: filtered.length, page: safePage, pages: pageCount })}</span><span>{t('按都道府县及来源 ID 排序，编号非人气排名 · 地图显示全部筛选结果')}</span></div>
        <div className={`workspace view-${view}`}>
          {view !== 'map' && <div className="list-column"><div className="spot-list" ref={listRef}>{filtered.length === 0 && <div className="empty"><Leaf size={34} /><h3>{t('这里还没有风景')}</h3><p>{t('试试其他关键词，或切换筛选条件。')}</p><button onClick={reset}>{t('清除全部筛选')}</button></div>}{paginated.map(spot => <SpotCard key={spot.id} spot={spot} entry={entries[spot.id] ?? emptyEntry} selected={selected === spot.id} ready={ready} date={date} onSelect={() => setSelected(spot.id)} onStatus={status => update(spot.id, { status })} />)}</div><div className="pagination"><button disabled={safePage <= 1} onClick={() => changePage(safePage - 1)}>{t('← 上一页')}</button><span>{t('{page} / {pages} · 每页 {size} 处', { page: safePage, pages: pageCount, size: PAGE_SIZE })}</span><button disabled={safePage >= pageCount} onClick={() => changePage(safePage + 1)}>{t('下一页 →')}</button></div></div>}
          {view !== 'list' && <aside className="map-panel"><div className="map-heading"><span><MapPin size={15} /> {t('秋日目的地')}</span><small>{t('{coordinates} 个坐标 / {count} 处名所', { coordinates: filtered.filter(s => s.coordinates).length, count: filtered.length })}</small></div><Map spots={filtered} entries={entries} selected={selected} onSelect={setSelected} date={date} /><div className="map-footer"><span className="live-dot" /> {t('标记颜色代表观赏季节')} <span>{t('数字为聚合景点数，点击放大')}</span></div>{filtered.some(s => !s.coordinates) && <p className="missing-coordinates">{t('{count} 处坐标待采集或来源未提供，仍可在清单查看。', { count: filtered.filter(s => !s.coordinates).length })}</p>}</aside>}
        </div>
        {current && <section className="detail-panel" aria-label={t('景点旅行记录')}><div className="detail-title"><div><span className="eyebrow">YOUR TRAVEL NOTES</span><h3>{current.name}</h3></div><button className="icon-button" aria-label={t('关闭景点记录')} onClick={() => setSelected(null)}><X size={18} /></button></div><div className="detail-facts"><span>{current.prefecture} → {current.municipality} → {current.locality}</span><SeasonBadge season={seasonForSpot(current, date)} /><span>{t(current.periodKind === 'dated' ? '来源指定观赏期' : '例年见顷')}：{current.periodText || t('时间待确认')}{current.onsetText && ` · ${t('开始变色：{period}', { period: current.onsetText })}`}</span>{period && <span>{t(current.periodKind === 'dated' ? '来源指定日期' : '当前查看年估算')}：{period.start} – {period.end}</span>}<small>{t('自然条件会使实际观赏期变化，请出发前查看来源。信息采集：{date}', { date: current.fetchedAt?.slice(0, 10) ?? fetchedAt.slice(0, 10) })}</small></div><div className="detail-fields"><label>{t('旅行状态')}<select aria-label={t('当前景点旅行状态')} value={entries[current.id]?.status ?? 'unvisited'} disabled={!ready} onChange={e => update(current.id, { status: e.target.value as Status })}>{Object.entries(labels).map(([key, text]) => <option key={key} value={key}>{t(text)}</option>)}</select></label><label>{t('到访日期')}<input type="date" value={entries[current.id]?.date ?? ''} disabled={!ready} onChange={e => update(current.id, { date: e.target.value })} /></label><label className="note-field">{t('旅行笔记')}<textarea placeholder={t('想和谁一起去？记录路线、心愿，或那天的风景…')} maxLength={3000} value={entries[current.id]?.note ?? ''} disabled={!ready} onChange={e => update(current.id, { note: e.target.value })} /></label><div className="detail-actions"><a href={current.sourceUrl} target="_blank" rel="noreferrer">{t('Walkerplus 景点详情')} <ArrowUpRight size={14} /></a>{current.coordinates && <a href={`https://www.openstreetmap.org/directions?to=${current.coordinates.join('%2C')}`} target="_blank" rel="noreferrer">{t('打开路线规划')} <ArrowUpRight size={14} /></a>}<small><Check size={12} /> {t('浏览器本地自动保存')}</small></div></div></section>}
      </section>
      <section className="bottom-note"><Leaf size={18} /><p>{t('不必赶路，秋天值得慢慢收藏。')}<span>Take a moment. Make a memory.</span></p></section>
    </main>
    <footer><span className="footer-brand">モミジイ Momijii</span><p>{t('景点来源：')}<a href="https://koyo.walkerplus.com/" target="_blank" rel="noreferrer">{t('Walkerplus 红叶名所 ↗')}</a><br />{t('快照更新：{date} · 共 {count} 处；预计季节非实时实况，位置为来源参考点。', { date: fetchedAt.slice(0, 10), count: spots.length })}</p><p>{t('私人使用预览 · 无账号、无业务追踪')}<br />{t('原创示意插画，非景点实拍 · 清除浏览器数据会丢失记录，请定期导出。')}</p></footer>
  </>;
}
