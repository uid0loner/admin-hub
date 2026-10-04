(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
var KEY="ah_cockpit",ONKEY="ah_cockpit_on";
function isOn(){try{return localStorage.getItem(ONKEY)==="1"}catch(e){return false}}
function data(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}}
function save(d){try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}}
function age(ts){
  var m=Math.round((Date.now()-ts)/60000);
  if(m<2)return "just now";if(m<60)return m+" min ago";
  var h=Math.round(m/60);if(h<24)return h+" h ago";
  var d=Math.round(h/24);return d+" day"+(d===1?"":"s")+" ago"+(d>30?" (stale)":"");
}
function tile(kick,href){
  var t=el("section","cptile");var h=el("div","cph");h.append(el("span","kick",kick));
  if(href){var a=el("a","cpopen","open →");a.href=href;h.append(a)}
  t.append(h);return t;
}
function empty(t,text,href,cta){
  t.classList.add("empty");t.append(el("p","dim",text));
  var a=el("a","btn",cta);a.href=href;t.append(a);
}
function big(t,value,cls,label){var b=el("b","cpbig "+(cls||""),value);t.append(b);if(label)t.append(el("p","cpl",label))}
function meta(t,ts){t.append(el("small","cpage","checked "+age(ts)))}

function patchTuesday(){
  function second(y,m){var d=new Date(Date.UTC(y,m,1)),first=1+((2-d.getUTCDay()+7)%7);return new Date(Date.UTC(y,m,first+7))}
  var now=new Date(),today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()),d=second(now.getFullYear(),now.getMonth());
  if(d.getTime()<today)d=second(now.getFullYear()+(now.getMonth()===11?1:0),(now.getMonth()+1)%12);
  var days=Math.round((d.getTime()-today)/864e5),t=tile("next patch tuesday","patch-tuesday.html");
  big(t,days===0?"today":days===1?"tomorrow":days+" days","bl",d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",timeZone:"UTC"}));
  return t;
}
function domainTile(d){
  var t=tile("domain",d?"domain-check.html#d="+encodeURIComponent(d.name):"domain-check.html");
  if(!d){empty(t,"Can your domain be spoofed? Run the check once and the grade stays here.","domain-check.html","Check a domain");return t}
  big(t,d.grade,"g"+d.grade,d.name+" · "+d.score+"/100");
  t.append(el("p",null,"Spoofable: "+d.spoof+"."));
  if(d.issues&&d.issues.length){var ul=el("ul","cplist");d.issues.forEach(function(i){ul.append(el("li",null,i))});t.append(ul)}
  meta(t,d.ts);return t;
}
function mapTile(m){
  var t=tile("attack routes",m?"attack-map.html#c="+m.controls.join(","):"attack-map.html");
  if(!m){empty(t,"Tick the controls you have on the attack map to see how many routes to impact stay open.","attack-map.html","Open the attack map");return t}
  big(t,m.routes,m.routes===0?"bl":"hot","open of "+m.base+" · coverage "+m.score+"%");
  var bar=el("div","meter"),f=el("div","meter-fill vgood");f.style.width=m.score+"%";bar.append(f);t.append(bar);
  if(m.next)t.append(el("p",null,"Next best move: "+m.next+(m.nextRoutes<m.routes?" ("+m.routes+" → "+m.nextRoutes+")":"")+"."));
  meta(t,m.ts);return t;
}
function caTile(c){
  var t=tile("conditional access","ca-analyzer.html");
  if(!c){empty(t,"Paste your Conditional Access export to see which baseline protections are really enforced.","ca-analyzer.html","Analyse policies");return t}
  big(t,c.enforced+" / "+c.total,c.enforced>=8?"bl":c.enforced>=5?"or":"hot","baseline protections enforced · "+c.policies+" policies");
  if(c.missing&&c.missing.length){t.append(el("p","cpl","Not enforced:"));var ul=el("ul","cplist");c.missing.slice(0,5).forEach(function(i){ul.append(el("li",null,i))});t.append(ul)}
  meta(t,c.ts);return t;
}
function signinTile(s){
  var t=tile("sign-in log","signin-analyzer.html");
  if(!s){empty(t,"Drop a sign-in log export for a threat-hunting report. Only the verdict is kept here, never the log.","signin-analyzer.html","Analyse a log");return t}
  var label={crit:"Act now",high:"Needs attention",med:"Worth a look",info:"Nothing alarming",none:"Nothing found"}[s.worst]||s.worst;
  big(t,label,{crit:"hot",high:"or",med:"vi"}[s.worst]||"bl",s.events.toLocaleString("en-US")+" sign-ins, "+new Date(s.from).toISOString().slice(0,10)+" to "+new Date(s.to).toISOString().slice(0,10));
  var parts=[];["crit","high","med","info"].forEach(function(k){if(s.counts[k])parts.push(s.counts[k]+" "+({crit:"critical",high:"high",med:"medium",info:"info"})[k])});
  if(parts.length)t.append(el("p",null,parts.join(" · ")));
  if(s.top&&s.top.length){var ul=el("ul","cplist");s.top.forEach(function(i){ul.append(el("li",null,i))});t.append(ul)}
  meta(t,s.ts);return t;
}
function lifecycleTile(sel){
  var t=tile("end of support","product-lifecycle.html"),L=window.AH_LIFECYCLE||[];
  var mine=L.filter(function(p){return sel.indexOf(p[0])>-1});
  if(!mine.length){t.classList.add("empty");t.append(el("p","dim","Pick the products you run in the watchlist below."));return t}
  var now=new Date(),today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  mine=mine.map(function(p){return {n:p[0],d:Math.round((new Date(p[1]+"T00:00:00Z").getTime()-today)/864e5),date:p[1]}}).sort(function(a,b){return a.d-b.d});
  var past=mine.filter(function(p){return p.d<0}).length;
  big(t,past?past+" unsupported":mine[0].d+" days",past?"hot":mine[0].d<=180?"or":"bl",past?"of "+mine.length+" on your watchlist":"until "+mine[0].n+" ends");
  var ul=el("ul","cplist");mine.slice(0,5).forEach(function(p){ul.append(el("li",null,p.n+": "+(p.d<0?"ended "+p.date:p.d+" days ("+p.date+")")))});t.append(ul);
  return t;
}
function kevTile(){
  var t=tile("exploited now","cve.html"),ul=el("ul","cplist");t.append(el("p","dim","Loading the latest entries ..."));
  fetch("cve.html").then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(html){
    var doc=new DOMParser().parseFromString(html,"text/html"),items=doc.querySelectorAll(".kev");
    if(!items.length)throw 0;
    t.querySelector("p").remove();
    [].slice.call(items,0,5).forEach(function(k){
      var h=k.querySelector("h3"),sp=h&&h.querySelector("span"),id=k.id||"",li=el("li"),a=el("a",null,id);
      a.href="cve.html#"+id;li.append(a,document.createTextNode(sp?"  "+sp.textContent:""));ul.append(li);
    });
    t.append(ul);
  }).catch(function(){t.querySelector("p").textContent="The list could not be loaded right now."});
  return t;
}

