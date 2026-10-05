(function(){
"use strict";
var fr=document.querySelector(".tframe");if(!fr)return;
var out=document.querySelector('main [id$="-out"]'),res=document.querySelector(".tocres");
function sync(){var shown=out&&!out.hidden&&out.childElementCount>0;fr.classList.toggle("done",!!shown);if(res)res.hidden=!shown}
if(out){new MutationObserver(sync).observe(out,{attributes:true,attributeFilter:["hidden"],childList:true});sync()}
fr.addEventListener("click",function(e){
  var b=e.target.closest&&e.target.closest(".tplink");if(!b)return;
  var t=b.getAttribute("data-sample")?document.getElementById(b.getAttribute("data-sample")):document.querySelector(b.getAttribute("data-sample-sel")||"x");
  if(t)t.click();
});
})();
