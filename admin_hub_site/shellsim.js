/* A small pretend Linux server for the playground page: a file system in memory,
   about fifty commands, pipes and redirects. Nothing here touches a real system. */
(function(){"use strict";
var NOW="Oct  6 08:30",OLD="Sep 28 03:10";
function D(mode,o,g,c,m){return{t:"d",mode:mode,o:o,g:g,c:c||{},m:m||OLD}}
function F(mode,o,g,x,extra){var n={t:"f",mode:mode,o:o,g:g,x:x===undefined?"":x,m:OLD};if(extra)for(var k in extra)n[k]=extra[k];return n}
var USERS={root:{uid:0,groups:["root"],home:"/root"},anna:{uid:1000,groups:["anna","sudo"],home:"/home/anna"},"www-data":{uid:33,groups:["www-data"],home:"/var/www"},deploy:{uid:1001,groups:["deploy","www-data"],home:"/home/deploy"},postgres:{uid:110,groups:["postgres"],home:"/var/lib/postgresql"},marek:{uid:1002,groups:["marek","sudo"],home:"/home/marek"}};
function authlog(){var L=[],ips=[["203.0.113.77",41],["198.51.100.23",17],["192.0.2.146",9],["203.0.113.5",3]],names=["root","admin","test","oracle","ubuntu","postgres","git","user"],k=0,t=0;
  function ts(){t+=37;var h=Math.floor(t/3600)%24,m=Math.floor(t/60)%60,s=t%60;return "Oct  6 "+("0"+h).slice(-2)+":"+("0"+m).slice(-2)+":"+("0"+s).slice(-2)}
  var seq=[];ips.forEach(function(p){for(var i=0;i<p[1];i++)seq.push(p[0])});
  /* deterministic shuffle */
  for(var i=seq.length-1;i>0;i--){k=(k*31+17)%1000;var j=k%(i+1),x=seq[i];seq[i]=seq[j];seq[j]=x}
  seq.forEach(function(ip,i){var u=names[(i*7+3)%names.length];L.push(ts()+" web01 sshd["+(2100+i)+"]: Failed password for "+(u==="root"?"":"invalid user ")+u+" from "+ip+" port "+(40000+i*13%20000)+" ssh2");
    if(i%9===4)L.push(ts()+" web01 sshd["+(2100+i)+"]: Accepted publickey for anna from 10.87.20.14 port "+(51000+i)+" ssh2: ED25519 SHA256:k3Yq...");
    if(i%14===6)L.push(ts()+" web01 sudo:     anna : TTY=pts/0 ; PWD=/home/anna ; USER=root ; COMMAND=/usr/bin/systemctl status nginx")});
  L.push("Oct  6 08:12:44 web01 sshd[2391]: Accepted publickey for deploy from 10.87.20.30 port 50122 ssh2: ED25519 SHA256:p9Wd...");L.push("Oct  6 03:38:02 web01 sshd[1777]: Accepted password for marek from 203.0.113.77 port 40112 ssh2");
  return L.join("\n")+"\n"}
function accesslog(){var L=[],paths=["/","/products","/products/42","/cart","/checkout","/static/shop.css","/static/shop.js","/favicon.ico","/wp-login.php","/.env","/uploads/img_0412.php"],ips=["10.87.20.14","198.51.100.23","203.0.113.77","192.0.2.50","192.0.2.51"],i;
  for(i=0;i<60;i++){var p=paths[(i*5+i%3)%paths.length],ip=ips[(i*3)%ips.length],code=p==="/wp-login.php"||p==="/.env"?404:p==="/checkout"&&i%4===0?500:200;
    L.push(ip+' - - [06/Oct/2026:07:'+("0"+(i%60)).slice(-2)+':'+("0"+(i*7%60)).slice(-2)+' +0200] "'+(p==="/checkout"||/php$/.test(p)?"POST":"GET")+" "+p+' HTTP/1.1" '+code+" "+(code===200?1200+i*37:162)+' "-" "Mozilla/5.0"')}
  return L.join("\n")+"\n"}
function makeFs(){
  var shopconf="server {\n    listen 80;\n    sever_name shop.example.org;\n    root /srv/www/shop;\n    index index.html;\n\n    location / {\n        try_files $uri $uri/ =404;\n    }\n}\n";
  return D(0o755,"root","root",{
   bin:D(0o755,"root","root"),boot:D(0o755,"root","root"),
   etc:D(0o755,"root","root",{
     hostname:F(0o644,"root","root","web01\n"),
     hosts:F(0o644,"root","root","127.0.0.1   localhost\n10.87.20.10 web01.example.internal web01\n10.87.20.20 db01.example.internal db01\n"),
     "os-release":F(0o644,"root","root",'PRETTY_NAME="Debian GNU/Linux 13 (trixie)"\nNAME="Debian GNU/Linux"\nVERSION_ID="13"\nID=debian\n'),
     passwd:F(0o644,"root","root","root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\npostgres:x:110:117:PostgreSQL administrator:/var/lib/postgresql:/bin/bash\nanna:x:1000:1000:Anna Example:/home/anna:/bin/bash\ndeploy:x:1001:1001:Deploy user:/home/deploy:/bin/bash\nmarek:x:1002:1002:Marek Example (left in June):/home/marek:/bin/bash\n"),
     shadow:F(0o640,"root","shadow","root:!:20000:0:99999:7:::\nanna:$y$j9T$...:20001:0:99999:7:::\ndeploy:$y$j9T$...:20001:0:99999:7:::\nmarek:$y$j9T$...:19800:0:99999:7:::\n"),
     group:F(0o644,"root","root","root:x:0:\nsudo:x:27:anna,marek\nwww-data:x:33:deploy\nanna:x:1000:\ndeploy:x:1001:\nmarek:x:1002:\n"),
     crontab:F(0o644,"root","root","# m h dom mon dow user  command\n30 1 * * * root /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1\n*/5 * * * * www-data /srv/www/shop/bin/queue-worker\n"),
     ssh:D(0o755,"root","root",{sshd_config:F(0o644,"root","root","Port 22\nPermitRootLogin yes\nPasswordAuthentication yes\nPubkeyAuthentication yes\nX11Forwarding no\nSubsystem sftp /usr/lib/openssh/sftp-server\n")}),
     nginx:D(0o755,"root","root",{"nginx.conf":F(0o644,"root","root","user www-data;\nworker_processes auto;\nevents { worker_connections 768; }\nhttp {\n    include /etc/nginx/mime.types;\n    access_log /var/log/nginx/access.log;\n    error_log /var/log/nginx/error.log;\n    include /etc/nginx/sites-enabled/*;\n}\n"),
       "sites-enabled":D(0o755,"root","root",{"shop.conf":F(0o644,"root","root",shopconf)})})}),
   home:D(0o755,"root","root",{
     anna:D(0o750,"anna","anna",{
       ".bashrc":F(0o644,"anna","anna","alias ll='ls -l'\nexport EDITOR=nano\n"),
       ".bash_history":F(0o600,"anna","anna",""),
       "notes.txt":F(0o644,"anna","anna","Things to do on web01\n- shop is down since this morning, nginx?\n- /var is nearly full again\n- someone said the uploads folder looks odd\n- the backup script will not run for me\n",{m:NOW}),
       "todo.txt":F(0o644,"anna","anna","renew certificate\nask deploy who changed shop.conf\nrotate logs\n"),
       scripts:D(0o755,"anna","anna",{"backup.sh":F(0o644,"anna","anna","#!/bin/bash\n# copies the shop files to /tmp/backup\nset -euo pipefail\nmkdir -p /tmp/backup\ncp -r /srv/www/shop /tmp/backup/\necho \"backup done\"\n",{run:"backup"}),
         "hello.sh":F(0o755,"anna","anna","#!/bin/bash\necho \"hello from web01\"\n",{run:"hello"})})},NOW),
     deploy:D(0o750,"deploy","deploy",{"deploy.log":F(0o644,"deploy","deploy","2026-10-06 07:02 pulled release 2.4.1\n2026-10-06 07:03 edited /etc/nginx/sites-enabled/shop.conf\n2026-10-06 07:03 reload nginx: FAILED\n")})}),
   opt:D(0o755,"root","root"),root:D(0o700,"root","root",{".bash_history":F(0o600,"root","root","systemctl status nginx\n")}),
   srv:D(0o755,"root","root",{www:D(0o755,"root","root",{shop:D(0o755,"deploy","www-data",{
       "index.html":F(0o644,"deploy","www-data","<!doctype html>\n<title>Shop</title>\n<h1>Shop</h1>\n"),
       "config.php":F(0o666,"deploy","www-data","<?php\n$db_host = 'db01.example.internal';\n$db_user = 'shop';\n$db_pass = 'S3cret-made-up';\n"),
       bin:D(0o755,"deploy","www-data",{"queue-worker":F(0o755,"deploy","www-data","#!/bin/bash\nphp /srv/www/shop/worker.php\n")}),
       uploads:D(0o775,"www-data","www-data",{"logo.png":F(0o644,"www-data","www-data","\u0089PNG...",{size:48211}),"team.jpg":F(0o644,"www-data","www-data","JFIF...",{size:182044}),
         "img_0412.php":F(0o644,"www-data","www-data","<?php system($_GET['c']); ?>\n",{m:"Oct  6 03:41"}),"invoice-2291.pdf":F(0o644,"www-data","www-data","%PDF-1.7...",{size:91230})},"Oct  6 03:41")})})}),
   tmp:D(0o1777,"root","root",{"session_ab12":F(0o600,"www-data","www-data","x")}),usr:D(0o755,"root","root",{local:D(0o755,"root","root",{bin:D(0o755,"root","root",{"backup.sh":F(0o755,"root","root","#!/bin/bash\ntar czf /var/backups/shop-$(date +%F).tar.gz /srv/www/shop\n")})})}),
   "var":D(0o755,"root","root",{backups:D(0o755,"root","root",{"shop-2026-10-05.tar.gz":F(0o600,"root","root","",{size:412e6}),"shop-2026-10-04.tar.gz":F(0o600,"root","root","",{size:409e6})}),
     log:D(0o755,"root","root",{"auth.log":F(0o640,"root","adm",authlog(),{m:NOW}),syslog:F(0o640,"root","adm","Oct  6 07:03:11 web01 systemd[1]: Reloading nginx.service...\nOct  6 07:03:11 web01 nginx[1840]: nginx: [emerg] unknown directive \"sever_name\" in /etc/nginx/sites-enabled/shop.conf:3\nOct  6 07:03:11 web01 systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE\nOct  6 07:03:11 web01 systemd[1]: Failed to start nginx.service - A high performance web server.\nOct  6 08:00:01 web01 CRON[2310]: (www-data) CMD (/srv/www/shop/bin/queue-worker)\n",{m:NOW}),
       "backup.log":F(0o644,"root","root","2026-10-05 01:30 backup ok\n2026-10-06 01:30 backup ok\n"),
       nginx:D(0o755,"root","adm",{"access.log":F(0o644,"www-data","adm",accesslog(),{m:"Oct  6 07:02"}),"error.log":F(0o644,"www-data","adm","2026/10/06 07:03:11 [emerg] 1840#1840: unknown directive \"sever_name\" in /etc/nginx/sites-enabled/shop.conf:3\n",{m:"Oct  6 07:03"})}),
       app:D(0o755,"www-data","www-data",{"debug.log":F(0o644,"www-data","www-data","[debug] worker tick\n[debug] worker tick\n[debug] worker tick\n",{size:17.2e9,m:NOW}),"app.log":F(0o644,"www-data","www-data","2026-10-06 07:59 queue empty\n",{size:3.1e6})})}),
     www:D(0o755,"root","root")})})}
function make(){USERS.marek.groups=["marek","sudo"];return{ufw:{on:false,rules:[]},locked:{},fs:makeFs(),cwd:"/home/anna",user:"anna",hist:[],svc:{nginx:"failed",ssh:"active",cron:"active",postgresql:"active","shop-worker":"active"},ran:[],ghost:0}}

/* ---------- paths and permissions ---------- */
function abs(S,p){if(!p)return S.cwd;if(p==="~"||p.indexOf("~/")===0)p=USERS[S.user].home+p.slice(1);if(p[0]!=="/")p=S.cwd+"/"+p;var o=[];p.split("/").forEach(function(s){if(!s||s===".")return;if(s==="..")o.pop();else o.push(s)});return "/"+o.join("/")}
function get(S,p){var n=S.fs,parts=p.split("/").filter(Boolean);for(var i=0;i<parts.length;i++){if(!n||n.t!=="d")return null;n=n.c[parts[i]];if(!n)return null}return n}
function dirOf(p){var i=p.lastIndexOf("/");return i<=0?"/":p.slice(0,i)}
function base(p){return p.slice(p.lastIndexOf("/")+1)}
function can(n,bit,u){if(u==="root")return true;var m=n.mode;if(n.o===u)return !!((m>>6)&bit);if(USERS[u]&&USERS[u].groups.indexOf(n.g)>=0)return !!((m>>3)&bit);return !!(m&bit)}
function reach(S,p,u){var parts=p.split("/").filter(Boolean),n=S.fs,cur="";for(var i=0;i<parts.length;i++){if(!can(n,1,u))return cur||"/";n=n.c?n.c[parts[i]]:null;cur+="/"+parts[i];if(!n)return null;if(n.t!=="d")return null}return null}
function size(n){if(n.t==="f")return n.size!==undefined?n.size:n.x.length;var s=4096;for(var k in n.c)s+=size(n.c[k]);return s}
function human(b){var u=["","K","M","G","T"],i=0;while(b>=1024&&i<4){b/=1024;i++}return i===0?String(Math.round(b)):(b>=10?Math.round(b):Math.round(b*10)/10)+u[i]}
function modeStr(n){var s=n.t==="d"?"d":"-",b="rwxrwxrwx";for(var i=0;i<9;i++)s+=(n.mode>>(8-i))&1?b[i]:"-";if(n.mode&0o1000)s=s.slice(0,9)+"t";return s}
function pad(s,n,left){s=String(s);while(s.length<n)s=left?s+" ":" "+s;return s}
function E(cmd,msg){return{out:"",err:cmd+": "+msg,code:1}}
function OK(out){return{out:out||"",err:"",code:0}}

/* ---------- reading the command line ---------- */
function lexLine(line){var t=[],cur="",q=null,had=false,glob=true,i,c;
  function push(){if(had||cur!==""){t.push({v:cur,glob:glob});}cur="";had=false;glob=true}
  for(i=0;i<line.length;i++){c=line[i];
    if(q){if(c===q){q=null}else if(c==="\\"&&q==='"'&&i+1<line.length&&'"\\$'.indexOf(line[i+1])>=0){cur+=line[++i]}else cur+=c;continue}
    if(c==="'"||c==='"'){q=c;had=true;glob=false;continue}
    if(c==="\\"&&i+1<line.length){cur+=line[++i];had=true;continue}
    if(c===" "||c==="\t"){push();continue}
    if(c==="|"&&line[i+1]!=="|"){push();t.push({op:"|"});continue}
    if(c===";"){push();t.push({op:";"});continue}
    if(c==="&"&&line[i+1]==="&"){push();t.push({op:"&&"});i++;continue}
    if(c==="|"&&line[i+1]==="|"){push();t.push({op:"||"});i++;continue}
    if(c===">"){push();if(line[i+1]===">"){t.push({op:">>"});i++}else t.push({op:">"});continue}
    if(c==="2"&&line[i+1]===">"&&cur===""){var j=i+2;if(line[j]==="&"&&line[j+1]==="1"){i=j+1;continue}if(line.substr(j,9)==="/dev/null"){i=j+8;continue}}
    if(c==="<"){push();t.push({op:"<"});continue}
    cur+=c}
  if(q)throw new Error("the quote "+q+" is never closed");push();return t}
function globRe(p){return new RegExp("^"+p.replace(/[.+^${}()|\\]/g,"\\$&").replace(/\*/g,"[^/]*").replace(/\?/g,"[^/]").replace(/\[!/g,"[^")+"$")}
function expand(S,tok){var v=tok.v;if(!tok.glob)return [v];
  v=v.replace(/\$\{?(\w+)\}?/g,function(_,k){return k==="HOME"?USERS[S.user].home:k==="USER"?S.user:k==="PWD"?S.cwd:k==="HOSTNAME"?"web01":""});
  if(v==="~"||v.indexOf("~/")===0)v=USERS[S.user].home+v.slice(1);
  if(!/[*?\[]/.test(v))return [v];
  var parts=v.split("/"),isAbs=v[0]==="/",res=[isAbs?"":"."];if(isAbs)parts.shift();
  parts.forEach(function(seg,si){var next=[];if(seg===""&&si===parts.length-1){res=res.map(function(r){return r+"/"});return}
    res.forEach(function(r){var real=abs(S,r===""?"/":r),n=get(S,real);if(!n||n.t!=="d")return;
      if(!/[*?\[]/.test(seg)){if(seg==="."||seg===".."||n.c[seg])next.push((r==="."?"":r+"/")+seg);return}
      var re=globRe(seg);Object.keys(n.c).sort().forEach(function(k){if(k[0]==="."&&seg[0]!==".")return;if(re.test(k))next.push((r==="."?"":r+"/")+k)})});res=next});
  return res.length?res:[v]}

/* ---------- the commands ---------- */
function readFile(S,C,cmd,p){var a=abs(S,p),n=get(S,a);if(!n){var blocked=reach(S,dirOf(a),C.user);return{e:cmd+": "+p+": "+(blocked?"Permission denied":"No such file or directory")}}
  if(n.t==="d")return{e:cmd+": "+p+": Is a directory"};var b=reach(S,dirOf(a),C.user);if(b||!can(n,4,C.user))return{e:cmd+": "+p+": Permission denied"};return{x:n.x,n:n}}
function inputs(S,C,cmd,files,stdin){var out=[],err=[];if(!files.length)return{list:[{name:"",x:stdin||""}],err:err};
  files.forEach(function(f){var r=readFile(S,C,cmd,f);if(r.e)err.push(r.e);else out.push({name:f,x:r.x})});return{list:out,err:err}}
function lines(x){if(x==="")return [];var l=x.split("\n");if(l[l.length-1]==="")l.pop();return l}
function flags(args,valued){var f={},rest=[],i;for(i=0;i<args.length;i++){var a=args[i];
    if(a==="--"){rest=rest.concat(args.slice(i+1));break}
    if(/^--\w/.test(a)){var kv=a.slice(2).split("=");f[kv[0]]=kv.length>1?kv[1]:true;continue}
    if(/^-[A-Za-z]/.test(a)&&a.length>1){for(var j=1;j<a.length;j++){var c=a[j];if(valued&&valued.indexOf(c)>=0){f[c]=a.length>j+1?a.slice(j+1):args[++i];break}f[c]=true}continue}
    if(/^-\d+$/.test(a)&&valued&&valued.indexOf("n")>=0){f.n=a.slice(1);continue}
    rest.push(a)}return{f:f,rest:rest}}
function writeFile(S,u,cmd,p,text,append){var a=abs(S,p),n=get(S,a);if(a==="/dev/null")return null;
  if(n){if(n.t==="d")return cmd+": "+p+": Is a directory";if(reach(S,dirOf(a),u)||!can(n,2,u))return cmd+": "+p+": Permission denied";n.x=append?n.x+text:text;delete n.size;n.m=NOW;return null}
  var d=get(S,dirOf(a));if(!d||d.t!=="d")return cmd+": "+p+": No such file or directory";if(reach(S,dirOf(a),u)||!can(d,2,u))return cmd+": "+p+": Permission denied";
  d.c[base(a)]=F(0o644,u,USERS[u].groups[0],text,{m:NOW});return null}
function nginxTest(S){var n=get(S,"/etc/nginx/sites-enabled/shop.conf");if(!n)return null;var l=lines(n.x);for(var i=0;i<l.length;i++){var m=/^\s*([a-z_]+)\b/.exec(l[i]);if(m&&["server","listen","server_name","root","index","location","try_files","return","include","access_log","error_log","client_max_body_size","add_header"].indexOf(m[1])<0)return 'nginx: [emerg] unknown directive "'+m[1]+'" in /etc/nginx/sites-enabled/shop.conf:'+(i+1)}return null}
function varUse(S){return 2.1e9+size(get(S,"/var"))+(S.ghost||0)}
var CMD={};
CMD.pwd=function(a,i,S){return OK(S.cwd+"\n")};
CMD.whoami=function(a,i,S,C){return OK(C.user+"\n")};
CMD.id=function(a,i,S,C){var u=a[0]||C.user,U=USERS[u];if(!U)return E("id","‘"+u+"’: no such user");return OK("uid="+U.uid+"("+u+") gid="+U.uid+"("+U.groups[0]+") groups="+U.groups.map(function(g,k){return (k?({sudo:27,"www-data":33,adm:4})[g]||U.uid+k:U.uid)+"("+g+")"}).join(",")+"\n")};
CMD.hostname=function(){return OK("web01\n")};
CMD.date=function(){return OK("Tue Oct  6 08:30:12 CEST 2026\n")};
CMD.uname=function(a){return OK(a.indexOf("-a")>=0?"Linux web01 6.12.0-amd64 #1 SMP Debian 6.12 x86_64 GNU/Linux\n":"Linux\n")};
CMD.uptime=function(){return OK(" 08:30:12 up 41 days,  6:02,  2 users,  load average: 0.21, 0.18, 0.15\n")};
CMD.clear=function(){return{out:"",err:"",code:0,clear:true}};
CMD.history=function(a,i,S){return OK(S.hist.map(function(h,k){return pad(k+1,5)+"  "+h}).join("\n")+"\n")};
CMD.echo=function(a){var n=a[0]==="-n";if(n)a=a.slice(1);return OK(a.join(" ")+(n?"":"\n"))};
CMD.cd=function(a,i,S,C){var p=abs(S,a[0]||"~"),n=get(S,p);if(!n)return E("cd",(a[0]||"~")+": No such file or directory");if(n.t!=="d")return E("cd",a[0]+": Not a directory");if(reach(S,p,C.user)||!can(n,1,C.user))return E("cd",a[0]+": Permission denied");S.cwd=p;return OK("")};
CMD.ls=function(args,stdin,S,C){var P=flags(args),f=P.f,targets=P.rest.length?P.rest:["."],out=[],err=[],multi=targets.length>1||f.R;
  function row(name,n){if(!f.l)return name;return modeStr(n)+" "+(n.t==="d"?2:1)+" "+pad(n.o,8,true)+" "+pad(n.g,8,true)+" "+pad(f.h?human(n.t==="d"?4096:size(n)):(n.t==="d"?4096:size(n)),f.h?5:11)+" "+n.m+" "+name}
  function list(p,label){var a=abs(S,p),n=get(S,a);if(!n){err.push("ls: cannot access '"+p+"': No such file or directory");return}
    if(n.t==="f"){out.push(row(p,n));return}
    if(reach(S,a,C.user)||!can(n,4,C.user)){err.push("ls: cannot open directory '"+p+"': Permission denied");return}
    if(multi)out.push((out.length?"\n":"")+label+":");
    var names=Object.keys(n.c).sort(function(x,y){return x.toLowerCase().replace(/^\./,"")<y.toLowerCase().replace(/^\./,"")?-1:1});if(!f.a)names=names.filter(function(k){return k[0]!=="."});
    if(f.t)names.sort(function(x,y){return n.c[x].m<n.c[y].m?1:-1});if(f.S)names.sort(function(x,y){return size(n.c[y])-size(n.c[x])});if(f.r)names.reverse();
    var rows=names.map(function(k){return row(k,n.c[k])});if(f.a){rows.unshift(row("..",get(S,dirOf(a))||n));rows.unshift(row(".",n))}
    if(f.l){out.push("total "+Math.ceil(names.reduce(function(t,k){return t+(n.c[k].t==="d"?4096:size(n.c[k]))},0)/1024));out=out.concat(rows)}else if(rows.length)out.push(rows.join("  "));
    if(f.R)names.forEach(function(k){if(n.c[k].t==="d")list((p==="."?".":p.replace(/\/$/,""))+"/"+k,(p==="."?".":p.replace(/\/$/,""))+"/"+k)})}
  targets.forEach(function(t){list(t,t)});return{out:out.length?out.join("\n")+"\n":"",err:err.join("\n"),code:err.length?2:0}};
CMD.ll=function(a,i,S,C){return CMD.ls(["-l"].concat(a),i,S,C)};
CMD.cat=function(args,stdin,S,C){var P=flags(args),I=inputs(S,C,"cat",P.rest,stdin),x=I.list.map(function(f){return f.x}).join("");
  if(P.f.n)x=lines(x).map(function(l,k){return pad(k+1,6)+"\t"+l}).join("\n")+(x?"\n":"");return{out:x,err:I.err.join("\n"),code:I.err.length?1:0}};
CMD.less=CMD.more=CMD.cat;
CMD.tac=function(args,stdin,S,C){var I=inputs(S,C,"tac",args,stdin),l=lines(I.list.map(function(f){return f.x}).join(""));return{out:l.reverse().join("\n")+(l.length?"\n":""),err:I.err.join("\n"),code:0}};
function headTail(tail){return function(args,stdin,S,C){var P=flags(args,"nc"),n=parseInt(P.f.n===undefined?10:String(P.f.n).replace(/^\+/,""),10),I=inputs(S,C,tail?"tail":"head",P.rest,stdin),out=[];if(isNaN(n))n=10;
    I.list.forEach(function(f){if(I.list.length>1)out.push("==> "+f.name+" <==");var l=lines(f.x);out=out.concat(tail?l.slice(Math.max(0,l.length-n)):l.slice(0,n))});return{out:out.length?out.join("\n")+"\n":"",err:I.err.join("\n"),code:I.err.length?1:0}}}
CMD.head=headTail(false);CMD.tail=headTail(true);
CMD.wc=function(args,stdin,S,C){var P=flags(args),I=inputs(S,C,"wc",P.rest,stdin),out=[];
  I.list.forEach(function(f){var l=lines(f.x).length,w=f.x.split(/\s+/).filter(Boolean).length,c=f.x.length,cols=[];if(P.f.l)cols.push(l);if(P.f.w)cols.push(w);if(P.f.c)cols.push(c);if(!cols.length)cols=[l,w,c];
    out.push((cols.length===1&&!f.name?String(cols[0]):cols.map(function(x){return pad(x,7)}).join(""))+(f.name?" "+f.name:""))});return{out:out.join("\n")+"\n",err:I.err.join("\n"),code:I.err.length?1:0}};
function walk(S,C,p,fn,err,cmd){var a=abs(S,p),n=get(S,a);if(!n){err.push(cmd+": '"+p+"': No such file or directory");return}
  (function rec(path,node){fn(path,node);if(node.t!=="d")return;if(!can(node,4,C.user)||!can(node,1,C.user)){err.push(cmd+": '"+path+"': Permission denied");return}
    Object.keys(node.c).sort().forEach(function(k){rec(path.replace(/\/$/,"")+"/"+k,node.c[k])})})(p,n)}
CMD.grep=function(args,stdin,S,C){var P=flags(args,"emAB"),f=P.f,rest=P.rest,pat=f.e||rest.shift();if(pat===undefined)return E("grep","usage: grep [-i] [-v] [-n] [-c] [-r] PATTERN [FILE...]");
  var re;try{re=new RegExp(f.F?pat.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"):f.E||f.P?pat:pat.replace(/\\\|/g,"\u0000").replace(/[+?{}()|]/g,"\\$&").replace(/\u0000/g,"|").replace(/\\\\([(){}+?])/g,"$1"),f.i?"i":"")}catch(e){return E("grep","the pattern is not valid: "+pat)}
  var files=[],err=[];if(f.r||f.R){(rest.length?rest:["."]).forEach(function(p){walk(S,C,p,function(path,n){if(n.t==="f")files.push(path)},err,"grep")})}else files=rest;
  var I=inputs(S,C,"grep",files,stdin),out=[],hits=0,many=I.list.length>1||f.r||f.R;
  I.list.forEach(function(file){var c=0,ls=lines(file.x);if(file.x.indexOf("\u0089PNG")===0||file.x.indexOf("JFIF")===0||file.x.indexOf("%PDF")===0)return;
    ls.forEach(function(l,k){var m=re.test(l);if(m===!f.v){c++;if(!f.c&&!f.l&&!f.q)out.push((many?file.name+":":"")+(f.n?(k+1)+":":"")+(f.o&&!f.v?(re.exec(l)||[""])[0]:l))}});
    hits+=c;if(f.c)out.push((many?file.name+":":"")+c);if(f.l&&c)out.push(file.name)});
  return{out:out.length?out.join("\n")+"\n":"",err:I.err.concat(err).join("\n"),code:hits?0:1}};
CMD.egrep=function(a,i,S,C){return CMD.grep(["-E"].concat(a),i,S,C)};
CMD.find=function(args,stdin,S,C){var paths=[],i=0,tests=[],err=[],out=[],del=false;while(i<args.length&&args[i][0]!=="-")paths.push(args[i++]);if(!paths.length)paths=["."];
  for(;i<args.length;i++){var a=args[i],v=args[i+1];
    if(a==="-name"||a==="-iname"){(function(re){tests.push(function(p,n){return re.test(base(p)||p)})})(new RegExp(globRe(v).source,a==="-iname"?"i":""));i++}
    else if(a==="-type"){(function(t){tests.push(function(p,n){return n.t===t})})(v);i++}
    else if(a==="-user"){(function(u){tests.push(function(p,n){return n.o===u})})(v);i++}
    else if(a==="-size"){(function(m){if(!m)return;var b=+m[2]*({k:1024,M:1048576,G:1073741824,c:1,"":512})[m[3]||""];tests.push(function(p,n){return n.t==="f"&&(m[1]==="+"?size(n)>b:m[1]==="-"?size(n)<b:Math.ceil(size(n)/b)===1)})})(/^([+-]?)(\d+)([kMGc]?)$/.exec(v||""));i++}
    else if(a==="-mtime"||a==="-mmin"||a==="-newer"||a==="-maxdepth"||a==="-perm"){if(a==="-mtime"||a==="-mmin"){(function(v){tests.push(function(p,n){return /^-/.test(v)?n.m.indexOf("Oct  6")===0:n.m.indexOf("Oct  6")!==0})})(v)}i++}
    else if(a==="-delete")del=true;else if(a==="-print"||a==="-ls"){}else if(a==="-exec"){return E("find","-exec is not built into this playground. Pipe the list into another command instead, or use -delete")}
    else return E("find","unknown predicate ‘"+a+"’")}
  paths.forEach(function(p){walk(S,C,p,function(path,n){if(tests.every(function(t){return t(path,n)}))out.push(path)},err,"find")});
  if(del)out.slice().reverse().forEach(function(p){var a=abs(S,p),d=get(S,dirOf(a));if(d&&can(d,2,C.user))delete d.c[base(a)];else err.push("find: cannot delete ‘"+p+"’: Permission denied")});
  return{out:del?"":out.length?out.join("\n")+"\n":"",err:err.join("\n"),code:err.length?1:0}};
CMD.sort=function(args,stdin,S,C){var P=flags(args,"kt"),f=P.f,I=inputs(S,C,"sort",P.rest,stdin),l=lines(I.list.map(function(x){return x.x}).join("")),k=f.k?parseInt(f.k,10)-1:-1,sep=f.t;
  function key(s){if(k<0)return s;var p=sep?s.split(sep):s.trim().split(/\s+/);return p[k]===undefined?"":p[k]}
  l.sort(function(a,b){var x=key(a),y=key(b);if(f.n||f.h){var d=(parseFloat(x)||0)-(parseFloat(y)||0);if(d)return d}return x<y?-1:x>y?1:0});if(f.r)l.reverse();
  if(f.u)l=l.filter(function(x,i){return i===0||x!==l[i-1]});return{out:l.length?l.join("\n")+"\n":"",err:I.err.join("\n"),code:0}};
CMD.uniq=function(args,stdin,S,C){var P=flags(args),I=inputs(S,C,"uniq",P.rest,stdin),l=lines(I.list.map(function(x){return x.x}).join("")),out=[],i=0;
  while(i<l.length){var j=i;while(j+1<l.length&&l[j+1]===l[i])j++;var n=j-i+1;if(!(P.f.d&&n<2)&&!(P.f.u&&n>1))out.push(P.f.c?pad(n,7)+" "+l[i]:l[i]);i=j+1}return{out:out.length?out.join("\n")+"\n":"",err:"",code:0}};
CMD.cut=function(args,stdin,S,C){var P=flags(args,"dfc"),d=P.f.d===undefined?"\t":P.f.d,spec=P.f.f||P.f.c;if(!spec)return E("cut","you must say which fields: -f 1 or -f 1,3 or -f 2-4");
  var want=[];String(spec).split(",").forEach(function(s){var m=/^(\d*)-(\d*)$/.exec(s);if(m){for(var k=+(m[1]||1);k<=+(m[2]||50);k++)want.push(k)}else want.push(+s)});
  var I=inputs(S,C,"cut",P.rest,stdin),out=lines(I.list.map(function(x){return x.x}).join("")).map(function(l){if(P.f.c)return want.map(function(k){return l[k-1]||""}).join("");var p=l.split(d);if(p.length===1)return l;return want.map(function(k){return p[k-1]}).filter(function(x){return x!==undefined}).join(d)});
  return{out:out.length?out.join("\n")+"\n":"",err:I.err.join("\n"),code:0}};
CMD.awk=function(args,stdin,S,C){var P=flags(args,"F"),prog=P.rest.shift();if(prog===undefined)return E("awk","usage: awk [-F sep] '{print $1}' [file]");
  var m=/^\s*(?:\/(.+)\/\s*)?\{\s*print\s*(.*?)\s*;?\s*\}\s*$/.exec(prog),mc=/^\s*\/(.+)\/\s*$/.exec(prog);
  if(!m&&!mc)return E("awk","this playground only knows the print form: awk '{print $1}', awk -F: '{print $1, $3}' or awk '/pattern/ {print $2}'");
  var re=(m&&m[1])||(mc&&mc[1])?new RegExp(m&&m[1]?m[1]:mc[1]):null,items=m&&m[2]?m[2].split(/\s*,\s*/):["$0"],sep=P.f.F;
  var I=inputs(S,C,"awk",P.rest,stdin),out=[];lines(I.list.map(function(x){return x.x}).join("")).forEach(function(l,nr){if(re&&!re.test(l))return;var p=sep?l.split(sep):l.trim().split(/\s+/);
    out.push(items.map(function(it){return it.split(/\s+(?=["$N])/).map(function(tk){var q=/^"(.*)"$/.exec(tk);if(q)return q[1];if(tk==="$0")return l;if(tk==="$NF")return p[p.length-1]||"";var nf=/^\$\(NF-(\d+)\)$/.exec(tk);if(nf)return p[p.length-1-(+nf[1])]||"";if(tk==="NR")return nr+1;if(tk==="NF")return p.length;var f=/^\$(\d+)$/.exec(tk);return f?(p[+f[1]-1]||""):tk}).join("")}).join(" "))});
  return{out:out.length?out.join("\n")+"\n":"",err:I.err.join("\n"),code:0}};
CMD.sed=function(args,stdin,S,C){var P=flags(args,"e"),inplace=P.f.i,prog=P.f.e||P.rest.shift();if(!prog)return E("sed","usage: sed 's/old/new/g' [file]   or   sed -i 's/old/new/' file");
  var d=prog[1],m=prog[0]==="s"&&d?prog.slice(2).split(d):null,del=/^\/(.+)\/d$/.exec(prog),pr=P.f.n&&/^(\d+)(?:,(\d+))?p$/.exec(prog);
  if(!(m&&m.length>=2)&&!del&&!pr)return E("sed","this playground knows s/old/new/[g], /pattern/d and -n 'N,Mp'");
  var re;try{re=m?new RegExp(m[0],(m[2]||"").replace(/[^gi]/g,"")):del?new RegExp(del[1]):null}catch(e){return E("sed","the pattern is not valid")}
  function run(x){var l=lines(x);if(pr)l=l.slice(+pr[1]-1,+(pr[2]||pr[1]));else if(del)l=l.filter(function(s){return !re.test(s)});else l=l.map(function(s){return s.replace(re,m[1].replace(/\\(\d)/g,"$$$1").replace(/&/g,"$$&"))});return l.join("\n")+(l.length?"\n":"")}
  if(inplace){if(!P.rest.length)return E("sed","no input files");var err=[];P.rest.forEach(function(f){var r=readFile(S,C,"sed",f);if(r.e){err.push(r.e);return}var w=writeFile(S,C.user,"sed",f,run(r.x),false);if(w)err.push(w.replace("sed: ","sed: couldn't open temporary file for "))});return{out:"",err:err.join("\n"),code:err.length?1:0}}
  var I=inputs(S,C,"sed",P.rest,stdin);return{out:run(I.list.map(function(x){return x.x}).join("")),err:I.err.join("\n"),code:I.err.length?1:0}};
CMD.tr=function(args,stdin){var del=args[0]==="-d";if(del)args=args.slice(1);function set(s){return (s||"").replace(/a-z/g,"abcdefghijklmnopqrstuvwxyz").replace(/A-Z/g,"ABCDEFGHIJKLMNOPQRSTUVWXYZ").replace(/0-9/g,"0123456789").replace(/\\n/g,"\n").replace(/\\t/g,"\t")}
  var a=set(args[0]),b=set(args[1]),out="";for(var i=0;i<(stdin||"").length;i++){var c=stdin[i],k=a.indexOf(c);if(k<0)out+=c;else if(!del)out+=b[Math.min(k,b.length-1)]||""}return OK(out)};
CMD.tee=function(args,stdin,S,C){var P=flags(args),err=[];P.rest.forEach(function(f){var w=writeFile(S,C.user,"tee",f,stdin||"",!!P.f.a);if(w)err.push(w)});return{out:stdin||"",err:err.join("\n"),code:err.length?1:0}};
CMD.touch=function(args,stdin,S,C){var err=[];args.forEach(function(p){var n=get(S,abs(S,p));if(n){n.m=NOW;return}var w=writeFile(S,C.user,"touch",p,"",false);if(w)err.push(w.replace(/: ([^:]+): /,": cannot touch '$1': "))});return{out:"",err:err.join("\n"),code:err.length?1:0}};
CMD.mkdir=function(args,stdin,S,C){var P=flags(args),err=[];P.rest.forEach(function(p){var a=abs(S,p),parts=a.split("/").filter(Boolean),n=S.fs,cur="";
    for(var i=0;i<parts.length;i++){cur+="/"+parts[i];var nx=n.c[parts[i]],last=i===parts.length-1;
      if(nx){if(nx.t!=="d"){err.push("mkdir: cannot create directory ‘"+p+"’: Not a directory");return}if(last&&!P.f.p){err.push("mkdir: cannot create directory ‘"+p+"’: File exists");return}n=nx;continue}
      if(!last&&!P.f.p){err.push("mkdir: cannot create directory ‘"+p+"’: No such file or directory");return}
      if(!can(n,2,C.user)){err.push("mkdir: cannot create directory ‘"+p+"’: Permission denied");return}
      nx=n.c[parts[i]]=D(0o755,C.user,USERS[C.user].groups[0],{},NOW);n=nx}});return{out:"",err:err.join("\n"),code:err.length?1:0}};
function rmNode(S,C,p,rec,force,err,cmd){var a=abs(S,p),n=get(S,a),d=get(S,dirOf(a));if(!n){if(!force)err.push(cmd+": cannot remove '"+p+"': No such file or directory");return false}
  if(a==="/"||a==="/etc"||a==="/var"||a==="/home"||a==="/usr"||a==="/bin"){err.push(cmd+": it is dangerous to operate recursively on '"+a+"'. This playground keeps that folder, a real server would not ask");return false}
  if(n.t==="d"&&!rec){err.push(cmd+": cannot remove '"+p+"': Is a directory");return false}
  if(reach(S,dirOf(a),C.user)||!can(d,2,C.user)||((d.mode&0o1000)&&C.user!=="root"&&n.o!==C.user)){err.push(cmd+": cannot remove '"+p+"': Permission denied");return false}
  if(S.cwd===a||S.cwd.indexOf(a+"/")===0)S.cwd=dirOf(a);var dbg=get(S,"/var/log/app/debug.log");if(dbg&&S.svc["shop-worker"]==="active"&&(n===dbg||a==="/var/log/app"||a==="/var/log"))S.ghost+=size(dbg);delete d.c[base(a)];return true}
CMD.rm=function(args,stdin,S,C){var P=flags(args),err=[];if(!P.rest.length)return E("rm","missing operand");P.rest.forEach(function(p){rmNode(S,C,p,P.f.r||P.f.R,P.f.f,err,"rm")});return{out:"",err:err.join("\n"),code:err.length?1:0}};
CMD.rmdir=function(args,stdin,S,C){var err=[];args.forEach(function(p){var n=get(S,abs(S,p));if(n&&n.t==="d"&&Object.keys(n.c).length){err.push("rmdir: failed to remove '"+p+"': Directory not empty");return}rmNode(S,C,p,true,false,err,"rmdir")});return{out:"",err:err.join("\n"),code:err.length?1:0}};
function clone(n,u){var c=JSON.parse(JSON.stringify(n));(function own(x){x.o=u;x.g=USERS[u].groups[0];x.m=NOW;if(x.c)for(var k in x.c)own(x.c[k])})(c);return c}
function cpmv(move){return function(args,stdin,S,C){var cmd=move?"mv":"cp",P=flags(args),r=P.rest,err=[];if(r.length<2)return E(cmd,"missing destination file operand");var dst=r.pop(),da=abs(S,dst),dn=get(S,da);
    if(r.length>1&&(!dn||dn.t!=="d"))return E(cmd,"target '"+dst+"' is not a directory");
    r.forEach(function(src){var sa=abs(S,src),sn=get(S,sa);if(!sn){err.push(cmd+": cannot stat '"+src+"': No such file or directory");return}
      if(sn.t==="d"&&!move&&!P.f.r&&!P.f.R&&!P.f.a){err.push("cp: -r not specified; omitting directory '"+src+"'");return}
      if(!move&&(reach(S,dirOf(sa),C.user)||!can(sn,4,C.user))){err.push("cp: cannot open '"+src+"' for reading: Permission denied");return}
      var target=dn&&dn.t==="d"?da.replace(/\/$/,"")+"/"+base(sa):da,td=get(S,dirOf(target));
      if(!td||td.t!=="d"){err.push(cmd+": cannot create '"+dst+"': No such file or directory");return}
      if(reach(S,dirOf(target),C.user)||!can(td,2,C.user)){err.push(cmd+": cannot create '"+dst+"': Permission denied");return}
      if(move){var sd=get(S,dirOf(sa));if(!can(sd,2,C.user)){err.push("mv: cannot move '"+src+"': Permission denied");return}td.c[base(target)]=sn;delete sd.c[base(sa)]}else td.c[base(target)]=clone(sn,C.user)});
    return{out:"",err:err.join("\n"),code:err.length?1:0}}}
CMD.cp=cpmv(false);CMD.mv=cpmv(true);
CMD.chmod=function(args,stdin,S,C){var P=flags(args.filter(function(a){return !/^-[rwxXst]/.test(a)||/^-R$/.test(a)})),rest=args.filter(function(a){return a!=="-R"}),spec=rest.shift(),err=[];if(!spec||!rest.length)return E("chmod","usage: chmod 640 file   or   chmod u+x file");
  rest.forEach(function(p){var n=get(S,abs(S,p));if(!n){err.push("chmod: cannot access '"+p+"': No such file or directory");return}if(C.user!=="root"&&n.o!==C.user){err.push("chmod: changing permissions of '"+p+"': Operation not permitted");return}
    if(/^[0-7]{3,4}$/.test(spec)){n.mode=parseInt(spec,8);return}
    var ok=spec.split(",").every(function(s){var m=/^([ugoa]*)([+\-=])([rwxX]*)$/.exec(s);if(!m)return false;var who=m[1]||"a",bits=0;if(m[3].indexOf("r")>=0)bits|=4;if(m[3].indexOf("w")>=0)bits|=2;if(/x/i.test(m[3]))bits|=1;
      [["u",6],["g",3],["o",0]].forEach(function(w){if(who.indexOf(w[0])<0&&who.indexOf("a")<0)return;var mask=bits<<w[1];if(m[2]==="+")n.mode|=mask;else if(m[2]==="-")n.mode&=~mask;else n.mode=(n.mode&~(7<<w[1]))|mask});return true});
    if(!ok)err.push("chmod: invalid mode: ‘"+spec+"’")});return{out:"",err:err.join("\n"),code:err.length?1:0}};
CMD.chown=function(args,stdin,S,C){var rec=args.indexOf("-R")>=0,rest=args.filter(function(a){return a!=="-R"}),spec=rest.shift(),err=[];if(!spec||!rest.length)return E("chown","usage: chown user:group file");var ug=spec.split(/[:.]/);
  if(ug[0]&&!USERS[ug[0]])return E("chown","invalid user: ‘"+spec+"’");
  rest.forEach(function(p){var n=get(S,abs(S,p));if(!n){err.push("chown: cannot access '"+p+"': No such file or directory");return}if(C.user!=="root"){err.push("chown: changing ownership of '"+p+"': Operation not permitted");return}
    (function set(x){if(ug[0])x.o=ug[0];if(ug[1])x.g=ug[1];if(rec&&x.c)for(var k in x.c)set(x.c[k])})(n)});return{out:"",err:err.join("\n"),code:err.length?1:0}};
CMD.stat=function(args,stdin,S){var out=[],err=[];args.forEach(function(p){var n=get(S,abs(S,p));if(!n){err.push("stat: cannot statx '"+p+"': No such file or directory");return}
    out.push("  File: "+p+"\n  Size: "+size(n)+"\t"+(n.t==="d"?"directory":"regular file")+"\nAccess: ("+("0000"+(n.mode&0o7777).toString(8)).slice(-4)+"/"+modeStr(n)+")  Uid: ("+pad(USERS[n.o]?USERS[n.o].uid:0,5)+"/"+pad(n.o,8)+")   Gid: ("+pad(n.g,8)+")\nModify: 2026 "+n.m)});return{out:out.length?out.join("\n")+"\n":"",err:err.join("\n"),code:err.length?1:0}};
CMD.file=function(args,stdin,S){return OK(args.map(function(p){var n=get(S,abs(S,p));return p+": "+(!n?"cannot open (No such file or directory)":n.t==="d"?"directory":/^#!/.test(n.x)?"Bourne-Again shell script, ASCII text executable":/^<\?php/.test(n.x)?"PHP script, ASCII text":n.x.indexOf("\u0089PNG")===0?"PNG image data":n.x.indexOf("JFIF")===0?"JPEG image data":n.x.indexOf("%PDF")===0?"PDF document":/\.gz$/.test(p)?"gzip compressed data":n.x===""?"empty":"ASCII text")}).join("\n")+"\n")};
CMD.du=function(args,stdin,S,C){var P=flags(args,"d"),f=P.f,out=[],err=[],depth=f.s?0:f.d!==undefined?+f.d:f["max-depth"]!==undefined?+f["max-depth"]:99;
  (P.rest.length?P.rest:["."]).forEach(function(p){var a=abs(S,p),n=get(S,a);if(!n){err.push("du: cannot access '"+p+"': No such file or directory");return}
    (function rec(path,node,d){var total=node.t==="f"?size(node):4096;if(node.t==="d"){if(!can(node,4,C.user)){err.push("du: cannot read directory '"+path+"': Permission denied")}else Object.keys(node.c).sort().forEach(function(k){total+=rec(path.replace(/\/$/,"")+"/"+k,node.c[k],d+1)})}
      if(d<=depth&&(node.t==="d"||d===0||f.a))out.push((f.h?human(total):Math.ceil(total/1024))+"\t"+path);return total})(p,n,0)});
  return{out:out.length?out.join("\n")+"\n":"",err:err.join("\n"),code:err.length?1:0}};
CMD.df=function(args,stdin,S){var h=args.join(" ").indexOf("h")>=0,rows=[["/dev/sda1",20e9,6.4e9,"/"],["/dev/sda2",20e9,Math.min(20e9,varUse(S)),"/var"],["tmpfs",2e9,1.2e6,"/run"]];var want=args.filter(function(x){return x[0]!=="-"}).map(function(x){var p=abs(S,x);return p==="/var"||p.indexOf("/var/")===0?"/var":p.indexOf("/run")===0?"/run":"/"});if(want.length)rows=rows.filter(function(r){return want.indexOf(r[3])>=0});
  return OK("Filesystem      Size  Used Avail Use% Mounted on\n"+rows.map(function(r){var fmt=function(b){return h?human(b):String(Math.round(b/1024))};return pad(r[0],14,true)+pad(fmt(r[1]),6)+pad(fmt(r[2]),6)+pad(fmt(Math.max(0,r[1]-r[2])),6)+pad(Math.min(100,Math.round(r[2]/r[1]*100))+"%",5)+" "+r[3]}).join("\n")+"\n")};
CMD.free=function(){return OK("               total        used        free      shared  buff/cache   available\nMem:           7.8Gi       2.1Gi       1.2Gi        84Mi       4.5Gi       5.4Gi\nSwap:          2.0Gi          0B       2.0Gi\n")};
function procs(S){var p=[["root",1,"0.0","0.1","/sbin/init"],["root",612,"0.0","0.1","/usr/sbin/cron -f"],["root",701,"0.0","0.2","sshd: /usr/sbin/sshd -D"],["postgres",842,"0.1","1.9","/usr/lib/postgresql/17/bin/postgres -D /var/lib/postgresql/17/main"]];
  if(S.svc.nginx==="active"){p.push(["root",1903,"0.0","0.1","nginx: master process /usr/sbin/nginx"],["www-data",1904,"0.0","0.3","nginx: worker process"])}
  if(S.svc["shop-worker"]==="active")p.push(["www-data",2310,"3.1","0.8","php /srv/www/shop/worker.php --debug"]);p.push(["anna",2395,"0.0","0.1","-bash"]);return p}
CMD.ps=function(args,stdin,S){var all=/a|e/.test(args.join(""));var p=procs(S);if(!all)p=p.filter(function(x){return x[0]==="anna"});return OK("USER         PID %CPU %MEM COMMAND\n"+p.map(function(x){return pad(x[0],10,true)+pad(x[1],6)+pad(x[2],5)+pad(x[3],5)+" "+x[4]}).join("\n")+"\nanna        2401  0.0  0.0 ps "+args.join(" ")+"\n")};
CMD.top=CMD.htop=function(a,i,S){return OK("top - 08:30:12 up 41 days,  load average: 0.21, 0.18, 0.15\nTasks:  96 total,   1 running\n%Cpu(s):  3.2 us,  0.8 sy, 95.9 id\nMiB Mem :   7976.0 total,   1228.4 free,   2150.1 used\n\n"+CMD.ps(["aux"],"",S).out+"\n(a snapshot: the real top keeps updating until you press q)\n")};
CMD.kill=CMD.pkill=function(args,stdin,S,C){var t=args[args.length-1]||"";if(C.user!=="root")return E("kill","("+t+") - Operation not permitted");if(t==="2310"||/worker|php/.test(t)){S.svc["shop-worker"]="inactive";S.ghost=0}return OK("")};
CMD.lsof=function(args,stdin,S,C){if(C.user!=="root")return E("lsof","WARNING: can't stat() some files as "+C.user+". Use sudo to see the files of other users.");var o="COMMAND  PID     USER   FD   TYPE DEVICE    SIZE/OFF NLINK NODE NAME\n";
  if(S.ghost)o+="php     2310 www-data    3w   REG    8,2 "+Math.round(S.ghost)+"     0 4711 /var/log/app/debug.log (deleted)\n";else if(args.indexOf("+L1")>=0)return OK(o);
  if(args.indexOf("+L1")<0){if(S.svc["shop-worker"]==="active"&&!S.ghost)o+="php     2310 www-data    3w   REG    8,2 "+Math.round(size(get(S,"/var/log/app/debug.log")||{t:"f",x:""}))+"     1 4711 /var/log/app/debug.log\n";if(S.svc.nginx==="active")o+="nginx   1903     root    6u  IPv4  18211         0t0       TCP *:80 (LISTEN)\n"}return OK(o)};
CMD.truncate=function(args,stdin,S,C){var P=flags(args,"s"),err=[];if(P.f.s===undefined||!P.rest.length)return E("truncate","usage: truncate -s 0 file");P.rest.forEach(function(p){var w=writeFile(S,C.user,"truncate",p,"",false);if(w)err.push(w.replace(/: ([^:]+): /,": cannot open '$1' for writing: "))});return{out:"",err:err.join("\n"),code:err.length?1:0}};
CMD.sshd=function(args,stdin,S,C){if(args[0]!=="-t")return E("sshd","in this playground use: sudo sshd -t   and   sudo systemctl reload ssh");if(C.user!=="root")return E("sshd","no hostkeys available -- exiting. (Run it with sudo.)");var n=get(S,"/etc/ssh/sshd_config"),l=lines(n?n.x:"");for(var i=0;i<l.length;i++){var m=/^\s*([A-Za-z0-9]+)\s+(\S+)/.exec(l[i]);if(!m||l[i].trim()[0]==="#")continue;if(["Port","PermitRootLogin","PasswordAuthentication","PubkeyAuthentication","X11Forwarding","Subsystem","AllowUsers","AllowGroups","MaxAuthTries","LoginGraceTime","KbdInteractiveAuthentication","ClientAliveInterval"].indexOf(m[1])<0)return E("/etc/ssh/sshd_config","line "+(i+1)+": Bad configuration option: "+m[1]);if(/^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|X11Forwarding)$/.test(m[1])&&!/^(yes|no|prohibit-password)$/.test(m[2]))return E("/etc/ssh/sshd_config","line "+(i+1)+": unsupported option \""+m[2]+"\".")}return OK("")};
CMD.ss=CMD.netstat=function(args,stdin,S){var l=[["0.0.0.0:22","sshd",701],["127.0.0.1:5432","postgres",842]];if(S.svc.nginx==="active")l.push(["0.0.0.0:80","nginx",1903]);
  return OK("State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port  Process\n"+l.map(function(x){return "LISTEN  0       128     "+pad(x[0],19,true)+"  0.0.0.0:*          users:((\""+x[1]+"\",pid="+x[2]+"))"}).join("\n")+"\n")};
CMD.ip=function(args){return OK(/^r/.test(args[0]||"")?"default via 10.87.20.1 dev eth0\n10.87.20.0/24 dev eth0 proto kernel scope link src 10.87.20.10\n":"1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    link/ether 52:54:00:12:34:56\n    inet 10.87.20.10/24 brd 10.87.20.255 scope global eth0\n")};
CMD.ping=function(args){var h=args.filter(function(a){return a[0]!=="-"&&!/^\d+$/.test(a)})[0];if(!h)return E("ping","usage: ping -c 3 host");var known={localhost:"127.0.0.1",web01:"10.87.20.10",db01:"10.87.20.20","db01.example.internal":"10.87.20.20","example.org":"192.0.2.10"},ip=known[h]||(/^\d+\.\d+\.\d+\.\d+$/.test(h)?h:null);
  if(!ip)return E("ping",h+": Name or service not known");return OK("PING "+h+" ("+ip+") 56(84) bytes of data.\n64 bytes from "+ip+": icmp_seq=1 ttl=64 time=0.41 ms\n64 bytes from "+ip+": icmp_seq=2 ttl=64 time=0.38 ms\n64 bytes from "+ip+": icmp_seq=3 ttl=64 time=0.40 ms\n\n--- "+h+" ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss\n")};
CMD.curl=CMD.wget=function(args,stdin,S){var u=args.filter(function(a){return a[0]!=="-"})[0]||"";if(!/localhost|127\.0\.0\.1|web01|shop\.example\.org/.test(u))return E("curl","(6) Could not resolve host: this playground has no internet");
  if(S.svc.nginx!=="active")return{out:"",err:"curl: (7) Failed to connect to localhost port 80 after 0 ms: Connection refused",code:7};
  return OK(args.indexOf("-I")>=0?"HTTP/1.1 200 OK\nServer: nginx\nContent-Type: text/html\n":get(S,"/srv/www/shop/index.html")?get(S,"/srv/www/shop/index.html").x:"<h1>404</h1>\n")};
CMD.nginx=function(args,stdin,S,C){if(args[0]!=="-t"&&args[0]!=="-T")return E("nginx","in this playground use: sudo nginx -t   and   sudo systemctl restart nginx");if(C.user!=="root")return{out:"",err:"nginx: [alert] could not open error log file: open() \"/var/log/nginx/error.log\" failed (13: Permission denied)\nnginx: configuration file /etc/nginx/nginx.conf test failed",code:1};
  var bad=nginxTest(S);if(bad)return{out:"",err:bad+"\nnginx: configuration file /etc/nginx/nginx.conf test failed",code:1};return{out:"",err:"nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful",code:0}};
var UNITS={"shop-worker":"Shop queue worker",nginx:"A high performance web server",ssh:"OpenBSD Secure Shell server",cron:"Regular background program processing daemon",postgresql:"PostgreSQL RDBMS"};
CMD.systemctl=function(args,stdin,S,C){var act=args[0],u=(args[1]||"").replace(/\.service$/,"").replace(/^sshd$/,"ssh");
  if(act==="list-units"||!act||act==="--failed"){return OK(Object.keys(UNITS).filter(function(k){return act!=="--failed"||S.svc[k]==="failed"}).map(function(k){return "  "+pad(k+".service",22,true)+"loaded "+pad(S.svc[k]==="active"?"active running":S.svc[k]==="failed"?"failed failed ":"inactive dead  ",16,true)+UNITS[k]}).join("\n")+"\n")}
  if(!UNITS[u])return E("systemctl","Unit "+(args[1]||"")+".service could not be found.");
  if(act==="status"||act==="is-active"){var s=S.svc[u];if(act==="is-active")return{out:s+"\n",err:"",code:s==="active"?0:3};
    var head=(s==="active"?"● ":"× ")+u+".service - "+UNITS[u]+"\n     Loaded: loaded (/usr/lib/systemd/system/"+u+".service; enabled)\n     Active: "+(s==="active"?"active (running) since Tue 2026-10-06 "+(u==="nginx"?"08:30:10":"06:02:11")+" CEST":s==="failed"?"failed (Result: exit-code) since Tue 2026-10-06 07:03:11 CEST; 1h 27min ago":"inactive (dead)")+"\n";
    if(u==="nginx"&&s==="failed")head+="    Process: 1840 ExecStartPre=/usr/sbin/nginx -t -q (code=exited, status=1/FAILURE)\n\nOct 06 07:03:11 web01 nginx[1840]: "+(nginxTest(S)||"nginx: configuration test failed")+"\nOct 06 07:03:11 web01 systemd[1]: Failed to start nginx.service - A high performance web server.\n";
    return{out:head,err:"",code:s==="active"?0:3}}
  if(["start","stop","restart","reload","enable","disable"].indexOf(act)<0)return E("systemctl","Unknown command verb '"+act+"'");
  if(C.user!=="root")return{out:"",err:"Failed to "+act+" "+u+".service: Access denied. Changing a service needs root: put sudo in front.",code:1};
  if(u==="shop-worker"&&(act==="stop"||act==="restart"))S.ghost=0;if(act==="stop"){S.svc[u]="inactive";return OK("")}if(act==="enable"||act==="disable")return OK("");
  if(u==="nginx"&&nginxTest(S)){S.svc.nginx="failed";return{out:"",err:"Job for nginx.service failed because the control process exited with error code.\nSee \"systemctl status nginx.service\" and \"journalctl -xeu nginx.service\" for details.",code:1}}
  if(act==="reload"&&S.svc[u]!=="active")return E("systemctl",u+".service is not active, cannot reload.");
  if(u==="ssh"){var sc=get(S,"/etc/ssh/sshd_config");S.sshApplied=sc?sc.x:""}S.svc[u]="active";return OK("")};
CMD.service=function(args,i,S,C){return CMD.systemctl([args[1],args[0]],i,S,C)};
CMD.journalctl=function(args,stdin,S,C){var P=flags(args,"un"),u=(P.f.u||"").replace(/\.service$/,"");if(C.user!=="root"&&USERS[C.user].groups.indexOf("adm")<0)return{out:"",err:"Hint: You are currently not seeing messages from other users and the system.\n      Users in groups 'adm', 'systemd-journal' can see all messages. Use sudo.\n-- No entries --",code:0};
  var l=lines(get(S,"/var/log/syslog").x);if(u)l=l.filter(function(x){return x.indexOf(u)>=0});if(u==="nginx"&&S.svc.nginx==="active")l.push("Oct  6 08:30:10 web01 systemd[1]: Started nginx.service - A high performance web server.");
  if(P.f.n)l=l.slice(-parseInt(P.f.n,10));return OK(l.join("\n")+"\n")};
CMD.crontab=function(args,i,S,C){return args[0]==="-l"?OK(C.user==="root"?"30 1 * * * /usr/local/bin/backup.sh\n":"no crontab for "+C.user+"\n"):E("crontab","in this playground only crontab -l works")};
CMD.last=CMD.who=CMD.w=function(){return OK("anna     pts/0        10.87.20.14      Tue Oct  6 08:02   still logged in\ndeploy   pts/1        10.87.20.30      Tue Oct  6 07:01 - 07:04  (00:03)\n")};
CMD.which=function(args){return{out:args.map(function(a){return CMD[a]?"/usr/bin/"+a:null}).filter(Boolean).join("\n")+(args.some(function(a){return CMD[a]})?"\n":""),err:"",code:args.every(function(a){return CMD[a]})?0:1}};
CMD.true=function(){return OK("")};CMD.false=function(){return{out:"",err:"",code:1}};
CMD.exit=CMD.logout=function(){return OK("There is nowhere to exit to: this server lives in your browser tab. Close the tab when you are done.\n")};
["nano","vi","vim","emacs"].forEach(function(e){CMD[e]=function(a){return E(e,"there is no editor in this playground. Change a line with sed -i 's/old/new/' "+(a[0]||"file")+", or add one with echo \"text\" >> "+(a[0]||"file"))}});
["apt","apt-get","dnf","yum","reboot","shutdown","ssh","scp","docker","git","python3","passwd","useradd","mount"].forEach(function(e){CMD[e]=function(){return E(e,"not part of this playground")}});
CMD.su=function(){return E("su","stay as anna and put sudo in front of the one command that needs root. That is also the habit to keep on real servers")};
CMD.getent=function(args,stdin,S){var db=args[0],k=args[1],f=get(S,"/etc/"+(db==="group"?"group":"passwd"));if(db!=="group"&&db!=="passwd")return E("getent","this playground knows: getent passwd [name] and getent group [name]");var l=lines(f.x).filter(function(x){return !k||x.split(":")[0]===k});return{out:l.length?l.join("\n")+"\n":"",err:"",code:l.length?0:2}};
CMD.groups=function(args,stdin,S,C){var u=args[0]||C.user;if(!USERS[u])return E("groups","‘"+u+"’: no such user");return OK((args[0]?u+" : ":"")+USERS[u].groups.join(" ")+"\n")};
function dropGroup(S,u,g){var U=USERS[u];if(!U)return "user '"+u+"' does not exist";var i=U.groups.indexOf(g);if(i<1)return "user '"+u+"' is not a member of '"+g+"'";U.groups.splice(i,1);var f=get(S,"/etc/group");f.x=lines(f.x).map(function(l){var p=l.split(":");if(p[0]!==g)return l;p[3]=p[3].split(",").filter(function(x){return x&&x!==u}).join(",");return p.join(":")}).join("\n")+"\n";return null}
function lockUser(S,u,lock){if(!USERS[u])return "user '"+u+"' does not exist";S.locked[u]=lock;var f=get(S,"/etc/shadow");f.x=lines(f.x).map(function(l){var p=l.split(":");if(p[0]!==u)return l;p[1]=p[1].replace(/^!/,"");if(lock)p[1]="!"+p[1];return p.join(":")}).join("\n")+"\n";return null}
CMD.deluser=CMD.gpasswd=function(args,stdin,S,C){var a=args.filter(function(x){return x!=="-d"&&x!=="--remove"}),cmd=args.indexOf("-d")>=0?"gpasswd":"deluser";if(a.length<2)return E(cmd,"usage: deluser USER GROUP   or   gpasswd -d USER GROUP");if(C.user!=="root")return E(cmd,"Only root may remove a user from a group. Use sudo.");var e=dropGroup(S,a[0],a[1]);if(e)return E(cmd,e);return OK("Removing user `"+a[0]+"' from group `"+a[1]+"' ...\nDone.\n")};
CMD.usermod=function(args,stdin,S,C){var u=args[args.length-1];if(C.user!=="root")return E("usermod","Permission denied. Use sudo.");if(args.indexOf("-L")>=0||args.indexOf("--lock")>=0){var e=lockUser(S,u,true);return e?E("usermod",e):OK("")}if(args.indexOf("-U")>=0){var e2=lockUser(S,u,false);return e2?E("usermod",e2):OK("")}return E("usermod","this playground knows: usermod -L USER (lock) and usermod -U USER (unlock)")};
CMD.passwd=function(args,stdin,S,C){var u=args[args.length-1];if(args[0]==="-S"){if(!USERS[u])return E("passwd","user '"+u+"' does not exist");return OK(u+" "+(S.locked[u]||u==="root"?"L":"P")+" 2026-03-02 0 99999 7 -1\n")}if(args[0]!=="-l"&&args[0]!=="-u")return E("passwd","changing passwords is not part of this playground. passwd -l USER locks an account, passwd -S USER shows its state");if(C.user!=="root")return E("passwd","Permission denied. Use sudo.");var e=lockUser(S,u,args[0]==="-l");return e?E("passwd",e):OK("passwd: password changed.\n")};
CMD.ufw=function(args,stdin,S,C){if(C.user!=="root")return E("ufw","You need to be root to run this script. Use sudo.");var a=args[0],F=S.ufw;
  if(a==="status"||!a){if(!F.on)return OK("Status: inactive\n"+(F.rules.length?"\n(rules are prepared and will apply when the firewall is enabled: sudo ufw show added)\n":""));return OK("Status: active\n\nTo                         Action      From\n--                         ------      ----\n"+F.rules.map(function(r){return pad(r.p,27,true)+pad(r.a.toUpperCase(),12,true)+"Anywhere"}).join("\n")+"\n")}
  if(a==="show")return OK("Added user rules (see 'ufw status' for running firewall):\n"+(F.rules.map(function(r){return "ufw "+r.a+" "+r.p}).join("\n")||"(None)")+"\n");
  if(a==="allow"||a==="deny"||a==="limit"){var p=({ssh:"22/tcp",http:"80/tcp",https:"443/tcp",openssh:"22/tcp","nginx":"80/tcp"})[(args[1]||"").toLowerCase()]||args[1];if(!p||!/^\d+(\/(tcp|udp))?$/.test(p))return E("ufw","Could not find a profile matching '"+(args[1]||"")+"'. Use a port, for example: ufw allow 22/tcp");F.rules=F.rules.filter(function(r){return r.p!==p});F.rules.push({a:a,p:p});return OK(F.on?"Rule added\n":"Rules updated\n")}
  if(a==="delete"){var q=args[2];var n0=F.rules.length;F.rules=F.rules.filter(function(r){return r.p!==q&&r.p!==q+"/tcp"});return n0===F.rules.length?E("ufw","Could not delete non-existent rule"):OK("Rule deleted\n")}
  if(a==="enable"){if(!F.rules.some(function(r){return (r.p==="22"||r.p==="22/tcp")&&r.a!=="deny"}))return{out:"",err:"Command may disrupt existing ssh connections.\nStopped: no rule allows port 22, and you are logged in over SSH. On a real server this is the moment you lock yourself out and drive to the data centre. Allow SSH first: sudo ufw allow 22/tcp",code:1};F.on=true;return OK("Command may disrupt existing ssh connections. Proceed with operation (y|n)? y\nFirewall is active and enabled on system startup\n")}
  if(a==="disable"){F.on=false;return OK("Firewall stopped and disabled on system startup\n")}
  if(a==="reset"){F.on=false;F.rules=[];return OK("Resetting all rules to installed defaults.\n")}
  return E("ufw","Invalid syntax. This playground knows: status, allow, deny, limit, delete allow, enable, disable, show added, reset")};
var HELP={ls:"list a folder. -l details, -a hidden files, -h readable sizes, -t newest first, -S largest first",cd:"change folder. cd .. goes up, cd alone goes home",pwd:"print where you are",cat:"print a file",head:"first lines: head -n 20 file",tail:"last lines: tail -n 20 file",grep:"find lines: grep -i word file. -v lines without, -c count, -n line numbers, -r whole folders",wc:"count: wc -l counts lines",sort:"sort lines. -n by number, -r reversed, -u unique",uniq:"merge repeated neighbours. -c counts them. Sort first.",cut:"pick columns: cut -d: -f1",awk:"pick fields: awk '{print $1}'",sed:"replace text: sed 's/old/new/g' file. -i changes the file itself",find:"search for files: find /srv -name '*.php' -type f",du:"folder sizes: du -sh /var/log/*",df:"free disk space: df -h",chmod:"change permissions: chmod 640 file, chmod +x script",chown:"change owner: sudo chown user:group file",sudo:"run one command as root",systemctl:"services: systemctl status nginx, sudo systemctl restart nginx",journalctl:"service log: sudo journalctl -u nginx -n 20",ps:"running programs: ps aux",ss:"listening ports: ss -tlnp",mkdir:"make a folder. -p makes parents too",rm:"delete. -r for folders. There is no undo.",cp:"copy. -r for folders",mv:"move or rename",touch:"create an empty file",echo:"print text. With > or >> it writes to a file",tee:"write to a file and pass on: cmd | sudo tee file",history:"what you typed so far",man:"man grep explains a command",curl:"fetch a page: curl localhost",truncate:"empty a file without deleting it: sudo truncate -s 0 file",lsof:"open files: sudo lsof +L1 lists deleted files that still take up space",ufw:"firewall: sudo ufw status, sudo ufw allow 22/tcp, sudo ufw enable",getent:"look up users and groups: getent group sudo",usermod:"sudo usermod -L USER locks an account",deluser:"sudo deluser USER GROUP removes a user from a group",groups:"groups USER shows the groups of a user",nginx:"sudo nginx -t tests the configuration",sshd:"sudo sshd -t tests the SSH server configuration"};
CMD.man=CMD.help=function(args){var c=args[0];if(c&&HELP[c])return OK(c+": "+HELP[c]+"\n");if(c)return E("man","No manual entry for "+c+" in this playground");
  return OK("Commands in this playground:\n"+Object.keys(HELP).map(function(k){return "  "+pad(k,11,true)+HELP[k]}).join("\n")+"\n\nJoin commands with a pipe (cmd | cmd), write output to a file with > or >>, and use Tab to complete names.\n")};

/* ---------- running a line ---------- */
function runSimple(S,words,stdin,user){var name=words[0],C={user:user};
  if(name==="sudo"&&USERS[user].groups.indexOf("sudo")<0&&user!=="root")return E("sudo",user+" is not in the sudoers file.");if(name==="sudo"){words=words.slice(1);while(words[0]&&/^-/.test(words[0])){if(words[0]==="-i"||words[0]==="-s"||words[0]==="su")return E("sudo","no root shell here. Put sudo in front of each command that needs it");words=words.slice(words[0]==="-u"?2:1)}
    if(!words.length)return E("sudo","usage: sudo command");if(USERS[user].groups.indexOf("sudo")<0&&user!=="root")return E("sudo",user+" is not in the sudoers file.");name=words[0];C.user="root";S.sudo=true}
  if(name==="bash"||name==="sh"){var sn=get(S,abs(S,words[1]||""));if(!words[1])return E(name,"no interactive shell inside the shell here");if(!sn)return E(name,words[1]+": No such file or directory");return script(S,sn,C,words[1],true)}
  if(name.indexOf("/")>=0){var n=get(S,abs(S,name));if(!n)return E("bash",name+": No such file or directory");if(n.t==="d")return E("bash",name+": Is a directory");return script(S,n,C,name,false)}
  if(/^\w+=/.test(name))return OK("");
  var fn=CMD[name];if(!fn)return{out:"",err:name+": command not found"+(name.toLowerCase()!==name&&CMD[name.toLowerCase()]?". Commands are lower case: "+name.toLowerCase():""),code:127};
  return fn(words.slice(1),stdin,S,C)}
function script(S,n,C,name,viaBash){if(!viaBash&&!can(n,1,C.user))return{out:"",err:"bash: "+name+": Permission denied",code:126};
  if(n.run==="hello")return OK("hello from web01\n");
  if(n.run==="backup"){var src=get(S,"/srv/www/shop"),t=get(S,"/tmp");if(!t.c.backup)t.c.backup=D(0o755,C.user,C.user,{},NOW);t.c.backup.c.shop=clone(src,C.user);return OK("backup done\n")}
  if(/^#!/.test(n.x))return OK("("+name+" ran. This playground does not execute its lines one by one.)\n");return{out:"",err:"bash: "+name+": cannot execute: not a script",code:126}}
function run(S,line){var out="",err=[],code=0,clear=false,toks;line=line.replace(/^\s+|\s+$/g,"");if(!line||line[0]==="#")return{out:"",err:"",code:0};
  S.hist.push(line);S.sudo=false;
  try{toks=lexLine(line.replace(/^!!/,S.hist[S.hist.length-2]||""))}catch(e){return{out:"",err:"bash: "+e.message,code:2}}
  /* split into pipelines joined by ; && || */
  var seqs=[[]],joins=[];toks.forEach(function(t){if(t.op===";"||t.op==="&&"||t.op==="||"){joins.push(t.op);seqs.push([])}else seqs[seqs.length-1].push(t)});
  for(var s=0;s<seqs.length;s++){if(s>0&&((joins[s-1]==="&&"&&code!==0)||(joins[s-1]==="||"&&code===0)))continue;if(!seqs[s].length)continue;
    var cmds=[[]];seqs[s].forEach(function(t){if(t.op==="|")cmds.push([]);else cmds[cmds.length-1].push(t)});
    var stdin="",r=null;
    for(var c=0;c<cmds.length;c++){var words=[],redir=null,inFile=null,bad=null;
      for(var i=0;i<cmds[c].length;i++){var t=cmds[c][i];if(t.op===">"||t.op===">>"){var f=cmds[c][++i];if(!f||f.op){bad="bash: syntax error near unexpected token `newline'";break}redir={file:expand(S,f)[0],append:t.op===">>"}}else if(t.op==="<"){var g=cmds[c][++i];inFile=g?expand(S,g)[0]:null}else words=words.concat(expand(S,t))}
      if(bad){err.push(bad);code=2;r=null;break}
      if(!words.length){if(redir){var w0=writeFile(S,S.user,"bash",redir.file,"",redir.append);if(w0)err.push(w0);r={out:"",err:"",code:w0?1:0}}else{err.push("bash: syntax error near unexpected token `|'");code=2;r=null;break}}
      else{if(inFile){var rf=readFile(S,{user:S.user},"bash",inFile);if(rf.e){err.push(rf.e);r={out:"",err:"",code:1};stdin="";continue}stdin=rf.x}
        S.ran.push(words.join(" "));r=runSimple(S,words,stdin,S.user)}
      if(r.err)err.push(r.err);if(r.clear)clear=true;
      if(redir&&words.length){var w=writeFile(S,S.user,"bash",redir.file,r.out,redir.append);if(w){err.push(w+(S.sudo?"\n(The redirect is done by your shell as "+S.user+", not by sudo. Use: command | sudo tee "+redir.file+")":""));r.code=1}r.out=""}
      stdin=r.out;code=r.code}
    if(r)out+=r.out}
  return{out:out,err:err.join("\n"),code:code,clear:clear}}
function complete(S,line){var m=/(^|[\s|;&])([^\s|;&]*)$/.exec(line),word=m?m[2]:"",start=line.length-word.length,first=!/\S\s/.test(line.slice(0,start).replace(/^.*[|;&]\s*/,"").replace(/^sudo\s+/,"x"))&&!/\S\s+$/.test(line.slice(0,start).replace(/^.*[|;&]\s*/,"").replace(/^\s*sudo\s+/,""));
  var cands;if(first&&word.indexOf("/")<0){cands=Object.keys(CMD).filter(function(k){return k.indexOf(word)===0&&HELP[k]}).sort().map(function(k){return k+" "})}
  else{var slash=word.lastIndexOf("/"),dir=slash>=0?word.slice(0,slash+1):"",pre=word.slice(slash+1),n=get(S,abs(S,dir||"."));if(!n||n.t!=="d")return{line:line,list:[]};
    cands=Object.keys(n.c).filter(function(k){return k.indexOf(pre)===0&&(pre[0]==="."||k[0]!==".")}).sort().map(function(k){return dir+k+(n.c[k].t==="d"?"/":" ")})}
  if(!cands.length)return{line:line,list:[]};if(cands.length===1)return{line:line.slice(0,start)+cands[0],list:[]};
  var p=cands[0];cands.forEach(function(c){while(c.indexOf(p)!==0)p=p.slice(0,-1)});return{line:line.slice(0,start)+(p.length>word.length?p:word),list:cands.map(function(c){return c.trim().replace(/^.*\/(?=.)/,"")})}}
function prompt(S){var h=USERS[S.user].home,p=S.cwd===h?"~":S.cwd.indexOf(h+"/")===0?"~"+S.cwd.slice(h.length):S.cwd;return S.user+"@web01:"+p+"$"}
window.SHELL={make:make,run:run,complete:complete,prompt:prompt,get:get,size:size,varUse:varUse,nginxTest:nginxTest};
})();
