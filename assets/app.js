/* Jack Menu Guide — interactions */
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

  /* ---------- Image slot ----------
     Looks for assets/img/<path>.webp, then .png. If neither exists, the
     placeholder (emoji + the file name it expects) stays visible. */
  function slot(path, emoji, cls = "", alt = "") {
    return `<div class="slot ${cls}">` +
      `<img src="assets/img/${path}.webp" data-alt="assets/img/${path}.png" alt="${esc(alt)}" loading="lazy" decoding="async">` +
      `<div class="slot-ph" aria-hidden="true"><span class="slot-emoji">${emoji}</span>${M.showImageSlots ? `<code>img/${path}</code>` : ""}</div></div>`;
  }

  /* ---------- State: cart, favorites ---------- */
  let cart = store.get("jitb-guide-cart", {});
  for (const k in cart) if (!bySlug[k]) delete cart[k];
  const favs = new Set(store.get("jitb-guide-favs", []));
  let taxRate = store.get("jitb-guide-tax", 8.25);
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartSubtotal = () => Object.entries(cart).reduce((s, [k, q]) => s + bySlug[k].price * q, 0);

  /* ---------- Header ---------- */
  const navLinks = [{ href: "index.html", label: "Home", id: "home" }, { href: "menu.html", label: "Full Menu", id: "menu" }]
    .concat(M.categories.map((c) => ({ href: c.page, label: c.name, id: c.id })))
    .concat([{ href: "deals.html", label: "Deals", id: "deals" }, { href: "about.html", label: "About", id: "about" }]);

  const header = $("#site-header");
  if (header) {
    header.innerHTML = `
      <div class="bar">
        <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">J</span><span>Jack Menu <em>Guide</em></span></a>
        <div class="bar-actions">
          <button class="icon-btn search-btn" type="button" data-palette aria-label="Search the menu">⌕ <span class="label">Search</span> <kbd>⌘K</kbd></button>
          <button class="icon-btn" id="theme-btn" type="button" aria-label="Switch light or dark mode">🌓</button>
          <button class="icon-btn cart-btn" id="cart-btn" type="button" aria-label="Open my order">🛍 <span class="cart-num" id="cart-count">0</span></button>
          <button class="icon-btn nav-toggle" id="nav-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav">☰</button>
        </div>
      </div>
      <nav class="nav" id="nav" aria-label="Main"><div>${navLinks.map((l) =>
        `<a href="${l.href}"${l.id === page ? ' aria-current="page"' : ""}>${esc(l.label)}</a>`).join("")}</div></nav>`;
    const navBtn = $("#nav-btn");
    navBtn.addEventListener("click", () => {
      const open = $("#nav").classList.toggle("open");
      navBtn.setAttribute("aria-expanded", String(open));
      navBtn.textContent = open ? "✕" : "☰";
    });
    $("#theme-btn").addEventListener("click", toggleTheme);
    $("#cart-btn").addEventListener("click", () => openDrawer(true));
  }

  /* ---------- Footer ---------- */
  const footer = $("#site-footer");
  if (footer) {
    footer.innerHTML = `
      <div class="footer-big">Hungry?<br><span>Jack's got you.</span></div>
      <div class="footer-grid">
        <div><strong>Jack Menu Guide</strong><p>An unofficial, fan-made guide to the Jack in the Box menu. Not affiliated with or endorsed by Jack in the Box Inc. Prices updated ${esc(M.updated)}.</p></div>
        <div><strong>Menu</strong>${M.categories.map((c) => `<a href="${c.page}">${esc(c.name)}</a>`).join("")}</div>
        <div><strong>Site</strong><a href="menu.html">Full Menu</a><a href="deals.html">Deals</a><a href="order.html">My Order</a><a href="about.html">About &amp; FAQ</a><a href="sources.html">Price Sources</a></div>
      </div>
      <p class="fineprint">Prices vary by location and change often. Check the official Jack in the Box app or your local restaurant before ordering.</p>`;
  }

  /* ---------- Global overlays: progress, drawer, dialogs, toast ---------- */
  doc.body.insertAdjacentHTML("beforeend", `
    <div class="progress" id="progress" aria-hidden="true"></div>
    <div class="scrim" id="scrim"></div>
    <aside class="drawer" id="drawer" aria-label="My order" aria-hidden="true">
      <div class="drawer-head"><h2>Your order</h2><button class="icon-btn" type="button" data-close-drawer aria-label="Close">✕</button></div>
      <div class="drawer-body" data-cart-list></div>
      <div class="drawer-foot">
        <div class="totals"><div><span>Subtotal</span><span data-cart-sub>$0.00</span></div><div class="small"><span>Est. tax (<span data-tax-rate></span>%)</span><span data-cart-tax>$0.00</span></div>
        <div class="grand"><span>Total</span><span data-cart-total>$0.00</span></div></div>
        <a class="btn" href="order.html">Review order →</a>
      </div>
    </aside>
    <dialog id="quick" aria-label="Item details"></dialog>
    <dialog id="palette" aria-label="Search">
      <div class="palette">
        <div class="palette-input"><span aria-hidden="true">⌕</span><input id="palette-q" type="search" placeholder="Search items, sections and pages…" autocomplete="off" aria-label="Search"><kbd>esc</kbd></div>
        <ul id="palette-list" role="listbox"></ul>
        <div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
      </div>
    </dialog>
    <div class="toast" id="toast" role="status"></div>`);

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------- Theme switch with circular reveal ---------- */
  function toggleTheme(e) {
    const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    const apply = () => { root.dataset.theme = dark ? "light" : "dark"; store.set("jitb-guide-theme", root.dataset.theme); };
    if (!doc.startViewTransition || reduce) return apply();
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("theme-switching");
    const vt = doc.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" });
    });
    vt.finished.finally(() => root.classList.remove("theme-switching"));
  }

  /* ---------- Cards ---------- */
  function card(it) {
    const c = cats[it.cat];
    const range = it.low != null && it.high != null && it.low !== it.high ? `<span class="range">Seen ${money(it.low)}–${money(it.high)}</span>` : `<span class="range">Typical price</span>`;
    const tags = (it.tags || []).map((t) => `<span class="tag tag-${t.replace(/\s/g, "-")}">${esc(t)}</span>`).join("");
    return `<article class="item tilt reveal" data-slug="${it.slug}">
      <button type="button" class="fav" data-fav="${it.slug}" aria-pressed="${favs.has(it.slug)}" aria-label="Save ${esc(it.name)} to favorites">♥</button>
      <button type="button" class="item-media" data-quick="${it.slug}" aria-label="View ${esc(it.name)}">${slot("items/" + it.slug, c.icon, "float", it.name)}</button>
      <div class="item-body">
        <div class="tags">${tags}</div>
        <h3>${esc(it.name)}</h3>
        <p>${esc(it.desc)}</p>
        <div class="item-foot"><div><span class="price">${money(it.price)}</span>${range}</div>
          <button type="button" class="add" data-add="${it.slug}" aria-label="Add ${esc(it.name)} to my order">+ Add</button></div>
      </div>
      <span class="glare" aria-hidden="true"></span>
    </article>`;
  }

  function dealCard(d) {
    const icon = { "Coming soon": "📦", "Limited time": "🎃", Value: "🌯", App: "📱", "Late night": "🌙" }[d.tag] || "🏷️";
    return `<article class="deal tilt reveal">
      <span class="deal-tag">${esc(d.tag)}</span>
      <div class="media">${slot("deals/" + d.slug, icon, "float", d.title)}</div>
      <div class="deal-body"><h3>${esc(d.title)}</h3><p class="when">${esc(d.when)}</p><p>${esc(d.desc)}</p>
      ${d.starts ? `<div class="countdown" data-countdown="${d.starts}" aria-label="Time until launch"></div>` : ""}</div>
      <span class="glare" aria-hidden="true"></span>
    </article>`;
  }

  /* Stagger children of a freshly rendered grid, then watch them */
  function stagger(container) {
    $$(".reveal", container).forEach((el, i) => el.style.setProperty("--d", (i % 8) * 0.06 + "s"));
    observe(container);
  }

  /* ---------- Reveal on scroll ---------- */
  const io = "IntersectionObserver" in window && !reduce
    ? new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
    : null;
  function observe(scope = doc) {
    $$(".reveal:not(.in), .split:not(.in)", scope).forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
    $$(".split", scope).forEach((el) => el.addEventListener("transitionend", () => {
      if (el.classList.contains("in")) clearTimeout(el._t), (el._t = setTimeout(() => el.classList.add("done"), 200));
    }));
  }
  // Split headings into words for the staggered entrance.
  $$(".split").forEach((h) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = doc.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) frag.append(w);
            else { const s = doc.createElement("span"); s.className = "w"; s.style.setProperty("--i", i++); s.textContent = w; frag.append(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(h);
  });

  /* ---------- 3D tilt (mouse only) ---------- */
  if (finePointer && !reduce) {
    let cur = null;
    const reset = (el) => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); el.classList.remove("tilting"); };
    doc.addEventListener("pointermove", (e) => {
      const t = e.target.closest ? e.target.closest(".tilt") : null;
      if (cur && cur !== t) reset(cur);
      cur = t;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      const max = t.classList.contains("item") ? 10 : 8;
      t.style.setProperty("--ry", (x * max * 2).toFixed(2) + "deg");
      t.style.setProperty("--rx", (-y * max * 2).toFixed(2) + "deg");
      t.style.setProperty("--gx", ((x + 0.5) * 100).toFixed(1) + "%");
      t.style.setProperty("--gy", ((y + 0.5) * 100).toFixed(1) + "%");
      t.classList.add("tilting");
    }, { passive: true });
    doc.addEventListener("pointerleave", () => cur && reset(cur));
  }

  /* ---------- Cart ---------- */
  function saveCart() { store.set("jitb-guide-cart", cart); renderCart(); }
  function addToCart(slug, qty = 1, sourceEl) {
    cart[slug] = (cart[slug] || 0) + qty;
    saveCart();
    flyToCart(sourceEl, bySlug[slug]);
    toast(`Added ${qty > 1 ? qty + " × " : ""}${bySlug[slug].name}`);
  }
  function flyToCart(sourceEl, item) {
    const btn = $("#cart-btn");
    const bump = () => { btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump"); };
    if (!sourceEl || reduce || !btn.animate) return bump();
    const s = sourceEl.getBoundingClientRect(), t = btn.getBoundingClientRect();
    const fly = doc.createElement("div");
    fly.className = "flyer";
    const img = sourceEl.querySelector(".slot.loaded img");
    fly.innerHTML = img ? `<img src="${img.currentSrc || img.src}" alt="">` : cats[item.cat].icon;
    const sx = s.left + s.width / 2 - 32, sy = s.top + s.height / 2 - 32;
    const tx = t.left + t.width / 2 - 32, ty = t.top + t.height / 2 - 32;
    fly.style.left = sx + "px"; fly.style.top = sy + "px";
    doc.body.appendChild(fly);
    const dx = tx - sx, dy = ty - sy;
    fly.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 120}px) scale(1.15) rotate(-20deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(.25) rotate(20deg)`, opacity: 0.6 }
    ], { duration: 750, easing: "cubic-bezier(.5,0,.4,1)" }).finished.then(() => { fly.remove(); bump(); });
  }
  function cartRows() {
    const keys = Object.keys(cart).filter((k) => cart[k] > 0);
    if (!keys.length) return `<div class="empty-state"><span class="big">🛍</span>Your order is empty.<br><a href="menu.html">Browse the menu</a> and tap “+ Add”.</div>`;
    return `<ul class="cart-rows">${keys.map((k) => {
      const it = bySlug[k];
      return `<li>${slot("items/" + k, cats[it.cat].icon, "", "")}
        <div><div class="name">${esc(it.name)}</div><div class="unit">${money(it.price)} each</div></div>
        <div class="right"><span class="line-price">${money(it.price * cart[k])}</span>
          <span class="qty"><button type="button" data-dec="${k}" aria-label="Remove one ${esc(it.name)}">−</button><b>${cart[k]}</b><button type="button" data-inc="${k}" aria-label="Add one ${esc(it.name)}">+</button></span></div></li>`;
    }).join("")}</ul>`;
  }
  function renderCart() {
    const sub = cartSubtotal();
    $$("[data-cart-list]").forEach((el) => (el.innerHTML = cartRows()));
    $$("[data-cart-sub]").forEach((el) => (el.textContent = money(sub)));
    $$("[data-cart-tax]").forEach((el) => (el.textContent = money(sub * taxRate / 100)));
    $$("[data-cart-total]").forEach((el) => (el.textContent = money(sub * (1 + taxRate / 100))));
    $$("[data-tax-rate]").forEach((el) => (el.textContent = taxRate));
    const c = $("#cart-count");
    if (c) c.textContent = cartCount();
  }
  function openDrawer(open) {
    $("#drawer").classList.toggle("open", open);
    $("#drawer").setAttribute("aria-hidden", String(!open));
    $("#scrim").classList.toggle("open", open);
    if (open) $("#drawer [data-close-drawer]").focus();
  }
  $("#scrim").addEventListener("click", () => openDrawer(false));

  /* ---------- Quick view ---------- */
  function openQuick(slug) {
    const it = bySlug[slug], c = cats[it.cat], dlg = $("#quick");
    let qty = 1;
    const range = it.low != null && it.high != null && it.low !== it.high
      ? `Prices seen from ${money(it.low)} to ${money(it.high)} depending on location.` : "Typical price across sources.";
    dlg.innerHTML = `<div class="quick-card">
      <button class="x" type="button" data-close-quick aria-label="Close">✕</button>
      <div class="quick-art"><div class="tilt" style="width:100%;display:grid;place-items:center">${slot("items/" + slug, c.icon, "float", it.name)}<span class="glare"></span></div></div>
      <div class="quick-info">
        <a class="eyebrow-label" href="${c.page}" style="text-decoration:none">${c.icon} ${esc(c.name)}</a>
        <h2>${esc(it.name)}</h2>
        <p class="desc">${esc(it.desc)}</p>
        <div class="tags">${(it.tags || []).map((t) => `<span class="tag tag-${t.replace(/\s/g, "-")}">${esc(t)}</span>`).join("")}</div>
        <span class="price">${money(it.price)}</span>
        <p class="small" style="margin:0">${range}</p>
        <div class="actions">
          <span class="qty"><button type="button" data-q="-1" aria-label="Less">−</button><b id="q-n">1</b><button type="button" data-q="1" aria-label="More">+</button></span>
          <button class="fav" style="position:static;transform:none" type="button" data-fav="${slug}" aria-pressed="${favs.has(slug)}" aria-label="Save to favorites">♥</button>
          <button class="btn" type="button" id="q-add">Add to order · <span id="q-total">${money(it.price)}</span></button>
        </div>
      </div></div>`;
    dlg.onclick = (e) => {
      if (e.target === dlg || e.target.closest("[data-close-quick]")) return dlg.close();
      const q = e.target.closest("[data-q]");
      if (q) { qty = clamp(qty + +q.dataset.q, 1, 20); $("#q-n").textContent = qty; $("#q-total").textContent = money(it.price * qty); }
      if (e.target.closest("#q-add")) { const art = $(".quick-art", dlg); dlg.close(); addToCart(slug, qty, art); }
    };
    dlg.showModal();
  }

  /* ---------- Favorites ---------- */
  function toggleFav(slug) {
    favs.has(slug) ? favs.delete(slug) : favs.add(slug);
    store.set("jitb-guide-favs", [...favs]);
    $$(`[data-fav="${slug}"]`).forEach((b) => b.setAttribute("aria-pressed", String(favs.has(slug))));
    toast(favs.has(slug) ? `Saved ${bySlug[slug].name} to favorites` : `Removed from favorites`);
    if (page === "menu") drawMenu && drawMenu();
  }

  /* ---------- One click handler for everything ---------- */
  doc.addEventListener("click", (e) => {
    const t = e.target;
    const add = t.closest("[data-add]");
    if (add) {
      const cardEl = add.closest(".item");
      addToCart(add.dataset.add, 1, cardEl ? $(".item-media", cardEl) : add);
      add.classList.add("done"); add.textContent = "✓ Added";
      setTimeout(() => { add.classList.remove("done"); add.textContent = "+ Add"; }, 1200);
      return;
    }
    const fav = t.closest("[data-fav]");
    if (fav) return toggleFav(fav.dataset.fav);
    const quick = t.closest("[data-quick]");
    if (quick) return openQuick(quick.dataset.quick);
    const inc = t.closest("[data-inc]"), dec = t.closest("[data-dec]");
    if (inc) { cart[inc.dataset.inc]++; return saveCart(); }
    if (dec) { const k = dec.dataset.dec; if (--cart[k] <= 0) delete cart[k]; return saveCart(); }
    if (t.closest("[data-close-drawer]")) return openDrawer(false);
    if (t.closest("[data-palette]")) return openPalette();
    if (t.closest("[data-clear-cart]")) { cart = {}; saveCart(); toast("Order cleared"); }
  });

  /* ---------- Command palette ---------- */
  const palette = $("#palette"), pq = $("#palette-q"), plist = $("#palette-list");
  let pIndex = 0, pResults = [];
  const pages = [
    { label: "Home", href: "index.html", icon: "🏠" }, { label: "Full Menu", href: "menu.html", icon: "📋" },
    { label: "Deals & specials", href: "deals.html", icon: "🏷️" }, { label: "My order", href: "order.html", icon: "🛍" },
    { label: "About & FAQ", href: "about.html", icon: "❓" }, { label: "Price sources", href: "sources.html", icon: "🔗" }
  ].concat(M.categories.map((c) => ({ label: c.name, href: c.page, icon: c.icon })));
  function drawPalette() {
    const q = pq.value.trim().toLowerCase();
    const items = M.items.filter((i) => !q || (i.name + " " + i.desc + " " + (i.tags || []).join(" ")).toLowerCase().includes(q)).slice(0, q ? 12 : 6);
    const pg = pages.filter((p) => !q || p.label.toLowerCase().includes(q)).slice(0, q ? 6 : 4);
    pResults = items.map((i) => ({ type: "item", slug: i.slug })).concat(pg.map((p) => ({ type: "page", href: p.href })));
    pIndex = clamp(pIndex, 0, Math.max(0, pResults.length - 1));
    let n = 0;
    const row = (inner, href, i) => `<li role="option"><a href="${href}" data-pi="${i}" class="${i === pIndex ? "active" : ""}">${inner}</a></li>`;
    plist.innerHTML =
      (items.length ? `<li class="group">Menu items</li>` + items.map((i) => row(`<span class="ic">${cats[i.cat].icon}</span>${esc(i.name)}<span class="meta">${money(i.price)}</span>`, "#", n++)).join("") : "") +
      (pg.length ? `<li class="group">Pages</li>` + pg.map((p) => row(`<span class="ic">${p.icon}</span>${esc(p.label)}`, p.href, n++)).join("") : "") +
      (!pResults.length ? `<li class="group">No results for “${esc(pq.value)}”</li>` : "");
  }
  function choose(i) {
    const r = pResults[i];
    if (!r) return;
    palette.close();
    if (r.type === "item") openQuick(r.slug); else location.href = r.href;
  }
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
    else if (e.key === "Escape") openDrawer(false);
  });

  /* ---------- Scroll effects: progress bar, header shadow, hero ---------- */
  const progress = $("#progress");
  const stage = $("#stage");
  const burger = $("#burger3d");
  let ticking = false;
  function onScroll() {
    const max = root.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    header && header.classList.toggle("scrolled", scrollY > 8);
    if (stage && !reduce) {
      const total = stage.offsetHeight - innerHeight;
      const p = total > 0 ? clamp(-stage.getBoundingClientRect().top / total, 0, 1) : 0;
      stage.style.setProperty("--p", p.toFixed(3));
    }
    ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  if (burger && finePointer && !reduce) {
    stage.addEventListener("pointermove", (e) => {
      burger.style.setProperty("--px", ((e.clientX / innerWidth - 0.5) * 2).toFixed(3));
      burger.style.setProperty("--py", ((e.clientY / innerHeight - 0.5) * -2).toFixed(3));
    }, { passive: true });
  }
  // Falling sesame seeds
  const seeds = $(".seeds");
  if (seeds && !reduce) {
    seeds.innerHTML = Array.from({ length: 18 }, () =>
      `<i style="left:${Math.random() * 100}%;animation-duration:${8 + Math.random() * 10}s;animation-delay:${-Math.random() * 18}s;transform:scale(${0.5 + Math.random()})"></i>`).join("");
  }

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count), isMoney = el.dataset.money != null;
    const fmt = (v) => (isMoney ? money(v) : Math.round(v).toString());
    if (reduce) return (el.textContent = fmt(target));
    const t0 = performance.now(), dur = 1400;
    const step = (now) => { const k = clamp((now - t0) / dur, 0, 1); el.textContent = fmt(target * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- Countdown timers ---------- */
  function tickCountdowns() {
    $$("[data-countdown]").forEach((el) => {
      let s = Math.max(0, Math.floor((new Date(el.dataset.countdown) - Date.now()) / 1000));
      if (s === 0) { el.innerHTML = `<div><b>Out now</b><span>available</span></div>`; return; }
      const d = Math.floor(s / 86400); s %= 86400;
      const h = Math.floor(s / 3600); s %= 3600;
      const m = Math.floor(s / 60); s %= 60;
      const pad = (n) => String(n).padStart(2, "0");
      el.innerHTML = [[d, "days"], [pad(h), "hrs"], [pad(m), "min"], [pad(s), "sec"]].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("");
    });
  }

  /* ---------- Page: Home ---------- */
  const tiles = $("#category-tiles");
  if (tiles) {
    tiles.innerHTML = M.categories.map((c) => {
      const from = Math.min(...M.items.filter((i) => i.cat === c.id).map((i) => i.price));
      return `<a class="tile tilt reveal" href="${c.page}"><div class="tile-text"><strong>${esc(c.name)}</strong><span>${esc(c.blurb)}</span><span class="from">From ${money(from)} →</span></div>
        ${slot("categories/" + c.id, c.icon, "float", "")}<span class="glare" aria-hidden="true"></span></a>`;
    }).join("");
    stagger(tiles);
  }
  const popular = $("#popular-items");
  if (popular) { popular.innerHTML = M.items.filter((i) => (i.tags || []).includes("popular")).slice(0, 8).map(card).join(""); stagger(popular); }
  const dealsPreview = $("#deals-preview");
  if (dealsPreview) { dealsPreview.innerHTML = M.deals.slice(0, 3).map(dealCard).join(""); stagger(dealsPreview); }
  const dealsAll = $("#deals-all");
  if (dealsAll) { dealsAll.innerHTML = M.deals.map(dealCard).join(""); stagger(dealsAll); }
  if ($("[data-countdown]")) { tickCountdowns(); setInterval(tickCountdowns, 1000); }

  const stats = $("#hero-stats");
  if (stats) {
    const cheapest = M.items.reduce((a, b) => (a.price <= b.price ? a : b));
    stats.innerHTML = `<div><strong data-count="${M.items.length}">0</strong><span>menu items</span></div>
      <div><strong data-count="${M.categories.length}">0</strong><span>sections</span></div>
      <div><strong data-count="${cheapest.price}" data-money>$0.00</strong><span>${esc(cheapest.name)}</span></div>`;
    $$("[data-count]", stats).forEach((el) => setTimeout(() => countUp(el), 400));
  }
  const marquee = $("#marquee");
  if (marquee) {
    const row = M.items.filter((i, n) => n % 2 === 0).map((i) => `<span>${cats[i.cat].icon} ${esc(i.name)} <b>${money(i.price)}</b></span>`).join("");
    marquee.innerHTML = row + row;
  }
  const clock = $("#munchie-clock");
  if (clock) {
    const draw = () => {
      const { start, end } = M.munchieHours, now = new Date(), h = now.getHours() + now.getMinutes() / 60;
      const open = h >= start || h < end;
      if (open) { clock.innerHTML = `🌙 Munchie hours are <b>on now</b>`; return; }
      const mins = Math.round((start - h) * 60);
      clock.innerHTML = `⏰ Munchie hours start in <b>${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m</b>`;
    };
    draw(); setInterval(draw, 30000);
  }
  const homeSearch = $("#home-search");
  if (homeSearch) homeSearch.addEventListener("submit", (e) => { e.preventDefault(); location.href = "menu.html?q=" + encodeURIComponent($("input", homeSearch).value); });

  /* ---------- Page: Category ---------- */
  const catGrid = $("#category-items");
  if (catGrid) {
    const cid = catGrid.dataset.cat;
    const items = M.items.filter((i) => i.cat === cid);
    catGrid.innerHTML = items.map(card).join("");
    stagger(catGrid);
    const prices = items.map((i) => i.price);
    const cnt = $("#category-count");
    if (cnt) cnt.textContent = `${items.length} items · ${money(Math.min(...prices))} to ${money(Math.max(...prices))}`;
    const art = $("#category-art");
    if (art) art.innerHTML = `<div class="tilt" style="border-radius:50%">${slot("categories/" + cid, cats[cid].icon, "float", cats[cid].name)}<span class="glare"></span></div>`;
    const others = $("#other-sections");
    if (others) others.innerHTML = M.categories.filter((c) => c.id !== cid).map((c) => `<a class="chip" style="display:inline-flex;align-items:center;text-decoration:none" href="${c.page}">${c.icon} ${esc(c.name)}</a>`).join("");
  }

  /* ---------- Page: Full menu ---------- */
  let drawMenu = null;
  const full = $("#full-menu");
  if (full) {
    const q = $("#search"), sort = $("#sort"), chips = $("#chips"), maxP = $("#max-price"), maxOut = $("#max-out");
    const params = new URLSearchParams(location.search);
    let active = params.get("cat") && cats[params.get("cat")] ? params.get("cat") : "all";
    const hi = Math.ceil(Math.max(...M.items.map((i) => i.price)));
    maxP.max = hi; maxP.value = hi;
    q.value = params.get("q") || "";
    chips.innerHTML = [["all", "All"], ["favs", "♥ Favorites"]].concat(M.categories.map((c) => [c.id, `${c.icon} ${esc(c.name)}`]))
      .map(([id, label]) => `<button type="button" class="chip" data-cat="${id}" aria-pressed="${id === active}">${label}</button>`).join("");
    chips.addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      active = b.dataset.cat;
      $$(".chip", chips).forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
      draw();
    });
    function draw() {
      const term = q.value.trim().toLowerCase(), cap = +maxP.value;
      maxOut.textContent = money(cap);
      let list = M.items.filter((i) =>
        (active === "all" || (active === "favs" ? favs.has(i.slug) : i.cat === active)) && i.price <= cap &&
        (!term || (i.name + " " + i.desc + " " + (i.tags || []).join(" ")).toLowerCase().includes(term)));
      if (sort.value === "low") list.sort((a, b) => a.price - b.price);
      else if (sort.value === "high") list.sort((a, b) => b.price - a.price);
      else if (sort.value === "name") list.sort((a, b) => a.name.localeCompare(b.name));
      const render = () => {
        if (!list.length) {
          full.innerHTML = `<div class="empty-state"><span class="big">${active === "favs" ? "♥" : "🔍"}</span>${active === "favs" && !favs.size ? "No favorites yet. Tap the ♥ on any item to save it here." : `No items match. Try another word or raise the price limit.`}</div>`;
        } else if (sort.value === "section") {
          full.innerHTML = M.categories.map((c) => {
            const its = list.filter((i) => i.cat === c.id);
            return its.length ? `<section class="menu-section"><h2><a href="${c.page}">${c.icon} ${esc(c.name)}</a></h2><div class="grid">${its.map(card).join("")}</div></section>` : "";
          }).join("");
        } else full.innerHTML = `<div class="grid">${list.map(card).join("")}</div>`;
        $$(".reveal", full).forEach((el) => el.classList.add("in"));
      };
      if (doc.startViewTransition && !reduce && drawn) doc.startViewTransition(render); else render();
      drawn = true;
      $("#result-count").textContent = `${list.length} of ${M.items.length} items`;
      const u = new URL(location.href);
      term ? u.searchParams.set("q", q.value) : u.searchParams.delete("q");
      history.replaceState(null, "", u);
    }
    let drawn = false;
    drawMenu = draw;
    q.addEventListener("input", draw);
    sort.addEventListener("change", draw);
    maxP.addEventListener("input", draw);
    draw();
  }

  /* ---------- Page: Order ---------- */
  const tax = $("#tax");
  if (tax) {
    tax.value = taxRate;
    tax.addEventListener("input", () => { taxRate = clamp(parseFloat(tax.value) || 0, 0, 20); store.set("jitb-guide-tax", taxRate); renderCart(); });
    const addons = $("#addons");
    if (addons) {
      addons.innerHTML = M.items.filter((i) => i.cat === "sides" || i.cat === "desserts").sort((a, b) => a.price - b.price).slice(0, 4).map(card).join("");
      stagger(addons);
    }
  }

  renderCart();
  $$("[data-updated]").forEach((el) => (el.textContent = M.updated));
  observe();
})();
