import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=3003, PUBLIC=path.join(__dirname,'public'), DATA=path.join(__dirname,'data.json');
const initial={devices:[
 {id:'ax55',name:'AX55',model:'Archer AX55 V1',vendor:'TP-Link',ip:'192.168.1.170',mac:'',location:'Chambre',firmware:'1.5.12',mode:'Access Point',status:'online',notes:'Routeur / point d’accès principal'},
 {id:'pc',name:'PC',model:'',vendor:'',ip:'192.168.1.183',mac:'',location:'Chambre',firmware:'',mode:'',status:'online',notes:''}
]};
function read(){try{return JSON.parse(fs.readFileSync(DATA,'utf8'))}catch{fs.writeFileSync(DATA,JSON.stringify(initial,null,2));return structuredClone(initial)}}
function send(res,status,body,type='application/json'){res.writeHead(status,{'Content-Type':type,'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end(type.startsWith('application/json')?JSON.stringify(body):body)}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=http.createServer((req,res)=>{if(req.method==='OPTIONS')return send(res,204,'');const u=new URL(req.url,`http://${req.headers.host}`);if(u.pathname==='/api/data'&&req.method==='GET')return send(res,200,read());if(u.pathname==='/api/data'&&req.method==='POST'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{const d=JSON.parse(b);fs.writeFileSync(DATA,JSON.stringify(d,null,2));send(res,200,d)}catch{send(res,400,{error:'JSON invalide'})}});return}let p=u.pathname==='/'?'/index.html':u.pathname;let file=path.normalize(path.join(PUBLIC,decodeURIComponent(p)));if(!file.startsWith(PUBLIC))return send(res,403,'Forbidden','text/plain');fs.readFile(file,(e,c)=>e?send(res,404,'Not found','text/plain'):send(res,200,c,mime[path.extname(file)]||'text/plain') )});
server.listen(PORT,'0.0.0.0',()=>console.log(`Configuration Studio: http://localhost:${PORT}`));
