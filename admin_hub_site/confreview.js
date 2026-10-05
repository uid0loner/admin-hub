(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e}
function plural(n,w){return n+" "+(n===1?w:/[^aeiou]y$/.test(w)?w.slice(0,-1)+"ies":w+"s")}
function uniq(a){var s={},o=[];a.forEach(function(x){if(!s[x]){s[x]=1;o.push(x)}});return o}
var SEV={crit:0,high:1,med:2,info:3},SEVNAME={crit:"critical",high:"high",med:"medium",info:"info"};

/* A result collects findings by key, so one check that hits five lines is one finding. */
function Result(fmt,label,text){this.fmt=fmt;this.label=label;this.lines=text.split(/\r?\n/);this.f={};this.order=[];this.notes=[];this.mask={};this.summary=null;this.tiles=[]}
Result.prototype.add=function(sev,key,title,why,line,note,steps,fix){
  var f=this.f[key];if(!f){f=this.f[key]={sev:sev,key:key,title:title,why:why,hits:[],steps:steps||[],fix:fix||""};this.order.push(key)}
  if(SEV[sev]<SEV[f.sev])f.sev=sev;
  if(line||note)f.hits.push({n:line||0,note:note||""});
  return f};
Result.prototype.done=function(){var self=this,list=this.order.map(function(k){return self.f[k]});
  list.forEach(function(f){f.hits.sort(function(a,b){return a.n-b.n})});
  list.sort(function(a,b){return SEV[a.sev]-SEV[b.sev]});
  this.findings=list;this.counts={crit:0,high:0,med:0,info:0};
  list.forEach(function(f){self.counts[f.sev]++});
  this.worst=list.length?list[0].sev:"none";
  var flag={};list.forEach(function(f){f.hits.forEach(function(h){if(h.n&&(!flag[h.n]||SEV[f.sev]<SEV[flag[h.n].sev]))flag[h.n]={sev:f.sev,title:f.title}})});
  this.flag=flag;return this};

