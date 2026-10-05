(function(){
var L=window.SNIPS||[],q=document.getElementById("q"),o=document.getElementById("snips");
if(o&&!document.getElementById("snips-h")){var sh=document.createElement("h2");sh.id="snips-h";sh.className="sr";sh.textContent="snippets";o.parentNode.insertBefore(sh,o)}
function card(s){var d=document.createElement("div");d.className="snip";
var h=document.createElement("h3");h.textContent=s.t;var p=document.createElement("p");p.textContent=s.d;
var pre=document.createElement("pre");pre.textContent=s.c;
var b=document.createElement("button");b.className="btn";b.type="button";b.textContent="copy";
b.addEventListener("click",function(){try{navigator.clipboard.writeText(s.c).then(function(){b.textContent="copied";setTimeout(function(){b.textContent="copy"},1200)})}catch(e){}});
d.append(h,p,pre,b);return d}
function render(){var t=q.value.trim().toLowerCase();o.replaceChildren();
var r=L.filter(function(s){return !t||(s.t+" "+s.d+" "+s.c).toLowerCase().indexOf(t)>-1});
if(!r.length){var m=document.createElement("p");m.className="dim";m.textContent="No match.";o.append(m);return}
r.forEach(function(s){o.append(card(s))})}
q.value=new URLSearchParams(location.search).get("q")||"";q.addEventListener("input",render);render();
})();
