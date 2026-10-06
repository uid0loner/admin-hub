/* Network diagram builder: devices and links on an SVG canvas, kept in the address, exported as SVG or PNG. */
(function(){"use strict";
var $=function(i){return document.getElementById(i)};var host=$("nd-canvas");if(!host)return;
var W=1000,H=600,GRID=20;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
/* icons are drawn in a 56 x 40 box around 0,0 */
var TYPES={
 internet:["Internet",'<path d="M-18 12h34a10 10 0 0 0 2-19.8A14 14 0 0 0-9-12a11 11 0 0 0-9 24z"/>'],
 router:["Router",'<rect x="-24" y="-8" width="48" height="18" rx="4"/><path d="M-12 1h8M4 1h8M-8-3l-4 4 4 4M8-3l4 4-4 4"/><path d="M-14-8v-8M14-8v-8"/>'],
 firewall:["Firewall",'<rect x="-22" y="-16" width="44" height="32" rx="2"/><path d="M-22-5.300h44M-22 5.300h44M-7-16v10.700M8-16v10.700M0-5.300v10.600M-14-5.300v10.600M14-5.300v10.600M-7 5.300v10.700M8 5.300v10.700"/>'],
 "switch":["Switch",'<rect x="-26" y="-9" width="52" height="18" rx="3"/><path d="M-20-3h5v6h-5zM-12-3h5v6h-5zM-4-3h5v6h-5zM4-3h5v6h-5zM12-3h5v6h-5z"/>'],
 ap:["Access point",'<ellipse cx="0" cy="10" rx="18" ry="6"/><path d="M-7-2a10 10 0 0 1 14 0M-13-8a18 18 0 0 1 26 0"/><circle cx="0" cy="4" r="1.6"/>'],
 server:["Server",'<rect x="-18" y="-18" width="36" height="11" rx="2"/><rect x="-18" y="-5.500" width="36" height="11" rx="2"/><rect x="-18" y="7" width="36" height="11" rx="2"/><path d="M-13-12.500h8M-13 0h8M-13 12.500h8"/><circle cx="12" cy="-12.500" r="1.300"/><circle cx="12" cy="0" r="1.300"/><circle cx="12" cy="12.500" r="1.300"/>'],
 nas:["NAS or storage",'<rect x="-20" y="-16" width="40" height="32" rx="3"/><path d="M-12-16v24M-4-16v24M4-16v24M12-16v24M-20 8h40"/><circle cx="14" cy="12" r="1.300"/>'],
 pc:["PC",'<rect x="-20" y="-17" width="40" height="26" rx="2"/><path d="M-9 17h18M0 9v8"/>'],
 laptop:["Notebook",'<rect x="-17" y="-14" width="34" height="22" rx="2"/><path d="M-24 13h48l-4-5h-40z"/>'],
 printer:["Printer",'<path d="M-12-8v-10h24v10"/><rect x="-22" y="-8" width="44" height="18" rx="3"/><rect x="-12" y="4" width="24" height="13"/><path d="M-7 9h14M-7 13h10"/>'],
 phone:["Phone",'<rect x="-20" y="-6" width="40" height="22" rx="3"/><path d="M-22-10a6 6 0 0 1 6-6h4v8h-6v6M22-10a6 6 0 0 0-6-6h-4v8h6v6"/><path d="M-8 2h4M-2 2h4M4 2h4M-8 8h4M-2 8h4M4 8h4"/>'],
 camera:["Camera",'<rect x="-22" y="-10" width="32" height="18" rx="3"/><path d="M10-4l12-6v18l-12-6"/><path d="M-10 8v8h-8"/>'],
 cloud:["Cloud service",'<path d="M-18 12h34a10 10 0 0 0 2-19.800A14 14 0 0 0-9-12a11 11 0 0 0-9 24z"/><path d="M-8 2h14M-8 7h9"/>'],
 mobile:["Phone or tablet",'<rect x="-10" y="-18" width="20" height="36" rx="3"/><path d="M-3 13h6"/>'],
 ups:["UPS",'<rect x="-16" y="-18" width="32" height="36" rx="3"/><path d="M2-10l-6 10h8l-6 10"/>'],
 box:["Other device",'<rect x="-20" y="-14" width="40" height="28" rx="3"/>']};
var LINK={copper:["Copper",""],fibre:["Fibre",""],wifi:["Wi-Fi","6 5"],vpn:["VPN tunnel","2 5"],wan:["WAN line","12 4 2 4"]};
var THEME={dark:{bg:"#07051a",grid:"#15123a",line:"#4da3ff",node:"#0d0b2b",stroke:"#d6d9ff",text:"#d6d9ff",dim:"#8a86c9",sel:"#ff4fd8",fibre:"#ff9d4d",vpn:"#b45cff",zone:"#2a2466"},
 light:{bg:"#ffffff",grid:"#eeeeee",line:"#1b4f9c",node:"#ffffff",stroke:"#111111",text:"#111111",dim:"#555555",sel:"#c2188f",fibre:"#b85a00",vpn:"#6a1fb0",zone:"#bbbbbb"}};
var st={n:[],k:[],t:""},uid=1,sel=null,selLink=null,connecting=null,drag=null,svg=null;
function node(id){for(var i=0;i<st.n.length;i++)if(st.n[i].i===id)return st.n[i];return null}
function snap(v){return Math.round(v/GRID)*GRID}
function freeSpot(){for(var y=80;y<H-60;y+=100)for(var x=100;x<W-80;x+=120){if(!st.n.some(function(n){return Math.abs(n.x-x)<90&&Math.abs(n.y-y)<80}))return{x:x,y:y}}return{x:snap(100+Math.random()*900),y:snap(80+Math.random()*500)}}
function add(t,x,y,l,ip){var p=x===undefined?freeSpot():{x:x,y:y};var n={i:uid++,t:t,x:p.x,y:p.y,l:l===undefined?TYPES[t][0]:l,ip:ip||""};st.n.push(n);return n}
function link(a,b,s,l){if(a===b)return null;var ex=st.k.filter(function(k){return (k.a===a&&k.b===b)||(k.a===b&&k.b===a)})[0];if(ex)return ex;var k={a:a,b:b,s:s||"copper",l:l||""};st.k.push(k);return k}
function build(theme,forExport){var T=THEME[theme],s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" font-family="ui-sans-serif,system-ui,Segoe UI,Helvetica,Arial,sans-serif"'+(forExport?'':' id="nd-svg" role="group" aria-label="Network diagram with '+st.n.length+' devices and '+st.k.length+' links"')+'>';
  s+='<rect width="'+W+'" height="'+H+'" fill="'+T.bg+'"/>';
  if(!forExport){s+='<g stroke="'+T.grid+'" stroke-width="1">';for(var x=GRID*2;x<W;x+=GRID*2)s+='<path d="M'+x+' 0V'+H+'"/>';for(var y=GRID*2;y<H;y+=GRID*2)s+='<path d="M0 '+y+'H'+W+'"/>';s+='</g>'}
  if(st.t)s+='<text x="24" y="34" font-size="18" font-weight="600" fill="'+T.text+'">'+esc(st.t)+'</text>';
  st.k.forEach(function(k,i){var a=node(k.a),b=node(k.b);if(!a||!b)return;var col=k.s==="fibre"?T.fibre:k.s==="vpn"?T.vpn:T.line,on=selLink===i&&!forExport,vert=Math.abs(a.x-b.x)<50,mx=(a.x+b.x)/2+(vert&&k.l?k.l.length*3.2+22:0),my=(a.y+b.y)/2+(vert?14:0);
    s+='<g'+(forExport?'':' data-k="'+i+'" tabindex="0" role="button" aria-label="Link from '+esc(a.l)+' to '+esc(b.l)+', '+LINK[k.s][0]+(k.l?', '+esc(k.l):'')+'" style="cursor:pointer"')+'>';
    if(!forExport)s+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="transparent" stroke-width="16"/>';
    s+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="'+(on?T.sel:col)+'" stroke-width="'+(on?3:k.s==="fibre"?2.600:2)+'"'+(LINK[k.s][1]?' stroke-dasharray="'+LINK[k.s][1]+'"':'')+' stroke-linecap="round"/>';
    if(k.l){var w=k.l.length*6.400+12;s+='<rect x="'+(mx-w/2)+'" y="'+(my-10)+'" width="'+w+'" height="19" rx="4" fill="'+T.bg+'" stroke="'+(on?T.sel:T.zone)+'"/><text x="'+mx+'" y="'+(my+4)+'" font-size="11.500" text-anchor="middle" fill="'+T.text+'">'+esc(k.l)+'</text>'}
    s+='</g>'});
  st.n.forEach(function(n){var on=sel===n.i&&!forExport,from=connecting===n.i&&!forExport;
    s+='<g'+(forExport?'':' data-n="'+n.i+'" tabindex="0" role="button" aria-label="'+esc(TYPES[n.t][0]+": "+n.l+(n.ip?", "+n.ip:""))+'" style="cursor:grab"')+' transform="translate('+n.x+' '+n.y+')">';
    s+='<rect x="-36" y="-28" width="72" height="56" rx="10" fill="'+T.node+'" stroke="'+(from?T.fibre:on?T.sel:T.zone)+'" stroke-width="'+(on||from?2.400:1.200)+'"'+(from?' stroke-dasharray="5 4"':'')+'/>';
    s+='<g fill="none" stroke="'+T.stroke+'" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round">'+TYPES[n.t][1]+'</g>';
    var lw=Math.max(n.l.length,(n.ip||"").length)*6.600+10;
    if(n.l||n.ip)s+='<rect x="'+(-lw/2)+'" y="31" width="'+lw+'" height="'+(n.l&&n.ip?32:18)+'" rx="4" fill="'+T.bg+'" fill-opacity=".86"/>';
    if(n.l)s+='<text y="44" font-size="12.500" text-anchor="middle" fill="'+T.text+'">'+esc(n.l)+'</text>';
    if(n.ip)s+='<text y="'+(n.l?58:44)+'" font-size="11" text-anchor="middle" fill="'+T.dim+'" font-family="ui-monospace,Menlo,Consolas,monospace">'+esc(n.ip)+'</text>';
    s+='</g>'});
  return s+'</svg>'}
/* ---------- checks on the drawing ---------- */
function ipOk(s){var m=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(s);return !!m&&m.slice(1,5).every(function(x){return +x<=255})&&(m[5]===undefined||+m[5]<=32)}
function findings(){var f=[],deg={},nb={};st.n.forEach(function(n){deg[n.i]=0;nb[n.i]=[]});st.k.forEach(function(k){if(deg[k.a]===undefined||deg[k.b]===undefined)return;deg[k.a]++;deg[k.b]++;nb[k.a].push(k.b);nb[k.b].push(k.a)});
  var lone=st.n.filter(function(n){return !deg[n.i]});if(lone.length&&st.n.length>1)f.push(["med","Not connected to anything: "+lone.map(function(n){return n.l||TYPES[n.t][0]}).join(", "),"Either a link is missing in the drawing, or the device is not on this network and does not belong here."]);
  var seen={};st.n.forEach(function(n){var ip=(n.ip||"").trim();if(!ip)return;var parts=ip.split(/[\s,;]+/);parts.forEach(function(p){if(!/^\d+\.\d+\.\d+\.\d+/.test(p))return;if(!ipOk(p)){f.push(["med","\""+p+"\" on "+(n.l||TYPES[n.t][0])+" is not a valid IPv4 address","Four numbers from 0 to 255, optionally with a prefix such as /24."]);return}var bare=p.split("/")[0];if(p.indexOf("/")>=0&&/\.0$/.test(bare))return;(seen[bare]=seen[bare]||[]).push(n.l||TYPES[n.t][0])})});
  Object.keys(seen).forEach(function(ip){if(seen[ip].length>1)f.push(["high",ip+" is used twice: "+seen[ip].join(" and "),"Two devices with one address take each other off the network in turns. If this is a typo in the drawing, fix it here; if it is true, fix it there."])});
  var edge={router:1,firewall:1};st.n.filter(function(n){return n.t==="internet"}).forEach(function(n){nb[n.i].forEach(function(o){var d=node(o);if(d&&!edge[d.t]&&d.t!=="cloud"&&d.t!=="internet")f.push(["high",(d.l||TYPES[d.t][0])+" is connected straight to the internet","No router or firewall in between in this drawing. If the device really has a public address, it needs its own firewall and a very good reason."])})});
  /* is there a way from the internet to an inside device that passes no firewall? */
  var inet=st.n.filter(function(n){return n.t==="internet"});
  if(inet.length&&!st.n.some(function(n){return n.t==="firewall"})&&st.n.some(function(n){return n.t==="router"}))f.push(["info","No firewall in the drawing","In a small office the router is usually the firewall too. Then write that on its label, so the next person does not search for a box that does not exist."]);
  st.n.filter(function(n){return n.t==="camera"||n.t==="printer"||n.t==="phone"}).length>3&&!st.k.some(function(k){return /vlan/i.test(k.l)})&&f.push(["info","Cameras, printers and phones, and no VLAN on any link","Devices that are rarely patched are better off in their own network. If they are, write the VLAN on the links."]);
  var sw=st.n.filter(function(n){return n.t==="switch"});sw.forEach(function(s){var up=nb[s.i].filter(function(o){var d=node(o);return d&&(d.t==="switch"||d.t==="router"||d.t==="firewall")});if(up.length===1&&nb[s.i].length>=4){var d=node(up[0]);if(sw.length>1&&d.t==="switch")f.push(["info",(s.l||"Switch")+" hangs on one uplink","Everything behind it is offline when that one cable or port fails. For an access switch that is normal; for the switch with the servers, a second uplink is worth the port."])}});
  if(st.n.some(function(n){return n.t==="server"||n.t==="nas"})&&!st.n.some(function(n){return n.t==="ups"}))f.push(["info","Servers or storage, and no UPS in the drawing","If there is one, draw it: after a power cut the diagram is where people look to see what should still be running."]);
  return f}
/* ---------- screen ---------- */
function b64(s){return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function unb64(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return decodeURIComponent(escape(atob(s)))}
function pack(){return b64(JSON.stringify({t:st.t,n:st.n.map(function(n){return [n.i,n.t,n.x,n.y,n.l,n.ip]}),k:st.k.map(function(k){return [k.a,k.b,k.s,k.l]})}))}
function unpack(s){var o=JSON.parse(unb64(s));st.t=String(o.t||"").slice(0,80);st.n=[];st.k=[];uid=1;(o.n||[]).slice(0,120).forEach(function(a){if(!TYPES[a[1]])return;st.n.push({i:+a[0],t:a[1],x:Math.max(40,Math.min(W-40,+a[2]||100)),y:Math.max(40,Math.min(H-70,+a[3]||100)),l:String(a[4]||"").slice(0,40),ip:String(a[5]||"").slice(0,40)});uid=Math.max(uid,+a[0]+1)});
  (o.k||[]).slice(0,300).forEach(function(a){if(node(+a[0])&&node(+a[1])&&LINK[a[2]])st.k.push({a:+a[0],b:+a[1],s:a[2],l:String(a[3]||"").slice(0,30)})})}
var saveT=null;function save(){clearTimeout(saveT);saveT=setTimeout(function(){try{history.replaceState(null,"",st.n.length?"#d="+pack():location.pathname)}catch(e){}},200)}
function status(t){$("nd-status").textContent=t}
function draw(keepFocus){var act=document.activeElement,fn=act&&act.getAttribute?act.getAttribute("data-n"):null,fk=act&&act.getAttribute?act.getAttribute("data-k"):null;
  host.innerHTML=build("dark",false);svg=$("nd-svg");
  if(keepFocus!==false){var t=fn?svg.querySelector('[data-n="'+fn+'"]'):fk?svg.querySelector('[data-k="'+fk+'"]'):null;if(t)t.focus({preventScroll:true})}
  panel();report();save()}
function panel(){var p=$("nd-panel"),n=sel?node(sel):null,k=selLink!==null?st.k[selLink]:null,h="";
  if(n){h='<h2 class="plain">'+esc(TYPES[n.t][0])+'</h2><label>Name<input class="sel" id="nd-l" type="text" maxlength="40" value="'+esc(n.l)+'" autocomplete="off"></label><label>Address or note<input class="sel" id="nd-ip" type="text" maxlength="40" value="'+esc(n.ip)+'" placeholder="10.87.20.10" autocomplete="off" spellcheck="false"></label>'+
     '<label>Kind<select class="sel" id="nd-t">'+Object.keys(TYPES).map(function(t){return '<option value="'+t+'"'+(t===n.t?" selected":"")+'>'+TYPES[t][0]+'</option>'}).join("")+'</select></label>'+
     '<div class="ndbtn"><button type="button" class="btn solid" id="nd-conn">'+(connecting===n.i?"Now pick the other device":"Connect to another device")+'</button><button type="button" class="btn ghost" id="nd-dup">Duplicate</button><button type="button" class="btn ghost" id="nd-del">Delete</button></div>'+
     '<p class="dim ndhelp">Drag it, or move it with the arrow keys. C connects, Delete removes.</p>'}
  else if(k){var a=node(k.a),b=node(k.b);h='<h2 class="plain">Link</h2><p class="dim" style="margin:0 0 8px">'+esc(a.l)+' to '+esc(b.l)+'</p><label>Kind<select class="sel" id="nd-ks">'+Object.keys(LINK).map(function(s){return '<option value="'+s+'"'+(s===k.s?" selected":"")+'>'+LINK[s][0]+'</option>'}).join("")+'</select></label><label>Label<input class="sel" id="nd-kl" type="text" maxlength="30" value="'+esc(k.l)+'" placeholder="1 Gbit, VLAN 20, trunk" autocomplete="off"></label><div class="ndbtn"><button type="button" class="btn ghost" id="nd-kdel">Delete the link</button></div>'}
  else h='<h2 class="plain">Nothing selected</h2><p class="dim">Add devices with the buttons above the drawing. Click a device to name it, give it an address and connect it. Click a link to label it.</p><label>Title of the drawing<input class="sel" id="nd-title" type="text" maxlength="80" value="'+esc(st.t)+'" placeholder="Office network, October 2026" autocomplete="off"></label>';
  p.innerHTML=h;
  function on(id,ev,fn){var e=$(id);if(e)e.addEventListener(ev,fn)}
  on("nd-l","input",function(){n.l=this.value;redrawSvgOnly()});on("nd-ip","input",function(){n.ip=this.value;redrawSvgOnly()});on("nd-t","change",function(){n.t=this.value;draw()});
  on("nd-conn","click",function(){connecting=connecting===n.i?null:n.i;status(connecting?"Pick the device to connect "+n.l+" to.":"");draw()});
  on("nd-dup","click",function(){var c=add(n.t,Math.min(W-40,n.x+GRID*4),Math.min(H-70,n.y+GRID*2),n.l,"");sel=c.i;draw()});
  on("nd-del","click",function(){removeNode(n.i)});
  on("nd-ks","change",function(){k.s=this.value;draw()});on("nd-kl","input",function(){k.l=this.value;redrawSvgOnly()});on("nd-kdel","click",function(){st.k.splice(selLink,1);selLink=null;draw()});
  on("nd-title","input",function(){st.t=this.value;redrawSvgOnly()})}
function redrawSvgOnly(){host.innerHTML=build("dark",false);svg=$("nd-svg");report();save()}
function removeNode(id){st.n=st.n.filter(function(x){return x.i!==id});st.k=st.k.filter(function(k){return k.a!==id&&k.b!==id});sel=null;connecting=null;status("Deleted.");draw()}
function report(){var f=findings(),out=$("nd-out"),h="";
  var cnt={};st.n.forEach(function(n){cnt[n.t]=(cnt[n.t]||0)+1});
  h+='<div class="stats"><div class="stat"><span class="stat-k">devices</span><b class="stat-v" data-raw="1">'+st.n.length+'</b></div><div class="stat"><span class="stat-k">links</span><b class="stat-v" data-raw="1">'+st.k.length+'</b></div><div class="stat"><span class="stat-k">remarks on the drawing</span><b class="stat-v" data-raw="1">'+f.length+'</b></div></div>';
  if(!st.n.length){out.innerHTML=h+'<p class="dim">The drawing is empty. Add a device, or start from one of the examples.</p>';return}
  f.forEach(function(x){h+='<details class="finding f-'+x[0]+'"><summary><span class="sevtag s-'+x[0]+'">'+({high:"check",med:"look",info:"note"})[x[0]]+'</span><b>'+esc(x[1])+'</b></summary><p>'+esc(x[2])+'</p></details>'});
  if(!f.length)h+='<p class="dim">Nothing stands out in the drawing itself: every device is connected and no address is used twice.</p>';
  h+='<h2 class="plain" style="margin-top:34px">the drawing as a table</h2><div class="tw"><table class="tbl"><thead><tr><th>Device</th><th>Kind</th><th>Address or note</th><th>Connected to</th></tr></thead><tbody>';
  st.n.slice().sort(function(a,b){return a.y-b.y||a.x-b.x}).forEach(function(n){var c=st.k.filter(function(k){return k.a===n.i||k.b===n.i}).map(function(k){var o=node(k.a===n.i?k.b:k.a);return esc(o.l||TYPES[o.t][0])+' <span class="dim">('+LINK[k.s][0].toLowerCase()+(k.l?", "+esc(k.l):"")+')</span>'});
    h+='<tr><td>'+esc(n.l)+'</td><td>'+TYPES[n.t][0]+'</td><td><code>'+esc(n.ip)+'</code></td><td>'+(c.join("<br>")||'<span class="dim">nothing</span>')+'</td></tr>'});
  out.innerHTML=h+'</tbody></table></div>'}
function pt(e){var m=svg.getScreenCTM();if(!m)return{x:0,y:0};return{x:(e.clientX-m.e)/m.a,y:(e.clientY-m.f)/m.d}}
function pick(id){if(connecting&&connecting!==id){var a=node(connecting),b=node(id);var k=link(connecting,id,(a.t==="ap"&&(b.t==="laptop"||b.t==="mobile"))||(b.t==="ap"&&(a.t==="laptop"||a.t==="mobile"))?"wifi":a.t==="internet"||b.t==="internet"?"wan":"copper");connecting=null;sel=null;selLink=st.k.indexOf(k);status("Connected "+a.l+" and "+b.l+". Label the link if you like.")}else{sel=id;selLink=null}}
host.addEventListener("pointerdown",function(e){var g=e.target.closest?e.target.closest("[data-n]"):null,gk=e.target.closest?e.target.closest("[data-k]"):null;
  if(g){var id=+g.getAttribute("data-n"),n=node(id),p=pt(e);pick(id);if(sel===id){drag={id:id,dx:n.x-p.x,dy:n.y-p.y,moved:false};try{host.setPointerCapture(e.pointerId)}catch(x){}}e.preventDefault();draw(false);var t=svg.querySelector('[data-n="'+id+'"]');if(t)t.focus({preventScroll:true})}
  else if(gk){selLink=+gk.getAttribute("data-k");sel=null;connecting=null;e.preventDefault();draw(false);var tk=svg.querySelector('[data-k="'+selLink+'"]');if(tk)tk.focus({preventScroll:true})}
  else if(sel!==null||selLink!==null||connecting){sel=null;selLink=null;connecting=null;status("");draw(false)}});
host.addEventListener("pointermove",function(e){if(!drag)return;var n=node(drag.id);if(!n)return;var p=pt(e),x=Math.max(40,Math.min(W-40,snap(p.x+drag.dx))),y=Math.max(40,Math.min(H-70,snap(p.y+drag.dy)));if(x===n.x&&y===n.y)return;n.x=x;n.y=y;drag.moved=true;
  host.innerHTML=build("dark",false);svg=$("nd-svg")});
function endDrag(e){if(!drag)return;var id=drag.id,m=drag.moved;drag=null;try{host.releasePointerCapture(e.pointerId)}catch(x){}if(m){draw(false);var t=svg.querySelector('[data-n="'+id+'"]');if(t)t.focus({preventScroll:true})}}
host.addEventListener("pointerup",endDrag);host.addEventListener("pointercancel",endDrag);
host.addEventListener("focusin",function(e){var g=e.target.closest?e.target.closest("[data-n]"):null;if(g&&!drag){var id=+g.getAttribute("data-n");if(sel!==id&&!connecting){sel=id;selLink=null;draw()}}});
host.addEventListener("keydown",function(e){var g=e.target.closest?e.target.closest("[data-n]"):null,gk=e.target.closest?e.target.closest("[data-k]"):null;
  if(gk){var i=+gk.getAttribute("data-k");if(e.key==="Enter"||e.key===" "){selLink=i;sel=null;e.preventDefault();draw()}else if(e.key==="Delete"||e.key==="Backspace"){st.k.splice(i,1);selLink=null;e.preventDefault();draw(false);status("Link deleted.")}return}
  if(!g)return;var id=+g.getAttribute("data-n"),n=node(id),step=e.shiftKey?GRID*3:GRID,mv={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(mv){n.x=Math.max(40,Math.min(W-40,n.x+mv[0]*step));n.y=Math.max(40,Math.min(H-70,n.y+mv[1]*step));e.preventDefault();draw()}
  else if(e.key==="Enter"||e.key===" "){e.preventDefault();pick(id);draw()}
  else if(e.key==="c"||e.key==="C"){e.preventDefault();connecting=id;sel=id;status("Pick the device to connect "+n.l+" to: move there with Tab and press Enter.");draw()}
  else if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();removeNode(id)}
  else if(e.key==="Escape"){connecting=null;status("");draw()}});
/* palette */
var pal=$("nd-pal");Object.keys(TYPES).forEach(function(t){var b=document.createElement("button");b.type="button";b.className="ndadd";b.innerHTML='<svg viewBox="-30 -22 60 44" width="38" height="28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round">'+TYPES[t][1]+'</svg><span>'+TYPES[t][0]+'</span>';
  b.addEventListener("click",function(){var from=sel?node(sel):null,n=add(t);if(from&&$("nd-auto").checked){link(from.i,n.i,t==="internet"||from.t==="internet"?"wan":"copper")}else sel=n.i;selLink=null;status(TYPES[t][0]+" added"+(from&&$("nd-auto").checked?" and connected to "+from.l:"")+".");draw()});pal.appendChild(b)});
/* examples */
var EX={office:function(){st.t="Small office";var i=add("internet",500,60,"Internet","fibre 500/100"),f=add("firewall",500,160,"Firewall","10.87.0.1"),c=add("switch",500,280,"Core switch","10.87.0.2"),s=add("server",280,280,"Server","10.87.10.10"),n=add("nas",160,280,"Backup NAS","10.87.10.20"),u=add("ups",280,160,"UPS",""),a1=add("ap",720,160,"AP front","10.87.0.11"),a2=add("ap",840,280,"AP back","10.87.0.12"),p=add("printer",720,400,"Printer","10.87.30.5"),pc=add("pc",360,420,"12 PCs","10.87.20.0/24"),lp=add("laptop",840,400,"Notebooks","10.87.20.0/24"),ph=add("phone",540,480,"8 phones","10.87.40.0/24");
   link(i.i,f.i,"wan","WAN");link(f.i,c.i,"copper","trunk");link(c.i,s.i,"copper","10 Gbit");link(s.i,n.i,"copper","VLAN 10");link(c.i,a1.i,"copper","PoE");link(c.i,a2.i,"copper","PoE");link(c.i,p.i,"copper","VLAN 30");link(c.i,pc.i,"copper","VLAN 20");link(a2.i,lp.i,"wifi","");link(c.i,ph.i,"copper","VLAN 40");link(u.i,s.i,"copper","USB")},
 sites:function(){st.t="Two sites and a cloud";var i=add("internet",500,100,"Internet",""),f1=add("firewall",260,200,"Firewall HQ","10.87.0.1"),f2=add("firewall",740,200,"Firewall branch","10.88.0.1"),s1=add("switch",260,320,"Switch HQ",""),s2=add("switch",740,320,"Switch branch",""),sv=add("server",120,320,"File server","10.87.10.10"),dc=add("server",120,440,"Domain controller","10.87.10.5"),c=add("cloud",500,260,"Microsoft 365",""),p1=add("pc",340,460,"PCs HQ","10.87.20.0/24"),p2=add("pc",740,460,"PCs branch","10.88.20.0/24"),ap=add("ap",880,320,"AP branch","");
   link(i.i,f1.i,"wan","");link(i.i,f2.i,"wan","");link(f1.i,f2.i,"vpn","site to site");link(f1.i,s1.i);link(f2.i,s2.i);link(s1.i,sv.i);link(s1.i,dc.i);link(s1.i,p1.i);link(s2.i,p2.i);link(s2.i,ap.i,"copper","PoE");link(i.i,c.i,"wan","")},
 lab:function(){st.t="Home lab";var i=add("internet",500,60,"Internet",""),r=add("router",500,160,"Router","192.168.1.1"),s=add("switch",500,280,"Switch","192.168.1.2"),h=add("server",300,280,"Proxmox host","192.168.1.10"),n=add("nas",300,420,"NAS","192.168.1.20"),p=add("pc",700,420,"Desktop","192.168.1.50"),a=add("ap",700,160,"Access point","192.168.1.3"),m=add("mobile",840,160,"Phones",""),c=add("camera",500,440,"Camera","192.168.1.30");
   link(i.i,r.i,"wan","");link(r.i,s.i);link(s.i,h.i,"copper","2.5 Gbit");link(s.i,n.i);link(s.i,p.i);link(r.i,a.i);link(a.i,m.i,"wifi","");link(s.i,c.i,"copper","PoE")}};
function load(k){st={n:[],k:[],t:""};uid=1;sel=null;selLink=null;connecting=null;EX[k]();status("Example loaded. Change it into your network.");draw()}
Array.prototype.forEach.call(document.querySelectorAll("[data-ex]"),function(b){b.addEventListener("click",function(){if(st.n.length&&!window.confirm("Replace the current drawing with the example?"))return;load(b.getAttribute("data-ex"))})});
$("nd-clear").addEventListener("click",function(){if(st.n.length&&!window.confirm("Empty the drawing?"))return;st={n:[],k:[],t:""};uid=1;sel=null;selLink=null;connecting=null;status("Empty.");draw()});
function download(name,url){var a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a)},100)}
function fname(ext){return (st.t||"network-diagram").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"."+ext}
function theme(){return $("nd-light").checked?"light":"dark"}
$("nd-svgdl").addEventListener("click",function(){download(fname("svg"),"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(build(theme(),true)));status("SVG saved. It opens in any browser, and in Visio, draw.io and Inkscape for further editing.")});
$("nd-pngdl").addEventListener("click",function(){var img=new Image();img.onload=function(){var c=document.createElement("canvas");c.width=W*2;c.height=H*2;var x=c.getContext("2d");x.drawImage(img,0,0,W*2,H*2);try{download(fname("png"),c.toDataURL("image/png"));status("PNG saved, "+W*2+" by "+H*2+" pixels.")}catch(e){status("This browser will not turn the drawing into a PNG. Use the SVG instead.")}};img.onerror=function(){status("This browser will not turn the drawing into a PNG. Use the SVG instead.")};img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(build(theme(),true))});
$("nd-link").addEventListener("click",function(){var u=location.origin+location.pathname+"#d="+pack();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(function(){status("Link copied. The whole drawing is inside the link, nothing is stored on a server.")},function(){status(u)})}else status(u)});
function prep(){$("nd-printview").innerHTML=build("light",true)}
window.addEventListener("beforeprint",prep);$("nd-print").addEventListener("click",function(){prep();window.print()});
try{var m=/[#&]d=([A-Za-z0-9_-]+)/.exec(location.hash);if(m)unpack(m[1])}catch(e){st={n:[],k:[],t:""};status("The link did not contain a drawing that can be read.")}
if(!st.n.length&&!/[#&]d=/.test(location.hash))EX.office();
draw();
window.ndTest={st:function(){return st},findings:findings,build:build,pack:pack};
})();
