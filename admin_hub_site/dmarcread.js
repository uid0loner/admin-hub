(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e}
function plural(n,w){return n.toLocaleString("en-US")+" "+(n===1?w:/[^aeiou]y$/.test(w)?w.slice(0,-1)+"ies":w+"s")}
function uniq(a){var s={},o=[];a.forEach(function(x){if(x&&!s[x]){s[x]=1;o.push(x)}});return o}
function num(n){return n.toLocaleString("en-US")}
var SEV={crit:0,high:1,med:2,info:3},SEVNAME={crit:"critical",high:"high",med:"medium",info:"info"};
var TWO={"co.uk":1,"org.uk":1,"ac.uk":1,"gov.uk":1,"me.uk":1,"ltd.uk":1,"plc.uk":1,"com.au":1,"net.au":1,"org.au":1,"edu.au":1,"gov.au":1,"co.nz":1,"org.nz":1,"co.jp":1,"ne.jp":1,"or.jp":1,"com.br":1,"com.mx":1,"co.za":1,"com.tr":1,"com.sg":1,"com.hk":1,"co.in":1,"co.kr":1,"com.cn":1,"com.tw":1,"co.il":1,"com.ar":1,"com.pl":1,"co.at":1,"or.at":1,"gv.at":1,"com.ua":1};
function org(d){d=String(d||"").toLowerCase().replace(/\.$/,"");var p=d.split(".");if(p.length<=2)return d;var t=p.slice(-2).join(".");return TWO[t]?p.slice(-3).join("."):t}
function aligned(a,b,strict){a=String(a||"").toLowerCase();b=String(b||"").toLowerCase();if(!a||!b)return false;return strict?a===b:org(a)===org(b)}

/* ---------- reading one report ---------- */
function txt(node,name){if(!node)return "";var c=node.getElementsByTagName(name);return c.length?(c[0].textContent||"").trim():""}
function parseXml(xml,file){
  var doc=new DOMParser().parseFromString(xml.replace(/^\uFEFF/,""),"application/xml");
  if(doc.getElementsByTagName("parsererror").length)throw new Error(file+" is not valid XML");
  var fb=doc.getElementsByTagName("feedback")[0];if(!fb||!doc.getElementsByTagName("record").length&&!doc.getElementsByTagName("policy_published").length)throw new Error(file+" is XML but not a DMARC aggregate report (no feedback element)");
  var meta=doc.getElementsByTagName("report_metadata")[0],pol=doc.getElementsByTagName("policy_published")[0],dr=meta?meta.getElementsByTagName("date_range")[0]:null;
  var rep={file:file,org:txt(meta,"org_name")||txt(meta,"email")||"unknown reporter",id:txt(meta,"report_id"),begin:+txt(dr,"begin")||0,end:+txt(dr,"end")||0,
    policy:{domain:txt(pol,"domain").toLowerCase(),p:txt(pol,"p").toLowerCase()||"none",sp:txt(pol,"sp").toLowerCase(),pct:txt(pol,"pct")===""?100:+txt(pol,"pct"),adkim:txt(pol,"adkim").toLowerCase()||"r",aspf:txt(pol,"aspf").toLowerCase()||"r"},records:[]};
  [].forEach.call(doc.getElementsByTagName("record"),function(r){
    var row=r.getElementsByTagName("row")[0],pe=r.getElementsByTagName("policy_evaluated")[0],idn=r.getElementsByTagName("identifiers")[0],ar=r.getElementsByTagName("auth_results")[0];
    var rec={ip:txt(row,"source_ip"),count:Math.max(0,parseInt(txt(row,"count"),10)||0),disp:txt(pe,"disposition").toLowerCase()||"none",dkim:txt(pe,"dkim").toLowerCase(),spf:txt(pe,"spf").toLowerCase(),
      reasons:pe?[].map.call(pe.getElementsByTagName("reason"),function(x){return txt(x,"type").toLowerCase()}).filter(Boolean):[],
      from:txt(idn,"header_from").toLowerCase()||rep.policy.domain,envfrom:txt(idn,"envelope_from").toLowerCase(),adkim:[],aspf:[]};
    if(ar){[].forEach.call(ar.getElementsByTagName("dkim"),function(x){rec.adkim.push({d:txt(x,"domain").toLowerCase(),s:txt(x,"selector"),r:txt(x,"result").toLowerCase()})});
      [].forEach.call(ar.getElementsByTagName("spf"),function(x){rec.aspf.push({d:txt(x,"domain").toLowerCase(),r:txt(x,"result").toLowerCase()})})}
    if(rec.ip&&rec.count)rep.records.push(rec)});
  return rep}

