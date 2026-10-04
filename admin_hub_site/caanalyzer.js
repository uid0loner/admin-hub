(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}

/* ---------- well-known IDs ---------- */
var ROLES={
 "62e90394-69f5-4237-9190-012177145e10":"Global Administrator","194ae4cb-b126-40b2-bd5b-6091b380977d":"Security Administrator",
 "29232cdf-9323-42fd-ade2-1d097af3e4de":"Exchange Administrator","f28a1f50-f6e7-4571-818b-6a12f2af6b6c":"SharePoint Administrator",
 "fe930be7-5e62-47db-91af-98c3a49a38b1":"User Administrator","e8611ab8-c189-46e8-94e1-60213ab1f814":"Privileged Role Administrator",
 "b1be1c3e-b65d-4f19-8427-f6fa0d97feb9":"Conditional Access Administrator","9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3":"Application Administrator",
 "729827e3-9c14-49f7-bb1b-9608f156bbb8":"Helpdesk Administrator","b0f54661-2d74-4c50-afa3-1ec803f12efe":"Billing Administrator",
 "c4e39bd9-1100-46d3-8c65-fb160da0071f":"Authentication Administrator","7be44c8a-adaf-4e2a-84d6-ab2649e08a13":"Privileged Authentication Administrator",
 "158c047a-c907-4556-b7ef-446551a6b5f7":"Cloud Application Administrator","5d6b6bb7-de71-4623-b4af-96380a352509":"Security Reader",
 "f2ef992c-3afb-46b9-b7cf-a126ee74c451":"Global Reader"
};
var APPS={"all":"all cloud apps","none":"no apps","office365":"Office 365","microsoftadminportals":"Microsoft admin portals",
 "00000002-0000-0ff1-ce00-000000000000":"Exchange Online","00000003-0000-0ff1-ce00-000000000000":"SharePoint Online",
 "797f4846-ba00-4fd7-ba43-dac1f8f63013":"Azure management"};
var CONTROLS={mfa:"MFA",compliantdevice:"a compliant device",domainjoineddevice:"a hybrid-joined device",approvedapplication:"an approved client app",
 compliantapplication:"an app protection policy",passwordchange:"a password change",block:"block"};
var STRENGTH={"00000000-0000-0000-0000-000000000002":"MFA","00000000-0000-0000-0000-000000000003":"passwordless MFA","00000000-0000-0000-0000-000000000004":"phishing-resistant MFA"};

