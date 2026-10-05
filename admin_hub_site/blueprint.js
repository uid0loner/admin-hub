(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
var IDS=["bp-people","bp-data","bp-remote","bp-phones","bp-things","bp-public"],ticks={};
function opts(){var n=Math.round(parseFloat($("bp-people").value)||0);n=Math.min(250,Math.max(1,n));
  return {n:n,data:$("bp-data").value,remote:$("bp-remote").value,phones:$("bp-phones").value,things:$("bp-things").checked,pub:$("bp-public").checked}}
function ceil(x,step){return Math.ceil(x/step)*step}

function model(o){
  var m={},n=o.n,onprem=o.data!=="cloud";
  m.printers=Math.max(1,Math.ceil(n/15));m.aps=Math.max(2,Math.ceil(n/20));m.servers=onprem?(n>40?2:1):0;m.cams=o.things?Math.max(2,Math.ceil(n/10)):0;m.deskPhones=o.phones==="desk"?n:0;
  /* switch ports: one per desk (a desk phone passes the PC through), printers, access points, servers with two links each, things, uplinks */
  m.ports=n+m.printers+m.aps+m.servers*2+(onprem?2:0)+m.cams+(o.things?Math.ceil(n/8):0)+2;
  m.portsPlan=Math.ceil(m.ports*1.3);
  var sw48=Math.floor(m.portsPlan/48),rest=m.portsPlan-sw48*48;m.sw48=sw48+(rest>24?1:0);m.sw24=rest>0&&rest<=24?1:0;if(!m.sw48&&!m.sw24)m.sw24=1;
  m.poeW=m.aps*20+m.deskPhones*7+m.cams*10;m.poeBudget=ceil(m.poeW*1.3,10);
  var cloudHeavy=o.data==="cloud"||o.phones==="soft";
  m.down=Math.max(100,ceil(n*(cloudHeavy?8:5),50));m.up=Math.max(40,ceil(n*(cloudHeavy?4:2)+(o.remote!=="none"&&onprem?20:0),10));
  m.second=o.data==="cloud"||o.phones!=="mobile"||n>=20;
  m.vpn=o.remote==="none"?0:o.remote==="some"?Math.ceil(n*0.4):n;
  m.dataGB=onprem?n*40:0;m.nasTB=onprem?Math.max(4,ceil(m.dataGB*3/1000,2)):0;m.backupTB=onprem?Math.max(8,ceil(m.nasTB*2.5,2)):0;
  m.upsW=40+(m.sw48*70+m.sw24*45)+m.poeW+(onprem?(m.servers*250+90):0)+30;m.upsVA=ceil(m.upsW/0.6*1.25,100);
  m.spare=Math.max(1,Math.ceil(n/20));
  /* network zones */
  var Z=[["Management",10,m.sw48+m.sw24+m.aps+3,"Switches, access points, firewall, out-of-band. Reachable only from admin workstations."]];
  if(onprem)Z.push(["Servers",20,m.servers*4+6,"File server or NAS, virtual machines, the backup device."]);
  Z.push(["Clients",30,n+m.spare,"Desktops and laptops on cable."]);
  if(o.phones==="desk")Z.push(["Voice",40,n,"Desk phones, with priority on the switch."]);
  Z.push(["Printers",50,m.printers+2,"Printers and scanners. They get old firmware and deserve their own corner."]);
  Z.push(["Wi-Fi staff",60,Math.ceil(n*1.5),"Laptops and company phones on wireless, signed in per user."]);
  Z.push(["Wi-Fi guest",70,Math.max(20,n),"Visitors and private phones. Internet only, no route to anything internal."]);
  if(o.things)Z.push(["Things",80,m.cams+Math.ceil(n/8)+5,"Cameras, door system, TV screens, sensors. May talk to their controller, nothing else."]);
  if(o.pub)Z.push(["DMZ",90,4,"Anything reachable from the internet. Better: host it somewhere else."]);
  m.zones=Z;return m;
}

function buy(o,m){
  var L=[];function add(what,size,why){L.push([what,size,why])}
  add("Internet line",m.down+" Mbit/s down, "+m.up+" Mbit/s up, fixed IP address","Sized at about "+(o.data==="cloud"||o.phones==="soft"?"8":"5")+" Mbit/s per person. Upload matters more than providers advertise: video calls, cloud sync and remote access all go up.");
  if(m.second)add("Second internet line","A different technology from a different provider: cable next to fibre, or an LTE/5G router","With "+(o.data==="cloud"?"all data in the cloud":o.phones!=="mobile"?"the phones on the network":"this many people")+", a dead line stops all work. The firewall switches over by itself.");
  add("Firewall","Business class, sized for "+m.down+" Mbit/s with inspection switched on"+(m.vpn?", "+m.vpn+" VPN users at once":"")+", "+(m.zones.length)+" VLANs","The device that separates the zones and terminates the VPN. Look at the throughput with security features on, not the headline number. Budget for the licence renewal.");
  var sw=[];if(m.sw48)sw.push(m.sw48+" × 48 ports");if(m.sw24)sw.push(m.sw24+" × 24 ports");
  add("Switches",sw.join(" and ")+", managed, gigabit, PoE+ with "+m.poeBudget+" W budget in total","About "+m.ports+" ports in use, planned with 30% spare. Managed because VLANs need it. The PoE budget covers "+m.aps+" access points"+(m.deskPhones?", "+m.deskPhones+" phones":"")+(m.cams?", "+m.cams+" cameras":"")+".");
  add("Wi-Fi access points",m.aps+", Wi-Fi 6 or newer, ceiling mounted, powered over the network cable, centrally managed","One per 20 people or per large room, at least two so one can fail. More small cells beat one strong one. A cable to every access point: no repeaters.");
  if(o.data!=="cloud"){
    add(m.servers>1?"Servers":"Server or NAS",(m.servers>1?"Two hosts for virtual machines, or one host and a NAS":o.n<=15?"A NAS with four or more bays":"One host for virtual machines, or a business NAS")+", about "+m.nasTB+" TB usable, disks in RAID 6 or mirrored","Based on 40 GB per person today and room to triple. RAID keeps it running when a disk fails. It is not the backup.");
    add("Backup storage in the office","A second device, not a second folder: "+m.backupTB+" TB","Holds the versions: daily, weekly, monthly. Must not be reachable with the same admin password as the server.");
    add("Backup outside the office","Cloud storage with object lock, or a second NAS at another site, about "+m.backupTB+" TB","The copy that survives fire, theft and ransomware. Immutable for at least 14 days.");
  }
  add("Backup for the cloud data","A backup service for mailboxes, cloud files and chats, per user","The provider keeps the service running. Deleted or encrypted data is your problem after the retention window, which is short.");
  add("UPS","Line-interactive or online, about "+m.upsVA+" VA, with a network card or USB to shut down "+(o.data!=="cloud"?"the server":"the equipment")+" cleanly","Carries roughly "+m.upsW+" W (firewall, switches with PoE"+(o.data!=="cloud"?", server, NAS":"")+") through short outages and shuts down in order during long ones. Replace the battery every three to four years.");
  add("Rack or wall cabinet","Lockable, with ventilation, a patch panel and room to grow","Network gear on a shelf under a desk gets unplugged for the vacuum cleaner.");
  add("Laptops and desktops",o.n+" plus "+m.spare+" spare, with SSD, 16 GB memory, TPM, three years of on-site warranty","The spare turns a broken laptop from an emergency into a swap. The same model family for everyone keeps images, docks and chargers interchangeable.");
  if(o.phones==="desk")add("Phones",o.n+" desk phones with a pass-through port, from a cloud telephone system","The PC plugs into the phone, so one wall socket per desk is enough.");
  if(o.phones==="soft")add("Headsets",o.n+" certified headsets"+(o.n>=10?", and one or two meeting room devices":""),"Calls run through the laptop. The headset decides how they sound.");
  add("Printers",m.printers+" multifunction device"+(m.printers>1?"s":"")+" on a service contract","One per about 15 people. Lease with service included: toner and repairs are somebody else's ticket.");
  add("Identity and mail","One cloud directory with a business licence per person, multi-factor sign-in for everyone","One account per person for everything. Shared logins and personal mail addresses for company work end here.");
  add("Password manager","A team password manager, one seat per person","Stops the spreadsheet with the passwords, and gives you a place for the shared ones.");
  add("Endpoint protection and patching","Managed antivirus or EDR on every device, and a tool that installs updates and shows what is missing","What you cannot see, you cannot patch. For "+o.n+" devices, central management pays off from day one.");
  add("Documentation","A place for the network plan, the admin passwords (in the vault), the provider contacts and the recovery steps","Printed once, in an envelope, in the safe: the internet may be down when you need it.");
  return L;
}

var CHECK=[
 ["network",[
  ["The firewall is the only way in and out, and its admin page is not reachable from the internet.",null],
  ["Every zone in the plan is its own VLAN, and the firewall decides what may pass between them.",null],
  ["The guest Wi-Fi reaches the internet and nothing else. Test it from a phone.",null],
  ["Staff Wi-Fi signs in per person (WPA-Enterprise) or at least has a password that changes when someone leaves.",null],
  ["Switches, access points and the firewall have their default passwords changed and current firmware.",null],
  ["Unused wall sockets are disabled on the switch or sit in a VLAN that leads nowhere.",null],
  ["The second internet line was tested by pulling the cable of the first.",function(o,m){return m.second}],
  ["Nothing in the office is reachable from the internet through a port forward.",function(o){return !o.pub}],
  ["The public service sits in the DMZ, is patched monthly and cannot reach the internal zones.",function(o){return o.pub}],
  ["Cameras and other things cannot reach the client or server zones.",function(o){return o.things}]]],
 ["identity and access",[
  ["Everyone has their own account. No shared logins, no generic \"office\" user.",null],
  ["Multi-factor sign-in is on for every account, admins first.",null],
  ["Admin work is done with separate admin accounts, not with the daily one.",null],
  ["Two emergency admin accounts exist, with long passwords in the safe, and an alert when they are used.",null],
  ["There is a written list of what a new person gets and what a leaver loses, and it is used.",null],
  ["Shared passwords live in the password manager, not in mails, notes or spreadsheets.",null]]],
 ["devices",[
  ["Every laptop and desktop has disk encryption on, and the recovery keys are stored centrally.",null],
  ["Updates for the system and for applications install automatically, and someone looks at the report.",null],
  ["Users work without local admin rights.",null],
  ["Every device is in the management tool. A device that is not, does not get company data.",null],
  ["Phones that read company mail have a screen lock and can be wiped remotely.",null],
  ["Printers have a changed admin password and no open services they do not need.",null]]],
 ["remote work",[
  ["Remote access goes through the VPN or a cloud service with multi-factor sign-in. No remote desktop open to the internet.",function(o){return o.remote!=="none"}],
  ["The office range does not collide with common home networks (not 192.168.0.x, 192.168.1.x, 192.168.178.x).",function(o){return o.remote!=="none"}],
  ["A lost laptop can be locked and wiped, and that has been tried once.",function(o){return o.remote!=="none"}]]],
 ["backup and recovery",[
  ["Server and NAS are backed up every night to a second device.",function(o){return o.data!=="cloud"}],
  ["One copy is outside the office and cannot be changed or deleted for at least two weeks.",null],
  ["Mailboxes and cloud files are backed up by something other than the provider's recycle bin.",null],
  ["A restore of single files is tested every month, a complete restore once a year, and the time it took is written down.",null],
  ["The backup system has its own admin login, different from the domain or cloud admin.",null],
  ["The UPS shuts the equipment down cleanly, tested by pulling its plug.",null]]],
 ["when things go wrong",[
  ["There is a one-page plan: who decides, who is called, where the passwords are, how to reach the provider.",null],
  ["Everyone knows whom to tell when they clicked on something, and that telling is welcome.",null],
  ["The network plan and the list of devices exist and were updated in the last six months.",null],
  ["Someone other than the main IT person can get to the admin passwords in an emergency.",null]]]
];

function render(){
  var o=opts(),m=model(o);
  /* picture */
  var pic=$("bp-pic");pic.replaceChildren();
  var top=el("div","bprow");var net=el("div","bpbox net");net.append(el("b",null,"Internet"),el("span",null,m.down+"/"+m.up+" Mbit/s"+(m.second?" + second line":"")));top.append(net);
  var cloud=el("div","bpbox cloud");cloud.append(el("b",null,"Cloud"),el("span",null,"mail, directory"+(o.data!=="onprem"?", files":"")+(o.phones!=="mobile"?", telephony":"")+", backup copy"));top.append(cloud);
  if(o.remote!=="none"){var rem=el("div","bpbox cloud");rem.append(el("b",null,"Remote workers"),el("span",null,"up to "+m.vpn+" by VPN"));top.append(rem)}
  var fw=el("div","bpbox fw");fw.append(el("b",null,"Firewall"),el("span",null,"routes between the zones"+(m.vpn?", VPN":"")));
  var sw=el("div","bpbox sw");sw.append(el("b",null,"Switch"+(m.sw48+m.sw24>1?"es":"")),el("span",null,[m.sw48?m.sw48+" × 48":"",m.sw24?m.sw24+" × 24":""].filter(Boolean).join(" and ")+" ports, PoE "+m.poeBudget+" W, "+m.aps+" access points"));
  var zones=el("div","bpzones");m.zones.forEach(function(z){var b=el("div","bpzone z"+z[1]);b.append(el("i",null,"VLAN "+z[1]),el("b",null,z[0]),el("span",null,z[3]));zones.append(b)});
  pic.append(top,el("div","bpline"),fw,el("div","bpline"),sw,el("div","bpline"),zones);
  /* plan link */
  var segs=m.zones.map(function(z){return encodeURIComponent(z[0])+":"+z[1]+":"+z[2]}).join(";");
  $("bp-iplink").href="ip-plan-builder.html#10.87.0.0_16|30|readable|"+segs;
  /* shopping list */
  var L=buy(o,m),tb=$("bp-buy");tb.replaceChildren();L.forEach(function(r){var tr=el("tr");tr.append(el("td",null,r[0]),el("td",null,r[1]),el("td",null,r[2]));tb.append(tr)});
  /* checklist */
  var host=$("bp-check"),total=0,done=0;host.replaceChildren();
  CHECK.forEach(function(g,gi){var items=g[1].map(function(it,ii){return {t:it[0],id:gi+"-"+ii,show:!it[1]||it[1](o,m)}}).filter(function(x){return x.show});if(!items.length)return;
    var sec=el("div","bpgroup");sec.append(el("h3",null,g[0]));var ul=el("ul","bpchk");
    items.forEach(function(it){total++;var li=el("li"),lab=el("label"),c=document.createElement("input");c.type="checkbox";c.checked=!!ticks[it.id];if(c.checked)done++;c.addEventListener("change",function(){ticks[it.id]=c.checked;if(!c.checked)delete ticks[it.id];render()});lab.append(c,el("span",null,it.t));li.append(lab);ul.append(li)});
    sec.append(ul);host.append(sec)});
  $("bp-prog").textContent=done+" of "+total+" done";$("bp-bar").style.width=(total?done/total*100:0)+"%";
  $("bp-sum").textContent="For "+o.n+" "+(o.n===1?"person":"people")+": "+m.zones.length+" network zones, "+(m.sw48+m.sw24)+" switch"+(m.sw48+m.sw24>1?"es":"")+", "+m.aps+" access points, "+L.length+" things on the list.";
  var q=["n="+o.n,"d="+o.data,"r="+o.remote,"p="+o.phones,"t="+(o.things?1:0),"x="+(o.pub?1:0),"c="+Object.keys(ticks).join(".")];
  try{history.replaceState(null,"","#"+q.join("&"))}catch(e){}
}
(function init(){
  var q={};location.hash.replace(/^#/,"").split("&").forEach(function(kv){var i=kv.indexOf("=");if(i>0)q[kv.slice(0,i)]=kv.slice(i+1)});
  if(q.n)$("bp-people").value=parseInt(q.n,10)||20;
  [["d","bp-data",["cloud","both","onprem"]],["r","bp-remote",["none","some","most"]],["p","bp-phones",["mobile","desk","soft"]]].forEach(function(x){if(x[2].indexOf(q[x[0]])>=0)$(x[1]).value=q[x[0]]});
  $("bp-things").checked=q.t==="1";$("bp-public").checked=q.x==="1";
  (q.c||"").split(".").forEach(function(k){if(/^\d+-\d+$/.test(k))ticks[k]=true});
  IDS.forEach(function(i){$(i).addEventListener("input",render);$(i).addEventListener("change",render)});
  $("bp-print").addEventListener("click",function(){window.print()});
  render();
})();
window.blueprint={model:model,buy:buy};
})();
