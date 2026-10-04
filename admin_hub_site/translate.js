(function(){
"use strict";
/* On-device page translation.
   Uses the browser's built-in Translator API (Chrome 138+, Edge 148+, desktop).
   The text never leaves the device. Where the API is missing, the visitor is told
   so and offered a link to Google Translate, which is only contacted if clicked. */
var LANGS={en:"English",de:"Deutsch",es:"Español",it:"Italiano",pt:"Português",pl:"Polski"};
var UI={
 de:{work:"Übersetze auf deinem Gerät …",dl:"Lade Sprachpaket … {p}%",done:"Auf deinem Gerät übersetzt. Es wurde nichts gesendet.",orig:"Original anzeigen",start:"Diese Seite auf Deutsch übersetzen",
     no:"Dein Browser kann nicht auf dem Gerät übersetzen. Das geht mit Chrome oder Edge auf einem Desktop-Rechner.",g:"Diese Seite in Google Translate öffnen",gnote:"Google erhält dabei die Adresse dieser Seite.",
     note:"Maschinelle Übersetzung. Befehle, Code und Namen bleiben englisch.",fail:"Die Übersetzung ist fehlgeschlagen.",close:"Schließen"},
 es:{work:"Traduciendo en tu dispositivo …",dl:"Descargando el paquete de idioma … {p}%",done:"Traducido en tu dispositivo. No se ha enviado nada.",orig:"Ver original",start:"Traducir esta página al español",
     no:"Tu navegador no puede traducir en el dispositivo. Hace falta Chrome o Edge en un ordenador de escritorio.",g:"Abrir esta página en Google Translate",gnote:"Google recibirá la dirección de esta página.",
     note:"Traducción automática. Los comandos, el código y los nombres se mantienen en inglés.",fail:"La traducción ha fallado.",close:"Cerrar"},
 it:{work:"Traduzione sul tuo dispositivo …",dl:"Download del pacchetto lingua … {p}%",done:"Tradotto sul tuo dispositivo. Non è stato inviato nulla.",orig:"Mostra originale",start:"Traduci questa pagina in italiano",
     no:"Il tuo browser non può tradurre sul dispositivo. Serve Chrome o Edge su un computer desktop.",g:"Apri questa pagina in Google Translate",gnote:"Google riceverà l'indirizzo di questa pagina.",
     note:"Traduzione automatica. Comandi, codice e nomi restano in inglese.",fail:"La traduzione non è riuscita.",close:"Chiudi"},
 pt:{work:"A traduzir no seu dispositivo …",dl:"A transferir o pacote de idioma … {p}%",done:"Traduzido no seu dispositivo. Nada foi enviado.",orig:"Mostrar original",start:"Traduzir esta página para português",
     no:"O seu navegador não consegue traduzir no dispositivo. É necessário o Chrome ou o Edge num computador.",g:"Abrir esta página no Google Translate",gnote:"A Google receberá o endereço desta página.",
     note:"Tradução automática. Comandos, código e nomes permanecem em inglês.",fail:"A tradução falhou.",close:"Fechar"},
 pl:{work:"Tłumaczenie na Twoim urządzeniu …",dl:"Pobieranie pakietu językowego … {p}%",done:"Przetłumaczono na Twoim urządzeniu. Nic nie zostało wysłane.",orig:"Pokaż oryginał",start:"Przetłumacz tę stronę na polski",
     no:"Twoja przeglądarka nie potrafi tłumaczyć na urządzeniu. Potrzebny jest Chrome lub Edge na komputerze.",g:"Otwórz tę stronę w Tłumaczu Google",gnote:"Google otrzyma adres tej strony.",
     note:"Tłumaczenie maszynowe. Polecenia, kod i nazwy pozostają po angielsku.",fail:"Tłumaczenie nie powiodło się.",close:"Zamknij"}
};
var KEY="ah_lang",CKEY="ah_tr_";
var lang="en",translator=null,gen=0,observer=null,queue=[],timer=null;
var originals=new WeakMap(),mine=new WeakMap(),touched=new Set(),cache={};

function store(v){try{if(v==="en")localStorage.removeItem(KEY);else localStorage.setItem(KEY,v)}catch(e){}}
function loadCache(l){try{cache=JSON.parse(sessionStorage.getItem(CKEY+l)||"{}")}catch(e){cache={}}}
function saveCache(l){try{var s=JSON.stringify(cache);if(s.length<400000)sessionStorage.setItem(CKEY+l,s)}catch(e){}}

/* ---------- what not to translate ---------- */
var SKIP_TAG={SCRIPT:1,STYLE:1,PRE:1,CODE:1,KBD:1,TEXTAREA:1,INPUT:1,SELECT:1,OPTION:1,SVG:1,NOSCRIPT:1};
var SKIP_SEL="#sl,#spal,#trbar,#langmenu,.crumb,.brand,header nav,.tb,.notranslate,[translate=no],.charttip,.ammitre,.smgrid,.kvlist code";
function skipEl(e){
  for(;e&&e.nodeType===1;e=e.parentElement){
    if(SKIP_TAG[e.tagName.toUpperCase()])return true;
    if(e===document.body)return false;
  }
  return false;
}
function skipText(t){
  if(t.length<2||!/[A-Za-z]{2}/.test(t))return true;                       // numbers, symbols
  if(/^[a-z0-9]+(?:[-_.][a-z0-9]+)+$/.test(t))return true;                  // slugs, file names
  if(/^\S+@\S+\.\S+$/.test(t)||/^https?:\/\//.test(t))return true;          // mail, urls
  if(/^[A-Z0-9_:.\/-]{2,}$/.test(t))return true;                            // IDs, codes, vectors
  if(/^[0-9a-f-]{16,}$/i.test(t))return true;                               // hashes, GUIDs
  return false;
}
function collect(root,out){
  if(root.nodeType===3){consider(root,out);return}
  if(root.nodeType!==1||skipEl(root)||(root.closest&&root.closest(SKIP_SEL)))return;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
    var p=n.parentElement;
    if(!p||skipEl(p)||p.closest(SKIP_SEL))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }}),n;
  while((n=w.nextNode()))consider(n,out);
}
function consider(n,out){
  var p=n.parentElement;if(!p||skipEl(p)||p.closest(SKIP_SEL))return;
  var v=n.nodeValue,t=v.trim();
  if(skipText(t))return;
  out.push(n);
}

