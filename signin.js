(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e}

/* ---------- parsing ---------- */
function parseCSV(text){
  if(text.charCodeAt(0)===0xFEFF)text=text.slice(1);
  var firstLine=text.slice(0,text.indexOf("\n")===-1?text.length:text.indexOf("\n"));
  var delim=",",best=0;[",",";","\t"].forEach(function(d){var n=firstLine.split(d).length;if(n>best){best=n;delim=d}});
  var rows=[],row=[],cur="",q=false,i=0,n=text.length,c;
  while(i<n){
    c=text[i];
    if(q){
      if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}
      else cur+=c;
    }else if(c==='"')q=true;
    else if(c===delim){row.push(cur);cur=""}
    else if(c==="\n"||c==="\r"){
      if(c==="\r"&&text[i+1]==="\n")i++;
      row.push(cur);cur="";
      if(row.length>1||row[0]!=="")rows.push(row);
      row=[];
    }else cur+=c;
    i++;
  }
  if(cur!==""||row.length){row.push(cur);rows.push(row)}
  if(!rows.length)return {headers:[],rows:[]};
  var headers=rows.shift().map(function(h){return h.trim()});
  return {headers:headers,rows:rows};
}
function flatten(o,prefix,out){
  Object.keys(o||{}).forEach(function(k){
    var v=o[k],key=prefix?prefix+"."+k:k;
    if(v&&typeof v==="object"&&!Array.isArray(v))flatten(v,key,out);
    else out[key]=v===null||v===undefined?"":(typeof v==="object"?JSON.stringify(v):String(v));
  });
  return out;
}
function parseJSON(text){
  var data=JSON.parse(text);
  if(data&&!Array.isArray(data)&&Array.isArray(data.value))data=data.value;
  if(!Array.isArray(data))throw new Error("JSON is not an array of sign-in records");
  var flat=data.map(function(o){return flatten(o,"",{})}),seen={},headers=[];
  flat.forEach(function(o){Object.keys(o).forEach(function(k){if(!seen[k]){seen[k]=1;headers.push(k)}})});
  return {headers:headers,rows:flat.map(function(o){return headers.map(function(h){return o[h]===undefined?"":o[h]})})};
}
function parseAny(text){
  var t=text.replace(/^﻿/,"").trimStart();
  if(t[0]==="["||t[0]==="{")return parseJSON(t);
  return parseCSV(text);
}

/* ---------- column mapping ---------- */
var FIELDS=[
 ["time","Date / time",["dateutc","date","createddatetime","timegenerated","timegeneratedutc","createddatetimeutc","time","timestamp"],true],
 ["user","User (UPN)",["username","userprincipalname","signinidentifier","user","userdisplayname","identity"],true],
 ["ip","IP address",["ipaddress","ip","clientip"],false],
 ["location","Location / country",["locationcountryorregion","countryorregion","country","location","locationdetailscountryorregion"],false],
 ["status","Status",["status","result"],false],
 ["code","Error code",["signinerrorcode","statuserrorcode","errorcode","resulttype"],false],
 ["reason","Failure reason",["failurereason","statusfailurereason","resultdescription"],false],
 ["app","Application",["application","appdisplayname","resourcedisplayname"],false],
 ["client","Client app",["clientapp","clientappused"],false],
 ["ua","User agent",["useragent"],false],
 ["authreq","Authentication requirement",["authenticationrequirement"],false],
 ["compliant","Device compliant",["compliant","devicedetailiscompliant"],false],
 ["managed","Device managed",["managed","devicedetailismanaged"],false]
];
function norm(h){return String(h).toLowerCase().replace(/[^a-z0-9]/g,"")}
function autoMap(headers){
  var nh=headers.map(norm),map={};
  FIELDS.forEach(function(f){
    var idx=-1;
    for(var a=0;a<f[2].length&&idx<0;a++)idx=nh.indexOf(f[2][a]);
    for(var p=0;p<f[2].length&&idx<0;p++)for(var h=0;h<nh.length&&idx<0;h++){var x=f[2][p],y=nh[h];if(y.length>=5&&x.length>=5&&(x.indexOf(y)===0||y.indexOf(x)===0))idx=h}
    map[f[0]]=idx;
  });
  return map;
}

/* ---------- normalisation ---------- */
var INTERRUPT={"50140":1,"50074":1,"50076":1,"50079":1,"50072":1,"50058":1,"50097":1,"16000":1,"16001":1,"65001":1,"50125":1};
var CODES={
 "50126":"Invalid username or password","50053":"Account locked (smart lockout) or sign-in from a blocked IP","50034":"User account does not exist in the tenant",
 "50057":"User account is disabled","50055":"Password expired","50056":"Invalid or missing password","500121":"MFA failed or was denied by the user",
 "50074":"Strong authentication (MFA) required","50076":"MFA required by policy or location","50079":"User needs to register for MFA","50072":"User needs to enrol for MFA",
 "50140":"Keep-me-signed-in prompt interrupt","50158":"External security challenge not satisfied","53003":"Blocked by Conditional Access",
 "53000":"Device is not compliant (Conditional Access)","53001":"Device is not domain joined (Conditional Access)","53004":"Proof-up blocked: suspicious activity",
 "50058":"Silent sign-in failed, session info missing","50173":"Token revoked or expired, fresh sign-in needed","70043":"Refresh token expired due to sign-in frequency",
 "70044":"Session expired or invalid due to sign-in frequency","700016":"Application not found in the tenant","7000218":"Request lacked client_assertion or client_secret",
 "65001":"User or admin has not consented to the application","90072":"Account not present in this tenant (guest not invited)","50105":"User not assigned to a role for the application",
 "50020":"User from another identity provider not in tenant","50059":"No tenant-identifying information found","90095":"Admin consent required","50097":"Device authentication required",
 "50089":"Flow token expired","50133":"Session invalid: password changed or expired","530032":"Blocked by security policy (tenant restrictions)","50199":"User confirmation required (CmsiInterrupt)"
};
var BADPW={"50126":1,"50053":1,"50034":1,"50056":1};
var LEGACY=/imap|pop3?\b|smtp|activesync|other clients|autodiscover|mapi|offline address book|exchange web services|exchange online powershell|reporting web services/i;
var BADUA=/python-requests|python-urllib|aiohttp|curl\/|wget\/|go-http-client|axios|node-fetch|okhttp|libwww|fasthttp|bav2ropc|java\/|httpclient|undici|scrapy/i;

