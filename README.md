# Bedrock Button Customizer (PWA starter)

## Run it
A service worker requires HTTPS or localhost. Extract the ZIP and serve this folder with any static web server (for example, `python -m http.server 8000` on a computer, or a local Android web-server app). Open the URL in Android Chrome and use **Install** / **Add to Home screen**.

JSZip is loaded from jsDelivr. Open the app once while online; the service worker caches same-origin app files, but the JSZip CDN script may need an internet connection on a fresh install. For fully offline deployment, download `jszip.min.js`, place it beside `index.html`, and change the script tag to `./jszip.min.js`.

## Current implementation
- Local `.mcpack` / `.zip` import and supported Chromium folder import.
- JSON parsing, `manifest.json` pack-name lookup, global variables and UI JSON discovery.
- Heuristic candidate detection for vector-like position and size values, plus optional opacity/visibility keys.
- Exact dot-path manual mapping for JSON properties.
- Canvas preview, drag positioning, vector size editing, opacity, mapped visibility, safe-area guides, orientation, zoom and fullscreen.
- Local project snapshot storage in IndexedDB, with saved-project reopening.
- `.mcpack` ZIP export while retaining unmodified file bytes and folder paths.
- PWA manifest and service worker.

## Important compatibility limits
Minecraft Bedrock resource packs do not expose one universal schema for touch buttons. This tool intentionally does **not** claim that every guessed coordinate is a Minecraft screen coordinate, or that an arbitrary button can be hidden. Detection is heuristic. Review the file/path shown for each control and use manual mapping when needed. A missing visibility mapping means visibility cannot safely be changed. UI JSON may define controls using nested control trees, bindings, expressions or engine-specific semantics; this first version does not rewrite arbitrary UI definitions or infer all those semantics. It preserves unknown files and values, and only changes explicitly mapped paths.

The preview is a coordinate editor, not a live Minecraft renderer. Safe-area values are user-adjustable guides; browser viewport insets are not assumed to equal Minecraft's UI safe area.

## Next engineering steps for broad compatibility
Build a pack-specific schema adapter layer with verified fixtures from multiple Bedrock versions and packs; add UI control-tree parsing and binding/expression analysis; identify coordinate units and anchors per control; validate exported packs against Minecraft's UI parser; and provide round-trip tests. Never treat a successful ZIP export as proof that Minecraft will load the controls.