/* ---------- status bar ---------- */
var bar=null;
function ui(k){return (UI[lang]||UI.de)[k]}
function showBar(text,opts){
  opts=opts||{};
  if(!bar){bar=document.createElement("div");bar.id="trbar";bar.setAttribute("role","status");bar.setAttribute("translate","no");document.body.append(bar)}
  bar.replaceChildren();
  var s=document.createElement("span");s.textContent=text;bar.append(s);
  if(opts.note){var sm=document.createElement("small");sm.textContent=opts.note;bar.append(sm)}
  if(opts.link){var a=document.createElement("a");a.href=opts.link;a.target="_blank";a.rel="noopener";a.textContent=opts.linkText;bar.append(a)}
  if(opts.action){var b=document.createElement("button");b.type="button";b.textContent=opts.actionText;b.addEventListener("click",opts.action);bar.append(b)}
  var x=document.createElement("button");x.type="button";x.className="x";x.setAttribute("aria-label",ui("close"));x.textContent="×";x.addEventListener("click",hideBar);bar.append(x);
}
function hideBar(){if(bar){bar.remove();bar=null}}

/* ---------- translating ---------- */
function restore(){
  touched.forEach(function(n){var o=originals.get(n);if(o!==undefined&&n.isConnected&&n.nodeValue===mine.get(n))n.nodeValue=o});
  touched.clear();originals=new WeakMap();mine=new WeakMap();
}
function apply(n,src,out){
  if(!n.isConnected)return;
  var cur=n.nodeValue;
  if(cur!==src)return;                       // changed while we were translating
  var lead=src.match(/^\s*/)[0],trail=src.match(/\s*$/)[0];
  var val=lead+out+trail;originals.set(n,src);mine.set(n,val);touched.add(n);n.nodeValue=val;
}
function run(nodes,myGen){
  var i=0,dirty=false;
  function next(){
    if(myGen!==gen)return Promise.resolve();
    if(i>=nodes.length){if(dirty)saveCache(lang);return Promise.resolve()}
    var n=nodes[i++];
    if(!n.isConnected||touched.has(n))return next();
    var src=n.nodeValue,t=src.trim();
    if(skipText(t))return next();
    if(cache[t]!==undefined){apply(n,src,cache[t]);return next()}
    return translator.translate(t).then(function(r){
      if(myGen!==gen)return;
      r=String(r||"").trim();if(r){cache[t]=r;dirty=true;apply(n,src,r)}
      return next();
    },function(){return next()});
  }
  return next();
}
function watch(){
  if(observer)observer.disconnect();
  observer=new MutationObserver(function(muts){
    muts.forEach(function(m){
      if(m.type==="characterData"){
        var n=m.target;
        if(mine.get(n)===n.nodeValue)return;          // our own write, not the page's
        if(touched.has(n)){touched.delete(n);originals.delete(n);mine.delete(n)}
        queue.push(n);
      }else m.addedNodes.forEach(function(n){queue.push(n)});
    });
    clearTimeout(timer);
    timer=setTimeout(function(){
      var batch=queue;queue=[];var nodes=[];
      batch.forEach(function(n){if(n.isConnected)collect(n,nodes)});
      nodes=nodes.filter(function(n){return !touched.has(n)});
      if(nodes.length&&translator)run(nodes,gen);
    },160);
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
}
function googleUrl(l){return "https://translate.google.com/translate?sl=en&tl="+l+"&u="+encodeURIComponent(location.href)}

function start(l,fromClick){
  var myGen=++gen;
  if(observer){observer.disconnect();observer=null}
  restore();translator=null;
  lang=l;store(l);
  document.documentElement.lang=l;
  document.dispatchEvent(new CustomEvent("ahlang",{detail:{lang:l}}));
  if(l==="en"){hideBar();return Promise.resolve("en")}
  if(!("Translator" in self)){
    showBar(ui("no"),{link:googleUrl(l),linkText:ui("g"),note:ui("gnote")});
    return Promise.resolve("unsupported");
  }
  loadCache(l);
  return Promise.resolve(self.Translator.availability({sourceLanguage:"en",targetLanguage:l})).then(function(av){
    if(myGen!==gen)return "stale";
    if(av==="unavailable"){showBar(ui("no"),{link:googleUrl(l),linkText:ui("g"),note:ui("gnote")});return "unsupported"}
    if(av!=="available"&&!fromClick){
      // the language pack must be downloaded first, and that needs a click
      showBar(LANGS[l],{action:function(){start(l,true)},actionText:ui("start")});
      return "needs-click";
    }
    showBar(ui("work"));
    setTimeout(function(){if(myGen===gen&&!translator)showBar(ui("work"),{link:googleUrl(l),linkText:ui("g"),note:ui("gnote")})},15000);
    return self.Translator.create({sourceLanguage:"en",targetLanguage:l,monitor:function(m){
      m.addEventListener("downloadprogress",function(e){if(myGen===gen&&e.loaded<1)showBar(ui("dl").replace("{p}",Math.round(e.loaded*100)))});
    }}).then(function(tr){
      if(myGen!==gen)return "stale";
      translator=tr;
      var nodes=[];collect(document.body,nodes);
      watch();
      return run(nodes,myGen).then(function(){
        if(myGen!==gen)return "stale";
        showBar(ui("done"),{note:ui("note"),action:function(){start("en",true)},actionText:ui("orig")});
        return "done";
      });
    });
  }).catch(function(){
    if(myGen===gen)showBar(ui("fail"),{link:googleUrl(l),linkText:ui("g"),note:ui("gnote")});
    return "failed";
  });
}
window.ahTranslate={langs:LANGS,set:start,get:function(){return lang}};
})();
