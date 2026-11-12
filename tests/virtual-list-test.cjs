const assert=require('node:assert/strict');
const fs=require('node:fs');
// Reproduce the owning page's first-six-child column measurement and its
// index-based visibility window after the 100-entry virtualization threshold.
function measuredColumns(rects,big=true){
  let columns=0;
  for(const r of rects)if(r.top===rects[0].top)columns+=columns===0&&big&&Math.abs(rects[0].width-rects[1].width)>10?3:1;
  return columns;
}
const originalHidden=[{top:0,width:0},...Array.from({length:5},()=>({top:150,width:340}))];
assert.equal(measuredColumns(originalHidden),3,'old display:none incorrectly measures a 5-column grid as 3');
let checked=0;
for(const columns of [3,4,5,6]){
  const rects=Array.from({length:6},(_,i)=>({top:150+Math.floor(i/columns)*300,width:340}));
  assert.equal(measuredColumns(rects),columns);
  for(const length of [100,101,200,1000]){
    const steps=Array.from({length:Math.ceil(length/columns)-3},(_,r)=>r);
    // Both down and back up, with partial rows and multiple viewport heights.
    for(const row of [...steps,...steps.slice().reverse()])for(const viewportRows of [2,3,4]){
      const begin=row*columns;
      const upper=Math.min(begin+(viewportRows+1)*columns,length)+2*columns;
      const lower=Math.max(begin-2*columns,0);
      const cached=index=>index>=lower&&index<upper;
      for(let index=begin;index<Math.min(length,begin+viewportRows*columns);index++){
        const render=index>=columns+3?cached(index+5):index===0?cached(0)||cached(columns):cached(index+3);
        assert.equal(render,true,`visible card ${index} must render at row ${row}, columns ${columns}`);
        checked++;
      }
    }
  }
}
const css=fs.readFileSync('./content.css','utf8');
assert.doesNotMatch(css.split('/* Cover the preview surface')[0].replace(/\/\*[\s\S]*?\*\//g,''),/display:\s*none/);
assert.match(css,/grid-area:\s*auto/);
assert.match(css,/Ihfp7fqL:first-child.Ihfp7fqL/,'virtual placeholders need normal card geometry too');
console.log(`PASS: reproduced old wrong column count; ${checked} visible-index checks across 3–6 columns, 100–1000 cards, downward/upward scrolling and partial viewports.`);
