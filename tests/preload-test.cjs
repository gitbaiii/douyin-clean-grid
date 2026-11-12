const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

async function test() {
  const handlers = {};
  const state = { allow: null, fetches: 0, sends: 0, srcWrites: 0, attrs: 0, time: 10000, plays: 0, objects: 0 };
  class Element {
    setAttribute(name, value) { state.attrs++; }
    getAttribute(name) { return this.href || null; }
    closest() { return this.card ? this : null; }
  }
  class Media extends Element { play() { state.plays++; return Promise.resolve(); } }
  class Video extends Media {}
  class Audio extends Media {}
  class Source extends Element {}
  Object.defineProperty(Media.prototype, 'srcObject', {configurable:true,get(){return this._object;},set(v){state.objects++;this._object=v;}});
  for (const p of [Media.prototype, Source.prototype]) {
    Object.defineProperty(p, 'src', { configurable: true, get() { return this._src; }, set(v) { state.srcWrites++; this._src=v; } });
  }
  class XHR {
    open(method, url) { this.url=url; }
    send() { state.sends++; }
    abort() { this.aborted=true; }
    dispatchEvent(e) { (this.events ||= []).push(e.type); }
  }
  const location = { pathname:'/jingxuan', search:'', href:'https://www.douyin.com/jingxuan' };
  const context = {window:{addEventListener:(type, fn)=>handlers[type]=fn,fetch:()=>{state.fetches++;return Promise.resolve('ok');}},document:{documentElement:{getAttribute:()=>state.allow}},location,Element,HTMLMediaElement:Media,HTMLVideoElement:Video,HTMLAudioElement:Audio,HTMLSourceElement:Source,XMLHttpRequest:XHR,URL,URLSearchParams,Request,DOMException,ProgressEvent:class{constructor(type){this.type=type;}},queueMicrotask,Date:{now:()=>state.time}};
  vm.runInNewContext(fs.readFileSync('./preview-guard.js','utf8'),context);
  const media='https://v26-web.douyinvod.com/example/video.mp4';
  const cover='https://p3.douyinpic.com/cover.jpeg';
  await assert.rejects(context.window.fetch(media),{name:'AbortError'});
  await assert.rejects(context.window.fetch(new Request(media)),{name:'AbortError'});
  assert.equal(state.fetches,0);
  await context.window.fetch(cover);await context.window.fetch('/aweme/v1/web/aweme/detail/');
  assert.equal(state.fetches,2);
  // Domain suffix check must not accidentally match unrelated sites.
  await context.window.fetch('https://douyinvod.com.example.org/test');
  assert.equal(state.fetches,3);
  const xhr=new XHR();xhr.open('GET',media);xhr.send();await Promise.resolve();
  assert.equal(state.sends,0);assert.equal(xhr.aborted,true);assert.deepEqual(xhr.events,['error','loadend']);
  xhr.open('GET',cover);xhr.send();assert.equal(state.sends,1);
  const v=new Video(), s=new Source(), a=new Audio();
  v.src=media;s.src=media;v.setAttribute('src',media);s.setAttribute('src',media);
  assert.equal(state.srcWrites,0);assert.equal(state.attrs,0);
  a.src=media;assert.equal(state.srcWrites,1);
  const card=new Element();card.card=true;card.href='//www.douyin.com/video/123';
  for(const type of ['mouseover','mouseenter','mousemove','pointerover','pointerenter','pointermove']) {
    let stopped=false;handlers[type]({target:card,stopImmediatePropagation(){stopped=true;}});assert.equal(stopped,true);
  }
  handlers.click({target:card,isTrusted:false});await assert.rejects(context.window.fetch(media));
  handlers.click({target:card,isTrusted:true});await context.window.fetch(media);assert.equal(state.fetches,4);
  state.time+=3001;await assert.rejects(context.window.fetch(media));
  location.search='?modal_id=123';await context.window.fetch(media);v.src=media;
  assert.equal(state.fetches,5);assert.equal(state.srcWrites,2);
  location.search='';location.pathname='/video/123';await context.window.fetch(media);assert.equal(state.fetches,6);
  location.pathname='/jingxuan';state.allow='false';await context.window.fetch(media);v.src=media;
  assert.equal(state.fetches,7);assert.equal(state.srcWrites,3);
  // Live streams and blob/MSE previews must not slip through the VOD-only guard.
  state.allow=null;
  for(const path of ['stream.flv','stream.m3u8','manifest.mpd','chunk.m4s','chunk.ts']) {
    await assert.rejects(context.window.fetch('https://example.test/live/'+path));
    const liveXHR=new XHR();liveXHR.open('GET','https://example.test/live/'+path);liveXHR.send();
  }
  assert.equal(state.fetches,7);assert.equal(state.sends,1);
  v.src='blob:https://www.douyin.com/example';v.src='https://example.test/opaque-stream';
  v.setAttribute('src','blob:https://www.douyin.com/example');
  assert.equal(state.srcWrites,3);assert.equal(state.attrs,0);
  v.srcObject={live:true};assert.equal(state.objects,0);
  v.srcObject=null;assert.equal(state.objects,1);
  await assert.rejects(v.play(),{name:'AbortError'});assert.equal(state.plays,0);
  await a.play();assert.equal(state.plays,1);
  location.pathname='/video/123';v.srcObject={live:true};await v.play();
  assert.equal(state.objects,2);assert.equal(state.plays,2);
  // A real live room is outside the injected host; ordinary other routes pass too.
  location.pathname='/live';await context.window.fetch('https://example.test/live/stream.flv');
  assert.equal(state.fetches,8);
  console.log('PASS: live FLV/HLS/DASH fetch and XHR blocked; blob/opaque src and srcObject blocked; native video play blocked; audio/detail playback preserved.');
  console.log('PASS: homepage fetch/Request/XHR/src/setAttribute blocked before native calls; image/API preserved; early hover/movement blocked; genuine click allowance, timeout, detail routes and switch passthrough.');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
