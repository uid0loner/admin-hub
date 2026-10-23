(function(){
"use strict";
try{if(localStorage.getItem("ah_crt"))document.documentElement.classList.add("crt")}catch(e){}
var GO={h:"index.html",t:"tools.html",c:"cheat-sheets.html",l:"checklists.html",o:"glossary.html",e:"explainers.html",n:"news.html",s:"start-here.html",a:"about.html",k:"cockpit.html"};
var KEYS=[[["/","Ctrl+K"],"search everything"],[["g","h"],"home"],[["g","t"],"tools"],[["g","c"],"cheat-sheets"],[["g","l"],"checklists"],[["g","o"],"glossary"],[["g","e"],"explainers"],[["g","n"],"news"],[["g","s"],"start-here"],[["g","k"],"cockpit"],[["g","g"],"top of page"],[["G"],"bottom of page"],[["j","k"],"scroll down / up"],[["?"],"this help"],[["Esc"],"close"]];
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
  if(typing(e.target)||document.getElementById("spal")||document.getElementById("langmenu"))return;
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

/* ---------- language picker (the translator itself loads on demand) ---------- */
var LG=[["en","English"],["de","Deutsch"],["es","Espa\u00f1ol"],["it","Italiano"],["pt","Portugu\u00eas"],["pl","Polski"]];
var hdr=document.querySelector("header"),sb=hdr&&hdr.querySelector(".sbtn"),cur="en",lb=null,menu=null;
try{cur=localStorage.getItem("ah_lang")||"en"}catch(e){}
if(!LG.some(function(l){return l[0]===cur}))cur="en";
function loadTr(cb){
  if(window.ahTranslate){cb();return}
  var me=document.querySelector('script[src*="shell.js"]'),v=me&&me.getAttribute("src").match(/\?v=\d+/),sc=document.createElement("script");
  sc.src="translate.js"+(v?v[0]:"");sc.onload=cb;document.head.append(sc);
}
function closeMenu(){if(menu){menu.remove();menu=null;lb.setAttribute("aria-expanded","false")}}
if(sb){
  lb=el("button","btn sbtn lang",cur.toUpperCase());lb.type="button";lb.setAttribute("aria-haspopup","true");lb.setAttribute("aria-expanded","false");
  lb.setAttribute("aria-label","Language: translate this page");lb.setAttribute("translate","no");lb.title="Translate this page";
  hdr.insertBefore(lb,sb);
  lb.addEventListener("click",function(e){
    e.stopPropagation();
    if(menu){closeMenu();return}
    menu=el("div");menu.id="langmenu";menu.setAttribute("role","menu");menu.setAttribute("translate","no");
    LG.forEach(function(l){
      var b=el("button",null,l[1]);b.type="button";b.lang=l[0];b.setAttribute("role","menuitemradio");b.setAttribute("aria-checked",l[0]===cur?"true":"false");
      b.addEventListener("click",function(){
        cur=l[0];lb.textContent=cur.toUpperCase();closeMenu();
        if(cur==="en"&&!window.ahTranslate){try{localStorage.removeItem("ah_lang")}catch(e){}return}
        loadTr(function(){window.ahTranslate.set(cur,true)});
      });
      menu.append(b);
    });
    menu.append(el("small",null,"Translated on your device. The site itself is written in English."));
    hdr.append(menu);lb.setAttribute("aria-expanded","true");
    var on=menu.querySelector('[aria-checked="true"]');if(on)on.focus();
  });
  document.addEventListener("click",function(e){if(menu&&!menu.contains(e.target))closeMenu()});
  document.addEventListener("keydown",function(e){
    if(!menu)return;
    if(e.key==="Escape"){closeMenu();lb.focus()}
    else if(e.key==="ArrowDown"||e.key==="ArrowUp"){
      e.preventDefault();var items=[].slice.call(menu.querySelectorAll("button")),i=items.indexOf(document.activeElement);
      items[(i+(e.key==="ArrowDown"?1:items.length-1))%items.length].focus();
    }
  });
  document.addEventListener("ahlang",function(e){cur=e.detail.lang;lb.textContent=cur.toUpperCase()});
}
if(cur!=="en")loadTr(function(){window.ahTranslate.set(cur,false)});

/* print: head line with page title, address and date; closed sections open while printing */
(function(){
  var opened=[];
  function day(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
  function head(){
    var m=document.getElementById("main");if(!m)return;
    var h=m.querySelector(":scope>.prhead");
    if(!h){h=el("div","prhead");h.setAttribute("aria-hidden","true");h.append(el("b"),el("span"));m.prepend(h)}
    h.firstChild.textContent="admin_hub \u00b7 "+document.title.replace(/\s*\|\s*admin_hub\s*$/,"");
    h.lastChild.textContent=(location.protocol==="file:"?"admin-hub.xyz/":location.host+location.pathname)+" \u00b7 printed "+day();
  }
  head();
  addEventListener("beforeprint",function(){head();document.querySelectorAll("main details:not([open])").forEach(function(d){d.open=true;opened.push(d)})});
  addEventListener("afterprint",function(){opened.forEach(function(d){d.open=false});opened=[]});
})();

/* mobile menu: the same links as the desktop bar, as a sheet under the header */
(function(){
  var hdr=document.querySelector("header"),nav=hdr&&hdr.querySelector("nav");if(!nav)return;
  nav.id=nav.id||"mainnav";
  var b=el("button","menubtn");b.type="button";b.setAttribute("aria-controls",nav.id);b.setAttribute("aria-expanded","false");b.setAttribute("aria-label","Menu");
  b.append(el("i"),el("span",null,"menu"));hdr.append(b);
  if(!nav.querySelector(".navx")){var x=el("span","navx","Ctrl K or / searches everything. Press ? for all keys.");nav.append(x)}
  var root=document.documentElement;
  function place(){root.style.setProperty("--hdr-b",Math.round(hdr.getBoundingClientRect().bottom)+"px")}
  function set(open){
    root.classList.toggle("navopen",open);b.setAttribute("aria-expanded",open?"true":"false");b.lastChild.textContent=open?"close":"menu";
    if(open){place();var a=nav.querySelector("a");if(a)a.focus()}
  }
  b.addEventListener("click",function(){set(!root.classList.contains("navopen"))});
  nav.addEventListener("click",function(e){if(e.target.closest("a"))set(false)});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&root.classList.contains("navopen")){set(false);b.focus()}});
  matchMedia("(min-width:1181px)").addEventListener("change",function(m){if(m.matches)set(false)});
})();