function parseTime(s){
  s=String(s).trim();if(!s)return NaN;
  if(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s))s=s.replace(" ","T")+"Z";
  return Date.parse(s);
}
function truthy(s){return /^(true|yes|1)$/i.test(String(s).trim())}
function country(s){
  s=String(s||"").trim();if(!s)return "";
  if(s[0]==="{"){try{var o=JSON.parse(s);return String(o.countryOrRegion||"").toUpperCase()}catch(e){return ""}}
  var p=s.split(",");return p[p.length-1].trim().toUpperCase();
}
function normalise(parsed,map){
  var ev=[],skipped=0,has={};
  FIELDS.forEach(function(f){has[f[0]]=map[f[0]]>=0});
  parsed.rows.forEach(function(r){
    var g=function(k){return map[k]>=0?(r[map[k]]||"").trim():""};
    var t=parseTime(g("time")),user=g("user").toLowerCase();
    if(isNaN(t)||!user){skipped++;return}
    var code=g("code").replace(/\.0$/,""),st=g("status").toLowerCase(),res;
    if(has.code&&code!==""){res=code==="0"?"ok":(INTERRUPT[code]||st.indexOf("interrupt")===0?"int":"fail")}
    else if(st)res=/^(success|0)$/.test(st)?"ok":(st.indexOf("interrupt")===0?"int":"fail");
    else res="ok";
    ev.push({t:t,user:user,ip:g("ip"),cc:country(g("location")),res:res,code:code==="0"?"":code,reason:g("reason"),app:g("app"),client:g("client"),ua:g("ua"),
      sfa:/single/i.test(g("authreq")),compliant:truthy(g("compliant")),managed:truthy(g("managed"))});
  });
  ev.sort(function(a,b){return a.t-b.t});
  return {events:ev,skipped:skipped,has:has};
}

/* ---------- helpers ---------- */
function groupBy(arr,fn){var m=new Map();arr.forEach(function(x){var k=fn(x);if(k===""||k===undefined)return;var a=m.get(k);if(!a){a=[];m.set(k,a)}a.push(x)});return m}
function uniq(arr){return Array.from(new Set(arr))}
function fmt(t){return new Date(t).toISOString().replace("T"," ").slice(0,16)+"Z"}
function plural(n,w){return n+" "+w+(n===1?"":"s")}
function listSome(a,max){max=max||4;return a.slice(0,max).join(", ")+(a.length>max?" +"+(a.length-max)+" more":"")}

