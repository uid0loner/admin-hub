(function(){
"use strict";
var fr=document.querySelector(".tframe");if(!fr)return;
var out=document.querySelector('main [id$="-out"]'),res=document.querySelector(".tocres");
var was=false,calm=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function count(el){
  if(el.hasAttribute("data-raw"))return;
  var m=/^(\D*)(\d[\d,]*)(\D*)$/.exec(el.textContent.trim());if(!m)return;
  var end=parseInt(m[2].replace(/,/g,""),10);if(!end||end<3)return;
  var t0=performance.now(),grp=m[2].indexOf(",")>-1||end>=1000;
  (function step(t){var p=Math.min(1,(t-t0)/520),v=Math.round(end*(1-Math.pow(1-p,3)));el.textContent=m[1]+(grp?v.toLocaleString("en-US"):v)+m[3];if(p<1)requestAnimationFrame(step)})(t0);
}
function reveal(){
  if(calm)return;
  [].forEach.call(out.querySelectorAll(":scope > .finding"),function(d,i){d.style.setProperty("--i",Math.min(i,12))});
  out.classList.remove("rvl");void out.offsetWidth;out.classList.add("rvl");
  [].forEach.call(out.querySelectorAll(":scope > .stats .stat-v"),count);
}
function sync(){var shown=out&&!out.hidden&&out.childElementCount>0;fr.classList.toggle("done",!!shown);if(res)res.hidden=!shown;if(shown&&!was)reveal();was=!!shown}
if(out){new MutationObserver(sync).observe(out,{attributes:true,attributeFilter:["hidden"],childList:true});sync()}
fr.addEventListener("click",function(e){
  var b=e.target.closest&&e.target.closest(".tplink");if(!b)return;
  var t=b.getAttribute("data-sample")?document.getElementById(b.getAttribute("data-sample")):document.querySelector(b.getAttribute("data-sample-sel")||"x");
  if(t)t.click();
});
})();
