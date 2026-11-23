(()=>{
'use strict';
const PREFIX='EW_DRAW_V1:', clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const E=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e};
const decode=s=>{try{const a=typeof s==='string'&&s.startsWith(PREFIX)?JSON.parse(s.slice(PREFIX.length)):null;return Array.isArray(a)?a:null}catch{return null}};
function draw(ctx,list,w,h){for(const o of list){ctx.save();ctx.lineJoin=ctx.lineCap='round';if(o.k==='white'){ctx.fillStyle='#fff';ctx.fillRect(Math.min(o.x,o.x2)*w,Math.min(o.y,o.y2)*h,Math.abs(o.x2-o.x)*w,Math.abs(o.y2-o.y)*h)}else if(o.k==='text'){ctx.fillStyle=o.color||'#30343a';ctx.font='bold '+Math.max(10,w*(o.fontSize||.025))+'px sans-serif';ctx.textBaseline='middle';ctx.fillText(o.text||'',o.x*w,o.y*h)}else if(o.k==='symbol'){renderSym(ctx,o,w,h)}else{ctx.strokeStyle=o.color||'#333';ctx.lineWidth=Math.max(1,w*(o.width||.003));ctx.beginPath();if(o.k==='pen'){(o.pts||[]).forEach((p,i)=>i?ctx.lineTo(p[0]*w,p[1]*h):ctx.moveTo(p[0]*w,p[1]*h))}else{ctx.moveTo(o.x*w,o.y*h);ctx.lineTo(o.x2*w,o.y2*h)}ctx.stroke()}ctx.restore()}}

function renderSym(ctx,o,w,h){
const ww=(o.w||.07)*w,hh=(o.h||.09)*h;
ctx.save();ctx.translate(o.x*w,o.y*h);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.strokeStyle=o.color||'#30343a';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=Math.max(1.5,ww*.032);ctx.lineCap='round';
for(const p of (Array.isArray(o.paths)?o.paths:[])){if(!Array.isArray(p))continue;let [t,a,b,c,d]=p;ctx.beginPath();
if(t==='l'){ctx.moveTo((a-.5)*ww,(b-.5)*hh);ctx.lineTo((c-.5)*ww,(d-.5)*hh);ctx.stroke()}
if(t==='r')ctx.strokeRect((a-.5)*ww,(b-.5)*hh,c*ww,d*hh);
if(t==='c'){ctx.arc((a-.5)*ww,(b-.5)*hh,c*Math.min(ww,hh),0,Math.PI*2);ctx.stroke()}
if(t==='t'){ctx.font='bold '+Math.max(9,ww*.3)+'px sans-serif';ctx.textAlign='center';ctx.fillText(String(c||''),(a-.5)*ww,(b-.5)*hh)}
}ctx.restore()}
function translateObject(o,dx,dy){o.x=clamp(o.x+dx);o.y=clamp(o.y+dy);if(o.x2!==undefined)o.x2=clamp(o.x2+dx);if(o.y2!==undefined)o.y2=clamp(o.y2+dy);if(o.pts)o.pts=o.pts.map(p=>[clamp(p[0]+dx),clamp(p[1]+dy)])}
function hitSymbol(o,x,y){if(o.k==='symbol')return Math.abs(x-o.x)<(o.w||.07)/2+.02&&Math.abs(y-o.y)<(o.h||.09)/2+.02;
if(o.k==='text')return x>=o.x-.016&&x<=o.x+Math.max(.045,String(o.text||'').length*(o.fontSize||.018)*.6)+.016&&Math.abs(y-o.y)<.03;
return hit(o,x,y)}

function hit(o,x,y){if(o.k==='white')return x>=Math.min(o.x,o.x2)-.025&&x<=Math.max(o.x,o.x2)+.025&&y>=Math.min(o.y,o.y2)-.025&&y<=Math.max(o.y,o.y2)+.025;if(o.k==='text')return Math.abs(o.x-x)<.22&&Math.abs(o.y-y)<.045;if(o.k==='line'){const dx=o.x2-o.x,dy=o.y2-o.y,t=clamp(((x-o.x)*dx+(y-o.y)*dy)/(dx*dx+dy*dy||1));return Math.hypot(x-o.x-t*dx,y-o.y-t*dy)<.025}return(o.pts||[]).some(p=>Math.hypot(x-p[0],y-p[1])<.025)}
async function open({sb,document:doc,user,docUrl}){
if(!window.pdfjsLib){alert('Lecteur PDF indisponible.');return}
window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const backdrop=E('div',undefined,'ew-editor-backdrop'),panel=E('div',undefined,'ew-editor-panel'),top=E('header',undefined,'ew-editor-head'),heading=E('div',doc.filename+' · Rév. '+doc.revision,'ew-editor-title'),close=E('button','✕','secondary');
const navigator=E('div',undefined,'ew-editor-pages'),prev=E('button','‹','secondary'),next=E('button','›','secondary'),pageLabel=E('span','Page 1','ew-editor-page-label');
const controls=E('div',undefined,'ew-zoom-controls'),minus=E('button','−','secondary'),zoomLabel=E('span','100 %'),plus=E('button','+','secondary'),fit=E('button','Ajuster','secondary');
const viewport=E('div',undefined,'ew-editor-viewport'),stage=E('div',undefined,'ew-editor-workspace'),pdfCanvas=E('canvas',undefined,'ew-pdf-layer'),ink=E('canvas',undefined,'ew-ink-layer');
const dock=E('div',undefined,'ew-editor-dock'),tools=E('div',undefined,'ew-editor-toolbar'),options=E('div',undefined,'ew-editor-options'),info=E('div','Mode navigation : glisser pour déplacer · pincer pour zoomer','ew-editor-status'),library=E('section',undefined,'ew-symbol-library');library.hidden=true;
const color=E('input'),stroke=E('input'),visibility=E('select'),save=E('button','Enregistrer','ew-save'),buttons={};
color.type='color';color.value='#444444';stroke.type='range';stroke.min=1;stroke.max=10;stroke.value=3;
[['shared','Partagée'],['personal','Personnelle']].forEach(([v,t])=>{const o=E('option',t);o.value=v;visibility.append(o)});
const label=(s,control)=>{const e=E('label',s);e.append(control);return e};
options.append(label('Couleur ',color),label('Épaisseur ',stroke),label('Visibilité ',visibility),save);
const actions=E('div',undefined,'ew-symbol-actions'),groupBtn=E('button','Grouper','secondary'),splitBtn=E('button','Dissocier','secondary'),rotateBtn=E('button','↻ 90°','secondary'),growBtn=E('button','+ Taille','secondary'),shrinkBtn=E('button','− Taille','secondary'),deleteBtn=E('button','Supprimer','secondary');
actions.append(groupBtn,splitBtn,rotateBtn,shrinkBtn,growBtn,deleteBtn);actions.hidden=true;dock.append(actions);
navigator.append(prev,pageLabel,next);controls.append(minus,zoomLabel,plus,fit);top.append(heading,navigator,controls,close);stage.append(pdfCanvas,ink);viewport.append(stage);
panel.append(top,viewport,library,dock,info);dock.append(tools,options);backdrop.append(panel);document.body.append(backdrop);document.body.classList.add('ew-editing');
let pdf,page=1,mode='navigate',items=[],rows=[],own=null,draft=null,dirty=false,busy=false,baseW=1,baseH=1,zoom=1,tx=0,ty=0,pan=null,gesture=null,lastTap=0,inkScale=1,pdfPage=null,renderTask=null,qualityTimer=null,renderSerial=0,selectedId=null,drag=null,symbolCatalog=[];
const pointers=new Map();
const setStatus=(s,error=false)=>{info.textContent=s;info.style.color=error?'#a52b2b':''};
function selectMode(m){mode=m;if(m!=='select')selectedId=null;refreshSelection();Object.entries(buttons).forEach(([k,b])=>b.classList.toggle('is-active',k===m));options.classList.toggle('is-hidden',m==='navigate');ink.style.cursor=m==='navigate'?'grab':m==='text'?'text':'crosshair';setStatus(m==='navigate'?'Navigation : un doigt pour déplacer, deux pour zoomer.':'Outil actif : '+buttons[m]?.textContent+'. Deux doigts pour naviguer.')}
const choices=[['✋ Déplacer','navigate'],['☝ Sélection','select'],['▦ Symboles','symbols'],['✎ Crayon','pen'],['／ Trait','line'],['▭ Correcteur','white'],['T Texte','text'],['⌫ Gomme','erase'],['↶ Annuler','undo']];
for(const [name,k]of choices){const b=E('button',name);b.type='button';buttons[k]=b;tools.append(b);b.onclick=()=>{if(k==='undo'){if(items.length){items.pop();dirty=true;paint();setStatus('Dernière annotation retirée. Enregistrez.')}return}if(k==='symbols'){selectMode('select');library.hidden=false;renderCatalog();return}library.hidden=true;selectMode(k)}}
const byId=id=>items.find(o=>o.id===id);
const selected=()=>byId(selectedId);
const members=()=>{const o=selected();return !o?[]:(o.grouped&&o.groupId)?items.filter(q=>q.groupId===o.groupId&&q.grouped):[o]};
function refreshSelection(){const o=selected();actions.hidden=mode!=='select'||!o;groupBtn.disabled=!o||!o.groupId||o.grouped;splitBtn.disabled=!o||!o.groupId||!o.grouped;rotateBtn.disabled=growBtn.disabled=shrinkBtn.disabled=!o||o.k!=='symbol'}
function mutate(msg){dirty=true;paint();refreshSelection();setStatus(msg+' · Enregistrer pour conserver.')}
groupBtn.onclick=()=>{const o=selected();if(!o?.groupId)return;items.filter(q=>q.groupId===o.groupId).forEach(q=>q.grouped=true);mutate('Regroupé')};
splitBtn.onclick=()=>{const o=selected();if(!o?.groupId)return;items.filter(q=>q.groupId===o.groupId).forEach(q=>q.grouped=false);mutate('Dissocié')};
rotateBtn.onclick=()=>{const o=selected();if(!o||o.k!=='symbol')return;o.rotation=((o.rotation||0)+90)%360;mutate('Rotation effectuée')};
function scaleSelected(r){const o=selected();if(!o||o.k!=='symbol')return;o.w=clamp((o.w||.07)*r,.02,.4);o.h=clamp((o.h||.09)*r,.02,.4);mutate('Taille modifiée')}
growBtn.onclick=()=>scaleSelected(1.2);shrinkBtn.onclick=()=>scaleSelected(.83);
deleteBtn.onclick=()=>{const ids=new Set(members().map(q=>q.id));items=items.filter(q=>!ids.has(q.id));selectedId=null;mutate('Sélection supprimée')};
const libHead=E('div',undefined,'ew-symbol-head'),libTitle=E('strong','Bibliothèque de symboles'),libClose=E('button','✕','secondary'),libSearch=E('input'),libList=E('div',undefined,'ew-symbol-list'),libForm=E('div',undefined,'ew-symbol-form');
libSearch.type='search';libSearch.placeholder='Rechercher…';libHead.append(libTitle,libClose);library.append(libHead,libSearch,libList,libForm);libClose.onclick=()=>{library.hidden=true;libForm.replaceChildren()};
libSearch.oninput=()=>renderCatalog();
function renderCatalog(){libList.replaceChildren();const key=libSearch.value.trim().toLowerCase();for(const s of symbolCatalog.filter(s=>s.active!==false&&[s.name,s.category].join(' ').toLowerCase().includes(key))){
const b=E('button',undefined,'ew-symbol-choice'),canvas=E('canvas');canvas.width=50;canvas.height=50;renderSym(canvas.getContext('2d'),{x:.5,y:.5,w:.8,h:.8,paths:s.paths},50,50);
b.append(canvas,E('span',s.name+' · '+s.category));b.onclick=()=>showSymbolForm(s);libList.append(b)}
if(!libList.childNodes.length)libList.append(E('p','Aucun résultat.'))}
function showSymbolForm(s){libForm.replaceChildren();const form=E('form'),fields={};
for(const [key,caption] of [['repere','Repère (10Q1)'],['reference','Référence (A9P22602)'],['fonction','Caractéristiques (C2A)']]){const label=E('label',caption),input=E('input');input.type='text';input.maxLength=90;input.placeholder=caption;fields[key]=input;label.append(input);form.append(label)}
const submit=E('button','Insérer sur le PDF');submit.type='submit';form.append(submit);libForm.append(E('strong',s.name),form);
form.onsubmit=e=>{e.preventDefault();const groupId=crypto.randomUUID(),x=.35,y=.35,w=.072,h=.095;
const group=[{k:'symbol',id:crypto.randomUUID(),groupId,grouped:true,symbolId:s.id,name:s.name,paths:s.paths,x,y,w,h,rotation:0,color:color.value}];
let j=0;for(const key of ['repere','reference','fonction']){const val=fields[key].value.trim();if(val){group.push({k:'text',id:crypto.randomUUID(),groupId,grouped:true,field:key,x:x+w/2+.018,y:y-.025+j*.029,text:val,color:color.value,fontSize:.016});j++}}
items.push(...group);library.hidden=true;libForm.replaceChildren();selectMode('select');selectedId=group[0].id;mutate(s.name+' inséré : déplacez-le avec le doigt')}
}

selectMode('navigate');
const pageRows=()=>rows.filter(r=>r.page===page&&decode(r.content));
function paint(){const ctx=ink.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,ink.width,ink.height);ctx.setTransform(inkScale,0,0,inkScale,0,0);for(const r of pageRows())if(!own||r.id!==own.id)draw(ctx,decode(r.content),baseW,baseH);draw(ctx,items,baseW,baseH);if(mode==='select'&&selected()){const o=selected(),px=o.x*baseW,py=o.y*baseH;ctx.save();ctx.strokeStyle='#557992';ctx.setLineDash([5,4]);ctx.strokeRect(px-(o.k==='symbol'?(o.w||.07)*baseW/2:4)-5,py-(o.k==='symbol'?(o.h||.09)*baseH/2:16)-5,o.k==='symbol'?(o.w||.07)*baseW+10:Math.max(30,String(o.text||'').length*9),o.k==='symbol'?(o.h||.09)*baseH+10:25);ctx.restore()}if(draft)draw(ctx,[draft],baseW,baseH)}
function load(){own=pageRows().find(r=>r.author_id===user.id&&r.visibility===visibility.value)||null;items=own?[...decode(own.content)]:[];dirty=false;selectedId=null;paint();refreshSelection()}
function bound(){const vw=viewport.clientWidth,vh=viewport.clientHeight,ww=baseW*zoom,hh=baseH*zoom;if(ww<=vw)tx=(vw-ww)/2;else tx=clamp(tx,vw-ww-35,35);if(hh<=vh)ty=(vh-hh)/2;else ty=clamp(ty,vh-hh-35,35)}
function transform(){bound();stage.style.transform='translate3d('+tx+'px,'+ty+'px,0) scale('+zoom+')';zoomLabel.textContent=Math.round(zoom*100)+' %'}
function setZoom(z,clientX,clientY){const rect=viewport.getBoundingClientRect(),x=(clientX??(rect.left+rect.width/2))-rect.left,y=(clientY??(rect.top+rect.height/2))-rect.top;const nz=clamp(z,1,6),factor=nz/zoom;tx=x-(x-tx)*factor;ty=y-(y-ty)*factor;zoom=nz;transform();schedulePdfQuality()}
function schedulePdfQuality(){clearTimeout(qualityTimer);qualityTimer=setTimeout(()=>renderPdfAtZoom(),170)}
async function renderPdfAtZoom(){
 if(!pdfPage||!backdrop.isConnected)return;
 const serial=++renderSerial;
 if(renderTask){try{renderTask.cancel()}catch(_){}}
 const dpr=Math.min(3,Math.max(1,window.devicePixelRatio||1));
 const maxPixels=16000000;
 const ratio=Math.max(1,Math.min(7,dpr*Math.max(1,zoom),Math.sqrt(maxPixels/Math.max(1,baseW*baseH))));
 const width=Math.max(1,Math.round(baseW*ratio)),height=Math.max(1,Math.round(baseH*ratio));
 if(pdfCanvas.width!==width||pdfCanvas.height!==height){pdfCanvas.width=width;pdfCanvas.height=height}
 const v=pdfPage.getViewport({scale:width/pdfPage.getViewport({scale:1}).width});
 try{
  const task=pdfPage.render({canvasContext:pdfCanvas.getContext('2d'),viewport:v});
  renderTask=task;await task.promise;
  if(serial===renderSerial)renderTask=null;
 }catch(e){if(e?.name!=='RenderingCancelledException'&&serial===renderSerial)setStatus('Affichage PDF : '+(e.message||String(e)),true)}
}
async function renderPage(){busy=true;clearTimeout(qualityTimer);if(renderTask){try{renderTask.cancel()}catch(_){}}try{
 const p=await pdf.getPage(page),view=p.getViewport({scale:1});
 const target=Math.min(1250,Math.max(280,viewport.clientWidth-18)),v=p.getViewport({scale:target/view.width});
 pdfPage=p;baseW=Math.round(v.width);baseH=Math.round(v.height);
 inkScale=Math.min(3,Math.max(1,window.devicePixelRatio||1));
 ink.width=Math.round(baseW*inkScale);ink.height=Math.round(baseH*inkScale);
 stage.style.width=baseW+'px';stage.style.height=baseH+'px';
 pageLabel.textContent=page+' / '+pdf.numPages;
 zoom=1;tx=0;ty=0;transform();load();
 await renderPdfAtZoom();
 }catch(e){setStatus('Erreur PDF : '+e.message,true)}finally{busy=false}}
function norm(p){const b=ink.getBoundingClientRect();return{x:clamp((p.clientX-b.left)/b.width),y:clamp((p.clientY-b.top)/b.height)}}
function middle(){const a=[...pointers.values()];return{x:(a[0].clientX+a[1].clientX)/2,y:(a[0].clientY+a[1].clientY)/2}}
function distance(){const a=[...pointers.values()];return Math.hypot(a[0].clientX-a[1].clientX,a[0].clientY-a[1].clientY)}
ink.addEventListener('pointerdown',e=>{
if(busy)return;ink.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY});
if(pointers.size===2){draft=null;pan=null;drag=null;const mid=middle();gesture={distance:distance(),zoom,mid,tx,ty};paint();return}
if(pointers.size>2)return;
const p=norm(e);
if(mode==='navigate'){pan={x:e.clientX,y:e.clientY,tx,ty};return}if(mode==='select'){const o=[...items].reverse().find(q=>hitSymbol(q,p.x,p.y));selectedId=o?.id||null;drag=o?{x:p.x,y:p.y,list:members()}:null;refreshSelection();paint();return}
if(mode==='erase'){const i=items.findLastIndex(o=>hit(o,p.x,p.y));if(i>=0){items.splice(i,1);dirty=true;paint();setStatus('Annotation effacée. Enregistrer.')}else setStatus('La gomme efface vos annotations ; pour masquer le PDF, utilisez Correcteur.');return}
if(mode==='text'){const t=prompt('Texte à placer sur le schéma :');if(t?.trim()){items.push({k:'text',x:p.x,y:p.y,text:t.slice(0,250),color:color.value});dirty=true;paint()}return}
draft={k:mode,x:p.x,y:p.y,x2:p.x,y2:p.y,pts:[[p.x,p.y]],color:color.value,width:Number(stroke.value)/1000};paint()
});
ink.addEventListener('pointermove',e=>{
if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{clientX:e.clientX,clientY:e.clientY});
if(pointers.size>=2){if(!gesture)return;const mid=middle(),factor=distance()/Math.max(1,gesture.distance);const target=clamp(gesture.zoom*factor,1,6);const rect=viewport.getBoundingClientRect(),cx=gesture.mid.x-rect.left,cy=gesture.mid.y-rect.top,nx=mid.x-rect.left,ny=mid.y-rect.top;zoom=target;tx=nx-(cx-gesture.tx)*(target/gesture.zoom);ty=ny-(cy-gesture.ty)*(target/gesture.zoom);transform();return}
if(pan){tx=pan.tx+e.clientX-pan.x;ty=pan.ty+e.clientY-pan.y;transform();return}if(drag){const p=norm(e),dx=p.x-drag.x,dy=p.y-drag.y;drag.list.forEach(o=>translateObject(o,dx,dy));drag.x=p.x;drag.y=p.y;dirty=true;paint();return}
if(!draft)return;const p=norm(e);draft.x2=p.x;draft.y2=p.y;if(draft.k==='pen')draft.pts.push([p.x,p.y]);paint()
});
function finish(e){const wasPinching=!!gesture;pointers.delete(e.pointerId);if(wasPinching){draft=null;pan=null;drag=null;if(pointers.size<2){gesture=null;schedulePdfQuality()}paint();return}if(pan){pan=null;return}if(drag){drag=null;return}if(draft){const isTiny=draft.k!=='pen'&&Math.hypot(draft.x-draft.x2,draft.y-draft.y2)<.001;if(!isTiny){items.push(draft);dirty=true;setStatus('Modification non enregistrée.')}draft=null;paint()}}
ink.addEventListener('pointerup',finish);ink.addEventListener('pointercancel',finish);
ink.addEventListener('dblclick',e=>{if(mode==='navigate')setZoom(zoom<2?zoom*2:1,e.clientX,e.clientY);else if(mode==='select'){const o=selected();if(o?.k==='text'){const t=prompt('Modifier '+(o.field||'le texte')+' :',o.text||'');if(t!==null){o.text=t.slice(0,250);mutate('Texte modifié')}}}});
viewport.addEventListener('wheel',e=>{if(!e.ctrlKey&&Math.abs(e.deltaY)<5)return;e.preventDefault();setZoom(zoom*(e.deltaY<0?1.12:1/1.12),e.clientX,e.clientY)},{passive:false});
minus.onclick=()=>setZoom(zoom/1.4);plus.onclick=()=>setZoom(zoom*1.4);fit.onclick=()=>{zoom=1;tx=ty=0;transform();schedulePdfQuality()};window.addEventListener('resize',transform,{signal:(()=>{const ctl=new AbortController();backdrop._resizeCtl=ctl;return ctl.signal})()});
save.onclick=async()=>{if(!dirty){setStatus('Aucune modification à enregistrer.');return}save.disabled=true;try{const content=PREFIX+JSON.stringify(items);let r;if(own)r=await sb.from('annotations').update({content}).eq('id',own.id).eq('author_id',user.id).select().single();else r=await sb.from('annotations').insert({document_id:doc.id,author_id:user.id,page,visibility:visibility.value,content}).select().single();if(r.error)throw r.error;const q=await sb.from('annotations').select('*').eq('document_id',doc.id);if(q.error)throw q.error;rows=q.data||[];load();setStatus('Enregistré. Le PDF officiel reste inchangé.')}catch(e){setStatus('Enregistrement impossible : '+e.message,true)}finally{save.disabled=false}};
const changePage=async n=>{if(dirty&&!confirm('Modifications non enregistrées. Changer de page ?'))return;if(page+n<1||page+n>pdf.numPages)return;page+=n;await renderPage();selectMode('navigate')};prev.onclick=()=>changePage(-1);next.onclick=()=>changePage(1);
visibility.onchange=()=>{if(dirty&&!confirm('Abandonner les modifications non enregistrées ?')){visibility.value=visibility.value==='shared'?'personal':'shared';return}load()};
function end(){if(dirty&&!confirm('Fermer sans enregistrer ?'))return;clearTimeout(qualityTimer);if(renderTask){try{renderTask.cancel()}catch(_){}}backdrop._resizeCtl?.abort();backdrop.remove();document.body.classList.remove('ew-editing')}
close.onclick=end;
try{setStatus('Chargement du schéma…');pdf=await window.pdfjsLib.getDocument(await docUrl(doc)).promise;const r=await sb.from('annotations').select('*').eq('document_id',doc.id);if(r.error)throw r.error;rows=r.data||[];const catalog=await sb.from('electrical_symbols').select('id,slug,name,category,paths,active').eq('active',true).order('category').order('name');if(catalog.error)setStatus('Bibliothèque indisponible : '+catalog.error.message,true);else symbolCatalog=catalog.data||[];await renderPage();selectMode('navigate')}catch(e){setStatus('Erreur de chargement : '+e.message,true)}
}
window.EW_PDF_EDITOR={open};
})();