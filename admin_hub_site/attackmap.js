(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e}

/* ---------- controls ---------- */
var GROUPS=[
 ["identity",[
  ["mfa","MFA for all users"],
  ["prmfa","Phishing-resistant MFA (passkeys, FIDO2, Windows Hello)"],
  ["numatch","Authenticator number matching"],
  ["legacy","Legacy authentication blocked"],
  ["cadevice","Compliant or hybrid-joined device required"],
  ["risk","Risk-based Conditional Access (ID Protection)"],
  ["devicecode","Device code flow blocked"],
  ["reginfo","Security info registration protected"],
  ["pim","Separate admin accounts, just-in-time roles (PIM)"],
  ["consent","User consent to apps restricted"],
  ["pwprot","Banned-password list and smart lockout"]]],
 ["mail and data",[
  ["fwd","External auto-forwarding blocked"],
  ["safelinks","Anti-phishing and Safe Links"],
  ["share","External sharing restricted"],
  ["audit","Audit log on, with alerts on rules, roles, credentials, policies"]]],
 ["on-premises",[
  ["gmsa","Service accounts: gMSA or 25+ character passwords, AES only"],
  ["tier","Tiered administration (no Domain Admin logons on workstations)"],
  ["edr","EDR on all endpoints and servers"],
  ["patch","Internet-facing systems patched within days, no exposed RDP"]]],
 ["business",[
  ["backup","Offline or immutable backups, restore tested"],
  ["callback","Payment changes verified by call-back"]]]
];
var CNAME={};GROUPS.forEach(function(g){g[1].forEach(function(c){CNAME[c[0]]=c[1]})});
var ALL=Object.keys(CNAME);
var PRESETS=[
 ["nothing",[]],
 ["security defaults",["mfa","legacy","numatch","pwprot"]],
 ["typical small business",["mfa","legacy","numatch","pwprot","fwd","edr","patch"]],
 ["hardened",ALL]
];

