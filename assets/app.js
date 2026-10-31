(function () {
  "use strict";
  var M = window.MENU;
  var page = document.body.getAttribute("data-page") || "";
  var money = function (n) { return "$" + n.toFixed(2); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var catById = {};
  M.categories.forEach(function (c) { catById[c.id] = c; });

  // ---------- Saved order (per-browser convenience only) ----------
  var ORDER_KEY = "jitb-guide-order";
  function loadOrder() {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveOrder(o) {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(o)); } catch (e) { /* storage blocked */ }
  }
  var order = loadOrder();
  function itemByName(name) {
    for (var i = 0; i < M.items.length; i++) if (M.items[i].name === name) return M.items[i];
    return null;
  }
  function orderCount() {
    var n = 0; for (var k in order) n += order[k]; return n;
  }
  function addToOrder(name) {
    order[name] = (order[name] || 0) + 1;
    saveOrder(order); renderOrderBadge(); renderOrderPage();
    toast("Added " + name);
  }

  // ---------- Header & footer ----------
  var navLinks = [
    { href: "index.html", label: "Home", id: "home" },
    { href: "menu.html", label: "Full Menu", id: "menu" }
  ].concat(M.categories.map(function (c) { return { href: c.page, label: c.name, id: c.id }; }))
   .concat([
    { href: "deals.html", label: "Deals", id: "deals" },
    { href: "about.html", label: "About", id: "about" }
  ]);

  var header = document.getElementById("site-header");
  if (header) {
    header.innerHTML =
      '<div class="bar">' +
        '<a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">J</span>' +
          '<span>Jack Menu <em>Guide</em></span></a>' +
        '<div class="bar-actions">' +
          '<a class="order-link" href="order.html" aria-label="My order">🧾 <span id="order-count">0</span></a>' +
          '<button class="icon-btn" id="theme-btn" type="button" aria-label="Toggle dark mode">🌓</button>' +
          '<button class="icon-btn nav-toggle" id="nav-btn" type="button" aria-label="Open menu" aria-expanded="false">☰</button>' +
        '</div>' +
      '</div>' +
      '<nav class="nav" id="nav" aria-label="Main">' +
        navLinks.map(function (l) {
          return '<a href="' + l.href + '"' + (l.id === page ? ' aria-current="page"' : "") + ">" + esc(l.label) + "</a>";
        }).join("") +
      "</nav>";
    var navBtn = document.getElementById("nav-btn");
    navBtn.addEventListener("click", function () {
      var open = document.getElementById("nav").classList.toggle("open");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.getElementById("theme-btn").addEventListener("click", function () {
      var root = document.documentElement;
      var dark = root.getAttribute("data-theme") === "dark" ||
        (!root.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.setAttribute("data-theme", dark ? "light" : "dark");
      try { localStorage.setItem("jitb-guide-theme", dark ? "light" : "dark"); } catch (e) {}
    });
  }

  var footer = document.getElementById("site-footer");
  if (footer) {
    footer.innerHTML =
      '<div class="footer-grid">' +
        '<div><strong>Jack Menu Guide</strong><p>An unofficial fan-made guide to the Jack in the Box menu. ' +
        'We are not affiliated with or endorsed by Jack in the Box Inc. Prices updated ' + esc(M.updated) + '.</p></div>' +
        '<div><strong>Menu</strong>' + M.categories.map(function (c) {
          return '<a href="' + c.page + '">' + esc(c.name) + "</a>";
        }).join("") + "</div>" +
        '<div><strong>Site</strong><a href="menu.html">Full Menu</a><a href="deals.html">Deals</a>' +
        '<a href="order.html">My Order</a><a href="about.html">About &amp; FAQ</a><a href="sources.html">Price Sources</a></div>' +
      "</div>" +
      '<p class="fineprint">Prices vary by location and change often. Check the official Jack in the Box app or your local restaurant before ordering.</p>';
  }

  function renderOrderBadge() {
    var el = document.getElementById("order-count");
    if (el) el.textContent = orderCount();
  }
  renderOrderBadge();

  // ---------- Toast ----------
  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast"; toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  // ---------- Item cards ----------
  function card(item) {
    var range = (item.low != null && item.high != null && item.low !== item.high)
      ? '<span class="range">Seen ' + money(item.low) + "–" + money(item.high) + "</span>" : "";
    var tags = (item.tags || []).map(function (t) { return '<span class="tag tag-' + t.replace(/\s/g, "-") + '">' + esc(t) + "</span>"; }).join("");
    return '<article class="item">' +
      '<div class="item-top"><span class="item-icon" aria-hidden="true">' + catById[item.cat].icon + "</span>" +
        '<div class="tags">' + tags + "</div></div>" +
      "<h3>" + esc(item.name) + "</h3>" +
      "<p>" + esc(item.desc) + "</p>" +
      '<div class="item-foot"><div><span class="price">' + money(item.price) + "</span>" + range + "</div>" +
        '<button type="button" class="add" data-add="' + esc(item.name) + '" aria-label="Add ' + esc(item.name) + ' to my order">+ Add</button></div>' +
    "</article>";
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-add]");
    if (b) addToOrder(b.getAttribute("data-add"));
  });

  // ---------- Category page ----------
  var catGrid = document.getElementById("category-items");
  if (catGrid) {
    var cid = catGrid.getAttribute("data-cat");
    var items = M.items.filter(function (i) { return i.cat === cid; });
    catGrid.innerHTML = items.map(card).join("");
    var cnt = document.getElementById("category-count");
    if (cnt) {
      var prices = items.map(function (i) { return i.price; });
      cnt.textContent = items.length + " items · " + money(Math.min.apply(null, prices)) + " to " + money(Math.max.apply(null, prices));
    }
  }

  // ---------- Home: category tiles, popular picks, deals preview ----------
  var tiles = document.getElementById("category-tiles");
  if (tiles) {
    tiles.innerHTML = M.categories.map(function (c) {
      var its = M.items.filter(function (i) { return i.cat === c.id; });
      var from = Math.min.apply(null, its.map(function (i) { return i.price; }));
      return '<a class="tile" href="' + c.page + '"><span class="tile-icon" aria-hidden="true">' + c.icon + "</span>" +
        "<strong>" + esc(c.name) + "</strong><span>" + esc(c.blurb) + '</span><span class="from">From ' + money(from) + "</span></a>";
    }).join("");
  }
  var popular = document.getElementById("popular-items");
  if (popular) {
    popular.innerHTML = M.items.filter(function (i) { return (i.tags || []).indexOf("popular") > -1; }).slice(0, 6).map(card).join("");
  }
  function dealCard(d) {
    return '<article class="deal"><span class="deal-tag">' + esc(d.tag) + "</span><h3>" + esc(d.title) + "</h3>" +
      '<p class="when">' + esc(d.when) + "</p><p>" + esc(d.desc) + "</p></article>";
  }
  var dealsPreview = document.getElementById("deals-preview");
  if (dealsPreview) dealsPreview.innerHTML = M.deals.slice(0, 3).map(dealCard).join("");
  var dealsAll = document.getElementById("deals-all");
  if (dealsAll) dealsAll.innerHTML = M.deals.map(dealCard).join("");

  var stats = document.getElementById("hero-stats");
  if (stats) {
    var cheapest = M.items.reduce(function (a, b) { return a.price <= b.price ? a : b; });
    stats.innerHTML =
      "<div><strong>" + M.items.length + "</strong><span>items listed</span></div>" +
      "<div><strong>" + M.categories.length + "</strong><span>menu sections</span></div>" +
      "<div><strong>" + money(cheapest.price) + "</strong><span>" + esc(cheapest.name) + "</span></div>";
  }
  document.querySelectorAll("[data-updated]").forEach(function (el) { el.textContent = M.updated; });

  // ---------- Full menu: search, filter, sort ----------
  var full = document.getElementById("full-menu");
  if (full) {
    var q = document.getElementById("search");
    var sort = document.getElementById("sort");
    var chips = document.getElementById("chips");
    var active = "all";
    chips.innerHTML = ['<button type="button" class="chip" data-cat="all" aria-pressed="true">All</button>']
      .concat(M.categories.map(function (c) {
        return '<button type="button" class="chip" data-cat="' + c.id + '" aria-pressed="false">' + c.icon + " " + esc(c.name) + "</button>";
      })).join("");
    chips.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      active = b.getAttribute("data-cat");
      chips.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); });
      draw();
    });
    var params = new URLSearchParams(location.search);
    if (params.get("q")) q.value = params.get("q");
    function draw() {
      var term = q.value.trim().toLowerCase();
      var list = M.items.filter(function (i) {
        return (active === "all" || i.cat === active) &&
          (!term || (i.name + " " + i.desc + " " + (i.tags || []).join(" ")).toLowerCase().indexOf(term) > -1);
      });
      if (sort.value === "low") list.sort(function (a, b) { return a.price - b.price; });
      else if (sort.value === "high") list.sort(function (a, b) { return b.price - a.price; });
      else if (sort.value === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (sort.value === "section") {
        full.innerHTML = M.categories.map(function (c) {
          var its = list.filter(function (i) { return i.cat === c.id; });
          if (!its.length) return "";
          return '<section class="menu-section"><h2><a href="' + c.page + '">' + c.icon + " " + esc(c.name) + '</a></h2><div class="grid">' + its.map(card).join("") + "</div></section>";
        }).join("");
      } else {
        full.innerHTML = '<div class="grid">' + list.map(card).join("") + "</div>";
      }
      if (!list.length) full.innerHTML = '<p class="empty">No items match “' + esc(q.value) + '”. Try another word.</p>';
      document.getElementById("result-count").textContent = list.length + " of " + M.items.length + " items";
    }
    q.addEventListener("input", draw);
    sort.addEventListener("change", draw);
    draw();
  }

  // ---------- Order estimator ----------
  function renderOrderPage() {
    var box = document.getElementById("order-list");
    if (!box) return;
    var taxInput = document.getElementById("tax");
    var tax = parseFloat(taxInput.value) || 0;
    var names = Object.keys(order).filter(function (n) { return order[n] > 0 && itemByName(n); });
    if (!names.length) {
      box.innerHTML = '<p class="empty">Your order is empty. Browse the <a href="menu.html">full menu</a> and tap “+ Add”.</p>';
    } else {
      box.innerHTML = '<ul class="order-rows">' + names.map(function (n) {
        var it = itemByName(n);
        return '<li><span class="o-name">' + esc(n) + "</span>" +
          '<span class="qty"><button type="button" data-dec="' + esc(n) + '" aria-label="Remove one">−</button>' +
          "<b>" + order[n] + '</b><button type="button" data-inc="' + esc(n) + '" aria-label="Add one">+</button></span>' +
          '<span class="o-price">' + money(it.price * order[n]) + "</span></li>";
      }).join("") + "</ul>";
    }
    var sub = names.reduce(function (s, n) { return s + itemByName(n).price * order[n]; }, 0);
    document.getElementById("o-sub").textContent = money(sub);
    document.getElementById("o-tax").textContent = money(sub * tax / 100);
    document.getElementById("o-total").textContent = money(sub * (1 + tax / 100));
  }
  var orderList = document.getElementById("order-list");
  if (orderList) {
    document.getElementById("tax").addEventListener("input", renderOrderPage);
    orderList.addEventListener("click", function (e) {
      var inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]");
      if (inc) order[inc.getAttribute("data-inc")]++;
      if (dec) { var n = dec.getAttribute("data-dec"); order[n]--; if (order[n] <= 0) delete order[n]; }
      if (inc || dec) { saveOrder(order); renderOrderBadge(); renderOrderPage(); }
    });
    document.getElementById("clear-order").addEventListener("click", function () {
      order = {}; saveOrder(order); renderOrderBadge(); renderOrderPage();
    });
    renderOrderPage();
  }

  // ---------- Home search box ----------
  var homeSearch = document.getElementById("home-search");
  if (homeSearch) {
    homeSearch.addEventListener("submit", function (e) {
      e.preventDefault();
      location.href = "menu.html?q=" + encodeURIComponent(homeSearch.querySelector("input").value);
    });
  }
})();
