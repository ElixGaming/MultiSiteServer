import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const dataDir = join(fileURLToPath(new URL('.', import.meta.url)), 'data');
const dataFile = join(dataDir, 'network.json');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

const initial = {
  nodes: [
    {id:'freebox',name:'Freebox Pop',type:'Box / routeur',ip:'192.168.1.254',mac:'',description:'Passerelle principale',x:100,y:250},
    {id:'cpl1',name:'CPL 1',type:'CPL',ip:'',mac:'',description:'Liaison CPL',x:300,y:250},
    {id:'cpl2',name:'CPL 2',type:'CPL',ip:'',mac:'',description:'Liaison CPL',x:500,y:250},
    {id:'ax55',name:'TP-Link Archer AX55',type:'Point d’accès',ip:'192.168.1.170',mac:'',description:'Point d’accès Wi-Fi',x:720,y:250},
    {id:'switch',name:'TP-Link LS1005G',type:'Switch Gigabit',ip:'',mac:'',description:'Switch réseau',x:950,y:250},
    {id:'pc',name:'PC principal',type:'Ethernet',ip:'192.168.1.183',mac:'',description:'Ordinateur principal',x:1160,y:120},
    {id:'x280',name:'ThinkPad X280',type:'Ethernet',ip:'',mac:'',description:'PC portable',x:1160,y:220},
    {id:'ps4',name:'PS4',type:'Ethernet',ip:'',mac:'',description:'Console',x:1160,y:320},
    {id:'nas',name:'NAS',type:'NAS',ip:'192.168.1.184',mac:'',description:'Stockage réseau',x:1160,y:420}
  ],
  links: [['freebox','cpl1'],['cpl1','cpl2'],['cpl2','ax55'],['ax55','switch'],['switch','pc'],['switch','x280'],['switch','ps4'],['switch','nas']]
};

async function load(){
  await mkdir(dataDir,{recursive:true});
  if(!existsSync(dataFile)) await writeFile(dataFile, JSON.stringify(initial,null,2));
  return JSON.parse(await readFile(dataFile,'utf8'));
}
async function save(data){ await mkdir(dataDir,{recursive:true}); await writeFile(dataFile, JSON.stringify(data,null,2)); }
function send(res,status,type,body){res.writeHead(status,{'Content-Type':type});res.end(body)}
async function body(req){let s=''; for await(const c of req)s+=c; return JSON.parse(s||'{}')}

http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host}`);
    if(req.method==='GET' && url.pathname==='/api/network') { if(url.searchParams.get('reset')==='1'){ await writeFile(dataFile, JSON.stringify(initial,null,2)); } return send(res,200,mime['.json'],JSON.stringify(await load())); }
    if(req.method==='POST' && url.pathname==='/api/network') { const data=await body(req); await save(data); return send(res,200,mime['.json'],JSON.stringify({ok:true})); }
    let p=url.pathname; if(p==='/')p='/index.html';
    const data=await readFile(join(root,p)); send(res,200,mime[extname(p)]||'text/plain; charset=utf-8',data);
  }catch(e){send(res,500,'text/plain; charset=utf-8','Erreur serveur: '+e.message)}
}).listen(3002,'0.0.0.0',()=>console.log('Network Map: http://localhost:3002'));
