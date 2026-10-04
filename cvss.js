(function(){
"use strict";
var $=function(i){return document.getElementById(i)};

// [key, label, group, [[code, name, weight, explanation], ...]]
var M=[
 ["AV","Attack Vector","expl",[
  ["N","Network",.85,"Exploitable remotely across the internet or any routed network."],
  ["A","Adjacent",.62,"Attacker must be on the same network segment (same Wi-Fi, VLAN, Bluetooth range)."],
  ["L","Local",.55,"Attacker needs local access or must get a user to run something (a file, a script)."],
  ["P","Physical",.2,"Attacker must physically touch the device."]]],
 ["AC","Attack Complexity","expl",[
  ["L","Low",.77,"Works reliably every time, no special conditions."],
  ["H","High",.44,"Needs conditions outside the attacker's control: a race, a specific configuration, a man-in-the-middle position."]]],
 ["PR","Privileges Required","expl",[
  ["N","None",.85,"No account needed."],
  ["L","Low",.62,"Needs a normal user account."],
  ["H","High",.27,"Needs admin-level privileges first."]]],
 ["UI","User Interaction","expl",[
  ["N","None",.85,"No victim action needed."],
  ["R","Required",.62,"A user has to do something: click a link, open a file, visit a page."]]],
 ["S","Scope","expl",[
  ["U","Unchanged",0,"Damage stays inside the vulnerable component."],
  ["C","Changed",0,"The flaw lets the attacker reach beyond the vulnerable component, e.g. VM escape or a web flaw that hits the user's browser."]]],
 ["C","Confidentiality","imp",[
  ["H","High",.56,"All data in the component can be read, or the leaked data is critical (credentials, keys)."],
  ["L","Low",.22,"Some data leaks, but the attacker does not control what."],
  ["N","None",0,"No data is disclosed."]]],
 ["I","Integrity","imp",[
  ["H","High",.56,"Attacker can modify anything, or what they can modify is critical."],
  ["L","Low",.22,"Limited modification without serious consequence."],
  ["N","None",0,"Nothing can be modified."]]],
 ["A","Availability","imp",[
  ["H","High",.56,"The component can be taken down completely or persistently."],
  ["L","Low",.22,"Reduced performance or intermittent interruptions."],
  ["N","None",0,"No availability impact."]]]
];
var PR_CHANGED={N:.85,L:.68,H:.5};
var state={AV:"N",AC:"L",PR:"N",UI:"N",S:"U",C:"H",I:"H",A:"H"};
var ui={};

function w(key){
  var m=M.filter(function(x){return x[0]===key})[0];
  var o=m[3].filter(function(x){return x[0]===state[key]})[0];
  if(key==="PR"&&state.S==="C")return PR_CHANGED[state.PR];
  return o[2];
}
function roundup(x){
  var i=Math.round(x*100000);
  if(i%10000===0)return i/100000;
  return (Math.floor(i/10000)+1)/10;
}
function calc(){
  var iss=1-(1-w("C"))*(1-w("I"))*(1-w("A"));
  var changed=state.S==="C";
  var impact=changed?7.52*(iss-.029)-3.25*Math.pow(iss-.02,15):6.42*iss;
  var expl=8.22*w("AV")*w("AC")*w("PR")*w("UI");
  var base=0;
  if(impact>0)base=changed?roundup(Math.min(1.08*(impact+expl),10)):roundup(Math.min(impact+expl,10));
  return {base:base,impact:impact,expl:expl};
}
function severity(s){
  if(s===0)return ["None","vgood"];
  if(s<4)return ["Low","vgood"];
  if(s<7)return ["Medium","vok"];
  if(s<9)return ["High","vweak"];
  return ["Critical","vbad"];
}
function vector(){
  return "CVSS:3.1/"+M.map(function(m){return m[0]+":"+state[m[0]]}).join("/");
}

function parse(str){
  var s=str.trim().toUpperCase();
  if(!s)return "empty";
  var parts=s.split("/"),next={},seen=0;
  for(var i=0;i<parts.length;i++){
    var kv=parts[i].split(":");
    if(kv[0]==="CVSS"){
      if(kv[1]!=="3.1"&&kv[1]!=="3.0")return "This calculator handles CVSS 3.x vectors. That one says version "+(kv[1]||"?")+".";
      continue;
    }
    var m=M.filter(function(x){return x[0]===kv[0]})[0];
    if(!m)continue; // temporal/environmental metrics are ignored
    if(!m[3].some(function(o){return o[0]===kv[1]}))return "Unknown value "+kv[1]+" for "+kv[0]+".";
    if(next[kv[0]])return "Metric "+kv[0]+" appears twice.";
    next[kv[0]]=kv[1];seen++;
  }
  if(seen!==M.length)return "A base vector needs all eight metrics: AV, AC, PR, UI, S, C, I, A.";
  state=next;
  return "";
}

function render(){
  M.forEach(function(m){
    var key=m[0],sel=null;
    ui[key].btns.forEach(function(b){
      var on=b.dataset.v===state[key];
      b.setAttribute("aria-pressed",on?"true":"false");
      if(on)sel=b.dataset.v;
    });
    ui[key].hint.textContent=m[3].filter(function(o){return o[0]===sel})[0][3];
  });
  var r=calc(),sv=severity(r.base);
  $("cv-score").textContent=r.base.toFixed(1);
  $("cv-score").className="num mlabel "+sv[1];
  $("cv-sev").textContent=sv[0];
  $("cv-sev").className="mlabel "+sv[1];
  $("cv-bar").className="meter-fill "+sv[1];
  $("cv-bar").style.width=(r.base*10)+"%";
  $("cv-sub").textContent="exploitability "+r.expl.toFixed(1)+" · impact "+Math.max(r.impact,0).toFixed(1);
  $("cv-vec").textContent=vector();
}

M.forEach(function(m){
  var box=document.createElement("div");box.className="metric";
  var b=document.createElement("b");b.textContent=m[1]+" ("+m[0]+")";
  var seg=document.createElement("div");seg.className="seg";seg.setAttribute("role","group");seg.setAttribute("aria-label",m[1]);
  var hint=document.createElement("small");
  var btns=m[3].map(function(o){
    var x=document.createElement("button");x.type="button";x.className="btn";x.textContent=o[1];x.dataset.v=o[0];
    x.addEventListener("click",function(){state[m[0]]=o[0];$("cv-err").textContent="";render();});
    seg.append(x);return x;
  });
  box.append(b,seg,hint);
  $(m[2]==="expl"?"cv-expl":"cv-imp").append(box);
  ui[m[0]]={btns:btns,hint:hint};
});

function load(str,quiet){
  var err=parse(str);
  if(err==="empty"){$("cv-err").textContent="";return}
  $("cv-err").textContent=err&&!quiet?err:"";
  if(!err)render();
}
$("cv-in").addEventListener("input",function(e){load(e.target.value)});

function copy(text,btn){
  var label=btn.textContent;
  var done=function(ok){btn.textContent=ok?"Copied":"Copy failed";setTimeout(function(){btn.textContent=label},1400)};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){done(true)},function(){done(false)});
  else done(false);
}
$("cv-copy").addEventListener("click",function(){copy(vector(),this)});
$("cv-link").addEventListener("click",function(){copy(location.origin+location.pathname+"#"+vector(),this)});

if(location.hash.length>1)load(decodeURIComponent(location.hash.slice(1)),true);
render();
})();
