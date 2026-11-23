/** O4 Guided tour (T): built in B6.4 on the demo Home (bundled payload,
 * offline). Until then the step passes straight to O5. */
import { useEffect } from 'react';
import { router } from 'expo-router';
import { ROUTE } from '../../lib/flow';
import { Splash } from '../../screens/Splash';

export default function Tour() {
  useEffect(() => { router.replace(ROUTE.choice as never); }, []);
  return <Splash />;
}
