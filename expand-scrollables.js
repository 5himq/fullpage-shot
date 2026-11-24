// expand-scrollables.js
//
// Prepares a page for a full-page screenshot so that content hidden inside
// scrollable sub-regions is captured too:
//
//   1. Scrolls through the whole document once (and back to the top) so
//      lazy-loaded content gets a chance to render.
//   2. Finds every element that scrolls internally (its scrollHeight is
//      larger than its clientHeight, or its scrollWidth is larger than its
//      clientWidth) and expands it to its full content size by overriding
//      height / width / max-height / max-width / overflow.
//   3. Un-clips the expanded elements' ancestors: ancestors that clip with
//      overflow or a fixed height get overflow: visible and height: auto,
//      and fixed-position ancestors are switched to absolute positioning,
//      so expanded content actually joins the document's overflow area
//      instead of being cut off by an app shell or a modal overlay.
//   4. Repeats the expansion a few times, because expanding one region can
//      reveal or resize nested scrollable regions, then waits for the
//      browser to re-layout and paint the result.
//
// The script is an async IIFE: shot-scraper evaluates it with
// page.evaluate(), which awaits the returned promise, so all of the
// waiting above finishes before the screenshot is taken.
(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // --- 1. Scroll through the document to trigger lazy loading -------------
  const pageHeight = () =>
    Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    );
  const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
  for (let y = 0; y <= pageHeight(); y += step) {
    window.scrollTo(0, y);
    await sleep(100);
  }
  window.scrollTo(0, pageHeight());
  await sleep(250);
  window.scrollTo(0, 0);
  await sleep(150);

  // --- 2+3. Expand scrollable elements and un-clip their ancestors --------
  const unclipAncestors = (el) => {
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      node.style.setProperty("overflow", "visible", "important");
      node.style.setProperty("overflow-x", "visible", "important");
      node.style.setProperty("overflow-y", "visible", "important");
      node.style.setProperty("max-height", "none", "important");
      node.style.setProperty("max-width", "none", "important");
      if (node.scrollHeight > node.clientHeight + 1) {
        node.style.setProperty("height", "auto", "important");
      }
      if (node.scrollWidth > node.clientWidth + 1) {
        node.style.setProperty("width", "auto", "important");
      }
      if (window.getComputedStyle(node).position === "fixed") {
        node.style.setProperty("position", "absolute", "important");
      }
      node = node.parentElement;
    }
    // The root element must not clip either.
    document.documentElement.style.setProperty("overflow", "visible", "important");
  };

  const expandOnce = () => {
    let changed = false;
    const elements = document.querySelectorAll("*");
    for (const el of elements) {
      if (el === document.documentElement || el === document.body) {
        continue;
      }
      const needsHeight = el.scrollHeight > el.clientHeight + 1;
      const needsWidth = el.scrollWidth > el.clientWidth + 1;
      if (!needsHeight && !needsWidth) {
        continue;
      }
      if (needsHeight) {
        el.style.setProperty("height", el.scrollHeight + "px", "important");
        el.style.setProperty("max-height", "none", "important");
      }
      if (needsWidth) {
        el.style.setProperty("width", el.scrollWidth + "px", "important");
        el.style.setProperty("max-width", "none", "important");
      }
      el.style.setProperty("overflow", "visible", "important");
      el.style.setProperty("overflow-x", "visible", "important");
      el.style.setProperty("overflow-y", "visible", "important");
      unclipAncestors(el);
      changed = true;
    }
    return changed;
  };

  for (let pass = 0; pass < 4; pass++) {
    const changed = expandOnce();
    await sleep(150);
    if (!changed) {
      break;
    }
  }

  // --- 4. Let the final layout settle -------------------------------------
  await sleep(300);
  window.scrollTo(0, 0);
})();
