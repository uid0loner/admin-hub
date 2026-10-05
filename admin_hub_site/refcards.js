(function(){
"use strict";
var R=window.REF||{items:[]},q=document.getElementById("q"),o=document.getElementById("ev"),n=document.getElementById("refn");
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function norm(s){return String(s).toLowerCase().replace(/^0x0*/,"0x")}
function list(title,items,ordered){if(!items||!items.length)return null;var w=el("div","rfsec");w.append(el("h3",null,title));var l=el(ordered?"ol":"ul");items.forEach(function(x){l.append(el("li",null,x))});w.append(l);return w}
function card(it){
  var d=el("article","rfcard");d.id=slug(it.k&&it.k[0]?it.k[0]:it.t);
  var h=el("h2");if(it.k&&it.k.length){var c=el("span","rfkey",it.k[0]);h.append(c)}h.append(document.createTextNode(it.t));d.append(h);
  if(it.k&&it.k.length>1)d.append(el("p","rfalias","also: "+it.k.slice(1).join(", ")));
  d.append(el("p","rfp",it.p));
  [[R.l1,it.a,false],[R.l2,it.b,!!R.o2],[R.l3,it.c,false]].forEach(function(s){var x=s[1]&&s[0]?list(s[0],s[1],s[2]):null;if(x)d.append(x)});
  if(it.lk&&it.lk.length){var p=el("p","rflk","See also: ");it.lk.forEach(function(l,i){var a=el("a",null,l[0]);a.href=l[1];if(i)p.append(document.createTextNode(", "));p.append(a)});d.append(p)}
  return d;
}
function hay(it){return ((it.k||[]).join(" ")+" "+(it.k||[]).map(norm).join(" ")+" "+it.t+" "+it.p+" "+(it.a||[]).join(" ")+" "+(it.b||[]).join(" ")+" "+(it.c||[]).join(" ")).toLowerCase()}
function render(){
  var t=q.value.trim().toLowerCase(),tn=norm(t),words=t.split(/\s+/).filter(Boolean);o.replaceChildren();
  var hit=R.items.filter(function(it){if(!t)return true;var h=hay(it);return h.indexOf(tn)>=0||words.every(function(w){return h.indexOf(w)>=0||h.indexOf(norm(w))>=0})});
  if(t)hit.sort(function(x,y){function top(it){var h=((it.k||[]).join(" ")+" "+(it.k||[]).map(norm).join(" ")+" "+it.t).toLowerCase();return h.indexOf(tn)>=0||h.indexOf(t)>=0?0:1}return top(x)-top(y)});
  if(n)n.textContent=t?hit.length+" of "+R.items.length:R.items.length+" entries";
  if(!hit.length){o.append(el("p","dim",R.none||"Nothing matches. Try fewer words."));return}
  hit.forEach(function(it){o.append(card(it))});
}
q.value=new URLSearchParams(location.search).get("q")||"";
q.addEventListener("input",render);q.addEventListener("keydown",function(e){if(e.key==="Escape"){q.value="";render()}});
render();
if(location.hash&&!q.value){var e=document.getElementById(location.hash.slice(1));if(e)e.scrollIntoView()}
})();