/* ---------- detections ---------- */
var SEV={crit:0,high:1,med:2,info:3},SEVNAME={crit:"critical",high:"high",med:"medium",info:"info"};
function detect(ev,has){
  var F=[],skippedChecks=[];
  var ok=ev.filter(function(e){return e.res==="ok"}),fail=ev.filter(function(e){return e.res==="fail"});

  // 1 password spray
  if(has.ip&&has.code){
    var rows=[],hit=false;
    groupBy(fail.filter(function(e){return BADPW[e.code]}),function(e){return e.ip}).forEach(function(list,ip){
      var users=uniq(list.map(function(e){return e.user}));
      if(users.length<5)return;
      var first=list[0].t;
      var wins=uniq(ok.filter(function(e){return e.ip===ip&&e.t>=first}).map(function(e){return e.user}));
      if(wins.length)hit=true;
      rows.push([ip,list[0].cc||"?",users.length,list.length,wins.length?wins.join(", "):"none",fmt(first),fmt(list[list.length-1].t)]);
    });
    rows.sort(function(a,b){return b[2]-a[2]});
    if(rows.length)F.push({id:"spray",sev:hit?"crit":"high",title:"Password spray"+(hit?" with at least one successful sign-in":""),
      summary:plural(rows.length,"IP address")+" tried wrong passwords against 5 or more different accounts."+(hit?" At least one of those addresses then signed in successfully: treat those accounts as compromised until proven otherwise.":" None of them signed in successfully in this data."),
      cols:["IP","Country","Accounts targeted","Failed attempts","Successful sign-ins from this IP","First seen","Last seen"],rows:rows,
      steps:hit?["Reset the password and revoke sessions for every account listed under successful sign-ins.","Check those mailboxes for new inbox rules, forwarding and OAuth app consents.","Block the source addresses with a Conditional Access named location.","Confirm MFA is enforced for every user, without exceptions for legacy protocols."]:["Block the source addresses with a Conditional Access named location.","Confirm every targeted account has MFA enforced and no legacy-protocol exception.","Check whether smart lockout thresholds fit your environment."],
      kql:'SigninLogs\n| where TimeGenerated > ago(7d)\n| where ResultType in ("50126","50053","50034","50056")\n| summarize Accounts=dcount(UserPrincipalName), Attempts=count() by IPAddress, bin(TimeGenerated, 1h)\n| where Accounts >= 5\n| order by Accounts desc'});
  }else skippedChecks.push("Password spray (needs IP address and error code columns)");

  // 2 guessing against single accounts
  if(has.code){
    var rows2=[],hit2=false;
    groupBy(fail.filter(function(e){return e.code==="50126"||e.code==="50053"||e.code==="50056"}),function(e){return e.user}).forEach(function(list,user){
      if(list.length<10)return;
      var ipCount={};list.forEach(function(e){ipCount[e.ip]=(ipCount[e.ip]||0)+1});
      var win=ok.filter(function(e){return e.user===user&&e.t>list[0].t&&ipCount[e.ip]>=3})[0];
      if(win)hit2=true;
      rows2.push([user,list.length,uniq(list.map(function(e){return e.ip})).length,win?fmt(win.t)+" from "+win.ip:"no",fmt(list[0].t),fmt(list[list.length-1].t)]);
    });
    rows2.sort(function(a,b){return b[1]-a[1]});
    if(rows2.length)F.push({id:"brute",sev:hit2?"crit":"med",title:"Repeated password failures on single accounts"+(hit2?", followed by success from the same IP":""),
      summary:plural(rows2.length,"account")+" had 10 or more wrong-password or lockout events."+(hit2?" For at least one, the address that was guessing later signed in successfully.":" This is often a stale password on a phone or service, but it is also what targeted guessing looks like."),
      cols:["Account","Failures","Distinct IPs","Success from a guessing IP","First","Last"],rows:rows2,
      steps:["If a guessing IP signed in: reset the password, revoke sessions, review the mailbox.","If the failures come from one internal IP or a known device, look for an old saved password (mail client, mapped drive, service).","Consider blocking the external source addresses."],
      kql:'SigninLogs\n| where TimeGenerated > ago(7d)\n| where ResultType in ("50126","50053","50056")\n| summarize Failures=count(), IPs=dcount(IPAddress) by UserPrincipalName\n| where Failures >= 10\n| order by Failures desc'});
  }else skippedChecks.push("Repeated password failures (needs error code column)");

  // 3 country switch
  if(has.location){
    var rows3=[];
    groupBy(ok.filter(function(e){return e.cc}),function(e){return e.user}).forEach(function(list,user){
      var seen={};
      for(var i=1;i<list.length;i++){
        var a=list[i-1],b=list[i],mins=(b.t-a.t)/60000;
        if(a.cc!==b.cc&&a.ip!==b.ip&&mins<=120){
          var key=a.cc+">"+b.cc;if(seen[key])continue;seen[key]=1;
          rows3.push([user,a.cc+" ("+a.ip+")",b.cc+" ("+b.ip+")",Math.round(mins)+" min",fmt(b.t),b.app||""]);
        }
      }
    });
    if(rows3.length)F.push({id:"travel",sev:"high",title:"Successful sign-ins from two countries within two hours",
      summary:plural(uniq(rows3.map(function(r){return r[0]})).length,"account")+" signed in successfully from different countries less than two hours apart. A VPN, a mobile carrier or a cloud proxy can explain this. A stolen session token looks exactly the same.",
      cols:["Account","From","To","Gap","Second sign-in","Application"],rows:rows3,
      steps:["Ask the user whether they used a VPN or were travelling. If not, treat as compromised.","Revoke sessions and reset the password, then check for new MFA methods registered around that time.","Look at what the second session did: mailbox rules, file downloads, app consents."],
      kql:'SigninLogs\n| where TimeGenerated > ago(7d) and ResultType == "0"\n| extend Country = tostring(LocationDetails.countryOrRegion)\n| sort by UserPrincipalName asc, TimeGenerated asc\n| extend PrevCountry = prev(Country), PrevTime = prev(TimeGenerated), PrevUser = prev(UserPrincipalName)\n| where UserPrincipalName == PrevUser and Country != PrevCountry\n| extend MinutesApart = datetime_diff("minute", TimeGenerated, PrevTime)\n| where MinutesApart <= 120'});
  }else skippedChecks.push("Country switch (needs location column)");

  // 4 MFA fatigue
  if(has.code){
    var rows4=[],hit4=false;
    groupBy(fail.filter(function(e){return e.code==="500121"}),function(e){return e.user}).forEach(function(list,user){
      if(list.length<5)return;
      var last=list[list.length-1].t,win=ok.filter(function(e){return e.user===user&&e.t>=list[0].t&&e.t<=last+3600000})[0];
      if(win)hit4=true;
      rows4.push([user,list.length,uniq(list.map(function(e){return e.ip})).join(", "),win?fmt(win.t)+" from "+win.ip:"no",fmt(list[0].t),fmt(last)]);
    });
    rows4.sort(function(a,b){return b[1]-a[1]});
    if(rows4.length)F.push({id:"mfa",sev:hit4?"crit":"high",title:"Repeated MFA denials"+(hit4?" that ended in a successful sign-in":""),
      summary:plural(rows4.length,"account")+" had 5 or more failed or denied MFA prompts. That means someone already has the password and is pushing prompts"+(hit4?", and one prompt appears to have been approved.":"."),
      cols:["Account","MFA failures","Source IPs","Success during or right after","First","Last"],rows:rows4,
      steps:["Reset the password now: the attacker has it.","If a sign-in succeeded, revoke sessions and review registered MFA methods.","Turn on number matching and additional context for Authenticator, or move the user to phishing-resistant MFA."],
      kql:'SigninLogs\n| where TimeGenerated > ago(7d) and ResultType == "500121"\n| summarize Denials=count(), IPs=make_set(IPAddress) by UserPrincipalName, bin(TimeGenerated, 1h)\n| where Denials >= 5'});
  }

  // 5 legacy auth
  if(has.client){
    var rows5=[],succ=0;
    groupBy(ev.filter(function(e){return LEGACY.test(e.client)}),function(e){return e.user+"\u0001"+e.client}).forEach(function(list,key){
      var p=key.split("\u0001"),s=list.filter(function(e){return e.res==="ok"}).length;succ+=s;
      rows5.push([p[0],p[1],list.length,s,uniq(list.map(function(e){return e.ip})).length]);
    });
    rows5.sort(function(a,b){return b[3]-a[3]||b[2]-a[2]});
    if(rows5.length)F.push({id:"legacy",sev:succ?"high":"med",title:succ?"Legacy authentication is still working":"Legacy authentication attempts (all blocked or failed)",
      summary:succ?succ+" successful sign-ins used a legacy protocol. Legacy protocols cannot do MFA, so a password alone is enough.":"Clients tried legacy protocols but none succeeded. Good, but worth knowing who is still trying.",
      cols:["Account","Client app","Attempts","Successful","Distinct IPs"],rows:rows5,
      steps:["Create or enable a Conditional Access policy that blocks legacy authentication for all users.","Move the listed accounts to modern clients first (Outlook, Graph, OAuth SMTP) so nothing breaks.","For scanners and line-of-business apps, use an app registration or a dedicated relay rather than a user password."],
      kql:'SigninLogs\n| where TimeGenerated > ago(30d)\n| where ClientAppUsed !in ("Browser","Mobile Apps and Desktop clients")\n| summarize Attempts=count(), Successes=countif(ResultType == "0") by UserPrincipalName, ClientAppUsed\n| order by Successes desc'});
  }else skippedChecks.push("Legacy authentication (needs client app column)");

  // 6 scripted clients
  if(has.ua){
    var rows6=[],succ6=0;
    groupBy(ev.filter(function(e){return BADUA.test(e.ua)}),function(e){return e.ua}).forEach(function(list,ua){
      var s=list.filter(function(e){return e.res==="ok"});succ6+=s.length;
      rows6.push([ua.length>70?ua.slice(0,67)+"...":ua,list.length,s.length,listSome(uniq(list.map(function(e){return e.user})),3),listSome(uniq(list.map(function(e){return e.ip})),3)]);
    });
    rows6.sort(function(a,b){return b[2]-a[2]||b[1]-a[1]});
    if(rows6.length)F.push({id:"ua",sev:succ6?"high":"med",title:"Sign-ins from scripts and HTTP libraries"+(succ6?" that succeeded":""),
      summary:"User agents such as python-requests, axios or BAV2ROPC do not come from a person at a browser. "+(succ6?succ6+" of these sign-ins succeeded. Unless you know the automation behind them, that is a strong sign of token theft or credential abuse.":"All of them failed here, which is the typical footprint of automated guessing."),
      cols:["User agent","Sign-ins","Successful","Accounts","IPs"],rows:rows6,
      steps:["Match each successful one to a known script or integration. Anything you cannot explain is an incident.","For unexplained successes: revoke sessions, reset the password, review mailbox rules.","Move legitimate automation to app registrations with certificates instead of user credentials."],
      kql:'SigninLogs\n| where TimeGenerated > ago(7d)\n| where UserAgent has_any ("python-requests","axios","BAV2ROPC","curl","Go-http-client","node-fetch","okhttp")\n| summarize SignIns=count(), Successes=countif(ResultType == "0"), Users=make_set(UserPrincipalName, 10) by UserAgent'});
  }else skippedChecks.push("Scripted clients (needs user agent column)");

  // 7 rare country
  if(has.location&&ok.length>=50){
    var byCc=groupBy(ok.filter(function(e){return e.cc}),function(e){return e.cc}),rows7=[];
    byCc.forEach(function(list,cc){
      if(list.length/ok.length<0.02)rows7.push([cc,list.length,listSome(uniq(list.map(function(e){return e.user})),4),listSome(uniq(list.map(function(e){return e.ip})),3),fmt(list[0].t)]);
    });
    rows7.sort(function(a,b){return a[1]-b[1]});
    if(rows7.length&&byCc.size>1)F.push({id:"rare",sev:"med",title:"Successful sign-ins from countries you rarely see",
      summary:plural(rows7.length,"country")+" each account for less than 2% of successful sign-ins. Travel and VPNs are normal. An unexpected country with a single user is worth one question to that user.",
      cols:["Country","Successful sign-ins","Accounts","IPs","First seen"],rows:rows7,
      steps:["Check each account against known travel or remote staff.","If you only operate in a few countries, add a Conditional Access policy that blocks or requires MFA from everywhere else."],
      kql:'SigninLogs\n| where TimeGenerated > ago(30d) and ResultType == "0"\n| extend Country = tostring(LocationDetails.countryOrRegion)\n| summarize SignIns=count(), Users=dcount(UserPrincipalName) by Country\n| order by SignIns asc'});
  }

  // 8 single factor
  if(has.authreq){
    var sf=ok.filter(function(e){return e.sfa});
    if(sf.length){
      var rows8=[];
      groupBy(sf,function(e){return e.user}).forEach(function(list,user){rows8.push([user,list.length,listSome(uniq(list.map(function(e){return e.app}).filter(Boolean)),3)])});
      rows8.sort(function(a,b){return b[1]-a[1]});
      var share=sf.length/ok.length;
      F.push({id:"sfa",sev:share>0.2?"med":"info",title:"Successful sign-ins that only required a password",
        summary:Math.round(share*100)+"% of successful sign-ins ("+sf.length+" of "+ok.length+") were single-factor. Some of that is expected, for example when a prior MFA claim in the token is not counted. Accounts that never show multi-factor are the ones to look at.",
        cols:["Account","Single-factor successes","Applications"],rows:rows8,
        steps:["Compare with your Conditional Access policies: which users or apps are excluded from MFA?","Check for break-glass, service and shared accounts that slipped out of scope."],
        kql:'SigninLogs\n| where TimeGenerated > ago(7d) and ResultType == "0"\n| where AuthenticationRequirement == "singleFactorAuthentication"\n| summarize SignIns=count() by UserPrincipalName, AppDisplayName\n| order by SignIns desc'});
    }
  }else skippedChecks.push("Single-factor sign-ins (needs authentication requirement column)");

  // 9 enumeration and disabled accounts
  if(has.code){
    var nf=fail.filter(function(e){return e.code==="50034"}),dis=fail.filter(function(e){return e.code==="50057"}),rows9=[];
    groupBy(dis,function(e){return e.user}).forEach(function(list,user){rows9.push([user,"disabled account (50057)",list.length,listSome(uniq(list.map(function(e){return e.ip})),3)])});
    var nfUsers=uniq(nf.map(function(e){return e.user}));
    if(nfUsers.length>=5)rows9.push([listSome(nfUsers,5),"account does not exist (50034)",nf.length,listSome(uniq(nf.map(function(e){return e.ip})),3)]);
    if(rows9.length)F.push({id:"enum",sev:"info",title:"Attempts on disabled or non-existent accounts",
      summary:"Sign-in attempts against accounts that are disabled or do not exist. For disabled accounts this is usually a former employee's device still trying, or an attacker working from an old user list.",
      cols:["Account","What","Attempts","IPs"],rows:rows9,
      steps:["For disabled accounts with ongoing attempts from internal devices: find and clean up the device.","Many different non-existent names from one address is username enumeration: block the address."],
      kql:'SigninLogs\n| where TimeGenerated > ago(7d) and ResultType in ("50057","50034")\n| summarize Attempts=count(), IPs=make_set(IPAddress, 5) by UserPrincipalName, ResultType'});
  }

  // 10 conditional access blocks
  if(has.code){
    var ca=fail.filter(function(e){return e.code==="53003"||e.code==="53000"||e.code==="53001"||e.code==="530032"});
    if(ca.length){
      var rows10=[];
      groupBy(ca,function(e){return e.user}).forEach(function(list,user){rows10.push([user,list.length,listSome(uniq(list.map(function(e){return e.app}).filter(Boolean)),3),listSome(uniq(list.map(function(e){return e.cc}).filter(Boolean)),4)])});
      rows10.sort(function(a,b){return b[1]-a[1]});
      F.push({id:"ca",sev:"info",title:"Sign-ins blocked by Conditional Access",
        summary:ca.length+" sign-ins were stopped by a Conditional Access policy. That is the policy doing its job. It is listed so you can tell a user who needs help from an attacker who already has a valid password.",
        cols:["Account","Blocks","Applications","Countries"],rows:rows10,
        steps:["A block means the password was correct. If the user did not cause it, reset the password.","If legitimate users are blocked repeatedly, adjust the policy or fix the device compliance state."],
        kql:'SigninLogs\n| where TimeGenerated > ago(7d) and ResultType in ("53003","53000","53001")\n| summarize Blocks=count() by UserPrincipalName, AppDisplayName, tostring(LocationDetails.countryOrRegion)'});
    }
  }
  F.sort(function(a,b){return SEV[a.sev]-SEV[b.sev]});
  return {findings:F,skippedChecks:skippedChecks};
}

