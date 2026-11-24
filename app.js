/* ElecWorkshop Plans — static GitHub Pages edition. No privileged key in this file. */
(()=>{'use strict';
const cfg=window.EW_CONFIG||{}, app=document.getElementById('app'), sessionBar=document.getElementById('session');
const configured=cfg.supabaseUrl&&!cfg.supabaseUrl.includes('REMPLACER')&&cfg.supabaseAnonKey&&!cfg.supabaseAnonKey.includes('REMPLACER');
const sb=configured&&window.supabase?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
let currentUser=null, profile=null, tab='home', data={clients:[],end_clients:[],affairs:[],cabinets:[],documents:[],profiles:[],notifications:[],reports:[],annotations:[],correction_requests:[]}, selectedCabinet=null, recycleBin=[], lastTouch=Date.now(), activityWasSet=false;
const $=(s,scope=document)=>scope.querySelector(s), $$=(s,scope=document)=>[...scope.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const uuid=()=>crypto.randomUUID(), short=v=>String(v||'').slice(0,8), fmt=v=>v?new Date(v).toLocaleString('fr-FR'):'—';
function alertBox(msg,bad=false){const e=document.createElement('div');e.className=bad?'error':'success';e.textContent=msg;app.prepend(e);setTimeout(()=>e.remove(),8500)}
function error(e){console.error(e);alertBox(e?.message||String(e),true)}
async function q(table){const r=await sb.from(table).select('*');if(r.error)throw r.error;return r.data||[]}
async function add(table,value){const r=await sb.from(table).insert(value).select().single();if(r.error)throw r.error;return r.data}
async function update(table,value,id){const r=await sb.from(table).update(value).eq('id',id).select().single();if(r.error)throw r.error;return r.data}
const accountRoles={referent:'Référent',cableur:'Atelier',terrain:'Chantier'};
const permissionLabels={
 folders:'Créer les clients, affaires et armoires',
 upload:'Importer des PDF en brouillon',
 annotate:'Annoter les schémas',
 send:'Envoyer les corrections et les signalements',
 review:'Traiter les demandes affectées à ce compte'
};
const accountDefaults={
 referent:['annotate','send','review'],
 cableur:['folders','upload','annotate','send'],
 terrain:['annotate','send']
};
function isManager(person=profile){return ['admin','chef'].includes(person?.role)}
function hasPermission(key,person=profile){
 if(!person?.active)return false;
 if(isManager(person))return true;
 if(person.permissions)return person.permissions.includes(key);
 if(person.role==='referent')return true;
 return accountDefaults[person.role]?.includes(key)||false;
}
function isCreator(){return hasPermission('folders')}
function canManageAccounts(){return profile?.active&&profile.role==='admin'}
function canReviewReport(report){return isManager()||(hasPermission('review')&&report.referent_id===currentUser.id)}
function main(html){app.innerHTML=html}
function ewIcon(name,size=21){const p={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h7"/>',
 pen:'<path d="m14 5 5 5M4 20l5-.8L20 8a2.2 2.2 0 0 0-4-4L5 15z"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2M18 6a3 3 0 0 1 0 6m1 3a6 6 0 0 1 3 5"/>',
 briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
 cabinet:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M9 10v3M15 10v3"/>',
 message:'<path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.8-4A8.5 8.5 0 1 1 20 11.5z"/>',
 database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',
 shield:'<path d="m12 22 8-4V6l-8-4-8 4v12z"/><path d="m9 12 2 2 4-4"/>',
 logout:'<path d="M10 17l5-5-5-5M15 12H3M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 qr:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h2v2h-2zM20 14v3h-3M14 20h3m2 0h2"/>'
};return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(p[name]||p.file)+'</svg>'}
function buttonEvents(obj){Object.keys(obj).forEach(k=>$$(`[data-action="${k}"]`).forEach(b=>b.addEventListener('click',e=>obj[k](e,b))))}
function publicUrl(c){return new URL('index.html?qr='+encodeURIComponent(c.public_token),location.href.split('?')[0]).href}
function publicPdfUrl(path){return sb.storage.from('plans-public').getPublicUrl(path).data.publicUrl}
function cabinetById(id){return data.cabinets.find(x=>x.id===id)}
function affairById(id){return data.affairs.find(x=>x.id===id)}
function cabinetName(id){return cabinetById(id)?.name||'Armoire'}
function affairName(id){return affairById(id)?.name||'Affaire'}
function makeQr(container,text,size=180){container.innerHTML='';if(!window.QRCode){container.textContent='Service QR indisponible';return}new window.QRCode(container,{text,width:size,height:size,correctLevel:window.QRCode.CorrectLevel.M})}
function downloads(name,blob){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name.replace(/[^a-z0-9._-]/gi,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function clientLogo(){return cfg.companyLogoUrl?`<img class="client-logo" src="${esc(cfg.companyLogoUrl)}" alt="Logo entreprise">`:`<h2>${esc(cfg.companyName||'Entreprise')}</h2>`}
async function publicPage(token){sessionBar.innerHTML='';if(!sb){main('<section class="card error">Configuration Supabase manquante. Voir config.js.</section>');return}
 try{const res=await sb.rpc('public_cabinet',{p_token:token});if(res.error)throw res.error;const v=res.data;if(!v){main('<section class="card">QR code inconnu.</section>');return}
 const docs=v.documents||[];main(`<section class="card client-header">${clientLogo()}<h1>Documentation de l’armoire</h1><p><b>Armoire :</b> ${esc(v.name)}<br><b>Affaire :</b> ${esc(v.affair)}</p><div id="publicDocs"></div><hr><p class="small muted">ElecWorkshop Plans</p></section><div style="text-align:center"><button data-action="login" class="secondary">Accès professionnel</button></div>`);
 $('#publicDocs').innerHTML=docs.length?docs.map(d=>`<div class="item"><a class="btn" target="_blank" rel="noopener" href="${esc(publicPdfUrl(d.path))}">Consulter ${esc(d.name)} — Rév. ${esc(d.revision)}</a></div>`).join(''):`<div class="empty"><h2>Documentation en préparation…</h2><p>La documentation de cette armoire n’est pas encore disponible à la consultation.</p><p>Nous vous invitons à réessayer ultérieurement.</p><p>Merci de votre compréhension.</p></div>`;
 buttonEvents({login:()=>{history.replaceState(null,'',location.pathname);showLogin()}})
 }catch(e){error(e)}}
function showLogin(){sessionBar.innerHTML='';if(!sb){main('<section class="card error">Connexion à la base indisponible.</section>');return}
 main(`<div class="ew-login"><section class="ew-login-card"><div class="ew-login-brand"><div class="ew-brand-symbol"><img src="./icon.svg" alt="" width="42" height="42"></div><strong>ElecWorkshop <span>Plans</span></strong></div><div class="ew-login-intro"><h1>Bienvenue</h1><p>Accès sécurisé aux schémas électriques</p></div><form id="loginForm" class="ew-login-form"><label for="ew-login-id">Identifiant</label><div class="ew-login-control">${ewIcon('user',21)}<input id="ew-login-id" type="text" name="username" required minlength="3" maxlength="40" pattern="[a-zA-Z0-9._-]+" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="Votre identifiant"></div><label for="ew-login-pass">Mot de passe</label><div class="ew-login-control">${ewIcon('shield',21)}<input id="ew-login-pass" type="password" name="password" required autocomplete="current-password" placeholder="Votre mot de passe"><button type="button" id="ew-password-toggle" class="ew-eye" aria-label="Afficher le mot de passe">Voir</button></div><button type="submit" class="ew-login-submit">Se connecter ${ewIcon('arrow',18)}</button></form><div id="loginError" class="error" hidden></div><p class="ew-login-footer">Espace professionnel privé · ElecWorkshop Plans</p></section></div>`);
 $('#ew-password-toggle').onclick=()=>{const x=$('#ew-login-pass');x.type=x.type==='password'?'text':'password'};
 $('#loginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const r=await sb.auth.signInWithPassword({email:String(f.get('username')||'').trim().toLowerCase()+'@elecworkshop.invalid',password:f.get('password')});if(r.error)throw r.error;await signedIn()}catch(ex){$('#loginError').hidden=false;$('#loginError').textContent=ex.message}}}
async function signedIn(){let s=await sb.auth.getUser();if(s.error||!s.data.user){showLogin();return}currentUser=s.data.user;
 const r=await sb.from('profiles').select('*').eq('id',currentUser.id).single();if(r.error||!r.data?.active){await sb.auth.signOut();showLogin();alertBox('Compte sans profil actif : contactez l’administrateur.',true);return}profile=r.data;lastTouch=Date.now();if(!activityWasSet){['click','keydown','touchstart','pointermove','scroll'].forEach(ev=>window.addEventListener(ev,()=>{lastTouch=Date.now()},{passive:true}));activityWasSet=true}
 await loadAll();
 const correctionId=new URL(location.href).searchParams.get('correction');
 if(correctionId)tab='notifications';
 render();
 if(correctionId)openCorrectionRequest(correctionId,true)
}
async function loadAll(){let tables=['clients','end_clients','affairs','cabinets','documents','profiles','notifications','reports','annotations','correction_requests'];const results=await Promise.all(tables.map(async t=>[t,await q(t)]));for(const [t,rows]of results)data[t]=rows;
 recycleBin=[
   ...data.profiles.filter(p=>p.trashed_at&&!p.purged_at).map(p=>({kind:'account',id:p.id,name:p.full_name,date:p.trashed_at})),
   ...data.affairs.filter(a=>a.trashed_at).map(a=>({kind:'affair',id:a.id,name:a.name,date:a.trashed_at})),
   ...data.cabinets.filter(c=>c.trashed_at).map(c=>({kind:'cabinet',id:c.id,name:c.name,date:c.trashed_at,context:data.affairs.find(a=>a.id===c.affair_id)?.name,parentDates:[data.affairs.find(a=>a.id===c.affair_id)?.trashed_at]})),
   ...data.documents.filter(d=>d.status==='trashed').map(d=>({kind:'document',id:d.id,name:d.filename,date:d.trashed_at,context:[data.cabinets.find(c=>c.id===d.cabinet_id)?.name,'Rév. '+d.revision].filter(Boolean).join(' · '),
      parentDates:[data.cabinets.find(c=>c.id===d.cabinet_id)?.trashed_at,data.affairs.find(a=>a.id===data.cabinets.find(c=>c.id===d.cabinet_id)?.affair_id)?.trashed_at]}))
 ];
 data.affairs=data.affairs.filter(a=>!a.trashed_at);
 const affairs=new Set(data.affairs.map(a=>a.id));
 data.cabinets=data.cabinets.filter(c=>!c.trashed_at&&affairs.has(c.affair_id));
 const cabinets=new Set(data.cabinets.map(c=>c.id));
 data.documents=data.documents.filter(d=>d.status!=='trashed'&&cabinets.has(d.cabinet_id));
 const documents=new Set(data.documents.map(d=>d.id));
 data.annotations=data.annotations.filter(n=>documents.has(n.document_id));
 data.reports=data.reports.filter(r=>cabinets.has(r.cabinet_id)&&(!r.document_id||documents.has(r.document_id)));
}
async function refresh(){await loadAll();render()}
function render(){if(!currentUser)return showLogin();sessionBar.innerHTML='';
 const nav=[['home','home','Accueil'],['folders','folder','Dossiers'],['documents','file','Documents'],['annotations','pen','Annotations'],['account','user','Compte']];
 const extra=[['reports','message','Signalements'],['notifications','bell','Notifications'],['backup','database','Sauvegardes'],...(canManageAccounts()?[['accounts','users','Utilisateurs']]:[])];
 const tabs=[...nav,...extra],selected=tabs.find(x=>x[0]===tab)||nav[0],notifCount=data.notifications.filter(n=>n.recipient_id===currentUser.id&&!n.is_read).length;
 main(`<div class="ew-app"><aside class="ew-sidebar"><div class="ew-logo"><img src="./icon.svg" alt="" class="ew-app-logo" width="34" height="34"><span><strong>ElecWorkshop</strong><small>Plans</small></span></div><span class="ew-menu-caption">ESPACE DE TRAVAIL</span><nav class="ew-side-nav">${tabs.map(t=>`<button class="${tab===t[0]?'active':''}" data-tab="${t[0]}">${ewIcon(t[1],20)} <span>${t[2]}</span></button>`).join('')}</nav><div class="ew-side-user">${ewIcon('user',20)} <span>${esc(profile.full_name)}<small>${esc(profile.role)}</small></span></div></aside><div class="ew-app-main"><div class="ew-header"><div class="ew-header-brand"><img src="./icon.svg" alt="" class="ew-app-logo" width="34" height="34"><span><strong>ElecWorkshop</strong> Plans</span></div><div class="ew-header-actions"><button class="ew-icon-button" id="ew-notifs" aria-label="Notifications">${ewIcon('bell',23)}${notifCount?'<span class="ew-notif-dot"></span>':''}</button><button class="ew-icon-button" id="ew-account" aria-label="Compte">${ewIcon('user',23)}</button></div></div><main class="ew-content" id="view"></main></div><nav class="ew-bottom-nav" aria-label="Navigation principale">${nav.map(t=>`<button class="${tab===t[0]?'active':''}" data-tab="${t[0]}">${ewIcon(t[1],22)}<span>${t[2]}</span></button>`).join('')}</nav></div>`);
 $$('[data-tab]').forEach(el=>el.onclick=()=>{tab=el.dataset.tab;render()});
 $('#ew-notifs').onclick=async()=>{tab='notifications';render();await refreshNotificationList()};$('#ew-account').onclick=()=>{tab='account';render()};
 const pages={home:renderHome,folders:renderFolders,documents:renderDocuments,annotations:renderAnnotations,account:renderAccount,reports:renderReports,notifications:renderNotifications,backup:renderBackup,accounts:renderAccounts,trash:renderRecycleBin};
 (pages[tab]||renderHome)();}
function renderHome(){const v=$('#view');
 const last=data.cabinets.slice().reverse().slice(0,4);
 const stat=(kind,label,value)=>`<div class="ew-stat" data-open="${kind}"><span class="ew-stat-icon">${ewIcon(kind==='clients'?'users':kind==='affairs'?'briefcase':kind==='cabinets'?'cabinet':'file',25)}</span><span class="ew-stat-label">${label}</span><strong>${value}</strong>${ewIcon('chevron',17)}</div>`;
 v.innerHTML=`<section class="ew-hero"><div class="ew-hero-top"><h1>Bonjour ${esc(profile.full_name==='Administrateur'?'Alexandre':profile.full_name)}</h1><span class="ew-admin-pill">${ewIcon('shield',15)} ${esc(profile.role)}</span></div><p>Vos schémas électriques, toujours à portée de main.</p><div class="ew-hero-art" aria-hidden="true">${ewIcon('cabinet',114)}</div></section>
 <div class="ew-stats">${stat('clients','Clients',data.clients.length)}${stat('affairs','Affaires',data.affairs.length)}${stat('cabinets','Armoires',data.cabinets.length)}${stat('documents','Documents',data.documents.length)}</div>
 <div class="ew-search">${ewIcon('search',22)}<input id="ew-global-search" autocomplete="off" placeholder="Rechercher un client, une affaire, une armoire…" aria-label="Rechercher les dossiers"></div>
 <section class="ew-section"><div class="ew-section-header"><h2>Dernières armoires consultables</h2><button data-action="folders">Voir tout ${ewIcon('chevron',18)}</button></div><div class="ew-list">${last.map(c=>{const a=affairById(c.affair_id),cl=data.clients.find(x=>x.id===a?.client_id),pub=data.documents.find(d=>d.cabinet_id===c.id&&d.status==='published');return `<button class="ew-recent" data-cabinet="${c.id}"><span class="ew-recent-icon">${ewIcon('cabinet',28)}</span><span class="ew-recent-main"><small>${esc(cl?.name||'Client')} · ${esc(a?.year||'')}</small><strong>${esc(a?.name||'Affaire')}</strong><span>${esc(c.name)}</span></span><span class="ew-recent-right"><em class="ew-status ${pub?'is-live':''}">${pub?'PDF publié':'En préparation'}</em>${ewIcon('chevron',19)}</span></button>`}).join('')||'<p class="ew-empty">Aucune armoire. Vous pouvez créer votre première affaire.</p>'}</div></section>
 ${isCreator()?`<button class="ew-fab" data-action="create" aria-label="Créer une affaire">${ewIcon('plus',24)}</button>`:''}`;
 buttonEvents({create:openCreateAffair,folders:()=>{tab='folders';render()}});
 $$('[data-cabinet]').forEach(b=>b.onclick=()=>{selectedCabinet=b.dataset.cabinet;renderCabinet()});
 $$('[data-open]').forEach(b=>b.onclick=()=>{tab=b.dataset.open==='clients'||b.dataset.open==='affairs'||b.dataset.open==='cabinets'?'folders':'documents';render()});
 $('#ew-global-search').addEventListener('keydown',e=>{if(e.key==='Enter'){const term=e.target.value.trim();tab='folders';render();const field=$('#filterCabinet');if(field){field.value=term;field.dispatchEvent(new Event('input'))}}});
}
function renderFolders(){const v=$('#view');v.innerHTML=`<div class="ew-screen-title"><div><small>DOSSIERS</small><h1>Mes dossiers</h1><p>Clients, affaires et armoires.</p></div>${isCreator()?'<button data-action="create">+ Nouvelle affaire</button>':''}</div><div class="ew-search">${ewIcon('search',22)}<input id="filterCabinet" placeholder="Rechercher dans les dossiers…" aria-label="Rechercher"></div><div id="foldersList" class="ew-list"></div><div id="emptyAffairs"></div>`;
 const draw=()=>{const t=$('#filterCabinet').value.toLowerCase();$('#foldersList').innerHTML=data.cabinets.filter(c=>{const a=affairById(c.affair_id),cl=data.clients.find(x=>x.id===a?.client_id);return !t||[c.name,a?.name,cl?.name,a?.year].some(s=>String(s||'').toLowerCase().includes(t))}).map(c=>{const a=affairById(c.affair_id),cl=data.clients.find(x=>x.id===a?.client_id),ec=data.end_clients.find(x=>x.id===a?.end_client_id);return `<button class="ew-recent" data-cabinet="${c.id}"><span class="ew-recent-icon">${ewIcon('cabinet',27)}</span><span class="ew-recent-main"><small>${esc(cl?.name||'Client')} ${ec?'› '+esc(ec.name):''} · ${esc(a?.year)}</small><strong>${esc(a?.name||'Affaire')}</strong><span>${esc(c.name)}</span></span>${ewIcon('chevron',20)}</button>`}).join('')||'<p class="ew-empty">Aucune armoire trouvée.</p>';$$('[data-cabinet]').forEach(b=>b.onclick=()=>{selectedCabinet=b.dataset.cabinet;renderCabinet()})};$('#filterCabinet').oninput=draw;draw();buttonEvents({create:openCreateAffair});
 if(isManager()){
  const empty=data.affairs.filter(a=>!data.cabinets.some(c=>c.affair_id===a.id));
  const list=$('#emptyAffairs',v);
  if(empty.length){
   list.innerHTML=`<section class="card"><h2>Affaires sans armoire</h2>${empty.map(a=>`<div class="item"><b>${esc(a.name)} · ${esc(a.year)}</b><div class="toolbar"><button class="secondary" data-empty-affair="${esc(a.id)}">Supprimer l’affaire</button></div></div>`).join('')}</section>`;
   $$('[data-empty-affair]',list).forEach(b=>b.onclick=()=>{const a=empty.find(x=>x.id===b.dataset.emptyAffair);if(a)changeTrash('affair',a.id,a.name,true)});
  }
 }
}
function modal(html){const bg=document.createElement('div');bg.className='modal-bg';bg.innerHTML=`<div class="modal"><div class="row between"><b>ElecWorkshop Plans</b><button class="secondary" data-close>Fermer</button></div>${html}</div>`;document.body.appendChild(bg);bg.querySelector('[data-close]').onclick=()=>bg.remove();bg.addEventListener('click',e=>{if(e.target===bg)bg.remove()});return bg}
function openCreateAffair(){if(!isCreator())return;let stage=0,model={client:'',end:'',year:String(new Date().getFullYear()),affair:'',referent:'',cabinets:['']};const m=modal('<div id="wizard"></div>');const w=$('#wizard',m);
 const stages=['Client','Client du client (facultatif)','Année','Affaire et référent','Armoires / coffrets','Confirmation'];
 const renderStep=()=>{w.innerHTML=`<h2>${stage+1}/6 — ${stages[stage]}</h2><div id="stepContent"></div><div class="toolbar" style="margin-top:16px"><button class="secondary" id="prev" ${stage===0?'disabled':''}>Retour</button><button id="next">${stage===5?'Créer les armoires':'Suivant'}</button></div>`;const content=$('#stepContent',w),opt=(arr,selected)=>arr.map(x=>`<option value="${esc(x.id)}" ${selected===x.id?'selected':''}>${esc(x.name)}</option>`).join('');
 if(stage===0)content.innerHTML=`<label>Choisir un client existant ou saisir un nouveau nom</label><select id="existingClient"><option value="">Nouveau client</option>${opt(data.clients,model.client)}</select><input id="newClient" placeholder="Nom du client" value="${esc(data.clients.some(c=>c.id===model.client)?'':model.client)}">`;
 if(stage===1)content.innerHTML=`<p class="muted">Pour les affaires en direct, laissez vide.</p><label>Client du client (optionnel)</label><input id="endClient" value="${esc(model.end)}" placeholder="Ex. : LFB">`;
 if(stage===2)content.innerHTML=`<label>Année</label><input id="year" type="number" min="2000" max="2100" value="${esc(model.year)}">`;
 if(stage===3)content.innerHTML=`<label>Nom de l'affaire (souvent le nom du client)</label><input id="affair" value="${esc(model.affair)}" placeholder="Nom de l'affaire"><label>Référent / bureau d'études</label><select id="ref"><option value="">À attribuer plus tard</option>${opt(data.profiles.filter(p=>hasPermission('review',p)&&!isManager(p)).map(p=>({...p,name:p.full_name})),model.referent)}</select>`;
 if(stage===4){content.innerHTML=`<p class="muted">Une case par défaut. Ajoutez autant d'armoires ou coffrets que nécessaire.</p><div id="cabinetFields"></div><button class="secondary" id="plus">+ Ajouter une armoire / un coffret</button>`;const draw=()=>{$('#cabinetFields',w).innerHTML=model.cabinets.map((n,i)=>`<div class="row field"><input data-cabname="${i}" style="flex:1;min-width:180px" placeholder="TGBT, TD1, Coffret régulation…" value="${esc(n)}"><button data-remove="${i}" class="danger" ${model.cabinets.length===1?'disabled':''}>×</button></div>`).join('');$$('[data-cabname]',w).forEach(el=>el.oninput=()=>model.cabinets[+el.dataset.cabname]=el.value);$$('[data-remove]',w).forEach(el=>el.onclick=()=>{model.cabinets.splice(+el.dataset.remove,1);draw()})};draw();$('#plus',w).onclick=()=>{model.cabinets.push('');draw()}}
 if(stage===5)content.innerHTML=`<p><b>Client :</b> ${esc(data.clients.find(c=>c.id===model.client)?.name||model.client)}</p><p><b>Client final :</b> ${esc(model.end||'Aucun')}</p><p><b>Année :</b> ${esc(model.year)}</p><p><b>Affaire :</b> ${esc(model.affair)}</p><p><b>Armoires :</b> ${model.cabinets.map(esc).join(' · ')}</p><p class="success">Un QR code sera généré pour chaque armoire même sans PDF.</p>`;
 $('#prev',w).onclick=()=>{readStep();stage=Math.max(0,stage-1);renderStep()};$('#next',w).onclick=async()=>{readStep();if(stage===0&&!model.client.trim())return alert('Indiquez un client.');if(stage===3&&!model.affair.trim())return alert('Indiquez une affaire.');if(stage===4){const names=model.cabinets.map(s=>s.trim());if(names.some(n=>!n)||new Set(names.map(s=>s.toLowerCase())).size!==names.length)return alert('Indiquez des noms différents pour chaque armoire.')}if(stage===5){try{$('#next',w).disabled=true;let client=data.clients.find(c=>c.id===model.client);if(!client)client=await add('clients',{name:model.client.trim()});let end=null;if(model.end.trim()){end=data.end_clients.find(x=>x.client_id===client.id&&x.name.toLowerCase()===model.end.toLowerCase());if(!end)end=await add('end_clients',{client_id:client.id,name:model.end.trim()})}const a=await add('affairs',{client_id:client.id,end_client_id:end?.id||null,year:+model.year,name:model.affair.trim(),referent_id:model.referent||null});for(const n of model.cabinets)await add('cabinets',{affair_id:a.id,name:n.trim()});m.remove();await refresh();alertBox('Affaire et QR codes créés !')}catch(e){error(e);$('#next',w).disabled=false}return}stage++;renderStep()};
 function readStep(){if(stage===0)model.client=$('#existingClient',w).value||$('#newClient',w).value.trim();if(stage===1)model.end=$('#endClient',w).value.trim();if(stage===2)model.year=$('#year',w).value;if(stage===3){model.affair=$('#affair',w).value.trim();model.referent=$('#ref',w).value}}
 if(stage===0){$('#existingClient',w).onchange=()=>{$('#newClient',w).disabled=!!$('#existingClient',w).value};$('#newClient',w).disabled=!!$('#existingClient',w).value}}
 renderStep()}
function renderCabinet(){tab='folders';render();const c=cabinetById(selectedCabinet);if(!c)return;const a=affairById(c.affair_id),cl=data.clients.find(x=>x.id===a?.client_id),docs=data.documents.filter(x=>x.cabinet_id===c.id),container=$('#view');
 const nameOfStatus=s=>({published:'publié',archived:'archivé',draft:'brouillon',trashed:'corbeille'}[s]||s);
 container.innerHTML=`<div class="ew-breadcrumb"><button id="back">${ewIcon('home',17)}</button><span>${esc(cl?.name||'Client')}</span>${ewIcon('chevron',14)}<span>${esc(a?.year||'')}</span>${ewIcon('chevron',14)}<span>${esc(a?.name||'Affaire')}</span>${ewIcon('chevron',14)}<strong>${esc(c.name)}</strong></div>
 <div class="ew-cab-identity"><span class="ew-cab-avatar">${ewIcon('cabinet',44)}</span><span><h1>${esc(c.name)}</h1><p>Armoire électrique</p><small>Projet : ${esc(a?.name)} · Année : ${esc(a?.year)} · Client : ${esc(cl?.name)}</small><p>Référent · ${esc(data.profiles.find(p=>p.id===a?.referent_id&&p.active)?.full_name||'À affecter')}</p>${a&&isManager()?'<div class="toolbar"><button class="secondary" id="assignReferent">Affecter le référent</button><button class="secondary" id="cabinetOptions">Options</button></div>':''}</span></div>
 <section class="ew-qr-group"><div class="ew-qr-box"><h2>QR code armoire</h2><div class="ew-qr-box-inner"><div class="qrwrap" id="qr"></div><p>Identifie l'armoire et donne accès à la documentation publiée.</p></div><a id="publicLink" class="ew-subtle-link" target="_blank" rel="noopener">Voir la page client ${ewIcon('arrow',16)}</a></div><div class="ew-label-box"><button id="wmf">${ewIcon('download',27)}<strong>Exporter l'étiquette WMF</strong></button><div class="ew-label-secondary"><button class="secondary" id="svg">QR SVG</button><button class="secondary" id="png">PNG</button></div></div></section>
 <section class="ew-section ew-doc-section"><div class="ew-section-header"><h2>${ewIcon('file',22)} Documents</h2>${hasPermission('upload')?'<button id="upload">+ Ajouter un document</button>':''}</div><div class="ew-doc-list" id="cDocs"></div></section>
 <section class="ew-more"><button id="seeAnnotations">${ewIcon('pen',21)}<span>Annotations</span><small>${data.annotations.filter(n=>docs.some(d=>d.id===n.document_id)).length}</small>${ewIcon('chevron',18)}</button><button id="seeReports">${ewIcon('message',21)}<span>Signalements</span><small>${data.reports.filter(r=>r.cabinet_id===c.id).length}</small>${ewIcon('chevron',18)}</button></section><div class="ew-qr-extra"><div id="labelQr"></div></div>`;
 makeQr($('#qr'),publicUrl(c),154);makeQr($('#labelQr'),publicUrl(c),112);$('#publicLink').href=publicUrl(c);
 $('#back').onclick=renderFolders;$('#svg').onclick=()=>exportSvgQr(c);$('#wmf').onclick=()=>exportWmf(c);$('#png').onclick=()=>exportPng(c);
 if($('#upload'))$('#upload').onclick=()=>openUpload(c);
 if($('#assignReferent'))$('#assignReferent').onclick=()=>assignReferent(a);
 if($('#cabinetOptions'))$('#cabinetOptions').onclick=()=>{
  const m=modal(`<h2>Options du dossier</h2><div class="toolbar"><button class="secondary" id="trashCabinet">Supprimer l’armoire</button><button class="secondary" id="trashAffair">Supprimer l’affaire</button></div>`);
  $('#trashCabinet',m).onclick=()=>changeTrash('cabinet',c.id,c.name,true,()=>m.remove());
  $('#trashAffair',m).onclick=()=>changeTrash('affair',a.id,a.name,true,()=>m.remove());
 };
 $('#seeAnnotations').onclick=()=>{tab='annotations';render()};$('#seeReports').onclick=()=>{tab='reports';render()};
 $('#cDocs').innerHTML=docs.map(d=>`<div class="ew-document"><span class="ew-pdf-logo">${ewIcon('file',31)}<small>PDF</small></span><div class="ew-doc-content"><strong>${esc(d.filename)}</strong><div class="ew-doc-sub">Rév. ${esc(String(d.revision||'').toUpperCase())} · ${fmt(d.created_at)}</div><span class="ew-status ${d.status==='published'?'is-live':''}">${nameOfStatus(d.status)}</span><div class="ew-doc-buttons"><button class="secondary" data-openpdf="${d.id}">Consulter</button>${isManager()&&d.status==='draft'?`<button data-publish="${d.id}">Publier</button>`:''}${isManager()?`<button class="secondary" data-trash="${d.id}">Supprimer</button>`:''}</div></div></div>`).join('')||'<p class="ew-empty">Aucun PDF pour le moment. Le QR code fonctionne déjà.</p>';
 $$('[data-openpdf]').forEach(b=>b.onclick=()=>openDocument(b.dataset.openpdf));$$('[data-publish]').forEach(b=>b.onclick=()=>publishDocument(b.dataset.publish));$$('[data-trash]').forEach(b=>b.onclick=()=>{const doc=docs.find(d=>d.id===b.dataset.trash);if(doc)changeTrash('document',doc.id,doc.filename,true,renderCabinet)})}
function assignReferent(affair){
 const choices=data.profiles.filter(p=>p.active&&p.role==='referent');
 if(!choices.length){alertBox('Aucun compte référent actif. Créez le compte du référent avant de l’affecter.',true);return}
 const m=modal(`<h2>Référent de l’affaire</h2><p>${esc(affair.name)}</p><form><label for="referentChoice">Référent</label><select id="referentChoice" required><option value="">Choisir un référent</option>${choices.map(p=>`<option value="${esc(p.id)}" ${p.id===affair.referent_id?'selected':''}>${esc(p.full_name)}</option>`).join('')}</select><button>Enregistrer</button></form>`);
 $('form',m).onsubmit=async e=>{
  e.preventDefault();const button=$('form button',m);button.disabled=true;
  try{await update('affairs',{referent_id:$('#referentChoice',m).value},affair.id);await refresh();m.remove();renderCabinet()}catch(err){error(err)}finally{button.disabled=false}
 }
}
function openAddCabinet(a){const m=modal(`<h2>Ajouter une armoire à ${esc(a.name)}</h2><label>Nom de l'armoire ou du coffret</label><input id="extraName" placeholder="Ex. : TD3"><button id="saveExtra">Créer et générer le QR code</button>`);$('#saveExtra',m).onclick=async()=>{try{const n=$('#extraName',m).value.trim();if(!n)throw Error('Nom obligatoire');await add('cabinets',{affair_id:a.id,name:n});m.remove();await refresh();alertBox('Armoire et QR créés')}catch(e){error(e)}}}
function renderDocuments(){const v=$('#view');v.innerHTML=`<div class="ew-screen-title"><div><small>DOCUMENTS</small><h1>Bibliothèque des schémas</h1><p>${data.documents.length} PDF enregistrés</p></div></div><div class="ew-doc-list">${data.documents.map(d=>`<div class="ew-document"><span class="ew-pdf-logo">${ewIcon('file',28)}<small>PDF</small></span><div class="ew-doc-content"><strong>${esc(d.filename)}</strong><div class="ew-doc-sub">${esc(cabinetName(d.cabinet_id))} · Rév. ${esc(String(d.revision||'').toUpperCase())}</div><span class="ew-status ${d.status==='published'?'is-live':''}">${esc(d.status)}</span><div class="ew-doc-buttons"><button class="secondary" data-openpdf="${d.id}">Consulter</button></div></div></div>`).join('')||'<p class="ew-empty">Aucun document disponible.</p>'}</div>`;$$('[data-openpdf]').forEach(b=>b.onclick=()=>openDocument(b.dataset.openpdf))}
function isDrawing(annotation){return String(annotation?.content||'').startsWith('EW_DRAW_V1:')}
function openCorrections(id,page){const d=data.documents.find(x=>x.id===id);if(d)window.EW_PDF_EDITOR?.open({sb,document:d,user:currentUser,docUrl,initialPage:page,readOnly:true})}
function renderAnnotations(){const v=$('#view');const rows=data.annotations.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));v.innerHTML=`<div class="ew-screen-title"><div><small>NOTES ET CORRECTIONS</small><h1>Annotations</h1><p>Commentaires et modifications liés aux révisions des schémas.</p></div></div><div class="ew-list">${rows.map(n=>{const d=data.documents.find(x=>x.id===n.document_id);return `<button class="ew-recent" data-openpdf="${n.document_id}" data-correction-page="${isDrawing(n)?esc(n.page||1):''}"><span class="ew-recent-icon">${ewIcon('pen',23)}</span><span class="ew-recent-main"><small>${esc(cabinetName(d?.cabinet_id))} · Page ${esc(n.page||1)}</small><strong>${esc(d?.filename||'Document')}</strong><span>${isDrawing(n)?'Correction graphique':'Commentaire : '+esc(String(n.content||'').slice(0,80))}</span></span>${ewIcon('chevron',19)}</button>`}).join('')||'<p class="ew-empty">Aucune annotation pour le moment.</p>'}</div>`;$$('[data-openpdf]').forEach(b=>b.onclick=()=>b.dataset.correctionPage?openCorrections(b.dataset.openpdf,b.dataset.correctionPage):openDocument(b.dataset.openpdf))}
function renderAccount(){const v=$('#view');v.innerHTML=`<div class="ew-screen-title"><div><small>ESPACE PERSONNEL</small><h1>Mon compte</h1><p>Vos accès et les outils de gestion.</p></div></div><section class="ew-account-card"><span class="ew-avatar">${ewIcon('user',29)}</span><span><strong>${esc(profile.full_name)}</strong><small>${esc(profile.role)}</small></span></section><div class="ew-list ew-account-list">${canManageAccounts()?`<button data-go="accounts">${ewIcon('users',21)} Utilisateurs ${ewIcon('chevron',19)}</button>`:''}${isManager()?`<button data-go="trash">${ewIcon('folder',21)} Corbeille ${ewIcon('chevron',19)}</button>`:''}<button data-go="notifications">${ewIcon('bell',21)} Notifications ${ewIcon('chevron',19)}</button><button data-go="reports">${ewIcon('message',21)} Signalements ${ewIcon('chevron',19)}</button><button data-go="backup">${ewIcon('database',21)} Sauvegardes ${ewIcon('chevron',19)}</button><button id="logoutApp">${ewIcon('logout',21)} Se déconnecter ${ewIcon('chevron',19)}</button></div>`;$$('[data-go]').forEach(b=>b.onclick=()=>{tab=b.dataset.go;render()});$('#logoutApp').onclick=async()=>{await sb.auth.signOut();currentUser=null;profile=null;showLogin()}}

function renderAccounts(){
 const view=$('#view');
 if(!canManageAccounts()){view.textContent='Gestion des comptes réservée à l’administrateur.';return}
 const people=data.profiles.filter(p=>Object.hasOwn(accountRoles,p.role)&&!p.trashed_at)
   .sort((a,b)=>a.full_name.localeCompare(b.full_name,'fr'));
 view.innerHTML=`<div class="ew-screen-title"><div><h1>Utilisateurs</h1></div><button id="createAccount">Créer un compte</button></div>
 <div class="ew-list">${people.map(person=>`<button class="ew-recent" data-account-id="${esc(person.id)}">
 <span class="ew-recent-main"><strong>${esc(person.full_name)}</strong>
 <span>${esc(accountRoles[person.role])}${person.username?' · '+esc(person.username):''}${person.active?'':' · Désactivé'}</span></span>${ewIcon('chevron',19)}</button>`).join('')||'<p class="ew-empty">Aucun compte Référent, Atelier ou Chantier.</p>'}</div>`;
 $('#createAccount',view).onclick=()=>openAccountForm();
 $$('[data-account-id]',view).forEach(b=>b.onclick=()=>openAccountForm(people.find(p=>p.id===b.dataset.accountId)));
}
function openAccountForm(person){
 if(!canManageAccounts())return;
 const role=person?.role||'cableur';
 const m=modal(`<h2>${person?'Modifier le compte':'Créer un compte'}</h2>
 <form id="ew-account-form">
 <label for="accountName">Nom de la personne</label><input id="accountName" name="full_name" required maxlength="100" value="${esc(person?.full_name||'')}" autocomplete="off">
 ${person?'':`<label for="accountUsername">Identifiant de connexion</label>
 <input id="accountUsername" name="username" required minlength="3" maxlength="40" pattern="[a-zA-Z0-9._-]+" placeholder="prenom.nom" autocapitalize="none" spellcheck="false" autocomplete="off">
 <label for="accountPassword">Mot de passe initial</label><input id="accountPassword" name="password" type="password" required minlength="10" maxlength="72" autocomplete="new-password">`}
 <label for="accountRole">Profil</label><select id="accountRole" name="role">${Object.entries(accountRoles).map(([value,label])=>`<option value="${value}" ${role===value?'selected':''}>${label}</option>`).join('')}</select>
 <fieldset><legend>Droits individuels</legend>${Object.entries(permissionLabels).map(([value,label])=>`<label class="row"><input type="checkbox" name="permissions" value="${value}"> ${label}</label>`).join('')}</fieldset>
 ${person?`<label class="row"><input type="checkbox" name="active" ${person.active?'checked':''}> Compte actif</label>`:''}
 <button type="submit">${person?'Enregistrer les droits':'Créer le compte'}</button> ${person?'<button type="button" class="secondary" id="trashAccount">Supprimer le compte</button>':''}<p class="error" data-account-error hidden role="alert"></p></form>`);
 const form=$('#ew-account-form',m),roles=$('#accountRole',form),checks=$$('[name="permissions"]',form);
 const setRights=rights=>checks.forEach(input=>{input.checked=rights.includes(input.value)});
 setRights(person?Object.keys(permissionLabels).filter(key=>hasPermission(key,{...person,active:true})):accountDefaults[role]);
 roles.onchange=()=>setRights(accountDefaults[roles.value]);
 if(person)$('#trashAccount',m).onclick=()=>changeTrash('account',person.id,person.full_name,true,()=>m.remove());
 form.onsubmit=async e=>{
  e.preventDefault();const payload=new FormData(form),button=$('button[type=submit]',form),message=$('[data-account-error]',form);
  button.disabled=true;message.hidden=true;
  try{
   const body={action:person?'update':'create',full_name:payload.get('full_name'),role:roles.value,permissions:payload.getAll('permissions')};
   if(person)Object.assign(body,{id:person.id,active:payload.has('active')});
   else Object.assign(body,{username:payload.get('username'),password:payload.get('password')});
   const result=await sb.functions.invoke('manage-accounts',{body});
   if(result.error){
    const info=await result.error.context?.json?.().catch(()=>null);
    throw Error(info?.error||'Service de comptes indisponible. Réessayez.');
   }
   m.remove();
   try{data.profiles=await q('profiles');renderAccounts()}catch(err){error(err)}
   alertBox(person?'Compte mis à jour.':'Compte créé.');
  }catch(err){message.textContent=err.message;message.hidden=false}finally{button.disabled=false}
 }
}

function openUpload(c){if(!hasPermission('upload'))return;const m=modal(`<h2>Importer un PDF — ${esc(c.name)}</h2><p class="warning">Le document sera un brouillon, invisible des clients jusqu'à publication.</p><form id="uploadForm"><label>Fichier PDF (max 50 Mo)</label><input type="file" accept="application/pdf,.pdf" id="file" required><label>Révision</label><input id="rev" value="A" required><button id="sendFile">Importer</button></form>`);$('#uploadForm',m).onsubmit=async e=>{e.preventDefault();const file=$('#file',m).files[0];if(!file||file.type!=='application/pdf'||file.size>52428800)return alert('Choisissez un fichier PDF de 50 Mo maximum.');try{$('#sendFile',m).disabled=true;const path=`${c.id}/${uuid()}.pdf`;const up=await sb.storage.from('plans-drafts').upload(path,file,{contentType:'application/pdf'});if(up.error)throw up.error;await add('documents',{cabinet_id:c.id,revision:$('#rev',m).value.trim(),filename:file.name,storage_path:path,uploader_id:currentUser.id,status:'draft'});m.remove();await refresh();selectedCabinet=c.id;renderCabinet();alertBox('PDF brouillon importé. Publication requise.')}catch(e){error(e);$('#sendFile',m).disabled=false}}}
async function docUrl(d){if(d.status==='published'||d.status==='archived')return publicPdfUrl(d.storage_path);const r=await sb.storage.from('plans-drafts').createSignedUrl(d.storage_path,3600);if(r.error)throw r.error;return r.data.signedUrl}
async function openDocument(id){const d=data.documents.find(x=>x.id===id);if(!d)return;try{const url=await docUrl(d),m=modal(`<h2>${esc(d.filename)} — Rév. ${esc(d.revision)}</h2><p class="muted">${esc(cabinetName(d.cabinet_id))} · ${esc(d.status)}</p><iframe class="preview" title="Document PDF" src="${esc(url)}"></iframe><div class="toolbar"><a class="btn secondary" href="${esc(url)}" target="_blank" rel="noopener">Ouvrir / télécharger PDF</a><button id="editDrawing">${hasPermission('annotate')?'✎ Modifier le schéma':'Voir le schéma'}</button>${hasPermission('send')?'<button id="sendCorrections" class="secondary">Envoyer au référent</button>':''}${hasPermission('annotate')?'<button id="newAnnotation">+ Annotation</button>':''}${hasPermission('send')?'<button id="newReport">+ Signalement</button>':''}<button id="exportNotes" class="secondary">Exporter avec commentaires</button>${isManager()?'<button id="trashOpenDocument" class="secondary">Supprimer le schéma</button>':''}</div><div id="notesArea"></div>`);
 $('#editDrawing',m).onclick=()=>window.EW_PDF_EDITOR?.open({sb,document:d,user:currentUser,docUrl,readOnly:!hasPermission('annotate'),onClose:()=>drawNotes(d,m),onSubmitCorrections:hasPermission('send')?()=>submitCorrectionRequest(d):undefined});if($('#sendCorrections',m))$('#sendCorrections',m).onclick=async e=>{const button=e.currentTarget;button.disabled=true;try{alertBox(await submitCorrectionRequest(d))}catch(err){error(err)}finally{button.disabled=false}};if($('#newAnnotation',m))$('#newAnnotation',m).onclick=()=>openAnnotation(d,m);if($('#newReport',m))$('#newReport',m).onclick=()=>openReport(d,m);$('#exportNotes',m).onclick=()=>exportAnnotated(d);drawNotes(d,m);
 if($('#trashOpenDocument',m))$('#trashOpenDocument',m).onclick=()=>changeTrash('document',d.id,d.filename,true,()=>m.remove());
 }catch(e){error(e)}}
async function drawNotes(d,m){try{const r=await sb.from('annotations').select('*').eq('document_id',d.id).order('created_at',{ascending:false});if(r.error)throw r.error;const notes=r.data||[];$('#notesArea',m).innerHTML=`<h3>Annotations de cette révision (${notes.length})</h3>`+notes.map(n=>`<div class="note"><div class="row between"><b>Page ${n.page} · ${n.visibility==='shared'?'Partagée':n.visibility==='personal'?'Personnelle':esc(n.visibility)}</b><span class="pill">${n.status==='closed'?'Traitée':n.status==='open'?'À traiter':esc(n.status)}</span></div>${isDrawing(n)?`<button class="secondary" data-correction-page="${esc(n.page)}">Voir les corrections</button>`:`<p>${esc(n.content)}</p>`}<p class="small muted">${fmt(n.created_at)}</p>${isManager()&&n.status==='open'?`<button class="secondary" data-close-note="${n.id}">Marquer traitée</button>`:''}${hasPermission('send')&&(n.author_id===currentUser.id||hasPermission('review'))?`<button class="secondary" data-convert-note="${n.id}">Convertir en signalement</button>`:''}</div>`).join('');$$('[data-correction-page]',m).forEach(b=>b.onclick=()=>openCorrections(d.id,b.dataset.correctionPage));$$('[data-close-note]',m).forEach(b=>b.onclick=async()=>{try{await update('annotations',{status:'closed'},b.dataset.closeNote);drawNotes(d,m)}catch(e){error(e)}});$$('[data-convert-note]',m).forEach(b=>b.onclick=()=>{const n=notes.find(x=>x.id===b.dataset.convertNote);if(n&&(n.author_id===currentUser.id||hasPermission('review')))openReport(d,m,n);else alert('Conversion réservée à l’auteur ou au référent')})}catch(e){error(e)}}
function openAnnotation(d,parent){if(!hasPermission('annotate'))return;const m=modal(`<h2>Nouvelle annotation — ${esc(d.filename)}</h2><form id="annoForm"><label>Page</label><input type="number" min="1" value="1" id="annoPage" required><label>Commentaire</label><textarea id="annoText" required placeholder="Repère, erreur constatée, correction…"></textarea><label>Visibilité</label><select id="annoVisibility"><option value="personal">Personnelle</option><option value="shared">Partagée (alerte au référent)</option></select><button>Enregistrer l’annotation</button></form>`);$('#annoForm',m).onsubmit=async e=>{e.preventDefault();try{await add('annotations',{document_id:d.id,author_id:currentUser.id,page:+$('#annoPage',m).value,content:$('#annoText',m).value.trim(),visibility:$('#annoVisibility',m).value});m.remove();drawNotes(d,parent);alertBox('Annotation enregistrée')}catch(e){error(e)}}}
function openReport(d,parent,annotation=null){if(!hasPermission('send'))return;const affair=affairById(cabinetById(d.cabinet_id)?.affair_id),m=modal(`<h2>Signaler un problème</h2><form id="reportForm"><label>Titre</label><input id="reportTitle" required value="${esc(isDrawing(annotation)?'Corrections du schéma':annotation?'Annotation à traiter':'')}"><label>Description</label><textarea id="reportBody">${esc(isDrawing(annotation)?'':annotation?.content||'')}</textarea><label>Priorité</label><select id="priority"><option value="normal">Normale</option><option value="important">Importante</option><option value="urgent">Urgente</option></select><p class="muted small">Destinataire automatique : référent de l'affaire ${esc(affair?.name)}</p><button>Envoyer au référent</button></form>`);$('#reportForm',m).onsubmit=async e=>{e.preventDefault();try{await add('reports',{cabinet_id:d.cabinet_id,document_id:d.id,annotation_id:annotation?.id||null,author_id:currentUser.id,referent_id:affair?.referent_id||null,title:$('#reportTitle',m).value,body:$('#reportBody',m).value,priority:$('#priority',m).value});m.remove();await refresh();alertBox('Signalement créé dans le logiciel. E-mail et push à configurer séparément.')}catch(e){error(e)}}}
async function publishDocument(id){const d=data.documents.find(x=>x.id===id);if(!d||!isManager())return;if(!confirm(`Publier officiellement « ${d.filename} » ?`))return;try{const src=await sb.storage.from('plans-drafts').download(d.storage_path);if(src.error)throw src.error;const target=`${d.cabinet_id}/${d.id}.pdf`;const up=await sb.storage.from('plans-public').upload(target,src.data,{contentType:'application/pdf',upsert:false});if(up.error)throw up.error;const r=await sb.rpc('publish_document',{p_id:d.id,p_public_path:target});if(r.error)throw r.error;await refresh();selectedCabinet=d.cabinet_id;renderCabinet();alertBox('Révision publiée. Accessible depuis le QR code.')}catch(e){error(e)}}
const recycleDay=24*60*60*1000;
const trashLabels={account:'Compte',affair:'Affaire',cabinet:'Armoire',document:'Schéma'};
async function changeTrash(kind,id,name,trash,onDone){
 const warning={account:' Le compte perdra son accès.',affair:' Ses armoires et leurs schémas seront aussi masqués.',cabinet:' Ses schémas seront aussi masqués.',document:''};
 if(trash&&!confirm(`Mettre « ${name} » dans la corbeille pendant 30 jours ?${warning[kind]}`))return;
 try{
  const result=await sb.rpc('set_trashed',{p_kind:kind,p_id:id,p_trash:trash});
  if(result.error)throw result.error;
  await refresh();onDone?.();
  alertBox(trash?'Déplacé dans la corbeille.':'Élément restauré.');
 }catch(err){error(err)}
}
function recycleDeadline(item){
 const dates=[item.date,...(item.parentDates||[])].filter(Boolean).map(date=>Date.parse(date)).filter(Number.isFinite);
 return dates.length?Math.min(...dates)+30*recycleDay:null;
}
function renderRecycleBin(){
 const view=$('#view');
 if(!isManager()){view.textContent='Accès réservé à l’administration et au chef d’atelier.';return}
 const now=Date.now();
 const entries=recycleBin.filter(item=>item.kind!=='account'||canManageAccounts())
   .map(item=>({...item,deadline:recycleDeadline(item)}))
   .sort((a,b)=>(a.deadline??Infinity)-(b.deadline??Infinity));
 view.innerHTML=`<section class="card"><h2>Corbeille</h2><p class="muted">Suppression définitive après 30 jours.</p>${entries.map((item,i)=>{
  const remaining=item.deadline===null?null:item.deadline-now;
  const days=remaining>0?Math.ceil(remaining/recycleDay):0;
  const count=remaining===null?'Date de mise à la corbeille inconnue':remaining<=0?'Suppression en cours':
    remaining<recycleDay?`Moins de ${Math.floor(remaining/(recycleDay/24))+1} h restantes`:`${days} jours restants`;
  return `<div class="item"><b>${esc(item.name)}</b>
  <p>${trashLabels[item.kind]}${item.context?' · '+esc(item.context):''} · ${fmt(item.date)}</p>
  <p><strong>${count}</strong>${remaining>0?` · Jusqu’au ${fmt(item.deadline)}`:''}</p>
  <button class="secondary" data-restore="${i}" ${remaining!==null&&remaining<=0?'disabled':''}>Restaurer</button></div>`
 }).join('')||'<p class="muted">La corbeille est vide.</p>'}</section>`;
 $$('[data-restore]',view).forEach(b=>b.onclick=async()=>{
  const item=entries[Number(b.dataset.restore)];b.disabled=true;
  try{await changeTrash(item.kind,item.id,item.name,false)}finally{if(b.isConnected)b.disabled=false}
 })
}
function renderReports(){const v=$('#view');v.innerHTML=`<section class="card"><h2>Corrections de schémas</h2><div id="correctionRequests"></div></section><section class="card"><h2>Signalements</h2><div id="reportsList"></div></section>`;renderCorrectionRequests(v);$('#reportsList').innerHTML=data.reports.map(r=>{const note=data.annotations.find(n=>n.id===r.annotation_id);const drawing=isDrawing(note)||isDrawing({content:r.body});return `<div class="item"><div class="row between"><b>${esc(r.title)}</b><span class="pill">${esc(r.status)} · ${esc(r.priority)}</span></div><p>${isDrawing({content:r.body})?'Corrections graphiques du schéma':esc(r.body)}</p>${drawing&&data.documents.some(d=>d.id===r.document_id)?`<button class="secondary" data-report-corrections="${esc(r.document_id)}" data-correction-page="${esc(note?.page||1)}">Voir les corrections</button>`:''}<p class="small muted">${esc(cabinetName(r.cabinet_id))} · ${fmt(r.created_at)}</p>${canReviewReport(r)?`<select data-report-status="${r.id}"><option value="">Changer le statut…</option><option value="progress">En cours</option><option value="accepted">Accepté</option><option value="rejected">Refusé</option><option value="closed">Clôturé</option></select>`:''}</div>`}).join('')||'<div class="empty">Aucun signalement.</div>';$$('[data-report-corrections]',v).forEach(b=>b.onclick=()=>openCorrections(b.dataset.reportCorrections,b.dataset.correctionPage));$$('[data-report-status]').forEach(el=>el.onchange=async()=>{if(!el.value)return;try{await update('reports',{status:el.value},el.dataset.reportStatus);await refresh()}catch(e){error(e)}})}
const correctionStatuses={unseen:'Pas encore vu',progress:'En cours',done:'Réalisé'};
async function submitCorrectionRequest(d){
 const result=await sb.rpc('submit_corrections',{p_document_id:d.id});
 if(result.error)throw result.error;
 return result.data?'Corrections envoyées au référent.':'Ces corrections ont déjà été envoyées.'
}
function correctionAuthor(request){return request?.author_name||data.profiles.find(p=>p.id===request?.author_id)?.full_name||''}
function openCorrectionRequest(id,showScheme=false){
 const request=data.correction_requests.find(r=>r.id===id);
 const d=data.documents.find(doc=>doc.id===request?.document_id);
 if(!request||!d){alertBox('Cette demande de correction est indisponible.',true);return}
 const pages=[...new Set(request.pages.map(row=>row.page))], author=correctionAuthor(request);
 const isReferent=hasPermission('review')&&request.referent_id===currentUser.id;
 const m=modal(`<h2>${esc(d.filename)} · Rév. ${esc(d.revision)}</h2>
 <p>${esc(cabinetName(d.cabinet_id))} · ${fmt(request.submitted_at)}</p>
 <p>${author?'Envoyé par '+esc(author):''}</p><p class="pill">${esc(correctionStatuses[request.status])}</p>
 ${!isReferent&&request.review_comment?`<p class="ew-review-comment"><strong>Retour du référent</strong><br>${esc(request.review_comment)}</p>`:''}
 <h3>Pages corrigées</h3><div class="toolbar">${pages.map(page=>`<button type="button" class="secondary" data-review-page="${esc(page)}">Page ${esc(page)}</button>`).join('')}</div>
 ${isReferent?`<form id="correctionStatus"><label for="correctionStatusValue">Statut</label><select id="correctionStatusValue">${Object.entries(correctionStatuses).map(([value,label])=>`<option value="${value}" ${value===request.status?'selected':''}>${label}</option>`).join('')}</select>
 <label for="correctionReviewComment">Commentaire pour le câbleur (facultatif)</label>
 <textarea id="correctionReviewComment" rows="3" maxlength="500" placeholder="Ex. Intégré dans la rév. C">${esc(request.review_comment||'')}</textarea>
 <button>Enregistrer le retour</button><div id="correctionError" class="error" hidden></div></form>`:''}`);
 const viewPage=page=>window.EW_PDF_EDITOR?.open({sb,document:d,user:currentUser,docUrl,initialPage:page,readOnly:true,annotationRows:request.pages,correctionAuthor:author});
 $$('[data-review-page]',m).forEach(b=>b.onclick=()=>viewPage(b.dataset.reviewPage));
 if(showScheme&&pages.length)viewPage(pages[0]);
 if(!isReferent)return;
 $('#correctionStatus',m).onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget,button=form.querySelector('button'),message=$('#correctionError',form);
  button.disabled=true;message.hidden=true;
  try{
   const result=await sb.rpc('set_correction_status',{p_id:id,p_status:$('#correctionStatusValue',form).value,p_submitted_at:request.submitted_at,p_comment:$('#correctionReviewComment',form).value.trim()});
   if(result.error)throw result.error;
   await refresh();m.remove();alertBox('Retour enregistré.');
  }catch(err){message.textContent=err.message;message.hidden=false}finally{button.disabled=false}
 }
}
function renderCorrectionRequests(v){
 const list=$('#correctionRequests',v);
 list.innerHTML=data.correction_requests.filter(r=>data.documents.some(d=>d.id===r.document_id)).sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at)).map(r=>{
  const d=data.documents.find(doc=>doc.id===r.document_id);
  return `<div class="item"><b>${esc(d?.filename||'Schéma')}</b><p>${correctionAuthor(r)?'Envoyé par '+esc(correctionAuthor(r))+' · ':''}${esc(correctionStatuses[r.status])} · ${fmt(r.submitted_at)}</p><button class="secondary" data-review-request="${esc(r.id)}">Voir la demande</button></div>`
 }).join('')||'<p class="muted">Aucune demande pour le moment.</p>';
 $$('[data-review-request]',list).forEach(b=>b.onclick=async()=>{
  try{data.correction_requests=await q('correction_requests');openCorrectionRequest(b.dataset.reviewRequest)}catch(err){error(err)}
 })
}
async function refreshNotificationList(){
 const userId=currentUser?.id;
 if(!userId||document.hidden)return;
 try{
  const notes=await q('notifications');
  if(currentUser?.id!==userId)return;
  data.notifications=notes;
  const bell=$('#ew-notifs'),dot=$('.ew-notif-dot',bell||document);
  if(dot&&!notes.some(n=>!n.is_read))dot.remove();
  if(bell&&!dot&&notes.some(n=>!n.is_read)){const badge=document.createElement('span');badge.className='ew-notif-dot';bell.append(badge)}
  if(tab==='notifications'&&$('#view'))renderNotifications();
 }catch(err){console.error(err)}
}
function renderNotifications(){
 const v=$('#view');
 const notes=data.notifications.filter(n=>n.recipient_id===currentUser.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 v.innerHTML=`<section class="card"><h2>Notifications</h2>${notes.length?notes.map(n=>{
  const isFeedback=n.kind==='correction_feedback';
  const id=(n.kind==='correction_schema'||isFeedback)&&/^\?correction=([0-9a-f-]{36})$/i.exec(n.url)?.[1];
  const author=id&&correctionAuthor(data.correction_requests.find(r=>r.id===id));
  const previousAuthor=!isFeedback&&author&&!String(n.body).includes(' · Envoyé par ')?' · Envoyé par '+author:'';
  return `<div class="item"><b>${id?(isFeedback?'Retour du référent':'Schéma modifié'):esc(n.kind)}${n.is_read?'':' · Nouvelle'}</b><p>${esc(n.body+(previousAuthor||''))}</p><small>${fmt(n.created_at)}</small>${id?`<div class="toolbar"><button class="secondary" data-notice="${esc(n.id)}" data-notice-request="${esc(id)}" data-show-scheme="${isFeedback?'no':'yes'}">${isFeedback?'Voir le retour':'Ouvrir le schéma modifié'}</button></div>`:''}</div>`
 }).join(''):'<div class="empty">Aucune notification pour le moment.</div>'}</section>`;
 $$('[data-notice]',v).forEach(b=>b.onclick=async()=>{
  b.disabled=true;
  try{
   data.correction_requests=await q('correction_requests');
   openCorrectionRequest(b.dataset.noticeRequest,b.dataset.showScheme==='yes');
   if(notes.some(n=>n.id===b.dataset.notice&&!n.is_read))await update('notifications',{is_read:true},b.dataset.notice);
   await refreshNotificationList();
  }catch(err){error(err)}finally{b.disabled=false}
 })
}
function renderBackup(){const v=$('#view');v.innerHTML=`<section class="card"><h2>Sauvegarde de vos données</h2><p>Export JSON de vos projets, armoires, documents (métadonnées), annotations et signalements. Les fichiers PDF doivent être sauvegardés séparément.</p><button id="backupExport">Exporter les données JSON</button><p class="warning">L'import doit être contrôlé : une restauration automatique de données partagées peut écraser les informations d'autres utilisateurs. La V1 fournit un import de vérification sans écriture en base.</p><label>Vérifier une sauvegarde JSON</label><input type="file" id="backupImport" accept="application/json,.json"><pre id="backupInfo" class="muted"></pre></section>`;$('#backupExport').onclick=()=>downloads('elecworkshop-sauvegarde-'+new Date().toISOString().slice(0,10)+'.json',new Blob([JSON.stringify({version:1,exported_at:new Date().toISOString(),data},null,2)],{type:'application/json'}));$('#backupImport').onchange=async e=>{try{const f=e.target.files[0],x=JSON.parse(await f.text());if(x.version!==1||!x.data?.cabinets)throw Error('Fichier incompatible');$('#backupInfo').textContent=`Sauvegarde valide : ${x.data.affairs?.length||0} affaires, ${x.data.cabinets?.length||0} armoires. Restauration non appliquée.`}catch(e){error(e)}}}
function qrModules(c){const div=document.createElement('div');div.style.cssText='position:absolute;left:-9999px;top:-9999px';document.body.appendChild(div);makeQr(div,publicUrl(c),330);const canvas=$('canvas',div);if(!canvas){div.remove();throw Error('Génération QR indisponible')}const ctx=canvas.getContext('2d'),size=canvas.width,img=ctx.getImageData(0,0,size,size),n=Math.round(size/10);const moduleCount=(()=>{for(let i=21;i<=177;i+=4){if(size%i===0)return i}return 33})(); // replaced by sampling with robust finder below
 // Find transitions on first row of finder (7 dark modules plus quiet edges). QRCode draws QR without quiet zone.
 let count=0,prev=null;for(let x=0;x<size;x++){let idx=(Math.floor(size/2)*size+x)*4,v=img.data[idx]<128;if(v!==prev){count++;prev=v}};
 div.remove();return {canvas,size,img};}
function exportPng(c){const canvas=document.createElement('canvas');canvas.width=856;canvas.height=540;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,856,540);const node=document.createElement('div');node.style.cssText='position:absolute;left:-9999px';document.body.append(node);makeQr(node,publicUrl(c),370);const qr=$('canvas',node);ctx.drawImage(qr,45,85,370,370);ctx.fillStyle='#111';ctx.textAlign='center';ctx.font='bold 43px Arial';const parts=c.name.match(/.{1,14}/g)||[c.name];parts.slice(0,3).forEach((s,i)=>ctx.fillText(s,615,245+i*55));node.remove();canvas.toBlob(b=>downloads(c.name+'.png',b),'image/png')}
function exportSvgQr(c){const node=document.createElement('div');node.style.cssText='position:absolute;left:-9999px';document.body.append(node);makeQr(node,publicUrl(c),300);const canvas=$('canvas',node);const dataUrl=canvas.toDataURL('image/png');const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="85.6mm" height="54mm" viewBox="0 0 856 540"><rect width="856" height="540" fill="white"/><image x="45" y="90" width="360" height="360" href="${dataUrl}"/><text x="625" y="275" text-anchor="middle" font-family="Arial" font-size="40" font-weight="bold">${esc(c.name)}</text></svg>`;node.remove();downloads(c.name+'.svg',new Blob([svg],{type:'image/svg+xml'}))}
// Placeable Windows Metafile (WMF), vector rectangles for QR modules, Windows TextOut.
// No external converter; importer behavior must be checked in Murrplastik MP.
function exportWmf(c){try{const qrdiv=document.createElement('div');qrdiv.style.cssText='position:absolute;left:-9999px';document.body.append(qrdiv);makeQr(qrdiv,publicUrl(c),256);const canvas=$('canvas',qrdiv),im=canvas.getContext('2d').getImageData(0,0,256,256).data;qrdiv.remove();
 const records=[];const record=(fn,params)=>{const bytes=6+params.length*2,b=new Uint8Array(bytes),v=new DataView(b.buffer);v.setUint32(0,bytes/2,true);v.setUint16(4,fn,true);params.forEach((x,i)=>v.setUint16(6+i*2,x&65535,true));records.push(b)};
 const words32=v=>[v&65535,(v>>>16)&65535];
 // MM_ANISOTROPIC + text background transparent, black text, white/black pens and brushes.
 record(0x0103,[8]);record(0x020B,[0,0]);record(0x020C,[540,856]);record(0x0102,[1]);
 record(0x02FA,[0,1,0,0,0]);record(0x012D,[0]);record(0x02FC,[0,0xffff,0x00ff,0]);record(0x012D,[1]);
 const rectangle=(l,t,r,b)=>record(0x041B,[b,r,t,l]);rectangle(0,0,856,540);
 // Use a black solid brush, module mapping from sampling pixel centers.
 record(0x02FC,[0,0,0,0]);record(0x012D,[2]);
 // QR generator has no quiet zone; sample at 1px resolution as run-length rectangles.
 for(let y=0;y<256;y++){let start=-1;for(let x=0;x<=256;x++){const black=x<256&&im[(y*256+x)*4]<100;if(black&&start<0)start=x;if(!black&&start>=0){rectangle(50+Math.round(start*1.48),80+Math.round(y*1.48),50+Math.round(x*1.48),80+Math.round((y+1)*1.48));start=-1}}}
 // TextOut: x,y are last words. Create font (CreateFontIndirect) would need LOGFONT. Export text using Unicode-independent ASCII fallback.
 const label=c.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?').slice(0,32);
 const txt=[...new TextEncoder().encode(label)];while(txt.length%2)txt.push(0);const textWords=[];for(let i=0;i<txt.length;i+=2)textWords.push(txt[i]|(txt[i+1]<<8));record(0x0521,[label.length,...textWords,250,485]);
 record(0x0000,[]);
 const size=records.reduce((s,r)=>s+r.length,0),buf=new Uint8Array(22+18+size),dv=new DataView(buf.buffer);
 dv.setUint32(0,0x9ac6cdd7,true);dv.setUint16(4,0,true);dv.setInt16(6,0,true);dv.setInt16(8,0,true);dv.setInt16(10,856,true);dv.setInt16(12,540,true);dv.setUint16(14,254,true);dv.setUint32(16,0,true);
 let checksum=0;for(let i=0;i<20;i+=2)checksum^=dv.getUint16(i,true);dv.setUint16(20,checksum,true);
 dv.setUint16(22,1,true);dv.setUint16(24,9,true);dv.setUint16(26,0x300,true);dv.setUint32(28,(18+size)/2,true);dv.setUint16(32,3,true);dv.setUint32(34,Math.max(...records.map(x=>x.length/2)),true);dv.setUint16(38,0,true);let off=40;for(const r of records){buf.set(r,off);off+=r.length}
 downloads(c.name+'.wmf',new Blob([buf],{type:'application/octet-stream'}));alertBox('WMF généré : vérifier le rendu et le nom dans Murrplastik MP.')
 }catch(e){error(e)}}
async function exportAnnotated(d){try{const url=await docUrl(d),res=await fetch(url),pdf=await window.PDFLib.PDFDocument.load(await res.arrayBuffer()),r=await sb.from('annotations').select('*').eq('document_id',d.id);if(r.error)throw r.error;const notes=r.data||[];for(const n of notes){const p=pdf.getPages()[n.page-1];if(!p)continue;const text=(n.visibility==='personal'?'[Note privée] ':'[Note partagée] ')+n.content;const safe=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?');p.drawText(safe.slice(0,100),{x:28,y:Math.max(25,p.getHeight()-24),size:8,color:window.PDFLib.rgb(0.55,0.08,0.08)})}const out=await pdf.save();downloads('COPIE_ANNOTEE_'+d.filename,new Blob([out],{type:'application/pdf'}));alertBox('Copie annotée exportée — ne remplace pas le PDF officiel')}catch(e){error(e)}}
async function init(){if(!sb){main('<section class="card"><h1>Configuration requise</h1><p>Renseignez <code>config.js</code> avec votre URL Supabase et la clé publishable (anon).</p><p>Voir le guide <b>DEPLOIEMENT_IPHONE.md</b>.</p></section>');return}
 const token=new URL(location.href).searchParams.get('qr');if(token){await publicPage(token);return}const s=await sb.auth.getSession();if(s.data.session)await signedIn();else showLogin();
 // 15-minute inactivity window; background switch is not activity.
 setInterval(async()=>{if(currentUser&&Date.now()-lastTouch>15*60*1000){await sb.auth.signOut();currentUser=null;profile=null;showLogin();alertBox('Session terminée après 15 minutes d’inactivité.')}},15000);
 setInterval(refreshNotificationList,30000);document.addEventListener('visibilitychange',refreshNotificationList);
 window.addEventListener('online',()=>{if(currentUser)alertBox('Connexion Internet retrouvée.')})
}
init().catch(error);
})();