/* ---------- archives ---------- */
function inflate(bytes,fmt){if(typeof DecompressionStream==="undefined")return Promise.reject(new Error("this browser cannot unpack compressed files. Unpack the file first and drop the XML"));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream(fmt))).arrayBuffer().then(function(b){return new Uint8Array(b)})}
function utf8(b){return new TextDecoder("utf-8").decode(b)}
function unzip(buf,name){var dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength),n=buf.length,e=-1,i;
  for(i=n-22;i>=Math.max(0,n-65558);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)return Promise.reject(new Error(name+" is not a readable zip file"));
  var count=dv.getUint16(e+10,true),off=dv.getUint32(e+16,true),jobs=[];
  for(i=0;i<count&&off+46<=n;i++){if(dv.getUint32(off,true)!==0x02014b50)break;
    var method=dv.getUint16(off+10,true),csize=dv.getUint32(off+20,true),nl=dv.getUint16(off+28,true),xl=dv.getUint16(off+30,true),cl=dv.getUint16(off+32,true),lo=dv.getUint32(off+42,true),fn=utf8(buf.subarray(off+46,off+46+nl));
    off+=46+nl+xl+cl;
    if(/\/$/.test(fn)||lo+30>n)continue;
    var start=lo+30+dv.getUint16(lo+26,true)+dv.getUint16(lo+28,true),data=buf.subarray(start,start+csize);
    (function(fn,method,data){jobs.push((method===0?Promise.resolve(data):method===8?inflate(data,"deflate-raw"):Promise.reject(new Error(fn+" in "+name+" uses a compression this page cannot read"))).then(function(b){return unpack(b,fn)}))})(fn,method,data)}
  return Promise.all(jobs).then(function(a){return [].concat.apply([],a)})}
function unpack(buf,name){
  if(buf.length>3&&buf[0]===0x50&&buf[1]===0x4b&&buf[2]===3&&buf[3]===4)return unzip(buf,name);
  if(buf.length>2&&buf[0]===0x1f&&buf[1]===0x8b)return inflate(buf,"gzip").then(function(b){return unpack(b,name.replace(/\.gz$/i,""))});
  var t=utf8(buf);if(!/<feedback[\s>]/.test(t.slice(0,4000))&&!/<\?xml/.test(t.slice(0,200)))return Promise.resolve([{skip:name}]);
  return Promise.resolve([{name:name,xml:t}])}