/* ---------- parsing ---------- */
function lower(o){
  if(Array.isArray(o))return o.map(lower);
  if(o&&typeof o==="object"){var r={};Object.keys(o).forEach(function(k){r[k.toLowerCase()]=lower(o[k])});return r}
  return o;
}
function arr(v){
  if(v===null||v===undefined||v==="")return [];
  if(Array.isArray(v))return v.map(function(x){return String(x)});
  return String(v).split(",").map(function(x){return x.trim()}).filter(Boolean);
}
function lc(a){return a.map(function(x){return x.toLowerCase()})}
function parse(text){
  var data=JSON.parse(text.replace(/^﻿/,""));
  if(data&&!Array.isArray(data)&&Array.isArray(data.value))data=data.value;
  if(data&&!Array.isArray(data))data=[data];
  if(!Array.isArray(data))throw new Error("expected a list of policies");
  var out=data.map(lower).filter(function(p){return p&&typeof p==="object"&&(p.conditions||p.grantcontrols||p.sessioncontrols)}).map(norm);
  if(!out.length)throw new Error("no Conditional Access policies found in this JSON");
  return out;
}
function norm(p){
  var c=p.conditions||{},u=c.users||{},a=c.applications||{},g=p.grantcontrols||{},s=p.sessioncontrols||{},loc=c.locations||{},plat=c.platforms||{};
  var st=String(p.state||"").toLowerCase();
  var strength=g.authenticationstrength&&(g.authenticationstrength.id||g.authenticationstrength.displayname)?g.authenticationstrength:null;
  var flows=c.authenticationflows?lc(arr(c.authenticationflows.transfermethods)):[];
  var o={
    name:p.displayname||"(unnamed policy)",
    state:st==="enabled"?"on":st==="enabledforreportingbutnotenforced"?"report":"off",
    incUsers:arr(u.includeusers),excUsers:arr(u.excludeusers),incGroups:arr(u.includegroups),excGroups:arr(u.excludegroups),
    incRoles:arr(u.includeroles),excRoles:arr(u.excluderoles),incGuests:!!u.includeguestsorexternalusers,
    incApps:arr(a.includeapplications),excApps:arr(a.excludeapplications),actions:lc(arr(a.includeuseractions)),
    clients:lc(arr(c.clientapptypes)),incLoc:arr(loc.includelocations),excLoc:arr(loc.excludelocations),
    incPlat:arr(plat.includeplatforms),excPlat:arr(plat.excludeplatforms),
    signinRisk:arr(c.signinrisklevels),userRisk:arr(c.userrisklevels),deviceFilter:!!(c.devices&&c.devices.devicefilter&&c.devices.devicefilter.rule),
    flows:flows,operator:String(g.operator||"OR").toUpperCase(),grant:lc(arr(g.builtincontrols)),strength:strength,
    freq:s.signinfrequency&&s.signinfrequency.isenabled!==false&&(s.signinfrequency.value||s.signinfrequency.frequencyinterval)?s.signinfrequency:null,
    persistent:s.persistentbrowser&&s.persistentbrowser.isenabled?String(s.persistentbrowser.mode||""):"",
    appEnforced:!!(s.applicationenforcedrestrictions&&s.applicationenforcedrestrictions.isenabled),
    mcas:!!(s.cloudappsecurity&&s.cloudappsecurity.isenabled)
  };
  o.allUsers=lc(o.incUsers).indexOf("all")>-1;
  o.allApps=lc(o.incApps).indexOf("all")>-1;
  o.block=o.grant.indexOf("block")>-1;
  o.strengthId=strength?String(strength.id||"").toLowerCase():"";
  o.strengthName=strength?(STRENGTH[o.strengthId]||strength.displayname||"an authentication strength"):"";
  o.pr=!!strength&&(o.strengthId==="00000000-0000-0000-0000-000000000004"||/phish/i.test(String(strength.displayname||"")));
  o.mfa=o.grant.indexOf("mfa")>-1||!!strength;
  o.device=o.grant.indexOf("compliantdevice")>-1||o.grant.indexOf("domainjoineddevice")>-1;
  o.alts=o.grant.length+(strength&&o.grant.indexOf("mfa")<0?1:0);
  o.exclusions=o.excUsers.length+o.excGroups.length+o.excRoles.length;
  o.legacyOnly=o.clients.length>0&&o.clients.indexOf("all")<0&&o.clients.indexOf("browser")<0&&o.clients.indexOf("mobileappsanddesktopclients")<0&&(o.clients.indexOf("other")>-1||o.clients.indexOf("exchangeactivesync")>-1);
  o.narrowed=[];
  if(o.clients.length&&o.clients.indexOf("all")<0&&!o.legacyOnly)o.narrowed.push("only some client app types");
  if(o.incLoc.length&&lc(o.incLoc).indexOf("all")<0)o.narrowed.push("only from selected locations");
  if(o.excLoc.length)o.narrowed.push(lc(o.excLoc).indexOf("alltrusted")>-1?"not from trusted locations":"not from excluded locations");
  if(o.incPlat.length&&lc(o.incPlat).indexOf("all")<0)o.narrowed.push("only on some device platforms");
  if(o.excPlat.length)o.narrowed.push("some device platforms excluded");
  if(o.deviceFilter)o.narrowed.push("device filter applied");
  if(o.excApps.length)o.narrowed.push(o.excApps.length+" app"+(o.excApps.length===1?"":"s")+" excluded");
  return o;
}

