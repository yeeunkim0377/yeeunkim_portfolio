const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const fig = require('../fig_parser/node_modules/openfig-core');
const sharp = require('../performance-tools/node_modules/sharp');
const doc = fig.parseFigBinary(new Uint8Array(fs.readFileSync('.codex-work/hyundai_plus/canvas.fig')));
const roots = ['5:318','5:421','5:519'];
const cutoff = 1125.04345703125;
const escape = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const num = n => Number(n.toFixed(4));
const color = paint => { const c=paint?.color;return c?`rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${(c.a??1)*(paint.opacity??1)})`:'transparent'; };
const children = n => (doc.childrenMap.get(fig.nodeId(n))||[]).filter(c=>c.visible!==false);
const hashes = new Set();
function collect(n) {for(const p of n.fillPaints||[])if(p.type==='IMAGE')hashes.add(Buffer.from(p.image.hash).toString('hex'));children(n).forEach(collect);}
const selected = roots.map(id=>children(doc.nodeMap.get(id)).filter(n=>(n.transform?.m12||0)>=1100));
selected.flat().forEach(collect);
execFileSync('tar',['-xf','ref.figma/hyundai_plus.fig','-C','.codex-work/hyundai_plus',...[...hashes].map(h=>'images/'+h)]);
fs.mkdirSync('assets/hyundai/reels-detail',{recursive:true});
const stats={shapes:0,images:0,texts:0,videos:0};

async function render(n,caseIndex,rootChild=false) {
  const id=fig.nodeId(n),t=n.transform||{},w=n.size?.x||0,h=n.size?.y||0;
  let style=`width:${num(w)}px;height:${num(h)}px;transform:matrix(${t.m00??1},${t.m10??0},${t.m01??0},${t.m11??1},${num(t.m02||0)},${num((t.m12||0)-(rootChild?cutoff:0))});`;
  if(n.opacity!==undefined&&n.opacity!==1)style+=`opacity:${n.opacity};`;
  const fill=n.fillPaints?.find(p=>p.visible!==false&&p.type==='SOLID');
  const image=n.fillPaints?.find(p=>p.visible!==false&&p.type==='IMAGE');
  const video=n.fillPaints?.find(p=>p.visible!==false&&p.type==='VIDEO');
  const radius=n.cornerRadius||0;
  if(radius)style+=`border-radius:${radius}px;`;
  if(n.type==='FRAME'&&n.frameMaskDisabled===false||image)style+='overflow:hidden;';
  const blur=n.effects?.find(e=>e.visible&&e.type==='BACKGROUND_BLUR');
  if(blur)style+=`backdrop-filter:blur(${blur.radius/2}px);`;
  let content='',tag='div',cls='hyundai-fig-layer';
  if(n.textData?.characters!==undefined){
    stats.texts++;tag=n.textData.characters==='Reels Video Editing'?'h2':'p';
    cls+=' hyundai-fig-text';
    const meta=n.derivedTextData?.fontMetaData?.[0];
    style+=`font-family:'${escape(n.fontName?.family||'Gothic A1')}',sans-serif;font-size:${n.fontSize}px;font-weight:${meta?.fontWeight||400};line-height:${num((meta?.fontLineHeight||1.25)*n.fontSize)}px;color:${color(fill)};text-align:${(n.textAlignHorizontal||'LEFT').toLowerCase()};`;
    content=escape(n.textData.characters).replaceAll('\u2028','\n');
  }else if(video){
    stats.videos++;const k=String(caseIndex+1).padStart(2,'0');
    return `<video class="hyundai-reel" data-figma-id="${id}" src="assets/hyundai/reel-${k}.mp4" data-poster="assets/hyundai/reel-${k}-poster.png" preload="none" controls playsinline aria-label="현대건설 릴스 사례 ${caseIndex+1}" style="${style}"></video>`;
  }else if(image){
    stats.images++;const hash=Buffer.from(image.image.hash).toString('hex');
    const src=`assets/hyundai/reels-detail/${id.replace(':','-')}.webp`;
    const tr=image.transform||{m00:1,m11:1,m02:0,m12:0};
    const crop=Math.abs(tr.m00-1)>.001||Math.abs(tr.m11-1)>.001||Math.abs(tr.m02)>.001||Math.abs(tr.m12)>.001;
    const iw=crop?w/tr.m00:w,ih=crop?h/tr.m11:h;
    const metadata=await sharp(`.codex-work/hyundai_plus/images/${hash}`).metadata();
    await sharp(`.codex-work/hyundai_plus/images/${hash}`).rotate().resize({width:Math.min(metadata.width,Math.ceil(iw*2)),withoutEnlargement:true}).webp({quality:92}).toFile(src);
    const imageStyle=crop?`left:${num(-tr.m02*iw)}px;top:${num(-tr.m12*ih)}px;width:${num(iw)}px;height:${num(ih)}px;`:'inset:0;width:100%;height:100%;object-fit:cover;';
    content=`<img src="${src}" loading="lazy" decoding="async" alt="${escape(n.name)}" style="${imageStyle}">`;
  }else if(n.type==='VECTOR'||n.type==='LINE'||n.type==='BOOLEAN_OPERATION'){
    stats.shapes++;const paths=fig.resolveVectorNodePaths(doc,n);
    content=`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">`;
    for(const p of [...paths.fill,...paths.stroke]){const paint=p.paints?.find(p=>p.visible!==false&&p.type==='SOLID')||fill;content+=`<path d="${p.svgPath}" fill="${color(paint)}" fill-rule="${p.windingRule==='ODD'?'evenodd':'nonzero'}"/>`;}
    content+='</svg>';
  }else{
    stats.shapes++;if(fill)style+=`background:${color(fill)};`;
    const stroke=n.strokePaints?.find(p=>p.visible!==false&&p.type==='SOLID');
    if(stroke)style+=`border:${n.strokeWeight||1}px solid ${color(stroke)};`;
    if(n.type==='ELLIPSE')style+='border-radius:50%;';
    if(n.type==='INSTANCE'&&n.name==='iPhone-status-bar(lower)')content='<span style="position:absolute;left:64.2107px;top:17.7188px;width:71.1093px;height:4.2188px;border-radius:3px;background:#fff"></span>';
  }
  for(const child of children(n))content+=await render(child,caseIndex);
  return `<${tag} class="${cls}" data-figma-id="${id}" style="${style}">${content}</${tag}>`;
}

