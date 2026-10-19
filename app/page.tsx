import snapshot from '../data/spots.json';
import Checklist from '../components/Checklist';
import { PasswordGate } from '../components/PasswordGate';
import type { Snapshot } from '../components/types';
// The data is bundled at build time. This client-side gate is not server authentication.
export default function Page() {
  // JSON imports infer number[] rather than coordinate tuples; catalog tests validate the snapshot.
  const data = snapshot as unknown as Snapshot;
  return <PasswordGate><Checklist spots={data.spots} fetchedAt={data.fetchedAt} coverage={data.coverage} /></PasswordGate>;
}
