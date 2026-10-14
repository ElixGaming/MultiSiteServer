import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const CONFIG_FILE = path.join(DATA_DIR, "portal-config.json");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_BODY = 32 * 1024;

const defaultConfig = () => ({
  services: [
    { id:"portal", name:"MultiSiteServer", url:"http://localhost:3000", category:"Administration" },
    { id:"tickets", name:"NetworkTicketCenter", url:"http://localhost:3001", category:"Outil" },
    { id:"service-3002", name:"Service 3002", url:"http://localhost:3002", category:"Application" }
  ],
  apps: Array.from({length:12},(_,i)=>({slot:i+1,name:"Emplacement libre",url:"",description:"Ajoute ton application ou ton raccourci.",configured:false}))
});
let config = defaultConfig();
let lastCpu = cpuSnapshot();

function cpuSnapshot() {
  const cpus=os.cpus();
  let idle=0,total=0;
  for(const c of cpus){for(const k of Object.keys(c.times)){total+=c.times[k];}idle+=c.times.idle;}
  return {idle,total};
}
function cpuUsage() {
  const now=cpuSnapshot(), idle=now.idle-lastCpu.idle, total=now.total-lastCpu.total;
  lastCpu=now;
  return total>0?Math.round((1-idle/total)*1000)/10:null;
}
function humanBytes(bytes) {
  if(!Number.isFinite(bytes)||bytes<0)return "Indisponible";
  const units=["B","KB","MB","GB","TB"];let n=bytes,i=0;
  while(n>=1024&&i<units.length-1){n/=1024;i++;}
  return `${n.toFixed(i===0?0:1)} ${units[i]}`;
}
function humanUptime(seconds) {
  seconds=Math.max(0,Math.floor(seconds));
  const d=Math.floor(seconds/86400);seconds%=86400;
  const h=Math.floor(seconds/3600);seconds%=3600;
  const m=Math.floor(seconds/60);
  if(d)return `${d} j ${h} h`;
  if(h)return `${h} h ${m} min`;
  return `${m} min`;
}
async function diskStats() {
  try {
    if(process.platform==="win32") {
      const {stdout}=await execFileAsync("powershell.exe",["-NoProfile","-NonInteractive","-Command","$d=Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='$env:SystemDrive'\"; if($d){[Console]::WriteLine(\"{0} {1}\",$d.Size,$d.Size-$d.FreeSpace)}"],{timeout:2500,windowsHide:true});
      const match=stdout.trim().match(/^(\d+)\s+(\d+)$/);
      if(match){const total=Number(match[1]),used=Number(match[2]);return {percent:total?Math.round(used/total*100):null,usedText:humanBytes(used),totalText:humanBytes(total)};}
    } else {
      const target=process.platform==="darwin"?"/":"/";
      const {stdout}=await execFileAsync("df",["-Pk",target],{timeout:2500});
      const lines=stdout.trim().split(/\r?\n/);const cols=lines.at(-1).trim().split(/\s+/);
      if(cols.length>=5){const total=Number(cols[1])*1024,used=Number(cols[2])*1024;return {percent:total?Math.round(used/total*100):null,usedText:humanBytes(used),totalText:humanBytes(total)};}
    }
  } catch {}
  return {percent:null,usedText:"Indisponible",totalText:"Non disponible sur ce système"};
}
function systemStats(disk) {
  const total=os.totalmem(),free=os.freemem(),used=total-free;
  const cpus=os.cpus();
  return {
    platformName:({win32:"Windows",linux:"Linux",darwin:"macOS"})[process.platform]||process.platform,
    platform:process.platform,arch:os.arch(),node:process.version,hostname:os.hostname(),
    cpuCores:cpus.length,cpuPercent:cpuUsage(),
    ram:{percent:Math.round(used/total*100),usedText:humanBytes(used),totalText:humanBytes(total)},
    disk,uptimeText:humanUptime(os.uptime())
  };
}
function validHttpUrl(value) {
  if(typeof value!=="string"||value.length>500) return false;
  try {const u=new URL(value);return ["http:","https:"].includes(u.protocol)&&Boolean(u.hostname);}
  catch{return false;}
}
function cleanText(value,max=100) {
  return typeof value==="string"?value.trim().slice(0,max):"";
}
function send(res,status,data,headers={}) {
  const body=JSON.stringify(data);
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers});
  res.end(body);
}
function sendError(res,status,message){send(res,status,{error:message});}
async function readJson(req) {
  let raw="";
  for await(const chunk of req){raw+=chunk;if(raw.length>MAX_BODY)throw new Error("Requête trop volumineuse.");}
  try{return JSON.parse(raw||"{}");}catch{throw new Error("JSON invalide.");}
}
async function checkService(service) {
  let status="offline";
  try {
    const url=new URL(service.url);
    if(!["http:","https:"].includes(url.protocol))throw new Error("Protocole refusé");
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),1800);
    try {
      const response=await fetch(url,{method:"GET",signal:controller.signal,redirect:"manual"});
      status=(response.status>0&&response.status<500)?"online":"offline";
      if(response.body)response.body.cancel().catch(()=>{});
    } finally {clearTimeout(timer);}
  } catch {status="offline";}
  return {...service,status};
}
async function saveConfig(){await fs.promises.mkdir(DATA_DIR,{recursive:true});await fs.promises.writeFile(CONFIG_FILE,JSON.stringify(config,null,2),"utf8");}
async function loadConfig(){
  await fs.promises.mkdir(DATA_DIR,{recursive:true});
  try {
    const parsed=JSON.parse(await fs.promises.readFile(CONFIG_FILE,"utf8"));
    const defaults=defaultConfig();
    config={
      services:Array.isArray(parsed.services)?parsed.services:defaults.services,
      apps:Array.isArray(parsed.apps)?parsed.apps:defaults.apps
    };
    // Keep the 12 slots present even if a prior file is incomplete.
    const existing=new Map(config.apps.map(a=>[Number(a.slot),a]));
    config.apps=defaults.apps.map(def=>({...def,...(existing.get(def.slot)||{}) ,slot:def.slot}));
  } catch {config=defaultConfig();await saveConfig();}
}
function serveStatic(req,res) {
  const pathname=new URL(req.url,"http://localhost").pathname;
  const routes={"/": "portail.html","/portail.html":"portail.html","/style.css":"style.css","/app.js":"app.js"};
  const filename=routes[pathname];
  if(!filename){sendError(res,404,"Fichier introuvable.");return;}
  const full=path.join(__dirname,filename);
  const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8"};
  fs.createReadStream(full).on("error",()=>sendError(res,500,"Impossible de lire le fichier.")).on("open",()=>{res.writeHead(200,{"Content-Type":types[path.extname(full)],"X-Content-Type-Options":"nosniff","Cache-Control":"no-cache"});}).pipe(res);
}
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,"http://localhost");
    if(req.method==="GET"&&url.pathname==="/api/health"){send(res,200,{ok:true,port:PORT,uptime:os.uptime()});return;}
    if(req.method==="GET"&&url.pathname==="/api/config"){send(res,200,{services:config.services,apps:config.apps});return;}
    if(req.method==="GET"&&url.pathname==="/api/status"){
      const [disk,services]=await Promise.all([diskStats(),Promise.all(config.services.map(checkService))]);
      send(res,200,{system:systemStats(disk),services,checkedAt:new Date().toISOString()});return;
    }
    if(req.method==="POST"&&url.pathname==="/api/services"){
      const body=await readJson(req),name=cleanText(body.name,50),serviceUrl=cleanText(body.url,500),category=cleanText(body.category,40)||"Outil";
      if(!name||!validHttpUrl(serviceUrl)){sendError(res,400,"Indique un nom et une URL HTTP/HTTPS valide.");return;}
      if(config.services.length>=30){sendError(res,400,"Maximum de 30 services atteint.");return;}
      const item={id:randomUUID(),name,url:serviceUrl,category};config.services.push(item);await saveConfig();send(res,201,item);return;
    }
    const serviceMatch=url.pathname.match(/^\/api\/services\/([^/]+)$/);
    if(serviceMatch){
      const id=decodeURIComponent(serviceMatch[1]),index=config.services.findIndex(s=>s.id===id);
      if(index<0){sendError(res,404,"Service introuvable.");return;}
      if(req.method==="PUT"){
        const body=await readJson(req),name=cleanText(body.name,50),serviceUrl=cleanText(body.url,500),category=cleanText(body.category,40)||"Outil";
        if(!name||!validHttpUrl(serviceUrl)){sendError(res,400,"Indique un nom et une URL HTTP/HTTPS valide.");return;}
        config.services[index]={...config.services[index],name,url:serviceUrl,category};await saveConfig();send(res,200,config.services[index]);return;
      }
      if(req.method==="DELETE"){config.services.splice(index,1);await saveConfig();send(res,200,{ok:true});return;}
    }
    const appMatch=url.pathname.match(/^\/api\/apps\/(\d+)$/);
    if(req.method==="PUT"&&appMatch){
      const slot=Number(appMatch[1]);if(slot<1||slot>12){sendError(res,400,"Emplacement invalide.");return;}
      const body=await readJson(req),name=cleanText(body.name,50),appUrl=cleanText(body.url,500),description=cleanText(body.description,100);
      if(!name){sendError(res,400,"Le nom de l’application est obligatoire.");return;}
      if(appUrl&&!validHttpUrl(appUrl)){sendError(res,400,"L’URL doit commencer par http:// ou https://.");return;}
      const app={slot,name,url:appUrl,description:description||"Application personnalisée",configured:true};
      config.apps[slot-1]=app;await saveConfig();send(res,200,app);return;
    }
    if(req.method==="POST"&&url.pathname==="/api/apps/reset"){config.apps=defaultConfig().apps;await saveConfig();send(res,200,{ok:true});return;}
    if(req.method==="GET"){serveStatic(req,res);return;}
    sendError(res,404,"Route API introuvable.");
  } catch(err) {
    if(!res.headersSent)sendError(res,err.message==="JSON invalide."||err.message==="Requête trop volumineuse."?400:500,err.message||"Erreur interne.");
    else res.end();
  }
});
await loadConfig();
server.listen(PORT,HOST,()=>console.log(`MultiSiteServer Control Center : http://${HOST}:${PORT}`));
server.on("error",err=>{console.error("Erreur du serveur :",err.message);process.exitCode=1;});
