(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e}
function plural(n,w){return n+" "+(n===1?w:/[^aeiou]y$/.test(w)?w.slice(0,-1)+"ies":w+"s")}
function uniq(a){var s={},o=[];a.forEach(function(x){if(!s[x]){s[x]=1;o.push(x)}});return o}
function arr(v){return Array.isArray(v)?v:v===null||v===undefined||v===""?[]:[v]}

/* ---------- what the ports mean ---------- */
var SVC={22:["SSH","admin"],23:["Telnet","admin"],3389:["RDP","admin"],5985:["WinRM","admin"],5986:["WinRM over TLS","admin"],5900:["VNC","admin"],2375:["Docker API","admin"],2376:["Docker API over TLS","admin"],10250:["Kubelet","admin"],
 135:["Windows RPC","share"],139:["NetBIOS","share"],445:["SMB","share"],2049:["NFS","share"],111:["rpcbind","share"],
 1433:["SQL Server","db"],1521:["Oracle","db"],3306:["MySQL","db"],5432:["PostgreSQL","db"],27017:["MongoDB","db"],6379:["Redis","db"],9200:["Elasticsearch","db"],11211:["Memcached","db"],5984:["CouchDB","db"],9042:["Cassandra","db"],
 389:["LDAP","dir"],636:["LDAPS","dir"],88:["Kerberos","dir"],3268:["Global Catalog","dir"],
 21:["FTP","legacy"],69:["TFTP","legacy"],110:["POP3","legacy"],143:["IMAP","legacy"],161:["SNMP","legacy"]};
var NAMED={http:80,https:443,ssh:22,rdp:3389,dns:53,smtp:25,smb:445,ftp:21,telnet:23,mysql:3306,mssql:1433,winrm:5985,ldap:389,ldaps:636,ntp:123,snmp:161,imap:143,pop3:110,postgres:5432,postgresql:5432,vnc:5900,nfs:2049};
var CAT={admin:["crit","Remote administration open to "],db:["crit","Databases open to "],share:["crit","File sharing and Windows RPC open to "],dir:["high","Directory services open to "],legacy:["high","Cleartext and legacy protocols open to "]};
var CATWHY={admin:"These ports give a shell or a desktop. They are scanned around the clock, and password guessing against them starts within minutes of opening.",
 db:"A database port that answers to everyone is one weak password or one unpatched bug away from a data leak.",
 share:"SMB and RPC are how ransomware and worms move. They should never answer outside the network they serve.",
 dir:"LDAP and Kerberos reachable from outside allow user enumeration and password spraying against the directory.",
 legacy:"These protocols send passwords and data in clear text, or have no real authentication at all."};
var CATFIX={admin:["Remove the rule if nobody needs it. Most are left over from a setup day.","If remote access is needed, put it behind a VPN, a bastion host or just-in-time access, not behind a port.","As a stopgap, limit the source to the fixed addresses of the people who need it."],
 db:["Limit the source to the application servers that use the database.","In the cloud, use a private endpoint and take the public path away.","Check the database log for sign-ins from addresses you do not know."],
 share:["Remove the rule. File shares across the internet belong inside a VPN.","Inside the network, allow SMB only towards the file servers, not between clients."],
 dir:["Remove the rule. Outside applications should use a federation service or an application proxy, not LDAP.","If a partner really needs LDAP, limit the source to their address and use LDAPS."],
 legacy:["Replace the protocol: SFTP for FTP, SNMPv3 for SNMP, IMAPS and POP3S for mail.","Until then, limit the source to the systems that use it."]};

/* ---------- addresses and ports ---------- */
var ALL=[0,65535];
function ip4(s){var m=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(s);if(!m)return null;var p=[+m[1],+m[2],+m[3],+m[4]];if(p.some(function(x){return x>255}))return null;
  var b=m[5]===undefined?32:+m[5];if(b>32)return null;return {n:((p[0]*256+p[1])*256+p[2])*256+p[3],b:b}}
