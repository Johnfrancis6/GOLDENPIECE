/** Guided tour replay (Settings, S7 "Revoir la visite"; dev entry until S7). */
import { router } from 'expo-router';
import { Tour } from '../screens/tour/Tour';

export default function TourReplay() {
  return <Tour firstName={null} onDone={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />;
}
