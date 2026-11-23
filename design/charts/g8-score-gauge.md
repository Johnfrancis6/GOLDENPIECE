# G8 — Score gauge (fraud score vs 40 / 70)

**Validated by Franco on 2026-11-23** (choice A, without preview: thin
horizontal bar 0-100, marks at 40 and 70, three named zones, a dot at the
score, **no number shown**). Tokens: [../tokens.json](../tokens.json)
(`chart.scoreGauge`). Used inside B15. Contrast measured by script
(WCAG, 2026-11-23): zone colours vs sheet fill ≥ 6.4:1 dark (`#181818`),
≥ 6.6:1 light (white).

## 1. Data

`score` 0-100, `band` (< 40, 40-70, > 70). The score itself is never
printed (brief L4: words, not raw numbers); TalkBack says the zone.

## 2. Anatomy (full sheet width − 40 dp)

| Part | Rule |
|---|---|
| Track | 8 dp tall, three segments 0-40 / 40-70 / 70-100 with 2 dp gaps (the gaps are the 40 and 70 marks), outer ends radius 4 |
| Zone colours | C15 band text colours: `#3DD68C` / `#F2C94C` / `#FF6B7A` dark; `#0B6B3A` / `#735200` / `#B21F33` light. **Current zone at full opacity, the two others at 0.3** |
| Marker | 16 dp circle `text.primary`, 3 dp ring in the sheet fill (cuts it out of the track), centred on the score position, vertically centred on the track |
| Zone names | under the track, 12/16: "Normal" under segment 1 (left-aligned), "À confirmer" centred under segment 2, "Banque prévenue" right-aligned under segment 3; current zone in its colour SemiBold, others `text.secondary` Regular. 6 dp under the track |
| Height | 16 (marker) + 6 + 16 ≈ 40 dp |

At 200 % font the three names stack under the track (one per line, each
preceded by a 10 dp swatch of its zone colour) so they never overlap
(D12).

## 3. Motion

First view: the marker slides from 0 to its position 700 ms `enter`
(transform), the current zone fades from 0.3 to 1 in the last 320 ms.
Reduced motion: drawn at once.

## 4. Accessibility

One node: "Niveau de risque : à confirmer, entre normal et banque
prévenue". Colour never alone: zone names in text, current one in
SemiBold.

## 5. Copy (FR / EN)

Normal / Normal · À confirmer / To confirm · Banque prévenue / Bank
notified (same words as C15).

## 6. Where used

B15 (L4). Not used anywhere else (the C15 badge is the compact form).

Validation: 2026-11-23.