function isPrivate(c){var a=Math.floor(c.n/16777216),b=Math.floor(c.n/65536)%256;return a===10||a===127||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===169&&b===254)||(a===100&&b>=64&&b<=127)}
function addr(raw){
  var s=String(raw===null||raw===undefined?"":raw).trim(),l=s.toLowerCase(),a={raw:s||"*",any:false,inet:false,cidr:null,tag:false};
  if(l===""||l==="*"||l==="any"||l==="all"||l==="0.0.0.0/0"||l==="::/0"||l==="0.0.0.0"||l==="anywhere"||l==="any4"||l==="any6"){a.any=true;a.raw="any";return a}
  if(l==="internet"||l==="wan"||l==="public"){a.inet=true;return a}
  a.cidr=ip4(s);if(!a.cidr&&!/[:\/]/.test(s)&&!/^\d/.test(s))a.tag=true;
  return a;
}
function addrs(v){var o=[];arr(v).forEach(function(x){String(x).split(/[,;]\s*|\s+(?=\d)/).forEach(function(y){y=y.trim();if(y)o.push(addr(y))})});return o.length?o:[addr("*")]}
function world(list){return list.some(function(a){return a.any||a.inet})}
function inside(inner,outer){if(outer.b>inner.b)return false;var size=Math.pow(2,32-outer.b);return Math.floor(inner.n/size)===Math.floor(outer.n/size)}
function addrCovers(a,b){ /* does a include b */
  if(a.any)return true;if(b.any)return false;
  if(a.inet)return b.inet||(b.cidr&&!isPrivate(b.cidr));
  if(a.cidr&&b.cidr)return inside(b.cidr,a.cidr);
  return a.raw.toLowerCase()===b.raw.toLowerCase();
}
function listCovers(A,B){return B.every(function(b){return A.some(function(a){return addrCovers(a,b)})})}
function ports(v){ /* returns {r:[[lo,hi]],unk:bool} */
  var r=[],unk=false;
  arr(v).forEach(function(x){String(x).split(/[,;\s]+/).forEach(function(y){
    y=y.trim().toLowerCase();if(!y)return;
    if(y==="*"||y==="any"||y==="all"||y==="0-65535"||y==="1-65535"){r.push(ALL.slice());return}
    var m=/^(\d{1,5})(?:\s*[-:]\s*(\d{1,5}))?$/.exec(y);
    if(m){var lo=+m[1],hi=m[2]===undefined?lo:+m[2];if(lo<=hi&&hi<=65535){r.push([lo,hi]);return}}
    if(NAMED[y]){r.push([NAMED[y],NAMED[y]]);return}
    unk=true;
  })});
  if(!r.length&&!unk)r.push(ALL.slice());
  return {r:r,unk:unk};
}
function allPorts(p){return p.r.some(function(x){return x[0]<=1&&x[1]>=65535})}
function width(p){var n=0;p.r.forEach(function(x){n+=x[1]-x[0]+1});return n}
function hasPort(p,n){return p.r.some(function(x){return x[0]<=n&&n<=x[1]})}
function portsCover(A,B){if(A.unk||B.unk)return false;return B.r.every(function(b){return A.r.some(function(a){return a[0]<=b[0]&&b[1]<=a[1]})})}
function portText(p){if(allPorts(p))return "all ports";var t=p.r.map(function(x){return x[0]===x[1]?String(x[0]):x[0]+"-"+x[1]});if(p.unk)t.push("named service");return (t.length>6?t.slice(0,6).concat("...").join(", "):t.join(", "))||"unknown ports"}
function addrText(l){if(l.some(function(a){return a.any}))return "anywhere";var t=l.map(function(a){return a.inet?"the internet":a.raw});return t.length>3?t.slice(0,3).join(", ")+" and "+(t.length-3)+" more":t.join(", ")}
function proto(v){var s=String(v===null||v===undefined?"":v).trim().toLowerCase();if(s===""||s==="*"||s==="any"||s==="all"||s==="ip")return "any";if(s==="6")return "tcp";if(s==="17")return "udp";if(s==="1"||s==="icmpv4")return "icmp";return s}
function protoCovers(a,b){return a==="any"||a===b}
function act(v){var s=String(v||"").trim().toLowerCase();if(/^(allow|accept|permit|pass|allowed)$/.test(s))return "allow";if(/^(deny|drop|block|reject|denied|blocked)$/.test(s))return "deny";return null}