/* ---------- plain language ---------- */
function plural(n,w){return n+" "+w+(n===1?"":"s")}
function who(p){
  var parts=[];
  if(p.allUsers)parts.push("all users");
  else{
    if(lc(p.incUsers).indexOf("guestsorexternalusers")>-1||p.incGuests)parts.push("guests and external users");
    var named=p.incUsers.filter(function(x){return !/^(all|none|guestsorexternalusers)$/i.test(x)});
    if(named.length)parts.push(plural(named.length,"specific user"));
    if(p.incGroups.length)parts.push(plural(p.incGroups.length,"group"));
    if(p.incRoles.length)parts.push(p.incRoles.map(function(r){return ROLES[r.toLowerCase()]||"a directory role"}).filter(function(v,i,a){return a.indexOf(v)===i}).slice(0,4).join(", ")+(p.incRoles.length>4?" and "+(p.incRoles.length-4)+" more roles":""));
  }
  if(!parts.length)parts.push("nobody");
  var ex=[];
  if(p.excUsers.length)ex.push(plural(p.excUsers.length,"user"));
  if(p.excGroups.length)ex.push(plural(p.excGroups.length,"group"));
  if(p.excRoles.length)ex.push(plural(p.excRoles.length,"role"));
  return parts.join(" + ")+(ex.length?" (except "+ex.join(", ")+")":"");
}
function what(p){
  if(p.actions.indexOf("urn:user:registersecurityinfo")>-1)return "register security info";
  if(p.actions.indexOf("urn:user:registerdevice")>-1)return "register or join a device";
  if(!p.incApps.length)return "access nothing";
  var names=p.incApps.map(function(a){return APPS[a.toLowerCase()]||null}),known=names.filter(Boolean),unknown=names.length-known.length;
  return "access "+known.concat(unknown?[plural(unknown,"specific app")]:[]).join(", ");
}
function then(p){
  var s;
  if(p.block)s="block the sign-in";
  else{
    var req=p.grant.filter(function(g){return g!=="mfa"||!p.strength}).map(function(g){return CONTROLS[g]||g});
    if(p.strength)req.unshift(p.strengthName);
    s=req.length?"require "+req.join(p.operator==="AND"?" and ":" or "):"";
  }
  var ses=[];
  if(p.freq)ses.push("re-authenticate every "+(p.freq.value?p.freq.value+" "+String(p.freq.type||"").toLowerCase():"session"));
  if(p.persistent)ses.push("browser session "+(p.persistent.toLowerCase()==="never"?"never persists":"persists"));
  if(p.appEnforced)ses.push("app-enforced restrictions");
  if(p.mcas)ses.push("Defender for Cloud Apps session control");
  if(!s&&!ses.length)return "do nothing (no grant or session control)";
  return [s].concat(ses).filter(Boolean).join("; ");
}
function when(p){
  var c=[];
  if(p.legacyOnly)c.push("using legacy protocols");
  if(p.signinRisk.length)c.push("sign-in risk is "+p.signinRisk.join("/"));
  if(p.userRisk.length)c.push("user risk is "+p.userRisk.join("/"));
  if(p.flows.length)c.push("using "+p.flows.map(function(f){return f==="devicecodeflow"?"device code flow":f==="authenticationtransfer"?"authentication transfer":f}).join(" or "));
  return c.concat(p.narrowed);
}
function sentence(p){
  var w=when(p);
  return "When "+who(p)+" "+what(p)+(w.length?", "+w.join(", "):"")+": "+then(p)+".";
}

