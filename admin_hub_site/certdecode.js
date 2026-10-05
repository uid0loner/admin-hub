(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}

/* ---------- names for the numbers ---------- */
var DN={"2.5.4.3":"CN","2.5.4.6":"C","2.5.4.7":"L","2.5.4.8":"ST","2.5.4.10":"O","2.5.4.11":"OU","2.5.4.5":"serialNumber","2.5.4.15":"businessCategory","2.5.4.9":"street","2.5.4.17":"postalCode",
 "1.2.840.113549.1.9.1":"emailAddress","0.9.2342.19200300.100.1.25":"DC","0.9.2342.19200300.100.1.1":"UID","1.3.6.1.4.1.311.60.2.1.3":"jurisdictionC","1.3.6.1.4.1.311.60.2.1.2":"jurisdictionST"};
var SIG={"1.2.840.113549.1.1.4":["MD5 with RSA","rsa","MD5"],"1.2.840.113549.1.1.5":["SHA-1 with RSA","rsa","SHA-1"],"1.2.840.113549.1.1.11":["SHA-256 with RSA","rsa","SHA-256"],"1.2.840.113549.1.1.12":["SHA-384 with RSA","rsa","SHA-384"],
 "1.2.840.113549.1.1.13":["SHA-512 with RSA","rsa","SHA-512"],"1.2.840.113549.1.1.10":["RSA-PSS","pss",""],"1.2.840.10045.4.1":["ECDSA with SHA-1","ec","SHA-1"],"1.2.840.10045.4.3.2":["ECDSA with SHA-256","ec","SHA-256"],
 "1.2.840.10045.4.3.3":["ECDSA with SHA-384","ec","SHA-384"],"1.2.840.10045.4.3.4":["ECDSA with SHA-512","ec","SHA-512"],"1.3.101.112":["Ed25519","ed",""],"1.3.101.113":["Ed448","ed",""]};
var CURVE={"1.2.840.10045.3.1.7":["P-256",256,32],"1.3.132.0.34":["P-384",384,48],"1.3.132.0.35":["P-521",521,66],"1.3.132.0.10":["secp256k1",256,32]};
var EKU={"1.3.6.1.5.5.7.3.1":"server authentication","1.3.6.1.5.5.7.3.2":"client authentication","1.3.6.1.5.5.7.3.3":"code signing","1.3.6.1.5.5.7.3.4":"email protection","1.3.6.1.5.5.7.3.8":"time stamping","1.3.6.1.5.5.7.3.9":"OCSP signing",
 "1.3.6.1.4.1.311.20.2.2":"smart card logon","1.3.6.1.5.2.3.5":"KDC authentication","2.5.29.37.0":"any purpose","1.3.6.1.4.1.311.10.3.4":"encrypting file system","1.3.6.1.5.5.7.3.17":"IPsec IKE"};
var KU=["digital signature","non-repudiation","key encipherment","data encipherment","key agreement","certificate signing","CRL signing","encipher only","decipher only"];
var POLICY={"2.23.140.1.2.1":"domain validated (DV)","2.23.140.1.2.2":"organisation validated (OV)","2.23.140.1.2.3":"individual validated (IV)","2.23.140.1.1":"extended validation (EV)"};

/* ---------- DER ---------- */
function der(b,pos,end){
  if(pos+2>end)throw new Error("the data ends in the middle of a field");
  var first=b[pos],tag=first&31,p=pos+1,len=b[p++];
  if(tag===31)throw new Error("unsupported tag");
  if(len&128){var n=len&127;if(n===0||n>4)throw new Error("unsupported length");len=0;for(var i=0;i<n;i++)len=len*256+b[p++]}
  if(p+len>end)throw new Error("a field is longer than the data");
  return {tag:tag,cls:first>>6,cons:!!(first&32),start:p,end:p+len,pos:pos};
}
function kids(b,n){var o=[],p=n.start;while(p<n.end){var c=der(b,p,n.end);o.push(c);p=c.end}return o}
function raw(b,n){return b.subarray(n.pos,n.end)}
function body(b,n){return b.subarray(n.start,n.end)}
function oid(b,n){var v=body(b,n),o=[Math.floor(v[0]/40),v[0]%40],x=0;if(o[0]>2){o[1]+=(o[0]-2)*40;o[0]=2}for(var i=1;i<v.length;i++){x=x*128+(v[i]&127);if(!(v[i]&128)){o.push(x);x=0}}return o.join(".")}
function hex(v,sep){var s=[];for(var i=0;i<v.length;i++)s.push((v[i]<16?"0":"")+v[i].toString(16));return s.join(sep===undefined?":":sep).toUpperCase()}
function str(b,n){var v=body(b,n);if(n.tag===30){var s="";for(var i=0;i+1<v.length;i+=2)s+=String.fromCharCode(v[i]*256+v[i+1]);return s}
  try{return new TextDecoder(n.tag===12?"utf-8":"latin1",{fatal:false}).decode(v)}catch(e){return String.fromCharCode.apply(null,v)}}
