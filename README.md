# Hello World — Portfolio

Static website recreated from the supplied Paper frame. Desktop layout matches the 1440 × 1024 design; mobile layout adapts the heading and sculpture to a narrow screen.

Preview: run `python3 -m http.server 4173 --directory dist` from this folder and open http://localhost:4173.

The publishable website is in `dist/`. Edit `dist/index.html` and `dist/styles.css` to update it. No build or dependencies are required.

Upload the contents of `dist/` directly to any static host, keeping `assets/` beside `index.html`. You can also open `dist/index.html` directly in a browser. All images and fonts are local, so the page has no external runtime requests. This presentation page needs no JavaScript.
