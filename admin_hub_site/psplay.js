/* Terminal and missions for the PowerShell playground. The pretend session is pssim.js. */
(function(){"use strict";
var X=window.PSSIM;if(!X)return;
var $=function(id){return document.getElementById(id)};
var log=$("lp-log"),inp=$("lp-in"),pr=$("lp-prompt"),list=$("lp-missions"),scr=$("lp-screen");if(!log||!inp)return;
var S=X.make(),done={},hidx=-1,draft="",KEY="ah_ps",open=null,DAY=864e5;
/* helpers for the checks: they look at the objects a command produced, and at the state of FS01 */
function pv(o,n){if(o===null||typeof o!=="object"||o instanceof Date)return null;var l=n.toLowerCase(),k;for(k in o)if(Object.prototype.hasOwnProperty.call(o,k)&&k.toLowerCase()===l)return o[k];return null}
function ran(c,name){return c.cmds.indexOf(name)>=0}
function names(objs,keys){return objs.map(function(o){var k,v;for(k=0;k<keys.length;k++){v=pv(o,keys[k]);if(v!==null)return String(v).toLowerCase()}return typeof o==="string"?o.toLowerCase():""})}
function same(a,b){a=a.slice().sort();b=b.slice().sort();return a.length===b.length&&a.every(function(x,i){return x===b[i]})}
function files(n,out){Object.keys(n.d).forEach(function(k){var c=n.d[k];if(c.d)files(c,out);else out.push({name:k.toLowerCase(),s:c.s,m:c.m})});return out}
function share(){return S.fs.C.d.Shares.d.Projects}
function csvs(n,out){Object.keys(n.d).forEach(function(k){var c=n.d[k];if(c.d)csvs(c,out);else if(/\.csv$/i.test(k)&&c.sel)out.push(c)});return out}
function user(sam){return S.ad.filter(function(u){return u.SamAccountName===sam})[0]}
var M=[
{id:"find",t:"Find the cmdlet for the job",d:"You are anna, the new admin of the file server FS01. Printing is broken, so you need something that deals with services. Every cmdlet is named Verb-Noun. Search the cmdlets for the word service, then read the help of the one that looks right.",
 h:"Get-Command *service* lists every cmdlet with service in its name. Get-Help NAME -Examples shows how to use one.",s:["Get-Command *service*","Get-Help Get-Service -Examples"],
 ok:function(c){return ran(c,"get-command")&&c.objs.some(function(o){return pv(o,"Name")==="Get-Service"})||ran(c,"get-help")&&/NAME\s+\S+-\S+/.test(c.out)},
 w:"You do not have to know cmdlet names by heart. Get-Command finds them and Get-Help explains them, on every Windows machine, without a browser."},
{id:"services",t:"List the services",d:"List all services of FS01 and look for the print spooler in the table.",
 h:"Get-Service without anything lists them all. The short name is gsv.",s:["Get-Service"],
 ok:function(c){var L=c.objs.filter(function(o){return pv(o,"Status")!==null&&pv(o,"Name")!==null});return L.length>=10&&names(L,["Name"]).indexOf("spooler")>=0},
 w:"Spooler is Stopped. What you see is a table, but what came down the pipeline are twenty objects, and the table shows only three of their properties."},
{id:"filter",t:"Filter: stopped, but set to start",d:"A stopped service is only a problem if it should be running. Show the services that are Stopped although their StartType is Automatic.",
 h:"Pipe Get-Service into Where-Object. Inside the braces, $_ is the service that is being tested: $_.Status -eq 'Stopped' -and $_.StartType -eq 'Automatic'.",s:["Get-Service | Where-Object { $_.Status -eq 'Stopped' -and $_.StartType -eq 'Automatic' }"],
 ok:function(c){var want=S.svc.filter(function(s){return s.Status==="Stopped"&&s.StartType==="Automatic"}).map(function(s){return s.Name.toLowerCase()}),got=names(c.objs,["Name","ServiceName"]);
   return ran(c,"where-object")&&(want.length?same(want,got):ran(c,"get-service")&&!c.objs.length)},
 w:"Two services should run and do not: the print spooler and the backup agent. StartType is not in the default table, but you can filter on any property the object has."},
{id:"spooler",t:"Start the print spooler",d:"Start the Spooler service, then ask for it again to see that it really runs.",
 h:"Start-Service -Name Spooler. It prints nothing when it works. Check with Get-Service Spooler.",s:["Start-Service -Name Spooler","Get-Service -Name Spooler"],
 ok:function(c){return S.svc.some(function(s){return s.Name==="Spooler"&&s.Status==="Running"})&&c.objs.some(function(o){return pv(o,"Name")==="Spooler"&&pv(o,"Status")==="Running"})},
 w:"No output means no error. Changing a service needs an elevated session, this one is. The other stopped service, FSBackup, will not start: the System log says why."},
{id:"member",t:"Look inside an object",d:"The table hides most of what an object knows. Ask a service object, or a process object, what properties it has.",
 h:"Pipe anything into Get-Member: Get-Service | Get-Member. The short name is gm.",s:["Get-Service | Get-Member"],
 ok:function(c){return c.objs.some(function(o){return pv(o,"MemberType")!==null&&pv(o,"Definition")!==null})},
 w:"Get-Member is the map. Every name in the Property rows can be used in Where-Object, Sort-Object and Select-Object."},
{id:"top",t:"Top five processes by memory",d:"FS01 gets slow in the afternoon. Show the five processes that use the most memory, the biggest first.",
 h:"The memory is in the property WorkingSet (short: WS), in bytes. Sort-Object WorkingSet -Descending puts the biggest first, Select-Object -First 5 keeps five.",s:["Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5"],
 ok:function(c){var top=S.proc.slice().sort(function(a,b){return b.WorkingSet-a.WorkingSet}).slice(0,5).map(function(p){return p.ProcessName.toLowerCase()});return c.objs.length===5&&same(top,names(c.objs,["ProcessName","Name"]))},
 w:"ReportBuilder holds nearly 4 GB and has been running since 14 September. The pattern get, sort, select the first few answers most \"what is the biggest\" questions."},
{id:"measure",t:"Add up a folder",d:"Drive C is nearly full. How many bytes do all files below C:\\Shares\\Projects take together?",
 h:"Get-ChildItem C:\\Shares\\Projects -Recurse -File gives every file below the folder. Measure-Object -Property Length -Sum adds up their sizes.",s:["Get-ChildItem C:\\Shares\\Projects -Recurse -File | Measure-Object -Property Length -Sum"],
 ok:function(c){var tot=X.treeSize(share());return c.objs.some(function(o){var s=pv(o,"Sum");return s===tot||typeof o==="number"&&(o===tot||Math.abs(o-tot/1073741824)<0.01||Math.abs(o-tot/1048576)<1)})},
 w:"About 21 GB in sixteen files. Divide by 1GB to read it: PowerShell knows KB, MB and GB as numbers."},
{id:"files",t:"Find the big and the old files",d:"Find the files below C:\\Shares\\Projects that are larger than 500 MB or were last changed more than a year ago.",
 h:"Where-Object again, on Length and LastWriteTime: $_.Length -gt 500MB -or $_.LastWriteTime -lt (Get-Date).AddDays(-365). Showing only the big ones, or only the old ones, counts as well.",
 s:["Get-ChildItem C:\\Shares\\Projects -Recurse -File | Where-Object { $_.Length -gt 500MB -or $_.LastWriteTime -lt (Get-Date).AddDays(-365) } | Sort-Object Length -Descending | Select-Object Name,Length,LastWriteTime"],
 ok:function(c){var all=files(share(),[]),lim=X.now-365*DAY,big=[],old=[],both=[],got=names(c.objs,["Name"]);all.forEach(function(f){var b=f.s>524288000,o=f.m.getTime()<lim;if(b)big.push(f.name);if(o)old.push(f.name);if(b||o)both.push(f.name)});
   return got.length>0&&(same(got,both)||same(got,big)||same(got,old))},
 w:"One old virtual disk of 12.5 GB is more than half of the share. Dates and sizes are compared as dates and numbers here, not as text, which is the point of the object pipeline."},
{id:"logons",t:"Count failed logons per account",d:"Event 4625 in the Security log is a failed logon. Count them per account, the worst first. In this playground the account is the property TargetUserName.",
 h:"Get-WinEvent -FilterHashtable @{LogName='Security';Id=4625} gets the events. Group-Object TargetUserName counts them per account, Sort-Object Count -Descending ranks them.",
 s:["Get-WinEvent -FilterHashtable @{LogName='Security';Id=4625} | Group-Object TargetUserName | Sort-Object Count -Descending"],
 ok:function(c){return c.objs.some(function(o){return pv(o,"Count")===38&&/svc_backup/i.test(String(pv(o,"Name")))})},
 w:"38 of the 49 failures hit svc_backup. Group the same events by IpAddress and they all come from 203.0.113.45. Group-Object then Sort-Object Count is the PowerShell way of ranking anything."},
{id:"stale",t:"Find accounts nobody uses",d:"HR wants the users who have not logged on for 90 days. Ask Active Directory for the users with their LastLogonDate and keep the old ones.",
 h:"Get-ADUser only brings a few properties. Ask for more with -Properties LastLogonDate, or the property is empty and the comparison is true for everybody. Then: Where-Object { $_.LastLogonDate -lt (Get-Date).AddDays(-90) }.",
 s:["$cutoff = (Get-Date).AddDays(-90)","Get-ADUser -Filter * -Properties LastLogonDate | Where-Object { $_.LastLogonDate -lt $cutoff } | Select-Object Name,SamAccountName,Enabled,LastLogonDate"],
 ok:function(c){var lim=X.now-90*DAY,st=S.ad.filter(function(u){return u.LastLogonDate.getTime()<lim}),a=st.map(function(u){return u.SamAccountName.toLowerCase()}),b=st.filter(function(u){return u.Enabled}).map(function(u){return u.SamAccountName.toLowerCase()}),
     got=c.objs.map(function(o){var s=pv(o,"SamAccountName"),n=pv(o,"Name"),u;if(s!==null)return String(s).toLowerCase();u=S.ad.filter(function(x){return x.Name===n})[0];return u?u.SamAccountName.toLowerCase():""});
   return got.length>0&&(same(got,a)||same(got,b))},
 w:"Four accounts. One is on parental leave and one is a leaver, so a list like this is a question for HR, not a delete job."},
{id:"leaver",t:"Disable the account of a leaver",d:"Dirk Osten left the company in March and his account d.osten is still enabled. Disable it, then read the account again to see that Enabled is False.",
 h:"Disable-ADAccount -Identity d.osten. Try it with -WhatIf first if you like. Then Get-ADUser -Identity d.osten.",s:["Disable-ADAccount -Identity d.osten","Get-ADUser -Identity d.osten"],
 ok:function(c){var u=user("d.osten");return !!u&&!u.Enabled&&c.objs.some(function(o){var e=pv(o,"Enabled");return(pv(o,"SamAccountName")==="d.osten"||pv(o,"Name")==="Dirk Osten")&&(e===false||e==="False")})},
 w:"Disable first, delete months later: a disabled account keeps its group memberships and mailbox in case somebody needs them. -WhatIf shows what a command would do without doing it."},
{id:"report",t:"Export a report as CSV",d:"Write a user report for HR into a CSV file: pick a few columns with Select-Object, for example Name, SamAccountName, Enabled and LastLogonDate, and export them.",
 h:"Put Select-Object before Export-Csv, or the file gets every property. -NoTypeInformation leaves out a first line that only PowerShell wants. Read the file back with Get-Content or Import-Csv.",
 s:["Get-ADUser -Filter * -Properties LastLogonDate,Department | Select-Object Name,SamAccountName,Department,Enabled,LastLogonDate | Export-Csv -Path users.csv -NoTypeInformation","Get-Content users.csv"],
 ok:function(){return csvs(S.fs.C,csvs(S.fs.D,[])).some(function(f){var L=(f.x||"").split(/\r?\n/).filter(function(x){return x!==""&&x.indexOf("#TYPE")!==0});return L.length>=2&&L[0].split(",").length>=2})},
 w:"Objects in, a file out that Excel opens. Select-Object decides the columns, and Import-Csv turns the file back into objects, with every value as text."}
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
    if(r.out){line(r.out.replace(/\n$/,""));if(/\n$/.test(r.out))line("")}if(r.err)line(r.err,"lperr")}
  var news=check({out:r.out||"",err:r.err||"",line:cmd,objs:r.objs||[],cmds:r.cmds||[]},quiet);setPrompt();if(!quiet){if(news.length&&Object.keys(done).length===M.length){line("");line("All "+M.length+" missions done. FS01 is in better shape than you found it. Keep playing, or reset and try it without the hints.","lpok")}bottom();save()}}
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
function welcome(){line("Windows PowerShell 5.1 on FS01 (pretend)");line("");line("This session is pretend and lives in this browser tab. Break things as you like, Reset brings them back.","lpwhy");
  line("It runs elevated, as if started with Run as administrator, so Stop-Service and Disable-ADAccount work.","lpwhy");line("Type Get-Help for a short introduction, or start with mission 1: Get-Command *service*","lpwhy");line("")}
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
  line("(You were here before in this tab: "+st.h.length+" commands replayed, FS01 is as you left it.)","lpdim");line("")}}catch(e){}
setPrompt();render();
window.psTest={run:function(c){exec(c,false)},done:function(){return Object.keys(done)},missions:M.map(function(m){return{id:m.id,s:m.s}})};
})();
