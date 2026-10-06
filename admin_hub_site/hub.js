(function(){
"use strict";
var q=document.getElementById("hubq");if(!q)return;
var rows=[].slice.call(document.querySelectorAll(".ls.hub .lsrow")),secs=[].slice.call(document.querySelectorAll(".hubsec")),n=document.getElementById("hubn"),none=document.getElementById("hubnone");
rows.forEach(function(r){r._t=(r.textContent+" "+r.getAttribute("href")).toLowerCase()});
var chips=[].slice.call(document.querySelectorAll(".achip")),area="";
function run(){
  var words=q.value.toLowerCase().trim().split(/\s+/).filter(Boolean),shown=0;
  rows.forEach(function(r){var ok=words.every(function(w){return r._t.indexOf(w)>=0})&&(!area||r.getAttribute("data-a")===area);r.hidden=!ok;if(ok)shown++});
  secs.forEach(function(s){s.hidden=!s.querySelector(".lsrow:not([hidden])")});
  if(n)n.textContent=words.length||area?shown+" of "+rows.length:"";
  if(none)none.hidden=shown>0;
}
q.addEventListener("input",run);
q.addEventListener("keydown",function(e){if(e.key==="Escape"){q.value="";run()}if(e.key==="Enter"){var f=document.querySelector(".ls.hub .lsrow:not([hidden])");if(f&&q.value.trim())location.href=f.getAttribute("href")}});
function setArea(a){area=a;chips.forEach(function(c){c.setAttribute("aria-pressed",c.getAttribute("data-area")===a?"true":"false")});run()}
chips.forEach(function(c){c.addEventListener("click",function(){var a=c.getAttribute("data-area");setArea(area===a?"":a);try{history.replaceState(null,"",a&&area?"?a="+a:location.pathname)}catch(e){}})});
var sp=new URLSearchParams(location.search),p=sp.get("q"),pa=sp.get("a");if(p)q.value=p;if(pa&&chips.some(function(c){return c.getAttribute("data-area")===pa}))setArea(pa);else if(p)run();
})();
