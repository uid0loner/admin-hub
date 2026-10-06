/* A small bar on the practise pages: the sibling pages and how far you are in each, in this tab. */
(function(){"use strict";
var bar=document.getElementById("pr-bar");if(!bar)return;
var P=[["linux-playground.html","Linux","ah_lp",18,"d"],["powershell-playground.html","PowerShell","ah_ps",12,"d"],["sql-playground.html","SQL","ah_sql",22,""],["packet-journey.html","Packets","ah_pj",10,""]];
function count(key,field){try{var v=JSON.parse(sessionStorage.getItem(key)||"null");if(!v)return 0;if(field)v=v[field];return Array.isArray(v)?v.length:0}catch(e){return 0}}
function draw(){bar.textContent="";var here=location.pathname.split("/").pop()||"";var lab=document.createElement("span");lab.className="prk";lab.textContent="practise";bar.appendChild(lab);
  P.forEach(function(p){var a=document.createElement("a"),n=Math.min(p[3],count(p[2],p[4]));a.href=p[0];a.className="prchip"+(here===p[0]?" iscur":"")+(n>=p[3]?" isdone":"");if(here===p[0])a.setAttribute("aria-current","page");
    var t=document.createElement("b");t.textContent=p[1];var c=document.createElement("span");c.textContent=n+" of "+p[3];var m=document.createElement("i");m.setAttribute("aria-hidden","true");var f=document.createElement("u");f.style.width=Math.round(n/p[3]*100)+"%";m.appendChild(f);a.appendChild(t);a.appendChild(c);a.appendChild(m);bar.appendChild(a)})}
draw();setInterval(draw,2500);
})();
