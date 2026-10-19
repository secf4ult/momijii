import type { Metadata } from 'next';
import { LanguageProvider } from '../components/LanguageProvider';
import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata: Metadata = { title: 'モミジイ · 红叶旅行清单', description: '把想去的秋天，慢慢变成去过的风景。日本红叶景点清单与地图。', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body><LanguageProvider>{children}</LanguageProvider></body></html>; }
