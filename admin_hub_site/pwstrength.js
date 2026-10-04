(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
var inp=$("pw-in"), toggle=$("pw-toggle"), out=$("pw-out"), bar=$("pw-bar"), label=$("pw-label");
var lenEl=$("pw-len"), poolEl=$("pw-pool"), entEl=$("pw-entropy"), timesBody=$("#pw-times tbody")||document.querySelector("#pw-times tbody");
var flagsEl=$("pw-flags");

var COMMON = ["password","123456","12345678","qwerty","letmein","welcome","admin","iloveyou",
  "monkey","dragon","football","baseball","trustno1","master","sunshine","princess","qwerty123",
  "passw0rd","login","starwars","hello","freedom","whatever","abc123","123456789","1234567890",
  "password1","password123","changeme","default"];

function poolSize(pw){
  var pool=0;
  if(/[a-z]/.test(pw)) pool+=26;
  if(/[A-Z]/.test(pw)) pool+=26;
  if(/[0-9]/.test(pw)) pool+=10;
  if(/[ ]/.test(pw)) pool+=1;
  if(/[^a-zA-Z0-9 ]/.test(pw)) pool+=33; // rough common-symbol estimate
  return pool || 1;
}

function hasSequence(pw){
  var s=pw.toLowerCase();
  var seqs=["abcdefghijklmnopqrstuvwxyz","0123456789","qwertyuiop","asdfghjkl","zxcvbnm"];
  for(var i=0;i<seqs.length;i++){
    var seq=seqs[i];
    for(var j=0;j<=seq.length-3;j++){
      var fwd=seq.slice(j,j+3), rev=fwd.split("").reverse().join("");
      if(s.indexOf(fwd)!==-1 || s.indexOf(rev)!==-1) return true;
    }
  }
  return false;
}

function hasRepeat(pw){
  return /(.)\1\1/.test(pw); // same char 3+ times in a row
}

function looksLikeDate(pw){
  return /(19|20)\d{2}/.test(pw) || /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/.test(pw);
}

function isCommon(pw){
  var low=pw.toLowerCase();
  return COMMON.indexOf(low)!==-1;
}

function fmtTime(seconds){
  if(!isFinite(seconds)) return "effectively never";
  if(seconds<1) return "instantly";
  var units=[
    ["year", 31557600],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1]
  ];
  // pick the largest sensible unit, show one or two
  if(seconds >= 31557600*1000){
    var yrs=seconds/31557600;
    if(yrs >= 1e12) return formatBig(yrs)+" years";
    return Math.round(yrs).toLocaleString("en-US")+" years";
  }
  for(var i=0;i<units.length;i++){
    if(seconds >= units[i][1]){
      var v=seconds/units[i][1];
      return (v>=100? Math.round(v).toLocaleString("en-US") : v.toFixed(1))+" "+units[i][0]+(v>=2?"s":"");
    }
  }
  return Math.round(seconds)+" seconds";
}
function formatBig(n){
  var exp=Math.floor(Math.log10(n));
  var mant=n/Math.pow(10,exp);
  return mant.toFixed(1)+"×10^"+exp;
}

var SCENARIOS=[
  ["Online, rate-limited (10 guesses/sec)", 10],
  ["Online, no rate limit (1,000 guesses/sec)", 1e3],
  ["Offline, slow hash e.g. bcrypt (10,000 guesses/sec)", 1e4],
  ["Offline, fast hash e.g. unsalted MD5, GPU cluster (10 billion guesses/sec)", 1e10]
];

