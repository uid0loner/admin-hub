(function(){
"use strict";
var GO={h:"index.html",t:"tools.html",c:"cheat-sheets.html",l:"checklists.html",o:"glossary.html",e:"explainers.html",n:"news.html",s:"start-here.html",a:"about.html"};
var KEYS=[[["/","Ctrl+K"],"search everything"],[["g","h"],"home"],[["g","t"],"tools"],[["g","c"],"cheat-sheets"],[["g","l"],"checklists"],[["g","o"],"glossary"],[["g","e"],"explainers"],[["g","n"],"news"],[["g","s"],"start-here"],[["g","g"],"top of page"],[["G"],"bottom of page"],[["j","k"],"scroll down / up"],[["?"],"this help"],[["Esc"],"close"]];
var pending=false,timer=null,sl=null,mode=null,kh=null;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e}
function typing(t){var n=t&&t.tagName;return n==="INPUT"||n==="TEXTAREA"||n==="SELECT"||(t&&t.isContentEditable)}
function setMode(p){pending=p;if(mode){mode.textContent=p?"GOTO":"NORMAL";mode.classList.toggle("pending",p)}}
function help(){
  if(kh){kh.remove();kh=null;return}
  kh=el("div");kh.id="kh";
  var bx=el("div","bx");bx.setAttribute("role","dialog");bx.setAttribute("aria-modal","true");bx.setAttribute("aria-label","Keyboard shortcuts");
  bx.append(el("h2",null,"keys"));
  var dl=el("dl");KEYS.forEach(function(k){var dt=el("dt");k[0].forEach(function(p,i){if(i)dt.append(" ");dt.append(el("kbd",null,p))});dl.append(dt,el("dd",null,k[1]))});
  bx.append(dl);kh.append(bx);document.body.append(kh);
  kh.addEventListener("mousedown",function(e){if(e.target===kh)help()});
}
document.addEventListener("keydown",function(e){
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==="Escape"&&kh){help();return}
  if(typing(e.target)||document.getElementById("spal"))return;
  var k=e.key;
  if(pending){
    clearTimeout(timer);setMode(false);
    if(k==="g"){window.scrollTo({top:0});e.preventDefault();return}
    if(GO[k]){e.preventDefault();location.href=GO[k]}
    return;
  }
  if(k==="?"){e.preventDefault();help()}
  else if(k==="g"){setMode(true);timer=setTimeout(function(){setMode(false)},1500)}
  else if(k==="G"){window.scrollTo({top:document.documentElement.scrollHeight})}
  else if(k==="j"){window.scrollBy({top:120})}
  else if(k==="k"){window.scrollBy({top:-120})}
});

if(window.matchMedia&&matchMedia("(min-width:761px) and (hover:hover)").matches){
  sl=el("div");sl.id="sl";sl.setAttribute("role","status");sl.setAttribute("aria-label","Status line");
  mode=el("span","mode","NORMAL");
  var crumb=document.querySelector(".crumb"),path="~";
  if(crumb){path=crumb.textContent.replace(/^[^:]*:/,"").replace(/\$\s*$/,"").trim()}
  var pct=el("span",null,"top"),on=el("span","on","online"),clk=el("span",null,""),hb=el("button",null,"? keys");
  hb.type="button";hb.addEventListener("click",help);
  sl.append(mode,el("span","path",path),el("span","sp"),pct,on,clk,hb);
  document.body.append(sl);document.body.classList.add("has-sl");
  function net(){var o=navigator.onLine!==false;on.textContent=o?"online":"offline (cached)";on.classList.toggle("off",!o)}
  function tick(){clk.textContent=new Date().toISOString().slice(11,19)+"Z"}
  function scr(){var d=document.documentElement,m=d.scrollHeight-innerHeight;pct.textContent=m<=4?"all":d.scrollTop<=2?"top":d.scrollTop>=m-2?"bot":Math.round(d.scrollTop/m*100)+"%"}
  net();tick();scr();setInterval(tick,1000);
  addEventListener("online",net);addEventListener("offline",net);addEventListener("scroll",scr,{passive:true});addEventListener("resize",scr);
}
})();
