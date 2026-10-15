# Stockwell Community Trust — Light Study

A responsive interactive sculpture study with a frosted glass disc on two wooden columns.

- Participants slider: 0–20 people, with one coloured piece per person.
- White 3D figures underneath the disc match the participants count, with varied
  adult, child and older-person proportions and poses. Adults are about 44%
  of the column height, with spread-out positions that leave room for 20 people.
  The figures use local procedural geometry; no downloads needed.
- Zero participants: a neutral glass disc with no coloured pieces.
- Day, Dusk and Night change the palette independently of the piece count.
- All interface labels and accessibility descriptions are in English.
- Perspective camera, mouse/touch rotation and accessible angle sliders.
- Smooth interruptible transitions; reduced-motion preference supported.
- Desktop side-by-side layout and mobile stacked layout.

## Run locally

No build or dependencies are required. Serve this directory:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Publish with GitHub Pages

Commit these files to the `main` branch. Open **Settings → Pages** and choose
**Deploy from a branch → main → / (root) → Save**. GitHub will display the live
URL after its Pages deployment finishes. All asset paths are relative, so the
site works at a repository subpath as well as a custom domain.

## Files

- `index.html` — semantic interface and inline icons.
- `styles.css` — desktop/mobile layouts and three ambient themes.
- `app.js` — geometry, perspective projection, materials and interaction.

No external scripts, fonts, API keys or network services are used. View and mode
preferences are stored only in the visitor’s browser.
