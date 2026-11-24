/** Brand mark 28 on its dark tile, radius 8 (icons.md §11 "Bank dashboard (D) top bar"):
 * the launcher icon (dark gradient background + mark) clipped to radius 8. */
export function BrandTile({ size = 28 }: { size?: number }) {
  return <img className="brand-tile" src="/brand/icon.svg" alt="" width={size} height={size} aria-hidden />;
}
