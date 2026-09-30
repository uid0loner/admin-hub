(function(){
var K="ah_consent",b;
function get(){try{return localStorage.getItem(K)}catch(e){return null}}
function set(v){try{localStorage.setItem(K,v)}catch(e){}}
function apply(v){window.adConsent=(v==="all");document.dispatchEvent(new CustomEvent("adconsent",{detail:{ads:v==="all"}}))}
var st=document.createElement("style");
st.textContent="#cb{position:fixed;left:0;right:0;bottom:0;z-index:99;padding:16px 20px calc(16px + env(safe-area-inset-bottom,0px));background:#0d0b2b;border-top:1px solid #b45cff;box-shadow:0 -8px 40px rgba(180,92,255,.3);color:#d6d9ff;font:14px/1.6 'JetBrains Mono',ui-monospace,monospace}#cb div{max-width:960px;margin:0 auto}#cb p{margin:0 0 12px}#cb a{color:#4da3ff;text-decoration:underline}#cb button{background:transparent;color:#4da3ff;border:1px solid #4da3ff;border-radius:6px;padding:9px 16px;margin:0 10px 8px 0;font:inherit;cursor:pointer}#cb button:hover{box-shadow:0 0 16px rgba(77,163,255,.5)}#cb button:focus-visible{outline:2px solid #b45cff;outline-offset:2px}";
document.head.appendChild(st);
function hide(){if(b){b.remove();b=null}}
function show(){hide();b=document.createElement("div");b.id="cb";b.setAttribute("role","dialog");b.setAttribute("aria-label","Cookie settings");
b.innerHTML='<div><p>This site stores your choice in your browser. With your consent it also shows advertising, which can use cookies and process data from your browser. You can change this at any time under cookie settings in the footer. See the <a href="privacy.html">privacy policy</a>.</p><button type="button" data-c="all">Accept all</button><button type="button" data-c="necessary">Only necessary</button></div>';
b.addEventListener("click",function(e){var c=e.target.getAttribute&&e.target.getAttribute("data-c");if(c){set(c);apply(c);hide()}});
document.body.appendChild(b)}
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-consent-open]");if(t){e.preventDefault();show()}});
var v=get();if(v)apply(v);else show();
})();
