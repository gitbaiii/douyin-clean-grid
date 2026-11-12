(() => {
  'use strict';
  const cardSelector = '.jingxuanFeedList .discover-video-card-item, .jingxuanFeedList .jingxuanVideoCard';
  let clickAllowanceUntil = 0;
  const now = Date.now.bind(Date);

  function listingOnly() {
    return /^\/jingxuan\/?$/.test(location.pathname) &&
      !new URLSearchParams(location.search).get('modal_id');
  }

  function blocking() {
    return listingOnly() && now() >= clickAllowanceUntil &&
      document.documentElement?.getAttribute('data-dcg-block-previews') !== 'false';
  }

  // Register on window before the site's delegated event handlers exist.
  // Include movement: some preview implementations do not use mouseenter.
  for (const type of ['mouseover', 'mouseenter', 'mousemove', 'pointerover', 'pointerenter', 'pointermove']) {
    window.addEventListener(type, event => {
      if (blocking() && event.target instanceof Element && event.target.closest(cardSelector)) {
        event.stopImmediatePropagation();
      }
    }, true);
  }
  window.addEventListener('click', event => {
    if (!event.isTrusted || !listingOnly() || !(event.target instanceof Element)) return;
    const card = event.target.closest('.jingxuanVideoCard');
    const link = card?.getAttribute('href');
    if (link && /\/video\/\d+/.test(link)) {
      // The detail player may start before SPA navigation updates the URL.
      // Hover alone can never grant this allowance.
      clickAllowanceUntil = now() + 3000;
    }
  }, true);

  function videoUrl(value) {
    if (typeof value !== 'string' && !(value instanceof URL)) return false;
    try {
      const url = new URL(String(value), location.href);
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
      return host === 'douyinvod.com' || host.endsWith('.douyinvod.com') ||
        host === 'douyinvideo.net' || host.endsWith('.douyinvideo.net') ||
        // Live players use FLV/HLS/DASH rather than ordinary VOD addresses.
        /\.(?:flv|m3u8|mpd|m4s|ts)$/i.test(url.pathname) ||
        (/\/(?:video\/tos|aweme\/v\d+\/play)\//.test(url.pathname) &&
          ['bytecdn.cn', 'ibytedtos.com', 'douyin.com'].some(domain => host === domain || host.endsWith('.' + domain)));
    } catch { return false; }
  }

  function denyUrl(value) { return blocking() && videoUrl(value); }

  const nativeFetch = window.fetch;
  if (nativeFetch) window.fetch = function(input, init) {
    const url = input instanceof Request ? input.url : input;
    if (denyUrl(url)) return Promise.reject(new DOMException('Homepage video preload blocked by Clean Grid', 'AbortError'));
    return Reflect.apply(nativeFetch, this, arguments);
  };

  const requests = new WeakMap();
  const xhrProto = XMLHttpRequest.prototype;
  const nativeOpen = xhrProto.open;
  const nativeSend = xhrProto.send;
  const nativeAbort = xhrProto.abort;
  xhrProto.open = function(method, url) {
    requests.set(this, url);
    return Reflect.apply(nativeOpen, this, arguments);
  };
  xhrProto.send = function() {
    if (denyUrl(requests.get(this))) {
      Reflect.apply(nativeAbort, this, []);
      queueMicrotask(() => {
        this.dispatchEvent(new ProgressEvent('error'));
        this.dispatchEvent(new ProgressEvent('loadend'));
      });
      return;
    }
    return Reflect.apply(nativeSend, this, arguments);
  };

  function videoSource(element) {
    return element instanceof HTMLVideoElement ||
      (element instanceof HTMLSourceElement && !element.closest('audio'));
  }

  // Homepage live previews can use blob/MSE or MediaStream, with no VOD URL.
  // Block video attachment and playback, including detached pre-created players.
  const nativePlay = HTMLMediaElement.prototype.play;
  if (nativePlay) HTMLMediaElement.prototype.play = function() {
    if (this instanceof HTMLVideoElement && blocking()) {
      return Promise.reject(new DOMException('Homepage preview blocked by Clean Grid', 'AbortError'));
    }
    return Reflect.apply(nativePlay, this, arguments);
  };
  for (const prototype of [HTMLMediaElement.prototype, HTMLSourceElement.prototype]) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'src');
    if (!descriptor?.set || !descriptor.configurable) continue;
    Object.defineProperty(prototype, 'src', {
      ...descriptor,
      set(value) {
        if (!videoSource(this) || !blocking() || !value) descriptor.set.call(this, value);
      }
    });
  }
  const objectDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'srcObject');
  if (objectDescriptor?.set && objectDescriptor.configurable) {
    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      ...objectDescriptor,
      set(value) {
        if (!(this instanceof HTMLVideoElement) || !blocking() || value == null) objectDescriptor.set.call(this, value);
      }
    });
  }
  const nativeSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (String(name).toLowerCase() === 'src' &&
        videoSource(this) && blocking() && value) return;
    return Reflect.apply(nativeSetAttribute, this, arguments);
  };
})();