/* ---------- checks ---------- */
var CHECKS=[
 {id:"mfa",title:"MFA for all users, all apps",ctl:"mfa",test:function(p){return p.allUsers&&p.allApps&&p.mfa&&!p.block&&!p.legacyOnly&&!p.signinRisk.length&&!p.userRisk.length&&!p.actions.length},
  strict:function(p){return !p.narrowed.length&&(p.operator==="AND"||p.alts===1)},
  miss:"No enforced policy requires MFA from every user for every app. Anyone outside your MFA policies signs in with a password alone.",
  part:"MFA applies to everyone, but with conditions that leave gaps."},
 {id:"legacy",title:"Legacy authentication blocked",ctl:"legacy",test:function(p){return p.allUsers&&p.block&&p.legacyOnly},
  strict:function(p){return p.clients.indexOf("other")>-1&&p.clients.indexOf("exchangeactivesync")>-1&&!p.narrowed.length},
  miss:"Nothing blocks IMAP, POP, SMTP AUTH and other legacy protocols. They cannot do MFA, so a password is enough.",
  part:"Legacy protocols are blocked only partly (one client type missing, or conditions applied)."},
 {id:"adminmfa",title:"MFA for admin roles",ctl:null,test:function(p){return (p.incRoles.length||p.allUsers)&&p.mfa&&!p.block&&!p.legacyOnly&&!p.signinRisk.length&&!p.userRisk.length&&!p.actions.length&&(p.allApps||lc(p.incApps).indexOf("microsoftadminportals")>-1)},
  strict:function(p){return !p.narrowed.length},
  miss:"No policy requires MFA specifically from privileged roles.",part:"Admins must use MFA, but with conditions that leave gaps."},
 {id:"prmfa",title:"Phishing-resistant MFA",ctl:"prmfa",test:function(p){return p.pr&&!p.block&&(p.incRoles.length||p.allUsers)},
  strict:function(p){return p.allUsers&&!p.narrowed.length},
  miss:"No policy requires phishing-resistant methods. Push, SMS and codes can all be relayed by an adversary-in-the-middle proxy.",
  part:"Phishing-resistant MFA is required for some identities (typically admin roles), not for everyone."},
 {id:"device",title:"Compliant or hybrid-joined device",ctl:"cadevice",test:function(p){return p.device&&!p.block&&!p.actions.length},
  strict:function(p){return p.allUsers&&p.allApps&&!p.narrowed.length&&(p.operator==="AND"||p.alts===1||!p.strength&&p.grant.every(function(g){return g==="compliantdevice"||g==="domainjoineddevice"}))},
  miss:"No policy requires a managed device. Stolen session tokens work from any machine.",
  part:"A device requirement exists but does not bind everyone: it is limited to some users or apps, or MFA is accepted instead."},
 {id:"signinrisk",title:"Sign-in risk policy",ctl:"risk",test:function(p){return p.signinRisk.length>0&&(p.mfa||p.block)},
  strict:function(p){return p.allUsers},miss:"No policy reacts to risky sign-ins (needs Entra ID P2).",part:"A sign-in risk policy exists but not for all users."},
 {id:"userrisk",title:"User risk policy",ctl:"risk",test:function(p){return p.userRisk.length>0&&(p.block||p.grant.indexOf("passwordchange")>-1||p.mfa)},
  strict:function(p){return p.allUsers},miss:"No policy reacts to accounts flagged as compromised (needs Entra ID P2).",part:"A user risk policy exists but not for all users."},
 {id:"devicecode",title:"Device code flow blocked",ctl:"devicecode",test:function(p){return p.flows.indexOf("devicecodeflow")>-1&&p.block},
  strict:function(p){return p.allUsers},miss:"Device code flow is open to everyone. It is the basis of device code phishing and few users need it.",part:"Device code flow is blocked for some users only."},
 {id:"reginfo",title:"Security info registration protected",ctl:"reginfo",test:function(p){return p.actions.indexOf("urn:user:registersecurityinfo")>-1&&(p.mfa||p.device||p.block)},
  strict:function(p){return p.allUsers},miss:"Registering a new MFA method needs no extra proof. An attacker with a live session can add their own.",part:"Registration is protected for some users only."},
 {id:"adminsession",title:"Short sessions for admins",ctl:null,test:function(p){return !!p.freq&&(p.incRoles.length>0)},
  strict:function(){return true},miss:"No sign-in frequency for admin roles. Admin sessions live as long as the default token lifetime.",part:""}
];
function evaluate(pols){
  var on=pols.filter(function(p){return p.state==="on"}),rep=pols.filter(function(p){return p.state==="report"});
  return CHECKS.map(function(c){
    var hit=on.filter(c.test),strict=hit.filter(c.strict),r=rep.filter(c.test),status,by,note;
    if(strict.length){status="enforced";by=strict;note=""}
    else if(hit.length){status="partial";by=hit;note=c.part;var why=[];hit.forEach(function(p){p.narrowed.forEach(function(n){if(why.indexOf(n)<0)why.push(n)});if(!p.allUsers&&why.indexOf("not all users")<0)why.push("not all users")});if(why.length)note+=" ("+why.join("; ")+")"}
    else if(r.length){status="report-only";by=r;note="A matching policy exists but is in report-only mode. It logs what it would do and enforces nothing."}
    else{status="missing";by=[];note=c.miss}
    return {check:c,status:status,by:by,note:note};
  });
}
function hygiene(pols){
  var H=[],on=pols.filter(function(p){return p.state==="on"});
  var rep=pols.filter(function(p){return p.state==="report"}),off=pols.filter(function(p){return p.state==="off"});
  if(rep.length)H.push({sev:"high",title:plural(rep.length,"policy")+" in report-only mode",text:"Report-only policies protect nothing. They are for testing before you switch on. Decide for each: enable it or delete it.",list:rep.map(function(p){return p.name})});
  var noEx=on.filter(function(p){return p.allUsers&&p.allApps&&(p.block||p.mfa||p.device)&&p.exclusions===0&&!p.signinRisk.length&&!p.userRisk.length&&!p.legacyOnly});
  if(noEx.length)H.push({sev:"med",title:"Broad policies without an emergency-access exclusion",text:"These apply to all users and all apps with no exclusion at all. If the control fails (MFA outage, a compliance bug), you can lock every administrator out of the tenant. Exclude two break-glass accounts and alert on their use.",list:noEx.map(function(p){return p.name})});
  var manyEx=on.filter(function(p){return p.excUsers.length>=5});
  if(manyEx.length)H.push({sev:"med",title:"Many individually excluded users",text:"Each excluded user is an account the policy does not protect. Exceptions granted for a week tend to stay for years.",list:manyEx.map(function(p){return p.name+" ("+p.excUsers.length+" users excluded)"})});
  var grp=on.filter(function(p){return p.excGroups.length&&(p.mfa||p.block||p.device)});
  if(grp.length)H.push({sev:"info",title:"Exclusion groups to review",text:"Membership of an exclusion group switches the policy off for that account. Check who is in these groups, and who can add members.",list:grp.map(function(p){return p.name+" ("+plural(p.excGroups.length,"group")+")"})});
  var trusted=on.filter(function(p){return (p.mfa||p.device)&&!p.block&&lc(p.excLoc).indexOf("alltrusted")>-1});
  if(trusted.length)H.push({sev:"med",title:"MFA skipped from trusted locations",text:"Inside the office network nobody is asked for MFA. A compromised machine or a guest on that network inherits the trust.",list:trusted.map(function(p){return p.name})});
  var either=on.filter(function(p){return p.operator==="OR"&&p.device&&p.mfa});
  if(either.length)H.push({sev:"info",title:"Device requirement can be satisfied with MFA instead",text:"With 'require one of the selected controls', MFA from any device is enough. That does not stop token theft or adversary-in-the-middle phishing.",list:either.map(function(p){return p.name})});
  var nothing=on.filter(function(p){return (!p.incUsers.length&&!p.incGroups.length&&!p.incRoles.length&&!p.incGuests)||lc(p.incUsers).indexOf("none")>-1&&!p.incGroups.length&&!p.incRoles.length||(!p.grant.length&&!p.strength&&!p.freq&&!p.persistent&&!p.appEnforced&&!p.mcas)});
  if(nothing.length)H.push({sev:"info",title:"Enabled policies that do nothing",text:"These target nobody or have no control configured.",list:nothing.map(function(p){return p.name})});
  if(off.length)H.push({sev:"info",title:plural(off.length,"disabled policy"),text:"Disabled policies are clutter and occasionally get re-enabled by accident. Delete what you no longer need.",list:off.map(function(p){return p.name})});
  return H;
}