function draw(){
  var on=isOn(),d=on?data():{},g=$("cp-grid");g.replaceChildren();
  $("cp-on").checked=on;
  g.append(patchTuesday(),domainTile(d.domain),mapTile(d.map),caTile(d.ca),signinTile(d.signin),lifecycleTile(on?(d.products||[]):[]),kevTile());
  g.classList.toggle("off",!on);
  $("cp-msg").textContent=on?"":"Off: nothing is being stored.";
  var box=$("cp-products");box.replaceChildren();
  (window.AH_LIFECYCLE||[]).forEach(function(p){
    var lab=el("label","cchip"),inp=el("input");inp.type="checkbox";inp.checked=on&&(d.products||[]).indexOf(p[0])>-1;inp.disabled=!on;
    inp.addEventListener("change",function(){var x=data(),list=x.products||[];if(inp.checked)list.push(p[0]);else list=list.filter(function(n){return n!==p[0]});x.products=list;save(x);draw()});
    lab.append(inp,el("span",null,p[0]));box.append(lab);
  });
}
$("cp-on").addEventListener("change",function(){
  try{if(this.checked)localStorage.setItem(ONKEY,"1");else{localStorage.removeItem(ONKEY);localStorage.removeItem(KEY)}}catch(e){}
  draw();
  $("cp-msg").textContent=this.checked?"On. Run a tool and its summary appears here.":"Off, and what was stored has been deleted.";
});
$("cp-clear").addEventListener("click",function(){try{localStorage.removeItem(KEY)}catch(e){}draw();$("cp-msg").textContent="Everything stored for the cockpit has been deleted."});
$("cp-export").addEventListener("click",function(){
  var blob=new Blob([JSON.stringify(data(),null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="admin_hub-cockpit.json";document.body.append(a);a.click();a.remove();
});
draw();
})();
