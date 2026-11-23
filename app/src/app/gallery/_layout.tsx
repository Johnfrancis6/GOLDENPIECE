import { Stack } from 'expo-router';
import { GalleryFrame } from '../../dev/GalleryFrame';

export default function GalleryLayout() {
  return (
    <GalleryFrame>
      <Stack screenOptions={{ headerShown: false }} />
    </GalleryFrame>
  );
}
