/* IT documentation generator: one handbook for a small environment, kept in a file you save. Nothing is stored in the browser. */
(function(){"use strict";
var $=function(i){return document.getElementById(i)};var ed=$("dg-editor");if(!ed)return;
function esc(s){return String(s===undefined||s===null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
/* field: [key, label, kind]  kind: t text, d date, y yes/no, a long text, s:<a|b|c> select */
var S=[
 {k:"company",t:"Company",one:true,intro:"Who this handbook is for, who keeps it and how current it is.",f:[["name","Company name"],["address","Address","a"],["phone","Main phone"],["itlead","Responsible for IT"],["itphone","IT phone, also out of hours"],["owner","Keeps this handbook"],["updated","Last checked","d"],["scope","What this handbook covers","a"]]},
 {k:"emergency",t:"Emergency page",one:true,intro:"The page that is printed, put in a red folder and found when nothing works. Plain steps, phone numbers, no passwords.",f:[["first","First call when IT is down (name and number)","a"],["attack","Suspected attack or ransomware: first steps","a"],["internet","Internet is down: what to check, whom to call","a"],["power","Power cut: what shuts down, what restarts in which order","a"],["vault","Where the passwords are kept (the place, never the passwords)","a"],["breakglass","Emergency admin access: who holds it, where the envelope is","a"],["insurance","Cyber insurance: insurer, policy number, hotline","a"],["printed","Where printed copies of this handbook are","a"]]},
 {k:"nets",t:"Networks",intro:"Every network with its address range. One line per VLAN or subnet.",f:[["name","Name"],["subnet","Subnet"],["vlan","VLAN"],["gw","Gateway"],["dhcp","DHCP from"],["dns","DNS servers"],["use","What is in it"]]},
 {k:"lines",t:"Internet lines",intro:"Lines, contracts and what you need when you call the provider.",f:[["provider","Provider"],["kind","Type and speed"],["ip","Public IP"],["cust","Customer and contract no."],["support","Support phone"],["router","Router or modem"],["note","Note"]]},
 {k:"netdev",t:"Network devices",intro:"Firewalls, switches, access points, routers.",f:[["name","Name"],["model","Model"],["ip","Management IP"],["where","Location"],["fw","Firmware"],["warranty","Support until","d"],["note","Note"]]},
 {k:"servers",t:"Servers and services",intro:"Physical servers, virtual machines and the cloud services the company runs on.",f:[["name","Name"],["role","Role"],["ip","IP or URL"],["os","OS or plan"],["where","Runs where"],["warranty","Warranty or support until","d"],["owner","Owner"]]},
 {k:"accounts",t:"Admin accounts",intro:"Which admin and service accounts exist and where their passwords are kept. Never the password itself.",f:[["system","System"],["account","Account"],["kind","Kind","s:admin|service|emergency|shared"],["mfa","MFA","y"],["vault","Password kept in (vault entry)"],["owner","Owner"]]},
 {k:"backups",t:"Backups",intro:"What is backed up, where to, and when a restore was last tried.",f:[["what","What"],["tool","Software"],["target","Target"],["when","Schedule"],["keep","Kept for"],["offsite","Copy outside the building or offline","y"],["tested","Last restore test","d"]]},
 {k:"contacts",t:"Contacts and vendors",intro:"Everyone you call: service providers, vendors, the person with the key to the server room.",f:[["name","Name"],["org","Company"],["role","For what"],["phone","Phone"],["mail","Email"],["contract","Contract or customer no."],["hours","Hours"]]}
];
var data={},cur="company",dirty=false,today=new Date();today.setHours(0,0,0,0);
function blank(){var d={};S.forEach(function(s){d[s.k]=s.one?{}:[]});return d}
data=blank();
function sec(k){for(var i=0;i<S.length;i++)if(S[i].k===k)return S[i]}
function clip(v,kind){v=String(v===undefined||v===null?"":v);if(kind==="y")return /^(y|j|1|true|ja|yes)/i.test(v)?"yes":/^(n|0|false|nein|no)/i.test(v)?"no":"";if(kind==="d"){var m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v.trim());if(m)return m[1]+"-"+("0"+m[2]).slice(-2)+"-"+("0"+m[3]).slice(-2);m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(v.trim());return m?m[3]+"-"+("0"+m[2]).slice(-2)+"-"+("0"+m[1]).slice(-2):""}return v.slice(0,kind==="a"?1200:200)}
function status(t){$("dg-status").textContent=t}
function touch(){dirty=true;renderBook()}
function iso(x){return x.getFullYear()+"-"+("0"+(x.getMonth()+1)).slice(-2)+"-"+("0"+x.getDate()).slice(-2)}
function days(s){if(!s)return null;var p=s.split("-");return Math.round((new Date(+p[0],+p[1]-1,+p[2])-today)/864e5)}
function filled(o){return Object.keys(o).some(function(k){return String(o[k]||"").trim()})}

/* ---------- editor ---------- */
function input(s,f,val,path){var id="dg-i-"+path+"-"+f[0],kind=f[2]||"t",h='<label for="'+id+'">'+esc(f[1]);
  if(kind==="a")h+='<textarea class="sel dgta" id="'+id+'" data-p="'+path+'" data-f="'+f[0]+'" rows="3" maxlength="1200">'+esc(val)+'</textarea>';
  else if(kind==="y")h+='<select class="sel" id="'+id+'" data-p="'+path+'" data-f="'+f[0]+'"><option value=""></option><option'+(val==="yes"?" selected":"")+'>yes</option><option'+(val==="no"?" selected":"")+'>no</option></select>';
  else if(kind.indexOf("s:")===0)h+='<select class="sel" id="'+id+'" data-p="'+path+'" data-f="'+f[0]+'"><option value=""></option>'+kind.slice(2).split("|").map(function(o){return '<option'+(val===o?" selected":"")+'>'+o+'</option>'}).join("")+'</select>';
  else h+='<input class="sel" id="'+id+'" data-p="'+path+'" data-f="'+f[0]+'" maxlength="200" autocomplete="off" type="'+(kind==="d"?"date":"text")+'" value="'+esc(val)+'">';
  return h+'</label>'}
function renderTabs(){$("dg-tabs").innerHTML=S.map(function(s){var n=s.one?(filled(data[s.k])?"✓":""):(data[s.k].length||"");return '<button type="button" class="btn '+(s.k===cur?"solid":"ghost")+'" data-tab="'+s.k+'" aria-pressed="'+(s.k===cur)+'">'+esc(s.t)+(n!==""?' <span class="dgn">'+n+'</span>':'')+'</button>'}).join("")}
function renderEditor(){var s=sec(cur),h='<h2 class="plain">'+esc(s.t)+'</h2><p class="dim">'+esc(s.intro)+'</p>';
  if(s.one){h+='<div class="sim">'+s.f.map(function(f){return input(s,f,data[s.k][f[0]],s.k)}).join("")+'</div>'}
  else{if(!data[s.k].length)h+='<p class="dim">No lines yet.</p>';
    data[s.k].forEach(function(r,i){h+='<fieldset class="dgrow"><legend>'+esc(s.t)+' '+(i+1)+'</legend><div class="sim">'+s.f.map(function(f){return input(s,f,r[f[0]],s.k+"."+i)}).join("")+'</div><div class="ctl"><button type="button" class="btn ghost" data-up="'+i+'"'+(i?'':' disabled')+'>Move up</button><button type="button" class="btn ghost" data-dup="'+i+'">Copy line</button><button type="button" class="btn ghost" data-del="'+i+'">Delete line</button></div></fieldset>'});
    h+='<div class="ctl" style="margin-top:12px"><button type="button" class="btn solid" data-add="1">Add a line</button></div>'}
  ed.innerHTML=h;renderTabs()}
$("dg-tabs").addEventListener("click",function(e){var b=e.target.closest("[data-tab]");if(!b)return;cur=b.getAttribute("data-tab");renderEditor();var x=ed.querySelector("input,textarea,select");if(x)x.focus()});
ed.addEventListener("input",function(e){var t=e.target,p=t.getAttribute("data-p");if(!p)return;var s=sec(p.split(".")[0]),f=t.getAttribute("data-f"),kind="t";s.f.forEach(function(x){if(x[0]===f)kind=x[2]||"t"});
  var o=s.one?data[s.k]:data[s.k][+p.split(".")[1]];o[f]=clip(t.value,kind);touch();renderTabs()});
ed.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var L=data[cur],i;
  if(b.hasAttribute("data-add")){L.push({});renderEditor();touch();var fs=ed.querySelectorAll(".dgrow");var x=fs[fs.length-1].querySelector("input");if(x)x.focus();return}
  if(b.hasAttribute("data-del")){i=+b.getAttribute("data-del");if(filled(L[i])&&!window.confirm("Delete this line?"))return;L.splice(i,1)}
  else if(b.hasAttribute("data-dup")){i=+b.getAttribute("data-dup");L.splice(i+1,0,JSON.parse(JSON.stringify(L[i])))}
  else if(b.hasAttribute("data-up")){i=+b.getAttribute("data-up");if(i>0){var t=L[i-1];L[i-1]=L[i];L[i]=t}}
  else return;renderEditor();touch()});

/* ---------- checks ---------- */
var SECRET=/(pass(word|wort|wd)?|kennwort|pwd|\bpw\b|secret|api[\s_-]?key|token|\bpin\b)\s*[:=]\s*\S|\b(?=[A-Za-z0-9!$%&*#@?+_-]{12,}\b)(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[!$%&*#@?+_-])\S+/i;
function checks(){var out=[];function add(sev,where,txt){out.push([sev,where,txt])}
  var c=data.company,e=data.emergency;
  if(!String(c.name||"").trim())add("med","Company","No company name: the cover page stays empty.");
  if(!String(e.first||"").trim())add("high","Emergency page","Nobody to call when IT is down. This is the one line that must never be empty.");
  if(!String(e.vault||"").trim())add("med","Emergency page","It does not say where the passwords are kept.");
  if(!String(e.breakglass||"").trim())add("med","Emergency page","No emergency admin access described. If the only admin is ill or gone, who gets in?");
  var d=days(c.updated);if(d===null)add("low","Company","No date for the last check. Put one in, so a reader knows how old this is.");else if(d<-183)add("med","Company","Last checked "+(-d)+" days ago. Check it at least every six months.");
  if(!data.backups.length)add("high","Backups","No backups listed.");
  data.backups.forEach(function(b,i){var n=b.what||("line "+(i+1)),t=days(b.tested);
    if(t===null)add("high","Backups",n+": no restore test on record. A backup nobody has restored is a hope, not a backup.");else if(t<-183)add("med","Backups",n+": last restore test "+(-t)+" days ago.");
    if(b.offsite==="no")add("med","Backups",n+": no copy outside the building or offline. Fire, theft and ransomware take the backup too.")});
  var adm=0,emerg=0;data.accounts.forEach(function(a,i){var n=(a.account||"line "+(i+1))+(a.system?" ("+a.system+")":"");if(a.kind==="admin"||a.kind==="emergency")adm++;if(a.kind==="emergency")emerg++;
    if(a.kind==="admin"&&a.mfa==="no")add("high","Admin accounts",n+": admin account without MFA.");
    if(a.kind==="shared")add("med","Admin accounts",n+": shared account. Nobody can tell afterwards who did what.");
    if(!String(a.vault||"").trim())add("low","Admin accounts",n+": no vault entry named.")});
  if(data.accounts.length&&!emerg)add("low","Admin accounts","No emergency (break-glass) account listed.");
  [["servers","Servers and services"],["netdev","Network devices"]].forEach(function(p){data[p[0]].forEach(function(r,i){var n=r.name||("line "+(i+1)),w=days(r.warranty);
    if(w!==null&&w<0)add("med",p[1],n+": support ended "+(-w)+" days ago.");else if(w!==null&&w<=90)add("low",p[1],n+": support ends in "+w+" days.");
    if(p[0]==="servers"&&!String(r.owner||"").trim())add("low",p[1],n+": no owner.")})});
  data.lines.forEach(function(l,i){if(!String(l.support||"").trim())add("low","Internet lines",(l.provider||"line "+(i+1))+": no support phone. That is the number you need when the line is down.")});
  if(!data.contacts.length)add("med","Contacts and vendors","No contacts listed.");
  /* secrets anywhere */
  S.forEach(function(s){var list=s.one?[data[s.k]]:data[s.k];list.forEach(function(r,i){s.f.forEach(function(f){var v=String(r[f[0]]||"");if(v&&SECRET.test(v))add("high",s.t,(s.one?"":(s.t+" line "+(i+1)+", "))+f[1]+": this looks like a password or key. Remove it: this handbook gets printed and copied.")})})});
  var o={high:0,med:1,low:2};out.sort(function(a,b){return o[a[0]]-o[b[0]]});return out}

/* ---------- handbook ---------- */
function para(v){return esc(v).replace(/\n/g,"<br>")}
function renderBook(){var c=data.company,h="",r=checks(),sevn={high:"high",med:"medium",low:"low"};
  var st={high:0,med:0,low:0};r.forEach(function(x){st[x[0]]++});
  $("dg-stats").innerHTML='<div class="stats"><div class="stat"><span class="stat-k">lines</span><b class="stat-v" data-raw="1">'+S.reduce(function(a,s){return a+(s.one?0:data[s.k].length)},0)+'</b></div><div class="stat"><span class="stat-k">must fix</span><b class="stat-v" data-raw="1">'+st.high+'</b></div><div class="stat"><span class="stat-k">should fix</span><b class="stat-v" data-raw="1">'+st.med+'</b></div><div class="stat"><span class="stat-k">hints</span><b class="stat-v" data-raw="1">'+st.low+'</b></div></div>';
  h+='<section class="dgcover"><p class="dgk">IT handbook</p><h2 class="dgtitle">'+esc(c.name||"Company name")+'</h2>'+(c.address?'<p>'+para(c.address)+'</p>':'')+'<dl class="dgdl">'+[["Responsible for IT",c.itlead],["IT phone",c.itphone],["Main phone",c.phone],["Keeps this handbook",c.owner],["Last checked",c.updated],["Printed",iso(today)]].filter(function(x){return x[1]}).map(function(x){return '<dt>'+x[0]+'</dt><dd>'+esc(x[1])+'</dd>'}).join("")+'</dl>'+(c.scope?'<p class="dim">'+para(c.scope)+'</p>':'')+'<p class="dgwarn">Confidential. Contains no passwords. Keep printed copies locked away and replace them after every change.</p></section>';
  var e=data.emergency,es=sec("emergency");
  h+='<section class="dgpage dgemerg"><h2 class="dgh">Emergency page</h2>'+(filled(e)?es.f.filter(function(f){return String(e[f[0]]||"").trim()}).map(function(f){return '<div class="dgbox"><h3>'+esc(f[1])+'</h3><p>'+para(e[f[0]])+'</p></div>'}).join(""):'<p class="dim">Not filled in yet.</p>')+'</section>';
  var toc=S.filter(function(s){return !s.one&&data[s.k].length});
  if(toc.length)h+='<section class="dgpage"><h2 class="dgh">Contents</h2><ol class="dgtoc"><li>Emergency page</li>'+toc.map(function(s){return '<li>'+esc(s.t)+' <span class="dim">('+data[s.k].length+')</span></li>'}).join("")+(r.length?'<li>Open points</li>':'')+'</ol></section>';
  toc.forEach(function(s){var cols=s.f.filter(function(f){return data[s.k].some(function(x){return String(x[f[0]]||"").trim()})});
    h+='<section class="dgsec"><h2 class="dgh">'+esc(s.t)+'</h2><div class="tw"><table class="tbl dgtbl"><thead><tr>'+cols.map(function(f){return '<th scope="col">'+esc(f[1])+'</th>'}).join("")+'</tr></thead><tbody>'+data[s.k].map(function(x){return '<tr>'+cols.map(function(f){return '<td>'+para(x[f[0]])+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table></div></section>'});
  if(r.length)h+='<section class="dgsec"><h2 class="dgh">Open points</h2><ul class="dgchk">'+r.map(function(x){return '<li><span class="sevtag s-'+x[0]+'">'+sevn[x[0]]+'</span> <b>'+esc(x[1])+':</b> '+esc(x[2])+'</li>'}).join("")+'</ul></section>';
  else if(filled(c))h+='<section class="dgsec"><h2 class="dgh">Open points</h2><p>None found by the checks. Read it once more with someone who does not know the environment.</p></section>';
  $("dg-book").innerHTML=h}

/* ---------- file in, file out ---------- */
function stamp(){return iso(today)}
function fname(ext){return String(data.company.name||"it").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)+"-handbook-"+stamp()+"."+ext}
function dl(name,text,type){var b=new Blob([text],{type:type}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u)},200)}
function toJson(){return JSON.stringify({kind:"admin_hub-itdoc",version:1,saved:new Date().toISOString(),data:data},null,1)}
function load(o){if(!o||typeof o!=="object")throw new Error("not a handbook file");var src=o.kind==="admin_hub-itdoc"?o.data:o,d=blank();
  S.forEach(function(s){var v=src[s.k];if(s.one){if(v&&typeof v==="object")s.f.forEach(function(f){if(v[f[0]]!==undefined)d[s.k][f[0]]=clip(v[f[0]],f[2])})}
    else if(Array.isArray(v))v.slice(0,500).forEach(function(r){if(!r||typeof r!=="object")return;var x={};s.f.forEach(function(f){if(r[f[0]]!==undefined&&r[f[0]]!=="")x[f[0]]=clip(r[f[0]],f[2])});if(filled(x))d[s.k].push(x)})});
  data=d;dirty=false;renderEditor();renderBook()}
function toMd(){var c=data.company,m="# IT handbook: "+(c.name||"")+"\n\n";sec("company").f.forEach(function(f){if(c[f[0]])m+="- **"+f[1]+":** "+String(c[f[0]]).replace(/\n/g," ")+"\n"});
  m+="\n## Emergency page\n\n";sec("emergency").f.forEach(function(f){if(data.emergency[f[0]])m+="### "+f[1]+"\n\n"+data.emergency[f[0]]+"\n\n"});
  S.forEach(function(s){if(s.one||!data[s.k].length)return;var cols=s.f.filter(function(f){return data[s.k].some(function(x){return x[f[0]]})});function q(v){return String(v||"").replace(/\|/g,"\\|").replace(/\n/g,"<br>")}
    m+="## "+s.t+"\n\n| "+cols.map(function(f){return f[1]}).join(" | ")+" |\n|"+cols.map(function(){return "---"}).join("|")+"|\n"+data[s.k].map(function(x){return "| "+cols.map(function(f){return q(x[f[0]])}).join(" | ")+" |"}).join("\n")+"\n\n"});
  var r=checks();if(r.length)m+="## Open points\n\n"+r.map(function(x){return "- ["+x[0]+"] "+x[1]+": "+x[2]}).join("\n")+"\n";return m}
$("dg-save").addEventListener("click",function(){dl(fname("json"),toJson(),"application/json");dirty=false;status("Saved as a file. Open it here next time to carry on.")});
$("dg-md").addEventListener("click",function(){dl(fname("md"),toMd(),"text/markdown");status("Markdown file written, for a wiki or a Git repository.")});
$("dg-file").addEventListener("change",function(){var f=this.files&&this.files[0];if(!f)return;if(f.size>2e6){status("That file is larger than a handbook can be.");this.value="";return}var rd=new FileReader();rd.onload=function(){try{load(JSON.parse(String(rd.result)));status("Opened "+f.name+".")}catch(e){status("This is not a handbook file saved by this page.")}};rd.readAsText(f);this.value=""});
$("dg-print").addEventListener("click",function(){window.print()});
$("dg-clear").addEventListener("click",function(){if(window.confirm("Start an empty handbook? Anything not saved to a file is lost.")){data=blank();dirty=false;cur="company";renderEditor();renderBook();status("Empty.")}});
$("dg-sample").addEventListener("click",function(){if(dirty&&!window.confirm("Replace what you typed with the example?"))return;function dd(n){var x=new Date(today);x.setDate(x.getDate()+n);return iso(x)}
  load({company:{name:"Example Joinery Ltd",address:"12 Harbour Road\nExampletown",phone:"+49 000 1000",itlead:"Anna Berg (office manager)",itphone:"+49 000 1009, out of hours +49 170 0000000",owner:"Anna Berg",updated:dd(-40),scope:"Office and workshop, 18 staff, one site. Microsoft 365 for mail and files, one server for the joinery software."},
   emergency:{first:"Ben Ortiz, Example IT Service, +49 000 2000 (Mon to Fri 8 to 17), emergency line +49 000 2099",attack:"1. Pull the network cable of the affected PC, leave it switched on.\n2. Call Ben Ortiz.\n3. Do not pay, do not delete anything.\n4. Call the cyber insurance hotline.",internet:"Check the router lights in the server cupboard (green = fine). Restart the router once. Still down: call the provider with the customer number on the Internet lines page.",power:"The UPS holds the server for 20 minutes and shuts it down. When power is back: router, firewall, switch, then the server, then PCs.",vault:"Company password manager, collection \"IT admin\". Anna Berg and Ben Ortiz have access.",breakglass:"Sealed envelope with the emergency admin account in the safe in the managing director's office.",insurance:"Example Insurance, policy 123-456, hotline +49 000 3000 (24/7)",printed:"Red folder in the managing director's office and in the server cupboard."},
   nets:[{name:"Office",subnet:"192.168.10.0/24",vlan:"10",gw:"192.168.10.1",dhcp:"Firewall",dns:"192.168.10.1",use:"PCs, printers"},{name:"Servers",subnet:"192.168.20.0/24",vlan:"20",gw:"192.168.20.1",dhcp:"none, fixed",dns:"192.168.20.1",use:"Server, NAS, UPS"},{name:"Guest Wi-Fi",subnet:"10.99.0.0/24",vlan:"99",gw:"10.99.0.1",dhcp:"Firewall",use:"Internet only"}],
   lines:[{provider:"Example Telecom",kind:"Fibre 250/50",ip:"203.0.113.24 (fixed)",cust:"KD 4471-22",support:"+49 000 4000",router:"Provider router in bridge mode"}],
   netdev:[{name:"fw01",model:"Example Firewall 60",ip:"192.168.10.1",where:"Server cupboard",fw:"7.4.3",warranty:dd(25)},{name:"sw01",model:"24-port PoE switch",ip:"192.168.20.2",where:"Server cupboard",fw:"2.1",warranty:dd(400)},{name:"ap01, ap02",model:"Wi-Fi 6 access points",ip:"192.168.20.11, .12",where:"Office, workshop"}],
   servers:[{name:"srv01",role:"Joinery software, file share",ip:"192.168.20.10",os:"Windows Server 2022",where:"Server cupboard",warranty:dd(-30),owner:"Ben Ortiz"},{name:"nas01",role:"Backup target",ip:"192.168.20.20",os:"NAS",where:"Server cupboard",warranty:dd(500),owner:"Ben Ortiz"},{name:"Microsoft 365",role:"Mail, Teams, OneDrive",ip:"admin.microsoft.com",os:"Business Premium",where:"Cloud"}],
   accounts:[{system:"Microsoft 365",account:"admin.anna",kind:"admin",mfa:"yes",vault:"IT admin / M365 Anna",owner:"Anna Berg"},{system:"Microsoft 365",account:"breakglass01",kind:"emergency",mfa:"yes",vault:"Envelope in the safe",owner:"Managing director"},{system:"Firewall",account:"admin",kind:"shared",mfa:"no",vault:"IT admin / fw01",owner:"Ben Ortiz"},{system:"srv01",account:"svc-backup",kind:"service",mfa:"",vault:"IT admin / backup service"}],
   backups:[{what:"srv01 complete",tool:"Example Backup",target:"nas01",when:"daily 22:00",keep:"30 days",offsite:"yes",tested:dd(-60)},{what:"Microsoft 365 mailboxes and OneDrive",tool:"Example Cloud Backup",target:"Provider cloud",when:"4 times a day",keep:"1 year",offsite:"yes"},{what:"Firewall configuration",tool:"Manual export",target:"nas01",when:"after changes",keep:"last 5",offsite:"no",tested:dd(-400)}],
   contacts:[{name:"Ben Ortiz",org:"Example IT Service",role:"IT support, server, firewall",phone:"+49 000 2000",mail:"support@example.com",contract:"Service contract 2024-17",hours:"Mon to Fri 8 to 17"},{name:"Support",org:"Example Telecom",role:"Internet line",phone:"+49 000 4000",contract:"KD 4471-22",hours:"24/7"},{name:"Hotline",org:"Example Joinery Software",role:"Joinery software",phone:"+49 000 5000",contract:"Customer 88123"},{name:"Caretaker",org:"Landlord",role:"Key to the server cupboard",phone:"+49 000 6000"}]});
  dirty=false;status("Example loaded. Every name and number in it is made up.")});
window.addEventListener("beforeunload",function(e){if(dirty){e.preventDefault();e.returnValue=""}});
renderEditor();renderBook();
window.dgTest={data:function(){return data},load:load,checks:checks,toMd:toMd,toJson:toJson};
})();
