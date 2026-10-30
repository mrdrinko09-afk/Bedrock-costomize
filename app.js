(()=>{"use strict";
const $=id=>document.getElementById(id), state={zip:null,files:{},json:{},packName:"Imported pack",buttons:[],selected:null,zoom:1,orientation:"portrait",safe:{x:0,y:0,r:0,b:0},dirty:false,modifiedJson:new Set()};
const dbName="bedrock-button-customizer",dbOpen=()=>new Promise((res,rej)=>{const q=indexedDB.open(dbName,1);q.onupgradeneeded=()=>q.result.createObjectStore("projects",{keyPath:"id"});q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2400)}
function setStatus(s){$("loadStatus").textContent=s}
const pathGet=(o,p)=>p.split(".").reduce((v,k)=>v==null?undefined:v[k],o);
function pathSet(o,p,v){const a=p.split(".");let t=o;for(let i=0;i<a.length-1;i++){if(t==null||!(a[i] in t))return false;t=t[a[i]]}if(t==null||!(a[a.length-1] in t))return false;t[a.at(-1)]=v;return true}
const isNum=v=>typeof v==="number"&&Number.isFinite(v), vec=v=>Array.isArray(v)&&v.length>=2&&v.slice(0,2).every(x=>isNum(x))||v&&typeof v==="object"&&isNum(v.x)&&isNum(v.y);
function flatten(o,p="",out=[]){if(!o||typeof o!=="object")return out;for(const [k,v] of Object.entries(o)){const q=p?p+"."+k:k;if(v&&typeof v==="object"&&!Array.isArray(v))flatten(v,q,out);else out.push({path:q,key:k,value:v})}return out}
function findFiles(){return Object.keys(state.files).filter(p=>/\.json$/i.test(p))}
function guessButtons(){
 const found=[];const jsonPaths=findFiles();
 // global variables first, then UI definitions. Candidate records retain exact source paths.
 for(const file of jsonPaths){const obj=state.json[file];if(!obj)continue;const flat=flatten(obj);
 const position=flat.filter(x=>/pos(ition)?|offset|location|anchor/i.test(x.key)&&vec(x.value));
 for(const pos of position){const stem=pos.path.replace(/(position|pos|offset|location|anchor)/ig,"");const nearby=flat.filter(x=>x.path!==pos.path&&x.path.toLowerCase().startsWith(stem.toLowerCase()));
 const size=nearby.find(x=>/size|scale|dimension/i.test(x.key)&&vec(x.value))||flat.find(x=>/size|scale/i.test(x.key)&&vec(x.value)&&x.path.split(".").slice(0,-1).join(".")===pos.path.split(".").slice(0,-1).join("."));
 const opacity=nearby.find(x=>/opacity|alpha/i.test(x.key)&&isNum(x.value));
 const visible=nearby.find(x=>/visible|enabled|show/i.test(x.key)&&typeof x.value==="boolean");
 if(!size&&!/button|touch|control|joystick|jump|sneak|move|slot|attack/i.test(pos.path))continue;
 const label=pos.path.split(".").slice(-2,-1)[0]||pos.key;
 found.push({id:file+"::"+pos.path,file,label:label.replace(/[_-]/g," "),paths:{pos:pos.path,size:size?.path,opacity:opacity?.path,visible:visible?.path},original:{pos:structuredClone(pos.value),size:size?structuredClone(size.value):[80,80],opacity:opacity?opacity.value:1,visible:visible?visible.value:true},mapped:{pos:true,size:!!size,opacity:!!opacity,visible:!!visible},values:{pos:structuredClone(pos.value),size:size?structuredClone(size.value):[80,80],opacity:opacity?opacity.value:1,visible:visible?visible.value:true},unit:"unknown"});
 }
 }
 // De-duplicate paths and prioritize names with button-ish semantics.
 const seen=new Set();return found.filter(b=>{if(seen.has(b.id))return false;seen.add(b.id);return true}).sort((a,b)=>/button|touch|jump|sneak|joystick|control/i.test(b.label)?-1:1);
}
async function loadPack(fileList,name){if(!window.JSZip){setStatus("ZIP engine did not load. Connect once to the internet and reload.");return}
 setStatus("Reading pack locally…");const zip=new JSZip();let entries=0;
 try{if(fileList.length===1&&fileList[0].name.match(/\.(mcpack|zip)$/i)){state.zip=await JSZip.loadAsync(fileList[0]);state.files={};for(const [p,f] of Object.entries(state.zip.files)){if(!f.dir)state.files[p]=await f.async("uint8array"),entries++}}
 else{state.zip=new JSZip();state.files={};for(const f of fileList){let p=f.webkitRelativePath||f.name;p=p.replace(/^[^/]+\//,"");state.files[p]=new Uint8Array(await f.arrayBuffer());state.zip.file(p,state.files[p]);entries++}}
 state.json={};for(const p of findFiles()){try{state.json[p]=JSON.parse(new TextDecoder().decode(state.files[p]))}catch(e){}}
 const manifest=findFiles().find(p=>p.split("/").at(-1)==="manifest.json");if(manifest){const m=state.json[manifest];state.packName=m?.header?.name||name||"Imported pack"}else state.packName=name||"Imported pack";
 state.buttons=guessButtons();state.selected=state.buttons[0]?.id||null;state.dirty=false;
 $("welcome").hidden=true;$("workspace").hidden=false;$("packName").textContent=state.packName;$("packMeta").textContent=entries+" files · "+state.buttons.length+" possible controls";$("fileCount").textContent=entries+" files";
 renderFiles();renderAnalysis();render();toast("Pack imported. Review detected mappings before editing.");
 }catch(e){console.error(e);setStatus("Could not read this pack: "+e.message)}}
function renderFiles(){$("fileList").innerHTML="";Object.keys(state.files).slice(0,120).forEach(p=>{const d=document.createElement("span");d.className="file-chip";d.textContent=p;$("fileList").append(d)});if(Object.keys(state.files).length>120){const d=document.createElement("span");d.className="file-chip";d.textContent="… and "+(Object.keys(state.files).length-120)+" more";$("fileList").append(d)}}
function renderAnalysis(){const hasGV=findFiles().filter(p=>p.split("/").at(-1)==="global_variables.json");const ui=findFiles().filter(p=>/ui\/.*\.json$/i.test(p));let html=`<div class="${hasGV.length?"good":"warn"}">${hasGV.length?"✓":"!"} global_variables.json ${hasGV.length?"found":"not found"}</div><div>UI JSON files: ${ui.length}</div><div>JSON files parsed: ${Object.keys(state.json).length}</div><div>Possible controls: ${state.buttons.length}</div>`;
 if(!state.buttons.length)html+='<div class="warn">No safe automatic mappings found. Use manual mapping or inspect pack UI definitions.</div>';
 html+='<div class="warn">Automatic detection is heuristic, not proof of Minecraft support. Confirm every source path and export-test in Minecraft.</div>';$("analysis").innerHTML=html}
function getSelected(){return state.buttons.find(b=>b.id===state.selected)}
function vecXY(v){return Array.isArray(v)?[v[0],v[1]]:[v.x,v.y]}
function setVec(old,x,y){return Array.isArray(old)?[x,y]:{...old,x,y}}
function syncProps(){const b=getSelected();$("emptyProps").hidden=!!b;$("props").hidden=!b;if(!b){$("selectedTitle").textContent="Select a button";return}
 $("selectedTitle").textContent=b.label;$("posX").value=vecXY(b.values.pos)[0];$("posY").value=vecXY(b.values.pos)[1];$("sizeX").value=vecXY(b.values.size)[0];$("sizeY").value=vecXY(b.values.size)[1];$("opacity").value=Math.round((b.values.opacity>1?b.values.opacity/100:b.values.opacity)*100);$("opacityOut").textContent=$("opacity").value+"%";$("visible").checked=!!b.values.visible;
 $("mappingNote").textContent="Source: "+b.file+" · "+b.paths.pos+(b.paths.size?" · "+b.paths.size:" · size is preview-only");}
function writeProp(b,key,val){b.values[key]=val;const path=b.paths[key];if(path){const obj=state.json[b.file];const original=b.original[key];let out=val;if(key==="opacity"&&typeof original==="number"&&original<=1)out=val/100;if(key==="opacity"&&typeof original==="number"&&original>1)out=val;if(key==="pos"||key==="size")out=setVec(original,...vecXY(val));if(!pathSet(obj,path,out)){toast("Mapping path no longer exists");return}state.modifiedJson.add(b.file)}
 state.dirty=true;render();syncProps()}
function render(){const canvas=$("preview"),ctx=canvas.getContext("2d");const landscape=state.orientation==="landscape";const w=landscape?844:390,h=landscape?390:844;canvas.width=w;canvas.height=h;$("stage").className="stage "+state.orientation;$("stage").style.width=(state.zoom*100)+"%";$("stage").style.maxWidth="100%";
 ctx.clearRect(0,0,w,h);const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,"#344d47");grad.addColorStop(1,"#172632");ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 // preview-only Minecraft-like scene, never represented as pack content
 ctx.fillStyle="#ffffff0b";for(let x=0;x<w;x+=32)for(let y=0;y<h;y+=32)ctx.strokeRect(x,y,32,32);
 ctx.fillStyle="#ffffff18";ctx.font="bold 13px system-ui";ctx.fillText("PREVIEW CANVAS · NOT A GAME SCREENSHOT",12,22);
 const sx=Number(state.safe.x),sy=Number(state.safe.y),sr=Number(state.safe.r),sb=Number(state.safe.b);$("safeRect").style.inset=`${sy/h*100}% ${sr/w*100}% ${sb/h*100}% ${sx/w*100}%`;
 ctx.strokeStyle="#62d7a2";ctx.setLineDash([6,5]);ctx.strokeRect(sx,sy,w-sx-sr,h-sy-sb);ctx.setLineDash([]);
 for(const b of state.buttons){const [x,y]=vecXY(b.values.pos),[sw,sh]=vecXY(b.values.size);const px=normalize(x,w),py=normalize(y,h);const bw=Math.max(24,Math.min(160,Math.abs(normalize(sw,w)))),bh=Math.max(24,Math.min(160,Math.abs(normalize(sh,h))));const selected=b.id===state.selected;
 ctx.globalAlpha=b.values.visible?(b.values.opacity>1?b.values.opacity/100:b.values.opacity):.22;ctx.fillStyle=selected?"#9588ff":"#dce5f2";ctx.strokeStyle=selected?"#c7beff":"#aeb9ca";ctx.lineWidth=selected?3:1.5;roundRect(ctx,px-bw/2,py-bh/2,bw,bh,Math.min(12,bw/4));ctx.fill();ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle="#10131b";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText(b.label.slice(0,18),px,py+3)}
}
function normalize(v,dim){ // Preserve arbitrary source coordinate units as a best-effort preview mapping.
 return Math.abs(v)<=1? v*dim : Math.abs(v)<=100? v/100*dim : v;
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function canvasPoint(e){const r=$("preview").getBoundingClientRect();return{x:(e.clientX-r.left)/r.width* $("preview").width,y:(e.clientY-r.top)/r.height*$("preview").height}}
let drag=null;$("preview").addEventListener("pointerdown",e=>{const p=canvasPoint(e);let hit=null;for(const b of [...state.buttons].reverse()){const [x,y]=vecXY(b.values.pos);if(Math.abs(p.x-normalize(x,$("preview").width))<65&&Math.abs(p.y-normalize(y,$("preview").height))<65)hit=b}if(hit){state.selected=hit.id;drag={id:hit.id,start:p,orig:vecXY(hit.values.pos)};$("preview").setPointerCapture(e.pointerId);syncProps();render()}});
$("preview").addEventListener("pointermove",e=>{if(!drag)return;const b=getSelected();if(!b||b.id!==drag.id)return;const p=canvasPoint(e),w=$("preview").width,h=$("preview").height;const old=b.values.pos;let nx=drag.orig[0]+(p.x-drag.start.x)*(Math.abs(drag.orig[0])<=1?1/w:Math.abs(drag.orig[0])<=100?100/w:1),ny=drag.orig[1]+(p.y-drag.start.y)*(Math.abs(drag.orig[1])<=1?1/h:Math.abs(drag.orig[1])<=100?100/h:1);nx=Math.max(0,Math.min(Math.abs(drag.orig[0])<=1?1:Math.abs(drag.orig[0])<=100?100:w,nx));ny=Math.max(0,Math.min(Math.abs(drag.orig[1])<=1?1:Math.abs(drag.orig[1])<=100?100:h,ny));b.values.pos=setVec(old,nx,ny);render();syncProps()});
$("preview").addEventListener("pointerup",()=>{if(drag){const b=getSelected();if(b?.paths.pos){pathSet(state.json[b.file],b.paths.pos,setVec(b.original.pos,...vecXY(b.values.pos)));state.modifiedJson.add(b.file)}state.dirty=true;drag=null}});
function bindNum(id,key,axis){$(id).addEventListener("change",()=>{const b=getSelected();if(!b)return;const xy=vecXY(b.values[key]);xy[axis]=Number($(id).value);writeProp(b,key,setVec(b.values[key],...xy))})}
bindNum("posX","pos",0);bindNum("posY","pos",1);bindNum("sizeX","size",0);bindNum("sizeY","size",1);
$("opacity").oninput=()=>{const b=getSelected();if(b){$("opacityOut").textContent=$("opacity").value+"%";writeProp(b,"opacity",Number($("opacity").value))}};
$("visible").onchange=()=>{const b=getSelected();if(!b)return;if(!b.paths.visible){toast("No supported visibility property mapped. Map one manually.");$("visible").checked=!!b.values.visible;return}writeProp(b,"visible",$("visible").checked)};
$("resetOne").onclick=()=>{const b=getSelected();if(!b)return;b.values=structuredClone(b.original);for(const k of ["pos","size","opacity","visible"])if(b.paths[k]){const v=b.original[k];pathSet(state.json[b.file],b.paths[k],structuredClone(v));state.modifiedJson.add(b.file)}state.dirty=true;syncProps();render()};
$("applyMapping").onclick=()=>$("mappingDialog").showModal();
$("mappingBtn").onclick=()=>{$("mappingDialog").showModal()};
function openMapping(){const sel=$("mapFile");sel.innerHTML="";findFiles().forEach(p=>{const o=document.createElement("option");o.value=p;o.textContent=p;sel.append(o)})}
$("mappingBtn").addEventListener("click",openMapping);$("applyMapping").addEventListener("click",openMapping);
$("addMapping").onclick=e=>{e.preventDefault();const file=$("mapFile").value,label=$("mapLabel").value.trim()||"Custom control",obj=state.json[file];if(!obj)return;const paths={pos:$("mapPos").value.trim(),size:$("mapSize").value.trim(),opacity:$("mapOpacity").value.trim(),visible:$("mapVisible").value.trim()};if(!paths.pos||!paths.size||!vec(pathGet(obj,paths.pos))||!vec(pathGet(obj,paths.size))){toast("Position and size paths must exist and contain X/Y vectors.");return}
 const vals={pos:structuredClone(pathGet(obj,paths.pos)),size:structuredClone(pathGet(obj,paths.size)),opacity:paths.opacity?pathGet(obj,paths.opacity):1,visible:paths.visible?pathGet(obj,paths.visible):true};if(paths.opacity&&!isNum(vals.opacity)){toast("Opacity path must point to a number.");return}if(paths.visible&&typeof vals.visible!=="boolean"){toast("Visibility path must point to true/false.");return}
 const b={id:file+"::manual::"+paths.pos,file,label,paths,original:structuredClone(vals),values:structuredClone(vals),mapped:{pos:true,size:true,opacity:!!paths.opacity,visible:!!paths.visible}};state.buttons.push(b);state.selected=b.id;state.dirty=true;$("mappingDialog").close();renderAnalysis();syncProps();render();toast("Manual mapping added.")};
$("safeX").onchange=()=>{state.safe.x=Number($("safeX").value);render()};$("safeY").onchange=()=>{state.safe.y=Number($("safeY").value);render()};$("safeR").onchange=()=>{state.safe.r=Number($("safeR").value);render()};$("safeB").onchange=()=>{state.safe.b=Number($("safeB").value);render()};
$("rotateBtn").onclick=()=>{state.orientation=state.orientation==="portrait"?"landscape":"portrait";render()};$("zoomIn").onclick=()=>{state.zoom=Math.min(1.3,state.zoom+.1);$("zoomLabel").textContent=Math.round(state.zoom*100)+"%";render()};$("zoomOut").onclick=()=>{state.zoom=Math.max(.6,state.zoom-.1);$("zoomLabel").textContent=Math.round(state.zoom*100)+"%";render()};$("fullBtn").onclick=()=>{$("stageWrap").requestFullscreen?.()};
$("packFile").onchange=e=>{if(e.target.files.length)loadPack([...e.target.files],e.target.files[0].name.replace(/\.(mcpack|zip)$/i,""))};$("packFolder").onchange=e=>{if(e.target.files.length)loadPack([...e.target.files],e.target.files[0].webkitRelativePath.split("/")[0])};
$("newBtn").onclick=()=>{if(state.dirty&&!confirm("Discard current unsaved changes?"))return;location.reload()};
$("saveBtn").onclick=async()=>{try{const db=await dbOpen(),tx=db.transaction("projects","readwrite");const data={id:"project-"+Date.now(),name:state.packName,files:state.files,json:state.json,buttons:state.buttons,modifiedJson:[...state.modifiedJson],orientation:state.orientation,safe:state.safe,savedAt:Date.now()};tx.objectStore("projects").put(data);tx.oncomplete=()=>toast("Project saved on this device.");tx.onerror=()=>toast("Could not save project.")}catch(e){toast("Local storage error: "+e.message)}};
$("exportBtn").onclick=async()=>{try{const z=new JSZip();for(const [p,bytes] of Object.entries(state.files)){let out=bytes;if(state.modifiedJson.has(p)&&state.json[p])out=new TextEncoder().encode(JSON.stringify(state.json[p],null,2));z.file(p,out)}const blob=await z.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:5}});const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=(state.packName.replace(/[^\w-]+/g,"_")||"custom_pack")+".mcpack";a.click();URL.revokeObjectURL(url);toast("Export created. Import it in Minecraft to test.")}catch(e){toast("Export failed: "+e.message)}};

$("openBtn").onclick=async()=>{try{const db=await dbOpen(),tx=db.transaction("projects","readonly"),req=tx.objectStore("projects").getAll();req.onsuccess=()=>{const host=$("savedProjects");host.innerHTML="";const projects=req.result.sort((a,b)=>b.savedAt-a.savedAt);if(!projects.length){host.textContent="No saved projects yet.";return}projects.forEach(pr=>{const btn=document.createElement("button");btn.className="file-chip";btn.textContent=pr.name+" · "+new Date(pr.savedAt).toLocaleString();btn.onclick=()=>{state.packName=pr.name;state.files=pr.files;state.json=pr.json||{};state.buttons=pr.buttons||[];state.modifiedJson=new Set(pr.modifiedJson||[]);state.orientation=pr.orientation||"portrait";state.safe=pr.safe||{x:0,y:0,r:0,b:0};state.selected=state.buttons[0]?.id||null;state.dirty=false;state.zip=new JSZip();for(const [p,b] of Object.entries(state.files))state.zip.file(p,b);$("welcome").hidden=true;$("workspace").hidden=false;$("packName").textContent=state.packName;$("packMeta").textContent=Object.keys(state.files).length+" files · "+state.buttons.length+" controls";$("safeX").value=state.safe.x;$("safeY").value=state.safe.y;$("safeR").value=state.safe.r;$("safeB").value=state.safe.b;renderFiles();renderAnalysis();syncProps();render();$("projectsDialog").close();toast("Project reopened.")};host.append(btn)})};}catch(e){toast("Could not load saved projects: "+e.message)}};
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
let deferred=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("installBtn").hidden=false});$("installBtn").onclick=async()=>{if(deferred){deferred.prompt();deferred=null}};
syncProps();render();
})();