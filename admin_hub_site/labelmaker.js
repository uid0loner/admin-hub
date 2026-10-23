/* label-maker: cable, port and device labels on A4 sheets or label tape, with QR codes from qr.js. Nothing leaves the page. */
(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
var SHEETS={
 l7651:{n:"Avery L7651 / 3651: 38.1 x 21.2 mm, 65 per sheet",w:38.1,h:21.2,c:5,r:13,t:10.7,l:4.75,px:40.6,py:21.2},
 l4732:{n:"Avery L4732 / 4780: 35.6 x 16.9 mm, 80 per sheet",w:35.6,h:16.9,c:5,r:16,t:13.5,l:11,px:38.1,py:16.9},
 l7160:{n:"Avery L7160 / 3490: 63.5 x 38.1 mm, 21 per sheet",w:63.5,h:38.1,c:3,r:7,t:15.15,l:7.2,px:66,py:38.1},
 a3474:{n:"Avery 3474: 70 x 37 mm, 24 per sheet",w:70,h:37,c:3,r:8,t:0.5,l:0,px:70,py:37},
 l7163:{n:"Avery L7163: 99.1 x 38.1 mm, 14 per sheet",w:99.1,h:38.1,c:2,r:7,t:15.15,l:4.65,px:101.6,py:38.1},
 plain:{n:"Plain paper, cut lines: 50 x 20 mm, 40 per sheet",w:50,h:20,c:4,r:10,t:18.5,l:5,px:50,py:26,cut:true},
 tape12:{n:"Label tape 12 mm (Brother P-touch, Dymo), one label per page",tape:12},
 tape24:{n:"Label tape 24 mm, one label per page",tape:24},
 tape62:{n:"Label roll 62 mm (Brother QL), one label per page",tape:62}
};
var SAMPLE="SW1 Gi1/0/1 | PP-A 01\nSW1 Gi1/0/2 | PP-A 02\nSW1 Gi1/0/3 | PP-A 03\nsrv-file01 | 10.0.20.15 | Rack 2 U12\nfw01 | WAN1 to ISP fibre\nAP-OG2-04 | PoE SW2 Gi1/0/14";
var st={};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function read(){
 st={sheet:$("lm-sheet").value,len:Math.max(20,Math.min(200,+$("lm-len").value||60)),skip:Math.max(0,+$("lm-skip").value||0),
  qr:$("lm-qr").value,tpl:$("lm-tpl").value.trim(),flag:$("lm-flag").checked,border:$("lm-border").checked,copies:Math.max(1,Math.min(10,+$("lm-copies").value||1)),
  lines:$("lm-text").value.split(/\r?\n/).map(function(s){return s.trim()}).filter(Boolean)};
 $("lm-lenrow").hidden=!SHEETS[st.sheet].tape;$("lm-skiprow").hidden=!!SHEETS[st.sheet].tape;$("lm-tplrow").hidden=st.qr!=="tpl";
}
function qrText(label,n){
 var plain=label.split("|").map(function(s){return s.trim()}).join(" / ");
 if(st.qr==="text")return plain;
 if(st.qr==="tpl"&&st.tpl)return st.tpl.replace(/\{text\}/g,encodeURIComponent(plain)).replace(/\{first\}/g,encodeURIComponent(label.split("|")[0].trim())).replace(/\{n\}/g,n);
 return "";
}
function labelHTML(label,n,w,h){
 var parts=label.split("|").map(function(s){return s.trim()}).filter(Boolean),q=qrText(label,n),qs="",pad=Math.min(1.6,h*.08);
 var inner=h-pad*2,qsize=0;
 if(q){try{var code=window.ahQR.make(q,"M");qsize=Math.min(inner,w*.38);qs='<div class="lmqr" style="width:'+qsize+'mm;height:'+qsize+'mm">'+window.ahQR.svg(code,{quiet:1})+'</div>'}catch(e){qs='<div class="lmqr lmerr">QR too long</div>'}}
 var avail=Math.max(4,w-pad*2-(qsize?qsize+pad:0)),fs=Math.min(14,inner/(parts.length*1.22)*2.835);
 var txt='<div class="lmtx" style="font-size:'+fs.toFixed(2)+'pt;max-width:'+avail+'mm">'+parts.map(function(p,i){return'<span'+(i?'':' class="lm1"')+'>'+esc(p)+'</span>'}).join("")+'</div>';
 var body='<div class="lmin" style="padding:'+pad+'mm">'+qs+txt+'</div>';
 if(st.flag)body='<div class="lmflag"><div class="lmhalf">'+body+'</div><div class="lmfold"></div><div class="lmhalf">'+body+'</div></div>';
 return body;
}
function render(){
 read();var S=SHEETS[st.sheet],out=$("lm-out"),list=[],i,c;
 st.lines.forEach(function(l){for(c=0;c<st.copies;c++)list.push(l)});
 $("lm-count").textContent=list.length?list.length+" label"+(list.length===1?"":"s")+(S.tape?"":", "+Math.ceil((list.length+st.skip)/(S.c*S.r))+" sheet"+(Math.ceil((list.length+st.skip)/(S.c*S.r))===1?"":"s")):"No labels yet: type one per line, or use the sequence.";
 var css=document.getElementById("lm-pagecss");if(!css){css=document.createElement("style");css.id="lm-pagecss";document.head.append(css)}
 var html="";
 if(S.tape){
  var w=st.flag?st.len*2:st.len,h=S.tape;
  css.textContent="@page lmtape{size:"+w+"mm "+h+"mm;margin:0}";
  list.forEach(function(l,n){html+='<div class="lmpage lmtapep" style="width:'+w+'mm;height:'+h+'mm"><div class="lmlab'+(st.border?" lmb":"")+'" style="width:'+w+'mm;height:'+h+'mm">'+labelHTML(l,n+1,st.flag?st.len:w,h)+'</div></div>'});
 }else{
  css.textContent="@page lmsheet{size:210mm 297mm;margin:0}";
  var per=S.c*S.r,slots=st.skip+list.length,pages=Math.max(1,Math.ceil(slots/per));
  for(var p=0;p<pages;p++){
   html+='<div class="lmpage lmsheetp">';
   for(i=0;i<per;i++){var k=p*per+i,x=S.l+(i%S.c)*S.px,y=S.t+Math.floor(i/S.c)*S.py,lab=k>=st.skip&&k<slots?list[k-st.skip]:null;
    var lw=st.flag?S.w/2:S.w;
    html+='<div class="lmlab'+(st.border||S.cut?" lmb":"")+(lab===null?" lmempty":"")+'" style="left:'+x+'mm;top:'+y+'mm;width:'+S.w+'mm;height:'+S.h+'mm">'+(lab!==null?labelHTML(lab,k-st.skip+1,lw,S.h):"")+'</div>'}
   html+='</div>';
  }
 }
 out.innerHTML=html;fit();zoom();
}
function fit(){ // shrink text until every line fits its box
 [].forEach.call(document.querySelectorAll("#lm-out .lmtx"),function(t){
  var fs=parseFloat(t.style.fontSize),g=0,sp=t.children;
  function over(){if(t.scrollHeight>t.clientHeight+1)return true;for(var i=0;i<sp.length;i++)if(sp[i].scrollWidth>sp[i].clientWidth+1)return true;return false}
  while(g++<30&&fs>3.5&&over()){fs*=.92;t.style.fontSize=fs.toFixed(2)+"pt"}
 });
}
function zoom(){
 var box=$("lm-out"),pg=box.querySelector(".lmpage");if(!pg)return;
 pg.style.zoom=1;var z=Math.min(1,(box.clientWidth-4)/pg.offsetWidth);
 [].forEach.call(box.querySelectorAll(".lmpage"),function(e){e.style.zoom=z.toFixed(3)});
}
function seq(){
 var pre=$("lm-pre").value,suf=$("lm-suf").value,a=parseInt($("lm-from").value,10),b=parseInt($("lm-to").value,10),pad=Math.max(0,Math.min(5,+$("lm-pad").value||0));
 if(isNaN(a)||isNaN(b)){status("Give a start and an end number.");return}
 var step=a<=b?1:-1,n=Math.abs(b-a)+1;if(n>500){status("At most 500 labels per sequence.");return}
 var rows=[];for(var i=a;step>0?i<=b:i>=b;i+=step)rows.push(pre+String(i).padStart(pad,"0")+suf);
 var t=$("lm-text");t.value=(t.value.trim()?t.value.replace(/\s+$/,"")+"\n":"")+rows.join("\n");render();status(rows.length+" labels added.");
}
function status(s){$("lm-status").textContent=s}
function init(){
 if(!$("lm-out")||!window.ahQR)return;
 var sel=$("lm-sheet");Object.keys(SHEETS).forEach(function(k){var o=document.createElement("option");o.value=k;o.textContent=SHEETS[k].n;sel.append(o)});
 $("lm-text").value=SAMPLE;
 ["lm-sheet","lm-len","lm-skip","lm-qr","lm-tpl","lm-flag","lm-border","lm-copies"].forEach(function(id){$(id).addEventListener("input",render);$(id).addEventListener("change",render)});
 var tm;$("lm-text").addEventListener("input",function(){clearTimeout(tm);tm=setTimeout(render,250)});
 $("lm-seq").addEventListener("click",seq);
 $("lm-print").addEventListener("click",function(){render();window.print()});
 $("lm-sample").addEventListener("click",function(){$("lm-text").value=SAMPLE;render();status("Example loaded.")});
 $("lm-clear").addEventListener("click",function(){$("lm-text").value="";render();status("")});
 addEventListener("resize",zoom);
 addEventListener("beforeprint",function(){[].forEach.call(document.querySelectorAll(".lmpage"),function(e){e.style.zoom=1})});
 addEventListener("afterprint",zoom);
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