/* ---------- render ---------- */
var TAG={enforced:"s-info","partial":"s-high","report-only":"s-high",missing:"s-crit"};
var state={pols:null,name:""};
function render(){
  var out=$("ca-out"),pols=state.pols;out.replaceChildren();
  var ev=evaluate(pols),H=hygiene(pols);
  var n={enforced:0,partial:0,"report-only":0,missing:0};ev.forEach(function(e){n[e.status]++});
  var on=pols.filter(function(p){return p.state==="on"}).length;
  $("ca-status").textContent=plural(pols.length,"policy")+" read from "+state.name+".";
  var v=el("div","verdict v-"+(n.missing>=4?"crit":n.missing||n["report-only"]?"high":n.partial?"med":"info"));
  v.append(el("b",null,n.enforced+" of "+ev.length+" baseline protections enforced"),el("span",null,[n.partial&&n.partial+" partial",n["report-only"]&&n["report-only"]+" report-only",n.missing&&n.missing+" missing"].filter(Boolean).join(" · ")||"nothing missing"));
  out.append(v);
  var stats=el("div","stats");
  [["policies",pols.length],["enforced",on],["report-only",pols.filter(function(p){return p.state==="report"}).length],["disabled",pols.filter(function(p){return p.state==="off"}).length]].forEach(function(s){var d=el("div","stat");d.append(el("span","stat-k",s[0]),el("b","stat-v",s[1]));stats.append(d)});
  out.append(stats);

  out.append(el("h2",null,"baseline coverage"));
  var wrap=el("div","tw"),t=el("table","tbl cov"),th=el("thead"),tr=el("tr"),tb=el("tbody");
  ["Protection","Status","Policy","What that means"].forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
  ev.forEach(function(e){
    var r=el("tr"),s=el("td");s.append(el("span","sevtag "+TAG[e.status],e.status));
    r.append(el("td",null,e.check.title),s,el("td",null,e.by.map(function(p){return p.name}).join(", ")||"none"),el("td",null,e.note||"Enforced without conditions."));tb.append(r);
  });
  t.append(th,tb);wrap.append(t);out.append(wrap);

  var ctl=el("div","ctl");ctl.style.marginTop="18px";
  var controls=[];ev.forEach(function(e){if(e.status==="enforced"&&e.check.ctl&&controls.indexOf(e.check.ctl)<0)controls.push(e.check.ctl)});
  var a=el("a","btn solid","Open this result in the attack map");a.href="attack-map.html#c="+controls.join(",");
  ctl.append(a,el("span","dim",controls.length?"Carries over "+controls.length+" enforced control"+(controls.length===1?"":"s")+". Tick the non-Conditional-Access ones there.":"No fully enforced control to carry over."));
  out.append(ctl);

  out.append(el("h2",null,"findings"));
  if(!H.length)out.append(el("p","dim","No hygiene issues found in this export."));
  H.forEach(function(h,i){
    var d=el("details","finding f-"+h.sev);if(i<2)d.open=true;
    var s=el("summary");s.append(el("span","sevtag",h.sev==="med"?"medium":h.sev),el("b",null,h.title));
    var ul=el("ul","steps");h.list.forEach(function(x){ul.append(el("li",null,x))});
    d.append(s,el("p",null,h.text),ul);out.append(d);
  });

  out.append(el("h2",null,"every policy in plain language"));
  pols.slice().sort(function(a,b){return "on report off".indexOf(a.state)-"on report off".indexOf(b.state)||a.name.localeCompare(b.name)}).forEach(function(p){
    var row=el("div","polrow");
    row.append(el("span","sevtag "+(p.state==="on"?"s-info":p.state==="report"?"s-high":"s-med"),p.state==="on"?"enforced":p.state==="report"?"report-only":"disabled"));
    var body=el("div");body.append(el("b",null,p.name),el("p",null,sentence(p)));row.append(body);out.append(row);
  });
  var c2=el("div","ctl");c2.style.marginTop="24px";
  var dl=el("button","btn","Download report (.md)");dl.type="button";dl.addEventListener("click",function(){
    var blob=new Blob([report(ev,H)],{type:"text/markdown"}),x=document.createElement("a");x.href=URL.createObjectURL(blob);x.download="conditional-access-review.md";document.body.append(x);x.click();x.remove();
  });
  var pr=el("button","btn ghost","Print / save as PDF");pr.type="button";pr.addEventListener("click",function(){document.querySelectorAll("#ca-out details").forEach(function(x){x.open=true});window.print()});
  c2.append(dl,pr);out.append(c2);
  out.hidden=false;
}
function report(ev,H){
  var L=["# Conditional Access review","","Source: "+state.name,"Policies: "+state.pols.length,"Generated in the browser by admin_hub CA analyzer. No data left this device.","","## Baseline coverage","","| Protection | Status | Policy | Note |","| --- | --- | --- | --- |"];
  ev.forEach(function(e){L.push("| "+e.check.title+" | "+e.status+" | "+(e.by.map(function(p){return p.name}).join(", ")||"none")+" | "+(e.note||"Enforced without conditions.")+" |")});
  L.push("","## Findings","");
  H.forEach(function(h){L.push("### ["+h.sev.toUpperCase()+"] "+h.title,"",h.text,"");h.list.forEach(function(x){L.push("- "+x)});L.push("")});
  L.push("## Policies","");
  state.pols.forEach(function(p){L.push("- **"+p.name+"** ("+(p.state==="on"?"enforced":p.state==="report"?"report-only":"disabled")+"): "+sentence(p))});
  return L.join("\n");
}
window.caReport=function(){return state.pols?report(evaluate(state.pols),hygiene(state.pols)):""};

