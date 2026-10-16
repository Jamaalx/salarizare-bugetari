/* Calculator salarii — România Transparentă: widget pentru alte site-uri (docs/WIDGET-EMBED.md).
   Pune un iframe în fiecare <div data-rt-salarii> și îi potrivește înălțimea după mesajele trimise de pagina embed.
   Fără cookie, fără date despre vizitator, fără alte cereri în afară de iframe. */
(function () {
  var s = document.currentScript, base;
  try { base = new URL(".", s && s.src ? s.src : location.href).href.replace(/\/$/, ""); } catch (e) { return; }
  var origin = new URL(base).origin, frames = [];
  function lim(h, d) { h = +h; return isFinite(h) && h > 0 ? Math.min(4000, Math.max(480, Math.round(h))) : d; }
  function init() {
    var els = document.querySelectorAll("div[data-rt-salarii]:not([data-rt-gata])");
    for (var i = 0; i < els.length; i++) {
      var el = els[i], q = [], v = el.getAttribute("data-varianta"), m = el.getAttribute("data-mod");
      if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) q.push("varianta=" + v);
      if (m === "expert") q.push("mod=expert");
      var f = document.createElement("iframe");
      f.src = base + "/embed" + (q.length ? "?" + q.join("&") : "");
      f.title = "Calculator salarii — România Transparentă";
      f.loading = "lazy";
      f.referrerPolicy = "strict-origin-when-cross-origin";
      f.style.cssText = "border:0;width:100%;max-width:960px;display:block";
      f.height = String(lim(el.getAttribute("data-inaltime"), 900));
      el.setAttribute("data-rt-gata", "");
      el.appendChild(f);
      frames.push(f);
    }
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== origin || !e.data || e.data.type !== "rt-salarii:inaltime") return;
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === e.source) frames[i].height = String(lim(e.data.h, frames[i].height));
    }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