/* ================= sshd_config ================= */
var SSH_KNOWN="acceptenv addressfamily allowagentforwarding allowgroups allowstreamlocalforwarding allowtcpforwarding allowusers authenticationmethods authorizedkeyscommand authorizedkeyscommanduser authorizedkeysfile authorizedprincipalscommand authorizedprincipalscommanduser authorizedprincipalsfile banner casignaturealgorithms challengeresponseauthentication channeltimeout chrootdirectory ciphers clientalivecountmax clientaliveinterval compression debianbanner denygroups denyusers disableforwarding exposeauthinfo fingerprinthash forcecommand gatewayports gssapiauthentication gssapicleanupcredentials gssapienablek5users gssapikeyexchange gssapistorecredentialsonrekey gssapistrictacceptorcheck hostbasedacceptedalgorithms hostbasedacceptedkeytypes hostbasedauthentication hostbasedusesnamefrompacketonly hostcertificate hostkey hostkeyagent hostkeyalgorithms ignorerhosts ignoreuserknownhosts include ipqos kbdinteractiveauthentication kerberosauthentication kerberosgetafstoken kerberosorlocalpasswd kerberosticketcleanup kerberosuniqueccache kexalgorithms listenaddress logingracetime loglevel logverbose macs match maxauthtries maxsessions maxstartups modulifile passwordauthentication permitemptypasswords permitlisten permitopen permitrootlogin permittty permittunnel permituserenvironment permituserrc persourcemaxstartups persourcenetblocksize persourcepenalties persourcepenaltyexemptlist pidfile port printlastlog printmotd pubkeyacceptedalgorithms pubkeyacceptedkeytypes pubkeyauthentication pubkeyauthoptions rdomain refuseconnection rekeylimit requiredrsasize revokedkeys securitykeyprovider setenv sshdauthpath sshdsessionpath streamlocalbindmask streamlocalbindunlink strictmodes subsystem syslogfacility tcpkeepalive trustedusercakeys unusedconnectiontimeout usedns usepam versionaddendum x11displayoffset x11forwarding x11uselocalhost xauthlocation".split(" ");
var SSH_OLD={protocol:1,rsaauthentication:1,rhostsrsaauthentication:1,serverkeybits:1,keyregenerationinterval:1,uselogin:1,useprivilegeseparation:1,showpatchlevel:1};
var SSH_MULTI={port:1,listenaddress:1,hostkey:1,hostcertificate:1,allowusers:1,allowgroups:1,denyusers:1,denygroups:1,acceptenv:1,setenv:1,subsystem:1,include:1,permitopen:1,permitlisten:1,match:1,authenticationmethods:0};
var SSH_EFF=[["PermitRootLogin","prohibit-password"],["PasswordAuthentication","yes"],["KbdInteractiveAuthentication","yes"],["PubkeyAuthentication","yes"],["PermitEmptyPasswords","no"],["UsePAM","no"],["AuthenticationMethods","any"],["AllowUsers","everyone"],["AllowGroups","everyone"],["MaxAuthTries","6"],["LoginGraceTime","120"],["X11Forwarding","no"],["AllowTcpForwarding","yes"],["AllowAgentForwarding","yes"],["GatewayPorts","no"],["PermitUserEnvironment","no"],["StrictModes","yes"],["LogLevel","INFO"],["Port","22"]];
var SSH_TEST=["Test the file before you reload: sshd -t prints nothing when it is fine.","Keep your current session open, reload with systemctl reload ssh (or sshd), and sign in from a second window before you close the first.","sshd -T shows the values really in force, including what comes from files under sshd_config.d."];
function sshd(text){
  var R=new Result("sshd","OpenSSH server configuration (sshd_config)",text),E=[],match=null,eff={},dup={},known={};
  SSH_KNOWN.forEach(function(k){known[k]=1});
  R.lines.forEach(function(raw,i){var s=raw.replace(/\s+#.*$/,"").trim();if(!s||s[0]==="#")return;
    var m=/^([A-Za-z0-9]+)(?:\s*=\s*|\s+)(.*)$/.exec(s);if(!m){m=[s,s,""]}
    var kw=m[1].toLowerCase(),val=m[2].trim().replace(/^"(.*)"$/,"$1");
    if(kw==="challengeresponseauthentication")kw="kbdinteractiveauthentication";
    if(kw==="match"){match=/^all$/i.test(val)?null:val;E.push({n:i+1,kw:kw,K:m[1],val:val,match:null});return}
    var e={n:i+1,kw:kw,K:m[1],val:val,v:val.toLowerCase(),match:match};E.push(e);
    if(!match){if(eff[kw]===undefined)eff[kw]=e;else if(!SSH_MULTI[kw])(dup[kw]=dup[kw]||[]).push(e)}
  });
  if(!E.length)throw new Error("there is no setting in it, only comments or empty lines");
  function val(k,d){return eff[k]?eff[k].v:d}
  function ln(k){return eff[k]?eff[k].n:0}
  var pw=val("passwordauthentication","yes"),root=val("permitrootlogin","prohibit-password"),kbd=val("kbdinteractiveauthentication",null),pam=val("usepam","no"),am=val("authenticationmethods","");
  var keyOnly=/publickey/.test(am)&&!/(^|[\s])(password|keyboard-interactive)(\s|$)/.test(am);
  if(val("protocol","2").indexOf("1")>=0&&val("protocol","2")!=="2")R.add("crit","proto","SSH protocol 1 is switched on","Protocol 1 was broken in the 1990s. Servers from the last ten years ignore the setting, so if this one still honours it, the software is far too old to face a network.",ln("protocol"),"allows protocol 1",["Remove the line and update OpenSSH."],"# remove the Protocol line");
  if(val("permitemptypasswords","no")==="yes")R.add("crit","empty","Accounts without a password can sign in","Any account whose password is empty gets a shell without being asked for anything.",ln("permitemptypasswords"),"empty passwords are accepted",["Set it to no. There is no setup where yes is the right answer."].concat(SSH_TEST),"PermitEmptyPasswords no");
  if(pw==="yes"&&!keyOnly)R.add("high","pw","Passwords are accepted","Every server with SSH on the internet sees password guessing around the clock. With passwords accepted, one weak or reused password on any account is enough.",ln("passwordauthentication"),eff.passwordauthentication?"passwords are accepted":"",["Make sure every person and every job that signs in has a key in authorized_keys, and try it.","Then switch passwords off with the lines below.","If passwords must stay for some accounts, allow them only in a Match block for those users or for the internal network."].concat(SSH_TEST),"PasswordAuthentication no\nKbdInteractiveAuthentication no");
  if(pw==="yes"&&!eff.passwordauthentication&&!keyOnly)R.f.pw.hits.push({n:0,note:"There is no PasswordAuthentication line, and without one the answer is yes."});
  if(root==="yes")R.add(pw==="yes"&&!keyOnly?"crit":"high","root","root can sign in directly"+(pw==="yes"&&!keyOnly?", with a password":""),"root exists on every system, so an attacker already knows half of the sign-in. A direct root session also leaves no trace of which person it was.",ln("permitrootlogin"),"root may sign in with any method",["Sign in as a named user and use sudo.","If scripts need root over SSH, prohibit-password allows keys only."].concat(SSH_TEST),"PermitRootLogin no");
  if(pw==="no"&&pam==="yes"&&kbd!=="no"&&!keyOnly)R.add("med","kbd","Passwords may still work through keyboard-interactive","PasswordAuthentication no closes one of two doors. With UsePAM yes, keyboard-interactive asks PAM, and PAM usually asks for the password.",ln("kbdinteractiveauthentication")||ln("usepam"),kbd==="yes"?"keyboard-interactive is on":"UsePAM is on and KbdInteractiveAuthentication is not set, which means yes",["Switch it off as well, unless you use it for one-time codes.","Check from another machine: ssh -o PubkeyAuthentication=no user@host must end with Permission denied (publickey)."].concat(SSH_TEST),"KbdInteractiveAuthentication no");
  if(val("hostbasedauthentication","no")==="yes")R.add("high","hostbased","Whole machines are trusted instead of users","Host-based authentication lets every user of a trusted client in without a key or password of their own.",ln("hostbasedauthentication"),"host-based authentication is on",["Switch it off unless a cluster setup really depends on it."],"HostbasedAuthentication no");
  if(val("ignorerhosts","yes")==="no")R.add("high","rhosts","Users can open the server with a .rhosts file","With IgnoreRhosts no, a file in a home directory decides which other machines are trusted.",ln("ignorerhosts"),".rhosts files are honoured",["Set it back to yes."],"IgnoreRhosts yes");
  if(val("strictmodes","yes")==="no")R.add("med","strict","Permissions of key files are not checked","StrictModes no accepts an authorized_keys file that other users can write to, which means they can add their own key.",ln("strictmodes"),"permission check is off",["Set it to yes and fix the permissions it then complains about: chmod 700 ~/.ssh, chmod 600 ~/.ssh/authorized_keys."],"StrictModes yes");
  if(val("permituserenvironment","no")!=="no")R.add("med","userenv","Users can set environment variables for their session","Variables such as LD_PRELOAD from ~/.ssh/environment can get around ForceCommand and other restrictions.",ln("permituserenvironment"),"user environment files are processed",["Set it to no."],"PermitUserEnvironment no");
  if(val("gatewayports","no")!=="no")R.add("med","gateway","Forwarded ports are reachable by other machines","A user who forwards a port through this server opens it to everyone who can reach the server, not just to themselves.",ln("gatewayports"),"remote forwards bind to all addresses",["Set it to no unless the server is meant to be a relay."],"GatewayPorts no");
  if(val("x11forwarding","no")==="yes")R.add("info","x11","X11 forwarding is on","Rarely needed on a server, and a forwarded display gives the server side a way to watch the client's screen and keyboard.",ln("x11forwarding"),"",["Switch it off unless someone starts graphical programs over SSH."],"X11Forwarding no");
  var mat=+val("maxauthtries","6");if(mat>6)R.add("info","tries","Many attempts per connection","More than six tries per connection makes guessing a little cheaper and adds nothing for real users.",ln("maxauthtries"),mat+" tries",["3 to 6 is plenty."],"MaxAuthTries 4");
  if(eff.logingracetime&&(/^0+[smh]?$/.test(val("logingracetime"))||(+val("logingracetime")>120)))R.add("info","grace","Unfinished sign-ins may stay open for long","Connections that never finish signing in use up the slots that MaxStartups allows, which is an easy way to lock everyone out.",ln("logingracetime"),val("logingracetime")==="0"?"no time limit":"",["30 to 60 seconds is enough."],"LoginGraceTime 30");
  if(/^(quiet|fatal|error)$/.test(val("loglevel","info")))R.add("med","log","Sign-ins are not logged","At this level a failed or successful sign-in leaves no line in the log, so neither you nor fail2ban can see an attack.",ln("loglevel"),"level "+val("loglevel"),["Set it to INFO, or VERBOSE to also record which key was used."],"LogLevel VERBOSE");
  [["ciphers","Ciphers",/cbc|arcfour|3des|blowfish|cast128|^none$/],["macs","MACs",/md5|hmac-sha1|umac-64|ripemd|^none$/],["kexalgorithms","KexAlgorithms",/group1-sha1|group14-sha1|group-exchange-sha1/],["hostkeyalgorithms","HostKeyAlgorithms",/^ssh-dss|^ssh-rsa$|^ssh-rsa-cert/],["pubkeyacceptedalgorithms","PubkeyAcceptedAlgorithms",/^ssh-dss|^ssh-rsa$|^ssh-rsa-cert/],["pubkeyacceptedkeytypes","PubkeyAcceptedKeyTypes",/^ssh-dss|^ssh-rsa$|^ssh-rsa-cert/]].forEach(function(c){
    if(!eff[c[0]])return;var v=eff[c[0]].v;if(v[0]==="-")return;
    var weak=v.replace(/^[+^]/,"").split(",").filter(function(x){return c[2].test(x.trim())});
    if(weak.length)R.add("med","crypto","Outdated algorithms are switched on","Current OpenSSH leaves these out for a reason. Lists like this are usually added to let one old device connect, and then stay for years.",eff[c[0]].n,c[1]+": "+weak.join(", "),["Find out which client needed it. If it is gone, remove the line and the defaults apply.","If it is still there, allow the old algorithm only for its address in a Match Address block.","ssh -Q cipher, ssh -Q mac and ssh -Q kex list what the installed version supports."],"# remove the line: the defaults of a current OpenSSH are good")});
  Object.keys(dup).forEach(function(k){dup[k].forEach(function(e){if(e.v!==eff[k].v)R.add("med","dup","A setting appears twice, and the second one is ignored","sshd takes the first value it finds for each keyword. A later line with another value looks like it is in force and is not. Files from Include count in the place where the Include line stands.",e.n,e.K+" "+e.val+" has no effect: line "+eff[k].n+" already set "+eff[k].val,["Delete one of the two lines, so that the file says what the server does.","sshd -T | grep -i "+k+" shows the value in force."])})});
  var mrisk={passwordauthentication:"yes",permitrootlogin:"yes",permitemptypasswords:"yes",kbdinteractiveauthentication:"yes"};
  E.forEach(function(e){if(e.match&&mrisk[e.kw]===e.v&&!(e.kw==="passwordauthentication"&&pw==="yes"))R.add(e.kw==="permitemptypasswords"?"crit":"med","match","Exceptions for some users or addresses","A Match block overrides the general setting for whoever it matches. That is the right tool, but each exception is a way in and should be as narrow as possible.",e.n,e.K+" "+e.val+" for: Match "+e.match,["Check that the Match line is as narrow as it can be: a named user and an address range, not a group that grows.","Confirm that each exception is still needed."])});
  E.forEach(function(e){if(SSH_OLD[e.kw])R.add("info","old","Settings that no longer exist","Current OpenSSH ignores these keywords and prints a warning at start. They suggest the file was carried over from an old system and never reviewed.",e.n,e.K+" is obsolete",["Remove the lines."]);
    else if(!known[e.kw])R.add("info","unknown","Keywords this page does not know","Either a typing mistake or a keyword added by your distribution. sshd refuses to start when it meets a keyword it does not know, so a typing mistake here locks you out at the next restart.",e.n,e.K,["Run sshd -t: it names the line if the keyword is wrong."])});
  if(!eff.allowusers&&!eff.allowgroups)R.add("info","allow","Every account on the system may use SSH","Without AllowUsers or AllowGroups, service accounts and forgotten test users can sign in as well, if they have a password or a key.",0,"There is no AllowUsers or AllowGroups line.",["Create a group for the people who need SSH and allow only that group."],"AllowGroups ssh-users");
  var inc=E.filter(function(e){return e.kw==="include"});
  if(inc.length)R.notes.push("The file includes other files ("+inc.map(function(e){return e.val}).join(", ")+"), which this page cannot see. For each keyword the first value wins, so a file included near the top overrides the lines below it. Cloud images often ship a 50-cloud-init.conf there that switches passwords back on. sshd -T shows the result of all files together.");
  R.notes.push("Where a line is missing, the default of upstream OpenSSH is assumed. Distributions sometimes compile in other defaults, and very old versions differ. sshd -T on the server is the final word.");
  var rows=SSH_EFF.map(function(d){var k=d[0].toLowerCase(),e=eff[k];
    if(SSH_MULTI[k]){var all=E.filter(function(x){return x.kw===k&&!x.match});return [d[0],all.length?all.map(function(x){return x.val}).join(", "):d[1],all.length?"line "+all.map(function(x){return x.n}).join(", "):"default"]}
    return [d[0],e?e.val:d[1],e?"line "+e.n:"default"]});
  R.summary={title:"settings in force",intro:"The values that decide who gets in, taken from the first line that sets each one. \"default\" means the file says nothing and OpenSSH decides.",cols:["Setting","Value","From"],rows:rows};
  var set=E.filter(function(e){return e.kw!=="match"}).length,blocks=E.filter(function(e){return e.kw==="match"}).length;
  R.tiles=[["settings",String(set),plural(blocks,"Match block")],["passwords",pw==="yes"&&!keyOnly?"accepted":"off",eff.passwordauthentication?"line "+eff.passwordauthentication.n:"by default"],["root sign-in",root==="yes"?"allowed":root==="no"?"off":"keys only",eff.permitrootlogin?"line "+eff.permitrootlogin.n:"by default"]];
  return R.done()}

/* ================= nginx ================= */
function nginxParse(text){
  var root={name:"(file)",args:[],line:0,children:[],parent:null},cur=root,words=[],wline=0,i=0,n=text.length,line=1,w="",c,q;
  function push(){if(w!==""){if(!words.length)wline=wl;words.push(w);w=""}}
  var wl=1;
  while(i<n){c=text[i];
    if(c==="\n"){push();line++;i++;continue}
    if(c==="#"&&w===""){while(i<n&&text[i]!=="\n")i++;continue}
    if(c==='"'||c==="'"){q=c;if(w==="")wl=line;i++;while(i<n&&text[i]!==q){if(text[i]==="\\"&&i+1<n){w+=text[i]+text[i+1];i+=2;continue}if(text[i]==="\n")line++;w+=text[i++]}i++;if(w==="")w="\u0000";continue}
    if(/\s/.test(c)){push();i++;continue}
    if(c==="{"&&w.slice(-1)==="$"){var j=text.indexOf("}",i);if(j<0)j=n-1;w+=text.slice(i,j+1);i=j+1;continue}
    if(c===";"||c==="{"||c==="}"){push();
      if(c===";"){if(words.length){cur.children.push({name:words[0].toLowerCase(),args:words.slice(1),line:wline,children:null,parent:cur})}words=[]}
      else if(c==="{"){var nd={name:(words[0]||"").toLowerCase(),args:words.slice(1),line:words.length?wline:line,children:[],parent:cur};cur.children.push(nd);cur=nd;words=[]}
      else{if(words.length)throw new Error("the directive \""+words[0]+"\" on line "+wline+" does not end with a semicolon");if(cur.parent)cur=cur.parent;else throw new Error("line "+line+" closes a block with } that was never opened");words=[]}
      i++;continue}
    if(w==="")wl=line;w+=c;i++}
  push();
  if(cur!==root)throw new Error("the block \""+cur.name+"\" that opens on line "+cur.line+" is never closed with }");
  if(words.length)throw new Error("the directive \""+words[0]+"\" on line "+wline+" does not end with a semicolon");
  root.children.forEach(function fix(x){x.args=x.args.map(function(a){return a==="\u0000"?"":a});if(x.children)x.children.forEach(fix)});
  return root}
function walk(node,fn){(node.children||[]).forEach(function(c){fn(c);if(c.children)walk(c,fn)})}
function kids(node,name){return (node.children||[]).filter(function(c){return c.name===name})}
function inherited(node,name){for(var p=node;p;p=p.parent){var k=kids(p,name);if(k.length)return k}return []}
function has(node,name){var hit=false;walk(node,function(c){if(c.name===name)hit=true});return hit}
function nginx(text){
  var R=new Result("nginx","nginx configuration",text),root=nginxParse(text),servers=[],all=[];
  walk(root,function(c){all.push(c);if(c.name==="server"&&c.children)servers.push(c)});
  if(!all.length)throw new Error("there is no directive in it");
  var fragment=!servers.length;if(fragment)servers=[root];
  function isTls(s){return kids(s,"listen").some(function(l){return l.args.indexOf("ssl")>=0||l.args.indexOf("quic")>=0})||kids(s,"ssl").some(function(l){return l.args[0]==="on"})}
  function local(s){var l=kids(s,"listen");return l.length>0&&l.every(function(x){return /^(127\.|localhost|\[::1\]|unix:)/.test(x.args[0]||"")})}
  function redirects(s){var r=kids(s,"return").concat([]);kids(s,"location").forEach(function(l){if(/^\/?$/.test(l.args[l.args.length-1]||""))r=r.concat(kids(l,"return"))});
    return r.some(function(x){return /^30[1278]$/.test(x.args[0])&&/^https:/.test(x.args[1]||"")})||kids(s,"rewrite").some(function(x){return /^https:/.test(x.args[1]||"")})}
  function serves(s){return has(s,"root")||has(s,"proxy_pass")||has(s,"fastcgi_pass")||has(s,"uwsgi_pass")||has(s,"alias")||has(s,"grpc_pass")}
  function names(s){var k=kids(s,"server_name");return k.length?k[0].args.join(" "):fragment?"(pasted block)":"(no server_name)"}
  var RELOAD=["Test before you reload: nginx -t. Then systemctl reload nginx.","nginx -T prints the whole configuration with every included file, which is the best thing to paste here."];
  all.forEach(function(d){var a=d.args,a0=a[0]||"";
    if(d.name==="ssl_protocols"){var old=a.filter(function(x){return /^(SSLv2|SSLv3|TLSv1|TLSv1\.1)$/i.test(x)});if(old.length)R.add("high","tlsold","Old TLS versions are allowed","SSL 3, TLS 1.0 and TLS 1.1 have known weaknesses and are switched off in every current browser. Leaving them on only helps an attacker who wants to downgrade a connection.",d.line,old.join(", "),["Allow TLS 1.2 and 1.3 only. Clients that cannot do TLS 1.2 date from before 2014."].concat(RELOAD),"ssl_protocols TLSv1.2 TLSv1.3;")}
    if(d.name==="ssl_ciphers"){var weak=a0.split(":").filter(function(x){return x&&!/^[!-]/.test(x)&&/RC4|3DES|(^|-)DES(-|$)|MD5|NULL|EXP|(^|\+)LOW|ADH|AECDH|SEED|IDEA/i.test(x)});if(weak.length)R.add("high","ciphers","Broken ciphers are allowed","These cipher suites are breakable or offer no encryption or no authentication at all.",d.line,weak.slice(0,6).join(", "),["Use the intermediate list from the Mozilla SSL Configuration Generator, or remove the line: with TLS 1.2 and 1.3 only, the defaults are sound."].concat(RELOAD))}
    if(d.name==="autoindex"&&a0==="on")R.add("med","autoindex","Directory listings are on","Anyone can browse the folder and find files that were never linked: backups, exports, old versions.",d.line,"in "+where(d),["Switch it off unless the location is meant to be a download area.","If it is, check what else lies in that folder."].concat(RELOAD),"autoindex off;");
    if(d.name==="alias"&&d.parent.name==="location"){var la=d.parent.args,path=la[la.length-1]||"";if(la.length===1&&path.slice(-1)!=="/"&&a0.slice(-1)==="/")R.add("high","alias","A location lets requests climb out of its folder","location "+path+" without a slash at the end, combined with an alias that has one, turns a request for "+path+"../ into the parent folder of the alias. This is a well-known way to read files next to the intended directory, such as the application's source or configuration.",d.line,"location "+path+" with alias "+a0,["Make both end with a slash, or neither."].concat(RELOAD),"location "+path+"/ {\n    alias "+a0+";\n}")}
    if((d.name==="return"||d.name==="rewrite"||d.name==="add_header"||d.name==="proxy_set_header"||d.name==="proxy_pass")&&a.some(function(x,i){return (d.name!=="rewrite"||i>0)&&/\$(uri|document_uri)\b/.test(x)}))R.add("med","crlf","$uri in a redirect or header","$uri is the decoded path, so an encoded line break in the address (%0d%0a) becomes a real one. In a redirect or a header that lets an attacker add headers of their own to your response.",d.line,d.name+" "+a.join(" "),["Use $request_uri, which is the address as the client sent it."].concat(RELOAD),d.name==="return"?"return 301 https://$host$request_uri;":"");
    if(d.name==="proxy_pass"&&/^https?:\/\/[^\/]*\$(host|http_host|arg_\w+|http_\w+|request_uri|query_string|args)/.test(a0))R.add("high","ssrf","The client decides where the proxy connects to","The target of proxy_pass is built from the request. Whoever sends the request can point nginx at any server it can reach, including internal ones that are not meant to be public.",d.line,"proxy_pass "+a0,["Proxy to a fixed address or a named upstream.","If the target must vary, map the allowed values with a map block and reject everything else."].concat(RELOAD));
    if(d.name==="user"&&d.parent===root&&a0==="root")R.add("high","root","The worker processes run as root","The workers handle every request. A bug in nginx or a module is then a root compromise instead of one confined to an unprivileged account.",d.line,"user root",["Use the account your distribution created: www-data on Debian and Ubuntu, nginx on Red Hat."],"user www-data;");
    if(d.name==="root"&&/^\/(etc|root|home|var|usr)?\/?$/.test(a0))R.add("high","docroot","The document root is a system folder","Everything below this folder that the worker can read can be requested by name.",d.line,"root "+a0,["Point root at a folder that holds only what is meant to be public."]);
    if(d.name==="set_real_ip_from"&&/^(0\.0\.0\.0\/0|::\/0)$/.test(a0))R.add("high","realip","Any client can fake its address","With every source trusted, nginx takes the client address from a header that the client writes itself. Logs, rate limits and allow rules then work on a made-up address.",d.line,"set_real_ip_from "+a0,["List only the addresses of your own load balancer or CDN."]);
    if(d.name==="add_header"&&/^access-control-allow-origin$/i.test(a0)&&/\$http_origin/.test(a[1]||""))R.add("med","cors","Every website may read responses from this one","Echoing the Origin header back allows any site a user visits to call this server with the user's cookies and read the answer.",d.line,"add_header "+a.join(" "),["Compare $http_origin against a list of your own origins with a map block and send the header only for those."]);
    if(d.name==="ssl"&&a0==="on")R.add("info","sslon","An outdated directive","ssl on was removed in nginx 1.25. After an upgrade the configuration test fails on this line.",d.line,"ssl on",["Remove the line and write ssl on the listen line instead."],"listen 443 ssl;");
    if(d.name==="client_max_body_size"&&/^0+[kmg]?$/i.test(a0))R.add("info","body","Uploads have no size limit","Zero switches the check off. A single client can then fill the disk or the memory of the application behind nginx.",d.line,"in "+where(d),["Set the largest upload the application really needs."],"client_max_body_size 50m;");
    if(d.name==="if"&&d.parent.name==="location"&&d.children.some(function(c){return !/^(return|rewrite|set|break)$/.test(c.name)}))R.add("info","if","if with more than return or rewrite inside a location","Inside a location, if creates a hidden nested location, and directives other than return and rewrite behave in ways nobody expects: headers vanish, try_files stops working. The nginx documentation calls this \"if is evil\".",d.line,"contains "+uniq(d.children.map(function(c){return c.name})).join(", "),["Move the condition into a map block or a separate location."]);
    if(d.name==="location"){var p=d.args[d.args.length-1]||"",rx=/^~/.test(d.args[0]||"");
      if((kids(d,"stub_status").length||/^\/(nginx_|server-|php-fpm-|fpm-)?status\/?$/i.test(p))&&!kids(d,"allow").length&&!kids(d,"deny").length&&!kids(d,"auth_basic").length)R.add("med","status","A status page is open to everyone","Status pages show connection counts, and for PHP-FPM also the scripts and addresses of current requests.",d.line,"location "+p,["Allow your monitoring address and deny the rest."],"location "+p+" {\n    allow 127.0.0.1;\n    deny all;\n}");
      if(rx&&/php/i.test(p)&&kids(d,"fastcgi_pass").length&&!kids(d,"try_files").length&&!kids(d,"fastcgi_split_path_info").length&&!kids(d,"include").some(function(x){return /fastcgi-php/.test(x.args[0]||"")})&&!kids(d,"if").length)R.add("med","php","PHP requests are passed on without checking that the file exists","A request for /upload/picture.jpg/x.php matches this location. If PHP is set up to guess the script (cgi.fix_pathinfo=1, the old default), it runs picture.jpg as code: an uploaded image becomes a web shell.",d.line,"location "+d.args.join(" "),["Add try_files $uri =404 to the location, or include the snippet your distribution ships (snippets/fastcgi-php.conf on Debian and Ubuntu).","Set cgi.fix_pathinfo=0 in php.ini."],"location ~ \\.php$ {\n    try_files $uri =404;\n    ...\n}")}
  });
  function where(d){for(var p=d.parent;p;p=p.parent){if(p.name==="location")return "location "+p.args.join(" ");if(p.name==="server")return "server "+names(p)}return "the main context"}
  /* add_header does not add up across levels */
  all.forEach(function(b){if(!b.children||b===root)return;var mine=kids(b,"add_header");if(!mine.length||!b.parent)return;
    var up=inherited(b.parent,"add_header");if(!up.length)return;
    var have=mine.map(function(x){return (x.args[0]||"").toLowerCase()}),lost=uniq(up.map(function(x){return x.args[0]||""}).filter(function(x){return have.indexOf(x.toLowerCase())<0}));
    if(lost.length)R.add("med","addheader","Headers set further up are dropped here","add_header lines are inherited only when a block has none of its own. This block sets one, so every header from the level above is gone for these requests. It is the most common reason for security headers missing on part of a site.",mine[0].line,(b.name==="location"?"location "+b.args.join(" "):b.name)+" loses: "+lost.join(", "),["Repeat the headers from the upper level in this block.","Or put them all in one file and include it wherever add_header is used."].concat(RELOAD))});
  var tls=0,rows=[];
  servers.forEach(function(s){var t=isTls(s),nm=names(s),L=kids(s,"listen").map(function(l){return l.args.join(" ")}).join(", ")||(fragment?"":"80 (default)"),content=serves(s),red=redirects(s);
    if(t)tls++;
    var goes=red&&!t?"redirect to HTTPS":uniq((function(){var o=[];walk(s,function(c){if(c.name==="proxy_pass")o.push("proxy to "+c.args[0]);if(c.name==="fastcgi_pass")o.push("PHP/FastCGI "+c.args[0]);if(c.name==="uwsgi_pass")o.push("uWSGI "+c.args[0])});var r=kids(s,"root");if(r.length)o.push("files in "+r[0].args[0]);if(!o.length&&kids(s,"return").length)o.push("return "+kids(s,"return")[0].args.join(" "));return o})()).slice(0,3).join(", ")||"nothing set";
    rows.push([nm,L,t?"yes":"no",goes]);
    var whole=!(fragment&&!kids(s,"listen").length);
    if(whole&&!t&&content&&!red&&!local(s))R.add("med","plain","A site is served without encryption","Everything on this server block travels in clear text: sign-ins, cookies, and the pages themselves, which anyone on the way can change.",(kids(s,"listen")[0]||s).line,"server "+nm+" listens without ssl and serves content",["Get a certificate (certbot does it in a minute) and add a block that listens on 443 ssl.","Turn this block into a plain redirect."].concat(RELOAD),"server {\n    listen 80;\n    server_name "+(nm[0]==="("?"example.org":nm)+";\n    return 301 https://$host$request_uri;\n}");
    if(whole&&!t)walk(s,function(c){if(c.name==="auth_basic"&&c.args[0]!=="off")R.add("high","basic","A password prompt without encryption","Basic authentication sends the password with every request, only base64-encoded. Without TLS anyone on the path can read it.",c.line,"auth_basic in server "+nm,["Serve this block over HTTPS."])});
    if(whole&&!t&&kids(s,"ssl_certificate").length)R.add("med","nossl","A certificate is configured but TLS is not switched on","The block names a certificate, but no listen line says ssl. nginx then speaks plain HTTP on that port.",kids(s,"ssl_certificate")[0].line,"server "+nm,["Add ssl to the listen line."],"listen 443 ssl;");
    if(t&&content){var hdr=[];walk(s,function(c){if(c.name==="add_header")hdr.push(c)});hdr=hdr.concat(inherited(s.parent||root,"add_header"));
      var hn=hdr.map(function(h){return (h.args[0]||"").toLowerCase()}),csp=hdr.filter(function(h){return /^content-security-policy$/i.test(h.args[0]||"")&&/frame-ancestors/.test(h.args[1]||"")}).length,miss=[];
      if(hn.indexOf("strict-transport-security")<0)miss.push("Strict-Transport-Security");
      if(hn.indexOf("x-content-type-options")<0)miss.push("X-Content-Type-Options");
      if(hn.indexOf("x-frame-options")<0&&!csp)miss.push("X-Frame-Options or a frame-ancestors policy");
      if(miss.length)R.add("info","headers","Security headers are not set","Three headers that cost one line each: the first tells browsers to never use plain HTTP for this site again, the second stops them guessing file types, the third stops other sites from showing yours in a frame. The application behind nginx may already send them: check with curl -I.",s.line,"server "+nm+": "+miss.join(", "),["Add them in the server block. The word always makes nginx send them with error pages too.","Start HSTS with a short max-age and raise it once you are sure every subdomain works over HTTPS."],'add_header Strict-Transport-Security "max-age=31536000" always;\nadd_header X-Content-Type-Options "nosniff" always;\nadd_header X-Frame-Options "SAMEORIGIN" always;')}
    if(has(s,"root")&&!local(s)){var guard=false;walk(s,function(c){if(c.name==="location"&&/^~/.test(c.args[0]||"")&&/\/\\\.|\\\.\(?(git|env|ht|svn)/.test(c.args[c.args.length-1]||"")&&(kids(c,"deny").length||kids(c,"return").length))guard=true});
      if(!guard)R.add("med","dotfiles","Hidden files are served if they exist","Nothing in this block stops requests for names that start with a dot. A .git folder gives away the source code, and a .env file the passwords: both are found by scanners within hours.",(kids(s,"root")[0]||s).line,"server "+nm+" has a root and no rule for dot files",["Add the location below. The exception keeps certificate renewal working."].concat(RELOAD),"location ~ /\\.(?!well-known) {\n    deny all;\n}")}
    walk(s,function(c){if(c.name==="proxy_pass"){var set=inherited(c.parent,"proxy_set_header").map(function(x){return (x.args[0]||"").toLowerCase()});
      if(set.indexOf("x-forwarded-for")<0&&set.indexOf("x-real-ip")<0)R.add("info","fwd","The application behind the proxy cannot see who is asking","Without these headers every request seems to come from nginx itself. The application's log, its rate limits and its lockouts then treat all visitors as one.",c.line,"proxy_pass "+c.args[0]+" in "+where(c),["Pass the client address and the original host name on."],"proxy_set_header Host $host;\nproxy_set_header X-Real-IP $remote_addr;\nproxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\nproxy_set_header X-Forwarded-Proto $scheme;")}});
    kids(s,"access_log").forEach(function(c){if(c.args[0]==="off")R.add("info","nolog","Requests to a whole site are not logged","After an incident, the access log is how you find out what was fetched and by whom.",c.line,"server "+nm,["Switch logging off only for noise such as favicon.ico, in its own location."])});
  });
  if(!fragment){
    var tok=all.filter(function(d){return d.name==="server_tokens"});
    if(!tok.some(function(d){return d.args[0]==="off"}))R.add("info","tokens","The nginx version is shown to everyone","Error pages and the Server header carry the exact version, which tells a scanner which known bugs to try.",tok.length?tok[0].line:0,tok.length?"server_tokens "+tok[0].args[0]:"There is no server_tokens line, and the default is on.",["Switch it off in the http block."],"server_tokens off;");
    if(tls&&!all.some(function(d){return d.name==="ssl_protocols"}))R.add("info","tlsdef","The TLS versions are left to the default","Fine on nginx 1.23.4 and newer, where the default is TLS 1.2 and 1.3. Older versions also allow TLS 1.0 and 1.1 unless told otherwise.",0,"There is no ssl_protocols line.",["Say it explicitly, then the answer does not depend on the version."],"ssl_protocols TLSv1.2 TLSv1.3;");
    if(servers.length>1&&!servers.some(function(s){return kids(s,"listen").some(function(l){return l.args.indexOf("default_server")>=0})||kids(s,"server_name").some(function(n){return n.args.indexOf("_")>=0})}))R.add("info","default","Requests for unknown names land on the first site","Without a default server, a request that asks for a host name you never configured, or for the bare IP address, is answered by whichever server block comes first.",0,"No listen line says default_server.",["Add a catch-all block that closes the connection."],"server {\n    listen 80 default_server;\n    listen 443 ssl default_server;\n    ssl_reject_handshake on;\n    return 444;\n}");
  }
  var inc=all.filter(function(d){return d.name==="include"&&!/mime\.types|fastcgi_params|fastcgi\.conf|uwsgi_params|scgi_params/.test(d.args[0]||"")});
  if(inc.length)R.notes.push("The file includes others that this page cannot see ("+uniq(inc.map(function(d){return d.args[0]})).slice(0,5).join(", ")+"). Settings from the http block and from snippets are missing from the picture. nginx -T prints everything in one piece.");
  if(fragment)R.notes.push("There is no server block in the text, so it was read as the inside of one. Checks that need the whole server, such as TLS and the version header, were left out.");
  R.summary={title:fragment?"what was read":"server blocks",intro:"Each server block with the names it answers to and where the requests go.",cols:["Names","Listens on","TLS","Requests go to"],rows:rows};
  R.tiles=[[fragment?"blocks":"server blocks",String(fragment?all.filter(function(d){return d.children}).length:servers.length),plural(all.filter(function(d){return d.name==="location"}).length,"location")],["with TLS",String(tls),fragment?"":"of "+servers.length],["directives",String(all.filter(function(d){return !d.children}).length),""]];
  return R.done()}

/* ================= docker compose ================= */
function yaml(text){
  var L=[],notes={};
  text.split(/\r?\n/).forEach(function(raw,i){
    if(/^\s*\t/.test(raw)&&raw.trim()&&raw.trim()[0]!=="#")throw new Error("line "+(i+1)+" is indented with a tab. YAML only allows spaces");
    var s="",q=null,j,c;for(j=0;j<raw.length;j++){c=raw[j];if(q){if(c===q)q=null}else if(c==='"'||c==="'")q=c;else if(c==="#"&&(j===0||/\s/.test(raw[j-1])))break;s+=c}
    if(!s.trim()||/^(---|\.\.\.)\s*$/.test(s))return;
    L.push({ind:s.length-s.replace(/^ +/,"").length,t:s.trim(),n:i+1})});
  var pos=0;
  function unq(s){s=s.trim();if(/^&\S+\s*/.test(s)){notes.anchor=1;s=s.replace(/^&\S+\s*/,"")}if(s[0]==="*"){notes.anchor=1}
    if((s[0]==='"'&&s.slice(-1)==='"')||(s[0]==="'"&&s.slice(-1)==="'"))return s.slice(1,-1);return s}
  function split(s){var o=[],cur="",q=null,d=0,c,i;for(i=0;i<s.length;i++){c=s[i];if(q){if(c===q)q=null;cur+=c}else if(c==='"'||c==="'"){q=c;cur+=c}else if(c==="["||c==="{"){d++;cur+=c}else if(c==="]"||c==="}"){d--;cur+=c}else if(c===","&&!d){o.push(cur);cur=""}else cur+=c}if(cur.trim())o.push(cur);return o}
  function scalar(s,n){s=s.trim();
    if(s[0]==="["&&s.slice(-1)==="]")return{t:"seq",line:n,items:split(s.slice(1,-1)).map(function(x){return{line:n,v:scalar(x,n)}})};
    if(s[0]==="{"&&s.slice(-1)==="}")return{t:"map",line:n,items:split(s.slice(1,-1)).map(function(x){var k=kv(x.trim());return{k:k?k[0]:unq(x),line:n,v:scalar(k?k[1]:"",n)}})};
    return{t:"str",line:n,v:unq(s),raw:s}}
  function kv(t){var q=null,i,c;for(i=0;i<t.length;i++){c=t[i];if(q){if(c===q)q=null}else if(c==='"'||c==="'")q=c;else if(c===":"&&(i===t.length-1||t[i+1]===" "))return[unq(t.slice(0,i)),t.slice(i+1).trim()]}return null}
  function value(rest,ind,n){
    if(rest===""||/^&\S+$/.test(rest)){if(rest)notes.anchor=1;
      if(pos<L.length&&(L[pos].ind>ind||(L[pos].ind===ind&&/^-(\s|$)/.test(L[pos].t))))return block(L[pos].ind);
      return{t:"str",line:n,v:"",raw:""}}
    if(/^[|>][+-]?\d*$/.test(rest)){var b=[];while(pos<L.length&&L[pos].ind>ind)b.push(L[pos++].t);return{t:"str",line:n,v:b.join("\n"),raw:b.join("\n")}}
    if(/^[\[{]/.test(rest)){var bal=function(x){return (x.match(/[\[{]/g)||[]).length-(x.match(/[\]}]/g)||[]).length};while(bal(rest)>0&&pos<L.length)rest+=" "+L[pos++].t}
    return scalar(rest,n)}
  function block(ind){
    if(/^-(\s|$)/.test(L[pos].t)){var seq={t:"seq",line:L[pos].n,items:[]};
      while(pos<L.length&&L[pos].ind===ind&&/^-(\s|$)/.test(L[pos].t)){var l=L[pos],rest=l.t.replace(/^-\s*/,""),off=l.t.length-rest.length;
        if(rest===""){pos++;seq.items.push({line:l.n,v:pos<L.length&&L[pos].ind>ind?block(L[pos].ind):{t:"str",line:l.n,v:"",raw:""}})}
        else if(kv(rest)&&!/^["']/.test(rest)){L[pos]={ind:ind+off,t:rest,n:l.n};seq.items.push({line:l.n,v:block(ind+off)})}
        else{pos++;seq.items.push({line:l.n,v:scalar(rest,l.n)})}}
      return seq}
    var map={t:"map",line:L[pos].n,items:[]};
    while(pos<L.length&&L[pos].ind===ind&&!/^-(\s|$)/.test(L[pos].t)){var m=L[pos],p=kv(m.t);
      if(!p)throw new Error("line "+m.n+" is not \"key: value\". Check the indentation and the colon");
      pos++;if(p[0]==="<<")notes.anchor=1;map.items.push({k:p[0],line:m.n,v:value(p[1],ind,m.n)})}
    if(pos<L.length&&L[pos].ind>ind)throw new Error("line "+L[pos].n+" does not line up with the lines around it. Check the indentation");
    return map}
  if(!L.length)throw new Error("it is empty");
  var doc=block(L[0].ind);
  if(pos<L.length)throw new Error("line "+L[pos].n+" does not line up with the lines above it. Check the indentation");
  return{doc:doc,anchors:!!notes.anchor}}
function yget(m,k){if(!m||m.t!=="map")return null;for(var i=0;i<m.items.length;i++)if(m.items[i].k===k)return m.items[i];return null}
function ytrue(m,k){var x=yget(m,k);return !!x&&x.v.t==="str"&&/^(true|yes|on)$/i.test(x.v.v)}
function ystr(m,k){var x=yget(m,k);return x&&x.v.t==="str"?x.v.v:null}
function ylist(m,k){var x=yget(m,k);if(!x)return[];if(x.v.t==="seq")return x.v.items.map(function(i){return{line:i.line,v:i.v}});if(x.v.t==="str"&&x.v.v!=="")return[{line:x.line,v:x.v}];if(x.v.t==="map")return x.v.items.map(function(i){return{line:i.line,k:i.k,v:i.v}});return[]}
var PORTS={22:"SSH",23:"Telnet",3389:"RDP",5900:"VNC",2375:"the Docker API",2376:"the Docker API",1433:"SQL Server",1521:"Oracle",3306:"MySQL",5432:"PostgreSQL",27017:"MongoDB",6379:"Redis",9200:"Elasticsearch",9300:"Elasticsearch",11211:"Memcached",5984:"CouchDB",9042:"Cassandra",5672:"RabbitMQ",15672:"the RabbitMQ console",8086:"InfluxDB",9092:"Kafka",2181:"ZooKeeper",9000:"an admin console (Portainer, MinIO)",9090:"Prometheus",8500:"Consul",2379:"etcd",5601:"Kibana",8081:"an admin interface",9443:"Portainer"};
var WEAK=/^(password|passwort|passw0rd|changeme|change-me|change_me|admin|root|secret|test|example|123456?|12345678|qwerty|letmein|postgres|mysql|mariadb|redis|default|toor|pass|demo|guest|user)$/i;
function compose(text){
  var R=new Result("compose","Docker Compose file",text),Y=yaml(text),doc=Y.doc;
  if(doc.t!=="map")throw new Error("the top level is a list, a Compose file starts with services:");
  var sv=yget(doc,"services"),svc=sv&&sv.v.t==="map"?sv.v.items:null;
  if(!svc){svc=doc.items.filter(function(i){return i.v.t==="map"&&(yget(i.v,"image")||yget(i.v,"build"))});if(!svc.length)throw new Error("there is no services: section in it")}
  var UP=["Apply with docker compose up -d: only the changed containers are recreated.","docker compose config prints the file as Compose understands it, with every variable filled in."],rows=[],pub=0,hard=[];
  svc.forEach(function(s){var name=s.k,m=s.v,notable=[];if(m.t!=="map")return;
    var image=ystr(m,"image"),build=yget(m,"build"),user=ystr(m,"user");
    if(ytrue(m,"privileged")){notable.push("privileged");R.add("crit","priv","A container runs in privileged mode","Privileged switches off nearly everything that separates the container from the host: it sees all devices and can mount the host's disk. Root in this container is root on the server.",yget(m,"privileged").line,"service "+name,["Remove it and see what breaks. Most images that ask for it need one capability or one device, not all of them.","Give that one thing with cap_add or devices instead."].concat(UP),"# instead of privileged: true\ncap_add:\n  - NET_ADMIN")}
    ylist(m,"volumes").forEach(function(v){var src,tgt,ro=false,str;
      if(v.v.t==="map"){src=ystr(v.v,"source")||"";tgt=ystr(v.v,"target")||"";ro=ytrue(v.v,"read_only");str=src+":"+tgt}
      else{str=v.v.v;var p=str.split(":");if(p.length<2)return;src=p[0];tgt=p[1];ro=/(^|,)ro(,|$)/.test(p[2]||"")}
      if(/docker\.sock$|containerd\.sock$|podman\.sock$/.test(src)){notable.push("Docker socket");R.add("crit","sock","A container can control Docker","Whoever can talk to the Docker socket can start a new container with the host's disk mounted, which is root on the server. Read-only on the mount does not help: it protects the socket file, not the API behind it.",v.line,name+": "+str,["Ask whether the container needs it. Reverse proxies and dashboards often only read container names.","If it does, put a socket proxy in between that allows only the calls needed (for example tecnativa/docker-socket-proxy), and do not publish that container's ports."].concat(UP))}
      else if(/^(\/|\/etc|\/root|\/home|\/var|\/var\/lib\/docker|\/proc|\/sys|\/boot|\/dev|\/usr|~|~\/\.ssh|\$HOME|\$\{HOME\})\/?$/.test(src)){notable.push("host "+src);R.add(src==="/"||/docker$/.test(src)?"crit":ro?"med":"high","hostfs","System folders of the host are mounted","The container can read"+(ro?"":" and change")+" these folders. A whole system folder nearly always holds more than the container needs: other users' keys, password hashes, the configuration of every other service.",v.line,name+": "+str+(ro?" (read-only)":""),["Mount only the file or subfolder that is needed.","Add :ro when the container only reads."].concat(UP))}});
    var nm=ystr(m,"network_mode");if(nm==="host"){notable.push("host network");R.add("med","hostnet","A container shares the network of the host","With network_mode: host there is no separation: the container can reach services that listen only on 127.0.0.1, and every port it opens is open on the server without a ports line showing it.",yget(m,"network_mode").line,"service "+name,["Use the default network and publish the ports that are needed.","Keep it only where it is required, such as for some monitoring or VPN containers."].concat(UP))}
    ["pid","ipc","userns_mode"].forEach(function(k){if(ystr(m,k)==="host"){notable.push(k+": host");R.add("high","hostns","A container shares process or memory space with the host",k==="pid"?"With pid: host the container sees every process of the server, can read their environment variables and, as root, can signal or trace them.":"Sharing these namespaces removes a wall between the container and the server.",yget(m,k).line,name+": "+k+": host",["Remove the line unless the container is a monitoring agent that needs it."].concat(UP))}});
    ylist(m,"cap_add").forEach(function(c){var v=(c.v.v||"").toUpperCase().replace(/^CAP_/,"");
      if(/^(ALL|SYS_ADMIN|SYS_MODULE|SYS_PTRACE|SYS_RAWIO|DAC_READ_SEARCH)$/.test(v)){notable.push("cap "+v);R.add("high","caps","A container gets far-reaching kernel rights",v==="ALL"?"ALL is privileged mode under another name.":"SYS_ADMIN alone covers mounting file systems and much more, and is enough for most known ways out of a container. SYS_MODULE loads kernel modules, SYS_PTRACE reads other processes' memory.",c.line,name+": "+v,["Find the one operation that fails without it and look for a narrower capability.","Drop everything and add back only what is needed."].concat(UP),"cap_drop:\n  - ALL\ncap_add:\n  - NET_BIND_SERVICE")}});
    ylist(m,"security_opt").forEach(function(c){if(/(seccomp|apparmor)[:=]unconfined|label[:=]disable|systempaths[:=]unconfined/.test(c.v.v||"")){notable.push("unconfined");R.add("high","secopt","A safety net of Docker is switched off","The seccomp and AppArmor profiles block the system calls that container escapes are built on. Unconfined removes that filter.",c.line,name+": "+c.v.v,["Remove the line. If the program needs one blocked call, write a profile that allows that one."].concat(UP))}});
    if(yget(m,"devices"))R.add("info","devices","Host devices are passed into a container","Fine for a USB stick or a GPU. Passing a disk device gives raw access to everything on it.",yget(m,"devices").line,"service "+name,["Check that each device is one the container needs."]);
    var plist=[];ylist(m,"ports").forEach(function(p){var ip="",hp="",cp="",s;
      if(p.v.t==="map"){ip=ystr(p.v,"host_ip")||"";hp=ystr(p.v,"published")||"";cp=ystr(p.v,"target")||"";s=(ip?ip+":":"")+hp+":"+cp}
      else{s=p.v.v;var parts=s.replace(/\/\w+$/,"").match(/\[[^\]]*\]|\$\{[^}]*\}|[^:]+/g)||[];if(!parts.length)return;
        if(parts.length>=3){ip=parts[0];hp=parts[parts.length-2];cp=parts[parts.length-1]}else if(parts.length===2){hp=parts[0];cp=parts[1]}else cp=parts[0]}
      plist.push(s);var loc=/^(127\.|localhost|\[::1\])/.test(ip);if(loc)return;pub++;
      var what=PORTS[+cp]||PORTS[+hp];
      if(what)R.add(/Docker API/.test(what)?"crit":"high","dbport","A database or admin port is published on every network interface","A ports line without an address binds to all interfaces. Docker writes its own firewall rules for published ports, ahead of ufw and firewalld, so a host firewall that looks closed does not block them. On a server with a public address, this port is on the internet.",p.line,name+": "+s+" is "+what,["If only other containers of this file use it, delete the ports line: they reach it by service name without it.","If you need it from the host, for a client or a backup, bind it to 127.0.0.1.","Check from outside with a port scan you are allowed to run."].concat(UP),'ports:\n  - "127.0.0.1:'+(hp||cp)+":"+cp+'"');
      else R.add("info","ports","Ports published on every network interface","Not wrong for a web server that is meant to be public. For everything else, remember that published ports bypass ufw and firewalld: Docker adds its own rules in front of them.",p.line,name+": "+s,["Bind what only a reverse proxy on the same host needs to 127.0.0.1."],'ports:\n  - "127.0.0.1:8080:80"')});
    ylist(m,"environment").forEach(function(e){var k,v;if(e.k!==undefined){k=e.k;v=e.v.t==="str"?e.v.v:""}else{var s=e.v.v||"",i=s.indexOf("=");if(i<0)return;k=s.slice(0,i);v=s.slice(i+1)}
      if(/^(MYSQL_ALLOW_EMPTY_PASSWORD|MARIADB_ALLOW_EMPTY_ROOT_PASSWORD|ALLOW_EMPTY_PASSWORD)$/i.test(k)&&/^(yes|true|1)$/i.test(v)||(/^POSTGRES_HOST_AUTH_METHOD$/i.test(k)&&/^trust$/i.test(v))){notable.push("no password");R.add("crit","nopw","A database runs without a password","This setting lets anyone who reaches the port sign in as the administrator without a password. It is meant for throwaway test containers.",e.line,name+": "+k+"="+v,["Remove it and set a real password through a secret or an .env file.","An existing data volume keeps its old accounts: set the password inside the database as well."].concat(UP))}
      else if(/PASS(WORD|WD)?|SECRET|TOKEN|API_?KEY|PRIVATE_?KEY|ACCESS_?KEY|CREDENTIAL/i.test(k)&&!/_FILE$/i.test(k)&&v!==""&&!/^\$\{?[A-Za-z_]/.test(v)&&!/^(true|false|yes|no|\d{1,3})$/i.test(v)){
        var weak=WEAK.test(v)||v.toLowerCase()===name.toLowerCase();
        R.mask[e.line]=R.lines[e.line-1].replace(v,v.slice(0,2)+"\u2022\u2022\u2022\u2022");
        R.add("high","secrets",weak?"Passwords in the file, some of them guessable":"Passwords are written into the file","A Compose file gets copied, committed to Git, pasted into chats and tickets, and backed up unencrypted. Every copy now contains the password. The value is also visible to everyone who may run docker inspect.",e.line,name+": "+k+(weak?" has a value from every password list":""),["Move the values to an .env file next to the Compose file, keep that file out of Git (.gitignore) and readable only by its owner (chmod 600).","Better, where the image supports it: Docker secrets with the _FILE form of the variable.","A password that was committed or shared counts as known: change it."].concat(UP),"environment:\n  "+k+": ${"+k+"}\n\n# .env\n"+k+"=a-long-random-value");
}
      else if(/:\/\/[^:\/@\s]+:[^@\s$]{3,}@/.test(v)){var cred=/:\/\/[^:\/@\s]+:([^@\s]+)@/.exec(v)[1];R.mask[e.line]=R.lines[e.line-1].replace(cred,cred.slice(0,2)+"\u2022\u2022\u2022\u2022");
        R.add("high","secrets","Passwords are written into the file","A Compose file gets copied, committed to Git, pasted into chats and tickets, and backed up unencrypted. Every copy now contains the password. The value is also visible to everyone who may run docker inspect.",e.line,name+": "+k+" holds an address with a password in it",["Move the values to an .env file next to the Compose file, keep that file out of Git (.gitignore) and readable only by its owner (chmod 600).","Better, where the image supports it: Docker secrets with the _FILE form of the variable.","A password that was committed or shared counts as known: change it."].concat(UP),"environment:\n  "+k+": ${"+k+"}\n\n# .env\n"+k+"=the-full-value")}});
    if(image!==null){var tag=/@sha256:/.test(image)?"digest":(/:([^\/]+)$/.exec(image)||[])[1];
      if(!tag||tag==="latest")R.add("info","latest","Images without a fixed version","With latest, or no tag at all, the next pull brings whatever is newest: a major version jump of a database on a Tuesday afternoon, and no way to say which version ran yesterday.",yget(m,"image").line,name+": "+image,["Pin at least the major version, such as postgres:16.","Let a tool such as Renovate or Diun tell you about new versions, and update on purpose."],"image: "+image.replace(/:latest$/,"")+":<version>")}
    if(user!==null&&/^(root|0)(:|$)/.test(user))R.add("info","rootuser","A container is told to run as root","Root inside a container is the same user as root on the server, held back only by the container walls. Any way through them lands with full rights.",yget(m,"user").line,name+": user: "+user,["Run it as an unprivileged user if the image supports it."],'user: "1000:1000"');
    var lim=yget(m,"mem_limit")||(yget(m,"deploy")&&yget(yget(m,"deploy").v,"resources")),nnp=ylist(m,"security_opt").some(function(c){return /no-new-privileges(:true|=true)?$/.test(c.v.v||"")}),log=yget(m,"logging"),miss=[];
    if(user===null)miss.push("user");if(!nnp)miss.push("no-new-privileges");if(!ytrue(m,"read_only"))miss.push("read_only");if(!yget(m,"cap_drop"))miss.push("cap_drop");if(!lim)miss.push("memory limit");if(!log)miss.push("log size limit");
    if(miss.length>=4)hard.push([s.line,name+" has none of: "+miss.join(", ")]);
    rows.push([name,image||(build?"built from "+(build.v.t==="str"?build.v.v:ystr(build.v,"context")||"."):"?"),plist.join(", ")||"none",user||"image default",uniq(notable).join(", ")||"-"]);
  });
  if(hard.length)hard.forEach(function(h){R.add("info","harden","Hardening options that are not used","None of these is an emergency. Together they decide how much an attacker gets after breaking into the application: a root shell that can install tools and fill the disk, or an unprivileged process in a read-only box. The log limit is the practical one: the default json-file log grows until the disk is full.",h[0],h[1],["Start with the log limit and no-new-privileges: they almost never break anything.","Then try user, read_only and cap_drop one service at a time, and watch the log."].concat(UP),'security_opt:\n  - no-new-privileges:true\ncap_drop:\n  - ALL\nread_only: true\ntmpfs:\n  - /tmp\nmem_limit: 512m\nlogging:\n  driver: json-file\n  options:\n    max-size: "10m"\n    max-file: "3"')});
  if(yget(doc,"version"))R.add("info","version","The version line is obsolete","Docker Compose v2 ignores it and prints a warning.",yget(doc,"version").line,"version: "+ystr(doc,"version"),["Remove the line."]);
  if(Y.anchors)R.notes.push("The file uses YAML anchors (&name, *name, <<). This page does not expand them, so settings that a service takes over from an anchor are not checked for that service.");
  if(/\$\{?[A-Za-z_]/.test(text))R.notes.push("Values that come from variables (${NAME}) are filled in from the .env file or the shell, which this page does not see. docker compose config shows the result.");
  R.summary={title:"services",intro:"Each service with what it runs, what it publishes and what stands out.",cols:["Service","Image","Published ports","Runs as","Stands out"],rows:rows};
  R.tiles=[["services",String(rows.length),""],["published ports",String(pub),"on all interfaces"],["passwords in the file",String(R.f.secrets?R.f.secrets.hits.length:0),""]];
  return R.done()}

function detect(t){
  if(/^\s*services\s*:/m.test(t)&&/^\s+(image|build)\s*:/m.test(t))return "compose";
  if(/(^|[\s;}])(server|http|location|upstream|events)\b[^;{}\n]*\{/.test(t))return "nginx";
  if(/^\s*(PermitRootLogin|PasswordAuthentication|AuthorizedKeysFile|Subsystem\s+sftp|HostKey|UsePAM|PubkeyAuthentication|ChallengeResponseAuthentication|KbdInteractiveAuthentication|X11Forwarding|AllowUsers|AllowGroups|Match\s+(User|Group|Address))\b/im.test(t))return "sshd";
  if(/^\s+image\s*:/m.test(t))return "compose";
  if(/^\s*(listen|server_name|proxy_pass|root|add_header)\s[^\n]*;\s*$/m.test(t))return "nginx";
  return null}
function analyse(text,type){
  var t=type&&type!=="auto"?type:detect(text);
  if(!t)throw new Error("it does not look like an sshd_config, an nginx configuration or a Compose file. Choose the type by hand if it is one of them");
  return t==="sshd"?sshd(text):t==="nginx"?nginx(text):compose(text)}

var SAMPLES={
sshd:["# /etc/ssh/sshd_config on web01, made up","Include /etc/ssh/sshd_config.d/*.conf","","Port 22","Protocol 2","PermitRootLogin yes","#PasswordAuthentication yes","PubkeyAuthentication yes","UsePAM yes","X11Forwarding yes","MaxAuthTries 10","LogLevel INFO","","# for the old backup appliance","Ciphers aes256-ctr,aes128-cbc,3des-cbc","MACs hmac-sha2-256,hmac-md5","","PermitRootLogin no","AcceptEnv LANG LC_*","Subsystem sftp /usr/lib/openssh/sftp-server","","Match User deploy","    PasswordAuthentication yes"].join("\n"),
nginx:["# /etc/nginx/sites-enabled/shop, made up","server {","    listen 80;","    server_name shop.example.org;","    root /var/www/shop;","    index index.php;","","    location / {","        try_files $uri $uri/ /index.php?$args;","    }","    location ~ \\.php$ {","        include fastcgi_params;","        fastcgi_pass unix:/run/php/php8.3-fpm.sock;","    }","    location /admin {","        auth_basic \"Shop admin\";","        auth_basic_user_file /etc/nginx/.htpasswd;","    }","}","","server {","    listen 443 ssl;","    server_name api.example.org;","    ssl_certificate     /etc/letsencrypt/live/api.example.org/fullchain.pem;","    ssl_certificate_key /etc/letsencrypt/live/api.example.org/privkey.pem;","    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;","    add_header X-Content-Type-Options \"nosniff\" always;","    add_header Strict-Transport-Security \"max-age=31536000\" always;","","    location / {","        proxy_pass http://127.0.0.1:3000;","    }","    location /files {","        alias /srv/api/files/;","        autoindex on;","    }","    location /static/ {","        add_header Cache-Control \"public, max-age=604800\";","        root /srv/api;","    }","    location /nginx_status {","        stub_status;","    }","}"].join("\n"),
compose:["# docker-compose.yml of a small stack, made up","version: \"3.8\"","services:","  proxy:","    image: traefik","    ports:","      - \"80:80\"","      - \"443:443\"","      - \"8080:8080\"","    volumes:","      - /var/run/docker.sock:/var/run/docker.sock:ro","  app:","    image: registry.example.org/shop/app:2.4.1","    environment:","      DATABASE_URL: postgres://shop:${DB_PASSWORD}@db/shop","      JWT_SECRET: 9f2c41d07ab35e88","    depends_on:","      - db","  db:","    image: postgres:latest","    ports:","      - \"5432:5432\"","    environment:","      - POSTGRES_USER=shop","      - POSTGRES_PASSWORD=postgres","    volumes:","      - dbdata:/var/lib/postgresql/data","  backup:","    image: registry.example.org/tools/backup:1.2","    privileged: true","    volumes:","      - /:/host","volumes:","  dbdata:"].join("\n")};
window.confReview={detect:detect,analyse:analyse,samples:SAMPLES,yaml:yaml,nginxParse:nginxParse};

/* ================= page ================= */
if(!$("cr-run"))return;
var state={R:null,name:""};
function table(cols,rows){var wrap=el("div","tw"),tb=el("table","tbl"),th=el("thead"),tr=el("tr"),body=el("tbody");
  cols.forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
  rows.forEach(function(r){var x=el("tr");r.forEach(function(c){x.append(el("td",null,c))});body.append(x)});
  tb.append(th,body);wrap.append(tb);return wrap}
function tile(label,value,sub){var d=el("div","stat");d.append(el("span","stat-k",label));var b=el("b","stat-v",value);b.setAttribute("data-raw","1");d.append(b);if(sub)d.append(el("span","stat-s",sub));return d}
function save(name,text,type){var blob=new Blob([text],{type:type}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
function lineText(R,n){return R.mask[n]||R.lines[n-1]||""}
function render(){
  var out=$("cr-out"),R=state.R;out.replaceChildren();
  $("cr-status").textContent="Read as: "+R.label+", "+plural(R.lines.length,"line")+" from "+state.name+".";
  var v=el("div","verdict v-"+(R.worst==="none"||R.worst==="info"?"none":R.worst));
  v.append(el("b",null,R.worst==="crit"?"Act now":R.worst==="high"?"Needs attention":R.worst==="med"?"Worth a look":R.findings.length?"Nothing alarming":"Nothing found"),
    el("span",null,R.findings.length?plural(R.findings.length,"finding")+" \u00b7 "+["crit","high","med","info"].filter(function(s){return R.counts[s]}).map(function(s){return R.counts[s]+" "+SEVNAME[s]}).join(" \u00b7 "):"none of the checks matched this file"));
  out.append(v);
  var stats=el("div","stats");stats.style.setProperty("--cols",String(R.tiles.length+1));
  R.tiles.forEach(function(t){stats.append(tile(t[0],t[1],t[2]))});stats.append(tile("findings",String(R.findings.length),R.counts.crit+R.counts.high?plural(R.counts.crit+R.counts.high,"serious one"):"none serious"));
  out.append(stats);
  var h=el("h2",null,"findings");h.id="cr-findings";out.append(h);
  if(!R.findings.length)out.append(el("p","dim","None of the checks matched. That is a statement about this file and these checks, not about the server."));
  R.findings.forEach(function(f,i){
    var d=el("details","finding f-"+f.sev);if(i<2&&SEV[f.sev]<=1)d.open=true;
    var s=el("summary");s.append(el("span","sevtag s-"+f.sev,SEVNAME[f.sev]),el("b",null,f.title+(f.hits.length>1?" ("+f.hits.length+")":"")));
    d.append(s,el("p",null,f.why));
    var ul=el("ul","crhits");f.hits.forEach(function(x){var li=el("li");
      if(x.n){var a=el("a","crln","line "+x.n);a.href="#cr-l"+x.n;li.append(a);li.append(el("code",null,lineText(R,x.n).trim()))}
      if(x.note)li.append(el("span","crnote",x.note));ul.append(li)});
    if(f.hits.length)d.append(ul);
    d.append(el("h3","fh","what to do"));
    var ol=el("ol","steps");f.steps.forEach(function(x){ol.append(el("li",null,x))});d.append(ol);
    if(f.fix){d.append(el("h3","fh","write instead"));d.append(el("pre","crfix",f.fix))}
    out.append(d)});
  R.notes.forEach(function(n){out.append(el("p","note",n))});
  if(R.summary&&R.summary.rows.length){out.append(el("h2",null,R.summary.title),el("p","dim",R.summary.intro),table(R.summary.cols,R.summary.rows))}
  out.append(el("h2",null,"the file, line by line"),el("p","dim","Lines that a finding points at are marked. Comments and empty lines are dimmed."));
  var file=el("div","crfile");file.setAttribute("role","region");file.setAttribute("aria-label","The file with marked lines");file.tabIndex=0;
  R.lines.slice(0,1500).forEach(function(t,i){var n=i+1,fl=R.flag[n],row=el("div","crl"+(fl?" isflag f-"+fl.sev:"")+(/^\s*(#|$)/.test(t)?" iscom":""));row.id="cr-l"+n;
    row.append(el("span","crn",n),el("code",null,lineText(R,n)||" "));if(fl){var tag=el("span","crtag");tag.append(el("span","sevtag s-"+fl.sev,SEVNAME[fl.sev]),document.createTextNode(" "+fl.title));row.append(tag)}file.append(row)});
  out.append(file);
  if(R.lines.length>1500)out.append(el("p","note","Only the first 1,500 lines are shown here. The checks ran on all of them."));
  var ctl=el("div","ctl");ctl.style.marginTop="28px";
  var dl=el("button","btn","Download report (.md)");dl.type="button";dl.addEventListener("click",function(){save("config-review.md",report(),"text/markdown")});
  var pr=el("button","btn ghost","Print / save as PDF");pr.type="button";pr.addEventListener("click",function(){document.querySelectorAll("#cr-out details").forEach(function(x){x.open=true});window.print()});
  ctl.append(dl,pr);out.append(ctl);out.hidden=false}
function report(){var R=state.R,L=[];if(!R)return "";
  L.push("# Configuration review","","File: "+state.name+" ("+R.label+", "+R.lines.length+" lines)","Findings: "+R.findings.length,"Generated in the browser by the admin_hub config reviewer. No data left this device. Passwords found in the file are masked.","");
  R.findings.forEach(function(f){L.push("## ["+SEVNAME[f.sev].toUpperCase()+"] "+f.title,"",f.why,"");
    f.hits.forEach(function(x){L.push("- "+(x.n?"line "+x.n+": `"+lineText(R,x.n).trim()+"`"+(x.note?" ":""):"")+(x.note||""))});
    L.push("","**What to do**","");f.steps.forEach(function(s,i){L.push((i+1)+". "+s)});
    if(f.fix)L.push("","```",f.fix,"```");L.push("")});
  R.notes.forEach(function(n){L.push("> "+n,"")});
  if(R.summary){L.push("## "+R.summary.title.charAt(0).toUpperCase()+R.summary.title.slice(1),"","| "+R.summary.cols.join(" | ")+" |","|"+R.summary.cols.map(function(){return " --- "}).join("|")+"|");R.summary.rows.forEach(function(r){L.push("| "+r.map(function(c){return String(c).replace(/\|/g,"\\|")}).join(" | ")+" |")})}
  return L.join("\n")}
function load(text,name){
  try{state.R=analyse(text,$("cr-type").value);state.name=name;render();$("cr-out").scrollIntoView({behavior:"smooth",block:"start"})}
  catch(e){$("cr-out").hidden=true;$("cr-status").textContent="Could not read that: "+e.message+".";if(!/^(line|it |there |the )/.test(e.message)&&window.console)console.error(e)}}
function readFile(f){if(!f)return;$("cr-status").textContent="Reading "+f.name+" ...";
  var r=new FileReader();r.onload=function(){$("cr-text").value=String(r.result);load(String(r.result),f.name)};r.onerror=function(){$("cr-status").textContent="The browser could not read that file."};r.readAsText(f)}
var drop=$("cr-drop"),file=$("cr-file"),ta=$("cr-text");
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files[0])readFile(e.dataTransfer.files[0])});
$("cr-run").addEventListener("click",function(){if(ta.value.trim())load(ta.value,"pasted text");else $("cr-status").textContent="Paste a configuration first, or drop a file."});
function sample(k){$("cr-type").value="auto";ta.value=SAMPLES[k];load(ta.value,"a made-up example")}
$("cr-sample").addEventListener("click",function(){sample("compose")});
$("cr-sample2").addEventListener("click",function(){sample("nginx")});
$("cr-sample3").addEventListener("click",function(){sample("sshd")});
$("cr-out").addEventListener("click",function(e){var a=e.target.closest("a.crln");if(!a)return;var t=$(a.getAttribute("href").slice(1));if(t){e.preventDefault();t.scrollIntoView({block:"center"});t.classList.add("ishit");setTimeout(function(){t.classList.remove("ishit")},1600)}});
if(location.hash==="#sample")sample("compose");
})();
