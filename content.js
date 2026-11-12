(() => {
  'use strict';
  let enabled = true;
  let blockHover = true;
  let timer = null;
  let observer;
  const coverCache = new WeakMap();

  function onHome() {
    return /^\/jingxuan\/?$/.test(location.pathname);
  }

  function update() {
    timer = null;
    if (!document.documentElement) return;
    const active = enabled && onHome();
    const value = String(active);
    if (document.documentElement.getAttribute('data-dcg-active') !== value) {
      document.documentElement.setAttribute('data-dcg-active', value);
    }
    document.documentElement.setAttribute('data-dcg-block-previews', String(blockHover));
    updateStaticCovers();
    document.querySelectorAll('.jingxuanFeedList video').forEach(video => {
      if (shouldPause(video)) stopPreview(video);
    });
  }

  function updateStaticCovers() {
    const boxes = document.querySelectorAll('.jingxuanFeedList .videoImage, .jingxuanFeedList .LiveLinkA');
    for (const box of boxes) {
      const featured = !!box.closest('.bigCardWaterfallContainer > div:first-of-type');
      const staticCover = onHome() && (blockHover || (enabled && featured));
      const value = String(staticCover);
      if (box.getAttribute('data-dcg-static-cover') !== value) box.setAttribute('data-dcg-static-cover', value);
      if (!staticCover) continue;
      const card = box.closest('.discover-video-card-item');
      const id = card?.getAttribute('data-aweme-id') || '';
      const cached = coverCache.get(box);
      // Use only the site's existing cover image, never the video URL.
      const original = Array.from(box.querySelectorAll('img')).find(image =>
        !image.closest('.dcg-static-cover') && /^https?:\/\//i.test(image.currentSrc || image.getAttribute('src') || ''));
      const url = original ? (original.currentSrc || original.getAttribute('src')) : (cached?.id === id ? cached.url : '');
      if (url) coverCache.set(box, { id, url });
      let overlay = box.querySelector('.dcg-static-cover');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'dcg-static-cover';
        overlay.setAttribute('aria-hidden', 'true');
        const image = document.createElement('img');
        image.alt = '';
        image.addEventListener('error', () => { image.style.visibility = 'hidden'; });
        overlay.appendChild(image);
        const label = document.createElement('span');
        label.textContent = '点击观看';
        overlay.appendChild(label);
        box.appendChild(overlay);
      }
      const image = overlay.querySelector('img');
      const duration = box.querySelector('.bxpxnS0I');
      const labelText = duration?.textContent?.trim() || (box.matches('.LiveLinkA') ? '直播' : '点击观看');
      const label = overlay.querySelector('span');
      if (label.textContent !== labelText) label.textContent = labelText;
      if (url && image.getAttribute('src') !== url) {
        image.style.visibility = '';
        image.setAttribute('src', url);
      } else if (!url && image.hasAttribute('src')) image.removeAttribute('src');
    }
  }

  function shouldPause(video) {
    return onHome() && (
      (enabled && video.matches('.jingxuanFeedList .bigCardWaterfallContainer > div:first-of-type video')) ||
      (blockHover && video.matches('.jingxuanFeedList .jingxuanVideoCard video, .jingxuanFeedList .discover-video-card-item video, .jingxuanFeedList .liveCardPlayer video'))
    );
  }

  function stopPreview(video) {
    if (!video.paused) video.pause();
    // Cancel an already attached native stream rather than merely freezing it.
    let attached = video.hasAttribute('src');
    if (attached) video.removeAttribute('src');
    if (video.srcObject) { video.srcObject = null; attached = true; }
    for (const source of video.querySelectorAll('source[src]')) {
      source.removeAttribute('src'); attached = true;
    }
    if (attached && typeof video.load === 'function') video.load();
  }

  function schedule() {
    if (timer === null) timer = setTimeout(update, 120);
  }

  function start() {
    update();
    observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    // Covers client-side route transitions without replacing site history methods.
    setInterval(schedule, 1000);
    addEventListener('popstate', schedule);
    document.addEventListener('play', event => {
      if (event.target instanceof HTMLVideoElement && shouldPause(event.target)) {
        stopPreview(event.target);
      }
    }, true);
    // Stop delegated hover triggers only on feed cards; preserve clicks and scrolling.
    for (const type of ['mouseover', 'mouseenter', 'pointerover', 'pointerenter']) {
      document.addEventListener(type, event => {
        if (blockHover && onHome() && event.target instanceof Element &&
            event.target.closest('.jingxuanFeedList .jingxuanVideoCard')) {
          event.stopImmediatePropagation();
        }
      }, true);
    }
  }

  chrome.storage.local.get({ enabled: true, blockHover: true }, settings => {
    if (!chrome.runtime.lastError) {
      enabled = settings.enabled !== false;
      blockHover = settings.blockHover !== false;
    }
    schedule();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.enabled) enabled = changes.enabled.newValue !== false;
    if (changes.blockHover) blockHover = changes.blockHover.newValue !== false;
    update();
  });
  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