function load(text,name){
  try{state.pols=parse(text);state.name=name;render();$("ca-out").scrollIntoView({behavior:"smooth",block:"start"})}
  catch(e){$("ca-out").hidden=true;$("ca-status").textContent="Could not read that: "+e.message+". Expected the JSON list of policies from Microsoft Graph or Get-MgIdentityConditionalAccessPolicy."}
}

/* ---------- sample ---------- */
function sample(){
  var GA="62e90394-69f5-4237-9190-012177145e10",SA="194ae4cb-b126-40b2-bd5b-6091b380977d",EA="29232cdf-9323-42fd-ade2-1d097af3e4de";
  function g(i){return "aaaaaaaa-0000-4000-8000-00000000000"+i}
  return JSON.stringify({value:[
   {displayName:"CA001 - Require MFA for all users",state:"enabled",conditions:{users:{includeUsers:["All"],excludeUsers:[g(1),g(2),g(3),g(4),g(5),g(6)],excludeGroups:[g(7)]},applications:{includeApplications:["All"]},clientAppTypes:["all"],locations:{includeLocations:["All"],excludeLocations:["AllTrusted"]}},grantControls:{operator:"OR",builtInControls:["mfa"]}},
   {displayName:"CA002 - Block legacy authentication",state:"enabledForReportingButNotEnforced",conditions:{users:{includeUsers:["All"],excludeGroups:[g(7)]},applications:{includeApplications:["All"]},clientAppTypes:["exchangeActiveSync","other"]},grantControls:{operator:"OR",builtInControls:["block"]}},
   {displayName:"CA003 - Require MFA for admins",state:"enabled",conditions:{users:{includeRoles:[GA,SA,EA],excludeGroups:[g(7)]},applications:{includeApplications:["All"]},clientAppTypes:["all"]},grantControls:{operator:"OR",builtInControls:[],authenticationStrength:{id:"00000000-0000-0000-0000-000000000002",displayName:"Multifactor authentication"}}},
   {displayName:"CA004 - Require compliant device (pilot)",state:"enabled",conditions:{users:{includeGroups:[g(8)]},applications:{includeApplications:["All"]},clientAppTypes:["all"]},grantControls:{operator:"OR",builtInControls:["mfa","compliantDevice"]}},
   {displayName:"CA005 - Block high sign-in risk",state:"enabled",conditions:{users:{includeUsers:["All"]},applications:{includeApplications:["All"]},clientAppTypes:["all"],signInRiskLevels:["high"]},grantControls:{operator:"OR",builtInControls:["block"]}},
   {displayName:"CA006 - Old VPN policy",state:"disabled",conditions:{users:{includeGroups:[g(9)]},applications:{includeApplications:["bbbbbbbb-0000-4000-8000-000000000001"]},clientAppTypes:["all"]},grantControls:{operator:"OR",builtInControls:["mfa"]}},
   {displayName:"CA007 - Admin session 4 hours",state:"enabled",conditions:{users:{includeRoles:[GA,SA,EA]},applications:{includeApplications:["All"]},clientAppTypes:["all"]},grantControls:null,sessionControls:{signInFrequency:{value:4,type:"hours",isEnabled:true},persistentBrowser:{mode:"never",isEnabled:true}}}
  ]},null,1);
}
window.caSample=sample;

var drop=$("ca-drop"),file=$("ca-file"),ta=$("ca-text");
function readFile(f){if(!f)return;var r=new FileReader();r.onload=function(){load(String(r.result),f.name)};r.readAsText(f)}
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){readFile(e.dataTransfer.files[0])});
$("ca-run").addEventListener("click",function(){if(ta.value.trim())load(ta.value,"pasted JSON");else $("ca-status").textContent="Paste the JSON first, or drop a file."});
$("ca-sample").addEventListener("click",function(){ta.value=sample();load(ta.value,"sample policies (fictional tenant)")});
if(location.hash==="#sample"){ta.value=sample();load(ta.value,"sample policies (fictional tenant)")}
})();