function time(b,n){var s=str(b,n),m;if(n.tag===23){m=/^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/.exec(s);if(!m)return NaN;var y=+m[1];return Date.UTC(y<50?2000+y:1900+y,m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0))}
  m=/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?/.exec(s);return m?Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0)):NaN}
function name(b,n){var parts=[],o={};kids(b,n).forEach(function(set){kids(b,set).forEach(function(av){var k=kids(b,av),id=oid(b,k[0]),key=DN[id]||id,val=str(b,k[1]);parts.push(key+"="+val);if(!o[key])o[key]=val})});return {text:parts.join(", "),o:o,der:hex(raw(b,n),"")}}
function bitlen(v){var i=0;while(i<v.length&&v[i]===0)i++;if(i===v.length)return 0;var top=v[i],n=(v.length-i)*8;while(!(top&128)){top<<=1;n--}return n}
function ipText(v){if(v.length===4)return Array.prototype.join.call(v,".");if(v.length===16){var s=[];for(var i=0;i<16;i+=2)s.push((v[i]*256+v[i+1]).toString(16));return s.join(":").replace(/(^|:)0(:0)+(:|$)/,"::")}return hex(v)}
function generalNames(b,n){var o=[];kids(b,n).forEach(function(g){if(g.cls!==2)return;var v=body(b,g);if(g.tag===2)o.push(["DNS",str(b,{tag:22,start:g.start,end:g.end})]);else if(g.tag===7)o.push(["IP",ipText(v)]);else if(g.tag===1)o.push(["email",str(b,{tag:22,start:g.start,end:g.end})]);else if(g.tag===6)o.push(["URI",str(b,{tag:22,start:g.start,end:g.end})]);else o.push(["other","(type "+g.tag+")"])});return o}
function uris(b,n,out){if(n.cls===2&&n.tag===6&&!n.cons){out.push(str(b,{tag:22,start:n.start,end:n.end}));return}if(n.cons)kids(b,n).forEach(function(c){uris(b,c,out)})}

