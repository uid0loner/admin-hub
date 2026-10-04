(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}

var RES={cloudflare:"https://cloudflare-dns.com/dns-query",google:"https://dns.google/resolve"};
var TYPE={A:1,NS:2,CNAME:5,MX:15,TXT:16,CAA:257};
var queries=0;

/* ---------- DNS over HTTPS ---------- */
function ask(name,type){
  queries++;
  var url=RES[$("dc-res").value]+"?name="+encodeURIComponent(name)+"&type="+type;
  var ctl=("AbortController" in window)?new AbortController():null,t=ctl?setTimeout(function(){ctl.abort()},7000):null;
  return fetch(url,{headers:{accept:"application/dns-json"},signal:ctl?ctl.signal:undefined}).then(function(r){
    if(!r.ok)throw new Error("resolver answered "+r.status);return r.json();
  }).then(function(j){
    if(t)clearTimeout(t);
    return {status:j.Status,ad:!!j.AD,answers:(j.Answer||[]).filter(function(a){return a.type===TYPE[type]}).map(function(a){return String(a.data)}),cname:(j.Answer||[]).filter(function(a){return a.type===5}).map(function(a){return String(a.data).replace(/\.$/,"")})};
  });
}
function txt(s){
  // "part one" "part two"  ->  part onepart two
  var m=s.match(/"((?:[^"\\]|\\.)*)"/g);
  if(!m)return s;
  return m.map(function(p){return p.slice(1,-1).replace(/\\"/g,'"')}).join("");
}
function askTxt(name){return ask(name,"TXT").then(function(r){r.answers=r.answers.map(txt);return r})}

/* ---------- SPF ---------- */
function spfLookups(domain,record,seen,depth){
  // counts DNS-querying terms per RFC 7208 (limit 10), following include and redirect
  var terms=record.split(/\s+/).slice(1),count=0,chain=[],jobs=[],bad=[];
  terms.forEach(function(term){
    var t=term.replace(/^[+\-~?]/,"").toLowerCase(),m;
    if(/^(a|mx|ptr)([:\/]|$)/.test(t)||/^exists:/.test(t))count++;
    if((m=/^include:(.+)$/.exec(t))||(m=/^redirect=(.+)$/.exec(t))){
      count++;var target=m[1];
      if(seen[target])return;                 // already followed once
      if(depth>=10){bad.push(target);return}
      seen[target]=1;
      jobs.push(askTxt(target).then(function(r){
        var rec=r.answers.filter(function(x){return /^v=spf1(\s|$)/i.test(x)})[0];
        if(!rec){bad.push(target);return {count:0,chain:[]}}
        return spfLookups(target,rec,seen,depth+1).then(function(sub){sub.chain.unshift(target+" ("+sub.count+")");return sub});
      },function(){bad.push(target);return {count:0,chain:[]}}));
    }
  });
  return Promise.all(jobs).then(function(subs){
    subs.forEach(function(s){count+=s.count;chain=chain.concat(s.chain);bad=bad.concat(s.bad||[])});
    return {count:count,chain:chain,bad:bad};
  });
}

/* ---------- helpers ---------- */
var PROVIDERS=[[/\.mail\.protection\.outlook\.com$|\.mx\.microsoft$/i,"Microsoft 365","v=spf1 include:spf.protection.outlook.com -all"],
 [/google\.com$|googlemail\.com$/i,"Google Workspace","v=spf1 include:_spf.google.com -all"],
 [/pphosted\.com$/i,"Proofpoint",""],[/mimecast\.com$/i,"Mimecast",""],[/protonmail\.ch$/i,"Proton Mail","v=spf1 include:_spf.protonmail.ch -all"],
 [/zoho\.(com|eu)$/i,"Zoho Mail",""],[/messagingengine\.com$/i,"Fastmail","v=spf1 include:spf.messagingengine.com -all"],[/barracudanetworks\.com$/i,"Barracuda",""]];
var SELECTORS=["selector1","selector2","google","default","k1","k2","s1","s2","mail","dkim","smtp","mandrill","zoho","protonmail","protonmail2","protonmail3","fm1","fm2","fm3","mxvault","everlytickey1","cm"];
function tags(rec){var o={};rec.split(";").forEach(function(p){var i=p.indexOf("=");if(i>0)o[p.slice(0,i).trim().toLowerCase()]=p.slice(i+1).trim()});return o}
function keyBits(p){var n=p.replace(/\s/g,"").length;return n===0?0:n<=180?512:n<=250?1024:n<=450?2048:n<=800?4096:0}

/* ---------- the audit ---------- */
function audit(domain){
  queries=0;
  var R={domain:domain,findings:[],facts:[],score:100};
  function find(sev,title,text,fix,pts){R.findings.push({sev:sev,title:title,text:text,fix:fix||""});R.score-=pts||0}
  function fact(k,v){R.facts.push([k,v])}

  return Promise.all([ask(domain,"MX"),askTxt(domain),ask(domain,"NS"),ask(domain,"CAA"),ask(domain,"A"),
    askTxt("_mta-sts."+domain),askTxt("_smtp._tls."+domain),askTxt("default._bimi."+domain)]).then(function(r){
    var mx=r[0],apex=r[1],ns=r[2],caa=r[3],a=r[4],sts=r[5],rpt=r[6],bimi=r[7];
    if(mx.status===3&&apex.status===3)throw new Error("NXDOMAIN: "+domain+" does not exist in DNS");
    R.dnssec=mx.ad||apex.ad||ns.ad;

    // --- MX
    var hosts=mx.answers.map(function(x){var p=x.trim().split(/\s+/);return {prio:+p[0],host:(p[1]||"").replace(/\.$/,"")}}).sort(function(x,y){return x.prio-y.prio});
    var nullMx=hosts.length===1&&(hosts[0].host===""||hosts[0].host===".");
    R.receives=hosts.length>0&&!nullMx;
    var prov=null;hosts.forEach(function(h){PROVIDERS.forEach(function(p){if(!prov&&p[0].test(h.host))prov=p})});
    R.provider=prov?prov[1]:"";
    fact("MX",nullMx?"null MX (this domain accepts no mail)":hosts.length?hosts.map(function(h){return h.prio+" "+h.host}).join(", "):"none");
    if(prov)fact("Mail provider (from MX)",prov[1]);
    if(!hosts.length)find("info","No MX record","Without MX, mail servers fall back to the A record. If this domain is not meant to receive mail, publish a null MX so senders fail fast.",domain+".  MX  0 .",0);

    // --- SPF
    var spfs=apex.answers.filter(function(x){return /^v=spf1(\s|$)/i.test(x)}),spfJob=Promise.resolve();
    var suggested=R.receives?(prov&&prov[2]?prov[2]:"v=spf1 include:<your mail provider> -all"):"v=spf1 -all";
    if(!spfs.length){R.spf="none";find("crit","No SPF record","Nothing tells receivers which servers may send mail for this domain. Anyone can use it as an envelope sender.",domain+".  TXT  \""+suggested+"\"",25)}
    else if(spfs.length>1){R.spf="multiple";find("crit","More than one SPF record","A domain must have exactly one SPF record. With "+spfs.length+" of them, receivers return a permanent error and treat SPF as failed. Merge them into one.","",20);spfs.forEach(function(s){fact("SPF",s)})}
    else{
      var rec=spfs[0];fact("SPF",rec);
      var all=/(^|\s)([+\-~?]?)all(\s|$)/i.exec(rec),redirect=/redirect=/i.test(rec),q=all?(all[2]||"+"):"";
      R.spf=q||"none-all";
      if(q==="+")find("crit","SPF ends in +all","+all authorises every server on the internet. This is worse than having no SPF at all.","Change +all to -all.",40);
      else if(q==="?")find("high","SPF ends in ?all","?all means neutral: receivers learn nothing about unlisted servers. Use -all once you know your senders.","",10);
      else if(q==="~")find("info","SPF ends in ~all (soft fail)","Unlisted servers soft-fail. With an enforced DMARC policy this is fine. Without one, move to -all.","",3);
      else if(!all&&!redirect)find("high","SPF has no all mechanism","The record never says what to do with servers that are not listed, so the result is neutral.","Append -all.",10);
      if(/(^|\s)[+\-~?]?ptr([:\s]|$)/i.test(rec))find("med","SPF uses the ptr mechanism","ptr is slow, unreliable and deprecated by RFC 7208. Replace it with ip4, ip6 or include.","",3);
      if(rec.length>450)find("info","Very long SPF record","At "+rec.length+" characters this record is close to what fits in a DNS answer. Flatten or remove unused includes.","",0);
      var seen={};seen[domain]=1;
      spfJob=spfLookups(domain,rec,seen,0).then(function(l){
        R.spfLookups=l.count;fact("SPF DNS lookups",l.count+" of 10 allowed"+(l.chain.length?" ("+l.chain.join(", ")+")":""));
        if(l.count>10)find("high","SPF needs "+l.count+" DNS lookups","The limit is 10. Beyond it receivers return a permanent error and SPF fails for every message, including your legitimate ones. Remove includes you no longer use.","",15);
        else if(l.count>=9)find("info","SPF is at "+l.count+" of 10 DNS lookups","One more include and SPF breaks for all mail.","",0);
        if(l.bad.length)find("med","SPF include without an SPF record","These targets could not be resolved to an SPF record: "+l.bad.join(", ")+". Each one costs a lookup and can cause a permanent error.","",5);
      });
    }

    // --- DMARC (walk up to the organisational domain)
    var labels=domain.split("."),cands=[];
    for(var i=0;i<labels.length-1;i++)cands.push(labels.slice(i).join("."));
    function dmarcAt(i){
      if(i>=cands.length)return Promise.resolve(null);
      return askTxt("_dmarc."+cands[i]).then(function(x){
        var recs=x.answers.filter(function(v){return /^v=DMARC1/i.test(v)});
        return recs.length?{at:cands[i],recs:recs}:dmarcAt(i+1);
      });
    }
    var dmarcJob=dmarcAt(0).then(function(d){
      var mail="dmarc@"+domain;
      if(!d){R.dmarc="missing";find("crit","No DMARC record","Without DMARC, receivers do not check whether the visible From address matches SPF or DKIM. Mail that claims to come from @"+domain+" is delivered on its own merits, and you get no reports about it.","_dmarc."+domain+".  TXT  \"v=DMARC1; p=none; rua=mailto:"+mail+"\"\n\nStart with p=none to collect reports, then move to quarantine and reject.",35);return}
      if(d.recs.length>1){R.dmarc="multiple";find("crit","More than one DMARC record","Receivers ignore DMARC entirely when a domain publishes several records.","",30);return}
      var t=tags(d.recs[0]),inherited=d.at!==domain,p=String((inherited&&t.sp)||t.p||"").toLowerCase();
      R.dmarc=p;fact("DMARC"+(inherited?" (inherited from "+d.at+")":""),d.recs[0]);
      if(p==="none")find("high","DMARC policy is p=none","You are collecting reports, but receivers are told to deliver spoofed mail as usual. This is a starting point, not an end state.","Once the reports show that all your legitimate senders pass: p=quarantine, then p=reject.",20);
      else if(p==="quarantine")find("info","DMARC policy is quarantine","Spoofed mail goes to the junk folder. The last step is p=reject.","",3);
      else if(p!=="reject")find("high","DMARC policy is missing or invalid","The p tag must be none, quarantine or reject.","",25);
      if(t.pct&&+t.pct<100)find("med","DMARC applies to only "+t.pct+"% of mail","pct below 100 leaves the remaining share of spoofed mail unaffected.","Remove pct or set pct=100.",5);
      if(!t.rua)find("med","DMARC has no reporting address","Without rua you never learn who is sending as your domain, legitimate or not.","Add rua=mailto:"+mail,3);
      if(!inherited&&t.sp&&t.sp.toLowerCase()==="none"&&p!=="none")find("med","Subdomains are exempt (sp=none)","Attackers can still spoof anything@sub."+domain+".","Remove sp or set it to "+p+".",5);
    });

    // --- DKIM (common selectors only)
    var dkimJob=Promise.all(SELECTORS.map(function(s){
      return askTxt(s+"._domainkey."+domain).then(function(x){
        var rec=x.answers.filter(function(v){return /(^|;)\s*p=/i.test(v)||/v=DKIM1/i.test(v)})[0];
        return rec?{sel:s,rec:rec,cname:x.cname[0]||""}:null;
      },function(){return null});
    })).then(function(list){
      var found=list.filter(Boolean);R.dkim=found.length;
      found.forEach(function(f){
        var t=tags(f.rec),bits=keyBits(t.p||""),revoked=t.p==="";
        fact("DKIM selector "+f.sel,(revoked?"revoked key":(t.k||"rsa")+(bits?" "+bits+"-bit":""))+(f.cname?" via "+f.cname:""));
        if(bits&&bits<2048&&(t.k||"rsa").toLowerCase()==="rsa")find("med","DKIM key "+f.sel+" is only "+bits+"-bit","1024-bit RSA is the minimum receivers accept, and 2048-bit is the current recommendation.","",3);
      });
      if(!found.length)find("info","No DKIM key found under common selector names","Selectors cannot be listed, only guessed. "+SELECTORS.length+" common names were tried. If you sign with a custom selector this is a false alarm: check a received message's DKIM-Signature header for s=.","",0);
    });

    // --- transport, DNSSEC, CAA
    var stsRec=sts.answers.filter(function(v){return /^v=STSv1/i.test(v)})[0],rptRec=rpt.answers.filter(function(v){return /^v=TLSRPTv1/i.test(v)})[0],bimiRec=bimi.answers.filter(function(v){return /^v=BIMI1/i.test(v)})[0];
    if(R.receives){
      if(stsRec)fact("MTA-STS",stsRec);else find("low","No MTA-STS","Sending servers may fall back to unencrypted delivery if an attacker interferes with STARTTLS. MTA-STS tells them to insist on TLS. It needs this TXT record plus a policy file on https://mta-sts."+domain+".","_mta-sts."+domain+".  TXT  \"v=STSv1; id=20260101T000000\"",5);
      if(rptRec)fact("TLS reporting",rptRec);else find("low","No TLS reporting (TLS-RPT)","You get no reports when other servers fail to deliver to you over TLS.","_smtp._tls."+domain+".  TXT  \"v=TLSRPTv1; rua=mailto:tlsrpt@"+domain+"\"",2);
    }
    if(bimiRec)fact("BIMI",bimiRec);
    fact("DNSSEC",R.dnssec?"validated by the resolver":"not signed, or not validated");
    if(!R.dnssec)find("low","DNSSEC not validated","Answers for this domain are not cryptographically signed, so a resolver cannot detect forged records.","Enable DNSSEC at your DNS provider and publish the DS record at the registrar.",5);
    if(caa.answers.length)fact("CAA",caa.answers.join(", "));else find("low","No CAA record","Any certificate authority may issue certificates for this domain. CAA restricts issuance to the ones you name. The record shown is an example: name the authority you actually use.",domain+".  CAA  0 issue \"letsencrypt.org\"",2);
    fact("Name servers",ns.answers.map(function(x){return x.replace(/\.$/,"")}).join(", ")||"none returned");
    if(a.answers.length)fact("A",a.answers.join(", "));

    return Promise.all([spfJob,dmarcJob,dkimJob]).then(function(){
      R.score=Math.max(0,Math.min(100,R.score));
      R.grade=R.score>=90?"A":R.score>=75?"B":R.score>=60?"C":R.score>=40?"D":"F";
      var strongSpf=R.spf==="-",d=R.dmarc;
      R.spoof=d==="reject"?["no","Spoofed mail is rejected. Receivers that honour DMARC will refuse messages that only pretend to come from this domain."]:
        d==="quarantine"?["mostly not","Spoofed mail lands in junk. Receivers that honour DMARC will not put it in the inbox."]:
        strongSpf?["partly","SPF fails hard for unlisted servers, but without an enforced DMARC policy the visible From address is not protected. A forged From with a different envelope sender still gets through."]:
        ["yes","Nothing stops it. A message with a forged @"+domain+" From address is likely to be delivered."];
      R.queries=queries;
      var order={crit:0,high:1,med:2,low:3,info:4};R.findings.sort(function(x,y){return order[x.sev]-order[y.sev]});
      return R;
    });
  });
}

/* ---------- render ---------- */
function remember(k,o){try{if(localStorage.getItem("ah_cockpit_on")!=="1")return;var d=JSON.parse(localStorage.getItem("ah_cockpit")||"{}");o.ts=Date.now();d[k]=o;localStorage.setItem("ah_cockpit",JSON.stringify(d))}catch(e){}}

var SEVN={crit:"critical",high:"high",med:"medium",low:"low",info:"info"},SEVC={crit:"crit",high:"high",med:"med",low:"info",info:"info"};
function render(R){
  remember("domain",{name:R.domain,grade:R.grade,score:R.score,spoof:R.spoof[0],issues:R.findings.filter(function(f){return f.sev==="crit"||f.sev==="high"}).map(function(f){return f.title}).slice(0,3)});
  var out=$("dc-out");out.replaceChildren();
  var v=el("div","gradebox g-"+R.grade);
  v.append(el("div","grade",R.grade));
  var vb=el("div");vb.append(el("b",null,"Can someone send mail as @"+R.domain+"? "+R.spoof[0].charAt(0).toUpperCase()+R.spoof[0].slice(1)+"."),el("p",null,R.spoof[1]));v.append(vb);out.append(v);
  var stats=el("div","stats");stats.style.setProperty("--cols","5");
  [["score",R.score+"/100"],["spf",R.spf==="none"?"missing":R.spf==="multiple"?"invalid":R.spf==="none-all"?"no all":R.spf+"all"],["dmarc",R.dmarc==="missing"||R.dmarc==="multiple"?R.dmarc:R.dmarc?"p="+R.dmarc:"invalid"],["dkim selectors",R.dkim||"none found"],["dnssec",R.dnssec?"yes":"no"]].forEach(function(s){var d=el("div","stat");d.append(el("span","stat-k",s[0]),el("b","stat-v",s[1]));stats.append(d)});
  out.append(stats);
  out.append(el("h2",null,"findings"));
  if(!R.findings.length)out.append(el("p","dim","Nothing to fix. That is rare."));
  R.findings.forEach(function(f,i){
    var d=el("details","finding f-"+SEVC[f.sev]);if(i<3&&(f.sev==="crit"||f.sev==="high"))d.open=true;
    var s=el("summary");s.append(el("span","sevtag",SEVN[f.sev]),el("b",null,f.title));d.append(s,el("p",null,f.text));
    if(f.fix){d.append(el("h3","fh",/TXT|MX|CAA/.test(f.fix)?"record to publish":"fix"));var pre=el("pre",null,f.fix);d.append(pre);
      if(/TXT|MX|CAA/.test(f.fix)){var b=el("button","btn ghost","Copy");b.type="button";b.addEventListener("click",function(){if(navigator.clipboard)navigator.clipboard.writeText(f.fix.split("\n\n")[0]).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy"},1400)})});d.append(b)}}
    out.append(d);
  });
  out.append(el("h2",null,"what DNS says"));
  var wrap=el("div","tw"),t=el("table","tbl rec"),tb=el("tbody");
  R.facts.forEach(function(f){var tr=el("tr");tr.append(el("td",null,f[0]),el("td",null,f[1]));tb.append(tr)});
  t.append(tb);wrap.append(t);out.append(wrap);
  out.append(el("p","note",R.queries+" DNS queries were sent from your browser to "+$("dc-res").selectedOptions[0].textContent+". The score weighs DMARC and SPF most, because they decide whether your domain can be forged. DKIM cannot be scored: selectors can only be guessed."));
  var ctl=el("div","ctl"),share=el("button","btn","Copy link to this check");share.type="button";
  share.addEventListener("click",function(){if(navigator.clipboard)navigator.clipboard.writeText(location.origin+location.pathname+"#d="+R.domain).then(function(){share.textContent="Link copied";setTimeout(function(){share.textContent="Copy link to this check"},1400)})});
  ctl.append(share);out.append(ctl);
  out.hidden=false;
}

function run(){
  var d=$("dc-name").value.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/^[^@\s]*@/,"").replace(/[\/?#].*$/,"").replace(/\.$/,""),st=$("dc-status");
  if(!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(d)){st.textContent="Enter a domain name such as example.com.";return}
  $("dc-name").value=d;$("dc-out").hidden=true;$("dc-run").disabled=true;st.textContent="Asking DNS about "+d+" ...";
  audit(d).then(function(R){
    st.textContent="";render(R);
    try{history.replaceState(null,"","#d="+d)}catch(e){}
    $("dc-out").scrollIntoView({behavior:"smooth",block:"start"});
  }).catch(function(e){
    st.textContent=/NXDOMAIN/.test(e.message)?e.message+".":"The lookup failed: "+(e.name==="AbortError"?"no answer within 7 seconds":e.message)+". A firewall, an ad blocker or the resolver itself may be in the way. Try the other resolver.";
  }).then(function(){$("dc-run").disabled=false});
}
$("dc-run").addEventListener("click",run);
$("dc-name").addEventListener("keydown",function(e){if(e.key==="Enter")run()});
var m=/^#d=([a-z0-9.-]+)$/i.exec(location.hash);
if(m){$("dc-name").value=m[1];run()}
window.domainAudit=audit;
})();
