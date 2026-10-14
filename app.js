const $ = (id) => document.getElementById(id);
const state = { services: [], apps: [], refreshTimer: null, toastTimer: null };
const serviceIcons = ["▤", "⌘", "⌁", "◈", "▦", "◉", "⌂", "▧", "◫", "⊞", "◇", "▣"];
const defaultApps = Array.from({length:12}, (_,i)=>({slot:i+1,name:"Emplacement libre",url:"",description:"Ajoute ton application ou ton raccourci.",configured:false}));

async function api(path, options={}) {
  const response = await fetch(path, { headers: {"Content-Type":"application/json"}, ...options });
  const data = await response.json().catch(()=>({error:"Réponse serveur invalide"}));
  if (!response.ok) throw new Error(data.error || `Erreur HTTP ${response.status}`);
  return data;
}
function toast(message) {
  const el=$("toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>el.classList.remove("show"),3000);
}
function safeUrl(url) {
  try { const u=new URL(url); return ["http:","https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; }
}
function statusInfo(s) {
  if (s.status==="online") return ["online","En ligne"];
  if (s.status==="offline") return ["offline","Hors ligne"];
  return ["unknown","Inconnu"];
}
function renderServices() {
  const grid=$("serviceGrid"); grid.innerHTML="";
  state.services.forEach((s,i)=>{
    const [cls,label]=statusInfo(s);
    const card=document.createElement("article"); card.className="service-card";
    const head=document.createElement("div"); head.className="service-card-head";
    const icon=document.createElement("div"); icon.className="service-icon"; icon.textContent=serviceIcons[i%serviceIcons.length];
    const badge=document.createElement("span"); badge.className=`status-badge ${cls}`; badge.innerHTML=`<span class="pulse-dot" style="${s.status==='offline'?'background:#ff7474;box-shadow:none':s.status==='unknown'?'background:#f4c66c;box-shadow:none':''}"></span>`;
    badge.append(document.createTextNode(label)); head.append(icon,badge);
    const title=document.createElement("h3"); title.textContent=s.name;
    const url=document.createElement("div"); url.className="service-url"; url.textContent=s.url;
    const meta=document.createElement("div"); meta.className="service-meta";
    const cat=document.createElement("span"); cat.className="service-category"; cat.textContent=s.category||"Service";
    const actions=document.createElement("div"); actions.className="service-actions";
    const edit=document.createElement("button"); edit.className="small-action"; edit.textContent="Modifier"; edit.onclick=()=>openServiceDialog(s);
    const open=document.createElement("button"); open.className="small-action open"; open.textContent="Ouvrir ↗"; open.onclick=()=>{const u=safeUrl(s.url);if(u)window.open(u,"_blank","noopener,noreferrer");else toast("Adresse URL invalide.");};
    const remove=document.createElement("button"); remove.className="small-action"; remove.textContent="×"; remove.title="Supprimer le service"; remove.onclick=()=>deleteService(s.id);
    actions.append(edit,open,remove); meta.append(cat,actions); card.append(head,title,url,meta); grid.append(card);
  });
  $("serviceCount").textContent=String(state.services.length).padStart(2,"0");
  $("navServiceCount").textContent=state.services.length;
}
function renderApps() {
  const grid=$("appsGrid"); grid.innerHTML="";
  state.apps.forEach(app=>{
    const card=document.createElement("article"); card.className=`app-slot ${app.configured?'configured':''}`;
    const top=document.createElement("div"); top.className="app-slot-top";
    const num=document.createElement("span"); num.className="app-number"; num.textContent=`SLOT / ${String(app.slot).padStart(2,"0")}`;
    const sym=document.createElement("span"); sym.className="app-symbol"; sym.textContent=app.configured?"▣":"+";
    top.append(num,sym);
    const body=document.createElement("div"); const title=document.createElement("h3"); title.textContent=app.name;
    const desc=document.createElement("p"); desc.textContent=app.description|| (app.url||"Emplacement disponible");
    body.append(title,desc);
    const actions=document.createElement("div"); actions.className="app-slot-actions";
    const edit=document.createElement("button"); edit.className="small-action"; edit.textContent=app.configured?"Modifier":"Configurer"; edit.onclick=()=>openAppDialog(app);
    actions.append(edit);
    if(app.configured && app.url){const open=document.createElement("button");open.className="small-action open";open.textContent="Ouvrir ↗";open.onclick=()=>{const u=safeUrl(app.url);if(u)window.open(u,"_blank","noopener,noreferrer");else toast("Adresse URL invalide.");};actions.append(open);}
    card.append(top,body,actions);grid.append(card);
  });
}
function openServiceDialog(service=null) {
  $("serviceDialogTitle").textContent=service?"Modifier le service":"Ajouter un service";
  $("serviceId").value=service?.id||"";
  $("serviceName").value=service?.name||"";
  $("serviceUrl").value=service?.url||"";
  $("serviceCategory").value=service?.category||"Outil";
  $("serviceDialog").showModal();
}
function openAppDialog(app) {
  $("appSlot").value=app.slot;
  $("appName").value=app.configured?app.name:"";
  $("appUrl").value=app.url||"";
  $("appDescription").value=app.configured?(app.description||""):"";
  $("appDialog").showModal();
}
async function loadConfig() {
  const data=await api("/api/config");
  state.services=data.services;
  state.apps=data.apps;
  renderServices();renderApps();
}
async function refreshStatus() {
  const start=performance.now();
  try {
    const data=await api("/api/status");
    $("apiLatency").textContent=`${Math.round(performance.now()-start)} ms`;
    $("osName").textContent=data.system.platformName;
    $("archName").textContent=data.system.arch;
    $("nodeVersion").textContent=data.system.node;
    $("hostName").textContent=data.system.hostname;
    $("cpuCores").textContent=data.system.cpuCores;
    $("sideHost").textContent=data.system.hostname;
    $("localAddress").textContent=`http://${location.hostname||"localhost"}:3000`;
    const cpu=data.system.cpuPercent;
    $("cpuValue").textContent=Number.isFinite(cpu)?Math.round(cpu):"—";
    $("cpuBar").style.width=`${Math.min(100,Math.max(0,cpu||0))}%`;
    $("cpuDetail").textContent=Number.isFinite(cpu)?"Charge actuelle":"Indisponible";
    const ram=data.system.ram; $("ramValue").textContent=ram.percent??"—";
    $("ramBar").style.width=`${ram.percent||0}%`; $("ramUsed").textContent=ram.usedText||"— utilisé"; $("ramTotal").textContent=ram.totalText||"— total";
    const disk=data.system.disk||{}; $("diskValue").textContent=disk.percent??"—"; $("diskUnit").textContent=disk.percent==null?"":"%";
    $("diskBar").style.width=`${disk.percent||0}%`; $("diskUsed").textContent=disk.usedText||"Indisponible"; $("diskTotal").textContent=disk.totalText||"Stockage système";
    $("uptimeValue").textContent=data.system.uptimeText;
    $("lastUpdated").textContent=`Mis à jour à ${new Date().toLocaleTimeString("fr-FR")}`;
    if(data.services){state.services=data.services;renderServices();}
  } catch(err) { $("lastUpdated").textContent="Serveur injoignable"; }
}
async function saveService(event) {
  event.preventDefault();
  const id=$("serviceId").value;
  const payload={name:$("serviceName").value.trim(),url:$("serviceUrl").value.trim(),category:$("serviceCategory").value};
  try {
    if(id) await api(`/api/services/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify(payload)});
    else await api("/api/services",{method:"POST",body:JSON.stringify(payload)});
    $("serviceDialog").close(); await loadConfig(); await refreshStatus(); toast("Service enregistré.");
  } catch(err){toast(err.message);}
}
async function deleteService(id) {
  if(!confirm("Supprimer ce service du portail ?"))return;
  try{await api(`/api/services/${encodeURIComponent(id)}`,{method:"DELETE"});await loadConfig();await refreshStatus();toast("Service supprimé.");}
  catch(err){toast(err.message);}
}
async function saveApp(event) {
  event.preventDefault();
  const slot=Number($("appSlot").value);
  const payload={name:$("appName").value.trim(),url:$("appUrl").value.trim(),description:$("appDescription").value.trim()};
  try{await api(`/api/apps/${slot}`,{method:"PUT",body:JSON.stringify(payload)});$("appDialog").close();await loadConfig();toast("Emplacement sauvegardé sur le serveur.");}
  catch(err){toast(err.message);}
}
function updateClock(){
  const now=new Date();
  $("currentDate").textContent=now.toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  $("currentTime").textContent=now.toLocaleTimeString("fr-FR");
}
document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>$(btn.dataset.close).close()));
document.querySelectorAll(".nav-link").forEach(link=>link.addEventListener("click",()=>{
  document.querySelectorAll(".nav-link").forEach(a=>a.classList.toggle("active",a===link));
  $("sidebar").classList.remove("open");
}));
$("serviceForm").addEventListener("submit",saveService);
$("appForm").addEventListener("submit",saveApp);
$("addServiceBtn").addEventListener("click",()=>openServiceDialog());
$("refreshBtn").addEventListener("click",async()=>{await refreshStatus();toast("Données actualisées.");});
$("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
$("resetAppsBtn").addEventListener("click",async()=>{
  if(!confirm("Effacer la configuration des 12 emplacements ?"))return;
  try{await api("/api/apps/reset",{method:"POST"});await loadConfig();toast("Les emplacements ont été réinitialisés.");}catch(err){toast(err.message);}
});
(async()=>{updateClock();setInterval(updateClock,1000);try{await loadConfig();await refreshStatus();state.refreshTimer=setInterval(refreshStatus,5000);}catch(err){toast(`Impossible de charger le portail : ${err.message}`);}})();