function spki(b,n,c){
  var k=kids(b,n),alg=kids(b,k[0]),id=oid(b,alg[0]),key=body(b,k[1]).subarray(1);
  c.spki=raw(b,n);
  if(id==="1.2.840.113549.1.1.1"){var rs=kids(key,der(key,0,key.length)),mod=key.subarray(rs[0].start,rs[0].end);c.keyType="RSA";c.keyBits=bitlen(mod);c.keyText="RSA "+c.keyBits+" bit";
    var e=0,ev=key.subarray(rs[1].start,rs[1].end);for(var i=0;i<ev.length&&i<6;i++)e=e*256+ev[i];c.keyExp=e}
  else if(id==="1.2.840.10045.2.1"){var cv=alg[1]&&alg[1].tag===6?oid(b,alg[1]):"";c.keyType="EC";c.curve=CURVE[cv]?CURVE[cv][0]:cv||"unknown curve";c.keyBits=CURVE[cv]?CURVE[cv][1]:0;c.keyText="ECDSA "+c.curve}
  else if(id==="1.3.101.112"){c.keyType="Ed25519";c.keyBits=256;c.keyText="Ed25519"}
  else{c.keyType=id;c.keyBits=0;c.keyText="key type "+id}
}
function extensions(b,list,c){
  kids(b,list).forEach(function(x){
    var k=kids(b,x),id=oid(b,k[0]),crit=k.length===3,val=k[k.length-1],inner;
    try{inner=der(b,val.start,val.end)}catch(e){return}
    if(id==="2.5.29.17")c.san=generalNames(b,inner);
    else if(id==="2.5.29.19"){c.bc=true;c.ca=false;kids(b,inner).forEach(function(z){if(z.tag===1)c.ca=b[z.start]!==0;else if(z.tag===2)c.pathLen=b[z.start]})}
    else if(id==="2.5.29.15"){var v=body(b,inner),bits=[];for(var i=0;i<9;i++){var byte=v[1+(i>>3)];if(byte!==undefined&&(byte&(128>>(i&7))))bits.push(KU[i])}c.ku=bits}
    else if(id==="2.5.29.37")c.eku=kids(b,inner).map(function(z){var o=oid(b,z);return EKU[o]||o});
    else if(id==="2.5.29.14")c.ski=hex(body(b,inner));
    else if(id==="2.5.29.35")kids(b,inner).forEach(function(z){if(z.cls===2&&z.tag===0)c.aki=hex(body(b,z))});
    else if(id==="1.3.6.1.5.5.7.1.1")kids(b,inner).forEach(function(ad){var a=kids(b,ad),m=oid(b,a[0]),u=[];uris(b,a[1],u);if(u.length){if(m==="1.3.6.1.5.5.7.48.1")c.ocsp=u[0];else if(m==="1.3.6.1.5.5.7.48.2")c.caIssuers=u[0]}});
    else if(id==="2.5.29.31"){var u=[];uris(b,inner,u);c.crl=u}
    else if(id==="2.5.29.32")c.policy=kids(b,inner).map(function(p){var o=oid(b,kids(b,p)[0]);return POLICY[o]||o});
    else if(id==="1.3.6.1.4.1.11129.2.4.2")c.sct=true;
    else if(crit)(c.unknownCritical=c.unknownCritical||[]).push(id);
  });
}
function parseCert(b){
  var root=der(b,0,b.length),top=kids(b,root);if(root.tag!==16||top.length<3)throw new Error("this is not a certificate");
  var tbs=kids(b,top[0]),i=0,c={kind:"cert",san:[],crl:[],size:root.end};
  if(tbs[0].cls===2&&tbs[0].tag===0){c.version=b[kids(b,tbs[0])[0].start]+1;i=1}else c.version=1;
  c.serial=hex(body(b,tbs[i]));c.subject=null;
  var sa=oid(b,kids(b,top[1])[0]);c.sigOid=sa;c.sig=SIG[sa]||["algorithm "+sa,"",""];
  c.issuer=name(b,tbs[i+2]);var val=kids(b,tbs[i+3]);c.from=time(b,val[0]);c.to=time(b,val[1]);c.subject=name(b,tbs[i+4]);
  spki(b,tbs[i+5],c);
  for(var j=i+6;j<tbs.length;j++)if(tbs[j].cls===2&&tbs[j].tag===3)extensions(b,kids(b,tbs[j])[0],c);
  c.tbs=raw(b,top[0]);c.sigValue=body(b,top[2]).subarray(1);c.selfSigned=c.subject.der===c.issuer.der;c.derBytes=b.subarray(0,root.end);
  return c;
}
function parseCsr(b){
  var root=der(b,0,b.length),top=kids(b,root),info=kids(b,top[0]),c={kind:"csr",san:[],crl:[],size:root.end};
  c.subject=name(b,info[1]);c.issuer=c.subject;spki(b,info[2],c);var sa=oid(b,kids(b,top[1])[0]);c.sig=SIG[sa]||["algorithm "+sa,"",""];
  if(info[3])kids(b,info[3]).forEach(function(at){var a=kids(b,at);if(oid(b,a[0])==="1.2.840.113549.1.9.14")extensions(b,kids(b,a[1])[0],c)});
  c.tbs=raw(b,top[0]);c.sigValue=body(b,top[2]).subarray(1);c.derBytes=b.subarray(0,root.end);
  return c;
}
function b64(s){var bin=atob(s.replace(/[^A-Za-z0-9+\/=]/g,"")),o=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)o[i]=bin.charCodeAt(i);return o}
function parseAll(text){
  var out=[],keys=0,other=[],re=/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g,m,found=false;
  while((m=re.exec(text))){found=true;var label=m[1];
    if(/PRIVATE KEY/.test(label)){keys++;continue}
    try{if(label==="CERTIFICATE"||label==="X509 CERTIFICATE"||label==="TRUSTED CERTIFICATE")out.push(parseCert(b64(m[2])));else if(/CERTIFICATE REQUEST/.test(label))out.push(parseCsr(b64(m[2])));else other.push(label)}
    catch(e){other.push(label+" (could not be read: "+e.message+")")}}
  if(!found){var t=text.replace(/\s+/g,"");if(/^MI[A-Za-z0-9+\/=]{100,}$/.test(t))out.push(parseCert(b64(t)));else throw new Error("no certificate found. Paste the text that starts with -----BEGIN CERTIFICATE-----")}
  return {certs:out,keys:keys,other:other};
}

/* ---------- signature check with the browser's own crypto ---------- */
function verify(child,parent){
  var s=child.sig,sub=window.crypto&&window.crypto.subtle;if(!sub||!s[2]||(s[1]!=="rsa"&&s[1]!=="ec"))return Promise.resolve(null);
  var alg,sig=child.sigValue;
  if(s[1]==="rsa"){if(parent.keyType!=="RSA")return Promise.resolve(false);alg={name:"RSASSA-PKCS1-v1_5",hash:s[2]}}
  else{if(parent.keyType!=="EC")return Promise.resolve(false);var cv=null;Object.keys(CURVE).forEach(function(k){if(CURVE[k][0]===parent.curve)cv=CURVE[k]});if(!cv||cv[0]==="secp256k1")return Promise.resolve(null);
    alg={name:"ECDSA",namedCurve:cv[0],hash:s[2]};
    try{var q=kids(sig,der(sig,0,sig.length)),rawSig=new Uint8Array(cv[2]*2);[0,1].forEach(function(i){var v=sig.subarray(q[i].start,q[i].end);while(v.length>cv[2]&&v[0]===0)v=v.subarray(1);rawSig.set(v,cv[2]*(i+1)-v.length)});sig=rawSig}catch(e){return Promise.resolve(null)}}
  return sub.importKey("spki",parent.spki,alg,false,["verify"]).then(function(k){return sub.verify(alg,k,sig,child.tbs)}).catch(function(){return null});
}
function fingerprints(c){var sub=window.crypto&&window.crypto.subtle;if(!sub)return Promise.resolve();
  return Promise.all([sub.digest("SHA-256",c.derBytes),sub.digest("SHA-1",c.derBytes)]).then(function(r){c.fp256=hex(new Uint8Array(r[0]));c.fp1=hex(new Uint8Array(r[1]))}).catch(function(){})}

