# TAKE 60 — Design notes

## User goal

An original editable, approachable avatar stars in several simple comedy action games. One run takes about 60 seconds and automatically produces an entertaining 15-second short, which may be a portable edited replay. Movement, escalating trouble, exaggerated launch/destruction, reactions, and expressions carry the comedy. The user supplied the empty `yz4git/astra-1` repository and intends to show the creation on social media.

## Art and interaction

Bright toy dioramas, oversized expressive faces, physical props, cream-and-ink typography, acid-yellow editing marks. Everything in the scene is actual 3D geometry. Characters are original; no Nintendo assets, logos, audio, or Mii files are used. The first screen is a game-native scene selector, with the current cast on set. There are no accounts, purchases, remote uploads, or analytics.

## Rules

- A run has 60 seconds of active simulation; a countdown precedes it. Backgrounding pauses the game.
- Three different objectives share only movement and a jump/action vocabulary.
- Failure creates footage without ending the run. Launches recover automatically, with temporary invulnerability.
- Combo windows are 3.2 seconds. Each stage has three score thresholds.
- Environmental props and ingredients regenerate during a run. Difficulty escalates at 20 and 40 seconds.
- The actor, props, hazards, and particles are recorded at 20 Hz from a fixed 60 Hz simulation.

## Director

Score events by physical spectacle and objective accomplishment. Greedily select five separated events, with penalties for repeated event types and captions. Sort by chronology. Each shot receives exactly three seconds: setup, slowed impact, faster follow-through, then a held reaction. Camera choices include wide, low, close, orbit, and a final hero shot.

The portable movie contains 301 frames over 15 seconds. It stores source animation time as well as poses; freeze frames therefore freeze the avatar's walk/tumble, face, and prop movement. Sampling never interpolates across a hard cut. Files are validated before rendering, including object count, known mesh kinds, fixed sample count, finite transforms, and exact timing.

## Export and limits

JSON replay export is the baseline supported format. Optional video is recorded from a canvas compositor plus synthesized game audio, using the first browser-supported MP4/WebM codec. The compositor includes captions and score. It records a real 15-second playback, is cancelled if the page is backgrounded, and never requests a microphone. No video encoding service is required.

Small-file local storage keeps only the latest movie. Storage failures are nonfatal and keep explicit file export available. No service worker or automatic page reload is installed.

## Verification

The regression suite tests gameplay outcomes and replay invariants. Real-browser visuals, sustained device frame rate, Safari file handling, and device-specific video codecs remain device QA items. Future visual review should prioritize camera framing on short landscape screens, readable props, motion timing, and whether the five chosen shots tell a varied comic story.