(async()=>{
  const sections=[];
  for(let i=0;i<3;i++){
    const parts=[];for(const n of selected[i])parts.push(await render(n,i,true));
    sections.push(`<section class="hyundai-reel-case" data-reel-case="${roots[i]}" aria-label="릴스 기획 및 제작 사례 ${i+1}" style="top:${num(cutoff+i*1450)}px">\n${parts.join('\n')}\n</section>`);
  }
  let html=fs.readFileSync('hyundai.html','utf8');const start=html.indexOf('    <section class="hyundai-reels"'),end=html.indexOf('  </main>',start);
  if(start<0||end<0)throw Error('Original reels section missing');
  html=html.slice(0,start)+sections.join('\n')+'\n'+html.slice(end);
  fs.writeFileSync('hyundai.html',html);
  let css=fs.readFileSync('hyundai.css','utf8').replace('height:2252px;margin:0 auto','height:5400px;margin:0 auto');
  css+='\n.hyundai-reel-case{left:0;width:1440px;height:1324px;font-family:"Gothic A1",sans-serif}\n.hyundai-fig-layer,.hyundai-reel-case>.hyundai-reel,.hyundai-fig-layer>.hyundai-reel{position:absolute;left:0;top:0;margin:0;transform-origin:0 0}\n.hyundai-fig-layer img{position:absolute;display:block;max-width:none}\n.hyundai-fig-text{white-space:pre;overflow:visible}\n.hyundai-reel-case .hyundai-reel{object-fit:cover;background:#000}\n';
  fs.writeFileSync('hyundai.css',css);console.log(stats);
})().catch(e=>{console.error(e);process.exitCode=1;});