/* ---------- techniques ---------- */
var STAGES=["get in","take over","dig in","spread","cash out"];
// id, stage, name, mitre[], what, stops[[...all of]], reduces[], note, detect, links[[href,label]], next[]
var T=[
 {id:"spray",s:0,n:"Password spray and credential stuffing",m:["T1110.003","T1110.004"],
  w:"Attackers try a few common passwords against many accounts, or replay passwords leaked from other sites. Slow enough to stay under lockout thresholds.",
  stops:[["mfa","legacy"],["prmfa","legacy"]],red:["mfa","prmfa","pwprot","risk"],
  note:"MFA only closes this if legacy protocols are blocked as well. IMAP, POP and SMTP AUTH cannot ask for a second factor.",
  d:"Many failed sign-ins (error 50126) from one IP address across many accounts.",
  l:[["signin-analyzer.html","sign-in analyzer"],["password-strength.html","password strength"],["entra-id-hardening-checklist.html","Entra ID hardening"]],next:["legacyauth","privesc"]},
 {id:"aitm",s:0,n:"Adversary-in-the-middle phishing",m:["T1566.002","T1557","T1539"],
  w:"A phishing link leads to a reverse proxy that relays the real Microsoft sign-in page. The victim completes MFA and the proxy keeps the session cookie.",
  stops:[["prmfa"],["cadevice"]],red:["safelinks","risk"],
  note:"Push, SMS and one-time codes do not help: the victim completes them for the attacker. Passkeys and FIDO2 keys are bound to the real domain and refuse to sign in through the proxy.",
  d:"A sign-in from an unfamiliar IP, then the same session appearing from another country or with a different user agent.",
  l:[["aitm-phishing-explained.html","AiTM explained"],["aitm-help-desk.html","war story"],["phish-or-legit.html","phish or legit"]],next:["replay"]},
 {id:"fatigue",s:0,n:"MFA fatigue (push bombing)",m:["T1621"],
  w:"The attacker already has the password and triggers MFA prompts until the user approves one, sometimes with a phone call pretending to be IT.",
  stops:[["prmfa"]],red:["numatch","risk"],
  note:"Number matching makes blind approval much harder, but a user can still be talked into typing the number.",
  d:"Repeated error 500121 for one account, then a success.",
  l:[["signin-analyzer.html","sign-in analyzer"],["compromised-account-response-checklist.html","compromised account checklist"]],next:["privesc","mfareg","inbox"]},
 {id:"consent",s:0,n:"Consent phishing (malicious OAuth app)",m:["T1566.002","T1528"],
  w:"The user is asked to grant an app permissions such as reading mail. No password is stolen: the app gets its own tokens, which survive password resets.",
  stops:[["consent"]],red:["safelinks","audit"],
  note:"MFA is irrelevant here. The user signs in legitimately and then clicks Accept.",
  d:"Audit log: Consent to application by a non-admin, for an app from an unverified publisher.",
  l:[["oauth-flow-explained.html","OAuth flow explained"],["graph-permissions-reference.html","Graph permissions"]],next:["appcreds","datatheft"]},
 {id:"devicecode",s:0,n:"Device code phishing",m:["T1566.002","T1528"],
  w:"The attacker starts a device code sign-in and sends the code to the victim, who enters it on the genuine Microsoft device login page. The resulting tokens go to the attacker.",
  stops:[["devicecode"]],red:["cadevice","risk","safelinks"],
  note:"Phishing-resistant MFA alone does not stop this: the victim signs in on the real Microsoft page. Block the flow for everyone who does not need it. Requiring a compliant device usually blocks it too, because the flow cannot prove device state.",
  d:"Sign-in logs: authentication protocol Device code for users who never use it.",
  l:[["conditional-access-explained.html","Conditional Access explained"],["signin-analyzer.html","sign-in analyzer"]],next:["mfareg","datatheft","intphish"]},
 {id:"exploit",s:0,n:"Exploited internet-facing system",m:["T1190","T1133"],
  w:"An unpatched VPN gateway, firewall or web application, or RDP exposed to the internet, gives direct access to the internal network. No user has to click anything.",
  stops:[["patch","edr"]],red:["patch","edr"],
  note:"Patching speed is the control. Entries in the CISA KEV catalog are being exploited right now.",
  d:"Edge-device logs, new local accounts on the appliance, EDR alerts on the first internal host.",
  l:[["cve.html","exploited-now"],["patch-tuesday.html","Patch Tuesday"],["server-hardening-checklist.html","server hardening"]],next:["kerberoast","rdp"]},

 {id:"replay",s:1,n:"Session token replay",m:["T1550.004","T1539"],
  w:"A stolen session cookie or refresh token is loaded into the attacker's browser. They are signed in as the user with no password and no MFA prompt.",
  stops:[["cadevice"]],red:["risk"],
  note:"A stolen token is already past MFA. With a device requirement it cannot be renewed from the attacker's machine. Risk policies and continuous access evaluation shorten the window.",
  d:"One session from two IPs or countries; sign-ins from scripted user agents such as axios.",
  l:[["signin-analyzer.html","sign-in analyzer"],["aitm-phishing-explained.html","AiTM explained"]],next:["inbox","fwd","mfareg"]},
 {id:"legacyauth",s:1,n:"Legacy protocol sign-in without MFA",m:["T1078.004"],
  w:"IMAP, POP, SMTP AUTH and old Office clients accept a username and password only. With a valid password the attacker reads mail and never sees an MFA prompt.",
  stops:[["legacy"]],red:[],
  d:"Sign-ins with client app IMAP4, POP3, Authenticated SMTP or Other clients.",
  l:[["signin-analyzer.html","sign-in analyzer"],["m365-security-checklist.html","M365 security checklist"]],next:["inbox","fwd","datatheft"]},
 {id:"privesc",s:1,n:"Compromised account has standing admin rights",m:["T1078.004","T1098.003"],
  w:"If the phished account is permanently Global Administrator, or the admin reads mail with the admin account, one phish is a tenant takeover.",
  stops:[["pim","prmfa"]],red:["pim","prmfa"],
  note:"Admin accounts without a mailbox, roles activated only when needed, and phishing-resistant MFA on those accounts.",
  d:"Audit log: role assignment changes, PIM activations outside working hours.",
  l:[["entra-id-roles-reference.html","Entra roles"],["entra-id-hardening-checklist.html","Entra ID hardening"]],next:["appcreds","fed","catamper","logs"]},
 {id:"kerberoast",s:1,n:"Kerberoasting",m:["T1558.003"],
  w:"Any domain user can request a service ticket for an account with an SPN and crack it offline. Weak service-account passwords fall within hours.",
  stops:[["gmsa"]],red:["tier"],
  d:"Event 4769 with RC4 encryption (0x17) for many services from one host.",
  l:[["kerberos-explained.html","Kerberos explained"],["kerberoast-service-account.html","war story"],["event-id-reference.html","event IDs"]],next:["rdp","dcsync"]},

 {id:"inbox",s:2,n:"Inbox rules that hide mail",m:["T1564.008"],
  w:"A rule moves replies and security warnings into RSS Feeds or Conversation History, so the real owner never sees the attacker's conversation.",
  stops:[],red:["audit"],
  note:"No setting prevents this. Speed of detection is the control.",
  d:"Audit log: New-InboxRule or Set-InboxRule with move or delete actions shortly after a risky sign-in.",
  l:[["exchange-online-deep-dive.html","Exchange Online deep dive"],["compromised-account-response-checklist.html","compromised account checklist"]],next:["intphish","bec"]},
 {id:"fwd",s:2,n:"External mail forwarding",m:["T1114.003"],
  w:"A forwarding rule or mailbox-level forwarding sends a copy of every message to an outside address. It keeps working after the password is reset.",
  stops:[["fwd"]],red:["audit"],
  d:"Auto-forwarded messages report; audit events for Set-Mailbox with a forwarding address.",
  l:[["exchange-online-deep-dive.html","Exchange Online deep dive"],["m365-security-checklist.html","M365 security checklist"]],next:["bec","datatheft"]},
 {id:"mfareg",s:2,n:"Attacker registers their own MFA method",m:["T1556.006","T1098.005"],
  w:"With a live session the attacker adds an authenticator app or phone number. After the password reset they still pass MFA.",
  stops:[["reginfo"]],red:["audit","risk"],
  d:"Audit log: User registered security info, shortly after a sign-in from a new location.",
  l:[["compromised-account-response-checklist.html","compromised account checklist"],["conditional-access-explained.html","Conditional Access explained"]],next:["datatheft","intphish"]},
 {id:"appcreds",s:2,n:"New credentials on an app registration",m:["T1098.001"],
  w:"The attacker adds a client secret or certificate to an application with high permissions and signs in as the app. No user account, no MFA, and user-targeted Conditional Access does not apply.",
  stops:[],red:["pim","audit","consent"],
  d:"Audit log: Add service principal credentials, or Update application: Certificates and secrets management.",
  l:[["graph-permissions-reference.html","Graph permissions"],["entra-id-hardening-checklist.html","Entra ID hardening"]],next:["datatheft"]},
 {id:"fed",s:2,n:"Rogue federation trust (Golden SAML)",m:["T1484.002","T1606.002"],
  w:"With Global Administrator rights, or the AD FS token-signing key, the attacker can mint sign-in tokens for any user, MFA claim included.",
  stops:[],red:["pim","audit","tier"],
  d:"Audit log: Set federation settings on domain, or Set domain authentication.",
  l:[["entra-id-hardening-checklist.html","Entra ID hardening"]],next:["datatheft"]},
 {id:"catamper",s:2,n:"Conditional Access policy tampering",m:["T1556.009"],
  w:"An attacker with the right role adds an exclusion for their account or a trusted location for their IP. Protection is switched off quietly for one identity.",
  stops:[],red:["pim","audit"],
  d:"Audit log: Update conditional access policy. Alert on every change.",
  l:[["ca-analyzer.html","CA policy analyzer"],["conditional-access-explained.html","Conditional Access explained"]],next:["datatheft"]},
 {id:"logs",s:2,n:"Audit logging switched off",m:["T1685.002"],
  w:"Mailbox auditing is bypassed for one account, or audit settings are changed, to remove the evidence trail before data is taken.",
  stops:[],red:["pim","audit"],
  d:"Audit events for Set-MailboxAuditBypassAssociation or Set-AdminAuditLogConfig.",
  l:[["log-file-locations-reference.html","log locations"]],next:["datatheft"]},

 {id:"intphish",s:3,n:"Internal phishing from a real mailbox",m:["T1534"],
  w:"Mail from a colleague's genuine account passes every spam and authentication check. One compromised mailbox becomes ten.",
  stops:[],red:["safelinks","prmfa"],
  d:"A burst of outbound mail with similar subjects from one account; users reporting it.",
  l:[["phish-or-legit.html","phish or legit"],["aitm-help-desk.html","war story"]],next:["bec"]},
 {id:"rdp",s:3,n:"Lateral movement with admin credentials",m:["T1021.001"],
  w:"Credentials of an administrator who logged on to a compromised machine are reused over RDP or SMB to reach the servers.",
  stops:[["tier","edr"]],red:["tier","edr"],
  d:"Event 4624 with logon type 10 or 3 between machines that never normally talk to each other.",
  l:[["event-id-reference.html","event IDs"],["server-hardening-checklist.html","server hardening"]],next:["dcsync","ransom"]},
 {id:"dcsync",s:3,n:"DCSync and Golden Ticket",m:["T1003.006","T1558.001"],
  w:"With Domain Admin rights the attacker asks a domain controller to replicate every password hash, krbtgt included. After that any ticket can be forged.",
  stops:[],red:["tier","edr"],
  d:"Event 4662 with directory replication rights used by an account that is not a domain controller.",
  l:[["kerberos-explained.html","Kerberos explained"],["event-id-reference.html","event IDs"]],next:["ransom"]},

 {id:"datatheft",s:4,n:"Mailbox and SharePoint data theft",m:["T1114.002","T1213.002","T1530"],
  w:"Mail, OneDrive and SharePoint content is synchronised or downloaded in bulk through Graph or a sync client.",
  stops:[],red:["cadevice","share","audit"],
  d:"MailItemsAccessed and FileDownloaded volume far above the user's normal level.",
  l:[["purview-compliance-cheat-sheet.html","Purview cheat sheet"],["sharepoint-teams-cheat-sheet.html","SharePoint and Teams"]],next:[]},
 {id:"bec",s:4,n:"Payment fraud (business email compromise)",m:["T1657"],
  w:"The attacker replies inside a real invoice thread and changes the bank details. The money has left before anyone notices.",
  stops:[["callback"]],red:["audit"],
  note:"The decisive control is a business process, not a setting.",
  d:"Usually found by the supplier asking where the payment is. Look for inbox rules on the finance mailbox.",
  l:[["aitm-help-desk.html","war story"],["incident-runbook.html","incident runbook"]],next:[]},
 {id:"ransom",s:4,n:"Ransomware",m:["T1486","T1490"],
  w:"Backups and shadow copies are deleted first, then everything reachable is encrypted, usually at night or on a weekend.",
  stops:[["backup"]],red:["edr","tier"],
  note:"Backups do not prevent encryption. They decide whether you can recover without paying, which is why they close this node.",
  d:"Mass file renames, shadow copy deletion (vssadmin, wbadmin), backup jobs failing.",
  l:[["ransomware-backup-gap.html","war story"],["backup-disaster-recovery-checklist.html","backup checklist"],["incident-runbook.html","incident runbook"]],next:[]}
];
var BY={};T.forEach(function(t){BY[t.id]=t});

