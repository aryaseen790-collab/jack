# Jack Menu Guide

An unofficial, fan-made website for the Jack in the Box menu, with researched prices. Plain HTML, CSS and JavaScript, with no build step.

> Not affiliated with or endorsed by Jack in the Box Inc. Prices vary by location.

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Full menu (search, filter, sort) | `menu.html` |
| Burgers | `burgers.html` |
| Chicken | `chicken.html` |
| Tacos & Munchies | `tacos.html` |
| Breakfast | `breakfast.html` |
| Sides & Snacks | `sides.html` |
| Desserts & Drinks | `desserts.html` |
| Combos | `combos.html` |
| Deals & specials | `deals.html` |
| My order (price estimator) | `order.html` |
| About & FAQ | `about.html` |
| Price sources | `sources.html` |
| Not found | `404.html` |

## Updating prices

All menu items, prices and deals live in `assets/menu-data.js`. Each item has a typical `price`, plus optional `low`/`high` values when sources disagreed. Edit that file and every page updates.

Prices were last checked on October 31, 2026. See `sources.html` for where they came from.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`. Turn on Pages in the repository settings (Source: GitHub Actions).
