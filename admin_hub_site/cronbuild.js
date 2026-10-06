(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
var MON=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"],DOW=["sun","mon","tue","wed","thu","fri","sat"],DOWN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],MONN=["January","February","March","April","May","June","July","August","September","October","November","December"];
var MACRO={"@yearly":"0 0 1 1 *","@annually":"0 0 1 1 *","@monthly":"0 0 1 * *","@weekly":"0 0 * * 0","@daily":"0 0 * * *","@midnight":"0 0 * * *","@hourly":"0 * * * *"};
function field(s,min,max,names,what){var set={},any=s==="*"||s==="?";
  s.split(",").forEach(function(part){if(part==="")throw new Error("the "+what+" field has an empty entry between commas");
    var m=/^(\*|[a-z0-9]+(?:-[a-z0-9]+)?)(?:\/(\d+))?$/i.exec(part);if(!m)throw new Error("the "+what+" field has \""+part+"\", which is not a number, a range like 1-5, a list or a step like */15");
    var step=m[2]?+m[2]:1,a,b;if(step<1)throw new Error("a step of 0 in the "+what+" field never moves on");
    function val(x){var i=names?names.indexOf(x.toLowerCase().slice(0,3)):-1;if(i>=0&&isNaN(+x))return i+(names===MON?1:0);if(!/^\d+$/.test(x))throw new Error("\""+x+"\" in the "+what+" field is not a number"+(names?" or a name":""));return +x}
    if(m[1]==="*"||m[1]==="?"){a=min;b=max}else{var r=m[1].split("-");a=val(r[0]);b=r.length>1?val(r[1]):(m[2]?max:a)}
    if(what==="day of week"){if(a===7)a=0;if(b===7)b=r&&r.length>1?6:0;if(m[1]==="0-7"||m[1]==="1-7"){a=0;b=6}}
    if(a<min||a>max||b<min||b>max)throw new Error("the "+what+" field allows "+min+" to "+max+(what==="day of week"?" (0 and 7 are both Sunday)":"")+", found \""+part+"\"");
    if(a>b)throw new Error("the range \""+part+"\" in the "+what+" field runs backwards");
    for(var v=a;v<=b;v+=step)set[v]=1});
  var list=Object.keys(set).map(Number).sort(function(x,y){return x-y});return{any:any,list:list,has:set,raw:s}}
function parse(expr){var e=expr.trim().replace(/\s+/g," ");if(MACRO[e.toLowerCase()])e=MACRO[e.toLowerCase()];
  if(e.toLowerCase()==="@reboot")throw new Error("@reboot runs once when the cron service starts. It has no schedule to explain");
  var p=e.split(" ");if(p.length===6)throw new Error("this has six fields. Plain cron has five: minute, hour, day of month, month, day of week. Six-field forms with seconds or a year belong to Quartz, Spring or AWS, which this page does not read");
  if(p.length!==5)throw new Error("cron needs five fields separated by spaces: minute, hour, day of month, month, day of week. This has "+p.length);
  return{min:field(p[0],0,59,null,"minute"),hour:field(p[1],0,23,null,"hour"),dom:field(p[2],1,31,null,"day of month"),mon:field(p[3],1,12,MON,"month"),dow:field(p[4],0,6,DOW,"day of week"),text:e}}
function matches(c,d){if(!c.min.has[d.getMinutes()]||!c.hour.has[d.getHours()]||!c.mon.has[d.getMonth()+1])return false;
  var dm=c.dom.has[d.getDate()],dw=c.dow.has[d.getDay()];
  if(c.dom.any&&c.dow.any)return true;if(c.dom.any)return !!dw;if(c.dow.any)return !!dm;return !!(dm||dw)}
function next(c,from,n){var out=[],d=new Date(from.getTime());d.setSeconds(0,0);d.setMinutes(d.getMinutes()+1);var guard=0;
  while(out.length<n&&guard<600000){
    if(!c.mon.has[d.getMonth()+1]){d.setMonth(d.getMonth()+1,1);d.setHours(0,0,0,0);guard++;continue}
    if(!c.hour.has[d.getHours()]){d.setHours(d.getHours()+1,0,0,0);guard++;continue}
    if(matches(c,d))out.push(new Date(d.getTime()));d.setMinutes(d.getMinutes()+1);guard++}
  return out}
function two(n){return (n<10?"0":"")+n}
function joinAnd(a){return a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1]}
function stepOf(f,min,max){if(f.list.length<3)return 0;var s=f.list[1]-f.list[0];if(s<2)return 0;for(var i=2;i<f.list.length;i++)if(f.list[i]-f.list[i-1]!==s)return 0;return f.list[0]===min&&f.list[f.list.length-1]+s>max?s:0}
function ranges(list,names){var o=[],i=0;while(i<list.length){var j=i;while(j+1<list.length&&list[j+1]===list[j]+1)j++;o.push(j-i>=2?names(list[i])+" to "+names(list[j]):list.slice(i,j+1).map(names).join(", "));i=j+1}return joinAnd(o.join(", ").split(", "))}
function explain(c){var t,ms=stepOf(c.min,0,59),hs=stepOf(c.hour,0,23);
  if(c.min.any&&c.hour.any)t="Every minute";
  else if(ms&&c.hour.any)t="Every "+ms+" minutes";
  else if(c.min.list.length===1&&c.hour.any)t=c.min.list[0]===0?"Every hour, on the hour":"Every hour, at "+c.min.list[0]+" minutes past";
  else if(c.min.list.length===1&&hs)t="Every "+hs+" hours, at "+two(c.hour.list[0])+":"+two(c.min.list[0])+", "+two(c.hour.list[1])+":"+two(c.min.list[0])+" and so on";
  else if(c.hour.any&&c.min.list.length<=4)t="At "+joinAnd(c.min.list.map(String))+" minutes past every hour";
  else if(c.min.list.length===1&&c.hour.list.length>2&&c.hour.list[c.hour.list.length-1]-c.hour.list[0]===c.hour.list.length-1)t="Every hour from "+two(c.hour.list[0])+":"+two(c.min.list[0])+" to "+two(c.hour.list[c.hour.list.length-1])+":"+two(c.min.list[0]);
  else if(c.min.list.length===1&&c.hour.list.length<=6)t="At "+joinAnd(c.hour.list.map(function(h){return two(h)+":"+two(c.min.list[0])}));
  else if(ms&&!c.hour.any)t="Every "+ms+" minutes, during the hours that start at "+ranges(c.hour.list,function(h){return two(h)+":00"});
  else if(c.min.any)t="Every minute during the hours that start at "+ranges(c.hour.list,function(h){return two(h)+":00"});
  else t="At minute "+ranges(c.min.list,String)+" of hour "+ranges(c.hour.list,function(h){return two(h)});
  var days=[];
  if(!c.dow.any)days.push("on "+ranges(c.dow.list,function(d){return DOWN[d]}));
  if(!c.dom.any)days.push("on day "+ranges(c.dom.list,String)+" of the month");
  if(days.length===2)t+=", "+days[1]+" and also "+days[0];else if(days.length)t+=", "+days[0];else if(!c.hour.any&&c.mon.any)t+=", every day";
  if(!c.mon.any)t+=", in "+ranges(c.mon.list,function(m){return MONN[m-1]});
  return t+"."}