/* ---------- analysis ---------- */
function analyse(reports){
  var seen={},reps=[],dupes=0;
  reports.forEach(function(r){var k=r.org+"|"+r.id+"|"+r.begin;if(r.id&&seen[k]){dupes++;return}seen[k]=1;reps.push(r)});
  var R={reports:reps,dupes:dupes,total:0,pass:0,fail:0,sources:[],findings:[],domains:{},begin:Infinity,end:0,policies:{}},src={};
  reps.forEach(function(rep){
    if(rep.begin)R.begin=Math.min(R.begin,rep.begin);if(rep.end)R.end=Math.max(R.end,rep.end);
    var pk=rep.policy.domain+"|"+rep.policy.p+"|"+rep.policy.sp+"|"+rep.policy.pct;if(rep.policy.domain)R.policies[pk]=rep.policy;
    rep.records.forEach(function(x){
      var ok=x.dkim==="pass"||x.spf==="pass",s=src[x.ip];
      if(!s)s=src[x.ip]={ip:x.ip,count:0,pass:0,fail:0,dkimOk:0,spfOk:0,both:0,spfOnly:0,dkimOnly:0,rejected:0,quarantined:0,delivered:0,fwd:0,from:{},dkimDom:{},spfDom:{},otherDkim:{},otherSpf:{},ownDkimFail:{},reporters:{},name:""};
      s.count+=x.count;R.total+=x.count;s.reporters[rep.org]=1;s.from[x.from]=(s.from[x.from]||0)+x.count;R.domains[x.from]=(R.domains[x.from]||0)+x.count;
      if(ok){s.pass+=x.count;R.pass+=x.count;if(x.dkim==="pass"&&x.spf==="pass")s.both+=x.count;else if(x.spf==="pass")s.spfOnly+=x.count;else s.dkimOnly+=x.count}
      else{s.fail+=x.count;R.fail+=x.count;if(x.disp==="reject")s.rejected+=x.count;else if(x.disp==="quarantine")s.quarantined+=x.count;else s.delivered+=x.count}
      if(x.reasons.some(function(t){return t==="forwarded"||t==="mailing_list"||t==="trusted_forwarder"||t==="local_policy"}))s.fwd+=x.count;
      x.adkim.forEach(function(d){if(d.r==="pass"){s.dkimDom[d.d]=1;if(!aligned(d.d,x.from,false))s.otherDkim[d.d]=1}else if(d.d&&aligned(d.d,x.from,false)&&!ok)s.ownDkimFail[d.d+(d.s?" (selector "+d.s+")":"")]=1});
      x.aspf.forEach(function(d){if(d.r==="pass"){s.spfDom[d.d]=1;if(!aligned(d.d,x.from,false))s.otherSpf[d.d]=1}});
    })});
  R.sources=Object.keys(src).map(function(k){var s=src[k];
    s.kind=!s.fail?(s.spfOnly===s.count?"spfonly":"ok"):(s.fwd>=s.fail?"forward":Object.keys(s.ownDkimFail).length&&!s.pass?"broken":(Object.keys(s.otherDkim).length||Object.keys(s.otherSpf).length)?"unaligned":s.pass?"mixed":"unknown");
    return s}).sort(function(a,b){return b.count-a.count});
  if(R.begin===Infinity)R.begin=0;
  var pols=Object.keys(R.policies).map(function(k){return R.policies[k]}),P=pols[0]||{domain:Object.keys(R.domains)[0]||"",p:"none",sp:"",pct:100,adkim:"r",aspf:"r"};R.policy=P;R.multi=pols.length>1;
  var by=function(k){return R.sources.filter(function(s){return s.kind===k})},sum=function(a,f){return a.reduce(function(t,s){return t+s[f]},0)};
  var rate=R.total?R.pass/R.total:1,F=function(sev,key,title,why,rows,steps,cols){R.findings.push({sev:sev,key:key,title:title,why:why,rows:rows||[],steps:steps||[],cols:cols||["Source address","Messages","Details"]})};
  var un=by("unaligned"),unk=by("unknown").concat(by("mixed")),br=by("broken"),fw=by("forward"),so=by("spfonly");
  var enforcing=P.p==="quarantine"||P.p==="reject",delivered=sum(R.sources,"delivered");
  if(un.length)F("high","unaligned","Services that send as you but are not set up for your domain",
    "These senders authenticate, but with their own domain instead of yours: the message says it is from "+(P.domain||"your domain")+", and the signature or the bounce address belongs to the service. That is the default of nearly every newsletter, invoicing, ticket and CRM service until someone configures it. Under an enforcing policy this mail is quarantined or rejected.",
    un.map(function(s){return [s.ip,num(s.fail),"authenticates as "+uniq(Object.keys(s.otherDkim).concat(Object.keys(s.otherSpf))).join(", ")]}),
    ["Recognise the service by the domain it authenticates as, and find out who in the company uses it.","In the service, set up a custom sending domain: it gives you DKIM records (usually CNAMEs) to publish in your DNS, and often a custom bounce domain as well.","Send a test and check the next reports: the source should move to the passing list.","If nobody knows the service, treat it like the unknown senders below."]);
  if(unk.length){var cnt=sum(unk,"fail");F(enforcing?"med":"high","unknown","Senders that fail and that nothing identifies",
    "Mail that claims to be from your domain and passes neither SPF nor DKIM for it. Two explanations: someone is forging your address, or a system of yours sends mail and nobody set it up, such as a scanner, a web form, a monitoring tool or an old server. "+(enforcing?"Your policy already tells receivers to "+P.p+" these.":"With p=none, receivers deliver these anyway."),
    unk.map(function(s){return [s.ip,num(s.fail),(s.pass?"also "+num(s.pass)+" passing. ":"")+(s.delivered?num(s.delivered)+" delivered":"")+(s.quarantined?" "+num(s.quarantined)+" quarantined":"")+(s.rejected?" "+num(s.rejected)+" rejected":"")]}),
    ["Look up who owns each address: the host names button below, or a whois lookup.","An address at your own provider, in your office range or at your web host is a forgotten system: add it to SPF, or better, make it send through your mail server.","Addresses scattered over the world with a handful of messages each are forgeries. They are the reason to move to an enforcing policy, not a reason to hold back.","Mixed results from one address mean some of its mail is signed and some is not: usually a shared server with a second, unsigned application on it."])}
  if(br.length)F("high","dkimbroken","Your own DKIM signature does not verify",
    "These messages carry a signature for your domain, and the receiver could not verify it. Either the public key in DNS does not match the key the sender signs with, the record is missing or cut off, or something on the way changes the message after signing, such as a gateway that adds a footer.",
    br.map(function(s){return [s.ip,num(s.fail),"failing signature: "+Object.keys(s.ownDkimFail).join(", ")]}),
    ["Look up the selector's record: nslookup -type=txt selector._domainkey.yourdomain. It must exist and hold the complete key.","A 2048-bit key is longer than one DNS string. It has to be split into several quoted strings in one record, and some DNS panels cut it off silently.","If a gateway or a signature tool rewrites outgoing mail, it must do that before the mail is signed, not after."]);
  if(P.p==="none"&&R.total)F(rate>=0.98&&!un.length&&!br.length?"med":"info","pnone",rate>=0.98&&!un.length&&!br.length?"The policy only watches, and you look ready to enforce it":"The policy only watches",
    "p=none asks receivers to send reports and change nothing. Anyone can still send mail with your domain in the From line, and it is delivered. "+(rate>=0.98&&!un.length&&!br.length?Math.floor(rate*1000)/10+"% of the mail in these reports passes, and no misconfigured service of yours shows up. That is the point at which to move on.":"That is the right setting while you are still finding your own senders, and these reports show there is work left."),
    [],["Fix the findings above first.","Then publish p=quarantine with pct=25 and read the reports for two weeks: only a quarter of failing mail goes to spam, the rest is delivered as before.","Raise pct to 100, then switch to p=reject.","Keep the rua address. The reports are how you notice the next unconfigured service."]);
  else if(P.p==="quarantine"&&R.total)F("info","pquar","The policy quarantines","Failing mail goes to the spam folder instead of the inbox. "+(P.pct<100?"Only "+P.pct+"% of it, because pct="+P.pct+". ":"")+"p=reject is the last step: it stops forged mail at the door, and it gives a sender of yours a bounce instead of a silent trip to spam, which is the kinder failure.",[],["With no findings above for a few weeks, move to p=reject."]);
  if(enforcing&&P.pct<100)F("info","pct","The policy applies to part of the mail only","pct="+P.pct+" tells receivers to apply the policy to "+P.pct+"% of failing messages and to treat the rest one step milder. It is a ramp-up aid, not a setting to keep.",[],["Raise it to 100 once the reports are clean, or remove the tag: 100 is the default."]);
  if(enforcing&&P.sp==="none")F("med","sp","Subdomains are left out","sp=none switches the policy off for every subdomain. A forger simply uses billing."+(P.domain||"yourdomain")+" instead.",[],["Remove the sp tag so that subdomains inherit the main policy, or set it to the same value.","Subdomains that really send mail need their own SPF and DKIM first."]);
  if(so.length&&sum(so,"count")>=Math.max(5,R.total*0.02))F("med","spfonly","Mail that passes on SPF alone","These messages have no valid DKIM signature for your domain and pass only because the sending server is in your SPF record. SPF does not survive forwarding: when a recipient forwards their mail to another mailbox, the forwarder's server is not in your SPF, and with an enforcing policy that copy is lost.",
    so.map(function(s){return [s.ip,num(s.count),"SPF passes for "+Object.keys(s.spfDom).join(", ")+", no aligned DKIM"]}),
    ["Switch on DKIM signing on that system. In Microsoft 365 and Google Workspace it is a setting plus two DNS records.","A device that cannot sign should hand its mail to your mail server and let it sign."]);
  if(fw.length)F("info","forward","Forwarded mail","Receivers marked these as forwarded or as coming through a mailing list. The mail was yours, went to someone who forwards it elsewhere, and failed on the second hop. Nothing is wrong on your side, and DKIM is what lets such mail still pass.",
    fw.map(function(s){return [s.ip,num(s.fail),"marked as forwarded by the receiver"]}),["Nothing to fix. Make sure all your mail is DKIM signed, so that forwarded copies keep passing."]);
  if(R.multi)F("info","multi","The reports cover more than one domain or policy","The table of sources below mixes them. For a clear picture, drop the reports of one domain at a time.",pols.map(function(p){return [p.domain,"","p="+p.p+(p.sp?" sp="+p.sp:"")+" pct="+p.pct]}),[],["Domain","","Policy"]);
  R.findings.sort(function(a,b){return SEV[a.sev]-SEV[b.sev]});
  R.worst=R.findings.length?R.findings[0].sev:"none";R.rate=rate;R.delivered=delivered;
  return R}