/* ---------- state ---------- */
var on={},selected=null;
function readHash(){
  var m=/c=([a-z,]*)/.exec(location.hash);on={};
  if(m)m[1].split(",").forEach(function(c){if(CNAME[c])on[c]=true});
  return !!m;
}
function writeHash(){
  var list=ALL.filter(function(c){return on[c]});
  history.replaceState(null,"","#c="+list.join(","));
}
function status(t){
  for(var i=0;i<t.stops.length;i++)if(t.stops[i].every(function(c){return on[c]}))return "cov";
  if(t.red.some(function(c){return on[c]})||t.stops.some(function(g){return g.some(function(c){return on[c]})}))return "par";
  return "exp";
}
var LABEL={exp:"exposed",par:"reduced",cov:"closed"};
function countPaths(st){
  var memo={};
  function walk(id){
    if(st[id]==="cov")return 0;
    if(memo[id]!==undefined)return memo[id];
    var t=BY[id];
    if(!t.next.length)return memo[id]=1;
    var n=0;t.next.forEach(function(x){n+=walk(x)});
    return memo[id]=n;
  }
  var total=0;T.filter(function(t){return t.s===0}).forEach(function(t){total+=walk(t.id)});
  return total;
}

/* ---------- build ---------- */
var map=$("am-map"),nodes={},svg,NS="http://www.w3.org/2000/svg";
function build(){
  var ctl=$("am-controls");
  GROUPS.forEach(function(g){
    var fs=el("fieldset","cgroup"),lg=el("legend",null,g[0]);fs.append(lg);
    g[1].forEach(function(c){
      var lab=el("label","cchip"),inp=el("input");inp.type="checkbox";inp.id="c-"+c[0];
      inp.addEventListener("change",function(){on[c[0]]=inp.checked;update(true)});
      lab.append(inp,el("span",null,c[1]));fs.append(lab);
    });
    ctl.append(fs);
  });
  var pr=$("am-presets");
  PRESETS.forEach(function(p){
    var b=el("button","btn ghost",p[0]);b.type="button";
    b.addEventListener("click",function(){on={};p[1].forEach(function(c){on[c]=true});update(true)});
    pr.append(b);
  });
  svg=document.createElementNS(NS,"svg");svg.setAttribute("class","amlines");svg.setAttribute("aria-hidden","true");map.append(svg);
  STAGES.forEach(function(name,i){
    var col=el("div","amcol"),h=el("div","amstage");
    h.append(el("span","amno","0"+(i+1)),el("b",null,name));col.append(h);
    T.filter(function(t){return t.s===i}).forEach(function(t){
      var b=el("button","anode");b.type="button";b.dataset.id=t.id;
      b.append(el("b",null,t.n),el("small",null,""));
      b.addEventListener("click",function(){select(t.id,true)});
      b.addEventListener("mouseenter",function(){focusNode(t.id)});
      b.addEventListener("mouseleave",function(){focusNode(null)});b.addEventListener("blur",function(){focusNode(null)});
      b.addEventListener("focus",function(){focusNode(t.id)});
      nodes[t.id]=b;col.append(b);
    });
    map.append(col);
  });
}
var paths=[];
function drawLines(){
  while(svg.firstChild)svg.firstChild.remove();paths=[];
  if(!window.matchMedia("(min-width:900px)").matches)return;
  var box=map.getBoundingClientRect();
  svg.setAttribute("viewBox","0 0 "+box.width+" "+box.height);svg.setAttribute("width",box.width);svg.setAttribute("height",box.height);
  T.forEach(function(t){
    var a=nodes[t.id].getBoundingClientRect();
    t.next.forEach(function(nx){
      var b=nodes[nx].getBoundingClientRect();
      var x1=a.right-box.left,y1=a.top+a.height/2-box.top,x2=b.left-box.left,y2=b.top+b.height/2-box.top,dx=Math.max((x2-x1)*.5,30),d;
      if(BY[nx].s===t.s){var xr=a.right-box.left;d="M"+xr+","+y1+" C"+(xr+26)+","+y1+" "+(xr+26)+","+y2+" "+xr+","+y2}
      else d="M"+x1+","+y1+" C"+(x1+dx)+","+y1+" "+(x2-dx)+","+y2+" "+x2+","+y2;
      var p=document.createElementNS(NS,"path");
      p.setAttribute("d",d);
      p.dataset.a=t.id;p.dataset.b=nx;svg.append(p);paths.push(p);
    });
  });
  paint();
}
var st={};
function paint(){
  paths.forEach(function(p){
    var open=st[p.dataset.a]!=="cov"&&st[p.dataset.b]!=="cov";
    p.setAttribute("class",(open?"open":"shut")+(focusId&&(p.dataset.a===focusId||p.dataset.b===focusId)?" hot":focusId?" faded":""));
  });
}
var focusId=null;
function focusNode(id){
  focusId=id;
  Object.keys(nodes).forEach(function(k){
    var near=!id||k===id||BY[id].next.indexOf(k)>-1||BY[k].next.indexOf(id)>-1;
    nodes[k].classList.toggle("faded",!near);
  });
  paint();
}
function update(push){
  var c={exp:0,par:0,cov:0};
  T.forEach(function(t){
    var s=status(t);st[t.id]=s;c[s]++;
    var n=nodes[t.id];n.className="anode st-"+s+(selected===t.id?" sel":"")+(n.classList.contains("faded")?" faded":"");
    n.querySelector("small").textContent=LABEL[s];
    n.setAttribute("aria-label",t.n+": "+LABEL[s]);
  });
  ALL.forEach(function(k){$("c-"+k).checked=!!on[k]});
  var open=countPaths(st),base=countPaths({});
  $("am-paths").textContent=open;
  $("am-pathsub").textContent=open===0?"every entry point is closed":"of "+base+" routes from entry to impact are still open";
  $("am-exp").textContent=c.exp;$("am-par").textContent=c.par;$("am-cov").textContent=c.cov;
  var score=Math.round((c.cov+c.par*.5)/T.length*100);
  $("am-score").textContent=score+"%";
  $("am-bar").style.width=score+"%";
  $("am-count").textContent=ALL.filter(function(k){return on[k]}).length+" of "+ALL.length+" controls on";
  paint();
  if(selected)detail(selected);
  if(push)writeHash();
}
function select(id,scroll){
  selected=id;
  Object.keys(nodes).forEach(function(k){nodes[k].classList.toggle("sel",k===id)});
  detail(id);
  if(scroll&&!window.matchMedia("(min-width:900px)").matches)$("am-detail").scrollIntoView({behavior:"smooth",block:"start"});
}
function detail(id){
  var t=BY[id],box=$("am-detail"),s=st[id];box.replaceChildren();box.className="amdetail st-"+s;
  var head=el("div","amdh");head.append(el("span","sevtag s-"+(s==="exp"?"crit":s==="par"?"high":"info"),LABEL[s]),el("h3",null,t.n));box.append(head);
  var mit=el("p","ammitre");mit.append(document.createTextNode("MITRE ATT&CK: "));
  t.m.forEach(function(m,i){var a=el("a",null,m);a.href="https://attack.mitre.org/techniques/"+m.replace(".","/")+"/";a.target="_blank";a.rel="noopener";if(i)mit.append(" ");mit.append(a)});
  box.append(mit,el("p",null,t.w));
  if(t.note)box.append(el("p","amnote",t.note));
  box.append(el("h4",null,"your controls against this"));
  var ul=el("div","amctl"),seen={};
  function row(c,role){
    if(seen[c])return;seen[c]=1;
    var lab=el("label","cchip"),inp=el("input");inp.type="checkbox";inp.checked=!!on[c];
    inp.addEventListener("change",function(){on[c]=inp.checked;update(true)});
    lab.append(inp,el("span",null,CNAME[c]),el("em",null,role));ul.append(lab);
  }
  t.stops.forEach(function(g){g.forEach(function(c){row(c,g.length>1?"closes it together with "+g.filter(function(x){return x!==c}).map(function(x){return CNAME[x].toLowerCase()}).join(" and "):"closes it")})});
  t.red.forEach(function(c){row(c,"reduces it")});
  if(!ul.children.length)ul.append(el("p","dim","No preventive control. Detection is all you have."));
  box.append(ul);
  if(!t.stops.length)box.append(el("p","dim","Nothing closes this technique completely. The best achievable state is reduced."));
  box.append(el("h4",null,"how you would notice"),el("p",null,t.d));
  if(t.next.length){
    box.append(el("h4",null,"where it leads"));
    var nx=el("div","ctl");t.next.forEach(function(n){var b=el("button","btn ghost",BY[n].n);b.type="button";b.addEventListener("click",function(){select(n,false);nodes[n].focus()});nx.append(b)});box.append(nx);
  }
  var rel=el("p","rel");rel.append(document.createTextNode("Read more: "));
  t.l.forEach(function(l){var a=el("a",null,l[1]);a.href=l[0];rel.append(a," ")});box.append(rel);
}

build();
if(!readHash())PRESETS[1][1].forEach(function(c){on[c]=true});
update(false);
select("aitm",false);focusNode(null);
drawLines();
if(window.ResizeObserver)new ResizeObserver(function(){drawLines()}).observe(map);else addEventListener("resize",drawLines);
map.addEventListener("mouseleave",function(){focusNode(null)});
$("am-share").addEventListener("click",function(){
  var b=this,label=b.textContent;writeHash();
  if(navigator.clipboard)navigator.clipboard.writeText(location.href).then(function(){b.textContent="Link copied";setTimeout(function(){b.textContent=label},1400)});
});
window.attackMap={techniques:T,controls:ALL,count:countPaths};
})();