/* ---------- rendering ---------- */
function table(cols,rows,max){
  var wrap=el("div","tw"),t=el("table","tbl"),th=el("thead"),tr=el("tr"),tb=el("tbody");
  cols.forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
  rows.slice(0,max||rows.length).forEach(function(r){var x=el("tr");r.forEach(function(c){x.append(el("td",null,c))});tb.append(x)});
  t.append(th,tb);wrap.append(t);
  if(max&&rows.length>max)wrap.append(el("p","note","Showing "+max+" of "+rows.length+" rows. The downloaded report contains all of them."));
  return wrap;
}
function tile(label,value,sub){var d=el("div","stat");d.append(el("span","stat-k",label),el("b","stat-v",value));if(sub)d.append(el("span","stat-s",sub));return d}

function niceBucket(span){
  var opts=[9e5,36e5,3*36e5,6*36e5,12*36e5,864e5,7*864e5];
  for(var i=0;i<opts.length;i++)if(span/opts[i]<=60)return opts[i];
  return opts[opts.length-1];
}
function chart(ev){
  var box=el("div","chartbox");
  var t0=ev[0].t,t1=ev[ev.length-1].t,b=niceBucket(Math.max(t1-t0,1)),start=Math.floor(t0/b)*b,n=Math.floor((t1-start)/b)+1;
  var ok=new Array(n).fill(0),bad=new Array(n).fill(0);
  ev.forEach(function(e){var i=Math.floor((e.t-start)/b);if(e.res==="fail")bad[i]++;else ok[i]++});
  var max=1;for(var i=0;i<n;i++)max=Math.max(max,ok[i]+bad[i]);
  var W=920,H=220,L=44,R=8,T=10,B=26,pw=W-L-R,ph=H-T-B,bw=pw/n,gap=Math.min(2,bw*.25);
  var NS="http://www.w3.org/2000/svg",svg=document.createElementNS(NS,"svg");
  svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("class","chart");svg.setAttribute("role","img");
  svg.setAttribute("aria-label","Sign-ins over time, failed and other, per "+(b>=864e5?(b/864e5)+" day":b>=36e5?(b/36e5)+" hour":"15 minute")+" bucket. The tables below hold the same data.");
  function mk(tag,attrs,text){var e=document.createElementNS(NS,tag);Object.keys(attrs).forEach(function(k){e.setAttribute(k,attrs[k])});if(text!==undefined)e.textContent=text;return e}
  [0,.5,1].forEach(function(f){
    var y=T+ph-ph*f;
    svg.append(mk("line",{x1:L,x2:W-R,y1:y,y2:y,"class":"grid"}),mk("text",{x:L-8,y:y+4,"text-anchor":"end","class":"axis"},Math.round(max*f)));
  });
  var tip=el("div","charttip");tip.hidden=true;
  for(var j=0;j<n;j++){
    var x=L+j*bw+gap/2,w=Math.max(bw-gap,1),hOk=ph*ok[j]/max,hBad=ph*bad[j]/max,g=mk("g",{"class":"bar",tabindex:"0"});
    if(ok[j])g.append(mk("rect",{x:x,y:T+ph-hOk,width:w,height:hOk,"class":"s-ok",rx:Math.min(2,w/2)}));
    if(bad[j])g.append(mk("rect",{x:x,y:T+ph-hOk-hBad-(ok[j]?1.5:0),width:w,height:hBad,"class":"s-bad",rx:Math.min(2,w/2)}));
    g.append(mk("rect",{x:L+j*bw,y:T,width:bw,height:ph,"class":"hit"}));
    (function(j,g){
      function show(){
        tip.replaceChildren(el("b",null,fmt(start+j*b)),el("span",null,"failed: "+bad[j]),el("span",null,"successful / other: "+ok[j]));
        tip.hidden=false;
        var r=g.getBoundingClientRect(),p=box.getBoundingClientRect();
        tip.style.left=Math.min(Math.max(r.left-p.left+r.width/2-80,0),p.width-170)+"px";
      }
      g.addEventListener("mouseenter",show);g.addEventListener("focus",show);
      g.addEventListener("mouseleave",function(){tip.hidden=true});g.addEventListener("blur",function(){tip.hidden=true});
    })(j,g);
    svg.append(g);
  }
  [[0,"start"],[Math.floor((n-1)/2),"middle"],[n-1,"end"]].forEach(function(p){
    if(n<3&&p[1]==="middle")return;
    svg.append(mk("text",{x:p[1]==="start"?L:p[1]==="end"?W-R:L+p[0]*bw+bw/2,y:H-8,"text-anchor":p[1],"class":"axis"},fmt(start+p[0]*b).slice(0,b>=864e5?10:16)));
  });
  var lg=el("div","legend");
  var a=el("span");a.append(el("i","sw s-bad"),document.createTextNode("failed"));
  var c=el("span");c.append(el("i","sw s-ok"),document.createTextNode("successful / other"));
  lg.append(a,c);
  box.append(lg,svg,tip);
  return box;
}