/* one severity legend: shown once above the first group of findings a tool produces */
(function(){
  var m=document.getElementById("main");if(!m||!window.MutationObserver)return;
  var L=[["crit","critical","act now"],["high","high","this week"],["med","medium","plan it"],["info","info","good to know"]];
  function legend(){
    var f=m.querySelector(".finding.f-crit,.finding.f-high,.finding.f-med,.finding.f-info");
    if(!f||m.querySelector(".sevlegend"))return;
    var d=el("div","sevlegend");d.setAttribute("role","note");d.append(el("b",null,"severity"));
    L.forEach(function(x){var s=el("span");s.append(el("span","sevtag s-"+x[0],x[1]),document.createTextNode(x[2]));d.append(s)});
    f.parentNode.insertBefore(d,f);
  }
  new MutationObserver(function(){legend()}).observe(m,{childList:true,subtree:true});
  legend();
})();

/* reading pages: table of contents beside the text, with the current section marked */
(function(){
  var m=document.getElementById("main");if(!m)return;
  if(document.body.classList.contains("home")||m.querySelector(".toc,.hubbar,.amap,#sp-toc")||m.querySelector('.crumb a[href="tools.html"]'))return;
  var nav=null,io=null;
  function heads(){
    var h=[].filter.call(m.querySelectorAll("h2"),function(x){return x.textContent.trim()&&!x.closest("[hidden],.finding,.term")});
    if(h.length>=4&&h.length<=40)return h;
    var s=m.querySelectorAll(".snip h3");return s.length>=6&&s.length<=60?[].slice.call(s):null;
  }
  function slug(t,i){return "s-"+(t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||i)}
  function build(){
    var hs=heads();if(!hs)return;
    if(nav)nav.remove();if(io)io.disconnect();
    nav=el("nav","sidetoc");nav.setAttribute("aria-label","On this page");nav.append(el("b",null,"on this page"));
    var ol=el("ol"),links=[];
    hs.forEach(function(h,i){
      if(!h.id){var id=slug(h.textContent,i),n=id,k=2;while(document.getElementById(n))n=id+"-"+k++;h.id=n}
      var li=el("li"),a=el("a",null,h.textContent.replace(/^#\s*/,"").trim());a.href="#"+h.id;li.append(a);ol.append(li);links.push(a);
    });
    m.addEventListener("input",function(){setTimeout(function(){hs.forEach(function(h,i){links[i].parentNode.hidden=h.offsetParent===null})},30)});
    nav.append(ol);var t=el("a","totop","\u2191 top");t.href="#main";nav.append(t);
    document.body.append(nav);document.documentElement.classList.add("hastoc");
    if(window.IntersectionObserver){
      var vis=new Map();
      io=new IntersectionObserver(function(es){
        es.forEach(function(e){vis.set(e.target,e.isIntersecting)});
        var cur=null;for(var i=0;i<hs.length;i++){if(vis.get(hs[i])){cur=i;break}}
        if(cur===null){for(i=hs.length-1;i>=0;i--){if(hs[i].getBoundingClientRect().top<120){cur=i;break}}}
        links.forEach(function(a,i){if(i===cur)a.setAttribute("aria-current","true");else a.removeAttribute("aria-current")});
      },{rootMargin:"-80px 0px -55% 0px"});
      hs.forEach(function(h){io.observe(h)});
    }
  }
  if(document.readyState==="complete")setTimeout(build,50);else addEventListener("load",function(){setTimeout(build,50)});
})();

/* code blocks without a copy button get one */
(function(){
  var m=document.getElementById("main");if(!m||!navigator.clipboard)return;
  function add(){
    [].forEach.call(m.querySelectorAll("pre:not([id])"),function(p){
      if(p.closest(".snip,.prebox,.term,[id$='-out'],.lpscreen,.finding,.tframe,.mdout")||p.parentNode.querySelector(":scope>.btn,:scope>button"))return;
      var box=el("div","prebox");p.parentNode.insertBefore(box,p);box.append(p);
      var b=el("button","precopy","copy");b.type="button";b.setAttribute("aria-label","Copy this code");box.append(b);
      b.addEventListener("click",function(){navigator.clipboard.writeText(p.textContent).then(function(){b.textContent="copied";b.classList.add("ok");setTimeout(function(){b.textContent="copy";b.classList.remove("ok")},1400)},function(){b.textContent="press Ctrl C"})});
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add);else add();
})();

/* directory filter: say so when nothing matches, and offer the full search */
(function(){
  var q=document.getElementById("hubq"),n=document.getElementById("hubn");if(!q||!n)return;
  var box=null;
  function upd(){
    var none=/^0\b/.test(n.textContent.trim())&&q.value.trim();
    if(none&&!box){box=el("div","hubempty");box.setAttribute("role","status");box.append(el("p",null,"Nothing on this page matches."));
      var b=el("button","btn ghost","Search the whole site");b.type="button";b.setAttribute("data-search","");box.append(b);
      var bar=q.closest(".hubbar")||q;bar.parentNode.insertBefore(box,bar.nextSibling)}
    if(box)box.hidden=!none;
  }
  q.addEventListener("input",function(){setTimeout(upd,40)});
})();
})();
