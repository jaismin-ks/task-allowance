// lib/api/pageExtract.js
// On-device fallback extraction. Runs INSIDE a hidden WebView after the store page
// (and its JavaScript) has loaded, so it works for client-rendered pages and for
// stores that block server requests. Mirrors the server's lib/extract.js priorities.
//
// It must be a plain string: release builds run Hermes bytecode, where a function's
// toString() doesn't return its source.
export const PAGE_EXTRACT_JS = `
(function () {
  if (window.__taScrape) return;
  window.__taScrape = true;

  var CHALLENGE = /just a moment|attention required|access denied|captcha|robot check|pardon our interruption|verify (you are|you're) (a )?human|security check/i;

  function meta(sel) {
    var el = document.querySelector(sel);
    var v = el && el.getAttribute('content');
    return v ? v.trim() : null;
  }
  function text(sel) {
    var el = document.querySelector(sel);
    var v = el && (el.getAttribute('value') || el.textContent);
    return v ? v.trim() : null;
  }
  function typeIs(n, names) {
    var t = n && n['@type'];
    if (!t) return false;
    return [].concat(t).some(function (x) {
      return names.indexOf(String(x).replace(/^https?:\\/\\/schema\\.org\\//, '')) > -1;
    });
  }
  function search(node, depth) {
    if (!node || typeof node !== 'object' || depth > 6) return null;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) {
        var f = search(node[i], depth + 1);
        if (f) return f;
      }
      return null;
    }
    if (typeIs(node, ['Product', 'ProductGroup', 'IndividualProduct', 'ProductModel'])) return node;
    var keys = ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item'];
    for (var k = 0; k < keys.length; k++) {
      var g = search(node[keys[k]], depth + 1);
      if (g) return g;
    }
    return null;
  }
  function firstOffer(offers) {
    var list = [].concat(offers || []);
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (!o || typeof o !== 'object') continue;
      var spec = [].concat(o.priceSpecification || [])[0];
      var price = o.price != null ? o.price : o.lowPrice != null ? o.lowPrice : spec && spec.price;
      if (price != null && price !== '') return { price: price, currency: o.priceCurrency || (spec && spec.priceCurrency) || null };
      var nested = firstOffer(o.offers);
      if (nested) return nested;
    }
    return null;
  }
  function jsonLd() {
    var els = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < els.length; i++) {
      try {
        var raw = els[i].textContent.replace(/^\\s*(<!--|<!\\[CDATA\\[)/, '').replace(/(-->|\\]\\]>)\\s*$/, '');
        var p = search(JSON.parse(raw), 0);
        if (p) {
          var variant = [].concat(p.hasVariant || [])[0];
          var offer = firstOffer(p.offers) || firstOffer(variant && variant.offers) || {};
          var img = [].concat(p.image || (variant && variant.image) || [])[0];
          return {
            title: typeof p.name === 'string' ? p.name : null,
            image: typeof img === 'string' ? img : img && (img.url || img.contentUrl),
            price: offer.price,
            currency: offer.currency,
          };
        }
      } catch (e) {}
    }
    return {};
  }
  function amazon() {
    if (!/(^|\\.)amazon\\./.test(location.hostname)) return {};
    var img = document.querySelector('#landingImage, #imgBlkFront, #main-image');
    var image = img && img.getAttribute('data-old-hires');
    if (!image && img) {
      try { image = Object.keys(JSON.parse(img.getAttribute('data-a-dynamic-image') || '{}'))[0]; } catch (e) {}
    }
    return {
      title: text('#productTitle') || text('#title'),
      image: image || (img && img.getAttribute('src')),
      price:
        text('#twister-plus-price-data-price') ||
        text('#corePrice_feature_div .a-offscreen') ||
        text('#corePriceDisplay_desktop_feature_div .a-offscreen') ||
        text('#corePrice_mobile_feature_div .a-offscreen') ||
        text('#apex_offerDisplay_mobile .a-offscreen') ||
        text('#qualifiedBuybox .a-offscreen'),
    };
  }
  function collect() {
    var a = amazon();
    var p = jsonLd();
    var h1 = document.querySelector('h1');
    var priceEl = document.querySelector('[itemprop="price"]');
    return {
      title: a.title || meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]') || p.title ||
        (h1 && h1.textContent.trim()) || document.title || null,
      image: a.image || meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]') || p.image || null,
      price: a.price || meta('meta[property="product:price:amount"]') || meta('meta[property="og:price:amount"]') ||
        (p.price != null ? String(p.price) : null) ||
        (priceEl && (priceEl.getAttribute('content') || priceEl.textContent.trim())) || null,
      currency: meta('meta[property="product:price:currency"]') || meta('meta[property="og:price:currency"]') ||
        p.currency || (document.querySelector('[itemprop="priceCurrency"]') || {}).content || null,
    };
  }

  var tries = 0;
  function tick() {
    tries++;
    var challenged = CHALLENGE.test(document.title || '');
    var d = collect();
    // Keep polling while a bot check is resolving or the page is still rendering
    // its price; give up after ~8s and report the best we have.
    if (!challenged && ((d.title && d.price) || tries >= 10)) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ta-scrape', url: location.href, data: d }));
    } else {
      setTimeout(tick, 800);
    }
  }
  tick();
})();
true;
`;