function update(){
  var pw=inp.value;
  if(pw.length===0){ out.style.display="none"; return; }
  out.style.display="block";

  var pool=poolSize(pw);
  var entropy=pw.length * Math.log2(pool);
  var combos=Math.pow(pool, pw.length);

  lenEl.textContent=pw.length+" character"+(pw.length===1?"":"s");
  poolEl.textContent=pool+" possible characters";
  entEl.textContent=entropy.toFixed(1)+" bits";

  // meter: scale 0-100 bits of entropy to 0-100%
  var pct=Math.min(100, Math.round(entropy/100*100));
  bar.style.width=pct+"%";

  var common=isCommon(pw);
  var verdict, cls;
  if(common){ verdict="Extremely weak — this is one of the most common passwords in the world"; cls="vbad"; pct=3; bar.style.width="3%"; }
  else if(entropy<28){ verdict="Very weak"; cls="vbad"; }
  else if(entropy<36){ verdict="Weak"; cls="vweak"; }
  else if(entropy<60){ verdict="Reasonable"; cls="vok"; }
  else if(entropy<80){ verdict="Strong"; cls="vgood"; }
  else { verdict="Very strong"; cls="vgood"; }
  label.textContent=verdict;
  label.className="mlabel "+cls;
  bar.className="meter-fill "+cls;

  // crack times table
  timesBody.replaceChildren();
  var effectiveCombos = common ? 1 : combos;
  SCENARIOS.forEach(function(sc){
    var seconds = effectiveCombos / sc[1] / 2; // average case: half the keyspace
    var tr=document.createElement("tr");
    var td1=document.createElement("td"); td1.textContent=sc[0];
    var td2=document.createElement("td"); td2.textContent=sc[1].toLocaleString("en-US");
    var td3=document.createElement("td"); td3.textContent=common ? "instantly (known password)" : fmtTime(seconds);
    tr.append(td1,td2,td3); timesBody.append(tr);
  });

  // flags
  flagsEl.replaceChildren();
  var flags=[];
  if(common) flags.push("This exact password appears in common password lists. Attackers try these first, regardless of length.");
  if(hasRepeat(pw)) flags.push("Contains the same character repeated 3+ times in a row — reduces real-world strength below the raw entropy estimate.");
  if(hasSequence(pw)) flags.push("Contains a keyboard or alphabet sequence (like \"abc\" or \"qwerty\") — these are tried before random guesses.");
  if(looksLikeDate(pw)) flags.push("Looks like it may contain a year or date — dates are commonly guessed, especially birthdays and anniversaries.");
  if(pw.length < 12 && !common) flags.push("Under 12 characters. Length matters more than complexity — a longer passphrase is usually both stronger and easier to remember.");

  if(flags.length){
    var h=document.createElement("h2"); h.style.marginTop="24px"; h.textContent="things that weaken this";
    flagsEl.append(h);
    var ul=document.createElement("ul"); ul.style.marginTop="8px";
    flags.forEach(function(f){
      var li=document.createElement("li"); li.className="dim"; li.style.marginBottom="6px"; li.textContent=f;
      ul.append(li);
    });
    flagsEl.append(ul);
  }
}

inp.addEventListener("input", update);
toggle.addEventListener("click", function(){
  if(inp.type==="password"){ inp.type="text"; toggle.textContent="hide"; }
  else { inp.type="password"; toggle.textContent="show"; }
});

/* ---------- optional breach check (k-anonymity: only 5 hash characters are sent) ---------- */
var hb=$("pw-hibp"),ho=$("pw-hibp-out");
function sha1hex(text){
  return crypto.subtle.digest("SHA-1",new TextEncoder().encode(text)).then(function(buf){
    return Array.prototype.map.call(new Uint8Array(buf),function(b){return ("0"+b.toString(16)).slice(-2)}).join("").toUpperCase();
  });
}
if(hb){
  hb.addEventListener("click",function(){
    var v=inp.value;
    if(!v){ho.textContent="Type a password first.";return}
    if(!(window.crypto&&crypto.subtle)){ho.textContent="This browser cannot compute the hash here.";return}
    hb.disabled=true;ho.className="";ho.textContent="Checking ...";
    sha1hex(v).then(function(h){
      var prefix=h.slice(0,5),suffix=h.slice(5);
      return fetch("https://api.pwnedpasswords.com/range/"+prefix).then(function(r){
        if(!r.ok)throw new Error("status "+r.status);return r.text();
      }).then(function(body){
        var hit=0;body.split(/\r?\n/).forEach(function(line){var p=line.split(":");if(p[0]&&p[0].trim().toUpperCase()===suffix)hit=parseInt(p[1],10)||0});
        if(hit){ho.className="mlabel vbad";ho.textContent="Found "+hit.toLocaleString("en-US")+" times in breach data. Do not use this password anywhere."}
        else{ho.className="mlabel vgood";ho.textContent="Not found in the breach data. That does not make it strong: see the numbers above."}
      });
    }).catch(function(){ho.className="";ho.textContent="The breach service could not be reached. A firewall or blocker may be in the way."})
      .then(function(){hb.disabled=false});
  });
  inp.addEventListener("input",function(){ho.textContent="";ho.className=""});
}
})();
