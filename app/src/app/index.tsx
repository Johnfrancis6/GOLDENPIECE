/** Entry. B6.3 replaces this with the phase machine (onboarding / lock / home). */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/gallery" />;
}