/* ---------- parsing ---------- */
function mk(g,name,order,dir,action,pr,src,dst,pt,on,desc){return {g:g,name:String(name||"(no name)"),order:order,dir:dir,act:action,proto:pr,src:src,dst:dst,ports:pt,on:on!==false,desc:String(desc||""),note:""}}
function parseAzure(text){
  var data=JSON.parse(text.replace(/^\uFEFF/,"")),rules=[],groups=[];
  function isRule(o){var p=o&&(o.properties||o);return p&&typeof p==="object"&&p.access!==undefined&&p.direction!==undefined}
  function addRule(g,o){
    var p=o.properties||o,a=act(p.access);if(!a)return;
    var src=[].concat(arr(p.sourceAddressPrefix),arr(p.sourceAddressPrefixes)),dst=[].concat(arr(p.destinationAddressPrefix),arr(p.destinationAddressPrefixes));
    arr(p.sourceApplicationSecurityGroups).forEach(function(x){src.push("ASG:"+String(x.id||x).split("/").pop())});
    arr(p.destinationApplicationSecurityGroups).forEach(function(x){dst.push("ASG:"+String(x.id||x).split("/").pop())});
    var S=[],D=[];src.forEach(function(x){S.push(addr(x))});dst.forEach(function(x){D.push(addr(x))});
    rules.push(mk(g,o.name||p.name,+p.priority||0,/^in/i.test(p.direction)?"in":"out",a,proto(p.protocol),S.length?S:[addr("*")],D.length?D:[addr("*")],ports([].concat(arr(p.destinationPortRange),arr(p.destinationPortRanges))),true,p.description));
  }
  function walk(o,depth){
    if(!o||typeof o!=="object"||depth>6)return;
    if(Array.isArray(o)){if(o.length&&o.every(isRule)){groups.push("rules");o.forEach(function(r){addRule("rules",r)})}else o.forEach(function(x){walk(x,depth+1)});return}
    var sr=o.securityRules||(o.properties&&o.properties.securityRules);
    if(Array.isArray(sr)){var g=String(o.name||"nsg "+(groups.length+1));groups.push(g);sr.forEach(function(r){if(isRule(r))addRule(g,r)});return}
    if(isRule(o)){if(groups.indexOf("rules")<0)groups.push("rules");addRule("rules",o);return}
    ["value","resources","networkSecurityGroups"].forEach(function(k){if(o[k])walk(o[k],depth+1)});
  }
  walk(data,0);
  if(!groups.length)throw new Error("no network security groups or rules found in this JSON");
  return {fmt:"azure",label:"Azure network security groups",ordered:true,rules:rules,groups:uniq(groups),policy:{},skipped:0};
}
function parseIptables(text){
  var rules=[],policy={},groups=[],n=0,skipped=0;
  text.split(/\r?\n/).forEach(function(line){
    line=line.trim();var m;
    if((m=/^:(\S+)\s+(ACCEPT|DROP|REJECT)/.exec(line))||(m=/^-P\s+(\S+)\s+(ACCEPT|DROP|REJECT)/.exec(line))){policy[m[1]]=m[2];if(groups.indexOf(m[1])<0)groups.push(m[1]);return}
    if(!/^-A\s+/.test(line))return;
    var t=line.match(/"[^"]*"|\S+/g)||[],chain=t[1],o={p:"any",s:"*",d:"*",pt:null,j:"",est:false,lo:false,neg:false,c:""};
    for(var i=2;i<t.length;i++){var k=t[i],v=t[i+1];
      if(k==="!"){o.neg=true;continue}
      if(k==="-p"||k==="--protocol"){o.p=v;i++}else if(k==="-s"||k==="--source"){o.s=v;i++}else if(k==="-d"||k==="--destination"){o.d=v;i++}
      else if(k==="--dport"||k==="--dports"||k==="--destination-port"||k==="--destination-ports"){o.pt=v;i++}
      else if(k==="-j"||k==="--jump"){o.j=v;i++}else if(k==="-i"||k==="--in-interface"){if(v==="lo")o.lo=true;i++}else if(k==="-o"||k==="--out-interface"){if(v==="lo")o.lo=true;i++}
      else if(k==="--state"||k==="--ctstate"){if(!/NEW/.test(v))o.est=true;i++}
      else if(k==="--comment"){o.c=String(v||"").replace(/^"|"$/g,"");i++}
    }
    var a=act(o.j);if(groups.indexOf(chain)<0)groups.push(chain);
    if(!a||o.lo||o.est||o.neg){skipped++;return}
    n++;rules.push(mk(chain,o.c||"line "+n+": "+line.slice(0,60),n,chain==="OUTPUT"?"out":"in",a,proto(o.p),addrs(o.s),addrs(o.d),ports(o.pt===null?"*":o.pt),true,o.c));
  });
  if(!rules.length&&!Object.keys(policy).length)throw new Error("no iptables rules found");
  return {fmt:"iptables",label:"iptables rules",ordered:true,rules:rules,groups:groups,policy:policy,skipped:skipped};
}
function splitCsv(text){
  text=text.replace(/^\uFEFF/,"");var first=text.split(/\r?\n/)[0]||"",d=[",",";","\t"].sort(function(a,b){return first.split(b).length-first.split(a).length})[0];
  var rows=[],row=[],cur="",q=false;
  for(var i=0;i<text.length;i++){var c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"')q=true;else if(c===d){row.push(cur);cur=""}else if(c==="\n"){row.push(cur);rows.push(row);row=[];cur=""}else if(c!=="\r")cur+=c}
  if(cur!==""||row.length){row.push(cur);rows.push(row)}
  return rows.filter(function(r){return r.some(function(x){return x.trim()!==""})});
}
var COLS={name:["name","displayname","rule","rulename","description","comment","id"],action:["action","access","target","policy","type"],dir:["direction","dir"],src:["source","src","sourceaddress","remoteaddress","sourceaddressprefix","from","sourceip","sourcenetwork"],
 dst:["destination","dst","destinationaddress","localaddress","destinationaddressprefix","to","destinationip","destinationnetwork"],port:["port","ports","destinationport","dstport","localport","destinationportrange","destinationports","service","services"],
 proto:["protocol","proto","ipprotocol"],on:["enabled","status","state","active"],off:["disabled"],order:["priority","order","seq","sequence","position","number","no"],g:["group","nsg","chain","interface","zone","policyname","profile"],desc:["description","comment","notes","remark"]};
function parseCsv(text){
  var rows=splitCsv(text);if(rows.length<2)throw new Error("the file has no data rows");
  var head=rows[0].map(function(h){return h.toLowerCase().replace(/[^a-z0-9]/g,"")}),ix={};
  Object.keys(COLS).forEach(function(k){for(var i=0;i<COLS[k].length&&ix[k]===undefined;i++){var p=head.indexOf(COLS[k][i]);if(p>=0)ix[k]=p}});
  if(ix.action===undefined)throw new Error("no column named Action (or Access, Target) found. The first line must hold the column names");
  if(ix.port===undefined&&ix.src===undefined)throw new Error("need at least a Port or a Source column next to Action");
  var win=head.indexOf("profile")>=0&&(head.indexOf("localport")>=0||head.indexOf("remoteaddress")>=0),rules=[],groups=[],skipped=0;
  rows.slice(1).forEach(function(r,i){
    var get=function(k){return ix[k]===undefined?"":String(r[ix[k]]===undefined?"":r[ix[k]]).trim()};
    var a=act(get("action"));if(!a){skipped++;return}
    var on=true,e=get("on").toLowerCase();if(ix.on!==undefined&&/^(false|no|0|disabled|off|inactive)$/.test(e))on=false;if(ix.off!==undefined&&/^(true|yes|1)$/.test(get("off").toLowerCase()))on=false;
    var d=get("dir").toLowerCase(),g=get("g")||"rules";if(groups.indexOf(g)<0)groups.push(g);
    var ord=parseFloat(get("order"));
    rules.push(mk(g,get("name")||"row "+(i+2),isNaN(ord)?i+1:ord,/^(out|egress)/.test(d)?"out":"in",a,proto(get("proto")),addrs(get("src")),addrs(get("dst")),ports(get("port")),on,ix.desc!==undefined&&ix.desc!==ix.name?get("desc"):""));
  });
  if(!rules.length)throw new Error("no rule with a recognisable action (allow, deny, accept, drop, block) found");
  return {fmt:win?"windows":"csv",label:win?"Windows Firewall export":"rule table (CSV)",ordered:!win,rules:rules,groups:groups,policy:{},skipped:skipped,hasDesc:ix.desc!==undefined&&ix.desc!==ix.name};
}
function parse(text){
  var s=text.replace(/^\uFEFF/,"").trim();if(!s)throw new Error("it is empty");
  if(s[0]==="{"||s[0]==="[")return parseAzure(s);
  if(/^(\*filter|\*nat|:[A-Z]+ |-A |-P |# Generated by ip)/m.test(s)&&/(^|\n)\s*(-A|-P|:)\s*\S+/.test(s))return parseIptables(s);
  return parseCsv(s);
}

/* ---------- checks ---------- */
var SEV={crit:0,high:1,med:2,info:3},SEVNAME={crit:"critical",high:"high",med:"medium",info:"info"};
function covers(a,b){return protoCovers(a.proto,b.proto)&&listCovers(a.src,b.src)&&listCovers(a.dst,b.dst)&&portsCover(a.ports,b.ports)}
function sentence(r){return (r.act==="allow"?"Allows ":"Blocks ")+(r.proto==="any"?"":r.proto.toUpperCase()+" ")+portText(r.ports)+(r.dir==="in"?" from "+addrText(r.src)+" to "+addrText(r.dst):" going out from "+addrText(r.src)+" to "+addrText(r.dst))+"."}
function analyse(D){
  var W=D.fmt==="azure"?"the internet":"any address",F=[],live=D.rules.filter(function(r){return r.on});
  var byKey={};live.forEach(function(r){var k=r.g+"|"+r.dir;(byKey[k]=byKey[k]||[]).push(r)});
  Object.keys(byKey).forEach(function(k){byKey[k].sort(function(a,b){return a.order-b.order})});
  /* shadowing: only where order decides */
  var dead=[],redundant=[];
  if(D.ordered)Object.keys(byKey).forEach(function(k){var L=byKey[k];L.forEach(function(r,j){for(var i=0;i<j;i++){if(covers(L[i],r)){r.by=L[i];if(L[i].act!==r.act){r.note="never applies";dead.push(r)}else{r.note="redundant";redundant.push(r)}break}}})});
  var COL=["Rule set","Rule","Protocol","Ports","Source","Destination"];
  function row(r){return [r.g,r.name,r.proto==="any"?"any":r.proto.toUpperCase(),portText(r.ports),addrText(r.src),addrText(r.dst)]}
  function add(key,sev,title,summary,list,steps,cols,rows){if(!list.length)return;list.forEach(function(r){if(!r.note)r.note=title});F.push({key:key,sev:sev,title:title,count:list.length,summary:summary,steps:steps,cols:cols||COL,rows:rows||list.map(row)})}
  var open=live.filter(function(r){return r.dir==="in"&&r.act==="allow"&&world(r.src)&&r.note!=="never applies"&&!(D.fmt==="azure"&&r.order>=65000)});
  var everything=open.filter(function(r){return allPorts(r.ports)});
  add("everything","crit","Everything open to "+W,"These rules allow every port from "+W+". Whatever listens on the machines behind them is reachable, including services nobody remembers installing.",everything,
   ["Find out what the rule was for. Usually it was a test that was never undone.","Replace it with rules for the ports that are really needed, from the sources that really need them.","Until then, check the machines behind it for services that should not be public."]);
  var rest=open.filter(function(r){return !allPorts(r.ports)});
  Object.keys(CAT).forEach(function(c){
    var hit=[],rows=[];rest.forEach(function(r){var s=[];Object.keys(SVC).forEach(function(p){if(SVC[p][1]===c&&hasPort(r.ports,+p)&&(r.proto==="any"||r.proto==="tcp"||r.proto==="udp"))s.push(SVC[p][0]+" ("+p+")")});
      if(s.length&&width(r.ports)<1000){hit.push(r);rows.push([r.g,r.name,s.join(", "),addrText(r.src),addrText(r.dst)])}});
    add(c,CAT[c][0],CAT[c][1]+W,CATWHY[c],hit,CATFIX[c],["Rule set","Rule","Service","Source","Destination"],rows);
  });
  add("wide","high","Wide port ranges open to "+W,"A range of a thousand ports or more is rarely what was meant. Everything that ever listens inside the range becomes public without anyone deciding it.",rest.filter(function(r){return !r.ports.unk&&width(r.ports)>=1000}),
   ["Ask the owner which ports the application really uses and allow only those.","Passive FTP and media ranges are the usual excuse: narrow the range in the application, then in the rule."]);
  if(D.fmt==="iptables"){var pol=["INPUT","FORWARD"].filter(function(c){if(D.policy[c]!=="ACCEPT")return false;var L=byKey[c+"|in"]||[];return !L.some(function(r){return r.act==="deny"&&r.src[0].any&&r.dst[0].any&&allPorts(r.ports)&&r.proto==="any"})});
    if(pol.length)F.push({key:"policy",sev:pol.indexOf("INPUT")>=0?"high":"med",title:"Chains that accept by default",count:pol.length,summary:"The default policy of these chains is ACCEPT and no rule at the end drops the rest. Everything that no rule mentions is allowed, which turns the rule list into decoration.",
     steps:["Make sure the rules for your own access (SSH from your address) are in place and saved.","Set the policy to DROP, or add a final rule that drops everything else.","Test from a second session before you close the first."],cols:["Chain","Default policy"],rows:pol.map(function(c){return [c,"ACCEPT"]})})}
  add("dead","med","Rules that can never apply","An earlier rule with the opposite decision already covers everything these rules describe, so they never match. Either the rule is a leftover, or someone believes it protects or permits something it does not.",dead,
   ["Decide which of the two rules is meant. If the later one is right, it has to move in front.","Delete the one that is wrong. A rule that never matches only misleads the next reader."],["Rule set","Rule","In plain words","Overruled by"],dead.map(function(r){return [r.g,r.name,sentence(r),r.by.name]}));
  add("flat","med","Whole internal networks allowed on every port","These rules let a complete private network reach everything. Once one machine in that network is compromised, nothing slows the attacker down on the way to the next.",
   live.filter(function(r){return r.dir==="in"&&r.act==="allow"&&!world(r.src)&&allPorts(r.ports)&&r.note!=="never applies"&&!(D.fmt==="azure"&&r.order>=65000)&&r.src.some(function(a){return /^virtualnetwork$/i.test(a.raw)||(a.cidr&&isPrivate(a.cidr)&&a.cidr.b<=16)})}),
   ["List what really has to talk to what: clients to servers on a few ports, servers to the database, admins to the management ports.","Replace the broad rule with those, and keep client-to-client traffic closed.","Start with the management ports (RDP, SSH, WinRM, SMB): allow them only from the admin network."]);
  add("broadsrc","med","Very large public source ranges","Not everyone, but millions of addresses. A range this size is close to open and usually stands for \"the provider of our partner\" or \"that country\".",
   live.filter(function(r){return r.dir==="in"&&r.act==="allow"&&!world(r.src)&&!r.note&&r.src.some(function(a){return a.cidr&&!isPrivate(a.cidr)&&a.cidr.b<16})}),
   ["Ask for the exact addresses and replace the range.","If the other side has no fixed addresses, use a VPN or an authenticated gateway instead of a firewall rule."]);
  var outOpen=[],explicit=false;D.groups.forEach(function(g){var L=byKey[g+"|out"]||[];
    var any=L.filter(function(r){return r.act==="allow"&&world(r.dst)&&allPorts(r.ports)&&r.proto==="any"&&!(D.fmt==="azure"&&r.order>=65000)})[0];
    if(any){explicit=true;outOpen.push([g,"rule \""+any.name+"\" allows everything out"])}
    else if(D.fmt==="azure"&&!L.some(function(r){return r.act==="deny"}))outOpen.push([g,"no outbound rule, so the Azure default allows everything out"]);
    else if(D.fmt==="iptables"&&g==="OUTPUT"&&D.policy.OUTPUT==="ACCEPT"&&!L.some(function(r){return r.act==="deny"}))outOpen.push([g,"default policy ACCEPT, no outbound rule"])});
  if(outOpen.length)F.push({key:"egress",sev:explicit?"med":"info",title:"Outbound traffic is not restricted",count:outOpen.length,summary:"Machines behind these rule sets may connect to anything on the internet. That is the normal starting point, and it is also what malware needs to fetch its payload and send data out.",
   steps:["For servers, allow outbound only what they need: updates, DNS, the APIs they call. Block the rest and log it.","For clients, a web proxy or DNS filtering does more than port rules.","Watch the log for a week before you enforce, the list of needed destinations is always longer than expected."],cols:["Rule set","Why"],rows:outOpen});
  add("redundant","info","Rules already covered by an earlier rule","An earlier rule with the same decision covers these completely. Removing them changes nothing except the length of the list.",redundant,
   ["Check the two rules side by side, then delete the narrower one or the broader one, whichever was not meant."],["Rule set","Rule","In plain words","Covered by"],redundant.map(function(r){return [r.g,r.name,sentence(r),r.by.name]}));
  var off=D.rules.filter(function(r){return !r.on});
  add("disabled","info","Disabled rules","Switched off but still in the list. Each one can be switched back on with one click, by anyone with access, without review.",off,["Delete what has been off for longer than a few weeks. If it is needed again, it should be requested again."]);
  var web=open.filter(function(r){return !allPorts(r.ports)&&!r.note&&(hasPort(r.ports,80)||hasPort(r.ports,443))});
  F.sort(function(a,b){return SEV[a.sev]-SEV[b.sev]});
  var counts={crit:0,high:0,med:0,info:0};F.forEach(function(f){counts[f.sev]++});
  var exposed=[];open.forEach(function(r){var s=[];if(!allPorts(r.ports))Object.keys(SVC).forEach(function(p){if(hasPort(r.ports,+p))s.push(SVC[p][0])});if(hasPort(r.ports,80)&&!allPorts(r.ports))s.push("HTTP");if(hasPort(r.ports,443)&&!allPorts(r.ports))s.push("HTTPS");
    exposed.push([r.g,r.name,r.proto==="any"?"any":r.proto.toUpperCase(),portText(r.ports),addrText(r.dst),allPorts(r.ports)?"everything":uniq(s).slice(0,6).join(", ")||"-"])});
  var inv=D.rules.slice().sort(function(a,b){return a.g===b.g?(a.dir===b.dir?a.order-b.order:a.dir<b.dir?-1:1):D.groups.indexOf(a.g)-D.groups.indexOf(b.g)}).map(function(r){return [r.g,r.dir==="in"?"in":"out",D.ordered?String(r.order):"-",r.name,sentence(r),r.on?(r.note||""):"disabled"]});
  var flagged=D.rules.filter(function(r){return r.note||!r.on}).length;
  return {W:W,findings:F,counts:counts,worst:F.length?F[0].sev:"none",total:D.rules.length,flagged:flagged,open:open.length,web:web.length,exposed:exposed,inventory:inv,groups:D.groups.length};
}

/* ---------- rendering ---------- */
function table(cols,rows,max){
  var wrap=el("div","tw"),tb=el("table","tbl"),th=el("thead"),tr=el("tr"),body=el("tbody");
  cols.forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
  rows.slice(0,max||rows.length).forEach(function(r){var x=el("tr");r.forEach(function(c){x.append(el("td",null,c))});body.append(x)});
  tb.append(th,body);wrap.append(tb);
  if(max&&rows.length>max)wrap.append(el("p","note","Showing "+max+" of "+rows.length+". The CSV and the report contain all of them."));
  return wrap;
}
function tile(label,value,sub){var d=el("div","stat");d.append(el("span","stat-k",label),el("b","stat-v",value));if(sub)d.append(el("span","stat-s",sub));return d}
function save(name,text,type){var blob=new Blob([text],{type:type}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
function csv(cols,rows){var q=function(v){v=String(v===null||v===undefined?"":v);if(/^[=+\-@]/.test(v))v="'"+v;return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};return [cols].concat(rows).map(function(r){return r.map(q).join(",")}).join("\r\n")}
var state={data:null,result:null,name:""},INV=["Rule set","Dir","Order","Rule","In plain words","Flag"],EXP=["Rule set","Rule","Protocol","Ports","Destination","Known services"];
function render(){
  var out=$("fw-out");out.replaceChildren();
  var D=state.data,R=analyse(D);state.result=R;
  $("fw-status").textContent=plural(R.total,"rule")+" read from "+state.name+" ("+D.label+")."+(D.skipped?" "+plural(D.skipped,"line")+" left out: "+(D.fmt==="iptables"?"loopback, established connections, jumps to other chains and negated matches.":"no recognisable action."):"");
  var v=el("div","verdict v-"+(R.worst==="none"||R.worst==="info"?"none":R.worst));
  v.append(el("b",null,R.worst==="crit"?"Act now":R.worst==="high"?"Needs attention":R.worst==="med"?"Worth a look":"Nothing alarming"),
   el("span",null,R.findings.length?R.flagged+" of "+R.total+" rules flagged · "+["crit","high","med","info"].filter(function(s){return R.counts[s]}).map(function(s){return R.counts[s]+" "+SEVNAME[s]}).join(" · "):"none of the checks matched these rules"));
  out.append(v);
  var stats=el("div","stats");stats.style.setProperty("--cols","4");
  stats.append(tile("rules",String(R.total),plural(R.groups,"rule set")),tile("open to "+(D.fmt==="azure"?"the internet":"any address"),String(R.open),"inbound allow rules"),tile("of those, web only",String(R.web),"ports 80 and 443"),tile("flagged",String(R.flagged),"rules in a finding"));
  out.append(stats);
  out.append(el("h2",null,"findings"));
  if(!R.findings.length)out.append(el("p","dim","None of the checks matched. That is a statement about these rules and these checks, not about the network."));
  R.findings.forEach(function(f,i){
    var d=el("details","finding f-"+f.sev);if(i<2&&SEV[f.sev]<=1)d.open=true;
    var s=el("summary");s.append(el("span","sevtag s-"+f.sev,SEVNAME[f.sev]),el("b",null,f.title+" ("+f.count+")"));
    d.append(s,el("p",null,f.summary),table(f.cols,f.rows,20));
    var b=el("button","btn ghost","Download this list (.csv)");b.type="button";b.addEventListener("click",function(){save("firewall-"+f.key+".csv",csv(f.cols,f.rows),"text/csv")});
    d.append(b,el("h3","fh","what to do"));
    var ol=el("ol","steps");f.steps.forEach(function(x){ol.append(el("li",null,x))});d.append(ol);out.append(d);
  });
  if(D.fmt==="windows")out.append(el("p","note","Windows Firewall has no rule order: a block rule always wins over an allow rule, so the checks for overruled and redundant rules are skipped. \"Any address\" means any address that can reach this machine, which on a laptop in a hotel is a lot and on a server behind a perimeter firewall is the internal network."));
  if(D.fmt==="azure")out.append(el("p","note","A rule that allows the internet only matters where a public IP address or a load balancer leads to the machines behind it. The export does not say which subnets and network cards a rule set is attached to, so check that in the portal for each finding."));
  out.append(el("h2",null,"reachable from "+R.W),el("p","dim",R.exposed.length?"Every inbound allow rule whose source is "+R.W+", after rules that are overruled have been taken out.":"No inbound allow rule has "+R.W+" as its source."));
  if(R.exposed.length)out.append(table(EXP,R.exposed,40));
  out.append(el("h2",null,"every rule in plain words"),el("p","dim",D.ordered?"In the order in which they are evaluated.":"Windows Firewall evaluates all rules together, the order here is the order of the file."),table(INV,R.inventory,60));
  var ctl=el("div","ctl");ctl.style.marginTop="28px";
  var dl=el("button","btn","Download report (.md)");dl.type="button";dl.addEventListener("click",function(){save("firewall-review.md",report(),"text/markdown")});
  var a=el("button","btn ghost","Download the rule list (.csv)");a.type="button";a.addEventListener("click",function(){save("firewall-rules.csv",csv(INV,R.inventory),"text/csv")});
  var pr=el("button","btn ghost","Print / save as PDF");pr.type="button";pr.addEventListener("click",function(){document.querySelectorAll("#fw-out details").forEach(function(x){x.open=true});window.print()});
  ctl.append(dl,a,pr);out.append(ctl);out.hidden=false;
}
function report(){
  var R=state.result,L=[];if(!R)return "";
  function tbl(cols,rows){L.push("| "+cols.join(" | ")+" |","|"+cols.map(function(){return " --- "}).join("|")+"|");rows.forEach(function(r){L.push("| "+r.map(function(c){return String(c).replace(/\|/g,"\\|")}).join(" | ")+" |")});L.push("")}
  L.push("# Firewall rule review","","Source: "+state.name+" ("+state.data.label+")","Rules: "+R.total+", of which "+R.flagged+" are flagged","Generated in the browser by the admin_hub firewall rule reviewer. No data left this device.","");
  R.findings.forEach(function(f){L.push("## ["+SEVNAME[f.sev].toUpperCase()+"] "+f.title+" ("+f.count+")","",f.summary,"");tbl(f.cols,f.rows);L.push("**What to do**","");f.steps.forEach(function(s,i){L.push((i+1)+". "+s)});L.push("")});
  if(R.exposed.length){L.push("## Reachable from "+R.W,"");tbl(EXP,R.exposed)}
  L.push("## Every rule in plain words","");tbl(INV,R.inventory);
  return L.join("\n");
}
function load(text,name){
  try{state.data=parse(text);state.name=name;render();$("fw-out").scrollIntoView({behavior:"smooth",block:"start"})}
  catch(e){$("fw-out").hidden=true;$("fw-status").textContent="Could not read that: "+(e instanceof SyntaxError?"it starts like JSON but is not valid JSON":e.message)+"."}
}
function readFile(f){
  if(!f)return;$("fw-status").textContent="Reading "+f.name+" ...";
  var r=new FileReader();r.onload=function(){load(String(r.result),f.name)};r.onerror=function(){$("fw-status").textContent="The browser could not read that file."};r.readAsText(f);
}

/* ---------- samples: made up ---------- */
function sampleAzure(){
  function r(n,p,d,a,pr,src,port,dst,desc){return {name:n,priority:p,direction:d,access:a,protocol:pr,sourceAddressPrefix:src,sourcePortRange:"*",destinationAddressPrefix:dst||"*",destinationPortRange:Array.isArray(port)?undefined:port,destinationPortRanges:Array.isArray(port)?port:[],description:desc||""}}
  return JSON.stringify([
   {name:"nsg-web-prod",location:"westeurope",resourceGroup:"rg-prod",securityRules:[
     r("Allow-HTTPS",100,"Inbound","Allow","Tcp","Internet","443","10.10.1.0/24","Public website"),
     r("Allow-HTTP",110,"Inbound","Allow","Tcp","Internet","80","10.10.1.0/24","Redirect to HTTPS"),
     r("Allow-RDP-Temp",120,"Inbound","Allow","Tcp","*","3389","10.10.1.4","temp for vendor, remove after go-live"),
     r("Allow-SSH-Office",130,"Inbound","Allow","Tcp","198.51.100.24/32","22","10.10.1.0/24","Office fixed IP"),
     r("Allow-Passive-FTP",140,"Inbound","Allow","Tcp","*","49152-65535","10.10.1.6",""),
     r("Allow-FTP",150,"Inbound","Allow","Tcp","*","21","10.10.1.6","")]},
   {name:"nsg-data-prod",location:"westeurope",resourceGroup:"rg-prod",securityRules:[
     r("Allow-SQL-App",100,"Inbound","Allow","Tcp","10.10.1.0/24","1433","10.10.2.0/24","Web tier to SQL"),
     r("Allow-SQL-Reporting",110,"Inbound","Allow","Tcp","Internet","1433","10.10.2.5","Power BI"),
     r("Deny-All-Inbound",200,"Inbound","Deny","*","*","*","*","Explicit deny"),
     r("Allow-Redis",210,"Inbound","Allow","Tcp","10.10.1.0/24","6379","10.10.2.0/24","Cache"),
     r("Allow-SQL-App-Old",120,"Inbound","Allow","Tcp","10.10.1.10/32","1433","10.10.2.0/24",""),
     r("Deny-Internet-Out",100,"Outbound","Deny","*","*","*","Internet","No direct internet")]},
   {name:"nsg-mgmt",location:"westeurope",resourceGroup:"rg-shared",securityRules:[
     r("Allow-VNet-Any",100,"Inbound","Allow","*","VirtualNetwork","*","VirtualNetwork",""),
     r("Allow-Partner",110,"Inbound","Allow","Tcp","52.0.0.0/8","8443","10.10.9.0/24","Partner monitoring"),
     r("Allow-Any-Lab",400,"Inbound","Allow","*","*","*","10.10.9.50","lab VM")]}
  ],null,1);
}
function sampleIptables(){
  return ["# Generated by iptables-save","*filter",":INPUT ACCEPT [0:0]",":FORWARD DROP [0:0]",":OUTPUT ACCEPT [0:0]",
   "-A INPUT -i lo -j ACCEPT","-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT",
   "-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT","-A INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT",
   "-A INPUT -s 10.0.0.0/8 -p tcp -m tcp --dport 5432 -j ACCEPT","-A INPUT -p tcp -m tcp --dport 3306 -j ACCEPT",
   "-A INPUT -s 203.0.113.7/32 -p tcp -m tcp --dport 22 -j ACCEPT","-A INPUT -p udp -m udp --dport 161 -j ACCEPT",
   "-A INPUT -s 192.0.2.0/24 -j DROP","-A INPUT -s 192.0.2.15/32 -p tcp -m tcp --dport 443 -j DROP","COMMIT"].join("\n");
}
window.fwReview={parse:parse,analyse:analyse,sampleAzure:sampleAzure,sampleIptables:sampleIptables};

var drop=$("fw-drop"),file=$("fw-file"),ta=$("fw-text");
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files[0])readFile(e.dataTransfer.files[0])});
$("fw-run").addEventListener("click",function(){if(ta.value.trim())load(ta.value,"pasted text");else $("fw-status").textContent="Paste the rules first, or drop a file."});
$("fw-sample").addEventListener("click",function(){ta.value=sampleAzure();load(ta.value,"a made-up Azure sample")});
$("fw-sample2").addEventListener("click",function(){ta.value=sampleIptables();load(ta.value,"a made-up Linux server")});
if(location.hash==="#sample"){ta.value=sampleAzure();load(ta.value,"a made-up Azure sample")}
})();
