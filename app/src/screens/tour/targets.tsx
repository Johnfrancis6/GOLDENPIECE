/** Tour targets: Home blocks report where they are so the guided tour (T)
 * can scroll to them and draw its spotlight. Outside the tour: a plain View. */
import { createContext, useContext, useRef, type ComponentRef, type ReactNode } from 'react';
import { View } from 'react-native';

export type TourKey = 'card' | 'dots' | 'alert' | 'actions' | 'tiles' | 'list';
export type Rect = { x: number; y: number; w: number; h: number };
export type TargetView = ComponentRef<typeof View>;
export type TourRegistry = { set: (k: TourKey, v: TargetView | null) => void };

export const TourTargetsContext = createContext<TourRegistry | null>(null);

export function TourTarget({ k, children }: { k: TourKey; children: ReactNode }) {
  const reg = useContext(TourTargetsContext);
  const ref = useRef<TargetView | null>(null);
  if (!reg) return <>{children}</>;
  return (
    <View collapsable={false} ref={(v) => { ref.current = v; reg.set(k, v); }}>
      {children}
    </View>
  );
}

/** Window rect of a registered target (null when not mounted). */
export function measure(v: TargetView | null): Promise<Rect | null> {
  return new Promise((res) => {
    if (!v) return res(null);
    v.measureInWindow((x, y, w, h) => res(w || h ? { x, y, w, h } : null));
  });
}
