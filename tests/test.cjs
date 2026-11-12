const {parseHTML}=require('linkedom');
const vm=require('node:vm');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root='./';
function fixture(big=true,path='/jingxuan') {
  const {document}=parseHTML(`<html><body><div class="jingxuanFeedList"><div class="${big?'bigCardWaterfallContainer':''}"><div><video id="feature"></video></div><div class="normal"><video id="normal"></video></div></div></div><div id="detail"><video></video></div></body></html>`);
  let changed,interval,task,mutate;
  for(const video of document.querySelectorAll('video')) {video.paused=false;video.pause=function(){this.paused=true;};}
  const location={pathname:path};
  const ctx={document,location,HTMLVideoElement:document.querySelector('video').constructor,chrome:{runtime:{},storage:{local:{get:(_,cb)=>cb({enabled:true})},onChanged:{addListener:f=>changed=f}}},setTimeout:f=>(task=f,1),setInterval:f=>interval=f,addEventListener:()=>{},MutationObserver:class{constructor(f){mutate=f;}observe(){}}};
  vm.runInNewContext(fs.readFileSync(root+'content.js','utf8'),ctx);
  return {document,location,flush:()=>task?.(),change:v=>changed({enabled:{newValue:v}},'local'),mutate:()=>{mutate();task?.();},route:p=>{location.pathname=p;interval();task?.();}};
}
let f=fixture();
assert.equal(f.document.documentElement.getAttribute('data-dcg-active'),'true');
assert.equal(f.document.querySelector('#feature').paused,true);
assert.equal(f.document.querySelector('#normal').paused,false);
assert.equal(f.document.querySelector('#detail video').paused,false);
f.change(false);assert.equal(f.document.documentElement.getAttribute('data-dcg-active'),'false');
f.change(true);assert.equal(f.document.documentElement.getAttribute('data-dcg-active'),'true');
f.route('/video/123');assert.equal(f.document.documentElement.getAttribute('data-dcg-active'),'false');
f.route('/jingxuan/');assert.equal(f.document.documentElement.getAttribute('data-dcg-active'),'true');
f.document.querySelector('#feature').paused=false;f.mutate();assert.equal(f.document.querySelector('#feature').paused,true);
f=fixture(false);assert.equal(f.document.querySelector('#feature').paused,false);
const css=fs.readFileSync(root+'content.css','utf8');
assert.doesNotMatch(css,/display:\s*none\s*!important/);
assert.match(css,/grid-area:\s*auto\s*!important/);
assert.match(css,/padding-top:\s*56\.25%\s*!important/);
const selector=css.replace(/\/\*[\s\S]*?\*\//g,'').split('{')[0].trim();
assert.equal(f.document.querySelectorAll(selector).length,0);
f=fixture();assert.equal(f.document.querySelectorAll(selector).length,1);
f.change(false);assert.equal(f.document.querySelectorAll(selector).length,0);
console.log('PASS: feature-only selector, measurable normal-size first card, normal/detail playback preserved, switch restore, SPA routes, dynamic insertion/class update, no-feature fallback.');
