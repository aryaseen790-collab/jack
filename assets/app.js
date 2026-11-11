/* Jack Menu Guide — interactions
   - Spring: a tiny damped-spring solver that drives the toy box
   - Box: the 3D jack-in-the-box (crank, lid, coil, popping item)
   - Flap: split-flap price tiles
   - Receipt: the order, printed on a thermal receipt
   - Sound: an optional music box (off until the visitor turns it on) */
(() => {
  "use strict";
  const M = window.MENU;
  const doc = document;
  const root = doc.documentElement;
  const $ = (s, el = doc) => el.querySelector(s);
  const $$ = (s, el = doc) => [...el.querySelectorAll(s)];
  const page = doc.body.dataset.page || "";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const narrow = () => matchMedia("(max-width: 900px)").matches;
  const money = (n) => "$" + n.toFixed(2);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };

  M.items.forEach((i) => { i.slug = i.slug || slugify(i.name); });
  M.deals.forEach((d) => { d.slug = d.slug || slugify(d.title); });
  const cats = Object.fromEntries(M.categories.map((c) => [c.id, c]));
  const bySlug = Object.fromEntries(M.items.map((i) => [i.slug, i]));

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    theme: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
    note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    crank: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'
  };
  const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

  /* Image slot: loads assets/img/<path>.webp then .png; the head script
     swaps in the placeholder when neither exists. */
  function slot(path, emoji, alt = "") {
    return `<div class="slot"><img src="assets/img/${path}.webp" data-alt="assets/img/${path}.png" alt="${esc(alt)}" loading="lazy" decoding="async">` +
      `<div class="slot-ph" aria-hidden="true"><span class="slot-emoji">${emoji}</span>${M.showImageSlots ? `<code>img/${path}</code>` : ""}</div></div>`;
  }

  /* ---------- Spring physics ---------- */
  const springs = new Set();
  let rafId = 0, lastT = 0;
  class Spring {
    constructor({ x = 0, k = 170, c = 20, on }) { this.x = x; this.t = x; this.v = 0; this.k = k; this.c = c; this.on = on; springs.add(this); on && on(x, 0); }
    set(t, c) { if (c != null) this.c = c; this.t = t; if (reduce) return this.jump(t); wake(); }
    kick(v) { if (reduce) return; this.v += v; wake(); }
    jump(x) { this.x = this.t = x; this.v = 0; this.on && this.on(x, 0); }
  }
  function wake() { if (!rafId) { lastT = performance.now(); rafId = requestAnimationFrame(tick); } }
  function tick(now) {
    const dt = Math.min(0.034, (now - lastT) / 1000); lastT = now;
    let busy = false;
    springs.forEach((s) => {
      const n = 6, h = dt / n;
      for (let i = 0; i < n; i++) { const a = -s.k * (s.x - s.t) - s.c * s.v; s.v += a * h; s.x += s.v * h; }
      if (Math.abs(s.v) < 0.002 && Math.abs(s.x - s.t) < 0.002) { s.x = s.t; s.v = 0; } else busy = true;
      s.on && s.on(s.x, s.v);
    });
    rafId = busy ? requestAnimationFrame(tick) : 0;
  }

  /* ---------- Music box (Web Audio, off by default) ---------- */
  const Sound = {
    on: store.get("jmg-sound", false), ctx: null,
    ready() {
      if (!this.on) return null;
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
    env(g, t, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); },
    tine(freq, when = 0) {
      const c = this.ready(); if (!c) return;
      const t = c.currentTime + when, out = c.createGain();
      this.env(out, t, 0.2, 1.3); out.connect(c.destination);
      [[1, 1], [4.07, 0.18], [10.2, 0.05]].forEach(([m, a]) => {
        const o = c.createOscillator(), g = c.createGain(); o.frequency.value = freq * m; g.gain.value = a;
        o.connect(g).connect(out); o.start(t); o.stop(t + 1.4);
      });
    },
    click() {
      const c = this.ready(); if (!c) return;
      const len = Math.floor(c.sampleRate * 0.025), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = b; f.type = "bandpass"; f.frequency.value = 3200; g.gain.value = 0.35; s.connect(f).connect(g).connect(c.destination); s.start();
    },
    boing() {
      const c = this.ready(); if (!c) return;
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(560, t + 0.1); o.frequency.exponentialRampToValueAtTime(260, t + 0.7);
      lfo.frequency.value = 16; lg.gain.value = 45; lfo.connect(lg).connect(o.frequency);
      this.env(g, t, 0.32, 0.8); o.connect(g).connect(c.destination); o.start(t); lfo.start(t); o.stop(t + 0.85); lfo.stop(t + 0.85);
    },
    printer(lines = 8) {
      const c = this.ready(); if (!c) return;
      for (let i = 0; i < lines; i++) {
        const t = c.currentTime + i * 0.055, o = c.createOscillator(), g = c.createGain();
        o.type = "square"; o.frequency.value = 900 + (i % 2) * 140; this.env(g, t, 0.035, 0.04); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.05);
      }
    },
    tear() {
      const c = this.ready(); if (!c) return;
      const len = Math.floor(c.sampleRate * 0.3), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.3) * (1 - i / len);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = b; f.type = "highpass"; f.frequency.value = 1800; g.gain.value = 0.3; s.connect(f).connect(g).connect(c.destination); s.start();
    }
  };
  // "Pop Goes the Weasel" (traditional). The note at POP_AT is the "Pop!".
  const NOTE = { G3: 196, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440 };
  const MELODY = "C4 C4 D4 D4 E4 G4 E4 C4 G3 C4 C4 D4 D4 E4 C4 C4 C4 D4 D4 E4 G4 E4 C4 A4 D4 F4 E4 C4".split(" ");
  const POP_AT = 23;
  function setSound(on) {
    Sound.on = on; store.set("jmg-sound", on);
    $$("[data-sound]").forEach((b) => { b.setAttribute("aria-pressed", String(on)); const l = $(".label", b); if (l) l.textContent = on ? "Music box on" : "Music box off"; });
    if (on) Sound.tine(NOTE.C4 * 2);
  }

  /* ---------- Split-flap tiles ---------- */
  const FLAP_DIGITS = "0123456789";
  function flap(el, text, animate = true) {
    text = String(text);
    const prev = el._text;
    el._text = text;
    if (!el._cells || el._cells.length !== text.length) {
      el.innerHTML = `<span class="sr-only">${esc(text)}</span>` + [...text].map((ch) => `<span class="flap-cell${/[$.,:\s]/.test(ch) ? " narrow" : ""}" aria-hidden="true"><span>${ch === " " ? "&nbsp;" : esc(ch)}</span></span>`).join("");
      el._cells = $$(".flap-cell", el);
      if (!animate || reduce) return;
    } else {
      $(".sr-only", el).textContent = text;
    }
    if (!animate || reduce) { el._cells.forEach((c, i) => (c.firstChild.textContent = text[i])); return; }
    [...text].forEach((ch, i) => {
      const cell = el._cells[i];
      if (prev && prev[i] === ch && prev.length === text.length) return;
      cell.className = "flap-cell" + (/[$.,:\s]/.test(ch) ? " narrow" : "");
      const spins = /\d/.test(ch) ? 3 + ((i * 7 + text.length) % 4) : 1;
      let k = 0;
      clearTimeout(cell._t);
      const step = () => {
        cell.classList.remove("flip"); void cell.offsetWidth;
        cell.firstChild.textContent = k < spins - 1 ? FLAP_DIGITS[(Math.random() * 10) | 0] : ch;
        cell.classList.add("flip");
        if (++k < spins) cell._t = setTimeout(step, 70);
      };
      cell._t = setTimeout(step, i * 40);
    });
  }
  // Flip price tiles when they scroll into view, like a board powering on.
  const flapIO = "IntersectionObserver" in window && !reduce ? new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target; flapIO.unobserve(el);
    const t = el._text; el._text = t.replace(/\d/g, "0"); flap(el, t);
  }), { threshold: 0.6 }) : null;
  function initFlaps(scope = doc) {
    $$("[data-flap]", scope).forEach((el) => { if (el._cells) return; flap(el, el.dataset.flap, false); flapIO && flapIO.observe(el); });
  }

  /* ---------- Header & footer ---------- */
  const shortName = { tacos: "Tacos", sides: "Sides", desserts: "Desserts" };
  const navLinks = [{ href: "menu.html", label: "Full menu", id: "menu" }]
    .concat(M.categories.map((c) => ({ href: c.page, label: shortName[c.id] || c.name, id: c.id })))
    .concat([{ href: "deals.html", label: "Deals", id: "deals" }, { href: "about.html", label: "About", id: "about" }]);
  const header = $("#site-header");
  if (header) {
    header.innerHTML = `<div class="bar">
      <a class="brand" href="index.html" aria-label="Jack Menu Guide home"><span class="brand-box" aria-hidden="true"></span><span class="brand-name">Jack Menu <em>Guide</em></span></a>
      <nav class="nav" id="nav" aria-label="Main">${navLinks.map((l) => `<a href="${l.href}"${l.id === page ? ' aria-current="page"' : ""}>${esc(l.label)}</a>`).join("")}</nav>
      <div class="tools">
        <button class="tool" type="button" data-palette aria-label="Search the menu">${icon("search")}<span class="label">Search</span><kbd>⌘K</kbd></button>
        <button class="tool" type="button" data-sound aria-pressed="false" aria-label="Music box sound">${icon("note")}</button>
        <button class="tool" type="button" id="theme-btn" aria-label="Switch light or dark mode">${icon("theme")}</button>
        <button class="tool tool-receipt" type="button" id="receipt-btn" aria-label="Open my receipt">${icon("receipt")}<span class="n" id="receipt-count">0</span></button>
        <button class="tool nav-toggle" type="button" id="nav-btn" aria-label="Open menu" aria-expanded="false" aria-controls="nav">${icon("menu")}</button>
      </div></div>`;
    $("#nav-btn").addEventListener("click", (e) => {
      const open = $("#nav").classList.toggle("open");
      e.currentTarget.setAttribute("aria-expanded", String(open));
      e.currentTarget.innerHTML = icon(open ? "close" : "menu");
    });
    $("#theme-btn").addEventListener("click", toggleTheme);
    $("#receipt-btn").addEventListener("click", () => openTray(!$("#tray").classList.contains("open")));
    addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 6), { passive: true });
  }
  const footer = $("#site-footer");
  if (footer) {
    footer.innerHTML = `<div class="wrap footer-inner">
      <div><strong>Jack Menu Guide</strong><p>An unofficial, fan-made guide to the Jack in the Box menu. Not affiliated with or endorsed by Jack in the Box Inc. Prices checked ${esc(M.updated)}.</p></div>
      <div><strong>Menu</strong>${M.categories.map((c) => `<a href="${c.page}">${esc(c.name)}</a>`).join("")}</div>
      <div><strong>Site</strong><a href="menu.html">Full menu</a><a href="deals.html">Deals</a><a href="order.html">My receipt</a><a href="about.html">About &amp; FAQ</a><a href="sources.html">Price sources</a></div>
    </div><div class="wrap fineprint">Prices vary by location and change often. Check the official Jack in the Box app or your local restaurant before ordering.</div>`;
  }

  /* ---------- Overlays ---------- */
  doc.body.insertAdjacentHTML("beforeend", `
    <div class="scrim" id="scrim"></div>
    <aside class="tray" id="tray" aria-label="My receipt" aria-hidden="true">
      <button class="tool tray-close" type="button" data-close-tray aria-label="Close receipt">${icon("close")}</button>
      <div class="printer" aria-hidden="true"></div>
      <div class="tray-paper"><div class="tray-scroll"><div class="receipt" data-receipt></div>
        <div class="receipt-actions" style="padding:0 2px 6px"><a class="btn sm" href="order.html">Open full receipt</a><button class="btn sm ghost" type="button" data-tear>Tear off</button></div></div></div>
    </aside>
    <div class="slip" id="slip" aria-hidden="true"><div class="receipt"></div></div>
    <dialog class="sheet" id="sheet" aria-label="Item details"></dialog>
    <dialog id="palette" aria-label="Search">
      <div class="palette">
        <div class="palette-input">${icon("search")}<input id="palette-q" type="search" placeholder="Search items, sections and pages" autocomplete="off" aria-label="Search"><kbd>esc</kbd></div>
        <ul id="palette-list" role="listbox"></ul>
        <div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
      </div>
    </dialog>
    <p class="sr-only" id="announce" aria-live="polite"></p>`);
  const announce = (m) => { $("#announce").textContent = m; };
  $$("[data-sound]").forEach((b) => b.addEventListener("click", () => setSound(!Sound.on)));
  // Sound never starts by itself: the AudioContext is only created after a click.
  $$("[data-sound]").forEach((b) => { b.setAttribute("aria-pressed", String(Sound.on)); const l = $(".label", b); if (l) l.textContent = Sound.on ? "Music box on" : "Music box off"; });

  /* ---------- Theme switch with a circular wipe ---------- */
  function toggleTheme(e) {
    const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    const apply = () => { root.dataset.theme = dark ? "light" : "dark"; store.set("jitb-guide-theme", root.dataset.theme); };
    if (!doc.startViewTransition || reduce) return apply();
    const r = e.currentTarget.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("theme-switching");
    const vt = doc.startViewTransition(apply);
    vt.ready.then(() => root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" }));
    vt.finished.finally(() => root.classList.remove("theme-switching"));
  }

  /* ---------- Receipt / cart ---------- */
  let cart = store.get("jitb-guide-cart", {});
  for (const k in cart) if (!bySlug[k] || !(cart[k] > 0)) delete cart[k];
  let taxRate = store.get("jitb-guide-tax", 8.25);
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = (c = cart) => Object.entries(c).reduce((s, [k, q]) => s + bySlug[k].price * q, 0);
  const stamp = () => { const d = new Date(); return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) + "  " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); };
  function receiptHTML({ items = cart, controls = true, title = "Jack Menu Guide", note = "Price estimate · not an order", stamped = true } = {}) {
    const keys = Object.keys(items).filter((k) => items[k] > 0);
    const sub = subtotal(items), tax = sub * taxRate / 100;
    const lines = keys.length ? keys.map((k) => {
      const it = bySlug[k];
      return `<li class="r-item"><span>${items[k]}</span><span class="r-name">${esc(it.name)}</span><span class="r-amt">${money(it.price * items[k])}</span>` +
        (controls ? `<span class="r-ctl"><button type="button" data-dec="${k}" aria-label="Remove one ${esc(it.name)}">${icon("minus")}</button><button type="button" data-inc="${k}" aria-label="Add one ${esc(it.name)}">${icon("plus")}</button></span>` : "") + `</li>`;
    }).join("") : `<li class="r-empty">No items yet.<br>Tap + on any menu item.</li>`;
    return `<div class="r-head"><strong>${esc(title)}</strong><span>${esc(note)}</span>${stamped ? `<span>${stamp()}</span>` : ""}</div><div class="r-rule"></div>
      <ul class="r-items">${lines}</ul><div class="r-rule"></div>
      <div class="r-tot"><span>Subtotal</span><span>${money(sub)}</span></div>
      <div class="r-tot"><span>Est. tax ${taxRate}%</span><span>${money(tax)}</span></div>
      <div class="r-tot r-grand"><span>Total</span><span>${money(sub + tax)}</span></div><div class="r-rule"></div>
      <div class="barcode" aria-hidden="true"></div><p class="r-foot">Prices vary by location<br>Come back hungry</p>`;
  }
  const countSpring = new Spring({ x: 1, k: 400, c: 14, on: (v) => { const el = $("#receipt-btn"); if (el) el.style.transform = `scale(${v})`; } });
  function renderCart() {
    $$("[data-receipt]").forEach((el) => (el.innerHTML = receiptHTML()));
    const n = $("#receipt-count"); if (n) n.textContent = cartCount();
  }
  function saveCart() { store.set("jitb-guide-cart", cart); renderCart(); }
  function addToCart(slug, qty = 1) {
    cart[slug] = (cart[slug] || 0) + qty; saveCart();
    countSpring.jump(1); countSpring.kick(9);
    const it = bySlug[slug];
    announce(`Added ${qty} ${it.name} to your receipt`);
    Sound.printer(4);
    if (!$("#tray").classList.contains("open")) {
      const slip = $("#slip");
      $(".receipt", slip).innerHTML = `<div class="r-item"><span>+${qty}</span><span class="r-name">${esc(it.name)}</span><span class="r-amt">${money(it.price * qty)}</span></div><div class="r-rule"></div><div class="r-tot"><span>Total</span><span>${money(subtotal() * (1 + taxRate / 100))}</span></div>`;
      slip.classList.remove("show"); void slip.offsetWidth; slip.classList.add("show");
    }
  }
  function openTray(open) {
    const tray = $("#tray");
    tray.classList.toggle("open", open); tray.setAttribute("aria-hidden", String(!open));
    $("#scrim").classList.toggle("open", open);
    if (open) { renderCart(); Sound.printer(14); $("#slip").classList.remove("show"); setTimeout(() => $("[data-close-tray]").focus(), 50); }
  }
  $("#scrim").addEventListener("click", () => openTray(false));
  function tearOff(el) {
    if (!cartCount()) return;
    Sound.tear();
    const done = () => { cart = {}; saveCart(); announce("Receipt cleared"); };
    if (reduce || !el) return done();
    el.classList.add("tearing");
    setTimeout(() => { el.classList.remove("tearing"); done(); }, 650);
  }

  /* ---------- The box ---------- */
  function createBox(host, opts = {}) {
    const S = opts.size || 230;
    host.innerHTML = `<div class="box-scene" style="--s:${S}px"><div class="box-shadow"></div>
      <div class="box-tilt"><div class="box">
        <div class="face f-back"></div><div class="face f-left"></div><div class="face f-bottom"></div>
        <div class="face f-right">${opts.crank ? `<button type="button" class="crank" aria-label="Turn the crank. Press Enter to crank until something pops out, or the right arrow key to turn one click.">
          <span class="crank-plate"></span><span class="crank-rot"><span class="crank-arm"></span><span class="crank-knob"></span></span><span class="crank-hub"></span></button>` : ""}</div>
        <div class="popper"><svg class="coil" aria-hidden="true"><path/></svg><div class="pop-item"></div></div>
        <div class="face f-front"><span class="box-word">MENU</span><span class="box-sub">★ GUIDE ★</span></div>
        <div class="lid-hinge"><div class="lid"><div class="lid-lip"></div></div></div>
      </div></div></div>`;
    const scene = $(".box-scene", host), tilt = $(".box-tilt", host), hinge = $(".lid-hinge", host);
    const item = $(".pop-item", host), coil = $(".coil", host), path = $("path", coil);
    const rise = S * 1.08, coilW = 52;
    let squash = 0;
    const lid = new Spring({ x: 0, k: 190, c: 13, on: (v) => { hinge.style.transform = `translateZ(${-S / 2}px) rotateX(${v}deg)`; } });
    const pop = new Spring({ x: 0, k: 230, c: 11, on: (v, vel) => {
      const h = Math.max(0, v) * rise;
      squash = clamp(vel * 0.03, -0.2, 0.24);
      item.style.transform = `translateY(${-h}px) scale(${1 - squash * 0.45}, ${1 + squash})`;
      const H = h + 8, turns = 9; coil.setAttribute("height", Math.max(10, H)); coil.style.height = Math.max(10, H) + "px";
      coil.setAttribute("viewBox", `0 0 ${coilW} ${Math.max(10, H)}`);
      let d = `M${coilW / 2} ${H}`;
      for (let i = 1; i <= turns * 2; i++) d += ` L${i % 2 ? 4 : coilW - 4} ${(H - (H - 6) * (i / (turns * 2))).toFixed(1)}`;
      path.setAttribute("d", d);
      coil.style.opacity = h > 4 ? 1 : 0;
    } });
    const wob = new Spring({ x: 0, k: 320, c: 9, on: (v) => tilt.style.setProperty("--wob", v.toFixed(2) + "deg") });
    if (finePointer && !reduce) {
      scene.addEventListener("pointermove", (e) => {
        const r = scene.getBoundingClientRect();
        tilt.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        tilt.style.setProperty("--ty", (-((e.clientY - r.top) / r.height - 0.5)).toFixed(3));
      });
      scene.addEventListener("pointerleave", () => { tilt.style.setProperty("--tx", 0); tilt.style.setProperty("--ty", 0); });
    }
    let state = "closed", current = null, token = 0;
    function setItem(it) {
      current = it;
      item.innerHTML = it ? slot("items/" + it.slug, cats[it.cat].icon, it.name) : `<div class="slot"><div class="slot-ph"><span class="slot-emoji">💨</span></div></div>`;
    }
    function open() {
      state = "open";
      lid.set(-104, 10); lid.kick(-240);
      setTimeout(() => { pop.set(1, 9); pop.kick(7); }, reduce ? 0 : 70);
      wob.kick(-60);
      opts.onPop && opts.onPop(current);
    }
    function close() { state = "closed"; pop.set(0, 30); setTimeout(() => lid.set(0, 24), reduce ? 0 : 170); }
    function show(it) {
      const my = ++token;
      if (state === "open") { close(); setTimeout(() => { if (my === token) { setItem(it); open(); } }, reduce ? 0 : 420); }
      else { setItem(it); open(); }
    }
    const api = { show, close, setItem, open, get state() { return state; }, get current() { return current; }, wob };

    if (opts.crank) {
      const crank = $(".crank", host), rot = $(".crank-rot", host);
      let angle = 0, acc = 0, noteIdx = 0, autoRun = false, queue = opts.queue || [], qi = 0;
      const wind = opts.wind;
      const nextItem = () => queue[qi++ % queue.length];
      const setWind = () => wind && wind.style.setProperty("--w", (noteIdx / POP_AT).toFixed(3));
      function clickTick() {
        if (state === "open") { close(); setTimeout(() => setItem(nextItem()), reduce ? 0 : 380); noteIdx = 0; setWind(); return; }
        Sound.click(); Sound.tine(NOTE[MELODY[noteIdx]] * 2);
        wob.kick(noteIdx % 2 ? 26 : -26);
        if (noteIdx === POP_AT) {
          open(); Sound.boing();
          MELODY.slice(POP_AT + 1).forEach((n, i) => Sound.tine(NOTE[n] * 2, 0.32 + i * 0.3));
          noteIdx = 0;
        } else noteIdx++;
        setWind();
      }
      function turn(deg) {
        if (deg <= 0) return;
        angle += deg; rot.style.transform = `translateZ(8px) rotate(${angle}deg)`;
        acc += deg;
        while (acc >= 30) { acc -= 30; clickTick(); }
      }
      function autoCrank() {
        if (autoRun) return;
        if (reduce) { setItem(state === "open" ? nextItem() : current); state = "closed"; open(); return; }
        const ticks = state === "open" ? POP_AT + 2 : POP_AT + 1 - noteIdx;
        const target = ticks * 30 - acc + 0.5;
        let done = 0, last = performance.now(); autoRun = true;
        const step = (now) => {
          const d = Math.min(target - done, 640 * Math.min(0.05, (now - last) / 1000)); last = now;
          turn(d); done += d;
          if (done < target - 0.01) requestAnimationFrame(step); else autoRun = false;
        };
        requestAnimationFrame(step);
      }
      let moved = 0;
      crank.addEventListener("pointerdown", (e) => {
        e.preventDefault(); crank.setPointerCapture(e.pointerId); moved = 0;
        const hub = $(".crank-hub", host).getBoundingClientRect();
        const cx = hub.left + hub.width / 2, cy = hub.top + hub.height / 2;
        let prev = Math.atan2(e.clientY - cy, e.clientX - cx);
        const move = (ev) => {
          const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
          let d = (a - prev) * 180 / Math.PI; if (d > 180) d -= 360; if (d < -180) d += 360;
          prev = a; moved += Math.abs(d); turn(d);
        };
        const up = () => { crank.removeEventListener("pointermove", move); if (moved < 6) autoCrank(); };
        crank.addEventListener("pointermove", move);
        crank.addEventListener("pointerup", up, { once: true });
        crank.addEventListener("pointercancel", up, { once: true });
      });
      crank.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); autoCrank(); }
        else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); turn(30 - acc + 0.01); }
      });
      api.autoCrank = autoCrank;
      setItem(nextItem());
    }
    return api;
  }

  /* Item card next to a box */
  function itemCard(it, { label = "Popped out", crank = false } = {}) {
    const range = it.low != null && it.high != null && it.low !== it.high ? `Seen ${money(it.low)}–${money(it.high)} depending on location` : "Typical price across sources";
    return `<span class="eyebrow">${esc(label)} · ${esc(cats[it.cat].name)}</span>
      <h2>${esc(it.name)}</h2><span class="flap" data-card-price aria-label="${money(it.price)}"></span>
      <p>${esc(it.desc)}</p><span class="range">${range}</span>
      <div class="actions"><button class="btn mustard sm" type="button" data-add="${it.slug}">${icon("plus")} Add to receipt</button>${crank ? `<button class="btn ghost sm" type="button" data-crank>${icon("crank")} Crank again</button>` : `<a class="btn ghost sm" href="${cats[it.cat].page}">More ${esc(cats[it.cat].name.toLowerCase())}</a>`}</div>`;
  }
  function fillCard(card, it, o) {
    card.innerHTML = itemCard(it, o);
    const f = $("[data-card-price]", card); f.removeAttribute("aria-label");
    const p = money(it.price); flap(f, p.replace(/\d/g, "0"), false); flap(f, p);
  }

  /* ---------- Board rows ---------- */
  function row(it) {
    const tags = (it.tags || []).map((t) => `<span class="tag tag-${t.replace(/\s/g, "-")}">${esc(t)}</span>`).join("");
    const range = it.low != null && it.high != null && it.low !== it.high ? `<span class="range-note">seen ${money(it.low)}–${money(it.high)}</span>` : "";
    return `<li class="row" data-slug="${it.slug}" style="view-transition-name: r-${it.slug}">
      <button type="button" class="row-main" data-preview="${it.slug}" aria-label="${esc(it.name)}, ${money(it.price)}. Show details">
        <span class="row-line"><span class="row-name">${esc(it.name)}</span><span class="leader" aria-hidden="true"></span><span class="flap" data-flap="${money(it.price)}"></span></span>
        <span class="row-desc">${esc(it.desc)}</span>
        ${tags || range ? `<span class="row-meta">${tags}${range}</span>` : ""}
      </button>
      <button type="button" class="row-add" data-add="${it.slug}" aria-label="Add ${esc(it.name)} to receipt">${icon("plus")}</button>
    </li>`;
  }

  /* Preview box (desktop) and bottom sheet (phones) */
  let previewBox = null, previewCard = null;
  const previewHost = $("#preview-box");
  if (previewHost) {
    previewBox = createBox(previewHost, { size: 170, onPop: (it) => it && fillCard(previewCard, it, { label: "In the box" }) });
    previewCard = $("#preview-card");
  }
  function preview(slug, fromClick) {
    const it = bySlug[slug];
    $$(".row.active").forEach((r) => r.classList.remove("active"));
    $$(`.row[data-slug="${slug}"]`).forEach((r) => r.classList.add("active"));
    if (previewBox && !narrow()) { if (previewBox.current !== it || previewBox.state !== "open") previewBox.show(it); return; }
    if (!fromClick) return;
    const sheet = $("#sheet");
    sheet.innerHTML = `<div class="sheet-inner"><button class="x" type="button" data-close-sheet aria-label="Close">${icon("close")}</button><div data-sheet-box></div><div class="pop-card" data-sheet-card></div></div>`;
    const card = $("[data-sheet-card]", sheet);
    fillCard(card, it, { label: "In the box" });
    const b = createBox($("[data-sheet-box]", sheet), { size: 150 });
    b.setItem(it);
    sheet.showModal();
    setTimeout(() => b.open(), reduce ? 0 : 260);
  }
  $("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet" || e.target.closest("[data-close-sheet]")) $("#sheet").close(); });
  if (finePointer) {
    let hoverT;
    doc.addEventListener("pointerover", (e) => {
      const r = e.target.closest && e.target.closest("[data-preview]");
      if (!r || !previewBox) return;
      clearTimeout(hoverT); hoverT = setTimeout(() => preview(r.dataset.preview), 160);
    });
  }
  doc.addEventListener("focusin", (e) => { const r = e.target.closest && e.target.closest("[data-preview]"); if (r && previewBox && !narrow()) preview(r.dataset.preview); });

  /* ---------- Global clicks ---------- */
  doc.addEventListener("click", (e) => {
    const t = e.target;
    const add = t.closest("[data-add]");
    if (add) {
      addToCart(add.dataset.add);
      if (add.classList.contains("row-add")) { add.classList.add("done"); add.innerHTML = icon("check"); setTimeout(() => { add.classList.remove("done"); add.innerHTML = icon("plus"); }, 1100); }
      return;
    }
    const meal = t.closest("[data-add-meal]");
    if (meal) { meal.dataset.addMeal.split(",").forEach((s) => addToCart(s)); return; }
    const pv = t.closest("[data-preview]");
    if (pv) return preview(pv.dataset.preview, true);
    const inc = t.closest("[data-inc]"), dec = t.closest("[data-dec]");
    if (inc) { cart[inc.dataset.inc]++; return saveCart(); }
    if (dec) { const k = dec.dataset.dec; if (--cart[k] <= 0) delete cart[k]; return saveCart(); }
    if (t.closest("[data-close-tray]")) return openTray(false);
    if (t.closest("[data-tear]")) return tearOff(t.closest("[data-tear]").closest(".tray") ? $("#tray .receipt") : $("#order-receipt"));
    if (t.closest("[data-palette]")) return openPalette();
    if (t.closest("[data-crank]") && heroBox) { heroBox.autoCrank(); return; }
  });

  /* ---------- Command palette ---------- */
  const palette = $("#palette"), pq = $("#palette-q"), plist = $("#palette-list");
  let pIndex = 0, pResults = [];
  const pages = [{ label: "Home", href: "index.html" }, { label: "Full menu", href: "menu.html" }, { label: "Deals", href: "deals.html" }, { label: "My receipt", href: "order.html" }, { label: "About & FAQ", href: "about.html" }, { label: "Price sources", href: "sources.html" }]
    .concat(M.categories.map((c) => ({ label: c.name, href: c.page })));
  function drawPalette() {
    const q = pq.value.trim().toLowerCase();
    const items = M.items.filter((i) => !q || (i.name + " " + i.desc + " " + (i.tags || []).join(" ")).toLowerCase().includes(q)).slice(0, q ? 12 : 6);
    const pg = pages.filter((p) => !q || p.label.toLowerCase().includes(q)).slice(0, q ? 6 : 4);
    pResults = items.map((i) => ({ href: cats[i.cat].page + "#" + i.slug, slug: i.slug })).concat(pg.map((p) => ({ href: p.href })));
    pIndex = clamp(pIndex, 0, Math.max(0, pResults.length - 1));
    let n = 0;
    const li = (inner, href) => { const i = n++; return `<li role="option" aria-selected="${i === pIndex}"><a href="${href}" data-pi="${i}" class="${i === pIndex ? "active" : ""}">${inner}</a></li>`; };
    plist.innerHTML = (items.length ? `<li class="group">Menu items</li>` + items.map((i) => li(`${esc(i.name)}<span class="meta">${money(i.price)}</span>`, cats[i.cat].page + "#" + i.slug)).join("") : "") +
      (pg.length ? `<li class="group">Pages</li>` + pg.map((p) => li(esc(p.label), p.href)).join("") : "") +
      (!pResults.length ? `<li class="group">No results for “${esc(pq.value)}”</li>` : "");
  }
  function choose(i) { const r = pResults[i]; if (!r) return; palette.close(); location.href = r.href; }
  function openPalette() { pq.value = ""; pIndex = 0; drawPalette(); palette.showModal(); pq.focus(); }
  pq.addEventListener("input", () => { pIndex = 0; drawPalette(); });
  pq.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); pIndex = (pIndex + 1) % Math.max(1, pResults.length); drawPalette(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); pIndex = (pIndex - 1 + pResults.length) % Math.max(1, pResults.length); drawPalette(); }
    else if (e.key === "Enter") { e.preventDefault(); choose(pIndex); }
  });
  plist.addEventListener("click", (e) => { const a = e.target.closest("[data-pi]"); if (a) { e.preventDefault(); choose(+a.dataset.pi); } });
  palette.addEventListener("click", (e) => { if (e.target === palette) palette.close(); });
  doc.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette.open ? palette.close() : openPalette(); }
    else if (e.key === "/" && !/input|textarea|select/i.test(doc.activeElement.tagName)) { e.preventDefault(); openPalette(); }
    else if (e.key === "Escape" && $("#tray").classList.contains("open")) openTray(false);
  });

  /* ---------- Home ---------- */
  let heroBox = null;
  const heroHost = $("#hero-box");
  if (heroHost) {
    const popWord = $(".pop-word");
    if (popWord) popWord.innerHTML = [...popWord.textContent].map((c, i) => c === " " ? " " : `<span class="ch" style="--i:${i}">${esc(c)}</span>`).join("");
    const pool = M.items.filter((i) => i.cat !== "combos");
    const first = bySlug["jumbo-jack"];
    const rest = pool.filter((i) => i !== first).sort(() => Math.random() - 0.5);
    const card = $("#pop-card");
    heroBox = createBox(heroHost, {
      size: narrow() ? 160 : 230, crank: true, queue: [first, ...rest], wind: $("#wind i"),
      onPop: (it) => {
        fillCard(card, it, { crank: true });
        if (popWord && !reduce) { popWord.classList.remove("jump"); void popWord.offsetWidth; popWord.classList.add("jump"); }
        announce(`${it.name} popped out, ${money(it.price)}`);
      }
    });
    fillCard(card, first, { crank: true, label: "Waiting in the box" });
    if ($("[data-hero-turn]")) $("[data-hero-turn]").addEventListener("click", () => heroBox.autoCrank());
    if (reduce) heroBox.open(); else setTimeout(() => heroBox.autoCrank(), 700);
  }
  const led = $("#led");
  if (led) {
    const text = M.items.filter((i, n) => n % 2 === 0).map((i) => `<span>${esc(i.name)} ${money(i.price)}</span>`).join("");
    led.innerHTML = text + text;
  }
  const board = $("#menu-board");
  if (board) {
    board.innerHTML = M.categories.map((c) => {
      const its = M.items.filter((i) => i.cat === c.id);
      const from = Math.min(...its.map((i) => i.price));
      return `<a class="panel" href="${c.page}"><span class="panel-name">${esc(c.name)}</span>
        <ul>${its.slice(0, 3).map((i) => `<li><span>${esc(i.name)}</span><i class="leader" aria-hidden="true"></i><b>${money(i.price)}</b></li>`).join("")}</ul>
        <span class="panel-more">${its.length} items · from ${money(from)} →</span>
        <span class="panel-pop" aria-hidden="true">${slot("categories/" + c.id, c.icon)}</span></a>`;
    }).join("") + `<a class="panel panel-cta" href="menu.html"><span class="panel-name">See the whole board</span><span class="panel-more">${M.items.length} items · search, sort, cap the price →</span></a>`;
  }

  /* Budget builder: best meals (entrée + side + extra) that fit the budget */
  const budgetIn = $("#budget");
  if (budgetIn) {
    const entrees = M.items.filter((i) => ["burgers", "chicken", "tacos", "breakfast"].includes(i.cat) && !/munchie/i.test(i.name));
    const sides = [null, ...M.items.filter((i) => i.cat === "sides")];
    const extras = [null, ...M.items.filter((i) => i.cat === "desserts")];
    const out = $("#budget-out"), meals = $("#meals");
    function build() {
      const b = +budgetIn.value;
      flap(out, money(b), !!out._cells);
      const combos = [];
      entrees.forEach((e) => sides.forEach((s) => extras.forEach((x) => {
        const parts = [e, s, x].filter(Boolean), total = parts.reduce((a, p) => a + p.price, 0) * (1 + taxRate / 100);
        if (total <= b) combos.push({ parts, total, score: total + (s ? 1.2 : 0) + (x ? 0.8 : 0) + ((e.tags || []).includes("popular") ? 0.3 : 0) });
      })));
      combos.sort((a, c) => c.score - a.score);
      const picked = [], used = new Set();
      for (const c of combos) { if (used.has(c.parts[0].slug)) continue; used.add(c.parts[0].slug); picked.push(c); if (picked.length === 3) break; }
      if (!picked.length) { meals.innerHTML = `<div class="receipt"><div class="r-head"><strong>Nothing fits yet</strong><span>The cheapest item is ${money(Math.min(...M.items.map((i) => i.price)))} before tax.</span></div></div>`; return; }
      meals.innerHTML = picked.map((c, n) => {
        const items = Object.fromEntries(c.parts.map((p) => [p.slug, 1]));
        return `<div class="meal"><div class="receipt">${receiptHTML({ items, controls: false, stamped: false, title: ["Best fit", "Runner-up", "Also fits"][n], note: `${money(b - c.total)} left over` })}</div>
          <button class="btn sm" type="button" data-add-meal="${c.parts.map((p) => p.slug).join(",")}">${icon("plus")} Add this meal</button></div>`;
      }).join("");
    }
    budgetIn.addEventListener("input", build);
    build();
  }

  const status = $("#late-status");
  if (status) {
    const draw = () => {
      const { start, end } = M.munchieHours, now = new Date(), h = now.getHours() + now.getMinutes() / 60;
      const isOpen = h >= start || h < end;
      $$(".neon .tube-a").forEach((t) => t.classList.toggle("off", !isOpen));
      if (isOpen) { status.style.setProperty("--dot", "#4dff9a"); status.textContent = "Munchie hours are on now"; return; }
      const mins = Math.round((start - h) * 60);
      status.style.setProperty("--dot", "#ff4fa8");
      status.textContent = `Munchie hours start in ${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
    };
    draw(); setInterval(draw, 30000);
  }

  const coupons = $("#coupons");
  if (coupons) {
    const iconFor = { New: "📦", Value: "🌯", App: "📱", "Late night": "🌙" };
    const list = coupons.dataset.limit ? M.deals.slice(0, +coupons.dataset.limit) : M.deals;
    coupons.innerHTML = list.map((d) => `<article class="coupon">
      <div class="coupon-main"><span class="coupon-tag">${esc(d.tag)}</span><h3>${esc(d.title)}</h3><p class="when">${esc(d.when)}</p><p>${esc(d.desc)}</p></div>
      <div class="coupon-stub">${slot("deals/" + d.slug, iconFor[d.tag] || "🏷️", d.title)}${d.starts ? `<span class="flap" data-countdown="${d.starts}"></span>` : ""}</div>
    </article>`).join("");
    const tickCd = () => $$("[data-countdown]").forEach((el) => {
      let s = Math.max(0, Math.floor((new Date(el.dataset.countdown) - Date.now()) / 1000));
      if (!s) { if (el._text !== "NOW ON") flap(el, "NOW ON", false); return; }
      const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60);
      flap(el, `${d}D ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    });
    tickCd(); setInterval(tickCd, 30000);
  }

  /* ---------- Category page ---------- */
  const catRows = $("#category-rows");
  if (catRows) {
    const cid = catRows.dataset.cat, items = M.items.filter((i) => i.cat === cid);
    catRows.innerHTML = items.map(row).join("");
    const prices = items.map((i) => i.price);
    const cnt = $("#category-count");
    if (cnt) cnt.textContent = `${items.length} items · ${money(Math.min(...prices))} to ${money(Math.max(...prices))}`;
    const want = bySlug[location.hash.slice(1)];
    const start = want && want.cat === cid ? want : items[0];
    if (want) setTimeout(() => { const r = $(`.row[data-slug="${want.slug}"]`); r && r.scrollIntoView({ block: "center" }); }, 50);
    if (previewBox) { previewBox.setItem(start); fillCard(previewCard, start, { label: "In the box" }); setTimeout(() => preview(start.slug), reduce ? 0 : 500); }
  }

  /* ---------- Full menu ---------- */
  const full = $("#full-menu");
  if (full) {
    const q = $("#search"), sort = $("#sort"), lanes = $("#lanes"), cap = $("#cap"), capOut = $("#cap-out"), countOut = $("#count-out");
    const params = new URLSearchParams(location.search);
    let active = "all";
    const hi = Math.ceil(Math.max(...M.items.map((i) => i.price)));
    cap.max = hi; cap.value = hi;
    q.value = params.get("q") || "";
    lanes.innerHTML = [["all", "All"]].concat(M.categories.map((c) => [c.id, c.name])).map(([id, l]) => `<button type="button" class="lane" data-lane="${id}" aria-pressed="${id === active}">${esc(l)}</button>`).join("");
    lanes.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lane]"); if (!b) return;
      active = b.dataset.lane; $$(".lane", lanes).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); draw();
    });
    let drawn = false;
    function draw() {
      const term = q.value.trim().toLowerCase(), max = +cap.value;
      flap(capOut, money(max).padStart(6, " "), drawn);
      const list = M.items.filter((i) => (active === "all" || i.cat === active) && i.price <= max && (!term || (i.name + " " + i.desc + " " + (i.tags || []).join(" ")).toLowerCase().includes(term)));
      if (sort.value === "low") list.sort((a, b) => a.price - b.price);
      if (sort.value === "high") list.sort((a, b) => b.price - a.price);
      if (sort.value === "name") list.sort((a, b) => a.name.localeCompare(b.name));
      const render = () => {
        if (!list.length) full.innerHTML = `<div class="board"><p class="empty-board">Nothing on the board matches.<br>Try another word or raise the price cap.</p></div>`;
        else if (sort.value === "section") full.innerHTML = M.categories.map((c) => {
          const its = list.filter((i) => i.cat === c.id);
          return its.length ? `<section class="board"><h2 class="board-title"><a href="${c.page}">${esc(c.name)}</a><small>${its.length} items</small></h2><ul class="rows">${its.map(row).join("")}</ul></section>` : "";
        }).join("");
        else full.innerHTML = `<section class="board"><h2 class="board-title">${{ low: "Cheapest first", high: "Priciest first", name: "A to Z" }[sort.value]}<small>${list.length} items</small></h2><ul class="rows">${list.map(row).join("")}</ul></section>`;
        $$("[data-flap]", full).forEach((el) => flap(el, el.dataset.flap, false));
      };
      if (drawn && doc.startViewTransition && !reduce) doc.startViewTransition(render); else render();
      flap(countOut, String(list.length).padStart(2, "0"), drawn);
      if (drawn && previewBox && list.length && !list.includes(previewBox.current)) preview(list[0].slug);
      drawn = true;
      const u = new URL(location.href); term ? u.searchParams.set("q", q.value) : u.searchParams.delete("q"); history.replaceState(null, "", u);
    }
    q.addEventListener("input", draw); sort.addEventListener("change", draw); cap.addEventListener("input", draw);
    draw();
    const first = M.items[0];
    if (previewBox) { previewBox.setItem(first); fillCard(previewCard, first, { label: "In the box" }); setTimeout(() => preview(first.slug), reduce ? 0 : 500); }
  }

  /* ---------- Order page ---------- */
  const tax = $("#tax");
  if (tax) {
    tax.value = taxRate;
    tax.addEventListener("input", () => { taxRate = clamp(parseFloat(tax.value) || 0, 0, 20); store.set("jitb-guide-tax", taxRate); renderCart(); });
    const addons = $("#addon-rows");
    if (addons) addons.innerHTML = M.items.filter((i) => i.cat === "sides" || i.cat === "desserts").sort((a, b) => a.price - b.price).slice(0, 5).map(row).join("");
  }

  /* ---------- 404 ---------- */
  const lostHost = $("#lost-box");
  if (lostHost) { const b = createBox(lostHost, { size: 170 }); b.setItem(null); setTimeout(() => b.open(), reduce ? 0 : 500); }

  renderCart();
  $$("[data-updated]").forEach((el) => (el.textContent = M.updated));
  initFlaps();
})();
