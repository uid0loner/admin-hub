(function(){
var inp=document.getElementById("cmd"),out=document.getElementById("tout");if(!inp)return;
var H=[],hi=0,SEC={"tools":"tools.html","cheat-sheets":"cheat-sheets.html","checklists":"checklists.html","glossary":"glossary.html","explainers":"explainers.html","news":"news.html","cve":"cve.html","admin-links":"admin-links.html","start-here":"start-here.html"};
function say(t,c){var p=document.createElement("p");p.textContent=t;if(c)p.className=c;out.append(p);out.scrollTop=out.scrollHeight}
function go(u){setTimeout(function(){location.href=u},350)}
function matrix(){if(matchMedia("(prefers-reduced-motion: reduce)").matches){say("Reduced motion is on. Skipping the animation.");return}
var c=document.createElement("canvas");c.setAttribute("aria-hidden","true");c.style.cssText="position:fixed;inset:0;z-index:50;pointer-events:none;transition:opacity .6s";document.body.append(c);
var x=c.getContext("2d"),fs=16;c.width=innerWidth;c.height=innerHeight;var n=Math.ceil(c.width/fs),y=[];for(var i=0;i<n;i++)y.push(0);
var ch="01<>/{}$#ｱｲｳｴｵｶｷｸｹｺ";
var t=setInterval(function(){x.fillStyle="rgba(7,5,26,.12)";x.fillRect(0,0,c.width,c.height);x.fillStyle="#b45cff";x.font=fs+"px monospace";
for(var j=0;j<n;j++){x.fillText(ch[Math.floor(Math.random()*ch.length)],j*fs,y[j]*fs);y[j]=y[j]*fs>c.height&&Math.random()>.975?0:y[j]+1}},50);
setTimeout(function(){c.style.opacity="0"},5400);setTimeout(function(){clearInterval(t);c.remove()},6000)}
function answer(v){
  var A=window.siteAnswers?window.siteAnswers(v):[];
  if(!A.length)return false;
  A.slice(0,3).forEach(function(a){
    say("["+a.k+"] "+a.t,"echo");
    (a.rows||[]).forEach(function(r){say("  "+r[0]+": "+r[1])});
    if(a.text)say("  "+a.text);
    if(a.href)say("  more: open "+a.href.replace(/\.html.*$/,""));
  });
  return true;
}
var C={help:function(){say("commands: help, ls, tools, open <name>, search <text>, scan <domain>, map, sim, cockpit, crt, whoami, matrix, clear");say("or just type a value: an IP or CIDR, a domain, an error code, a port, a timestamp, a JWT, uuid, pw 24")},
tools:function(){say("log-reader  smart-reader  certificate-decoder  firewall-rule-reviewer  linux-server-slow  windows-pc-slow  stop-code-lookup  diagnose  command-builder  raid-calculator  backup-planner  ip-plan-builder  small-office-blueprint  subnet-calculator  signin-analyzer  ca-analyzer  phish-analyzer  domain-check  attack-map  incident-sim");say("all of them: open tools");say("open one with: open <name>")},
scan:function(a){a=(a||"").trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/.*$/,"");if(!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(a)){say("usage: scan <domain>, for example: scan example.com");return}say("checking "+a+" ...");go("domain-check.html#d="+a)},
cockpit:function(){say("opening your cockpit ...");go("cockpit.html")},
map:function(){say("opening the attack map ...");go("attack-map.html")},
sim:function(){say("opening the incident simulator ...");go("incident-sim.html")},
crt:function(){var onNow=document.documentElement.classList.toggle("crt");try{if(onNow)localStorage.setItem("ah_crt","1");else localStorage.removeItem("ah_crt")}catch(e){}say(onNow?"CRT mode on. Type crt again to switch it off.":"CRT mode off.")},
ls:function(){say(Object.keys(SEC).join("  "))},
help2:null,
whoami:function(){say("IT admin and security nerd. Building tools for people who run Microsoft 365 and Entra ID.")},
sudo:function(){say("nice try. this incident will be reported.")},
clear:function(){out.replaceChildren()},matrix:matrix,
open:function(a){if(!a){say("usage: open <name>, for example: open cidr");return}
if(SEC[a]){go(SEC[a]);return}if(/^[a-z0-9-]+$/.test(a)&&(window.SITE_INDEX||[]).some(function(e){return e[1]===a+".html"})){say("opening "+a+" ...");go(a+".html");return}var r=window.siteSearch?window.siteSearch(a,1):[];if(r.length){say("opening "+r[0][0]+" ...");go(r[0][1])}else say("nothing found for "+a)},
search:function(a){if(window.openPalette)window.openPalette(a||"");else say("search is not available")}};
inp.addEventListener("keydown",function(e){
if(e.key==="Enter"){var v=inp.value.trim();inp.value="";if(!v)return;H.push(v);hi=H.length;say("$ "+v,"echo");
var p=v.split(/\s+/),c=p.shift().toLowerCase(),f=C.hasOwnProperty(c)?C[c]:null;if(f)f(p.join(" "));else if(!answer(v))say("command not found: "+c+". type help")}
else if(e.key==="ArrowUp"){if(hi>0){hi--;inp.value=H[hi];e.preventDefault()}}
else if(e.key==="ArrowDown"){if(hi<H.length){hi++;inp.value=H[hi]||"";e.preventDefault()}}});
say("Paste an error code, an IP address, a domain, a JWT or a timestamp and press Enter. Or type help.");
[].forEach.call(document.querySelectorAll("[data-cmd]"),function(b){b.addEventListener("click",function(){inp.value=b.getAttribute("data-cmd");inp.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));inp.focus({preventScroll:true})})});
})();
