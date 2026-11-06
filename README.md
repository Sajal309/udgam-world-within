# Three.js playground

A plain JavaScript + Three.js starter powered by Vite. No framework required.

## UDGAM: A world within

Open **http://localhost:5173/lesson/** with the development server running.
The original Three.js playground remains at `/`.

This is a learner-paced, continuous 3D journey adapted from the UDGAM Cavalry
lesson and Instagram reference. It replaces the original nine-object slideshow.
The previous implementation is retained under `archive/lesson-v1/` for reference.

The main path has five connected discoveries:

1. Remove sunlight from the cave and observe that the inner pulse continues.
2. Follow the pulse into a neural forest.
3. Activate the network and travel toward the cell.
4. Release three protein-like messengers from the DNA illustration.
5. Close the feedback loop and answer a short question about the cave.

The action button, glowing scene hotspot, and Space key provide equivalent
progression. Drag to orbit a focus; scroll to change distance. Progress markers
revisit discovered places. The Field guide offers teacher navigation, scientific
context, model credits and the original animation. Sound is optional. Pause motion
freezes ambient animation, and reduced-motion preferences avoid camera travel.

Graphics include an imported CC0 brain model with sculpted folds, a surrounding
cave, shaded molecular clusters, a 3D double helix, neural curves with traveling
signals, a translucent cell membrane, depth fog, particles, bloom and warm/cool
lighting. The brain asset is served locally; credit and source information is in
`public/lesson/ASSET-CREDITS.md` and the Field guide. No runtime model CDN or remote
image service is required.

Implementation:

- `src/lesson/immersive-world.js`: connected environment, geometry, materials and effects.
- `src/lesson/main.js`: discovery state machine, camera paths, interaction and audio.
- `src/lesson/style.css`, `lesson/index.html`: responsive interface and teaching notes.
- `public/lesson/source-manifest.json`: original native-project chapter mapping and source hash.
- `artifacts/redesign-audit/`: before screenshots, source captures and audit findings.

The original nine chapters remain provenance, rather than the new navigation
structure. The original sound mix is an optional looping ambience; it does not
control the new lesson timing. Biological shapes, signal paths, speed, particle
counts and movement between scales are illustrative, not a medical or biochemical
simulation. The Field guide explains the limits of the source's CLK/PER shorthand.
This is an authored adaptation, not an automatic Cavalry scene importer.

## Start creating

```sh
npm install
npm run dev
```

Open the localhost URL printed in your terminal (usually http://localhost:5173).
Keep the server running while you create; saved changes refresh in the browser.
Use a modern browser with WebGL 2 and hardware acceleration enabled.

- **src/experience.js** — your scene: geometry, materials, lighting and animation. Start here.
- **src/main.js** — renderer, camera, orbit controls and UI bindings.
- **src/style.css** — the page layout and controls.
- **index.html** — the canvas and interface.

Drag to orbit, scroll to zoom, or use the controls to change the shape, color,
rotation and wireframe. Reset view restores the camera. Reduced-motion preferences
start the animation paused; Resume enables it.

Add images and models to `public/`, then load them with paths like `/model.glb`.
Import Three.js addons with `three/addons/...`.

## Build and preview

```sh
npm run build
npm run preview
```

`dist/` contains the production website. Preview serves it locally.
Requires Node.js 20.19+ or 22.12+; this project was set up with Node.js 24.

Resources: [Three.js manual](https://threejs.org/manual/),
[Three.js examples](https://threejs.org/examples/), [Vite guide](https://vite.dev/guide/).

## GitHub Pages deployment

The public lesson is deployed from `main` by `.github/workflows/deploy.yml`.
The workflow uses Node.js 24, `npm ci`, a Vite production build and the official
GitHub Pages artifact/deployment actions pinned to commit hashes.

```sh
PAGES_BASE_PATH=/udgam-world-within/ npm run build:pages
```

The hosted repository root opens the lesson; local development retains the
original playground at `/` and the lesson at `/lesson/`. Base paths for the
brain model, video, soundtrack and links work under the repository URL.
The `archive/` and `artifacts/` folders are local design history and are ignored
by Git.
