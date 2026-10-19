export type Status = 'unvisited' | 'planned' | 'visited';
export type Spot = {
  id: string;
  rank: number; // Stable catalog display index, not a popularity ranking.
  name: string;
  prefecture: string;
  municipality: string;
  locality: string;
  startDate: string; // Source structured event dates; not used to infer peak season.
  endDate: string;
  periodText: string;
  onsetText: string;
  periodKind: 'typical' | 'dated';
  sourceUrl: string;
  factsSourceUrl: string;
  fetchedAt: string;
  coordinates: [number, number] | null;
};
export type Coverage = { expected: number; collected: number; coordinates: number; phase: string };
export type Snapshot = { sourceUrl: string; fetchedAt: string; coverage: Coverage; spots: Spot[] };
export type Entry = { status: Status; date: string; note: string };
export type Entries = Record<string, Entry>;
export const labels: Record<Status, string> = { unvisited: '未去过', planned: '准备去', visited: '已去过' };
export const colors: Record<Status, string> = { unvisited: '#929688', planned: '#c67d39', visited: '#56826a' };
export const emptyEntry: Entry = { status: 'unvisited', date: '', note: '' };
