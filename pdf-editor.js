(()=>{
'use strict';
const PREFIX='EW_DRAW_V1:';
const E=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
const clamp=n=>Math.max(0,Math.min(1,n));
const decode=s=>{try{return typeof s==='string'&&s.startsWith(PREFIX)?JSON.parse(s.slice(PREFIX.length)):null}catch{return null}};
const draw=(ctx,items,w,h)=>{for(const o of items){ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
if(o.k==='white'){ctx.fillStyle='#fff';ctx.fillRect(Math.min(o.x,o.x2)*w,Math.min(o.y,o.y2)*h,Math.abs(o.x2-o.x)*w,Math.abs(o.y2-o.y)*h)}
else if(o.k==='text'){ctx.fillStyle=o.color;ctx.font='bold '+Math.max(12,w*.025)+'px sans-serif';ctx.fillText(o.text,o.x*w,o.y*h)}
else{ctx.strokeStyle=o.color;ctx.lineWidth=Math.max(1,w*o.width);ctx.beginPath();if(o.k==='pen'){o.pts.forEach((p,i)=>i?ctx.lineTo(p[0]*w,p[1]*h):ctx.moveTo(p[0]*w,p[1]*h))}else{ctx.moveTo(o.x*w,o.y*h);ctx.lineTo(o.x2*w,o.y2*h)}ctx.stroke()}ctx.restore()}};
const hit=(o,x,y)=>{if(o.k==='white')return x>=Math.min(o.x,o.x2)-.02&&x<=Math.max(o.x,o.x2)+.02&&y>=Math.min(o.y,o.y2)-.02&&y<=Math.max(o.y,o.y2)+.02;
if(o.k==='text')return Math.abs(o.x-x)<.2&&Math.abs(o.y-y)<.05;
if(o.k==='line'){const dx=o.x2-o.x,dy=o.y2-o.y,t=Math.max(0,Math.min(1,((x-o.x)*dx+(y-o.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-(o.x+t*dx),y-(o.y+t*dy))<.025}
return (o.pts||[]).some(p=>Math.hypot(x-p[0],y-p[1])<.025)};
async function open(opts){
const {sb,document:doc,user,docUrl}=opts;
if(!window.pdfjsLib){alert('Le lecteur PDF ne s’est pas chargé.');return}
window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const background=E('div');background.className='ew-editor-backdrop';
const panel=E('div');panel.className='ew-editor-panel';background.append(panel);
const title=E('h2','Modifier le schéma — Rév. '+doc.revision),help=E('p',"Le correcteur blanc masque visuellement le PDF d'origine, sans effacer les données. Les modifications restent internes."),toolbar=E('div'),navigation=E('div'),area=E('div'),pdfCanvas=E('canvas'),canvas=E('canvas'),footer=E('div'),message=E('p');
toolbar.className='ew-editor-toolbar';navigation.className='ew-editor-pages';area.className='ew-editor-workspace';footer.className='ew-editor-footer';message.className='ew-editor-status';pdfCanvas.className='ew-pdf-layer';canvas.className='ew-ink-layer';
area.append(pdfCanvas,canvas);panel.append(title,help,toolbar,navigation,area,footer,message);document.body.append(background);
let pdf,page=1,tool='pen',items=[],rows=[],ownedRow=null,active=null,dirty=false,busy=false;
const color=E('input');color.type='color';color.value='#d62828';
const width=E('input');width.type='range';width.min='1';width.max='10';width.value='3';
const visibility=E('select');[['shared','Partagée'],['personal','Personnelle']].forEach(a=>{const o=E('option',a[1]);o.value=a[0];visibility.append(o)});
const saveButton=E('button','Enregistrer'),closeButton=E('button','Fermer'),prev=E('button','←'),next=E('button','→'),label=E('span');
closeButton.className='secondary';footer.append(E('span','Couleur'),color,E('span','Épaisseur'),width,E('span','Visibilité'),visibility,saveButton,closeButton);navigation.append(prev,label,next);
const buttons={}; [['Crayon','pen'],['Trait','line'],['Correcteur blanc','white'],['Texte','text'],['Gomme','erase'],['Annuler','undo']].forEach(v=>{const b=E('button',v[0]);b.type='button';toolbar.append(b);buttons[v[1]]=b;b.onclick=()=>{if(v[1]==='undo'){if(items.length){items.pop();dirty=true;paint();message.textContent='Dernier tracé supprimé.'}return}tool=v[1];Object.entries(buttons).forEach(([key,btn])=>btn.classList.toggle('is-active',key===tool))}});buttons.pen.click();
const setMessage=(t,err=false)=>{message.textContent=t;message.style.color=err?'#b42318':''};
const pageRows=()=>rows.filter(r=>r.page===page&&decode(r.content));
const paint=()=>{const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);pageRows().forEach(r=>{if(!ownedRow||r.id!==ownedRow.id)draw(ctx,decode(r.content),canvas.width,canvas.height)});draw(ctx,items,canvas.width,canvas.height);if(active)draw(ctx,[active],canvas.width,canvas.height)};
const load=()=>{ownedRow=pageRows().find(r=>r.author_id===user.id&&r.visibility===visibility.value)||null;items=ownedRow?[...decode(ownedRow.content)]:[];dirty=false;paint()};
async function render(){busy=true;try{const p=await pdf.getPage(page);const v=p.getViewport({scale:1});const size=Math.min(1150,Math.max(300,innerWidth-60)),vp=p.getViewport({scale:size/v.width});pdfCanvas.width=canvas.width=Math.ceil(vp.width);pdfCanvas.height=canvas.height=Math.ceil(vp.height);area.style.width=canvas.width+'px';area.style.height=canvas.height+'px';await p.render({canvasContext:pdfCanvas.getContext('2d'),viewport:vp}).promise;label.textContent='Page '+page+' / '+pdf.numPages;load()}catch(e){setMessage(e.message,true)}finally{busy=false}}
function position(e){const b=canvas.getBoundingClientRect();return {x:clamp((e.clientX-b.left)/b.width),y:clamp((e.clientY-b.top)/b.height)}}
canvas.addEventListener('pointerdown',e=>{if(busy)return;const p=position(e);
if(tool==='erase'){const i=items.findLastIndex(o=>hit(o,p.x,p.y));if(i<0){setMessage('La gomme efface vos annotations de cette page. Utilisez le correcteur blanc pour masquer le PDF.');return}items.splice(i,1);dirty=true;paint();return}
if(tool==='text'){const text=prompt('Texte à ajouter au schéma :');if(text&&text.trim()){items.push({k:'text',x:p.x,y:p.y,text:text.slice(0,200),color:color.value});dirty=true;paint()}return}
active={k:tool,x:p.x,y:p.y,x2:p.x,y2:p.y,pts:[[p.x,p.y]],color:color.value,width:Number(width.value)/1000};canvas.setPointerCapture(e.pointerId);paint()});
canvas.addEventListener('pointermove',e=>{if(!active)return;const p=position(e);active.x2=p.x;active.y2=p.y;if(active.k==='pen')active.pts.push([p.x,p.y]);paint()});
const finish=()=>{if(!active)return;items.push(active);active=null;dirty=true;paint();setMessage('Modifications non enregistrées.')};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
saveButton.onclick=async()=>{if(!dirty){setMessage('Aucune modification à enregistrer.');return}saveButton.disabled=true;try{const content=PREFIX+JSON.stringify(items);let response;
if(ownedRow)response=await sb.from('annotations').update({content}).eq('id',ownedRow.id).eq('author_id',user.id).select().single();
else response=await sb.from('annotations').insert({document_id:doc.id,author_id:user.id,page,visibility:visibility.value,content}).select().single();
if(response.error)throw response.error;
const refreshed=await sb.from('annotations').select('*').eq('document_id',doc.id);if(refreshed.error)throw refreshed.error;rows=refreshed.data||[];load();setMessage('Modifications enregistrées sur cette révision. Invisibles au client.')}catch(e){setMessage('Échec de l’enregistrement : '+e.message,true)}finally{saveButton.disabled=false}};
const navigate=async n=>{if(dirty&&!confirm('Abandonner les modifications non enregistrées ?'))return;if(page+n<1||page+n>pdf.numPages)return;page+=n;await render()};
prev.onclick=()=>navigate(-1);next.onclick=()=>navigate(1);
visibility.onchange=()=>{if(dirty&&!confirm('Abandonner les modifications non enregistrées ?')){visibility.value=visibility.value==='shared'?'personal':'shared';return}load()};
const close=()=>{if(dirty&&!confirm('Fermer sans enregistrer ?'))return;background.remove()};closeButton.onclick=close;
try{setMessage('Chargement du schéma…');const url=await docUrl(doc);pdf=await window.pdfjsLib.getDocument(url).promise;const result=await sb.from('annotations').select('*').eq('document_id',doc.id);if(result.error)throw result.error;rows=result.data||[];await render();setMessage('Touchez le schéma pour dessiner.')}catch(e){setMessage('Erreur : '+e.message,true)}
}
window.EW_PDF_EDITOR={open};
})();