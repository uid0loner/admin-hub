(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e}

/* ---------- licence catalogue ----------
   part number -> [display name, rough list price per user and month (EUR), capability tags]
   Tags describe what a licence contains, so a smaller licence can be recognised as covered by a bigger one.
   Prices are starting values only. They are editable on the page. */
var CAT={
 O365_BUSINESS_ESSENTIALS:["Microsoft 365 Business Basic",5.6,"exo1 teams spo"],
 O365_BUSINESS_PREMIUM:["Microsoft 365 Business Standard",11.7,"exo1 teams spo apps"],
 SPB:["Microsoft 365 Business Premium",20.6,"exo1 teams spo apps entra1 intune mdo1 aip1 mdb"],
 STANDARDPACK:["Office 365 E1",9.4,"exo1 teams spo"],
 ENTERPRISEPACK:["Office 365 E3",23.9,"exo2 teams spo appsent"],
 ENTERPRISEPREMIUM:["Office 365 E5",38.3,"exo2 teams spo appsent mdo2 pbi phone audio"],
 SPE_E3:["Microsoft 365 E3",37.7,"exo2 teams spo appsent entra1 intune aip1 win mde1"],
 SPE_E5:["Microsoft 365 E5",59.7,"exo2 teams spo appsent entra2 intune aip2 win mde2 mdo2 pbi phone audio mdi mdca"],
 SPE_F1:["Microsoft 365 F3",7.5,"exo-kiosk teams spo entra1 intune aip1 win"],
 M365_F1:["Microsoft 365 F1",2.1,"teams spo entra1 intune"],
 DESKLESSPACK:["Office 365 F3",3.7,"exo-kiosk teams spo"],
 EMS:["Enterprise Mobility + Security E3",9.9,"entra1 intune aip1"],
 EMSPREMIUM:["Enterprise Mobility + Security E5",15.2,"entra2 intune aip2 mdi mdca"],
 AAD_PREMIUM:["Microsoft Entra ID P1",5.6,"entra1"],
 AAD_PREMIUM_P2:["Microsoft Entra ID P2",8.4,"entra2"],
 INTUNE_A:["Microsoft Intune Plan 1",7.5,"intune"],
 EXCHANGESTANDARD:["Exchange Online (Plan 1)",3.7,"exo1"],
 EXCHANGEENTERPRISE:["Exchange Online (Plan 2)",7.5,"exo2"],
 EXCHANGEDESKLESS:["Exchange Online Kiosk",1.9,"exo-kiosk"],
 ATP_ENTERPRISE:["Defender for Office 365 (Plan 1)",1.9,"mdo1"],
 THREAT_INTELLIGENCE:["Defender for Office 365 (Plan 2)",4.7,"mdo2"],
 DEFENDER_ENDPOINT_P1:["Defender for Endpoint P1",2.8,"mde1"],
 WIN_DEF_ATP:["Defender for Endpoint P2",4.9,"mde2"],
 MDATP_XPLAT:["Defender for Endpoint P2",4.9,"mde2"],
 MCOEV:["Teams Phone Standard",9.4,"phone"],
 MCOMEETADV:["Audio Conferencing",0,"audio"],
 Microsoft_Teams_Audio_Conferencing_select_dial_out:["Audio Conferencing (select dial-out)",0,"audio"],
 POWER_BI_PRO:["Power BI Pro",13.1,"pbi"],
 PBI_PREMIUM_PER_USER:["Power BI Premium per user",22.5,"pbi pbipremium"],
 OFFICESUBSCRIPTION:["Microsoft 365 Apps for enterprise",11.3,"appsent"],
 O365_BUSINESS:["Microsoft 365 Apps for business",9.8,"apps"],
 VISIOCLIENT:["Visio Plan 2",14,"visio"],
 PROJECTPROFESSIONAL:["Project Plan 3",28.1,"project3"],
 PROJECTPREMIUM:["Project Plan 5",51.6,"project3 project5"],
 Microsoft_365_Copilot:["Microsoft 365 Copilot",28.1,"copilot"],
 Microsoft_Teams_EEA_New:["Microsoft Teams EEA",4.8,"teams"],
 Microsoft_Teams_Enterprise_New:["Microsoft Teams Enterprise",4.8,"teams"],
 Microsoft_Teams_Premium:["Teams Premium",9.4,"teamspremium"],
 /* free or trial */
 POWER_BI_STANDARD:["Power BI (free)",0,""],FLOW_FREE:["Power Automate Free",0,""],TEAMS_EXPLORATORY:["Teams Exploratory",0,""],
 WINDOWS_STORE:["Windows Store for Business",0,""],POWERAPPS_VIRAL:["Power Apps trial",0,""],STREAM:["Stream trial",0,""],
 CCIBOTS_PRIVPREV_VIRAL:["Copilot Studio viral trial",0,""],Microsoft_Entra_Suite_Trial:["Entra Suite trial",0,""],POWERAPPS_DEV:["Power Apps Developer",0,""],
 RIGHTSMANAGEMENT_ADHOC:["Rights Management Adhoc",0,""],MICROSOFT_BUSINESS_CENTER:["Microsoft Business Center",0,""],DYN365_ENTERPRISE_VIRTUAL_AGENT_VIRAL:["Copilot Studio trial",0,""]
};
var IMPLY={exo2:["exo1","exo-kiosk"],exo1:["exo-kiosk"],entra2:["entra1"],mdo2:["mdo1"],mde2:["mde1"],aip2:["aip1"],appsent:["apps"],pbipremium:["pbi"]};
var NORM={};Object.keys(CAT).forEach(function(k){NORM[nk(k)]=k;NORM[nk(CAT[k][0])]=k});
function nk(s){return String(s).toLowerCase().replace(/[^a-z0-9]/g,"")}
/* resolve an unknown part number or display name, including the "(no Teams)" suites sold in the EEA */
function resolve(raw){
  var n=nk(raw),noTeams=/noteams|withoutteams|woteams/.test(n);
  if(NORM[n])return {key:NORM[n],noTeams:false};
  var base=n.replace(/noteams|withoutteams|woteams|eea|bundle|new|unifiedcomplianceaddon/g,"");
  var guess=[["microsoft365e5","SPE_E5"],["microsoft365e3","SPE_E3"],["office365e5","ENTERPRISEPREMIUM"],["o365e5","ENTERPRISEPREMIUM"],["office365e3","ENTERPRISEPACK"],["o365e3","ENTERPRISEPACK"],["office365e1","STANDARDPACK"],["o365e1","STANDARDPACK"],
    ["microsoft365businesspremium","SPB"],["microsoft365businessstandard","O365_BUSINESS_PREMIUM"],["microsoft365businessbasic","O365_BUSINESS_ESSENTIALS"],["microsoft365f3","SPE_F1"]];
  for(var i=0;i<guess.length;i++)if(base.indexOf(guess[i][0])===0)return {key:guess[i][1],noTeams:noTeams};
  return null;
}
function skuInfo(raw){
  var r=resolve(raw);
  if(!r)return {id:raw,name:raw,price:null,tags:[],known:false};
  var c=CAT[r.key],tags=c[2]?c[2].split(" "):[];
  if(r.noTeams)tags=tags.filter(function(t){return t!=="teams"});
  var all={};tags.forEach(function(t){all[t]=1;(IMPLY[t]||[]).forEach(function(x){all[x]=1;(IMPLY[x]||[]).forEach(function(y){all[y]=1})})});
  return {id:raw,name:c[0]+(r.noTeams?" (no Teams)":""),price:r.noTeams&&c[1]?Math.max(0,+(c[1]-2.5).toFixed(2)):c[1],tags:Object.keys(all),known:true};
}