var KIND={ok:"passes",spfonly:"passes on SPF only",unaligned:"fails: not set up for your domain",unknown:"fails: unknown sender",mixed:"partly fails",broken:"fails: DKIM signature broken",forward:"fails: forwarded"};
function sample(){
  function rec(ip,n,disp,dk,sp,from,dk2,sp2,reason){return "<record><row><source_ip>"+ip+"</source_ip><count>"+n+"</count><policy_evaluated><disposition>"+disp+"</disposition><dkim>"+dk+"</dkim><spf>"+sp+"</spf>"+(reason?"<reason><type>"+reason+"</type></reason>":"")+"</policy_evaluated></row><identifiers><header_from>"+from+"</header_from></identifiers><auth_results>"+dk2.map(function(d){return "<dkim><domain>"+d[0]+"</domain><selector>"+d[1]+"</selector><result>"+d[2]+"</result></dkim>"}).join("")+"<spf><domain>"+sp2[0]+"</domain><result>"+sp2[1]+"</result></spf></auth_results></record>"}
  function rep(orgn,id,b,recs){return '<?xml version="1.0" encoding="UTF-8"?><feedback><report_metadata><org_name>'+orgn+"</org_name><email>noreply@"+orgn.toLowerCase().replace(/[^a-z]/g,"")+".example</email><report_id>"+id+"</report_id><date_range><begin>"+b+"</begin><end>"+(b+86399)+"</end></date_range></report_metadata><policy_published><domain>example.org</domain><adkim>r</adkim><aspf>r</aspf><p>none</p><sp>none</sp><pct>100</pct></policy_published>"+recs.join("")+"</feedback>"}
  var d="example.org",own=[[d,"selector1","pass"]];
  return [{name:"big-mailbox-provider!example.org!1790899200!1790985599.xml",xml:rep("Big Mailbox Provider","18233019",1790899200,[
    rec("198.51.100.25",1840,"none","pass","pass",d,own,[d,"pass"]),rec("198.51.100.26",1122,"none","pass","pass",d,own,[d,"pass"]),
    rec("203.0.113.80",412,"none","fail","fail",d,[["mailer.newsletter-service.example","k1","pass"]],["bounce.newsletter-service.example","pass"]),
    rec("192.0.2.14",96,"none","fail","pass",d,[],[d,"pass"]),
    rec("203.0.113.199",38,"none","fail","fail",d,[],["mail.unknown-host.example","none"]),
    rec("198.51.100.210",21,"none","fail","fail",d,own.map(function(x){return [x[0],x[1],"fail"]}),["forwarder.example","pass"],"forwarded"),
    rec("192.0.2.77",7,"none","fail","fail","billing."+d,[],["billing."+d,"fail"])])},
   {name:"enterprise-mail!example.org!1790899200!1790985599.xml",xml:rep("Enterprise Mail","c7e41f",1790899200,[
    rec("198.51.100.25",640,"none","pass","pass",d,own,[d,"pass"]),
    rec("203.0.113.80",155,"none","fail","fail",d,[["mailer.newsletter-service.example","k1","pass"]],["bounce.newsletter-service.example","pass"]),
    rec("192.0.2.14",31,"none","fail","pass",d,[],[d,"pass"]),
    rec("203.0.113.45",12,"none","fail","fail",d,[],["","none"]),
    rec("198.51.100.130",64,"none","fail","fail",d,[[d,"selector2","fail"]],["relay.office-gateway.example","pass"])])}]}
