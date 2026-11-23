/** B6.5: brand mark geometry (icons.md §11) and the M14 timeline tokens (motion.md §4b). */
import { markGeometry, sparklePoints } from '../src/ui/BrandMark';
import { BUILD, OP, countUpEase } from '../src/state/opening';

test('mark at 144 dp: ring R 42, coin r 18, sparkle 20, 8 coins clockwise from the top', () => {
  const g = markGeometry(144);
  expect([g.R, g.r, g.h]).toEqual([42, 18, 20]);
  expect(g.coins).toHaveLength(8);
  expect(g.coins[0].x).toBeCloseTo(72); expect(g.coins[0].y).toBeCloseTo(30);
  expect(g.coins[2].x).toBeCloseTo(114); expect(g.coins[2].y).toBeCloseTo(72); // 3 o'clock second quarter → clockwise
});

test('the drawing dot follows the concave sparkle: tips on the axes, inside the square between them', () => {
  const pts = sparklePoints(144, 8);
  const c = 72, h = 20;
  const tips = [pts[0], pts[8], pts[16], pts[24]];
  expect(tips.map((p) => [Math.round(p.x), Math.round(p.y)])).toEqual([[c, c - h], [c + h, c], [c, c + h], [c - h, c]]);
  for (const p of pts) expect(Math.hypot(p.x - c, p.y - c)).toBeLessThanOrEqual(h + 1e-6);
  expect(Math.hypot(pts[4].x - c, pts[4].y - c)).toBeLessThan(h * 0.6); // mid-arc pulled toward the centre
});

test('M14 timeline stays within 4.3 s and the Home build follows the card', () => {
  expect(OP.total).toBe(4300);
  expect(Math.max(...Object.values(BUILD).flat())).toBeLessThan(OP.total);
  expect(BUILD.header).toBeGreaterThan(OP.card.appear);
  expect(countUpEase(0)).toBe(0); expect(countUpEase(1)).toBe(1);
});
