(function(){
var I=window.SITE_INDEX||[],ov,inp,ul,an,anHref="",sel=0,res=[],prev,BONUS={"tool":2,"page":2};
function score(e,tk){var t=e[0].toLowerCase(),ty=e[2].toLowerCase(),k=(e[3]||"").toLowerCase(),s=BONUS[e[2]]||0;
for(var i=0;i<tk.length;i++){var w=tk[i];
if(t.indexOf(w)===0)s+=6;else if(t.indexOf(w)>-1)s+=4;else if(ty.indexOf(w)>-1)s+=2;else if(k.indexOf(w)>-1)s+=1;else return 0}
return s}
function find(q,max){var tk=String(q).toLowerCase().split(/\s+/).filter(Boolean);if(!tk.length)return[];
var r=[];I.forEach(function(e){var s=score(e,tk);if(s)r.push([s,e])});
r.sort(function(a,b){return b[0]-a[0]});return r.slice(0,max||12).map(function(x){return x[1]})}

/* ---------- instant answers ---------- */
var anFirst=false;
function ip4(a){return ((a[0]<<24)>>>0)+(a[1]<<16)+(a[2]<<8)+a[3]}
function dot(n){return [n>>>24,n>>>16&255,n>>>8&255,n&255].join(".")}
function ipKind(a){
  if(a[0]===10||a[0]===172&&a[1]>=16&&a[1]<=31||a[0]===192&&a[1]===168)return "private (RFC 1918)";
  if(a[0]===127)return "loopback";
  if(a[0]===169&&a[1]===254)return "link-local (APIPA): no DHCP answer";
  if(a[0]===100&&a[1]>=64&&a[1]<=127)return "carrier-grade NAT (RFC 6598)";
  if(a[0]>=224&&a[0]<=239)return "multicast";
  if(a[0]===192&&a[1]===0&&a[2]===2||a[0]===198&&a[1]===51&&a[2]===100||a[0]===203&&a[1]===0&&a[2]===113)return "documentation range (RFC 5737)";
  if(a[0]===0||a[0]>=240)return "reserved";
  return "public";
}
function cvss(v){
  var W={AV:{N:.85,A:.62,L:.55,P:.2},AC:{L:.77,H:.44},UI:{N:.85,R:.62},C:{H:.56,L:.22,N:0},I:{H:.56,L:.22,N:0},A:{H:.56,L:.22,N:0}},m={};
  v.toUpperCase().split("/").forEach(function(p){var kv=p.split(":");m[kv[0]]=kv[1]});
  var ok=["AV","AC","PR","UI","S","C","I","A"].every(function(k){return m[k]});
  if(!ok||!W.AV[m.AV]||!W.AC[m.AC]||!W.UI[m.UI]||W.C[m.C]===undefined||W.I[m.I]===undefined||W.A[m.A]===undefined||!/^[UC]$/.test(m.S))return null;
  var ch=m.S==="C",pr=({N:.85,L:ch?.68:.62,H:ch?.5:.27})[m.PR];if(pr===undefined)return null;
  var iss=1-(1-W.C[m.C])*(1-W.I[m.I])*(1-W.A[m.A]),imp=ch?7.52*(iss-.029)-3.25*Math.pow(iss-.02,15):6.42*iss,ex=8.22*W.AV[m.AV]*W.AC[m.AC]*pr*W.UI[m.UI];
  function up(x){var i=Math.round(x*100000);return i%10000===0?i/100000:(Math.floor(i/10000)+1)/10}
  var b=imp<=0?0:ch?up(Math.min(1.08*(imp+ex),10)):up(Math.min(imp+ex,10));
  return [b,b===0?"None":b<4?"Low":b<7?"Medium":b<9?"High":"Critical"];
}
function b64json(p){try{p=p.replace(/-/g,"+").replace(/_/g,"/");while(p.length%4)p+="=";return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p),function(c){return c.charCodeAt(0)})))}catch(e){return null}}
function rel(ms){var d=ms-Date.now(),a=Math.abs(d),u=a<6e4?[1e3,"second"]:a<36e5?[6e4,"minute"]:a<864e5?[36e5,"hour"]:a<31536e6?[864e5,"day"]:[31536e6,"year"],n=Math.round(a/u[0]);return (d<0?"":"in ")+n+" "+u[1]+(n===1?"":"s")+(d<0?" ago":"")}
function answers(q){
  var s=q.trim(),A=[],m;if(!s)return A;
  if(m=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\s*\/\s*(\d{1,2}))?$/.exec(s)){
    var o=[+m[1],+m[2],+m[3],+m[4]];
    if(o.every(function(x){return x<=255})&&(m[5]===undefined||+m[5]<=32)){
      if(m[5]!==undefined){
        var p=+m[5],mask=p===0?0:(0xFFFFFFFF<<(32-p))>>>0,net=(ip4(o)&mask)>>>0,bc=(net|~mask)>>>0,hosts=p>=31?(p===32?1:2):Math.pow(2,32-p)-2;
        A.push({k:"subnet",t:dot(net)+"/"+p,rows:[["network",dot(net)],["broadcast",p>=31?"none (/"+p+")":dot(bc)],["netmask",dot(mask)],["host range",p>=31?dot(net)+" - "+dot(bc):dot(net+1)+" - "+dot(bc-1)],["usable hosts",hosts.toLocaleString("en-US")],["type",ipKind(o)]],href:"subnet-calculator.html",go:"open the subnet calculator"});
      }else A.push({k:"ip address",t:s,rows:[["type",ipKind(o)],["as integer",String(ip4(o))],["as hex","0x"+ip4(o).toString(16).toUpperCase().padStart(8,"0")]],href:"subnet-calculator.html",go:"open the subnet calculator"});
    }
  }
  if(/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(s)&&!/\.(html?|js|css|json|png|txt|md|csv|exe|dll|ps1|log)$/i.test(s))
    A.push({k:"domain",t:s.toLowerCase(),text:"Audit SPF, DMARC, DKIM, MTA-STS and DNSSEC for this domain from live DNS.",href:"domain-check.html#d="+s.toLowerCase(),go:"run the domain check"});
  if(/^[45]\.\d{1,3}\.\d{1,3}$/.test(s))A.push({k:"bounce code",t:s,text:"Explain this delivery status code: the cause, who has to fix it and what to tell the user.",href:"mailflow-debugger.html#q="+s,go:"open the mail flow debugger"});
  if(/^CVSS:3\.[01]\//i.test(s)){var c=cvss(s);if(c)A.push({k:"cvss 3.1",t:c[0].toFixed(1)+" "+c[1],rows:[["vector",s.toUpperCase()]],href:"cvss-calculator.html#"+s.toUpperCase(),go:"open in the CVSS calculator"})}
  if(/^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(s)){
    var parts=s.split("."),h=b64json(parts[0]),pl=b64json(parts[1]);
    if(h&&pl){var rows=[["algorithm",String(h.alg||"?")]];
      ["iss","aud","sub","upn","appid","scp","roles"].forEach(function(k){if(pl[k]!==undefined)rows.push([k,Array.isArray(pl[k])?pl[k].join(" "):String(pl[k])])});
      if(pl.exp){var ex=pl.exp*1000;rows.push(["expires",new Date(ex).toISOString().replace(".000","")+" ("+(ex<Date.now()?"EXPIRED ":"")+rel(ex)+")"])}
      A.push({k:"json web token",t:"Decoded locally, signature not verified",rows:rows,href:"tools.html#jwt-decoder",go:"open the JWT decoder"})}
  }
  if(/^\d{10}$|^\d{13}$/.test(s)){var ms=s.length===13?+s:+s*1000,d=new Date(ms);
    if(!isNaN(d))A.push({k:"unix time",t:rel(ms),rows:[["UTC",d.toISOString().replace(".000","")],["local",d.toString().replace(/ \(.*\)$/,"")]],href:"tools.html#time-converter",go:"open the time converter"})}
  if(m=/^(?:AADSTS)?(\d{2,7})$/i.exec(s)){
    var num=m[1],re=new RegExp("(^|[^0-9])"+num+"([^0-9]|$)"),types={"error code":1,"port":1,"http status":1,"event id":1,"bounce code":1},n=0;
    I.forEach(function(e){if(n<4&&types[e[2]]&&re.test(e[0])){n++;A.push({k:e[2],t:e[0],text:e[3]||"",href:e[1],go:"open the reference"})}});
    var v=+num;if(v<=0xFFFFFFFF&&!/^AADSTS/i.test(s))A.push({k:"number",t:num,rows:[["hex","0x"+v.toString(16).toUpperCase()],["binary",v<=65535?v.toString(2):"(more than 16 bits)"]]});
  }
  if(m=/^0x([0-9a-f]{1,8})$/i.exec(s)){var hv=parseInt(m[1],16);A.push({k:"hex number",t:s,rows:[["decimal",String(hv)],["binary",hv<=65535?hv.toString(2):"(more than 16 bits)"]]})}
  if(/^[a-f0-9]+$/i.test(s)&&({32:1,40:1,64:1,128:1})[s.length]&&/[a-f]/i.test(s))
    A.push({k:"hash",t:({32:"MD5 or NTLM",40:"SHA-1",64:"SHA-256",128:"SHA-512"})[s.length]+" by length",text:s.length*4+" bits. The length only narrows it down: it cannot tell MD5 from NTLM, or say what was hashed.",href:"tools.html#hash-generator",go:"open the hash generator"});
  if(/^(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}$|^(?:[0-9a-f]{4}\.){2}[0-9a-f]{4}$/i.test(s)){
    var hx=s.replace(/[^0-9a-f]/gi,"").toUpperCase(),pairs=hx.match(/../g);
    A.push({k:"mac address",t:pairs.join(":"),rows:[["Windows",pairs.join("-")],["Linux",pairs.join(":").toLowerCase()],["Cisco",hx.toLowerCase().match(/..../g).join(".")],["vendor prefix (OUI)",pairs.slice(0,3).join(":")],["kind",(parseInt(pairs[0],16)&2?"locally administered (randomised or virtual)":"vendor-assigned")]]});
  }
  if(/^[A-Za-z0-9+\/]{12,}={0,2}$/.test(s)&&s.length%4===0&&!/^[0-9a-f]+$/i.test(s)&&!/^eyJ/.test(s)){
    try{var txt=new TextDecoder("utf-8",{fatal:true}).decode(Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)}));
      if(/^[\x20-\x7E -￿\r\n\t]+$/.test(txt))A.push({k:"base64",t:"Decoded text",rows:[["value",txt.length>300?txt.slice(0,300)+" ...":txt]],href:"tools.html#base64-tool",go:"open the Base64 tool"})}catch(e){}
  }
  if(/^(uuid|guid)$/i.test(s)&&window.crypto&&crypto.randomUUID)A.push({k:"generated",t:"Random GUID (v4)",rows:[["value",crypto.randomUUID()],["another",crypto.randomUUID()]],href:"tools.html#guid-generator",go:"open the GUID generator"});
  if(m=/^(?:pw|pass|password)(?:\s+(\d{1,3}))?$/i.exec(s)){
    var len=Math.min(Math.max(+(m[1]||20),8),128),cs="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%&*+-=?@",buf=new Uint32Array(len*2),pw="",bi=0;crypto.getRandomValues(buf);
    var lim=Math.floor(4294967296/cs.length)*cs.length;
    while(pw.length<len){if(bi>=buf.length){crypto.getRandomValues(buf);bi=0}var r=buf[bi++];if(r<lim)pw+=cs[r%cs.length]}
    A.push({k:"generated",t:"Random password, "+len+" characters",rows:[["value",pw]],text:"Created by your browser's secure random generator. Not stored, not sent.",href:"tools.html#password-generator",go:"open the password generator"});
  }
  if(m=/^chmod\s+([0-7]{3,4})$/i.exec(s)){var dg=m[1].slice(-3).split(""),rw=dg.map(function(x){x=+x;return (x&4?"r":"-")+(x&2?"w":"-")+(x&1?"x":"-")});
    A.push({k:"chmod",t:m[1]+"  "+rw.join(""),rows:[["owner",rw[0]],["group",rw[1]],["others",rw[2]]],href:"tools.html#chmod-calculator",go:"open the chmod calculator"})}
  return A;
}
function drawAnswers(q){
  var A=answers(q);an.replaceChildren();anHref="";anFirst=false;
  A.slice(0,5).forEach(function(a,i){
    var d=document.createElement("div");d.className="a";
    var k=document.createElement("span");k.className="k";k.textContent=a.k;
    var t=document.createElement("b");t.className="t";t.textContent=a.t;d.append(k,t);
    if(a.rows){var dl=document.createElement("dl");a.rows.forEach(function(r){
      var dt=document.createElement("dt");dt.textContent=r[0];var dd=document.createElement("dd"),b=document.createElement("button");b.type="button";b.textContent=r[1];b.title="Copy";
      b.addEventListener("click",function(){if(navigator.clipboard)navigator.clipboard.writeText(r[1]).then(function(){var o=b.textContent;b.textContent="copied";setTimeout(function(){b.textContent=o},900)})});
      dd.append(b);dl.append(dt,dd)});d.append(dl)}
    if(a.text){var p=document.createElement("p");p.textContent=a.text;d.append(p)}
    if(a.href){var g=document.createElement("a");g.className="go";g.href=a.href;g.textContent=a.go+" →";d.append(g);if(i===0){anHref=a.href;anFirst=a.k!=="number"}}
    an.append(d);
  });
  return A.length>0;
}
window.siteAnswers=answers;
function css(){if(document.getElementById("spal-css"))return;var s=document.createElement("style");s.id="spal-css";
s.textContent="#spal{position:fixed;inset:0;z-index:100;background:rgba(7,5,26,.82);display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px;font:14px/1.5 'JetBrains Mono',ui-monospace,monospace}#spal .bx{width:100%;max-width:640px;background:#0d0b2b;border:1px solid #b45cff;border-radius:8px;box-shadow:0 0 40px rgba(180,92,255,.35);overflow:hidden}#spal input{width:100%;box-sizing:border-box;background:transparent;border:0;border-bottom:1px solid #2a2466;color:#d6d9ff;font:inherit;font-size:16px;padding:14px 16px;outline:none}#spal ul{list-style:none;margin:0;padding:6px;max-height:50vh;overflow:auto}#spal li a{display:block;padding:8px 10px;border-radius:6px;color:#d6d9ff;text-decoration:none}#spal li[aria-selected=true] a{background:#1a1650;box-shadow:inset 0 0 0 1px #b45cff}#spal small{color:#8a86c9;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#spal .ty{float:right;color:#4da3ff;font-size:.8rem;margin-left:12px}#spal .ft{padding:8px 16px;border-top:1px solid #2a2466;color:#8a86c9;font-size:.8rem}#spal-an:empty,#spal ul:empty{display:none}#spal-an{max-height:46vh;overflow:auto;border-bottom:1px solid #2a2466;background:#090720}#spal-an .a{padding:12px 16px;border-left:3px solid #ff4fd8}#spal-an .a+.a{border-top:1px solid #2a2466}#spal-an .k{font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:#ff4fd8}#spal-an .t{display:block;color:#d6d9ff;font-weight:700;margin:2px 0 6px}#spal-an dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;margin:0}#spal-an dt{color:#8a86c9}#spal-an dd{margin:0;min-width:0}#spal-an dd button{background:none;border:0;padding:0;color:#4da3ff;font:inherit;text-align:left;cursor:copy;overflow-wrap:anywhere;word-break:break-all}#spal-an dd button:hover,#spal-an dd button:focus-visible{color:#d6d9ff;text-decoration:underline;outline:none}#spal-an p{margin:0;color:#8a86c9}#spal-an .go{display:inline-block;margin-top:8px;color:#b45cff;text-decoration:underline}";
document.head.appendChild(s)}
function open(q){if(ov)return;css();prev=document.activeElement;
ov=document.createElement("div");ov.id="spal";
var bx=document.createElement("div");bx.className="bx";bx.setAttribute("role","dialog");bx.setAttribute("aria-modal","true");bx.setAttribute("aria-label","Search");
inp=document.createElement("input");inp.type="text";inp.placeholder="Search, or paste an IP, domain, JWT, error code, timestamp ...";inp.setAttribute("role","combobox");inp.setAttribute("aria-expanded","true");inp.setAttribute("aria-controls","spal-list");inp.setAttribute("autocomplete","off");inp.spellcheck=false;
ul=document.createElement("ul");ul.id="spal-list";ul.setAttribute("role","listbox");
an=document.createElement("div");an.id="spal-an";an.setAttribute("aria-live","polite");
var ft=document.createElement("div");ft.className="ft";ft.textContent="Enter to open, arrows to move, Esc to close. Click a blue value to copy it.";
bx.append(inp,an,ul,ft);ov.append(bx);document.body.append(ov);
ov.addEventListener("mousedown",function(e){if(e.target===ov)close()});
inp.addEventListener("input",function(){draw(inp.value)});inp.addEventListener("keydown",key);
inp.value=q||"";draw(inp.value);inp.focus()}
function close(){if(!ov)return;ov.remove();ov=null;if(prev&&prev.focus)prev.focus()}
function draw(q){var hasAn=drawAnswers(q);res=q.trim()?find(q,hasAn?6:12):I.filter(function(e){return e[2]==="page"}).slice(0,12);sel=0;ul.replaceChildren();
if(!res.length){if(hasAn){inp.removeAttribute("aria-activedescendant");return}var n=document.createElement("li");n.style.cssText="padding:10px;color:#8a86c9";n.textContent="No results.";ul.append(n);inp.removeAttribute("aria-activedescendant");return}
res.forEach(function(e,i){var li=document.createElement("li");li.id="spal-"+i;li.setAttribute("role","option");li.setAttribute("aria-selected",i===0?"true":"false");
var a=document.createElement("a");a.href=e[1];var ty=document.createElement("span");ty.className="ty";ty.textContent=e[2];var b=document.createElement("b");b.textContent=e[0];a.append(ty,b);
if(e[3]){var sm=document.createElement("small");sm.textContent=e[3];a.append(sm)}
li.append(a);li.addEventListener("mousemove",function(){mark(i)});ul.append(li)});
inp.setAttribute("aria-activedescendant","spal-0")}
function mark(i){var c=ul.children;if(!c[sel]||!c[i])return;c[sel].setAttribute("aria-selected","false");sel=i;c[i].setAttribute("aria-selected","true");inp.setAttribute("aria-activedescendant","spal-"+i);c[i].scrollIntoView({block:"nearest"})}
function key(e){if(e.key==="Escape"){e.preventDefault();close()}else if(e.key==="ArrowDown"){e.preventDefault();mark(Math.min(sel+1,res.length-1))}else if(e.key==="ArrowUp"){e.preventDefault();mark(Math.max(sel-1,0))}else if(e.key==="Enter"){e.preventDefault();if(anHref&&(!res.length||sel===0&&anFirst))location.href=anHref;else if(res[sel])location.href=res[sel][1]}else if(e.key==="Tab"){e.preventDefault()}}
document.addEventListener("keydown",function(e){var k=(e.key||"").toLowerCase();
if((e.ctrlKey||e.metaKey)&&k==="k"){e.preventDefault();ov?close():open();return}
if(k==="/"&&!ov){var t=e.target,n=t&&t.tagName;if(n==="INPUT"||n==="TEXTAREA"||n==="SELECT"||(t&&t.isContentEditable))return;e.preventDefault();open()}});
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-search]");if(t){e.preventDefault();open()}});
window.siteSearch=find;window.openPalette=open;
})();
