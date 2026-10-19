'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import type { Entries, Spot } from './types';
import { labels } from './types';
import { seasonColors, seasonForSpot, seasonLabels } from '../lib/season.mjs';
import SeasonBadge from './SeasonBadge';
import { useI18n } from './LanguageProvider';
function LocalizedMapControls() {
  const map = useMap();
  const { t } = useI18n();
  useEffect(() => {
    function updateLabels() {
      const root = map.getContainer();
      for (const [selector, key] of [['.leaflet-control-zoom-in', '放大地图'], ['.leaflet-control-zoom-out', '缩小地图'], ['.leaflet-popup-close-button', '关闭地图弹窗']]) {
        root.querySelectorAll(selector).forEach(el => { el.setAttribute('title', t(key)); el.setAttribute('aria-label', t(key)); });
      }
    }
    updateLabels();
    map.on('popupopen', updateLabels);
    return () => { map.off('popupopen', updateLabels); };
  }, [map, t]);
  return null;
}
function View({ spots, selected, position }: { spots: Spot[]; selected: string | null; position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(map.getContainer()); return () => observer.disconnect(); }, [map]);
  useEffect(() => {
    const place = spots.find(spot => spot.id === selected);
    if (place?.coordinates) map.flyTo(place.coordinates, 11, { duration: 0.7 });
    else { const points = spots.flatMap(spot => spot.coordinates ? [spot.coordinates] : []); if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [45, 45], maxZoom: 10 }); }
  }, [map, spots, selected]);
  useEffect(() => { if (position) map.flyTo(position, 12); }, [map, position]);
  return null;
}
function CatalogMarkers({ spots, entries, selected, onSelect, date }: { spots: Spot[]; entries: Entries; selected: string | null; onSelect: (id: string) => void; date: string }) {
  const { t } = useI18n();
  const map = useMap();
  const [revision, setRevision] = useState(0);
  useMapEvents({ moveend: () => setRevision(n => n + 1), zoomend: () => setRevision(n => n + 1) });
  const index = useMemo(() => {
    const cluster = new Supercluster<{ spotId: string }>({ radius: 46, maxZoom: 15 });
    cluster.load(spots.filter(s => s.coordinates).map(s => ({ type: 'Feature', properties: { spotId: s.id }, geometry: { type: 'Point', coordinates: [s.coordinates![1], s.coordinates![0]] } })));
    return cluster;
  }, [spots]);
  const byId = useMemo(() => new globalThis.Map(spots.map(s => [s.id, s])), [spots]);
  const features = useMemo(() => {
    const bounds = map.getBounds();
    return index.getClusters([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], Math.floor(map.getZoom()));
  }, [index, map, revision]);
  const focused = byId.get(selected ?? '');
  return <>
    {features.map(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      if ('cluster' in feature.properties && feature.properties.cluster) {
        const clusterId = feature.properties.cluster_id;
        return <Marker key={`cluster-${clusterId}`} position={[lat, lng]} icon={L.divIcon({ className: 'map-marker-wrap', html: `<span class="map-cluster">${feature.properties.point_count}</span>`, iconSize: [38, 38], iconAnchor: [19, 19] })} eventHandlers={{ click: () => map.flyTo([lat, lng], Math.min(index.getClusterExpansionZoom(clusterId), 17)) }}><Popup>{t('这里有 {count} 个景点，点击聚合标记放大查看。', { count: feature.properties.point_count })}</Popup></Marker>;
      }
      const spot = byId.get(feature.properties.spotId);
      if (!spot || spot.id === selected) return null;
      const season = seasonForSpot(spot, date);
      return <CircleMarker key={spot.id} center={[lat, lng]} radius={7} pathOptions={{ color: 'white', weight: 2, fillColor: seasonColors[season], fillOpacity: 1 }} eventHandlers={{ click: () => onSelect(spot.id) }}><Popup><strong>{spot.name}</strong><br /><SeasonBadge season={season} /><br />{spot.prefecture} · {spot.municipality}<br />{t('预计：')}{spot.periodText || t('时间待确认')}<br />{t('清单：')}{t(labels[entries[spot.id]?.status ?? 'unvisited'])}</Popup></CircleMarker>;
    })}
    {focused?.coordinates && <CircleMarker center={focused.coordinates} radius={11} pathOptions={{ color: '#30372e', weight: 3, fillColor: seasonColors[seasonForSpot(focused, date)], fillOpacity: 1 }} eventHandlers={{ click: () => onSelect(focused.id) }}><Popup><strong>{focused.name}</strong><br /><SeasonBadge season={seasonForSpot(focused, date)} /><br />{t('预计：')}{focused.periodText || t('时间待确认')}<br /><a href={focused.sourceUrl} target="_blank" rel="noreferrer">{t('查看来源 ↗')}</a></Popup></CircleMarker>}
  </>;
}
export default function Map({ spots, entries, selected, onSelect, date }: { spots: Spot[]; entries: Entries; selected: string | null; onSelect: (id: string) => void; date: string }) {
  const { t } = useI18n();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); }, []);
  const [message, setMessage] = useState('');
  const [tileError, setTileError] = useState(false);
  function locate() {
    if (!navigator.geolocation) { setMessage('当前浏览器不支持定位'); return; }
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current); watchId.current = null;
      setTracking(false); setLocating(false); setMessage('已停止位置跟踪'); return;
    }
    setLocating(true); setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(p => { setPosition([p.coords.latitude, p.coords.longitude]); setLocating(false); setMessage('正在跟踪当前位置，仅在本页使用；再次点击可停止。'); }, error => {
      setLocating(false);
      if (error.code === 1) {
        setMessage('定位被拒绝，请检查浏览器权限。定位需要 HTTPS 或 localhost。'); setTracking(false);
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      } else setMessage('暂时无法获取位置，仍在等待更新；可点击停止跟踪。');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 });
  }
  return <div className="map-frame">
    <MapContainer center={[36.6, 138.4]} zoom={5} scrollWheelZoom preferCanvas className="leaflet-map">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} eventHandlers={{ tileerror: () => setTileError(true) }} />
      <LocalizedMapControls />
      <View spots={spots} selected={selected} position={position} />
      <CatalogMarkers spots={spots} entries={entries} selected={selected} onSelect={onSelect} date={date} />
      {position && <CircleMarker center={position} radius={9} pathOptions={{ color: 'white', fillColor: '#3478c6', fillOpacity: 1 }}><Popup>{t('我的当前位置')}</Popup></CircleMarker>}
    </MapContainer>
    <button className="location-button" onClick={locate}>{t(locating ? '定位中 · 点击停止' : tracking ? '◎ 停止跟踪' : '◎ 我的位置')}</button>
    {(message || tileError) && <div className="map-message" role="status">{t(message || '底图加载失败，请检查网络；清单仍可使用。')}</div>}
    <div className="map-legend season-map-legend">{Object.entries(seasonLabels).map(([key, label]) => <span key={key}><i style={{ background: seasonColors[key as keyof typeof seasonColors] }} />{t(label)}</span>)}</div>
  </div>;
}