/* ---------- reading the result ---------- */
var DAY=864e5;
function d(ms){return isNaN(ms)?"unreadable date":new Date(ms).toISOString().slice(0,10)}
function label(c){return c.subject.o.CN||c.subject.o.O||c.subject.text||"(empty subject)"}
function hostMatch(host,pattern){host=host.toLowerCase().replace(/\.$/,"");pattern=pattern.toLowerCase();if(host===pattern)return true;
  if(pattern.indexOf("*.")===0){var rest=pattern.slice(1);return host.length>rest.length&&host.slice(-rest.length)===rest&&host.slice(0,-rest.length).indexOf(".")<0}return false}
function role(c){return c.kind==="csr"?"request":c.selfSigned&&c.ca?"root":c.ca?"intermediate":c.selfSigned?"self-signed":"leaf"}
function analyse(P,now,host){
  var certs=P.certs.filter(function(c){return c.kind==="cert"}),F=[];
  function add(sev,title,text){F.push({sev:sev,title:title,text:text})}
  if(P.keys)add("crit","You pasted a private key","The key was not read and nothing left your browser, but a private key should never be pasted into a website, this one included. If this key protects anything real and you are not sure where else it has been, replace the certificate with a new key.");
  /* order the chain */
  var leaf=certs.filter(function(c){return !certs.some(function(o){return o!==c&&o.issuer.der===c.subject.der})&&!c.ca})[0]||certs.filter(function(c){return !certs.some(function(o){return o!==c&&o.issuer.der===c.subject.der&&!o.selfSigned})})[0]||certs[0];
  var chain=[],seen=[],cur=leaf;
  while(cur&&seen.indexOf(cur)<0){chain.push(cur);seen.push(cur);if(cur.selfSigned)break;var is=cur;cur=certs.filter(function(o){return o!==is&&o.subject.der===is.issuer.der&&(!is.aki||!o.ski||is.aki===o.ski)})[0]}
  var stray=certs.filter(function(c){return chain.indexOf(c)<0});
  if(leaf){
    var left=Math.floor((leaf.to-now)/DAY),life=Math.round((leaf.to-leaf.from)/DAY);
    if(now>leaf.to)add("crit","Expired "+plural(-left,"day")+" ago","Valid until "+d(leaf.to)+". Every browser and most clients refuse the connection. Renew and install it, including the intermediate certificate.");
    else if(now<leaf.from)add("high","Not valid yet","It becomes valid on "+d(leaf.from)+". If that is today or yesterday, the clock of the client or the server is wrong.");
    else if(left<=14)add("high","Expires in "+plural(left,"day"),"Valid until "+d(leaf.to)+". Renew it now. After the renewal, check that the server really serves the new certificate, a restart or reload is the step that gets forgotten.");
    else if(left<=30)add("med","Expires in "+plural(left,"day"),"Valid until "+d(leaf.to)+". Plan the renewal this week.");
    var dns=leaf.san.filter(function(s){return s[0]==="DNS"||s[0]==="IP"});
    if(host){var ok=dns.some(function(s){return s[0]==="DNS"?hostMatch(host,s[1]):s[1]===host});
      if(!ok)add("crit","Not valid for "+host,dns.length?"The certificate lists "+dns.map(function(s){return s[1]}).join(", ")+". A wildcard covers exactly one level: *.example.org matches www.example.org, but neither example.org nor a.b.example.org.":"The certificate has no subject alternative names at all.");
      else add("info","Valid for "+host,"The name matches an entry in the subject alternative names.")}
    if(!dns.length&&!leaf.ca&&(!leaf.eku||leaf.eku.indexOf("server authentication")>=0))add("high","No subject alternative names","Browsers ignore the common name and look only at the subject alternative names. Without them this certificate is accepted for no host name. Issue it again with the names in the SAN field.");
    if(leaf.selfSigned&&!leaf.ca)add("med","Self-signed","Nobody vouches for this certificate except itself, so every client shows a warning unless the certificate is installed as trusted by hand. Fine for a lab, not for anything users open.");
    if(leaf.eku&&leaf.eku.indexOf("server authentication")<0&&leaf.eku.indexOf("any purpose")<0&&!leaf.ca)add("med","Not issued for servers","The extended key usage is: "+leaf.eku.join(", ")+". A web or mail server needs server authentication.");
    if(!leaf.ca&&!leaf.selfSigned&&now<=leaf.to){var lim=leaf.from>=Date.UTC(2029,2,15)?47:leaf.from>=Date.UTC(2027,2,15)?100:leaf.from>=Date.UTC(2026,2,15)?200:398;
      if(life>lim+1)add("info","Runs for "+life+" days","Public certificate authorities may issue at most "+lim+" days at this issue date, so this comes from an internal CA or browsers will reject it. For an internal CA it is your own decision.");
      add("info","Lifetimes are getting shorter","Publicly trusted certificates may run 200 days at most since March 2026, 100 days from March 2027 and 47 days from March 2029. Renewing by hand stops being realistic: set up automatic renewal (ACME) for everything that supports it.")}
    if(leaf.san.some(function(s){return s[0]==="DNS"&&s[1].indexOf("*")>=0}))add("info","Wildcard certificate","One key for many hosts: if one server is compromised, all names are. Keep the key on as few machines as possible.");
  }
  certs.forEach(function(c){var who=certs.length>1?" ("+label(c)+")":"";
    if(c.sig[2]==="SHA-1"||c.sig[2]==="MD5"){if(!(c.selfSigned&&c.ca))add("high","Signed with "+c.sig[2]+who,"This hash is broken for signatures and clients reject it. Issue the certificate again with SHA-256.")}
    if(c.keyType==="RSA"&&c.keyBits<2048)add("high","RSA key with only "+c.keyBits+" bit"+who,"Below 2048 bit is no longer accepted. Create a new key with 2048 or 3072 bit, or use an EC key.");
    if(c!==leaf&&now>c.to)add("crit","A CA certificate in the chain has expired"+who,"Valid until "+d(c.to)+". Everything issued below it fails. Get the current intermediate from your certificate authority.");
    if(c.unknownCritical)add("info","Critical extension this page does not know"+who,c.unknownCritical.join(", ")+". Clients that do not know it either must reject the certificate.");
  });
  /* chain shape */
  if(certs.length>1){
    var pasted=certs.map(label).join(" → "),right=chain.map(label).join(" → ");
    if(chain.length===certs.length&&chain.some(function(c,i){return c!==certs[i]}))add("high","The chain is in the wrong order","Pasted: "+pasted+". It has to be: "+right+". Strict clients (Java, some appliances, older OpenSSL) fail on a chain that is out of order, while browsers silently repair it, which is why it works for you and not for the application.");
    var twin=stray.filter(function(c){return chain.some(function(x){return x.issuer.der===c.subject.der})});
    if(twin.length){add("high","An issuer with the right name but the wrong key","\""+label(twin[0])+"\" has the name the certificate asks for, but its key ID is a different one. This is usually an older or a newer intermediate with the same name. Download the one that matches from your certificate authority.");stray=stray.filter(function(c){return twin.indexOf(c)<0})}
    if(stray.length)add("med","Certificates that do not belong to this chain",stray.map(label).join(", ")+". They are not the issuer of anything here. Take them out of the file.");
    if(chain.length>1&&chain[chain.length-1].selfSigned&&chain[chain.length-1].ca)add("info","The root certificate is included","Clients only trust the roots in their own store, a root sent by the server is ignored. Leaving it out saves a little on every handshake. Not an error.");
  }
  var last=chain[chain.length-1];
  if(last&&!last.selfSigned&&leaf&&!leaf.selfSigned){
    if(chain.length===1)add("info","Only the leaf certificate was pasted","It was issued by \""+(leaf.issuer.o.CN||leaf.issuer.text)+"\". A server has to send that intermediate along, otherwise clients that have never seen it fail with \"unable to get local issuer certificate\". If this is your server file, add the intermediate below the certificate."+(leaf.caIssuers?" The certificate says where to get it: "+leaf.caIssuers:""));
  }
  var rank={crit:0,high:1,med:2,info:3};F.sort(function(a,b){return rank[a.sev]-rank[b.sev]});
  return {findings:F,chain:chain,stray:stray,leaf:leaf,worst:F.length?F[0].sev:"none",csr:P.certs.filter(function(c){return c.kind==="csr"}),other:P.other};
}
function plural(n,w){return n+" "+(n===1?w:w+"s")}