/* ---------- parsing ---------- */
function parseCSV(text){
  if(text.charCodeAt(0)===0xFEFF)text=text.slice(1);
  var firstLine=text.slice(0,text.indexOf("\n")===-1?text.length:text.indexOf("\n"));
  var delim=",",best=0;[",",";","\t"].forEach(function(d){var n=firstLine.split(d).length;if(n>best){best=n;delim=d}});
  var rows=[],row=[],cur="",q=false,i=0,n=text.length,c;
  while(i<n){
    c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"')q=true;
    else if(c===delim){row.push(cur);cur=""}
    else if(c==="\n"||c==="\r"){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cur);cur="";if(row.length>1||row[0]!=="")rows.push(row);row=[]}
    else cur+=c;
    i++;
  }
  if(cur!==""||row.length){row.push(cur);rows.push(row)}
  if(!rows.length)return {headers:[],rows:[]};
  return {headers:rows.shift().map(function(h){return h.trim()}),rows:rows};
}
function t(s){if(!s)return null;var x=Date.parse(s);return isNaN(x)||x<Date.UTC(2005,0,1)?null:x}
function arr(v){return Array.isArray(v)?v:v===null||v===undefined||v===""?[]:[v]}
function tri(v){if(typeof v==="boolean")return v;var s=String(v===undefined||v===null?"":v).trim();return /^(true|yes|1)$/i.test(s)?true:/^(false|no|0)$/i.test(s)?false:null}
/* returns {users:[...], skus:[...]|null, shared:Set|null, hasSignIn:bool, source:string, exported:ms|null} */
function parseAny(text){
  var s=text.replace(/^﻿/,"").trimStart(),U=[],skus=null,shared=null,exported=null,source;
  if(s[0]==="{"||s[0]==="["){
    var d=JSON.parse(s);if(Array.isArray(d))d={users:d};
    if(!Array.isArray(d.users))throw new Error("the JSON has no users list. Use the export script on this page");
    source="export script";exported=t(d.exported);
    if(Array.isArray(d.skus))skus=d.skus.map(function(k){return {id:String(k.SkuPartNumber||k.skuPartNumber||""),enabled:+(k.Enabled!==undefined?k.Enabled:(k.prepaidUnits||{}).enabled)||0,consumed:+(k.ConsumedUnits!==undefined?k.ConsumedUnits:k.consumedUnits)||0,suspended:+(k.Suspended||0)||0,warning:+(k.Warning||0)||0}}).filter(function(k){return k.id});
    if(d.sharedChecked&&d.sharedMailboxes){shared={};arr(d.sharedMailboxes).forEach(function(u){shared[String(u).toLowerCase()]=1})}
    d.users.forEach(function(u){
      var lic=arr(u.licenses).filter(Boolean).map(String);if(!lic.length)return;
      var a=t(u.lastSignIn),b=t(u.lastNonInteractive);
      U.push({upn:String(u.upn||u.userPrincipalName||""),name:String(u.name||u.displayName||""),enabled:tri(u.enabled!==undefined?u.enabled:u.accountEnabled),type:String(u.type||u.userType||""),created:t(u.created||u.createdDateTime),
        dept:String(u.department||""),last:a&&b?Math.max(a,b):a||b,hasSign:("lastSignIn" in u)||("lastNonInteractive" in u),lic:lic,viaGroup:arr(u.viaGroup).map(String),errors:arr(u.errors).map(String)});
    });
  }else{
    var p=parseCSV(text),H=p.headers.map(nk),col=function(){for(var i=0;i<arguments.length;i++){var k=H.indexOf(arguments[i]);if(k>=0)return k}return -1};
    var cU=col("userprincipalname","upn"),cL=col("licenses","assignedlicenses","license"),cN=col("displayname","name"),cB=col("blockcredential","signinblocked"),cE=col("accountenabled","enabled"),cC=col("whencreated","createddatetime","created"),cS=col("lastsignindatetime","lastsignin","lastsignindate"),cD=col("department"),cT=col("usertype");
    if(cU<0||cL<0)throw new Error("no \"User principal name\" and \"Licenses\" columns found. Use the export from the Microsoft 365 admin center, or the export script on this page");
    source="admin center CSV";
    p.rows.forEach(function(r){
      var lic=String(r[cL]||"").split(/\s*\+\s*|\s*;\s*/).map(function(x){return x.trim()}).filter(function(x){return x&&!/^unlicensed$/i.test(x)});if(!lic.length)return;
      var en=cE>=0?tri(r[cE]):cB>=0?(tri(r[cB])===null?null:!tri(r[cB])):null,upn=String(r[cU]||"").trim();
      U.push({upn:upn,name:cN>=0?String(r[cN]||""):"",enabled:en,type:cT>=0?String(r[cT]||""):(/#ext#/i.test(upn)?"Guest":""),created:cC>=0?t(r[cC]):null,dept:cD>=0?String(r[cD]||""):"",last:cS>=0?t(r[cS]):null,hasSign:cS>=0,lic:lic,viaGroup:[],errors:[]});
    });
  }
  if(!U.length)throw new Error("no licensed users found in the file");
  return {users:U,skus:skus,shared:shared,hasSignIn:U.some(function(u){return u.hasSign}),source:source,exported:exported};
}

/* ---------- analysis ---------- */
var DAY=864e5;
function day(x){return x?new Date(x).toISOString().slice(0,10):"never"}
function plural(n,w){return n+" "+w+(n===1?"":"s")}
function money(n,cur){return (cur||"EUR")+" "+Math.round(n).toLocaleString("en-US")}
function analyse(data,prices,now){
  now=now||data.exported||Date.now();
  var INFO={},info=function(id){return INFO[id]||(INFO[id]=skuInfo(id))},price=function(id){var i=info(id);return prices&&prices[id]!==undefined?prices[id]:(i.price||0)};
  var U=data.users,F=[],counted={},firm=0,review=0;
  function names(ids){return ids.map(function(i){return info(i).name}).join(" + ")}
  function cost(ids){return ids.reduce(function(s,i){return s+price(i)},0)}
  function paid(u){return u.lic.filter(function(i){return price(i)>0})}
  function claim(u,ids){var out=[];ids.forEach(function(i){var k=u.upn+"|"+i;if(!counted[k]){counted[k]=1;out.push(i)}});return out}
  function add(sev,key,title,kind,list,summary,steps,ps,extra){
    list=list.filter(function(x){return x.ids.length});if(!list.length)return;
    var total=list.reduce(function(s,x){return s+cost(x.ids)},0);
    if(kind==="firm")firm+=total;else if(kind==="review")review+=total;
    list.sort(function(a,b){return cost(b.ids)-cost(a.ids)});
    F.push({sev:sev,key:key,title:title,kind:kind,total:total,count:list.length,summary:summary,steps:steps,ps:ps,
      cols:["User","Name","Licences",extra?extra[0]:"Last sign-in","Per month"],
      rows:list.map(function(x){return [x.u.upn,x.u.name,names(x.ids),extra?extra[1](x):day(x.u.last),cost(x.ids).toFixed(2)]})});
  }
  var x;

  x=U.filter(function(u){return u.enabled===false}).map(function(u){return {u:u,ids:claim(u,paid(u))}});
  add("high","disabled","Licences on accounts that are blocked from signing in","firm",x,"These accounts cannot sign in, yet each still holds paid licences. Leavers whose account was disabled but never cleaned up are the usual cause.",
    ["Check each account: a leaver's mailbox may need to become a shared mailbox or go on hold before the licence is removed.","Remove the licences, or better, remove the account from the group that assigns them.","Make licence removal a fixed step of offboarding. The offboarding checklist covers the order."],
    "Get-MgUser -Filter 'accountEnabled eq false' -All -Property userPrincipalName, assignedLicenses |\n  Where-Object { $_.AssignedLicenses.Count -gt 0 } | Select-Object UserPrincipalName, @{n='Licences';e={$_.AssignedLicenses.Count}}");

  if(data.shared){
    x=U.filter(function(u){return data.shared[u.upn.toLowerCase()]}).map(function(u){return {u:u,ids:claim(u,paid(u))}});
    add("med","shared","Licences on shared mailboxes","review",x,"A shared mailbox needs no licence as long as it stays under 50 GB and has no archive and no litigation hold. Mailboxes converted from a leaver's account often keep the old licence.",
      ["Check the size, archive and hold of each mailbox first.","If none applies, remove the licence. The mailbox keeps working.","A shared mailbox that someone signs in to directly is a user mailbox in disguise and does need a licence. Block sign-in on shared mailboxes."],
      "Get-EXOMailbox -RecipientTypeDetails SharedMailbox -ResultSize Unlimited -Properties ArchiveStatus, LitigationHoldEnabled |\n  ForEach-Object { $s = Get-EXOMailboxStatistics $_.UserPrincipalName; [pscustomobject]@{ Mailbox = $_.UserPrincipalName; Size = $s.TotalItemSize; Archive = $_.ArchiveStatus; Hold = $_.LitigationHoldEnabled } }");
  }
  x=U.filter(function(u){return /guest/i.test(u.type)}).map(function(u){return {u:u,ids:claim(u,paid(u))}});
  add("med","guest","Paid licences on guest accounts","review",x,"Guests normally use the licences of their own organisation, and collaboration features in yours are covered by your tenant. A paid licence on a guest is rarely needed.",
    ["Ask whoever assigned it what the guest needs it for.","If the guest is really a long-term external who works only in your tenant, a member account may be the cleaner setup."],
    "Get-MgUser -Filter \"userType eq 'Guest'\" -All -Property userPrincipalName, assignedLicenses |\n  Where-Object { $_.AssignedLicenses.Count -gt 0 } | Select-Object UserPrincipalName");

  if(data.hasSignIn){
    x=U.filter(function(u){return u.enabled!==false&&u.hasSign&&!u.last&&u.created&&now-u.created>30*DAY}).map(function(u){return {u:u,ids:claim(u,paid(u))}});
    add("med","never","Licensed accounts that have never signed in","review",x,"These accounts are more than 30 days old, hold paid licences and have no sign-in on record. Pre-created accounts for people who never started, test accounts and service accounts end up here.",
      ["Sort out service and room accounts first. They may be used without an interactive sign-in and may not need a user licence at all.","For the rest, ask the manager whether the person exists.","Sign-in data needs Entra ID P1 and only goes back as far as Microsoft keeps it. Treat the list as a prompt to check, not as proof."],
      "Get-MgUser -All -Property userPrincipalName, createdDateTime, assignedLicenses, signInActivity |\n  Where-Object { $_.AssignedLicenses.Count -gt 0 -and -not $_.SignInActivity.LastSignInDateTime } |\n  Select-Object UserPrincipalName, CreatedDateTime",["Created",function(x){return day(x.u.created)}]);
    x=U.filter(function(u){return u.enabled!==false&&u.last&&now-u.last>90*DAY}).map(function(u){return {u:u,ids:claim(u,paid(u))}});
    add("med","inactive","Licensed accounts with no sign-in for 90 days","review",x,"No interactive or background sign-in for more than 90 days. Long-term absence, parental leave and forgotten accounts all look the same here.",
      ["Check with HR or the manager before touching anything.","For long absences, consider removing the licence and keeping the account. The mailbox is deleted 30 days after the licence goes unless it is on hold, so decide that first.","An account nobody misses should be disabled, not just unlicensed."],
      "$cut = (Get-Date).AddDays(-90)\nGet-MgUser -All -Property userPrincipalName, assignedLicenses, signInActivity |\n  Where-Object { $_.AssignedLicenses.Count -gt 0 -and $_.SignInActivity.LastSignInDateTime -and $_.SignInActivity.LastSignInDateTime -lt $cut } |\n  Select-Object UserPrincipalName, @{n='LastSignIn';e={$_.SignInActivity.LastSignInDateTime}}");
  }

  /* overlap: a licence whose whole content is contained in another licence of the same user */
  x=U.map(function(u){
    var red=[],why={};
    u.lic.forEach(function(a){
      var A=info(a);if(!A.tags.length||price(a)<=0)return;
      u.lic.forEach(function(b){
        if(a===b||why[a])return;var B=info(b);if(!B.tags.length)return;
        var sub=A.tags.every(function(tg){return B.tags.indexOf(tg)>=0});
        if(sub&&(B.tags.length>A.tags.length||(B.tags.length===A.tags.length&&a>b))){why[a]=B.name;red.push(a)}
      });
    });
    return {u:u,ids:claim(u,red),why:why};
  });
  add("high","overlap","Licences that are fully covered by another licence of the same user","firm",x,"Everything the smaller licence provides is already part of the bigger one the user also has. This happens when someone is upgraded and the old licence is left in place, or when two licence groups overlap.",
    ["Remove the smaller licence. Nothing changes for the user.","If the licence comes from a group, fix the group membership instead of the user, or it comes back.","Check add-ons bought before a suite upgrade: Entra ID P1, Intune, Defender for Office and Power BI Pro are the usual leftovers."],
    "Get-MgUser -All -Property userPrincipalName, assignedLicenses | Where-Object { $_.AssignedLicenses.Count -gt 1 } |\n  Select-Object UserPrincipalName, @{n='Licences';e={$_.AssignedLicenses.Count}}",["Covered by",function(x){return x.ids.map(function(i){return x.why[i]}).filter(function(v,i,a){return a.indexOf(v)===i}).join(", ")}]);

  /* purchased but unassigned */
  var skuRows=[],shelf=0,shelfList=[],seen={},over=[];
  (data.skus||[]).forEach(function(k){
    seen[k.id]=1;var free=k.enabled-k.consumed,p=price(k.id);
    skuRows.push({id:k.id,name:info(k.id).name,known:info(k.id).known,bought:k.enabled,assigned:k.consumed,free:free,price:p,suspended:k.suspended+k.warning});
    if(free>0&&p>0&&k.enabled<10000){shelf+=free*p;shelfList.push([info(k.id).name,k.enabled,k.consumed,free,(free*p).toFixed(2)])}
    if(free<0)over.push(info(k.id).name+" ("+(-free)+" more assigned than bought)");
  });
  var byId={};U.forEach(function(u){u.lic.forEach(function(i){byId[i]=(byId[i]||0)+1})});
  Object.keys(byId).forEach(function(i){if(!seen[i])skuRows.push({id:i,name:info(i).name,known:info(i).known,bought:null,assigned:byId[i],free:null,price:price(i),suspended:0})});
  skuRows.sort(function(a,b){return (b.price*(b.bought===null?b.assigned:b.bought))-(a.price*(a.bought===null?a.assigned:a.bought))});
  if(shelfList.length){shelfList.sort(function(a,b){return b[4]-a[4]});
    F.push({sev:"high",key:"shelf",title:"Licences that are paid for but assigned to nobody",kind:"shelf",total:shelf,count:shelfList.length,
      summary:"These subscriptions have more seats than users. The difference is billed every month. A small reserve for new starters is sensible, a large one is forgotten money.",
      steps:["Decide how many spare seats you really need per product. Two or three is plenty for most small tenants.","Reduce the seat count at the next renewal, or right away on a monthly term. Annual terms can usually only be reduced when they renew.","Remember that every licence you reclaim from the other findings ends up here first. The saving becomes real when the seat count goes down."],
      ps:"Get-MgSubscribedSku -All | Select-Object SkuPartNumber, ConsumedUnits, @{n='Bought';e={$_.PrepaidUnits.Enabled}}, @{n='Free';e={$_.PrepaidUnits.Enabled - $_.ConsumedUnits}}",
      cols:["Product","Bought","Assigned","Free","Per month"],rows:shelfList});
  }
  var errs=U.filter(function(u){return u.errors.length});
  if(errs.length)F.push({sev:"med",key:"errors",title:"Group-based licence assignments in error",kind:"info",total:0,count:errs.length,
    summary:"For these users a group tried to assign a licence and failed. They do not have what the group was meant to give them. The cause is usually no seats left, a conflict between two licences, or a missing usage location.",
    steps:["Open the group in Entra ID under Licenses to see the reason per user.","Fix the cause, then use Reprocess on the group."],
    ps:"Get-MgUser -All -Property userPrincipalName, licenseAssignmentStates |\n  Where-Object { $_.LicenseAssignmentStates.State -contains 'Error' } | Select-Object UserPrincipalName",
    cols:["User","Name","Licence in error"],rows:errs.map(function(u){return [u.upn,u.name,names(u.errors)]})});
  var mixed=U.filter(function(u){return u.viaGroup.length&&u.lic.some(function(i){return u.viaGroup.indexOf(i)<0&&price(i)>0})});
  var anyGroup=U.some(function(u){return u.viaGroup.length});
  if(anyGroup&&mixed.length)F.push({sev:"info",key:"direct",title:"Direct assignments next to group-based licensing",kind:"info",total:0,count:mixed.length,
    summary:"These users get some licences from a group and others assigned by hand. Hand-assigned licences are the ones that survive a department change or an offboarding.",
    steps:["Move recurring combinations into licence groups.","Keep direct assignment for true one-offs and note why."],
    ps:"Get-MgUser -All -Property userPrincipalName, licenseAssignmentStates |\n  Where-Object { ($_.LicenseAssignmentStates | Where-Object { -not $_.AssignedByGroup }) -and ($_.LicenseAssignmentStates | Where-Object AssignedByGroup) } |\n  Select-Object UserPrincipalName",
    cols:["User","Name","Assigned directly"],rows:mixed.map(function(u){return [u.upn,u.name,names(u.lic.filter(function(i){return u.viaGroup.indexOf(i)<0&&price(i)>0}))]})});

  var ORDER={high:0,med:1,info:2};F.sort(function(a,b){return ORDER[a.sev]-ORDER[b.sev]||b.total-a.total});
  var spend=skuRows.reduce(function(s,k){return s+k.price*(k.bought===null||k.bought>=10000?k.assigned:k.bought)},0);
  var unknown=skuRows.filter(function(k){return !k.known}).map(function(k){return k.id});
  return {users:U.length,findings:F,firm:firm,review:review,shelf:shelf,total:firm+review+shelf,spend:spend,skuRows:skuRows,unknown:unknown,over:over,now:now,
    notChecked:[].concat(data.hasSignIn?[]:["inactive and never-used accounts (the file has no sign-in dates)"],data.shared?[]:["shared mailboxes (not in the file)"],data.skus?[]:["unassigned seats (the file has no subscription totals)"])};
}

/* ---------- export script shown on the page ---------- */
var SCRIPT=["# Read-only. Writes licences.json into the current folder.",
"# Needs the Microsoft.Graph module. Sign-in dates need Entra ID P1.",
"Connect-MgGraph -Scopes 'User.Read.All','AuditLog.Read.All','Organization.Read.All' -NoWelcome",
"",
"$skus = Get-MgSubscribedSku -All | Select-Object SkuId, SkuPartNumber, ConsumedUnits,",
"  @{n='Enabled';e={$_.PrepaidUnits.Enabled}}, @{n='Suspended';e={$_.PrepaidUnits.Suspended}}, @{n='Warning';e={$_.PrepaidUnits.Warning}}",
"$map = @{}; $skus | ForEach-Object { $map[[string]$_.SkuId] = $_.SkuPartNumber }",
"",
"$users = Get-MgUser -All -Property id,displayName,userPrincipalName,accountEnabled,userType,createdDateTime,department,assignedLicenses,licenseAssignmentStates,signInActivity |",
"  Where-Object { $_.AssignedLicenses.Count -gt 0 } | ForEach-Object {",
"    [pscustomobject]@{",
"      upn = $_.UserPrincipalName; name = $_.DisplayName; enabled = $_.AccountEnabled; type = $_.UserType",
"      created = $_.CreatedDateTime; department = $_.Department",
"      lastSignIn = $_.SignInActivity.LastSignInDateTime; lastNonInteractive = $_.SignInActivity.LastNonInteractiveSignInDateTime",
"      licenses = @($_.AssignedLicenses | ForEach-Object { $map[[string]$_.SkuId] })",
"      viaGroup = @($_.LicenseAssignmentStates | Where-Object AssignedByGroup | ForEach-Object { $map[[string]$_.SkuId] })",
"      errors   = @($_.LicenseAssignmentStates | Where-Object State -eq 'Error' | ForEach-Object { $map[[string]$_.SkuId] })",
"    }",
"  }",
"",
"# Optional: shared mailboxes. Only runs if you are connected to Exchange Online (Connect-ExchangeOnline).",
"$shared = @(); $sharedChecked = $false",
"if (Get-Command Get-EXOMailbox -ErrorAction SilentlyContinue) {",
"  try { $shared = @(Get-EXOMailbox -RecipientTypeDetails SharedMailbox -ResultSize Unlimited | ForEach-Object UserPrincipalName); $sharedChecked = $true } catch { }",
"}",
"",
"[pscustomobject]@{ exported = (Get-Date).ToUniversalTime().ToString('o'); skus = @($skus); users = @($users); sharedMailboxes = $shared; sharedChecked = $sharedChecked } |",
"  ConvertTo-Json -Depth 5 | Out-File licences.json -Encoding utf8"].join("\n");

/* ---------- rendering ---------- */
function table(cols,rows,max){
  var wrap=el("div","tw"),tb=el("table","tbl"),th=el("thead"),tr=el("tr"),body=el("tbody");
  cols.forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
  rows.slice(0,max||rows.length).forEach(function(r){var x=el("tr");r.forEach(function(c){x.append(el("td",null,c))});body.append(x)});
  tb.append(th,body);wrap.append(tb);
  if(max&&rows.length>max)wrap.append(el("p","note","Showing "+max+" of "+rows.length+". The CSV and the report contain all of them."));
  return wrap;
}
function tile(label,value,sub){var d=el("div","stat");d.append(el("span","stat-k",label),el("b","stat-v",value));if(sub)d.append(el("span","stat-s",sub));return d}
function save(name,text,type){var blob=new Blob([text],{type:type}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
function csv(cols,rows){var q=function(v){v=String(v===null||v===undefined?"":v);if(/^[=+\-@]/.test(v))v="'"+v;return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};return [cols].concat(rows).map(function(r){return r.map(q).join(",")}).join("\r\n")}
function copyBtn(label,text){var b=el("button","btn ghost",label);b.type="button";b.addEventListener("click",function(){if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent=label},1400)})});return b}
function remember(k,o){try{if(localStorage.getItem("ah_cockpit_on")!=="1")return;var d=JSON.parse(localStorage.getItem("ah_cockpit")||"{}");o.ts=Date.now();d[k]=o;localStorage.setItem("ah_cockpit",JSON.stringify(d))}catch(e){}}
var state={data:null,prices:{},result:null,name:"",cur:"EUR"};
var SEVN={high:"high",med:"medium",info:"info"},KIND={firm:"can go",review:"check first",shelf:"at renewal",info:""};

function render(){
  var out=$("lo-out");out.replaceChildren();
  var R=analyse(state.data,state.prices),cur=state.cur;state.result=R;
  $("lo-status").textContent=plural(R.users,"licensed user")+" read from "+state.name+" ("+state.data.source+").";
  var share=R.spend?Math.round(R.total/R.spend*100):0,sev=R.total<=0?"info":share>=15?"high":"med";
  var v=el("div","verdict v-"+sev);
  if(R.total>0)v.append(el("b",null,"Up to "+money(R.total,cur)+" per month is not doing any work"),el("span",null,money(R.total*12,cur)+" per year"+(R.spend?", about "+share+"% of the "+money(R.spend,cur)+" monthly licence bill":"")));
  else v.append(el("b",null,"No wasted licences found"),el("span",null,"none of the checks matched this export"));
  out.append(v);
  var stats=el("div","stats");stats.style.setProperty("--cols","4");
  stats.append(tile("can go now",money(R.firm,cur),"blocked accounts and covered licences"),tile("check first",money(R.review,cur),"inactive, shared mailboxes, guests"),
    tile("unassigned seats",state.data.skus?money(R.shelf,cur):"n/a",state.data.skus?"bought but given to nobody":"not in this file"),tile("licensed users",R.users.toLocaleString("en-US"),state.data.source));
  out.append(stats);
  if(R.over.length)out.append(el("p","note","More licences assigned than bought: "+R.over.join("; ")+". Check the subscription state in the admin center."));

  out.append(el("h2",null,"findings"));
  if(!R.findings.length)out.append(el("p","dim","None of the checks matched. That is a statement about this export and these checks."));
  R.findings.forEach(function(f,i){
    var d=el("details","finding f-"+(f.sev==="high"?"high":f.sev==="med"?"med":"info"));if(i<2&&f.sev==="high")d.open=true;
    var s=el("summary");s.append(el("span","sevtag",SEVN[f.sev]),el("b",null,f.title+" ("+f.count+")"+(f.total>0?": "+money(f.total,cur)+" per month":"")));
    d.append(s,el("p",null,f.summary),table(f.cols,f.rows,20));
    var b=el("button","btn ghost","Download this list (.csv)");b.type="button";b.addEventListener("click",function(){save("licences-"+f.key+".csv",csv(f.cols,f.rows),"text/csv")});
    d.append(b,el("h3","fh","what to do"));
    var ol=el("ol","steps");f.steps.forEach(function(x){ol.append(el("li",null,x))});d.append(ol);
    d.append(el("h3","fh","list them again later"),el("pre",null,f.ps),copyBtn("Copy command",f.ps));out.append(d);
  });
  if(R.notChecked.length){var sk=el("div","note");sk.append(el("b",null,"Not checked: "),document.createTextNode(R.notChecked.join("; ")+". The export script on this page delivers all of it."));out.append(sk)}

  out.append(el("h2",null,"your licences and prices"));
  out.append(el("p","dim","The prices are rough list prices per user and month and will not match your agreement. Change them and every figure above is recalculated. They are not stored."));
  var wrap=el("div","tw"),tb=el("table","tbl"),th=el("thead"),tr=el("tr"),body=el("tbody");
  ["Product","Bought","Assigned","Free","Price per month","Monthly cost"].forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
  R.skuRows.forEach(function(k){
    var r=el("tr"),inp=el("input","q");inp.type="number";inp.min="0";inp.step="0.1";inp.value=String(k.price);inp.style.cssText="width:9ch;margin:0;padding:4px 8px";inp.setAttribute("aria-label","Price per month for "+k.name);
    inp.addEventListener("change",function(){var n=parseFloat(inp.value);state.prices[k.id]=isNaN(n)||n<0?0:n;render();var again=document.querySelector('#lo-out input[data-id="'+k.id.replace(/"/g,"")+'"]');if(again)again.focus()});
    inp.dataset.id=k.id;
    var td=el("td");td.append(inp);
    var seats=k.bought===null||k.bought>=10000?k.assigned:k.bought;
    r.append(el("td",null,k.name+(k.known?"":" (unknown product, set a price)")),el("td",null,k.bought===null?"n/a":k.bought>=10000?"unlimited":k.bought),el("td",null,k.assigned),el("td",null,k.free===null||k.bought>=10000?"":k.free),td,el("td",null,(k.price*seats).toFixed(2)));
    body.append(r);
  });
  tb.append(th,body);wrap.append(tb);out.append(wrap);
  var cl=el("label","dim","Currency label ");cl.style.cssText="display:inline-flex;gap:8px;align-items:center;margin-top:12px";
  var ci=el("input","q");ci.value=cur;ci.maxLength=4;ci.style.cssText="width:8ch;margin:0;padding:4px 8px";ci.addEventListener("change",function(){state.cur=(ci.value.trim()||"EUR").slice(0,4);render()});cl.append(ci);out.append(cl);

  var ctl=el("div","ctl");ctl.style.marginTop="28px";
  var dl=el("button","btn","Download report (.md)");dl.type="button";dl.addEventListener("click",function(){save("licence-report.md",report(),"text/markdown")});
  var pr=el("button","btn ghost","Print / save as PDF");pr.type="button";pr.addEventListener("click",function(){document.querySelectorAll("#lo-out details").forEach(function(x){x.open=true});window.print()});
  ctl.append(dl,pr);out.append(ctl);out.hidden=false;
  remember("licences",{total:Math.round(R.total),year:Math.round(R.total*12),cur:cur,users:R.users,top:R.findings.filter(function(f){return f.total>0}).slice(0,3).map(function(f){return f.title+" ("+f.count+")"})});
}
function report(){
  var R=state.result,cur=state.cur,L=[];if(!R)return "";
  L.push("# Licence review","","Source: "+state.name,"Licensed users: "+R.users,"Not doing any work: up to "+money(R.total,cur)+" per month ("+money(R.total*12,cur)+" per year)",
    "- can go now: "+money(R.firm,cur),"- check first: "+money(R.review,cur),"- unassigned seats: "+money(R.shelf,cur),"","Prices are the ones entered on the page, not contract prices.","Generated in the browser by the admin_hub license optimizer. No data left this device.","");
  R.findings.forEach(function(f){
    L.push("## "+f.title+" ("+f.count+")"+(f.total>0?": "+money(f.total,cur)+" per month":""),"",f.summary,"","| "+f.cols.join(" | ")+" |","|"+f.cols.map(function(){return " --- "}).join("|")+"|");
    f.rows.forEach(function(r){L.push("| "+r.map(function(c){return String(c).replace(/\|/g,"\\|")}).join(" | ")+" |")});
    L.push("","**What to do**","");f.steps.forEach(function(s,i){L.push((i+1)+". "+s)});L.push("");
  });
  if(R.notChecked.length)L.push("## Not checked","",R.notChecked.map(function(s){return "- "+s}).join("\n"),"");
  return L.join("\n");
}
function load(text,name){
  try{state.data=parseAny(text);state.prices={};state.name=name;render();$("lo-out").scrollIntoView({behavior:"smooth",block:"start"})}
  catch(e){$("lo-out").hidden=true;$("lo-status").textContent="Could not read that file: "+e.message+"."}
}
function readFile(f){
  if(!f)return;$("lo-status").textContent="Reading "+f.name+" ...";
  var r=new FileReader();r.onload=function(){load(String(r.result),f.name)};r.onerror=function(){$("lo-status").textContent="The browser could not read that file."};r.readAsText(f);
}

/* ---------- sample: a made-up tenant ---------- */
function sample(){
  var seed=77123,rnd=function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},pick=function(a){return a[Math.floor(rnd()*a.length)]};
  var now=Date.now(),FN=["anna","ben","carla","david","elif","finn","greta","hasan","ines","jonas","kira","lukas","mila","noah","olga","paul","rosa","sven","tara","umut","vera","willi","yara","zoe"],LN=["schmidt","meyer","kaya","novak","rossi","dubois","jansen","nowak","silva","berg","haas","lang","wolf","koch","peters","brandt"],DEP=["Sales","Engineering","Finance","Operations","Support"];
  var users=[],n=0,iso=function(x){return x?new Date(x).toISOString():null};
  function u(lic,o){o=o||{};var f=pick(FN),l=pick(LN);n++;
    users.push({upn:o.upn||(f+"."+l+n+"@contoso.com"),name:o.name||(f[0].toUpperCase()+f.slice(1)+" "+l[0].toUpperCase()+l.slice(1)),enabled:o.enabled===undefined?true:o.enabled,type:o.type||"Member",created:iso(now-(o.age||200+rnd()*900)*DAY),department:pick(DEP),
      lastSignIn:o.last===null?null:iso(now-(o.last===undefined?rnd()*5:o.last)*DAY),lastNonInteractive:o.last===null?null:iso(now-(o.last===undefined?rnd()*2:o.last)*DAY),licenses:lic,viaGroup:o.direct?[]:lic.slice(0,1),errors:o.err||[]});
  }
  var i;
  for(i=0;i<78;i++)u(["SPE_E3"]);
  for(i=0;i<14;i++)u(["SPE_E5"]);
  for(i=0;i<22;i++)u(["SPB"]);
  for(i=0;i<9;i++)u(["SPE_E3","AAD_PREMIUM"]);                    // old add-on left behind
  for(i=0;i<6;i++)u(["SPE_E3","EMS"]);
  for(i=0;i<4;i++)u(["SPE_E5","POWER_BI_PRO","MCOEV"]);
  for(i=0;i<3;i++)u(["SPE_E3","ENTERPRISEPACK"]);                 // upgraded, old suite still assigned
  for(i=0;i<5;i++)u(["SPB","O365_BUSINESS_ESSENTIALS"]);
  for(i=0;i<7;i++)u(["SPE_E3","VISIOCLIENT"]);
  for(i=0;i<5;i++)u(["SPE_E3","PROJECTPROFESSIONAL","POWER_BI_STANDARD","FLOW_FREE"]);
  for(i=0;i<11;i++)u(["SPE_E3"],{enabled:false,last:30+i*20,direct:true});   // leavers
  for(i=0;i<3;i++)u(["SPE_E5","MCOEV"],{enabled:false,last:120});
  for(i=0;i<8;i++)u(["SPE_E3"],{last:100+i*25});
  for(i=0;i<5;i++)u(["SPB"],{last:null,age:60+i*40,direct:true});
  ["info","sales","invoices","jobs","support"].forEach(function(m,k){u([k<3?"SPE_E3":"EXCHANGEENTERPRISE"],{upn:m+"@contoso.com",name:m[0].toUpperCase()+m.slice(1)+" (shared)",last:null,age:700,direct:true})});
  for(i=0;i<3;i++)u(["SPE_E3"],{upn:"partner"+i+"_example.org#EXT#@contoso.onmicrosoft.com",name:"Partner "+i,type:"Guest",direct:true});
  for(i=0;i<4;i++)u(["SPE_E3"],{err:["POWER_BI_PRO"]});
  var count={};users.forEach(function(x){x.licenses.forEach(function(l){count[l]=(count[l]||0)+1})});
  var extra={SPE_E3:14,SPE_E5:3,SPB:6,VISIOCLIENT:9,PROJECTPROFESSIONAL:5,POWER_BI_PRO:0,MCOEV:2,AAD_PREMIUM:11,EMS:0,ENTERPRISEPACK:7,O365_BUSINESS_ESSENTIALS:0,EXCHANGEENTERPRISE:1};
  var skus=Object.keys(count).map(function(k){var free=/STANDARD$|FREE$/.test(k);return {SkuPartNumber:k,ConsumedUnits:count[k],Enabled:free?1000000:count[k]+(extra[k]||0),Suspended:0,Warning:0}});
  return JSON.stringify({exported:new Date(now).toISOString(),skus:skus,users:users,sharedMailboxes:["info@contoso.com","sales@contoso.com","invoices@contoso.com","jobs@contoso.com","support@contoso.com"],sharedChecked:true},null,1);
}

window.licenseOpt={parse:parseAny,analyse:analyse,sample:sample,skuInfo:skuInfo,script:SCRIPT,report:function(){return state.result?report():""}};
if(!$("lo-drop"))return;
var drop=$("lo-drop"),file=$("lo-file");
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files[0])readFile(e.dataTransfer.files[0])});
$("lo-sample").addEventListener("click",function(){load(sample(),"a made-up sample tenant")});
$("lo-sample-dl").addEventListener("click",function(){save("licences-sample.json",sample(),"application/json")});
var sc=$("lo-script");if(sc){sc.textContent=SCRIPT;sc.after(copyBtn("Copy script",SCRIPT))}
if(location.hash==="#sample")load(sample(),"a made-up sample tenant");
})();