function onCalendar(c){var d="";if(!c.dow.any){var l=c.dow.list,o=[],i=0;while(i<l.length){var j=i;while(j+1<l.length&&l[j+1]===l[j]+1)j++;var n=function(x){return DOWN[x].slice(0,3)};o.push(j>i?n(l[i])+".."+n(l[j]):n(l[i]));i=j+1}d=o.join(",")+" "}
  function f(x,min,max){if(x.any)return "*";var s=stepOf(x,min,max);if(s)return (x.list[0])+"/"+s;var o=[],i=0,l=x.list;while(i<l.length){var j=i;while(j+1<l.length&&l[j+1]===l[j]+1)j++;o.push(j-i>=2?two(l[i])+".."+two(l[j]):l.slice(i,j+1).map(two).join(","));i=j+1}return o.join(",")}
  return d+"*-"+f(c.mon,1,12)+"-"+f(c.dom,1,31)+" "+f(c.hour,0,23)+":"+f(c.min,0,59)+":00"}
function schtasks(c,name,cmd){var m=c.min,h=c.hour,ms=stepOf(m,0,59),hs=stepOf(h,0,23),base='schtasks /Create /TN "'+name+'" /TR "'+cmd.replace(/"/g,'\\"')+'" /RU SYSTEM ';
  if(!c.mon.any)return null;
  if(ms&&h.any&&c.dom.any&&c.dow.any)return base+"/SC MINUTE /MO "+ms;
  if(m.list.length===1&&h.any&&c.dom.any&&c.dow.any)return base+"/SC HOURLY /MO 1 /ST 00:"+two(m.list[0]);
  if(m.list.length===1&&hs&&c.dom.any&&c.dow.any)return base+"/SC HOURLY /MO "+hs+" /ST "+two(h.list[0])+":"+two(m.list[0]);
  if(m.list.length!==1||h.list.length!==1)return null;var st="/ST "+two(h.list[0])+":"+two(m.list[0]);
  if(c.dom.any&&c.dow.any)return base+"/SC DAILY "+st;
  if(c.dom.any)return base+"/SC WEEKLY /D "+c.dow.list.map(function(d){return DOWN[d].slice(0,3).toUpperCase()}).join(",")+" "+st;
  if(c.dow.any&&c.dom.list.length===1)return base+"/SC MONTHLY /D "+c.dom.list[0]+" "+st;
  return null}
window.cronBuild={parse:parse,next:next,explain:explain,onCalendar:onCalendar,schtasks:schtasks};
if(!$("cn-expr"))return;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
function block(title,text,note){var w=el("div","csrow"),hd=el("div","cshd");hd.append(el("b",null,title));var b=el("button","btn ghost","Copy");b.type="button";b.addEventListener("click",function(){(navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy"},1400)},function(){b.textContent="Select and copy by hand"})});hd.append(b);w.append(hd,el("pre",null,text));if(note)w.append(el("p","dim crnote2",note));return w}
function render(){var out=$("cn-out"),expr=$("cn-expr").value,cmd=$("cn-cmd").value.trim()||"/usr/local/bin/backup.sh",name=($("cn-name").value.trim()||"backup").replace(/[^A-Za-z0-9_.-]/g,"-"),c;out.replaceChildren();
  try{c=parse(expr)}catch(e){var p=el("p","sqerr");p.append(el("b",null,"That is not a schedule cron understands. "),document.createTextNode(e.message.charAt(0).toUpperCase()+e.message.slice(1)+"."));out.append(p);return}
  out.append(el("p","cnsay",explain(c)));
  var runs=next(c,new Date(),5),ul=el("ol","cnnext");
  if(!runs.length)out.append(el("p","sqwarn","This never runs: the day and month it asks for do not exist together, such as 31 February."));
  runs.forEach(function(d){ul.append(el("li",null,DOWN[d.getDay()]+", "+d.getDate()+" "+MONN[d.getMonth()]+" "+d.getFullYear()+", "+two(d.getHours())+":"+two(d.getMinutes())))});
  if(runs.length){out.append(el("h2",null,"the next runs"),el("p","dim","In the time zone of this computer. Cron uses the time zone of the server."),ul)}
  var warn=[];
  if(!c.dom.any&&!c.dow.any)warn.push("Both a day of the month and a day of the week are set. Cron runs the job when either one matches, not when both do. \"0 9 13 * 5\" is every Friday and every 13th, not Friday the 13th. systemd reads the same two fields as \"both must match\", so the timer below does not mean the same thing.");
  if(c.dom.list.some(function(d){return d>28})&&!c.dom.any)warn.push("Day "+c.dom.list.filter(function(d){return d>28}).join(", ")+" does not exist in every month. In shorter months the job is skipped. For \"the last day of the month\", run it on the 1st at 00:00 instead, or use a systemd timer with OnCalendar=*-*~1.");
  if(c.min.any&&!c.hour.any)warn.push("The minute field is a star, so this runs sixty times in each of those hours. If you meant once, put 0 in the minute field.");
  if(runs.length>1&&c.hour.list.some(function(h){return h===2})&&c.min.list.length<=2)warn.push("Jobs between 02:00 and 03:00 are skipped or run twice on the nights the clocks change, on servers that use local time. 01:30 or 03:30 avoids it.");
  warn.forEach(function(w){out.append(el("p","sqwarn",w))});
  out.append(el("h2",null,"as a cron job"));
  out.append(block("Line for crontab -e",c.text+" "+cmd+" >> /var/log/"+name+".log 2>&1","Cron runs with a nearly empty environment and a short PATH. Use full paths in the command, and send the output somewhere, or errors vanish."));
  out.append(block("File in /etc/cron.d/"+name,"# m h dom mon dow user command\n"+c.text+" root "+cmd+" >> /var/log/"+name+".log 2>&1","Files in /etc/cron.d need the user name as a sixth field, and a name without dots."));
  out.append(el("h2",null,"as a systemd timer"));
  out.append(block("/etc/systemd/system/"+name+".service","[Unit]\nDescription="+name+"\n\n[Service]\nType=oneshot\nExecStart="+cmd));
  out.append(block("/etc/systemd/system/"+name+".timer","[Unit]\nDescription=Run "+name+" on a schedule\n\n[Timer]\nOnCalendar="+onCalendar(c)+"\nPersistent=true\nRandomizedDelaySec=60\n\n[Install]\nWantedBy=timers.target","Persistent=true runs a missed job after the machine was off, which cron does not do. Output goes to the journal: journalctl -u "+name+"."));
  out.append(block("Switch it on and check","sudo systemctl daemon-reload\nsudo systemctl enable --now "+name+".timer\nsystemctl list-timers "+name+".timer\nsystemd-analyze calendar \""+onCalendar(c)+"\""));
  out.append(el("h2",null,"on Windows"));var st=schtasks(c,name,cmd);
  if(st)out.append(block("Task Scheduler, from an elevated prompt",st.replace(cmd,/^\//.test(cmd)?"C:\\Scripts\\"+name+".cmd":cmd),"Runs as SYSTEM, whether or not someone is signed in. Check the result in Task Scheduler, on the History tab of the task."));
  else out.append(el("p","dim","This schedule has no single schtasks line. Create the task in Task Scheduler with several triggers, or split it into two simpler schedules."));
  try{history.replaceState(null,"","#"+encodeURIComponent(c.text))}catch(e){}}
document.querySelectorAll("[data-cron]").forEach(function(b){b.addEventListener("click",function(){$("cn-expr").value=b.getAttribute("data-cron");render()})});
["cn-expr","cn-cmd","cn-name"].forEach(function(i){$(i).addEventListener("input",render)});
if(location.hash.length>1){try{$("cn-expr").value=decodeURIComponent(location.hash.slice(1))}catch(e){}}
render();
})();
