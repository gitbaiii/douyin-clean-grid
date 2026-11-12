const {parseHTML}=require('linkedom');
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const {document,window}=parseHTML('<html><body><div class="jingxuanFeedList"><div class="jingxuanVideoCard"><img><video id="preview"></video></div></div><div id="detail"><video></video></div></body></html>');
let change;
const handlers={};
const original=document.addEventListener.bind(document);
document.addEventListener=(type,fn,...args)=>{handlers[type]=fn;original(type,fn,...args);};
for(const v of document.querySelectorAll('video')){v.paused=false;v.pause=function(){this.paused=true;};}
const location={pathname:'/jingxuan'};
vm.runInNewContext(fs.readFileSync('./content.js','utf8'),{document,location,Element:window.Element,HTMLVideoElement:document.querySelector('video').constructor,chrome:{runtime:{},storage:{local:{get:(_,cb)=>cb({enabled:false,blockHover:true})},onChanged:{addListener:fn=>change=fn}}},setTimeout:()=>1,setInterval:()=>{},addEventListener:()=>{},MutationObserver:class{observe(){}}});
const preview=document.querySelector('#preview'),detail=document.querySelector('#detail video');
assert.equal(preview.paused,true);assert.equal(detail.paused,false);
function over(target){let stopped=false;handlers.mouseover({target,stopImmediatePropagation(){stopped=true;}});return stopped;}
assert.equal(over(document.querySelector('img')),true);
assert.equal(over(detail),false);
preview.paused=false;handlers.play({target:preview});assert.equal(preview.paused,true);
assert.equal(handlers.click,undefined);
change({blockHover:{newValue:false}},'local');
assert.equal(over(preview),false);
preview.paused=false;handlers.play({target:preview});assert.equal(preview.paused,false);
change({blockHover:{newValue:true}},'local');location.pathname='/video/123';
preview.paused=false;handlers.play({target:preview});assert.equal(preview.paused,false);assert.equal(over(preview),false);
console.log('PASS: hover blocked only inside feed cards, preview paused, detail/click unaffected, independent switch, non-home routes preserved.');
// Real live cards have no jingxuanVideoCard wrapper.
document.querySelector('.jingxuanVideoCard').className='discover-video-card-item';
preview.parentElement.className='discover-video-card-item liveCardPlayer';
location.pathname='/jingxuan';preview.paused=false;
preview.setAttribute('src','blob:live');
let reloads=0;preview.load=()=>reloads++;
handlers.play({target:preview});
assert.equal(preview.paused,true);assert.equal(preview.hasAttribute('src'),false);assert.equal(reloads,1);
console.log('PASS: live card without ordinary-video wrapper paused and attached source removed.');
