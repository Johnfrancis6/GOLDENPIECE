// Measures each string in Poppins GP at 100 % and 200 % font; prints the ones over their slot limit.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{const items=JSON.parse(fs.readFileSync(path.join(__dirname,'items.json')));const b=await chromium.launch();const p=await b.newPage();
const F=path.resolve(__dirname,'../../fonts')+'/';
await p.setContent(`<style>@font-face{font-family:P;font-weight:400;src:url(file://${F}PoppinsGP-Regular.ttf)}@font-face{font-family:P;font-weight:500;src:url(file://${F}PoppinsGP-Medium.ttf)}@font-face{font-family:P;font-weight:600;src:url(file://${F}PoppinsGP-SemiBold.ttf)}div{font-family:P}</style><div id=d>x</div>`);
await p.evaluate(()=>document.fonts.ready);
const res=await p.evaluate(items=>{const d=document.getElementById('d');return items.map(it=>{const [w,fs,lh,fw,max]=it.spec;const out={};for(const s of [1,2]){d.style.cssText=`width:${w}px;font-size:${fs*s}px;line-height:${lh*s}px;font-weight:${fw};word-break:normal;overflow-wrap:anywhere`;d.textContent=it.text;out['l'+s]=Math.round(d.getBoundingClientRect().height/(lh*s));}return {...it,...out};})},items);

const bad=res.filter(r=>r.l1>r.spec[4]||(r.spec[4]<=2&&r.l2>r.spec[4]*2));
for(const r of bad)console.log(`${r.l1}/${r.l2} max${r.spec[4]} [${r.slot}] ${r.sec} :: ${r.key} :: ${r.lang} :: ${r.raw}`);
console.log('total',res.length,'flagged',bad.length);await b.close()})()
