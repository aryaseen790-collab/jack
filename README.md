# Jack Menu Guide

An unofficial, fan-made website for the Jack in the Box menu, with researched prices. Plain HTML, CSS and JavaScript, with no build step and no dependencies.

## Features

- **The toy box (home page):** a 3D jack-in-the-box built in CSS. Drag the crank clockwise (or press "Turn it for me") and it plays *Pop Goes the Weasel* note by note; on the "Pop!" the lid springs open and a menu item bounces out on a coil. All movement uses a small spring-physics engine, so every pop wobbles a little differently.
- **Music box sound:** off by default. Turn it on with the ♪ button to hear the tune, crank clicks, the pop and the receipt printer, all generated live with the Web Audio API.
- **Drive-thru menu board:** sections and items laid out like a backlit menu board, with dotted leaders and prices on **split-flap tiles** that flip when they scroll into view or change.
- **Preview box:** hover (or focus) any item on a menu page and it pops out of a box beside the board. On phones, tapping an item opens a pop-up sheet instead.
- **Thermal receipt cart:** + adds items to a receipt that prints out of a slot under the header, with a jagged tear-off edge and barcode. "Tear off" clears it.
- **"What can I get for $X?":** set a budget and it builds the three best meals (entrée, side, drink or dessert) that fit, including tax.
- **Late-night neon sign** that lights up during Munchie Meal hours, **coupon-style deals**, ⌘K/Ctrl+K search, smooth page transitions and a light/dark switch.
- Works on phones, supports keyboard use, and respects reduced-motion settings.

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

## Adding images

Every picture has a reserved space that shows the file name it's waiting for. Save an image with that name (`.webp` or `.png`) into `assets/img/` and it appears automatically. [`docs/IMAGES.md`](docs/IMAGES.md) lists every file name with a ready-to-use image-generator prompt.

## Updating prices

All menu items, prices and deals live in `assets/menu-data.js`. Each item has a typical `price`, plus optional `low`/`high` values when sources disagreed. Edit that file and every page updates.

Prices were last checked on October 31, 2026. See `sources.html` for where they came from.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main` or `claude/pensive-heisenberg-1tyw9g`. If the first run can't turn Pages on by itself, open **Settings → Pages**, set **Source** to **GitHub Actions**, and re-run the workflow.

Live site: https://aryaseen790-collab.github.io/jack/
