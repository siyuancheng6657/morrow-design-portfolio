const fs = require('fs');
const path = require('path');
const runtime = 'C:/Users/程思源/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { createCanvas, loadImage, GlobalFonts } = require(path.join(runtime, '@napi-rs/canvas'));
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'public/posters');
const sources = path.join(root, 'design/poster-sources');
GlobalFonts.registerFromPath('C:/Windows/Fonts/simsun.ttc', 'SimSun');
GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc', 'Microsoft YaHei');
GlobalFonts.registerFromPath('C:/Windows/Fonts/georgia.ttf', 'Georgia');
GlobalFonts.registerFromPath('C:/Windows/Fonts/arial.ttf', 'Arial');
const C = {paper:'#f5f2ec',forest:'#203a32',clay:'#b16647',muted:'#747c72',line:'#c4c7bb'};
const txt = (name,text,x,y,size,font='SimSun',color=C.forest,spacing=0) => ({kind:'text',name,text,x,y,size,font,color,spacing});
const rect = (name,x,y,w,h,color) => ({kind:'rect',name,x,y,w,h,color});
const line = (name,x,y,x2,y2,color=C.line,width=2) => ({kind:'line',name,x,y,x2,y2,color,width});
const photo = (x,y,w,h) => ({kind:'photo',name:'摄影主视觉 · AI 生成原图 / 独立图层',x,y,w,h,source:'autumn-still-life.png'});
const layouts = [
  {name:'autumn-a3',w:1782,h:2520,mm:[297,420],layers:[
    rect('纸色背景',0,0,1782,2520,C.paper),
    txt('品牌字标','MORROW',108,165,66,'Georgia'),
    txt('品牌中文','日常之间',508,160,33,'Microsoft YaHei'),
    txt('品牌附注','OBJECTS FOR A SLOWER LIFE',1140,155,24,'Arial'),
    line('品牌分隔线',108,221,1674,221),
    txt('活动眉题','2026 / AUTUMN LIFE FESTIVAL',112,333,29,'Arial',C.clay,2),
    txt('活动主标题','秋日生活节',100,551,196),
    txt('主张文案','让日常，慢下来。',110,683,67),
    {kind:'circle',name:'秋日圆印',x:1558,y:512,r:86,color:C.clay,width:2},
    txt('圆印文字','秋',1521,535,70,'SimSun',C.clay),
    photo(108,800,1566,1330),
    txt('图片说明','一器一物，盛放生活的温度。',110,2190,27,'Microsoft YaHei',C.muted),
    txt('策划编号','COLLECTION  /  01',1360,2190,24,'Arial',C.muted),
    rect('信息栏底色',0,2242,1782,278,C.forest),
    txt('活动时间','10.01 — 10.07',108,2385,89,'Georgia',C.paper),
    txt('活动类别','瓷器 / 家纺 / 居家好物',1070,2339,35,'Microsoft YaHei',C.paper),
    txt('活动内容','线上精选 · 线下生活提案',1070,2407,34,'Microsoft YaHei',C.paper),
    txt('活动性质','MORROW 秋日企划',113,2470,27,'Microsoft YaHei',C.paper),
    txt('概念标记','CONCEPT CAMPAIGN · 概念设计',1270,2472,19,'Microsoft YaHei','#c5cfc7'),
  ]},
  {name:'autumn-social',w:1920,h:1080,mm:null,layers:[
    rect('纸色背景',0,0,1920,1080,C.paper),
    photo(985,0,935,1080),
    txt('品牌字标','MORROW',76,123,52,'Georgia'),
    txt('品牌中文','日常之间',398,118,27,'Microsoft YaHei'),
    txt('活动眉题','秋日生活节 / AUTUMN LIFE FESTIVAL',78,261,23,'Microsoft YaHei',C.clay),
    txt('主张文案第一行','让日常，',69,430,132),
    txt('主张文案第二行','慢下来。',69,600,132),
    line('信息分隔线',78,670,870,670),
    txt('活动时间','10.01 — 10.07',78,782,67,'Georgia'),
    txt('活动类别','瓷器 / 家纺 / 居家好物',80,852,28,'Microsoft YaHei',C.muted),
    rect('探索入口底色',78,914,365,88,C.forest),
    txt('探索入口文案','探索秋日好物  →',116,968,28,'Microsoft YaHei',C.paper),
    txt('概念标记','2026 · 概念活动视觉',642,968,21,'Microsoft YaHei',C.muted),
  ]}
];
function esc(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function svgItem(o, imageData, idx){
 const title = '<title>'+esc(o.name)+'</title>';
 if(o.kind==='rect') return `<g id="layer-${idx}">${title}<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${o.color}"/></g>`;
 if(o.kind==='line') return `<g id="layer-${idx}">${title}<line x1="${o.x}" y1="${o.y}" x2="${o.x2}" y2="${o.y2}" stroke="${o.color}" stroke-width="${o.width}"/></g>`;
 if(o.kind==='circle') return `<g id="layer-${idx}">${title}<circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="none" stroke="${o.color}" stroke-width="${o.width}"/></g>`;
 if(o.kind==='photo') return `<g id="layer-${idx}">${title}<image x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,${imageData}"/></g>`;
 return `<g id="layer-${idx}">${title}<text x="${o.x}" y="${o.y}" fill="${o.color}" font-family="${o.font}" font-size="${o.size}" letter-spacing="${o.spacing}">${esc(o.text)}</text></g>`;
}
function draw(ctx,o,img){
 ctx.save();ctx.fillStyle=o.color||C.forest;ctx.strokeStyle=o.color||C.forest;
 if(o.kind==='rect') ctx.fillRect(o.x,o.y,o.w,o.h);
 if(o.kind==='line'){ctx.lineWidth=o.width;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x2,o.y2);ctx.stroke();}
 if(o.kind==='circle'){ctx.lineWidth=o.width;ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.stroke();}
 if(o.kind==='photo'){
  const scale=Math.max(o.w/img.width,o.h/img.height); const sw=o.w/scale,sh=o.h/scale;
  ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,o.x,o.y,o.w,o.h);
 }
 if(o.kind==='text'){
  ctx.font=`${o.size}px "${o.font}"`;ctx.textBaseline='alphabetic';
  if(o.spacing){let x=o.x;for(const ch of o.text){ctx.fillText(ch,x,o.y);x+=ctx.measureText(ch).width+o.spacing;}}
  else ctx.fillText(o.text,o.x,o.y);
 }
 ctx.restore();
}
function rgb(hex){return {r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)};}
async function main(){
 fs.mkdirSync(sources,{recursive:true});
 const raw=fs.readFileSync(path.join(output,'autumn-still-life.png'));
 const sharp=require(path.join(runtime,'sharp'));
 const decoded=await sharp(raw).png().toBuffer();
 const img=await loadImage(decoded);
 let psd=null;try{psd=require('ag-psd');}catch{try{psd=require('./ag-psd-bundle.cjs');}catch{}}
 if(psd)psd.initializeCanvas(createCanvas);
 for(const layout of layouts){
  const canvas=createCanvas(layout.w,layout.h),ctx=canvas.getContext('2d');
  for(const item of layout.layers)draw(ctx,item,img);
  fs.writeFileSync(path.join(output,layout.name+'.png'),canvas.toBuffer('image/png'));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${layout.w}" height="${layout.h}" viewBox="0 0 ${layout.w} ${layout.h}"><title>MORROW 日常之间 — ${layout.name}</title><desc>Editable text and independent vector groups. AI-generated photographic element is embedded. Concept campaign.</desc>${layout.layers.map((o,i)=>svgItem(o,raw.toString('base64'),i)).join('\n')}</svg>`;
  fs.writeFileSync(path.join(sources,layout.name+'.svg'),svg);
  fs.writeFileSync(path.join(sources,layout.name+'.json'),JSON.stringify(layout,null,2));
  if(psd){
   const children=layout.layers.map(o=>{
    const c=createCanvas(layout.w,layout.h);draw(c.getContext('2d'),o,img);
    const child={name:o.name,canvas:c};
    if(o.kind==='text')child.text={text:o.text,transform:[1,0,0,1,o.x,o.y],shapeType:'point',pointBase:[0,0],antiAlias:'smooth',style:{font:{name:o.font==='Microsoft YaHei'?'MicrosoftYaHei':o.font},fontSize:o.size,tracking:o.spacing*1000/o.size,fillColor:rgb(o.color)},paragraphStyle:{justification:'left'}};
    return child;
   });
   const doc={width:layout.w,height:layout.h,canvas,children,imageResources:{resolutionInfo:{horizontalResolution:152.4,horizontalResolutionUnit:'PPI',widthUnit:'Millimeters',verticalResolution:152.4,verticalResolutionUnit:'PPI',heightUnit:'Millimeters'}}};
   fs.writeFileSync(path.join(sources,layout.name+'.psd'),psd.writePsdBuffer(doc,{trimImageData:true,generateThumbnail:false}));
  }
  console.log(JSON.stringify({name:layout.name,width:layout.w,height:layout.h,layers:layout.layers.length,psd:!!psd}));
 }
}
main().catch(e=>{console.error(e);process.exit(1)});