var state={parsed:null,map:null,result:null,name:""};

function render(){
  var out=$("sa-out");out.replaceChildren();
  var n=normalise(state.parsed,state.map),ev=n.events;
  $("sa-status").textContent=plural(ev.length,"sign-in")+" analysed from "+state.name+(n.skipped?" ("+n.skipped+" rows skipped: no usable date or user)":"")+".";
  renderMapping(n.has);
  if(!ev.length){out.append(el("p","note","No usable rows. Open the column mapping above and point Date and User at the right columns."));out.hidden=false;return}
  var d=detect(ev,n.has),F=d.findings;
  state.result={ev:ev,findings:F,skipped:d.skippedChecks};
  var ok=ev.filter(function(e){return e.res==="ok"}).length,fail=ev.filter(function(e){return e.res==="fail"}).length;
  var counts={crit:0,high:0,med:0,info:0};F.forEach(function(f){counts[f.sev]++});
  var worst=F.length?F[0].sev:"none";

  var verdict=el("div","verdict v-"+worst);
  verdict.append(el("b",null,worst==="crit"?"Act now":worst==="high"?"Needs attention":worst==="med"?"Worth a look":worst==="info"?"Nothing alarming":"Nothing found"));
  verdict.append(el("span",null,F.length?["crit","high","med","info"].filter(function(s){return counts[s]}).map(function(s){return counts[s]+" "+SEVNAME[s]}).join(" · "):"None of the checks matched this data."));
  out.append(verdict);

  var stats=el("div","stats");stats.style.setProperty("--cols","5");
  stats.append(tile("sign-ins",ev.length.toLocaleString("en-US"),fmt(ev[0].t).slice(0,10)+" to "+fmt(ev[ev.length-1].t).slice(0,10)),
    tile("failed",fail.toLocaleString("en-US"),Math.round(fail/ev.length*100)+"% of all"),
    tile("accounts",uniq(ev.map(function(e){return e.user})).length.toLocaleString("en-US")),
    tile("ip addresses",uniq(ev.map(function(e){return e.ip}).filter(Boolean)).length.toLocaleString("en-US")),
    tile("countries",uniq(ev.map(function(e){return e.cc}).filter(Boolean)).length.toLocaleString("en-US")));
  out.append(stats);

  out.append(el("h2",null,"timeline"),chart(ev));

  out.append(el("h2",null,"findings"));
  if(!F.length)out.append(el("p","dim","No detection matched. That is a statement about this export and these checks, not a clean bill of health."));
  F.forEach(function(f,i){
    var d=el("details","finding f-"+f.sev);if(i<3&&SEV[f.sev]<=1)d.open=true;
    var s=el("summary");s.append(el("span","sevtag",SEVNAME[f.sev]),el("b",null,f.title));
    d.append(s,el("p",null,f.summary),table(f.cols,f.rows,25));
    d.append(el("h3","fh","what to do"));
    var ol=el("ol","steps");f.steps.forEach(function(x){ol.append(el("li",null,x))});d.append(ol);
    d.append(el("h3","fh","hunt it in Sentinel / Log Analytics (KQL)"));
    var pre=el("pre",null,f.kql),btn=el("button","btn ghost","Copy query");btn.type="button";
    btn.addEventListener("click",function(){if(navigator.clipboard)navigator.clipboard.writeText(f.kql).then(function(){btn.textContent="Copied";setTimeout(function(){btn.textContent="Copy query"},1400)})});
    d.append(pre,btn);
    out.append(d);
  });
  if(d.skippedChecks.length){
    var sk=el("div","note");sk.append(el("b",null,"Not checked, because the export lacks the column: "));
    sk.append(document.createTextNode(d.skippedChecks.join("; ")+"."));out.append(sk);
  }

  out.append(el("h2",null,"top sources of failures"));
  var ipRows=[];
  groupBy(ev.filter(function(e){return e.res==="fail"&&e.ip}),function(e){return e.ip}).forEach(function(list,ip){
    ipRows.push([ip,list[0].cc||"?",list.length,uniq(list.map(function(e){return e.user})).length,ev.filter(function(e){return e.ip===ip&&e.res==="ok"}).length]);
  });
  ipRows.sort(function(a,b){return b[2]-a[2]});
  out.append(ipRows.length?table(["IP","Country","Failures","Accounts","Successes"],ipRows,10):el("p","dim","No failed sign-ins with an IP address."));

  out.append(el("h2",null,"error codes"));
  var codeRows=[];
  groupBy(ev.filter(function(e){return e.code}),function(e){return e.code}).forEach(function(list,code){
    codeRows.push([code,CODES[code]||list[0].reason||"See aadsts-lookup",list.length,uniq(list.map(function(e){return e.user})).length]);
  });
  codeRows.sort(function(a,b){return b[2]-a[2]});
  if(codeRows.length){
    var tw=table(["Code","Meaning","Events","Accounts"],codeRows,15);
    tw.querySelectorAll("tbody td:first-child").forEach(function(td){var a=el("a",null,td.textContent);a.href="aadsts-lookup.html?q="+encodeURIComponent(td.textContent);a.style.textDecoration="underline";td.replaceChildren(a)});
    out.append(tw);
  }else out.append(el("p","dim","No error codes in this export."));

  var two=el("div","grid2");
  function topTable(title,keyFn,label){
    var rows=[];groupBy(ev,keyFn).forEach(function(list,k){rows.push([k,list.length,list.filter(function(e){return e.res==="fail"}).length])});
    rows.sort(function(a,b){return b[1]-a[1]});
    var box=el("div");box.append(el("h2",null,title),rows.length?table([label,"Sign-ins","Failed"],rows,8):el("p","dim","Column not present."));return box;
  }
  two.append(topTable("countries",function(e){return e.cc},"Country"),topTable("applications",function(e){return e.app},"Application"));
  out.append(two);

  var ctl=el("div","ctl");ctl.style.marginTop="28px";
  var dl=el("button","btn","Download report (.md)");dl.type="button";dl.addEventListener("click",download);
  var pr=el("button","btn ghost","Print / save as PDF");pr.type="button";pr.addEventListener("click",function(){document.querySelectorAll("#sa-out details").forEach(function(x){x.open=true});window.print()});
  ctl.append(dl,pr);out.append(ctl);
  out.hidden=false;
}

