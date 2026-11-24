/** O4 Guided tour (T) on the bundled demo Home, offline. Passer / Terminer → O5. */
import { useApp } from '../../state/app';
import { Tour } from '../../screens/tour/Tour';
import { go, useStep } from '../../screens/frames';

export default function TourStep() {
  useStep('tour');
  const { patch } = useApp();
  return <Tour firstName={null} onDone={() => { void patch({ tourSeen: true }); go('choice'); }} />;
}