window.dmarcRead={parseXml:parseXml,analyse:analyse,sample:sample,org:org,unpack:unpack};

/* ---------- page ---------- */
if(!$("dm-drop"))return;
var state={reports:[],skipped:[],errors:[],R:null};
function table(cols,rows,max){var wrap=el("div","tw"),tb=el("table","tbl"),th=el("thead"),tr=el("tr"),body=el("tbody");
  cols.forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
  rows.slice(0,max||rows.length).forEach(function(r){var x=el("tr");r.forEach(function(c){x.append(el("td",null,c))});body.append(x)});
  tb.append(th,body);wrap.append(tb);if(max&&rows.length>max)wrap.append(el("p","note","Showing "+max+" of "+rows.length+". The CSV contains all of them."));return wrap}
function tile(label,value,sub){var d=el("div","stat");d.append(el("span","stat-k",label));var b=el("b","stat-v",value);b.setAttribute("data-raw","1");d.append(b);if(sub)d.append(el("span","stat-s",sub));return d}
function save(name,text,type){var blob=new Blob([text],{type:type}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
function csv(cols,rows){var q=function(v){v=String(v===null||v===undefined?"":v);if(/^[=+\-@]/.test(v))v="'"+v;return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};return [cols].concat(rows).map(function(r){return r.map(q).join(",")}).join("\r\n")}
function day(t){return t?new Date(t*1000).toISOString().slice(0,10):"?"}
var SCOLS=["Source address","Host name","Messages","Result","SPF passes for","DKIM passes for","Sends as","Seen by"];
function srcRows(R){return R.sources.map(function(s){return [s.ip,s.name||"",num(s.count),KIND[s.kind]+(s.kind==="mixed"?" ("+num(s.fail)+")":""),Object.keys(s.spfDom).join(", ")||"-",Object.keys(s.dkimDom).join(", ")||"-",Object.keys(s.from).join(", "),Object.keys(s.reporters).join(", ")]})}
function polText(P){var w={none:"watch only: failing mail is delivered as usual",quarantine:"send failing mail to the spam folder",reject:"refuse failing mail"}[P.p]||P.p;
  return "v=DMARC1; p="+P.p+(P.sp?"; sp="+P.sp:"")+(P.pct!==100?"; pct="+P.pct:"")+"  \u2192  "+w+(P.adkim==="s"||P.aspf==="s"?". Strict alignment: the domains must match exactly, a subdomain does not count":"")}
function render(){var out=$("dm-out"),R=state.R=analyse(state.reports);out.replaceChildren();
  var st=plural(R.reports.length,"report")+" read"+(R.dupes?", "+plural(R.dupes,"duplicate")+" left out":"")+(state.skipped.length?", "+plural(state.skipped.length,"file")+" skipped (not a report)":"")+".";
  if(state.errors.length)st+=" Could not read: "+state.errors.join("; ")+".";$("dm-status").textContent=st;
  if(!R.reports.length){out.hidden=true;return}
  var v=el("div","verdict v-"+(R.worst==="none"||R.worst==="info"?"none":R.worst));
  v.append(el("b",null,!R.total?"No mail in these reports":R.worst==="high"||R.worst==="crit"?"Needs attention":R.worst==="med"?"Worth a look":"Looks healthy"),
    el("span",null,R.total?num(R.pass)+" of "+num(R.total)+" messages pass DMARC \u00b7 "+plural(R.sources.filter(function(s){return s.fail}).length,"failing source"):"the receivers saw no mail from this domain in the period"));
  out.append(v);
  var stats=el("div","stats");stats.style.setProperty("--cols","4");
  stats.append(tile("messages",num(R.total),day(R.begin)+" to "+day(R.end)),tile("pass DMARC",R.total?(Math.floor(R.rate*1000)/10)+"%":"-",num(R.fail)+" fail"),tile("sources",num(R.sources.length),"sending addresses"),tile("policy","p="+R.policy.p,R.policy.domain||""));
  out.append(stats);
  out.append(el("p","dmpol",polText(R.policy)));
  out.append(el("h2",null,"findings"));
  if(!R.findings.length)out.append(el("p","dim","Nothing stands out: everything in these reports passes, and the policy is enforced."));
  R.findings.forEach(function(f,i){var d=el("details","finding f-"+f.sev);if(i<2&&SEV[f.sev]<=1)d.open=true;
    var s=el("summary");s.append(el("span","sevtag s-"+f.sev,SEVNAME[f.sev]),el("b",null,f.title+(f.rows.length>1?" ("+f.rows.length+")":"")));
    d.append(s,el("p",null,f.why));if(f.rows.length)d.append(table(f.cols,f.rows,25));
    if(f.steps.length){d.append(el("h3","fh","what to do"));var ol=el("ol","steps");f.steps.forEach(function(x){ol.append(el("li",null,x))});d.append(ol)}
    out.append(d)});
  out.append(el("h2",null,"who sends as you"),el("p","dim","Every address that sent mail with your domain in the From line, largest first."));
  var holder=el("div");holder.id="dm-src";holder.append(table(SCOLS,srcRows(R),60));out.append(holder);
  var ctl=el("div","ctl");ctl.style.marginTop="14px";
  var ptr=el("button","btn","Look up host names");ptr.type="button";ptr.addEventListener("click",function(){lookup(ptr)});
  var dl=el("button","btn ghost","Download the sources (.csv)");dl.type="button";dl.addEventListener("click",function(){save("dmarc-sources.csv",csv(SCOLS,srcRows(state.R)),"text/csv")});
  var md=el("button","btn ghost","Download report (.md)");md.type="button";md.addEventListener("click",function(){save("dmarc-review.md",report(),"text/markdown")});
  var pr=el("button","btn ghost","Print / save as PDF");pr.type="button";pr.addEventListener("click",function(){document.querySelectorAll("#dm-out details").forEach(function(x){x.open=true});window.print()});
  ctl.append(ptr,dl,md,pr);out.append(ctl);
  out.append(el("p","note","\"Look up host names\" asks Cloudflare's public DNS for the name behind the 40 busiest addresses. That is the one thing on this page that leaves your browser: the addresses, not the reports."));
  out.append(el("h2",null,"the reports"),table(["Sent by","Period","Messages","Policy seen","File"],R.reports.map(function(r){return [r.org,day(r.begin)+" to "+day(r.end),num(r.records.reduce(function(t,x){return t+x.count},0)),"p="+r.policy.p+(r.policy.sp?" sp="+r.policy.sp:"")+(r.policy.pct!==100?" pct="+r.policy.pct:""),r.file]}),40));
  out.hidden=false}
function report(){var R=state.R,L=[];if(!R)return "";
  function tbl(cols,rows){L.push("| "+cols.join(" | ")+" |","|"+cols.map(function(){return " --- "}).join("|")+"|");rows.forEach(function(r){L.push("| "+r.map(function(c){return String(c).replace(/\|/g,"\\|")}).join(" | ")+" |")});L.push("")}
  L.push("# DMARC report review","","Domain: "+(R.policy.domain||"?"),"Period: "+day(R.begin)+" to "+day(R.end)+", "+R.reports.length+" reports","Messages: "+num(R.total)+", of which "+num(R.pass)+" pass DMARC","Policy: "+polText(R.policy),"Generated in the browser by the admin_hub DMARC report reader.","");
  R.findings.forEach(function(f){L.push("## ["+SEVNAME[f.sev].toUpperCase()+"] "+f.title,"",f.why,"");if(f.rows.length)tbl(f.cols,f.rows);if(f.steps.length){L.push("**What to do**","");f.steps.forEach(function(s,i){L.push((i+1)+". "+s)});L.push("")}});
  L.push("## Who sends as you","");tbl(SCOLS,srcRows(R));return L.join("\n")}
function arpa(ip){if(/^\d+\.\d+\.\d+\.\d+$/.test(ip))return ip.split(".").reverse().join(".")+".in-addr.arpa";
  if(ip.indexOf(":")<0)return null;var h=ip.split("::"),a=h[0]?h[0].split(":"):[],b=h.length>1&&h[1]?h[1].split(":"):[];if(h.length>2)return null;
  var mid=[];for(var i=a.length+b.length;i<8;i++)mid.push("0");var all=(h.length>1?a.concat(mid,b):a);if(all.length!==8)return null;
  return all.map(function(x){return ("0000"+x).slice(-4)}).join("").split("").reverse().join(".")+".ip6.arpa"}
function lookup(btn){var R=state.R,list=R.sources.slice(0,40).filter(function(s){return !s.name}),done=0;if(!list.length)return;btn.disabled=true;btn.textContent="Looking up ...";
  var fin=function(){if(++done<list.length)return;btn.textContent="Host names looked up";var h=$("dm-src");h.replaceChildren(table(SCOLS,srcRows(R),60))};
  list.forEach(function(s){var q=arpa(s.ip);if(!q){s.name="-";fin();return}
    fetch("https://cloudflare-dns.com/dns-query?name="+encodeURIComponent(q)+"&type=PTR",{headers:{accept:"application/dns-json"}}).then(function(r){return r.json()}).then(function(j){var a=(j.Answer||[]).filter(function(x){return x.type===12});s.name=a.length?String(a[0].data).replace(/\.$/,""):"no name"}).catch(function(){s.name="lookup failed"}).then(fin)})}
function addFiles(files){if(!files.length)return;$("dm-status").textContent="Reading "+plural(files.length,"file")+" ...";
  Promise.all([].map.call(files,function(f){return f.arrayBuffer().then(function(b){return unpack(new Uint8Array(b),f.name)}).catch(function(e){return [{err:f.name+": "+e.message}]})})).then(function(all){
    [].concat.apply([],all).forEach(function(x){if(x.err)state.errors.push(x.err);else if(x.skip)state.skipped.push(x.skip);else{try{state.reports.push(parseXml(x.xml,x.name))}catch(e){state.errors.push(e.message)}}});
    render();if(state.R&&state.R.reports.length)$("dm-out").scrollIntoView({behavior:"smooth",block:"start"})})}
function reset(){state.reports=[];state.skipped=[];state.errors=[]}
var drop=$("dm-drop"),file=$("dm-file");
file.addEventListener("change",function(){addFiles(file.files);file.value=""});
["dragenter","dragover"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files.length)addFiles(e.dataTransfer.files)});
$("dm-run").addEventListener("click",function(){var t=$("dm-text").value.trim();if(!t){$("dm-status").textContent="Paste the XML of a report first, or drop files.";return}
  try{state.reports.push(parseXml(t,"pasted text"))}catch(e){state.errors.push(e.message)}render();if(state.R&&state.R.reports.length)$("dm-out").scrollIntoView({behavior:"smooth",block:"start"})});
function loadSample(){reset();sample().forEach(function(x){state.reports.push(parseXml(x.xml,x.name))});render();$("dm-out").scrollIntoView({behavior:"smooth",block:"start"})}
$("dm-sample").addEventListener("click",loadSample);
$("dm-clear").addEventListener("click",function(){reset();$("dm-text").value="";$("dm-out").hidden=true;$("dm-status").textContent="Cleared."});
if(location.hash==="#sample")loadSample();
})();
