const {parseHTML}=require('linkedom');
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const {document,window}=parseHTML(`<html><body><div class="jingxuanFeedList"><div class="bigCardWaterfallContainer"><div class="discover-video-card-item" data-aweme-id="1"><div class="jingxuanVideoCard"><div class="videoImage"><img class="discover-video-card-img" src="https://p3.douyinpic.com/one.jpg"><div class="douyin-player">不支持的音频/视频格式</div><div class="bxpxnS0I">03:21</div></div></div></div><div class="discover-video-card-item" data-aweme-id="2"><a class="LiveLinkA"><div class="liveCardPlayer">直播加载中</div><img src="https://p3.douyinpic.com/live.jpg"></a></div></div></div><div id="detail"><video></video></div></body></html>`);
let change,mutation,interval,task;
const location={pathname:'/jingxuan'};
vm.runInNewContext(fs.readFileSync('./content.js','utf8'),{document,location,Element:window.Element,HTMLVideoElement:window.HTMLVideoElement,chrome:{runtime:{},storage:{local:{get:(_,cb)=>cb({enabled:true,blockHover:true})},onChanged:{addListener:fn=>change=fn}}},setTimeout:fn=>(task=fn,1),setInterval:fn=>interval=fn,addEventListener:()=>{},MutationObserver:class{constructor(fn){mutation=fn;}observe(){}}});
const box=document.querySelector('.videoImage');
assert.equal(box.querySelector('.dcg-static-cover img').getAttribute('src'),'https://p3.douyinpic.com/one.jpg');
assert.equal(box.querySelector('.dcg-static-cover span').textContent,'03:21');
assert.equal(document.querySelector('.LiveLinkA .dcg-static-cover img').getAttribute('src'),'https://p3.douyinpic.com/live.jpg');
assert.equal(document.querySelector('#detail .dcg-static-cover'),null);
assert.equal(document.querySelectorAll('.discover-video-card-item').length,2);
// Renders and subsequent retry mutations must not duplicate overlays.
for(let i=0;i<10;i++){mutation();task();}
assert.equal(document.querySelectorAll('.dcg-static-cover').length,2);
// The site may remove its cover while previewing; preserve the last known URL.
box.querySelector('img.discover-video-card-img').remove();box.querySelector('.dcg-static-cover').remove();
mutation();task();assert.equal(box.querySelector('.dcg-static-cover img').getAttribute('src'),'https://p3.douyinpic.com/one.jpg');
// A recycled card must not retain another video's image.
box.closest('.discover-video-card-item').setAttribute('data-aweme-id','3');mutation();task();
assert.equal(box.querySelector('.dcg-static-cover img').hasAttribute('src'),false);
change({enabled:{newValue:false},blockHover:{newValue:false}},'local');
assert.equal(box.getAttribute('data-dcg-static-cover'),'false');
location.pathname='/video/123';interval();task();
assert.equal(document.querySelector('.LiveLinkA').getAttribute('data-dcg-static-cover'),'false');
console.log('PASS: static VOD/live covers, duration preserved, player error shield, repeated updates, cover removal recovery, recycled identity, switches and detail route restoration.');