function renderMapping(has){
  var box=$("sa-map");box.replaceChildren();
  var grid=el("div","sim");
  FIELDS.forEach(function(f){
    var lab=el("label",null,f[1]+(f[3]?" (required)":"")),sel=el("select","sel");
    var none=el("option",null,"not present");none.value="-1";sel.append(none);
    state.parsed.headers.forEach(function(h,i){var o=el("option",null,h);o.value=String(i);sel.append(o)});
    sel.value=String(state.map[f[0]]);
    sel.addEventListener("change",function(){state.map[f[0]]=parseInt(sel.value,10);render()});
    lab.append(sel);grid.append(lab);
  });
  box.append(grid);
  $("sa-mapwrap").hidden=false;
  var missing=FIELDS.filter(function(f){return f[3]&&!has[f[0]]});
  $("sa-mapwrap").open=missing.length>0;
}

function report(){
  var r=state.result,ev=r.ev,L=[];
  L.push("# Sign-in log analysis","","Source: "+state.name,"Period: "+fmt(ev[0].t)+" to "+fmt(ev[ev.length-1].t),"Sign-ins: "+ev.length+", failed: "+ev.filter(function(e){return e.res==="fail"}).length,"Generated in the browser by admin_hub sign-in analyzer. No data left this device.","");
  if(!r.findings.length)L.push("No detection matched this data.","");
  r.findings.forEach(function(f){
    L.push("## ["+SEVNAME[f.sev].toUpperCase()+"] "+f.title,"",f.summary,"","| "+f.cols.join(" | ")+" |","|"+f.cols.map(function(){return " --- "}).join("|")+"|");
    f.rows.forEach(function(row){L.push("| "+row.map(function(c){return String(c).replace(/\|/g,"\\|")}).join(" | ")+" |")});
    L.push("","**What to do**","");f.steps.forEach(function(s,i){L.push((i+1)+". "+s)});
    L.push("","**KQL**","","```kusto",f.kql,"```","");
  });
  if(r.skipped.length)L.push("## Not checked","",r.skipped.map(function(s){return "- "+s}).join("\n"),"");
  return L.join("\n");
}
function download(){
  var blob=new Blob([report()],{type:"text/markdown"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="signin-analysis.md";document.body.append(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
}
window.signinReport=function(){return state.result?report():""};

function load(text,name){
  var st=$("sa-status");
  try{
    var parsed=parseAny(text);
    if(!parsed.headers.length||!parsed.rows.length)throw new Error("no rows found");
    state.parsed=parsed;state.map=autoMap(parsed.headers);state.name=name;
    render();
    $("sa-out").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){
    $("sa-out").hidden=true;$("sa-mapwrap").hidden=true;
    st.textContent="Could not read that file: "+e.message+". Expected a CSV export of Entra sign-in logs, or JSON from Microsoft Graph.";
  }
}
function readFile(f){
  if(!f)return;
  $("sa-status").textContent="Reading "+f.name+" ...";
  var r=new FileReader();
  r.onload=function(){load(String(r.result),f.name)};
  r.onerror=function(){$("sa-status").textContent="The browser could not read that file."};
  r.readAsText(f);
}

/* ---------- sample data ---------- */
function sample(){
  var seed=20261004;function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
  function pick(a){return a[Math.floor(rnd()*a.length)]}
  var first=["anna","ben","clara","david","emma","felix","greta","hannes","ida","jonas","klara","lukas","mia","noah","olivia","paul","rosa","simon","tessa","uwe","vera","willi","yara","zoe","amir","bea","cem","dana","erik","fatma","gero","hanna","ivo","jule","kai","lena","malte","nina","ole","pia"];
  var users=first.map(function(f){return f+"@contoso.example"});
  var UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
  var apps=["Office 365 Exchange Online","Microsoft Teams","SharePoint Online","Azure Portal","Office 365 Exchange Online","Microsoft Teams"];
  var H=["Date (UTC)","Request ID","User agent","User","Username","Application","IP address","Location","Status","Sign-in error code","Failure reason","Client app","Compliant","Managed","Authentication requirement","Conditional Access"];
  var rows=[],base=Date.UTC(2026,8,21,0,0,0),id=1000;
  function add(t,user,app,ip,loc,code,client,ua,compliant,req,ca){
    var status=code==="0"?"Success":(INTERRUPT[code]?"Interrupted":"Failure");
    rows.push([new Date(t).toISOString().replace(/\.\d+Z$/,"Z"),"00000000-0000-4000-8000-"+("000000000000"+(id++)).slice(-12),ua,user.split("@")[0],user,app,ip,loc,status,code,code==="0"?"":(CODES[code]||"Other"),client,compliant,compliant,req,ca]);
  }
  for(var d=0;d<7;d++){
    users.forEach(function(u,i){
      if(d>=5&&rnd()<.8)return;
      var n=2+Math.floor(rnd()*5),ip="203.0.113."+(10+i%40);
      for(var k=0;k<n;k++){
        var t=base+d*864e5+(7+rnd()*10)*36e5,r=rnd(),code=r<.05?"50126":r<.09?"50140":r<.11?"50074":"0";
        add(t,u,pick(apps),ip,"Hamburg, Hamburg, DE",code,rnd()<.6?"Browser":"Mobile Apps and Desktop clients",UA,"TRUE",i%9===0?"singleFactorAuthentication":"multiFactorAuthentication","Success");
      }
    });
  }
  // password spray, one hit
  var s0=base+2*864e5+2.2*36e5;
  users.slice(0,34).forEach(function(u,i){
    for(var k=0;k<2;k++)add(s0+i*41000+k*6000,u,"Office 365 Exchange Online","192.0.2.44","Amsterdam, Noord-Holland, NL",i===7&&k===0?"50053":"50126","Other clients","BAV2ROPC","FALSE","singleFactorAuthentication","Not Applied");
  });
  add(s0+34*41000,users[12],"Office 365 Exchange Online","192.0.2.44","Amsterdam, Noord-Holland, NL","0","Other clients","BAV2ROPC","FALSE","singleFactorAuthentication","Not Applied");
  // token replay from another country, scripted client
  var t3=base+3*864e5+9.5*36e5;
  add(t3,users[4],"Office 365 Exchange Online","203.0.113.14","Hamburg, Hamburg, DE","0","Browser",UA,"TRUE","multiFactorAuthentication","Success");
  add(t3+38*60000,users[4],"Office 365 Exchange Online","198.51.100.77","Singapore, Singapore, SG","0","Browser","axios/1.7.2","FALSE","singleFactorAuthentication","Success");
  add(t3+41*60000,users[4],"SharePoint Online","198.51.100.77","Singapore, Singapore, SG","0","Browser","axios/1.7.2","FALSE","singleFactorAuthentication","Success");
  // MFA fatigue ending in approval
  var t4=base+4*864e5+22.4*36e5;
  for(var m=0;m<11;m++)add(t4+m*95000,users[20],"Azure Portal","198.51.100.203","Sao Paulo, Sao Paulo, BR","500121","Browser",UA,"FALSE","multiFactorAuthentication","Failure");
  add(t4+11*95000,users[20],"Azure Portal","198.51.100.203","Sao Paulo, Sao Paulo, BR","0","Browser",UA,"FALSE","multiFactorAuthentication","Success");
  // legacy IMAP still working for a scanner account
  for(var q=0;q<7;q++)for(var z=0;z<4;z++)add(base+q*864e5+(6+z*4)*36e5,"scanner@contoso.example","Office 365 Exchange Online","203.0.113.200","Hamburg, Hamburg, DE","0","IMAP4","","FALSE","singleFactorAuthentication","Not Applied");
  // conditional access blocks and a disabled account
  for(var c=0;c<6;c++)add(base+5*864e5+(3+c)*36e5,users[30],"Azure Portal","198.51.100.9","Hanoi, Ha Noi, VN","53003","Browser",UA,"FALSE","multiFactorAuthentication","Failure");
  for(var x=0;x<9;x++)add(base+x*16*36e5,"former.employee@contoso.example","Microsoft Teams","203.0.113.77","Hamburg, Hamburg, DE","50057","Mobile Apps and Desktop clients",UA,"FALSE","singleFactorAuthentication","Not Applied");
  function cell(v){v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
  return [H].concat(rows).map(function(r){return r.map(cell).join(",")}).join("\r\n");
}
window.signinSample=sample;

/* ---------- wiring ---------- */
var drop=$("sa-drop"),file=$("sa-file");
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){readFile(e.dataTransfer.files[0])});
$("sa-sample").addEventListener("click",function(){load(sample(),"sample data (fictional tenant contoso.example)")});
$("sa-sample-dl").addEventListener("click",function(){
  var blob=new Blob([sample()],{type:"text/csv"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="sample-signins.csv";document.body.append(a);a.click();a.remove();
});
if(location.hash==="#sample")load(sample(),"sample data (fictional tenant contoso.example)");
})();
