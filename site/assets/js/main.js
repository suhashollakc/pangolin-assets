/* =============================================================================
   Sādhana — main.js
   Navigation, scroll reveal, and rendering of content from content.js
   ============================================================================= */
(function () {
  "use strict";
  var C = window.SADHANA_CONTENT || {};

  /* ------------------------------------------------------------ helpers */
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function fmtDate(iso) {
    try {
      return new Date(iso + "T00:00:00").toLocaleDateString("en-US",
        { month: "long", day: "numeric", year: "numeric" });
    } catch (e) { return iso; }
  }

  /* very small inline markdown: **bold**, *italic* */
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }
  /* paragraphs + > blockquote */
  function richText(body) {
    return body.split(/\n{2,}/).map(function (block) {
      block = block.trim();
      if (!block) return "";
      if (block[0] === ">") return "<blockquote>" + inline(block.replace(/^>\s?/, "")) + "</blockquote>";
      return "<p>" + inline(block).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  /* ------------------------------------------------------------ scenes (CSS/SVG art) */
  var RIDGES = {
    mountain: '<svg class="ridge" viewBox="0 0 400 130" preserveAspectRatio="none">' +
      '<path d="M0,130 L0,78 L70,30 L130,82 L190,18 L270,90 L330,52 L400,96 L400,130Z" fill="rgba(86,108,121,.55)"/>' +
      '<path d="M0,130 L0,98 L90,60 L170,104 L250,66 L340,108 L400,84 L400,130Z" fill="rgba(60,82,96,.7)"/></svg>',
    field: '<svg class="ridge" viewBox="0 0 400 120" preserveAspectRatio="none">' +
      '<path d="M0,120 L0,80 Q200,40 400,82 L400,120Z" fill="rgba(120,150,96,.6)"/>' +
      '<path d="M0,120 L0,98 Q200,70 400,100 L400,120Z" fill="rgba(96,128,76,.75)"/></svg>',
  };

  function lotus() {
    return '<svg viewBox="0 0 120 120" style="position:absolute;left:50%;top:52%;width:54%;transform:translate(-50%,-50%)" fill="none" stroke="rgba(84,112,90,.85)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M60 96 C60 70 60 44 60 30 C70 48 76 70 70 92"/>' +
      '<path d="M60 96 C70 74 86 60 100 56 C96 78 82 92 70 94"/>' +
      '<path d="M60 96 C50 74 34 60 20 56 C24 78 38 92 50 94"/>' +
      '<path d="M60 96 C60 44 60 44 60 30 C50 48 44 70 50 92"/>' +
      '<path d="M30 96 H90"/></svg>';
  }

  function scene(key) {
    var inner = "";
    if (key === "sunrise") inner = '<span class="sun"></span>' + RIDGES.mountain;
    else if (key === "moon") inner = '<span class="sun"></span>' + RIDGES.mountain;
    else if (key === "mountain") inner = RIDGES.mountain;
    else if (key === "field") inner = RIDGES.field;
    else if (key === "lotus") inner = lotus();
    else if (key === "stone") inner = lotus();
    var cls = ["sunrise", "moon", "mountain", "field", "lotus", "stone"].indexOf(key) >= 0 ? key : "lotus";
    return '<div class="scene scene--' + cls + '">' + inner + '</div>';
  }
  // expose for inline use on pages
  window.sadhanaScene = scene;

  /* ------------------------------------------------------------ navigation */
  function initNav() {
    var nav = $(".nav");
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $(".nav__toggle"), links = $(".nav__links");
    if (toggle && links) {
      toggle.addEventListener("click", function () { links.classList.toggle("is-open"); });
      $all("a", links).forEach(function (a) {
        a.addEventListener("click", function () { links.classList.remove("is-open"); });
      });
    }
    // active link
    var here = location.pathname.split("/").pop() || "index.html";
    $all(".nav__links a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === here || (here === "" && href === "index.html")) a.classList.add("is-active");
    });
  }

  /* ------------------------------------------------------------ scroll reveal */
  function initReveal() {
    var items = $all("[data-reveal]");
    if (!("IntersectionObserver" in window) || !items.length) {
      items.forEach(function (i) { i.classList.add("is-in"); }); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (i) { io.observe(i); });
  }

  /* ------------------------------------------------------------ render: blog cards */
  function blogCard(p, i) {
    return el(
      '<a class="card" data-reveal data-delay="' + (i % 3) + '" href="post.html?slug=' + encodeURIComponent(p.slug) + '">' +
        '<div class="card__art">' + scene(p.cover) + '</div>' +
        '<div class="card__body">' +
          '<div class="card__meta"><span class="chip">' + esc(p.category) + '</span>' +
            '<span>' + fmtDate(p.date) + '</span><span>·</span><span>' + p.readingTime + ' min read</span></div>' +
          '<h3 class="card__title">' + esc(p.title) + '</h3>' +
          '<p class="card__excerpt">' + esc(p.excerpt) + '</p>' +
          '<span class="link-arrow">Read <span>→</span></span>' +
        '</div>' +
      '</a>'
    );
  }

  function videoCard(v, i) {
    var href = v.youtube
      ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(v.youtube)
      : '#';
    var target = v.youtube ? ' target="_blank" rel="noopener"' : '';
    return el(
      '<a class="card" data-reveal data-delay="' + (i % 3) + '" href="' + href + '"' + target + '>' +
        '<div class="card__art">' + scene(v.poster) +
          '<div class="play-badge"><i></i></div>' +
          '<span class="video-tag">' + esc(v.duration) + '</span>' +
        '</div>' +
        '<div class="card__body">' +
          '<div class="card__meta"><span class="chip">' + esc(v.level) + '</span><span>' + fmtDate(v.date) + '</span></div>' +
          '<h3 class="card__title">' + esc(v.title) + '</h3>' +
          '<p class="card__excerpt">' + esc(v.description) + '</p>' +
          (v.youtube ? '<span class="link-arrow">Watch <span>→</span></span>'
                     : '<span class="card__meta" style="margin-top:auto">Coming soon</span>') +
        '</div>' +
      '</a>'
    );
  }

  function thoughtCard(t) {
    return el(
      '<figure class="thought" data-reveal>' +
        '<p>“' + esc(t.text) + '”</p>' +
        '<time>' + fmtDate(t.date) + '</time>' +
      '</figure>'
    );
  }

  function renderInto(sel, items, builder, limit) {
    var host = $(sel); if (!host) return;
    (limit ? items.slice(0, limit) : items).forEach(function (item, i) {
      host.appendChild(builder(item, i));
    });
  }

  /* ------------------------------------------------------------ article page */
  function renderArticle() {
    var host = $("#article"); if (!host) return;
    var slug = new URLSearchParams(location.search).get("slug");
    var p = (C.blog || []).filter(function (x) { return x.slug === slug; })[0];
    if (!p) {
      host.innerHTML = '<div class="wrap section" style="text-align:center">' +
        '<p class="eyebrow">Not found</p><h1 class="h2" style="margin-top:12px">This page wandered off.</h1>' +
        '<p class="lead" style="margin:16px auto 28px">The writing you are looking for isn’t here.</p>' +
        '<a class="btn btn--sage" href="blog.html">Back to all writings</a></div>';
      return;
    }
    document.title = p.title + " — Sādhana";
    host.innerHTML =
      '<article class="article">' +
        '<header class="article__head wrap">' +
          '<p class="eyebrow">' + esc(p.category) + '</p>' +
          '<h1>' + esc(p.title) + '</h1>' +
          '<div class="card__meta" style="justify-content:center;margin-top:18px">' +
            '<span>' + fmtDate(p.date) + '</span><span>·</span><span>' + p.readingTime + ' min read</span>' +
            '<span>·</span><span>by ' + esc((C.site && C.site.teacher) || "Shraddha") + '</span></div>' +
        '</header>' +
        '<div class="wrap"><div class="article__cover">' + scene(p.cover) + '</div></div>' +
        '<div class="wrap"><div class="prose">' + richText(p.body) + '</div>' +
          '<div style="text-align:center;margin:56px 0 8px"><a class="link-arrow" href="blog.html"><span>←</span> All writings</a></div>' +
        '</div>' +
      '</article>';
  }

  /* ------------------------------------------------------------ small bindings */
  function bindText() {
    if (!C.site) return;
    $all("[data-site]").forEach(function (n) {
      var key = n.getAttribute("data-site");
      var val = key.split(".").reduce(function (o, k) { return o && o[k]; }, C.site);
      if (val != null) n.textContent = val;
    });
    // year
    $all("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
  }

  /* ------------------------------------------------------------ boot */
  document.addEventListener("DOMContentLoaded", function () {
    bindText();
    initNav();

    renderInto("#home-blog", C.blog || [], blogCard, 3);
    renderInto("#home-thoughts", C.thoughts || [], thoughtCard, 3);
    renderInto("#all-blog", C.blog || [], blogCard);
    renderInto("#all-videos", C.videos || [], videoCard);
    renderInto("#all-thoughts", C.thoughts || [], thoughtCard);
    renderInto("#home-videos", C.videos || [], videoCard, 3);

    renderArticle();
    // reveal runs after content is injected
    initReveal();
  });
})();
