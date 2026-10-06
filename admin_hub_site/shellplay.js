/* Terminal and missions for the Linux playground. The server is shellsim.js. */
(function(){"use strict";
var X=window.SHELL;if(!X)return;
var $=function(id){return document.getElementById(id)};
var log=$("lp-log"),inp=$("lp-in"),pr=$("lp-prompt"),list=$("lp-missions"),scr=$("lp-screen");if(!log||!inp)return;
var S=X.make(),done={},hidx=-1,draft="",KEY="ah_lp",open=null;
function ran(re){return S.ran.some(function(c){return re.test(c)})}
function file(p){return X.get(S,p)}
var M=[
{id:"look",t:"Read the note on your desk",d:"You are anna, the new admin of web01. The last admin left a note in your home folder. List the folder and read the note.",
 h:"ls shows what is there. cat prints a file.",s:["ls -l","cat notes.txt"],ok:function(){return ran(/^(cat|less|more|head|tail)\b.*notes\.txt/)},
 w:"Four problems are waiting. On a server you do not know, reading first and changing second is the whole trick."},
{id:"down",t:"Find the service that is down",d:"The shop does not answer. Ask systemd which service failed.",
 h:"systemctl --failed lists failed services. systemctl status NAME shows one of them with its last log lines.",s:["systemctl --failed","systemctl status nginx"],ok:function(){return ran(/systemctl (--failed|status nginx|list-units)/)},
 w:"nginx is failed, not stopped. The status output already carries the last log lines, and they name a file and a line number."},
{id:"why",t:"Find out why it will not start",d:"Do not restart it blindly. Let nginx test its own configuration and read what it says.",
 h:"nginx -t tests the configuration. It needs root, so put sudo in front.",s:["sudo nginx -t","cat /etc/nginx/sites-enabled/shop.conf"],ok:function(){return ran(/nginx -t/)||ran(/^sudo journalctl.*nginx/)||ran(/error\.log/)},
 w:"\"unknown directive sever_name\" in shop.conf line 3. A typo, made at 07:03 according to the log."},
{id:"fix",t:"Fix the typo and start the web server",d:"Correct the line in /etc/nginx/sites-enabled/shop.conf, test again, then start the service.",
 h:"There is no editor here. sed -i 's/old/new/' FILE changes text inside a file. Test with nginx -t before you restart.",s:["sudo sed -i 's/sever_name/server_name/' /etc/nginx/sites-enabled/shop.conf","sudo nginx -t","sudo systemctl restart nginx"],ok:function(){return !X.nginxTest(S)&&S.svc.nginx==="active"},
 w:"Test, then restart. On a live web server, a restart with a broken configuration takes down every site on it, a test costs nothing."},
{id:"prove",t:"Prove that it answers",d:"A green service is not the same as a working site. Fetch the page from the server itself.",
 h:"curl -I localhost asks for the headers only.",s:["curl -I localhost","ss -tlnp"],ok:function(){return S.svc.nginx==="active"&&ran(/^(curl|wget)\b.*(localhost|127\.0\.0\.1|web01|shop\.example\.org)/)},
 w:"HTTP 200. Always finish a repair by testing what the user does, not what you changed."},
{id:"full",t:"See which disk is full",d:"The note says /var is nearly full. Check all file systems.",
 h:"df -h shows size, used and free per file system, in readable units.",s:["df -h"],ok:function(){return ran(/^(sudo )?df\b/)},
 w:"/var is at 100 percent. Databases stop, logs stop and mail stops when that happens, long before anyone sees an error that mentions the disk."},
{id:"big",t:"Find what fills it",d:"Walk down from /var: which folder is the big one, and which file inside it?",
 h:"du -sh FOLDER/* gives one line per entry. Pipe it into sort -h to put the biggest last. Some folders need sudo.",s:["sudo du -sh /var/* | sort -h","sudo du -sh /var/log/* | sort -h","ls -lhS /var/log/app"],ok:function(){return ran(/du\b.*\/var\/log(\/app|\/\*)/)||ran(/ls\b.*-\w*[lS]\w*.*\/var\/log\/app/)||ran(/find\b.*-size/)},
 w:"One debug log of 16 GB. Somebody switched on debug logging for the queue worker and forgot it."},
{id:"free",t:"Free the space",d:"Get /var below 50 percent. Careful: the worker still has the log file open.",
 h:"If you delete a file that a running program holds open, the name is gone but the space is not: check with df again, and with sudo lsof +L1. Either empty the file with truncate -s 0, or restart the program that holds it (the service is called shop-worker).",s:["sudo truncate -s 0 /var/log/app/debug.log","df -h /var"],ok:function(){return X.varUse(S)/20e9<0.5},
 w:"This is the classic: rm on an open log frees nothing until the process lets go. truncate empties the file in place, and it works at once."},
{id:"knock",t:"Count who is knocking on SSH",d:"The auth log is full of failed logins. Produce a list: how many failed passwords per IP address, the worst first.",
 h:"grep the lines with \"Failed password\", cut out the address with awk '{print $(NF-3)}', then sort | uniq -c | sort -rn. The log needs sudo.",s:["sudo grep \"Failed password\" /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn"],ok:function(c){return /^\s*41\s+(from\s+)?203\.0\.113\.77\s*$/m.test(c.out)},
 w:"sort | uniq -c | sort -rn is the most useful pipeline in log reading. It turns any column into a ranking."},
{id:"ssh",t:"Close the door for root",d:"Root may log in over SSH with a password, and that is what the 41 attempts aim at. Set PermitRootLogin to no, test the configuration and reload the service.",
 h:"sed -i again, on /etc/ssh/sshd_config. Then sudo sshd -t, then sudo systemctl reload ssh. On a real server: keep your current session open and test a second login before you close it.",s:["sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config","sudo sshd -t","sudo systemctl reload ssh"],ok:function(){return /^\s*PermitRootLogin\s+no\s*$/m.test(S.sshApplied||"")},
 w:"The file alone changes nothing: the service reads it on reload. Turning off password logins altogether is the next step, once everybody has a key."},
{id:"odd",t:"Find the file that does not belong",d:"\"The uploads folder looks odd.\" Look for files in /srv/www/shop/uploads that are not pictures or documents, read what you find, and remove it.",
 h:"find /srv/www/shop/uploads -name '*.php' looks for scripts. ls -lt shows the newest first. cat it before you delete it.",s:["find /srv/www/shop/uploads -name '*.php'","cat /srv/www/shop/uploads/img_0412.php","sudo rm /srv/www/shop/uploads/img_0412.php"],ok:function(){return !file("/srv/www/shop/uploads/img_0412.php")&&!!file("/srv/www/shop/uploads")},
 w:"A one-line web shell, uploaded at 03:41: whoever calls it runs commands as the web server. In real life this is not a clean-up job but an incident: keep a copy, check the access log for who called it, and assume the passwords in config.php are known."},
{id:"perm",t:"Lock up the password file",d:"config.php holds the database password and everybody on the server may read and write it. Make it readable for owner and group only.",
 h:"ls -l shows the permissions. chmod 640 FILE: owner reads and writes, group reads, others nothing. The file belongs to deploy, so you need sudo.",s:["ls -l /srv/www/shop/config.php","sudo chmod 640 /srv/www/shop/config.php"],ok:function(){var n=file("/srv/www/shop/config.php");return !!n&&(n.mode&7)===0&&(n.mode&0o020)===0},
 w:"rw-rw-rw- on a file with a password is how the web shell would have got to the database. 640 with the web server's group is enough for the shop to read it."},
{id:"backup",t:"Make the backup script run",d:"Your own script in ~/scripts answers \"Permission denied\". Find out why, fix it, and run it.",
 h:"ls -l ~/scripts: the x is missing. chmod +x FILE adds it. Then call it with its path: ./scripts/backup.sh from your home folder.",s:["ls -l ~/scripts","chmod +x ~/scripts/backup.sh","~/scripts/backup.sh"],ok:function(){return !!file("/tmp/backup/shop")},
 w:"\"Permission denied\" on your own script nearly always means the execute bit. No sudo needed: it is your file."}
];
function line(text,cls){var d=document.createElement("div");d.className="lpl"+(cls?" "+cls:"");d.textContent=text;log.appendChild(d);return d}
function echoCmd(p,cmd){var d=document.createElement("div");d.className="lpl";var a=document.createElement("span");a.className="lpp";a.textContent=p+" ";var b=document.createElement("span");b.className="lpc";b.textContent=cmd;d.appendChild(a);d.appendChild(b);log.appendChild(d)}
function bottom(){scr.scrollTop=scr.scrollHeight}
function setPrompt(){pr.textContent=X.prompt(S)}
function save(){try{sessionStorage.setItem(KEY,JSON.stringify({h:S.hist,d:Object.keys(done)}))}catch(e){}}
function check(ctx,quiet){var news=[];M.forEach(function(m){if(done[m.id])return;var ok=false;try{ok=m.ok(ctx)}catch(e){}if(ok){done[m.id]=1;news.push(m)}});
  if(news.length){render();if(!quiet)news.forEach(function(m){line("✓ Mission done: "+m.t,"lpok");line("  "+m.w,"lpwhy")})}return news}
function exec(cmd,quiet){var p=X.prompt(S),r=X.run(S,cmd);
  if(!quiet){if(r.clear){log.textContent=""}else echoCmd(p,cmd);
    if(r.out)line(r.out.replace(/\n$/,""));if(r.err)line(r.err,"lperr")}
  var news=check({out:r.out||"",line:cmd},quiet);setPrompt();if(!quiet){if(news.length&&Object.keys(done).length===M.length){line("");line("All "+M.length+" missions done. web01 is in better shape than you found it. Keep playing, or reset and try it without the hints.","lpok")}bottom();save()}}
function render(){var n=Object.keys(done).length,first=null;M.forEach(function(m){if(!first&&!done[m.id])first=m.id});if(open===null||done[open])open=first;
  $("lp-count").textContent=n+" of "+M.length+" done";$("lp-bar").style.width=Math.round(n/M.length*100)+"%";
  list.textContent="";M.forEach(function(m,i){var li=document.createElement("li");li.className="lpm"+(done[m.id]?" isdone":"")+(m.id===open?" isopen":"");
    var b=document.createElement("button");b.type="button";b.className="lpmh";b.setAttribute("aria-expanded",m.id===open?"true":"false");
    var k=document.createElement("span");k.className="lpn";k.textContent=done[m.id]?"✓":String(i+1);var t=document.createElement("span");t.textContent=m.t;
    var sr=document.createElement("span");sr.className="sr";sr.textContent=done[m.id]?" (done)":"";b.appendChild(k);b.appendChild(t);b.appendChild(sr);
    b.addEventListener("click",function(){open=open===m.id?"":m.id;render();var nb=list.children[i].querySelector("button");if(nb)nb.focus()});li.appendChild(b);
    if(m.id===open){var body=document.createElement("div");body.className="lpmb";var p=document.createElement("p");p.textContent=m.d;body.appendChild(p);
      if(done[m.id]){var w=document.createElement("p");w.className="lpwhy2";w.textContent=m.w;body.appendChild(w)}
      var bar=document.createElement("div");bar.className="lpmbar";
      var hb=document.createElement("button");hb.type="button";hb.className="btn ghost";hb.textContent="Hint";var sb=document.createElement("button");sb.type="button";sb.className="btn ghost";sb.textContent="Show a solution";
      var box=document.createElement("div");box.setAttribute("aria-live","polite");
      hb.addEventListener("click",function(){box.textContent="";var q=document.createElement("p");q.className="lphint";q.textContent=m.h;box.appendChild(q)});
      sb.addEventListener("click",function(){box.textContent="";var q=document.createElement("p");q.className="lphint";q.textContent="One way to do it. Click a line to put it into the terminal:";box.appendChild(q);
        m.s.forEach(function(c){var cb=document.createElement("button");cb.type="button";cb.className="lpsol";cb.textContent=c;cb.addEventListener("click",function(){inp.value=c;inp.focus()});box.appendChild(cb)})});
      bar.appendChild(hb);bar.appendChild(sb);body.appendChild(bar);body.appendChild(box);li.appendChild(body)}
    list.appendChild(li)})}
function welcome(){line("Debian GNU/Linux 13 web01 tty1");line("");line("Last login: Tue Oct  6 08:02:11 2026 from 10.87.20.14");line("This server is pretend and lives in this browser tab. Break it as you like, Reset brings it back.","lpwhy");line("Type help for the commands, or start with mission 1: ls","lpwhy");line("")}
function reset(){S=X.make();done={};open=null;hidx=-1;log.textContent="";welcome();setPrompt();render();try{sessionStorage.removeItem(KEY)}catch(e){}inp.value="";}
function complete(){var r=X.complete(S,inp.value);if(r.list.length){echoCmd(X.prompt(S),inp.value);line(r.list.join("  "),"lpdim");bottom()}inp.value=r.line}
function hist(dir){var h=S.hist;if(!h.length)return;if(hidx===-1){if(dir>0)return;draft=inp.value;hidx=h.length}hidx+=dir;if(hidx>=h.length){hidx=-1;inp.value=draft;return}if(hidx<0)hidx=0;inp.value=h[hidx];
  setTimeout(function(){try{inp.setSelectionRange(inp.value.length,inp.value.length)}catch(e){}},0)}
function submit(){var v=inp.value;inp.value="";hidx=-1;if(!v.trim()){echoCmd(X.prompt(S),"");bottom();return}exec(v,false)}
inp.addEventListener("keydown",function(e){
  if(e.key==="Enter"){e.preventDefault();submit()}
  else if(e.key==="Tab"&&!e.shiftKey&&!e.altKey&&!e.ctrlKey&&inp.value.trim()!==""){e.preventDefault();complete()}
  else if(e.key==="ArrowUp"){e.preventDefault();hist(-1)}else if(e.key==="ArrowDown"){e.preventDefault();hist(1)}
  else if(e.key==="l"&&e.ctrlKey){e.preventDefault();log.textContent=""}
  else if(e.key==="c"&&e.ctrlKey&&inp.selectionStart===inp.selectionEnd){e.preventDefault();echoCmd(X.prompt(S),inp.value+"^C");inp.value="";bottom()}
  else if(e.key==="Escape"){inp.blur()}});
scr.addEventListener("click",function(){var sel=window.getSelection&&String(window.getSelection());if(!sel)inp.focus({preventScroll:true})});
$("lp-tab").addEventListener("click",function(){complete();inp.focus()});$("lp-up").addEventListener("click",function(){hist(-1);inp.focus()});
$("lp-run").addEventListener("click",function(){submit();inp.focus()});
$("lp-reset").addEventListener("click",function(){reset();inp.focus()});
/* come back after a reload: replay what was typed */
welcome();
try{var st=JSON.parse(sessionStorage.getItem(KEY)||"null");if(st&&st.h&&st.h.length&&st.h.length<400){st.h.forEach(function(c){exec(c,true)});(st.d||[]).forEach(function(id){if(M.some(function(m){return m.id===id}))done[id]=1});
  line("(You were here before in this tab: "+st.h.length+" commands replayed, the server is as you left it.)","lpdim");line("")}}catch(e){}
setPrompt();render();
window.lpTest={run:function(c){exec(c,false)},done:function(){return Object.keys(done)},missions:M.map(function(m){return{id:m.id,s:m.s}})};
})();
