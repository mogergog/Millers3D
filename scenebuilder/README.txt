Scene Builder — offline / self-hosted setup
============================================

All external libraries are now vendored in ./vendor, so the app no longer
depends on any CDN (unpkg / jsdelivr). It still must be served over http://
(not opened via file://) because browsers block ES-module imports from file://.

Run a local web server from THIS folder, e.g.:
    python -m http.server 8000
    # or: npx serve .
Then open http://localhost:8000/index.html  (or scene-builder.html)

Folder structure
-----------------
scene-builder-app/
├── index.html          ← split version entry point (uses style.css + app.js)
├── style.css
├── app.js
├── scene-builder.html  ← single-file version (still needs ./vendor at runtime)
└── vendor/
    ├── three/
    │   ├── build/three.module.js
    │   ├── jsm/controls/OrbitControls.js
    │   ├── jsm/controls/TransformControls.js
    │   ├── jsm/loaders/STLLoader.js
    │   ├── jsm/loaders/GLTFLoader.js
    │   ├── jsm/loaders/OBJLoader.js
    │   ├── jsm/utils/BufferGeometryUtils.js   (needed by GLTFLoader)
    │   └── LICENSE
    └── occt/
        ├── occt-import-js.js
        ├── occt-import-js.wasm                (loaded at runtime for STEP files)
        └── license.*.txt

How the wiring works
--------------------
• index.html / scene-builder.html contain an import map:
      "three"         -> ./vendor/three/build/three.module.js
      "three/addons/" -> ./vendor/three/jsm/
• The occt parser script is loaded from ./vendor/occt/occt-import-js.js and
  its .wasm is located via locateFile -> ./vendor/occt/ in app.js.

Versions vendored
-----------------
• three.js        0.160.0
• occt-import-js   0.0.23

To update later: replace the files in ./vendor with the matching version and
keep the same paths (and keep three's jsm/utils/BufferGeometryUtils.js).