/* ---------- rendering ---------- */
function kv(rows){var t=el("table","tbl cdkv"),b=el("tbody");rows.forEach(function(r){if(r[1]===undefined||r[1]===null||r[1]==="")return;var tr=el("tr");tr.append(el("th",null,r[0]));var td=el("td");
  if(Array.isArray(r[1]))r[1].forEach(function(x){td.append(el("div",null,x))});else td.textContent=r[1];tr.append(td);b.append(tr)});t.append(b);var w=el("div","tw");w.append(t);return w}
function details(c,now){
  var left=Math.floor((c.to-now)/DAY),rows=[["Subject",c.subject.text||"(empty)"]];
  if(c.kind==="cert")rows.push(["Issuer",c.selfSigned?"itself (self-signed)":c.issuer.text],["Valid from",d(c.from)],["Valid until",d(c.to)+(now>c.to?" (expired)":" ("+plural(left,"day")+" left)")],["Serial number",c.serial]);
  rows.push(["Names (SAN)",c.san.length?c.san.map(function(s){return s[0]+": "+s[1]}):c.kind==="cert"?"none":""],["Key",c.keyText+(c.keyExp&&c.keyExp!==65537?", exponent "+c.keyExp:"")],["Signature",c.sig[0]],
   ["Certificate authority",c.kind!=="cert"?"":c.ca?"yes"+(c.pathLen!==undefined?", may issue "+(c.pathLen===0?"only end certificates":"CAs "+c.pathLen+" level"+(c.pathLen===1?"":"s")+" deep"):""):"no"],
   ["Key usage",c.ku&&c.ku.join(", ")],["Extended key usage",c.eku&&c.eku.join(", ")],["Policy",c.policy&&c.policy.join(", ")],["OCSP",c.ocsp],["Issuer certificate",c.caIssuers],["Revocation list",c.crl.join(", ")],
   ["Certificate Transparency",c.kind==="cert"&&!c.ca?(c.sct?"logged (carries signed timestamps)":"no timestamps embedded"):""],["Subject key ID",c.ski],["Authority key ID",c.aki],["SHA-256 fingerprint",c.fp256],["SHA-1 fingerprint",c.fp1]);
  return kv(rows);
}
var state={text:"",now:null,name:""};
function render(P,R,now,links){
  var out=$("cd-out");out.replaceChildren();var leaf=R.leaf;
  if(leaf){
    var left=Math.floor((leaf.to-now)/DAY),v=el("div","verdict v-"+(R.worst==="info"||R.worst==="none"?"none":R.worst));
    v.append(el("b",null,now>leaf.to?"Expired "+plural(-left,"day")+" ago":now<leaf.from?"Not valid yet":plural(left,"day")+" left"),el("span",null,label(leaf)+" · valid until "+d(leaf.to)+" · issued by "+(leaf.selfSigned?"itself":leaf.issuer.o.CN||leaf.issuer.o.O||"unknown")));
    out.append(v);
    var st=el("div","stats");st.style.setProperty("--cols","4");
    function tile(k,val,s){var x=el("div","stat"),bv=el("b","stat-v",val);bv.setAttribute("data-raw","");x.append(el("span","stat-k",k),bv);if(s)x.append(el("span","stat-s",s));return x}
    var names=leaf.san.filter(function(s){return s[0]==="DNS"||s[0]==="IP"});
    st.append(tile("valid until",d(leaf.to),"since "+d(leaf.from)),tile("names",String(names.length),names.slice(0,2).map(function(s){return s[1]}).join(", ")+(names.length>2?" ...":"")),tile("key",leaf.keyType==="RSA"?"RSA "+leaf.keyBits:leaf.keyType==="EC"?leaf.curve:leaf.keyType,leaf.sig[0]),tile("chain",plural(R.chain.length,"certificate"),R.chain.length>1?"up to "+label(R.chain[R.chain.length-1]):"leaf only"));
    out.append(st);
  }else if(R.csr.length){var v2=el("div","verdict v-none");v2.append(el("b",null,"Certificate request"),el("span",null,"not a certificate yet: this is what you send to the certificate authority"));out.append(v2)}
  if(state.sample)out.append(el("p","note","The sample is judged as of "+d(now)+", so it looks the same whenever you open it."));
  if(R.chain.length){
    out.append(el("h2",null,"the chain"));var ch=el("div","cdchain");
    R.chain.forEach(function(c,i){var card=el("div","cdcard r-"+role(c).replace(/[^a-z]/g,""));card.append(el("span","cdrole",role(c)),el("b",null,label(c)),el("span","cdmeta",c.keyText+" · until "+d(c.to)+(now>c.to?" · expired":"")));ch.append(card);
      if(i<R.chain.length-1||!c.selfSigned){var lk=links[i],a=el("div","cdlink "+(lk===true?"ok":lk===false?"bad":"unk"));
        a.textContent=i<R.chain.length-1?(lk===true?"signature checks out: signed by":lk===false?"signature does NOT match: claims to be signed by":"signed by (signature not checked)"):"issued by \""+(c.issuer.o.CN||c.issuer.text)+"\", which is not in what you pasted";ch.append(a)}
      else if(c.selfSigned){var s=el("div","cdlink "+(links[i]===true?"ok":links[i]===false?"bad":"unk"),links[i]===true?"signed by itself, signature checks out":links[i]===false?"signed by itself, but the signature does not match":"signed by itself");ch.append(s)}});
    out.append(ch);
  }
  out.append(el("h2",null,"findings"));
  if(!R.findings.length)out.append(el("p","dim","Nothing stands out. This page cannot see whether the certificate has been revoked or whether your clients trust the root."));
  R.findings.forEach(function(f){var dd=el("details","finding"),s=el("summary");s.append(el("span","sevtag s-"+f.sev,{crit:"critical",high:"high",med:"medium",info:"info"}[f.sev]),el("b",null,f.title));dd.append(s,el("p",null,f.text));if(f.sev==="crit"||f.sev==="high")dd.open=true;out.append(dd)});
  if(R.other.length)out.append(el("p","note","Also in the text and not read: "+R.other.join(", ")+"."));
  out.append(el("h2",null,"what is inside"));
  R.chain.concat(R.stray,R.csr).forEach(function(c,i){var dd=el("details","finding cddet"),s=el("summary");s.append(el("span","sevtag s-info",role(c)),el("b",null,label(c)));dd.append(s,details(c,now));if(i===0)dd.open=true;out.append(dd)});
  out.hidden=false;
}
function run(text,name,nowOverride){
  var st=$("cd-status"),out=$("cd-out");
  try{
    var P=parseAll(text),now=nowOverride||Date.now(),host=$("cd-host").value.trim().replace(/^https?:\/\//,"").replace(/[\/:].*$/,"");
    if(!P.certs.length&&!P.keys)throw new Error(P.other.length?"found "+P.other.join(", ")+", but no certificate":"no certificate found");
    var R=analyse(P,now,host);state.text=text;state.now=nowOverride||null;state.sample=!!nowOverride;state.name=name;
    var jobs=P.certs.map(fingerprints),links=[];
    R.chain.forEach(function(c,i){var parent=R.chain[i+1]||(c.selfSigned?c:null);jobs.push(parent?verify(c,parent).then(function(ok){links[i]=ok}):Promise.resolve())});
    Promise.all(jobs).then(function(){
      links.forEach(function(ok,i){if(ok===false)R.findings.unshift({sev:"crit",title:"A signature in the chain does not match",text:"\""+label(R.chain[i])+"\" claims to be issued by \""+label(R.chain[i+1]||R.chain[i])+"\", but that key did not sign it. The names fit, the keys do not: this is the wrong intermediate, often an older one with the same name."})});
      if(links.some(function(x){return x===false}))R.worst="crit";
      st.textContent=plural(P.certs.length,"item")+" read from "+name+"."+(P.keys?" A private key was skipped.":"");
      render(P,R,now,links);
      if(!run.quiet)out.scrollIntoView({behavior:"smooth",block:"start"});run.quiet=false;
    });
  }catch(e){out.hidden=true;st.textContent="Could not read that: "+e.message+"."}
}
var SAMPLE_NOW=Date.UTC(2026,9,6),SAMPLE="-----BEGIN CERTIFICATE-----\nMIIDzDCCA3KgAwIBAgIUMG35qni8F/QyHt9TTLciPZV1RUEwCgYIKoZIzj0EAwIw\nTTELMAkGA1UEBhMCREUxHzAdBgNVBAoMFkV4YW1wbGUgVHJ1c3QgU2VydmljZXMx\nHTAbBgNVBAMMFEV4YW1wbGUgSXNzdWluZyBDQSAyMB4XDTI2MTAwNTEyMzUzNVoX\nDTI2MTAyNjEyMzUzNVowUDELMAkGA1UEBhMCREUxEDAOBgNVBAcMB0hhbWJ1cmcx\nFTATBgNVBAoMDEV4YW1wbGUgR21iSDEYMBYGA1UEAwwPd3d3LmV4YW1wbGUub3Jn\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAi2vd/D8vj8Lyl4U0ZGRl\nehfyXIJgdtR+Gt34hWc1oy9bSV0l1haPKO+uhQPT4r6Rji6+d6DDJgGyPtA1Ap4P\nyGlLN6xaw6lZqMYP9K8BmWjpgrQt4PJ2u6szCTLsvn6HaCZZdS71mE0xpL0hJbdU\np7klodAXIYfCc7KMfP2PycmaURk+hjJFnDvqIgjvuz/RpwgHnGje3e6AyOaI3KJn\nVqScfC+8j+6YK8+cWcLgwCHH3VsLAcmH02XyQ1dG155wnt18S9v/YVD7gEgPixrE\nPWwc5V+c2GnFJEYojvDyfNEL1qal8yTkpLZU/GgbdOgFpYTDF4lu94Uxr2JiW4Q6\nXwIDAQABo4IBYDCCAVwwDAYDVR0TAQH/BAIwADAOBgNVHQ8BAf8EBAMCBaAwHQYD\nVR0lBBYwFAYIKwYBBQUHAwEGCCsGAQUFBwMCMEEGA1UdEQQ6MDiCD3d3dy5leGFt\ncGxlLm9yZ4ILZXhhbXBsZS5vcmeCEiouc2hvcC5leGFtcGxlLm9yZ4cEwAACCjAd\nBgNVHQ4EFgQUDHbOAHBkJwg/YGLbxP6tXJSPwTMwHwYDVR0jBBgwFoAUbelMMPnO\ngyS7QopFPpXcreo2RtEwZAYIKwYBBQUHAQEEWDBWMCMGCCsGAQUFBzABhhdodHRw\nOi8vb2NzcC5leGFtcGxlLm9yZzAvBggrBgEFBQcwAoYjaHR0cDovL3BraS5leGFt\ncGxlLm9yZy9pc3N1aW5nMi5jcnQwNAYDVR0fBC0wKzApoCegJYYjaHR0cDovL3Br\naS5leGFtcGxlLm9yZy9pc3N1aW5nMi5jcmwwCgYIKoZIzj0EAwIDSAAwRQIgb0DE\nIJBXXACYye8gboT2ugWvLERt1fYVB/L7KDMaBDsCIQCrNK89VnDNFl55qqatSJ11\nflVkNribgRa9xkw6nRFrIw==\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nMIIB+jCCAaGgAwIBAgIUJ+Pt0jYaA/KQtTTA/B9uMZsK8TcwCgYIKoZIzj0EAwIw\nSzELMAkGA1UEBhMCREUxHzAdBgNVBAoMFkV4YW1wbGUgVHJ1c3QgU2VydmljZXMx\nGzAZBgNVBAMMEkV4YW1wbGUgUm9vdCBDQSBSMTAeFw0yNjEwMDUxMjM1MzRaFw0z\nNjEwMDIxMjM1MzRaMEsxCzAJBgNVBAYTAkRFMR8wHQYDVQQKDBZFeGFtcGxlIFRy\ndXN0IFNlcnZpY2VzMRswGQYDVQQDDBJFeGFtcGxlIFJvb3QgQ0EgUjEwWTATBgcq\nhkjOPQIBBggqhkjOPQMBBwNCAATwV55DbIHseo2LHgiNeBFuv31dHBkcePIGAasn\nO+BVzW/umdKD9CMbLLqZHbuT4mPNdF66d9YE+ZbZStNPZE/Ao2MwYTAdBgNVHQ4E\nFgQU23qUQgL7aMuae5qM0cLLWNAuZFwwHwYDVR0jBBgwFoAU23qUQgL7aMuae5qM\n0cLLWNAuZFwwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAQYwCgYIKoZI\nzj0EAwIDRwAwRAIgKIiUeATmtPFiY/djeP18YYFmg/oAmTwiGhEDBx5HQRsCIHw3\nXvAZy60z3b2W4186ktNOxuSJS6R6J2FdPlLqvccJ\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nMIIB/zCCAaagAwIBAgIUOO4Mb66G64dTUKoNmQbwVJ0pOCUwCgYIKoZIzj0EAwIw\nSzELMAkGA1UEBhMCREUxHzAdBgNVBAoMFkV4YW1wbGUgVHJ1c3QgU2VydmljZXMx\nGzAZBgNVBAMMEkV4YW1wbGUgUm9vdCBDQSBSMTAeFw0yNjEwMDUxMjM1MzRaFw0z\nMTEwMDQxMjM1MzRaME0xCzAJBgNVBAYTAkRFMR8wHQYDVQQKDBZFeGFtcGxlIFRy\ndXN0IFNlcnZpY2VzMR0wGwYDVQQDDBRFeGFtcGxlIElzc3VpbmcgQ0EgMjBZMBMG\nByqGSM49AgEGCCqGSM49AwEHA0IABMueaL6OWa2ZFm9hY3evFUSA8zkI550gsWdm\niQae7pAyRr6OxuEiTH2Aa8eXbFGQgV4iz+vqLu+vy6D5kbKAEMGjZjBkMBIGA1Ud\nEwEB/wQIMAYBAf8CAQAwDgYDVR0PAQH/BAQDAgGGMB0GA1UdDgQWBBRt6Uww+c6D\nJLtCikU+ldyt6jZG0TAfBgNVHSMEGDAWgBTbepRCAvtoy5p7mozRwstY0C5kXDAK\nBggqhkjOPQQDAgNHADBEAiAMV38Uc6E6/vskxH6yX1JMtLrH0ToCYHpguLDEqE0G\nJwIgYljrHip41HQqGqf7bvhQ0yjKEuNWq3WZOS1WMQXg78g=\n-----END CERTIFICATE-----\n";
window.certDecode={parseAll:parseAll,analyse:analyse};

var drop=$("cd-drop"),file=$("cd-file"),ta=$("cd-text");
function readFile(f){if(!f)return;var r=new FileReader();r.onload=function(){var b=new Uint8Array(r.result),text;
  if(b[0]===0x30&&(b[1]&0x80)){var s="";for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);text="-----BEGIN CERTIFICATE-----\n"+btoa(s)+"\n-----END CERTIFICATE-----"}else text=new TextDecoder().decode(b);
  ta.value=/PRIVATE KEY/.test(text)?text.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,"-----BEGIN PRIVATE KEY-----\n(removed)\n-----END PRIVATE KEY-----"):text;run(text,f.name)};r.readAsArrayBuffer(f)}
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files[0])readFile(e.dataTransfer.files[0])});
$("cd-run").addEventListener("click",function(){if(ta.value.trim())run(ta.value,"pasted text");else $("cd-status").textContent="Paste a certificate first, or drop a file."});
$("cd-sample").addEventListener("click",function(){ta.value=SAMPLE;$("cd-host").value="shop.example.org";run(SAMPLE,"a made-up sample chain",SAMPLE_NOW)});
$("cd-host").addEventListener("input",function(){if(state.text){run.quiet=true;run(state.text,state.name,state.now)}});
if(location.hash==="#sample"){ta.value=SAMPLE;$("cd-host").value="shop.example.org";run(SAMPLE,"a made-up sample chain",SAMPLE_NOW)}
})();
