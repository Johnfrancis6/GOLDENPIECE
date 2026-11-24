# Phone test — B6 "Done" checks on the Tecno Spark 50

Written by B6.6. Run on the reference phone (SETUP §2); write the results
in `docs/CHAIN_LOG.md` (section "B6 device results") or tell any session.

## Get the APK

1. github.com/Johnfrancis6/GOLDENPIECE → Actions → workflow **android** →
   latest green run on `build/b6-app-shell` (or `main`) → Artifacts →
   `goldenpiece-apk` (zip) → unzip → `goldenpiece-<sha>-arm64.apk`.
2. Copy it to the phone (USB, Drive) and open it. Allow "install unknown
   apps" for the file manager when Android asks. This test APK is signed
   with a debug key: it is for test phones only, never for the store.

## Checks

| # | Check | How | Pass |
|---|---|---|---|
| 1 | Cold start | Swipe the app away from recent apps, wait 10 s, tap the icon with a stopwatch; stop when the Home card amount is shown (M14 skipped by a tap after 0.6 s). Do it 5 times; keep the middle value (p50). | p50 ≤ 3 s |
| 2 | Opening fluidity | Watch M14 once without tapping. | no visible stutter; if it stutters, note it (fallback: drop the dashed guides) |
| 3 | Airplane mode on Home | With a demo open once online: airplane mode on → kill the app → open it. | Home shows cached data + offline banner, no error screen; airplane off → banner leaves within ~30 s |
| 4 | Tour offline | Fresh install, airplane mode on → open → language → country → "Découvrir". | the 6 tour steps play with demo data |
| 5 | Lock | Settings lock delay → leave the app longer than the delay → come back. | O18 asks fingerprint/PIN |

Also note: Android version, RAM, processor, screen (SETUP §2).
