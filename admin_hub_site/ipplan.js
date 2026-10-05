(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
function ip(n){return [n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join(".")}
function parseCidr(s){var m=/^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*\/\s*(\d{1,2})\s*$/.exec(s);if(!m)return null;var p=[+m[1],+m[2],+m[3],+m[4]],b=+m[5];if(p.some(function(x){return x>255})||b>30||b<8)return null;
  var n=((p[0]*256+p[1])*256+p[2])*256+p[3],size=Math.pow(2,32-b);return {n:Math.floor(n/size)*size,b:b,size:size,typed:n}}
function mask(b){var n=b===0?0:(0xFFFFFFFF<<(32-b))>>>0;return ip(n)}
function inRange(n,base,bits){var size=Math.pow(2,32-bits);return Math.floor(n/size)===Math.floor(base/size)}
function isPrivate(n){return inRange(n,0x0A000000,8)||inRange(n,0xAC100000,12)||inRange(n,0xC0A80000,16)}
var HOME=[["192.168.0.0",24,"many home routers"],["192.168.1.0",24,"many home routers"],["192.168.2.0",24,"many home routers"],["192.168.178.0",24,"FRITZ!Box"],["192.168.179.0",24,"FRITZ!Box guest"],["10.0.0.0",24,"many home routers"],["192.168.8.0",24,"mobile hotspots"],["192.168.100.0",24,"cable modems"]];
var PRESETS={
 office:[["Management",10,20],["Servers",20,30],["Clients",30,120],["Voice",40,60],["Printers",50,15],["Wi-Fi staff",60,80],["Wi-Fi guest",70,100],["IoT and building",80,40],["DMZ",90,6]],
 lab:[["Management",10,10],["Servers and VMs",20,40],["Home",30,30],["IoT",40,40],["Guest",50,20]],
 school:[["Management",10,60],["Servers",20,50],["Staff",30,250],["Students",40,900],["Wi-Fi guest",50,400],["Printers",60,40],["Voice",70,120],["Building and cameras",80,200]]
};
var COLORS=["#4da3ff","#b45cff","#ff4fd8","#ff9d4d","#6fe0c5","#8a86c9","#e0d36f","#7fa8ff","#d48cff","#ff8fb0","#9be07a","#c9c2ff"];
var segs=[],view="table";

/* ---------- allocation ---------- */
function plan(base,list,headroom,mode){
  var out=[],used=[],err=[];
  function free(start,size){return start>=base.n&&start+size<=base.n+base.size&&!used.some(function(u){return start<u[0]+u[1]&&u[0]<start+size})}
  function firstFit(size){for(var s=Math.ceil(base.n/size)*size;s+size<=base.n+base.size;s+=size)if(free(s,size))return s;return -1}
  var items=list.map(function(s,i){var need=Math.ceil(s.hosts*(1+headroom/100))+1,size=8;while(size-2<need)size*=2;if(mode==="readable"&&size<256)size=256;return {i:i,s:s,need:need,size:size,start:-1}});
  if(mode==="readable"&&base.b<=16){items.forEach(function(it){if(it.size===256&&it.s.vlan>=0&&it.s.vlan<=255){var st=(Math.floor(base.n/65536)*65536)+it.s.vlan*256;if(free(st,256)){it.start=st;used.push([st,256])}}})}
  items.slice().sort(function(a,b){return b.size-a.size||a.i-b.i}).forEach(function(it){if(it.start>=0)return;var st=firstFit(it.size);if(st<0){err.push(it.s.name);return}it.start=st;used.push([st,it.size])});
  items.forEach(function(it){if(it.start<0)return;var bits=32-Math.round(Math.log(it.size)/Math.LN2),usable=it.size-2,stat=it.size>=64?Math.max(10,Math.floor(usable*0.1)):Math.max(2,Math.floor(usable*0.2));
    out.push({name:it.s.name,vlan:it.s.vlan,hosts:it.s.hosts,start:it.start,size:it.size,bits:bits,cidr:ip(it.start)+"/"+bits,mask:mask(bits),gw:ip(it.start+1),first:ip(it.start+1),last:ip(it.start+it.size-2),bc:ip(it.start+it.size-1),
      dhcpFrom:ip(it.start+1+stat),dhcpTo:ip(it.start+it.size-2),staticFrom:ip(it.start+2),staticTo:ip(it.start+stat),usable:usable,fill:it.s.hosts/usable,color:COLORS[it.i%COLORS.length]})});
  out.sort(function(a,b){return a.start-b.start});
  var usedSum=out.reduce(function(a,r){return a+r.size},0),big=0;for(var sz=base.size;sz>=4&&!big;sz/=2)if(firstFit(sz)>=0)big=sz;
  return {rows:out,missing:err,used:usedSum,largestFree:big};
}

/* ---------- exports ---------- */
function slug(s){return s.replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,28)||"vlan"}
function exports(R,dns,domain){
  var rows=R.rows,dnsL=dns.split(/[,\s]+/).filter(Boolean),o={};
  var q=function(v){v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  o.csv=[["Name","VLAN","Subnet","Mask","Gateway","Static range","DHCP range","Broadcast","Usable","Planned hosts"]].concat(rows.map(function(r){return [r.name,r.vlan,r.cidr,r.mask,r.gw,r.staticFrom+" - "+r.staticTo,r.dhcpFrom+" - "+r.dhcpTo,r.bc,r.usable,r.hosts]})).map(function(r){return r.map(q).join(",")}).join("\r\n");
  o.md="| Name | VLAN | Subnet | Gateway | Static | DHCP | Usable |\n| --- | --- | --- | --- | --- | --- | --- |\n"+rows.map(function(r){return "| "+[r.name,r.vlan,r.cidr,r.gw,r.staticFrom+" - "+r.staticTo,r.dhcpFrom+" - "+r.dhcpTo,r.usable].join(" | ")+" |"}).join("\n");
  o.cisco=rows.map(function(r){return "vlan "+r.vlan+"\n name "+slug(r.name)+"\n!\ninterface Vlan"+r.vlan+"\n description "+r.name+"\n ip address "+r.gw+" "+r.mask+(dnsL.length?"\n ip helper-address DHCP-SERVER-IP":"")+"\n no shutdown\n!"}).join("\n");
  o.windows="# Windows Server DHCP. Run on the DHCP server, elevated.\n"+rows.map(function(r){return "Add-DhcpServerv4Scope -Name '"+r.name.replace(/'/g,"''")+" (VLAN "+r.vlan+")' -StartRange "+r.dhcpFrom+" -EndRange "+r.dhcpTo+" -SubnetMask "+r.mask+" -LeaseDuration 8.00:00:00 -State Active\nSet-DhcpServerv4OptionValue -ScopeId "+ip(r.start)+" -Router "+r.gw+(dnsL.length?" -DnsServer "+dnsL.join(","):"")+(domain?" -DnsDomain "+domain:"")}).join("\n");
  o.dnsmasq="# dnsmasq, one block per VLAN interface\n"+rows.map(function(r){var t=slug(r.name).toLowerCase();return "# "+r.name+" (VLAN "+r.vlan+")\ndhcp-range=set:"+t+","+r.dhcpFrom+","+r.dhcpTo+","+r.mask+",12h\ndhcp-option=tag:"+t+",option:router,"+r.gw+(dnsL.length?"\ndhcp-option=tag:"+t+",option:dns-server,"+dnsL.join(","):"")+(domain?"\ndhcp-option=tag:"+t+",option:domain-name,"+domain:"")}).join("\n");
  return o;
}

/* ---------- UI ---------- */
function segRows(){
  var host=$("ip-segs");host.replaceChildren();
  segs.forEach(function(s,i){
    var r=el("div","iprow");
    function inp(key,type,label,w){var e=document.createElement("input");e.className="q";e.type="text";if(type==="num")e.inputMode="numeric";e.value=s[key];e.setAttribute("aria-label",label+" of segment "+(i+1));e.autocomplete="off";e.spellcheck=false;
      e.addEventListener("input",function(){s[key]=type==="num"?(parseInt(e.value,10)||0):e.value;render()});return e}
    var sw=el("i","ipsw");sw.style.background=COLORS[i%COLORS.length];
    var del=el("button","btn ghost ipdel","remove");del.type="button";del.setAttribute("aria-label","Remove "+s.name);del.addEventListener("click",function(){segs.splice(i,1);segRows();render()});
    r.append(sw,inp("name","text","Name"),inp("vlan","num","VLAN ID"),inp("hosts","num","Hosts"),del);host.append(r);
  });
}
function finding(sev,title,text){var d=el("details","finding"),s=el("summary");s.append(el("span","sevtag s-"+sev,{crit:"critical",high:"high",med:"medium",info:"info"}[sev]),el("b",null,title));d.append(s,el("p",null,text));if(sev==="crit"||sev==="high")d.open=true;return d}
function render(){
  var out=$("ip-out");out.replaceChildren();
  var base=parseCidr($("ip-base").value),head=Math.min(300,Math.max(0,parseInt($("ip-head").value,10)||0)),mode=$("ip-mode").value;
  save();
  if(!base){out.append(el("p","note","Enter the address range as network and prefix, for example 10.20.0.0/16. Prefixes from /8 to /30 work."));return}
  var list=segs.filter(function(s){return s.name.trim()&&s.hosts>0});
  if(!list.length){out.append(el("p","note","Add at least one segment with a name and a number of hosts."));return}
  var R=plan(base,list,head,mode),F=[];
  if(R.missing.length)F.push(["crit","Not everything fits","No room for: "+R.missing.join(", ")+". Use a larger range, lower the headroom, or switch to the tight layout."]);
  if(!isPrivate(base.n))F.push(["high","This is not a private address range",ip(base.n)+"/"+base.b+" is outside 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. Using public addresses you do not own inside your network makes the real owners of those addresses unreachable for you."]);
  var home=HOME.filter(function(h){var hn=parseCidr(h[0]+"/"+h[1]);return R.rows.some(function(r){return r.start<hn.n+hn.size&&hn.n<r.start+r.size})});
  if(home.length)F.push(["med","Overlaps with ranges that home routers use",home.map(function(h){return h[0]+"/"+h[1]+" ("+h[2]+")"}).join(", ")+". Anyone who connects by VPN from a home network with the same range cannot reach those hosts, because their computer thinks the address is local. Pick something unusual such as 10.87.0.0/16."]);
  if(base.typed!==base.n)F.push(["info","The range was aligned",$("ip-base").value.trim()+" is an address inside "+ip(base.n)+"/"+base.b+". The plan uses the whole network."]);
  var vl={},dup=[];list.forEach(function(s){if(vl[s.vlan])dup.push(s.vlan);vl[s.vlan]=1});
  if(dup.length)F.push(["high","VLAN ID used twice","VLAN "+dup.join(", ")+". Every segment needs its own ID."]);
  var bad=list.filter(function(s){return s.vlan<1||s.vlan>4094});if(bad.length)F.push(["high","VLAN ID out of range",bad.map(function(s){return s.name}).join(", ")+": IDs go from 1 to 4094."]);
  if(list.some(function(s){return s.vlan===1}))F.push(["info","VLAN 1 is in use","VLAN 1 is the default on every switch: any port nobody configured ends up in it. Keep it empty and give management its own VLAN."]);
  var big=R.rows.filter(function(r){return r.size>=1024});if(big.length)F.push(["info","Large segments",big.map(function(r){return r.name+" ("+r.cidr+")"}).join(", ")+". Beyond a few hundred devices in one segment, broadcast traffic and one misbehaving device affect everybody. Split by building, floor or device type if you can."]);
  var tightS=R.rows.filter(function(r){return r.fill>0.8});if(tightS.length)F.push(["info","Little room to grow",tightS.map(function(r){return r.name+" ("+r.hosts+" of "+r.usable+")"}).join(", ")+". DHCP leases of devices that left stay reserved for the lease time, so a subnet feels full before it is."]);
  var rank={crit:0,high:1,med:2,info:3};F.sort(function(a,b){return rank[a[0]]-rank[b[0]]});
  var worst=F.length?F[0][0]:"none",v=el("div","verdict v-"+(worst==="info"||worst==="none"?"none":worst));
  v.append(el("b",null,R.rows.length+" subnet"+(R.rows.length===1?"":"s")+" in "+ip(base.n)+"/"+base.b),el("span",null,Math.round(R.used/base.size*100)+"% of the range handed out · largest free block: "+(R.largestFree?"/"+(32-Math.round(Math.log(R.largestFree)/Math.LN2))+" ("+R.largestFree.toLocaleString("en-US")+" addresses)":"none")));
  out.append(v);
  /* map */
  var bar=el("div","ipbar");bar.setAttribute("aria-hidden","true");var pos=base.n;
  R.rows.forEach(function(r){if(r.start>pos){var g=el("i","gap");g.style.flexGrow=String(Math.max(1,Math.sqrt(r.start-pos)));bar.append(g)}var b=el("i");b.style.flexGrow=String(Math.max(2,Math.sqrt(r.size)));b.style.background=r.color;b.title=r.name+" "+r.cidr;bar.append(b);pos=r.start+r.size});
  if(pos<base.n+base.size){var g2=el("i","gap");g2.style.flexGrow=String(Math.max(1,Math.sqrt(base.n+base.size-pos)));bar.append(g2)}
  out.append(bar,el("p","dim ipbarn","The address range from "+ip(base.n)+" to "+ip(base.n+base.size-1)+". Coloured blocks are your subnets, dark is free. Widths are compressed so small subnets stay visible."));
  F.forEach(function(f){out.append(finding(f[0],f[1],f[2]))});
  /* table */
  out.append(el("h2",null,"the plan"));
  var w=el("div","tw"),t=el("table","tbl iptbl"),th=el("thead"),tr=el("tr"),tb=el("tbody");["","Name","VLAN","Subnet","Gateway","Static","DHCP","Usable","Planned"].forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
  R.rows.forEach(function(r){var x=el("tr"),c0=el("td"),sw=el("i","ipsw");sw.style.background=r.color;c0.append(sw);x.append(c0,el("td",null,r.name),el("td",null,r.vlan),el("td",null,r.cidr),el("td",null,r.gw),el("td",null,r.staticFrom+" - "+r.staticTo),el("td",null,r.dhcpFrom+" - "+r.dhcpTo),el("td",null,r.usable.toLocaleString("en-US")),el("td",null,r.hosts+" ("+Math.round(r.fill*100)+"%)"));tb.append(x)});
  t.append(th,tb);w.append(t);out.append(w,el("p","note","Gateway is the first address. The static range after it is for servers, printers, switches and access points with fixed addresses, the rest goes to DHCP. Mask, broadcast and the full list are in the CSV."));
  /* exports */
  out.append(el("h2",null,"take it with you"));
  var E=exports(R,$("ip-dns").value,$("ip-domain").value.trim()),tabs=el("div","ctl"),names={table:"Markdown table",csv:"CSV",cisco:"Cisco IOS",windows:"Windows DHCP",dnsmasq:"dnsmasq"},key={table:"md",csv:"csv",cisco:"cisco",windows:"windows",dnsmasq:"dnsmasq"};
  Object.keys(names).forEach(function(k){var b=el("button","chipbtn"+(view===k?" on":""),names[k]);b.type="button";b.setAttribute("aria-pressed",view===k?"true":"false");b.addEventListener("click",function(){view=k;render();$("ip-code").scrollIntoView({block:"nearest"})});tabs.append(b)});
  var text=E[key[view]],pre=el("pre",null,text);pre.id="ip-code";pre.tabIndex=0;
  var ctl=el("div","ctl"),cp=el("button","btn","Copy");cp.type="button";cp.addEventListener("click",function(){try{navigator.clipboard.writeText(text).then(function(){cp.textContent="Copied";setTimeout(function(){cp.textContent="Copy"},1200)})}catch(e){}});
  var ext={table:"md",csv:"csv",cisco:"txt",windows:"ps1",dnsmasq:"conf"}[view],dl=el("button","btn ghost","Download ip-plan."+ext);dl.type="button";dl.addEventListener("click",function(){var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/plain"}));a.download="ip-plan."+ext;document.body.append(a);a.click();a.remove()});
  ctl.append(cp,dl);out.append(tabs,pre,ctl);
  if(view==="cisco")out.append(el("p","note","Layer 3 interfaces for a switch or router that routes between the VLANs. If a firewall does the routing, create only the VLANs on the switch and put the gateway addresses on the firewall. Replace DHCP-SERVER-IP."));
}
function save(){var s=[$("ip-base").value.trim().replace("/","_"),$("ip-head").value,$("ip-mode").value,segs.map(function(x){return encodeURIComponent(x.name)+":"+x.vlan+":"+x.hosts}).join(";")].join("|");try{history.replaceState(null,"","#"+s)}catch(e){}}
function load(){var h=location.hash.replace(/^#/,"");if(h.split("|").length<4)return false;var p=h.split("|");$("ip-base").value=p[0].replace("_","/");$("ip-head").value=p[1];if(p[2]==="tight"||p[2]==="readable")$("ip-mode").value=p[2];
  segs=p[3].split(";").map(function(x){var a=x.split(":");return {name:decodeURIComponent(a[0]||""),vlan:parseInt(a[1],10)||0,hosts:parseInt(a[2],10)||0}}).filter(function(x){return x.name});return segs.length>0}
function preset(k){segs=PRESETS[k].map(function(x){return {name:x[0],vlan:x[1],hosts:x[2]}});if(k==="school")$("ip-base").value="10.87.0.0/16";segRows();render()}
document.querySelectorAll("[data-ippreset]").forEach(function(b){b.addEventListener("click",function(){preset(b.getAttribute("data-ippreset"))})});
$("ip-add").addEventListener("click",function(){var max=segs.reduce(function(a,s){return Math.max(a,s.vlan)},0);segs.push({name:"New segment",vlan:Math.min(4094,max+10),hosts:20});segRows();render()});
["ip-base","ip-head","ip-mode","ip-dns","ip-domain"].forEach(function(i){$(i).addEventListener("input",render);$(i).addEventListener("change",render)});
if(!load())segs=PRESETS.office.map(function(x){return {name:x[0],vlan:x[1],hosts:x[2]}});
segRows();render();
window.ipPlan={plan:plan,parseCidr:parseCidr};
})();
