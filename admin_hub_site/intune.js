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
function parseJSON(text){
  var data=JSON.parse(text);
  if(data&&!Array.isArray(data)&&Array.isArray(data.value))data=data.value;
  if(!Array.isArray(data))throw new Error("JSON is not a list of devices");
  var seen={},headers=[];
  data.forEach(function(o){Object.keys(o||{}).forEach(function(k){if(!seen[k]){seen[k]=1;headers.push(k)}})});
  return {headers:headers,rows:data.map(function(o){return headers.map(function(h){var v=o[h];return v===null||v===undefined?"":typeof v==="object"?JSON.stringify(v):String(v)})})};
}
function parseAny(text){
  var t=text.replace(/^﻿/,"").trimStart();
  if(t[0]==="["||t[0]==="{")return parseJSON(t);
  return parseCSV(text);
}

/* ---------- column mapping ---------- */
var FIELDS=[
 ["name","Device name",["devicename","name","displayname"],true],
 ["os","Operating system",["os","operatingsystem","platform"],true],
 ["osver","OS version",["osversion","operatingsystemversion"],false],
 ["compliance","Compliance state",["compliance","compliancestate"],false],
 ["encrypted","Encrypted",["encrypted","isencrypted"],false],
 ["lastsync","Last check-in",["lastcheckin","lastsyncdatetime","lastsync","lastcontact"],false],
 ["user","Primary user",["primaryuserupn","userprincipalname","primaryuseremailaddress","emailaddress","upn"],false],
 ["ownership","Ownership",["ownership","manageddeviceownertype","ownertype"],false],
 ["serial","Serial number",["serialnumber","serial"],false],
 ["model","Model",["model"],false],
 ["jailbroken","Jailbroken / rooted",["jailbroken"],false],
 ["supervised","Supervised",["supervised","issupervised"],false],
 ["managedby","Managed by",["managedby","managementagent"],false],
 ["patch","Android security patch level",["securitypatchlevel","androidsecuritypatchlevel"],false],
 ["free","Free storage",["freestorage","freestoragespaceinbytes","freestoragespace"],false],
 ["total","Total storage",["totalstorage","totalstoragespaceinbytes","totalstoragespace"],false],
 ["sku","Windows edition (SkuFamily)",["skufamily","sku"],false],
 ["grace","Grace period expiration",["compliancegraceperiodexpiration","compliancegraceperiodexpirationdatetime"],false]
];
function norm(h){return String(h).toLowerCase().replace(/[^a-z0-9]/g,"")}
function autoMap(headers){
  var nh=headers.map(norm),map={};
  FIELDS.forEach(function(f){
    var idx=-1,a,p,h;
    for(a=0;a<f[2].length&&idx<0;a++)idx=nh.indexOf(f[2][a]);
    for(p=0;p<f[2].length&&idx<0;p++)for(h=0;h<nh.length&&idx<0;h++){var x=f[2][p],y=nh[h];if(y.length>=7&&x.length>=7&&(x.indexOf(y)===0||y.indexOf(x)===0))idx=h}
    map[f[0]]=idx;
  });
  return map;
}

/* ---------- normalisation ---------- */
var DAY=864e5;
function parseTime(s){
  s=String(s||"").trim();if(!s||/^0001-/.test(s))return null;
  var m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s),t;
  if(m)t=Date.UTC(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));
  else{
    var iso=s.replace(/^(\d{4}-\d{2}-\d{2}) /,"$1T").replace(/(\.\d{3})\d+/,"$1");
    if(/^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(iso))iso+="Z";
    t=Date.parse(iso);if(isNaN(t))t=Date.parse(s);
  }
  return isNaN(t)||t<Date.UTC(2005,0,1)?null:t;
}
function tri(s){s=String(s||"").trim();return /^(true|yes|1)$/i.test(s)?true:/^(false|no|0)$/i.test(s)?false:null}
function platform(os){
  var s=String(os||"").toLowerCase();
  if(/windows/.test(s))return "Windows";
  if(/ipad|ios|iphone/.test(s))return "iOS/iPadOS";
  if(/mac/.test(s))return "macOS";
  if(/android/.test(s))return "Android";
  if(/linux|ubuntu|rhel|fedora/.test(s))return "Linux";
  if(/chrome/.test(s))return "ChromeOS";
  return s?"Other":"";
}
function compState(s){
  s=norm(s);
  if(s==="compliant")return "ok";
  if(s==="noncompliant"||s==="notcompliant")return "bad";
  if(s==="ingraceperiod")return "grace";
  if(!s)return "";
  return "unknown";
}
/* Windows feature updates: build, label, end of servicing for Home/Pro and for Enterprise/Education */
var WIN=[
 [26200,"11 25H2","2027-10-12","2028-10-10"],
 [26100,"11 24H2","2026-10-13","2027-10-12"],
 [22631,"11 23H2","2025-11-11","2026-11-10"],
 [22621,"11 22H2","2024-10-08","2025-10-14"],
 [22000,"11 21H2","2023-10-10","2024-10-08"],
 [19045,"10 22H2","2025-10-14","2025-10-14"],
 [19044,"10 21H2","2023-06-13","2024-06-11"],
 [19043,"10 21H1","2022-12-13","2022-12-13"],
 [19042,"10 20H2","2022-05-10","2023-05-09"],
 [19041,"10 2004","2021-12-14","2021-12-14"]
];
function winInfo(ver,sku,now){
  var m=/^10\.0\.(\d{5})/.exec(String(ver||"").trim());if(!m)return null;
  var b=+m[1],row=null,i;
  for(i=0;i<WIN.length;i++)if(WIN[i][0]===b){row=WIN[i];break}
  var lt=/ltsc|ltsb|enterprises\b/i.test(String(sku||""));
  if(b===17763||b===14393||(b===19044&&lt)){
    var L=b===17763?["10 LTSC 2019","2029-01-09"]:b===14393?["10 LTSB 2016","2026-10-13"]:["10 LTSC 2021","2027-01-12"];
    return {label:L[0],end:L[1],out:Date.parse(L[1]+"T23:59:59Z")<now,ed:"long-term servicing"};
  }
  if(!row){
    if(b<19041)return {label:"10 (build "+b+")",end:"long ago",out:true};
    if(b>26200)return {label:"build "+b,end:"",out:false};
    return {label:"build "+b,end:"",out:false,unknown:true};
  }
  var ent=/enterprise|education|\bent\b|\bedu\b/i.test(String(sku||"")),known=!!String(sku||"").trim();
  var end=ent||!known?row[3]:row[2];
  return {label:row[1],end:end,out:Date.parse(end+"T23:59:59Z")<now,ed:ent?"Enterprise/Education":known?"Home/Pro":""};
}
function major(ver,plat){
  var m=/(\d+)(?:\.(\d+))?/.exec(String(ver||""));if(!m)return null;
  var n=+m[1];
  /* Apple renumbered in 2025: iOS went from 18 to 26, macOS from 15 to 26 */
  if(plat==="iOS/iPadOS"&&n>=26)return {n:n-7,label:String(n)};
  if(plat==="macOS"&&n>=26)return {n:n-10,label:String(n)};
  if(plat==="macOS"&&n===10)return {n:10+(+(m[2]||0))/100-1,label:"10."+(m[2]||0)};
  return {n:n,label:String(n)};
}
function normalise(parsed,map){
  var has={},devices=[],skipped=0;
  FIELDS.forEach(function(f){has[f[0]]=map[f[0]]>=0});
  parsed.rows.forEach(function(r){
    var g=function(k){return map[k]>=0?String(r[map[k]]===undefined?"":r[map[k]]).trim():""};
    var name=g("name"),os=g("os");
    if(!name&&!g("serial")){skipped++;return}
    var free=parseFloat(g("free").replace(/[^\d.]/g,"")),total=parseFloat(g("total").replace(/[^\d.]/g,""));
    devices.push({name:name||"(no name)",os:os,plat:platform(os),ver:g("osver"),comp:compState(g("compliance")),compRaw:g("compliance"),
      enc:tri(g("encrypted")),sync:parseTime(g("lastsync")),user:g("user"),
      own:/personal|byod/i.test(g("ownership"))?"personal":/corp|company/i.test(g("ownership"))?"corporate":"",
      serial:g("serial"),model:g("model"),jb:tri(g("jailbroken")),sup:tri(g("supervised")),by:g("managedby"),
      patch:parseTime(g("patch")),ratio:total>0&&free>=0&&free<=total?free/total:null,sku:g("sku"),grace:parseTime(g("grace")),flags:{}});
  });
  return {devices:devices,has:has,skipped:skipped};
}

/* ---------- helpers ---------- */
function groupBy(arr,fn){var m=new Map();arr.forEach(function(x){var k=fn(x);if(k===""||k===undefined||k===null)return;var a=m.get(k);if(!a){a=[];m.set(k,a)}a.push(x)});return m}
function day(t){return t?new Date(t).toISOString().slice(0,10):"never"}
function plural(n,w){return n+" "+w+(n===1?"":"s")}
function pct(a,b){return b?Math.round(a/b*100):0}
var SEV={crit:0,high:1,med:2,info:3},SEVNAME={crit:"critical",high:"high",med:"medium",info:"info"};
var BADSERIAL=/^(0+|default ?string|system serial number|to be filled.*|none|n\/a|unknown|not specified|123456789)$/i;

/* ---------- checks ---------- */
function detect(D,has,now){
  var F=[],skipped=[],COLS=["Device","User","OS","Version","Last check-in"];
  function row(d,extra){var r=[d.name,d.user||"(none)",d.plat||d.os,d.ver||"",day(d.sync)];return extra===undefined?r:r.concat([extra])}
  function add(sev,key,title,list,summary,steps,ps,extraCol,extraFn){
    if(!list.length)return;
    list.forEach(function(d){d.flags[key]=sev});
    list=list.slice().sort(function(a,b){return (a.sync||0)-(b.sync||0)});
    F.push({sev:sev,key:key,title:title,summary:summary,cols:extraCol?COLS.concat([extraCol]):COLS,rows:list.map(function(d){return row(d,extraCol?extraFn(d):undefined)}),steps:steps,ps:ps,count:list.length});
  }
  var n=D.length,list,x;

  list=D.filter(function(d){return d.jb===true});
  add("crit","jb","Jailbroken or rooted devices",list,plural(list.length,"device")+" report a jailbreak or root. On such a device the protections that keep company data apart from other apps cannot be relied on.",
    ["Block access now: mark jailbroken devices as non-compliant in the compliance policy and require compliant devices in Conditional Access.","Contact each user. A corporate device gets wiped and re-enrolled, a personal one gets retired.","Rooted Android devices can hide from detection. Turn on the Play Integrity check in the Android compliance policy."],
    "Get-MgDeviceManagementManagedDevice -All | Where-Object JailBroken -eq 'True' |\n  Select-Object DeviceName, UserPrincipalName, OperatingSystem, OSVersion");

  if(has.managedby){
    list=D.filter(function(d){return /^(eas|exchange ?active ?sync)$/i.test(d.by)});
    add("high","eas","Mail-only devices without management",list,plural(list.length,"device")+" are known only through Exchange ActiveSync. They sync company mail, but Intune applies no policy to them and cannot wipe them.",
      ["Find out what these are: usually old phones using a native mail app with a password.","Block legacy mail clients with a Conditional Access policy that requires approved client apps or app protection.","Ask the users to move to Outlook mobile with an app protection policy, then remove the old partnerships."],
      "Get-MgDeviceManagementManagedDevice -All | Where-Object ManagementAgent -eq 'eas' |\n  Select-Object DeviceName, UserPrincipalName, OperatingSystem, LastSyncDateTime");
  }else skipped.push("mail-only devices (no \"Managed by\" column)");

  if(has.compliance){
    list=D.filter(function(d){return d.comp==="bad"});
    x=pct(list.length,n);
    add(x>=10?"high":"med","bad","Non-compliant devices",list,plural(list.length,"device")+" ("+x+"% of the fleet) fail their compliance policy. If Conditional Access requires compliant devices, these users are already blocked. If it does not, the policy has no effect.",
      ["Open a few of them in Intune and read which setting fails. One setting usually explains most of the list.","Devices that have not checked in for weeks are non-compliant by timeout. Handle those as stale devices first.","Check that a Conditional Access policy actually requires compliance. Without it this state is only a report.","Tell users before you enforce: a notification with a grace period avoids a wave of tickets."],
      "Get-MgDeviceManagementManagedDevice -Filter \"complianceState eq 'noncompliant'\" -All |\n  Select-Object DeviceName, UserPrincipalName, OperatingSystem, OSVersion, LastSyncDateTime");
    list=D.filter(function(d){return d.comp==="unknown"});
    add("med","unk","Devices with no compliance verdict",list,plural(list.length,"device")+" have a state such as \"Not evaluated\" or \"Unknown\". Either no compliance policy is assigned to them, or they never reported back. With the tenant default, a device without any policy counts as compliant.",
      ["Assign a compliance policy for every platform you allow to enrol, to all users or all devices.","In Intune, Endpoint security, Device compliance, Compliance policy settings: set \"Mark devices with no compliance policy assigned as\" to Not compliant.","Devices managed by Configuration Manager report their state from there. Check them on that side."],
      "Get-MgDeviceManagementManagedDevice -All | Where-Object { $_.ComplianceState -notin 'compliant','noncompliant','inGracePeriod' } |\n  Select-Object DeviceName, UserPrincipalName, OperatingSystem, ComplianceState, LastSyncDateTime","State",function(d){return d.compRaw});
    list=D.filter(function(d){return d.comp==="grace"});
    add("med","grace","Devices in the grace period",list,plural(list.length,"device")+" already fail a compliance setting but still count as compliant until their grace period ends. They turn non-compliant by themselves on the date shown.",
      ["Warn these users now, while they can still work.","Check which setting they fail. A new OS minimum version is the usual trigger."],
      "Get-MgDeviceManagementManagedDevice -Filter \"complianceState eq 'inGracePeriod'\" -All |\n  Select-Object DeviceName, UserPrincipalName, ComplianceGracePeriodExpirationDateTime","Grace ends",function(d){return d.grace?day(d.grace):""});
  }else skipped.push("compliance (no \"Compliance\" column)");

  if(has.encrypted){
    list=D.filter(function(d){return d.enc===false});
    x=list.filter(function(d){return d.plat==="Windows"||d.plat==="macOS"}).length;
    add(x?"high":"med","enc","Devices without disk encryption",list,plural(list.length,"device")+" report that storage is not encrypted, "+x+" of them Windows or macOS computers. A lost or stolen unencrypted laptop is a reportable data breach in most cases.",
      ["Windows: deploy a BitLocker policy (Endpoint security, Disk encryption) with silent enablement and key escrow to Entra ID. Silent encryption needs a TPM and an enabled recovery environment.","macOS: deploy a FileVault policy with escrow of the recovery key.","Add \"Require encryption\" to the compliance policy so that unencrypted devices lose access.","Phones encrypt when a PIN is set. Require a PIN in the compliance policy."],
      "Get-MgDeviceManagementManagedDevice -All | Where-Object { -not $_.IsEncrypted } |\n  Select-Object DeviceName, UserPrincipalName, OperatingSystem, Model, LastSyncDateTime");
  }else skipped.push("encryption (no \"Encrypted\" column)");

  list=[];
  D.forEach(function(d){if(d.plat!=="Windows")return;var w=winInfo(d.ver,d.sku,now);d.win=w;if(w&&w.out)list.push(d)});
  add("high","winold","Windows versions that no longer get security updates",list,plural(list.length,"Windows device")+" run a feature update whose servicing has ended. They receive no more monthly security fixes"+(list.some(function(d){return d.win.label.indexOf("10 ")===0})?". Windows 10 devices only get fixes with a paid Extended Security Updates licence":"")+".",
    ["Check hardware eligibility first. Devices that cannot run Windows 11 need a replacement plan or ESU.","Move the others with a feature update policy in Intune (Devices, Windows updates, Feature updates) and pin the target version.","If updates are offered but never install, look at free disk space and at safeguard holds in the Windows Update reports.","Add a minimum OS version to the Windows compliance policy so the next expiry shows up before it hurts."],
    "Get-MgDeviceManagementManagedDevice -Filter \"operatingSystem eq 'Windows'\" -All |\n  Group-Object OSVersion | Sort-Object Count -Descending | Select-Object Count, Name","Release / servicing ended",function(d){return d.win.label+(d.win.ed?" "+d.win.ed:"")+" / "+d.win.end});

  ["iOS/iPadOS","macOS","Android"].forEach(function(p){
    var set=D.filter(function(d){return d.plat===p&&major(d.ver,p)});
    if(set.length<5)return;
    var top=null;set.forEach(function(d){var m=major(d.ver,p);d.maj=m;if(!top||m.n>top.n)top=m});
    var old=set.filter(function(d){return top.n-d.maj.n>=2});
    add("med","old-"+p,p+" devices two or more major versions behind",old,plural(old.length,p+" device")+" run a major version at least two behind the newest one in your own fleet (version "+top.label+"). Vendors patch the current and usually the previous major version. Older ones stop getting security fixes.",
      ["Set a minimum OS version in the "+p+" compliance policy, with a grace period so users can update.","Devices that are too old to update need replacing. The model column in the export shows which ones.",p==="Android"?"For Android, also require a minimum security patch level. The major version alone says little.":"Use an update policy to push the update on supervised or company-owned devices."],
      "Get-MgDeviceManagementManagedDevice -All | Where-Object OperatingSystem -like '"+(p==="iOS/iPadOS"?"iOS":p)+"*' |\n  Group-Object OSVersion | Sort-Object Name | Select-Object Count, Name","Major",function(d){return d.maj.label});
  });

  if(has.patch){
    list=D.filter(function(d){return d.plat==="Android"&&d.patch&&now-d.patch>90*DAY});
    add("med","patch","Android devices with an old security patch level",list,plural(list.length,"Android device")+" have a security patch level older than 90 days. Android fixes are published monthly, and what reaches a device depends on its manufacturer.",
      ["Require a minimum security patch level in the Android compliance policy and move it forward every quarter.","Models that no longer get patches from the manufacturer have to be replaced. No policy can fix that."],
      "Get-MgDeviceManagementManagedDevice -All | Where-Object OperatingSystem -like 'Android*' |\n  Select-Object DeviceName, Model, OSVersion, AndroidSecurityPatchLevel | Sort-Object AndroidSecurityPatchLevel","Patch level",function(d){return day(d.patch)});
  }

  if(has.lastsync){
    list=D.filter(function(d){return d.sync&&now-d.sync>30*DAY});
    x=list.filter(function(d){return now-d.sync>90*DAY}).length;
    add("med","stale","Devices that have not checked in for 30 days",list,plural(list.length,"device")+" have not contacted Intune for more than 30 days, "+x+" of them for more than 90. They receive no policy and no updates, and they distort every compliance figure. Some are in a drawer, some are lost, some were reinstalled and enrolled again under a new record.",
      ["Sort out the duplicates first (same serial number, newer record exists) and delete the old records.","For the rest, ask the primary user whether the device still exists. A lost device is a security incident, not a clean-up task.","Set up a device clean-up rule (Devices, Device clean-up rules) so Intune removes records after a period you choose.","Remove the matching stale device objects in Entra ID as well, or they stay valid for device-based Conditional Access."],
      "$cut = (Get-Date).AddDays(-30).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')\nGet-MgDeviceManagementManagedDevice -Filter \"lastSyncDateTime le $cut\" -All |\n  Select-Object DeviceName, UserPrincipalName, OperatingSystem, LastSyncDateTime | Sort-Object LastSyncDateTime","Days silent",function(d){return Math.floor((now-d.sync)/DAY)});
  }else skipped.push("stale devices (no \"Last check-in\" column)");

  if(has.serial){
    var dup=[];
    groupBy(D.filter(function(d){return d.serial&&!BADSERIAL.test(d.serial)}),function(d){return d.serial.toUpperCase()}).forEach(function(g){if(g.length>1)g.forEach(function(d){d.dupN=g.length;dup.push(d)})});
    add("info","dup","Several records for the same hardware",dup,plural(dup.length,"record")+" share a serial number with another record. This happens when a device is reinstalled and enrolled again without the old record being removed. The old record stays behind as a stale, often non-compliant ghost.",
      ["Keep the record with the latest check-in and delete the others.","Wipe or retire devices from Intune before reinstalling them, or use Autopilot reset, so the record is reused."],
      "Get-MgDeviceManagementManagedDevice -All | Group-Object SerialNumber | Where-Object { $_.Count -gt 1 -and $_.Name } |\n  ForEach-Object { $_.Group | Select-Object SerialNumber, DeviceName, LastSyncDateTime, ComplianceState }","Serial (records)",function(d){return d.serial+" ("+d.dupN+")"});
  }

  if(has.ownership){
    list=D.filter(function(d){return d.own==="personal"});
    x=list.filter(function(d){return d.plat==="Windows"}).length;
    add(x?"med":"info","pers","Personally owned devices",list,plural(list.length,"device")+" ("+pct(list.length,n)+"% of the fleet) are marked as personal"+(x?", including "+plural(x,"Windows computer")+". A personal Windows PC under full management is rarely intended: the user signed in to an Office app and accepted \"Allow my organization to manage my device\"":"")+". You have less control over personal devices and fewer rights to wipe them.",
      ["Decide per platform whether personal devices may enrol at all, and set that in the enrolment restrictions (Devices, Enrollment, Device platform restriction).","For personal phones, app protection policies without enrolment protect company data and leave the rest of the phone alone.","Company devices that show up as personal were enrolled the wrong way. Correct the ownership and fix the enrolment process (Autopilot, Apple Business Manager, Android zero-touch)."],
      "Get-MgDeviceManagementManagedDevice -Filter \"managedDeviceOwnerType eq 'personal'\" -All |\n  Group-Object OperatingSystem | Select-Object Count, Name");
  }

  if(has.user){
    list=D.filter(function(d){return !d.user});
    add("info","nouser","Devices without a primary user",list,plural(list.length,"device")+" have no primary user. That is correct for kiosks and shared devices. On a personal work device it means user-targeted policies and apps do not arrive and nobody is responsible for it.",
      ["Assign a primary user where the device belongs to one person.","Shared devices should be in a device group with device-targeted policies."],
      "Get-MgDeviceManagementManagedDevice -All | Where-Object { -not $_.UserPrincipalName } |\n  Select-Object DeviceName, OperatingSystem, Model, EnrolledDateTime");
  }

  if(has.supervised&&has.ownership){
    list=D.filter(function(d){return d.plat==="iOS/iPadOS"&&d.sup===false&&d.own==="corporate"});
    add("info","unsup","Company iPhones and iPads that are not supervised",list,plural(list.length,"company-owned Apple device")+" are not supervised. Many restrictions, silent app installs and forced OS updates only work on supervised devices.",
      ["Supervision is set at enrolment and cannot be added later. Enrol company devices through Apple Business Manager with Automated Device Enrollment.","Existing devices need a wipe and a fresh enrolment. Plan it with the next hardware exchange."],
      "Get-MgDeviceManagementManagedDevice -All | Where-Object { $_.OperatingSystem -like 'iOS*' -and -not $_.IsSupervised -and $_.ManagedDeviceOwnerType -eq 'company' } |\n  Select-Object DeviceName, UserPrincipalName, Model");
  }

  if(has.free&&has.total){
    list=D.filter(function(d){return d.ratio!==null&&d.ratio<0.1});
    add("info","disk","Devices that are almost out of storage",list,plural(list.length,"device")+" have less than 10% of their storage free. Feature updates and large app installs fail on them, which later shows up as an outdated OS.",
      ["Windows: turn on Storage Sense by policy and enable OneDrive Files On-Demand.","Contact the users before the next feature update is due."],
      "Get-MgDeviceManagementManagedDevice -All | Where-Object { $_.TotalStorageSpaceInBytes -gt 0 -and ($_.FreeStorageSpaceInBytes / $_.TotalStorageSpaceInBytes) -lt 0.1 } |\n  Select-Object DeviceName, UserPrincipalName, Model","Free",function(d){return Math.round(d.ratio*100)+"%"});
  }

  F.sort(function(a,b){return SEV[a.sev]-SEV[b.sev]||b.count-a.count});
  return {findings:F,skipped:skipped};
}

/* ---------- rendering ---------- */
function table(cols,rows,max){
  var wrap=el("div","tw"),t=el("table","tbl"),th=el("thead"),tr=el("tr"),tb=el("tbody");
  cols.forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
  rows.slice(0,max||rows.length).forEach(function(r){var x=el("tr");r.forEach(function(c){x.append(el("td",null,c))});tb.append(x)});
  t.append(th,tb);wrap.append(t);
  if(max&&rows.length>max)wrap.append(el("p","note","Showing "+max+" of "+rows.length+". The CSV and the report contain all of them."));
  return wrap;
}
function tile(label,value,sub){var d=el("div","stat");d.append(el("span","stat-k",label),el("b","stat-v",value));if(sub)d.append(el("span","stat-s",sub));return d}
function save(name,text,type){
  var blob=new Blob([text],{type:type}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
}
function csv(cols,rows){
  var q=function(v){v=String(v===null||v===undefined?"":v);if(/^[=+\-@]/.test(v))v="'"+v;return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  return [cols].concat(rows).map(function(r){return r.map(q).join(",")}).join("\r\n");
}
function remember(k,o){try{if(localStorage.getItem("ah_cockpit_on")!=="1")return;var d=JSON.parse(localStorage.getItem("ah_cockpit")||"{}");o.ts=Date.now();d[k]=o;localStorage.setItem("ah_cockpit",JSON.stringify(d))}catch(e){}}
var state={parsed:null,map:null,result:null,name:""};

function analyse(parsed,map){
  var n=normalise(parsed,map),D=n.devices,now=Date.now(),note="";
  var latest=0;D.forEach(function(d){if(d.sync&&d.sync>latest)latest=d.sync});
  if(latest&&now-latest>14*DAY){now=latest;note="The newest check-in in this export is from "+day(latest)+". Ages are measured from that day, not from today."}
  var d=detect(D,n.has,now),ISSUE=["jb","eas","bad","enc","winold","stale"];
  var healthy=D.filter(function(x){return !ISSUE.some(function(k){return x.flags[k]})}).length;
  return {devices:D,has:n.has,skippedRows:n.skipped,findings:d.findings,skipped:d.skipped,now:now,note:note,healthy:healthy,score:pct(healthy,D.length)};
}

function render(){
  var out=$("ia-out");out.replaceChildren();
  var R=analyse(state.parsed,state.map),D=R.devices,F=R.findings;state.result=R;
  $("ia-status").textContent=plural(D.length,"device")+" analysed from "+state.name+(R.skippedRows?" ("+R.skippedRows+" rows skipped: no device name)":"")+".";
  renderMapping(R.has);
  if(!D.length){out.append(el("p","note","No usable rows. Open the column mapping above and point Device name and Operating system at the right columns."));out.hidden=false;return}
  var sev=R.score>=90?"info":R.score>=75?"med":R.score>=50?"high":"crit";
  var v=el("div","verdict v-"+sev);
  var judged=[];if(R.has.compliance)judged.push("compliant");if(R.has.encrypted)judged.push("encrypted");judged.push("on a supported Windows version");if(R.has.lastsync)judged.push("seen in the last 30 days");
  if(judged.length<2){v.className="verdict v-info";v.append(el("b",null,"Too few columns to rate the fleet"),el("span",null,"the file has no compliance, encryption or check-in column. Export with all columns, or set the mapping above"))}
  else v.append(el("b",null,R.score+"% of devices are in good shape"),el("span",null,R.healthy.toLocaleString("en-US")+" of "+D.length.toLocaleString("en-US")+" are "+judged.join(", ")));
  out.append(v);
  if(R.note)out.append(el("p","note",R.note));

  var has=R.has,cnt=function(fn){return D.filter(fn).length};
  var stats=el("div","stats");stats.style.setProperty("--cols","5");
  stats.append(tile("devices",D.length.toLocaleString("en-US"),groupBy(D,function(d){return d.plat}).size+" platforms"),
    tile("compliant",has.compliance?pct(cnt(function(d){return d.comp==="ok"||d.comp==="grace"}),D.length)+"%":"n/a",has.compliance?cnt(function(d){return d.comp==="bad"})+" non-compliant":"column missing"),
    tile("encrypted",has.encrypted?pct(cnt(function(d){return d.enc===true}),cnt(function(d){return d.enc!==null}))+"%":"n/a",has.encrypted?cnt(function(d){return d.enc===false})+" not encrypted":"column missing"),
    tile("stale",has.lastsync?String(cnt(function(d){return d.flags.stale})):"n/a","no check-in for 30 days"),
    tile("unsupported os",String(cnt(function(d){return d.flags.winold})),"Windows past end of servicing"));
  out.append(stats);

  out.append(el("h2",null,"by platform"));
  var prow=[];
  groupBy(D,function(d){return d.plat||"Unknown"}).forEach(function(g,p){
    var e=g.filter(function(d){return d.enc!==null});
    prow.push([p,g.length,has.compliance?pct(g.filter(function(d){return d.comp==="ok"||d.comp==="grace"}).length,g.length)+"%":"n/a",e.length?pct(e.filter(function(d){return d.enc}).length,e.length)+"%":"n/a",g.filter(function(d){return d.flags.stale}).length,g.filter(function(d){return d.own==="personal"}).length,pct(g.filter(function(d){return !["jb","eas","bad","enc","winold","stale"].some(function(k){return d.flags[k]})}).length,g.length)+"%"]);
  });
  prow.sort(function(a,b){return b[1]-a[1]});
  out.append(table(["Platform","Devices","Compliant","Encrypted","Stale","Personal","In good shape"],prow));

  out.append(el("h2",null,"findings"));
  if(!F.length)out.append(el("p","dim","None of the checks matched. That is a statement about this export and these checks, not a guarantee."));
  F.forEach(function(f,i){
    var d=el("details","finding f-"+f.sev);if(i<2&&SEV[f.sev]<=1)d.open=true;
    var s=el("summary");s.append(el("span","sevtag",SEVNAME[f.sev]),el("b",null,f.title+" ("+f.count+")"));
    d.append(s,el("p",null,f.summary),table(f.cols,f.rows,20));
    var b=el("button","btn ghost","Download these devices (.csv)");b.type="button";b.addEventListener("click",function(){save("intune-"+f.key.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".csv",csv(f.cols,f.rows),"text/csv")});
    d.append(b,el("h3","fh","what to do"));
    var ol=el("ol","steps");f.steps.forEach(function(x){ol.append(el("li",null,x))});d.append(ol);
    d.append(el("h3","fh","list them again later (Microsoft Graph PowerShell)"));
    var pre=el("pre",null,f.ps),cb=el("button","btn ghost","Copy command");cb.type="button";
    cb.addEventListener("click",function(){if(navigator.clipboard)navigator.clipboard.writeText(f.ps).then(function(){cb.textContent="Copied";setTimeout(function(){cb.textContent="Copy command"},1400)})});
    d.append(pre,cb);out.append(d);
  });
  if(R.skipped.length){var sk=el("div","note");sk.append(el("b",null,"Not checked, because the export lacks the column: "),document.createTextNode(R.skipped.join("; ")+"."));out.append(sk)}

  out.append(el("h2",null,"os versions"));
  var two=el("div","grid2");
  groupBy(D,function(d){return d.plat}).forEach(function(g,p){
    var rows=[];
    groupBy(g,function(d){if(p==="Windows"){var w=d.win||winInfo(d.ver,d.sku,R.now);return w?w.label:(d.ver||"unknown")}var m=major(d.ver,p);return m?p.split("/")[0]+" "+m.label:(d.ver||"unknown")}).forEach(function(l,k){rows.push([k,l.length,pct(l.length,g.length)+"%"])});
    rows.sort(function(a,b){return b[1]-a[1]});
    var box=el("div");box.append(el("h3","fh",p+" ("+g.length+")"),table(["Version","Devices","Share"],rows,8));two.append(box);
  });
  out.append(two);

  var ctl=el("div","ctl");ctl.style.marginTop="28px";
  var dl=el("button","btn","Download report (.md)");dl.type="button";dl.addEventListener("click",function(){save("intune-fleet-report.md",report(),"text/markdown")});
  var pr=el("button","btn ghost","Print / save as PDF");pr.type="button";pr.addEventListener("click",function(){document.querySelectorAll("#ia-out details").forEach(function(x){x.open=true});window.print()});
  ctl.append(dl,pr);out.append(ctl);
  out.hidden=false;
  var counts={crit:0,high:0,med:0,info:0};F.forEach(function(f){counts[f.sev]++});
  remember("intune",{score:R.score,devices:D.length,healthy:R.healthy,counts:counts,top:F.slice(0,3).map(function(f){return f.title+" ("+f.count+")"})});
}

function renderMapping(has){
  var box=$("ia-map");box.replaceChildren();
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
  $("ia-mapwrap").hidden=false;
  $("ia-mapwrap").open=FIELDS.some(function(f){return f[3]&&!has[f[0]]});
}

function report(){
  var R=state.result,L=[];if(!R)return "";
  L.push("# Intune device fleet analysis","","Source: "+state.name,"Devices: "+R.devices.length,"In good shape: "+R.healthy+" ("+R.score+"%), meaning compliant, encrypted, on a supported OS and seen in the last 30 days","Reference date: "+day(R.now),"Generated in the browser by the admin_hub Intune analyzer. No data left this device.","");
  if(!R.findings.length)L.push("No check matched this data.","");
  R.findings.forEach(function(f){
    L.push("## ["+SEVNAME[f.sev].toUpperCase()+"] "+f.title+" ("+f.count+")","",f.summary,"","| "+f.cols.join(" | ")+" |","|"+f.cols.map(function(){return " --- "}).join("|")+"|");
    f.rows.forEach(function(row){L.push("| "+row.map(function(c){return String(c).replace(/\|/g,"\\|")}).join(" | ")+" |")});
    L.push("","**What to do**","");f.steps.forEach(function(s,i){L.push((i+1)+". "+s)});
    L.push("","**Microsoft Graph PowerShell**","","```powershell",f.ps,"```","");
  });
  if(R.skipped.length)L.push("## Not checked","",R.skipped.map(function(s){return "- "+s}).join("\n"),"");
  return L.join("\n");
}

function load(text,name){
  var st=$("ia-status");
  try{
    var parsed=parseAny(text);
    if(!parsed.headers.length||!parsed.rows.length)throw new Error("no rows found");
    state.parsed=parsed;state.map=autoMap(parsed.headers);state.name=name;
    render();
    $("ia-out").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){
    $("ia-out").hidden=true;$("ia-mapwrap").hidden=true;
    st.textContent="Could not read that file: "+e.message+". Expected the CSV export of Intune devices, or JSON from Microsoft Graph.";
  }
}
function readFile(f){
  if(!f)return;
  $("ia-status").textContent="Reading "+f.name+" ...";
  var r=new FileReader();
  r.onload=function(){load(String(r.result),f.name)};
  r.onerror=function(){$("ia-status").textContent="The browser could not read that file."};
  r.readAsText(f);
}

/* ---------- sample: a made-up fleet ---------- */
function sample(){
  var seed=20261005,rnd=function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},pick=function(a){return a[Math.floor(rnd()*a.length)]};
  var now=Date.now(),FN=["anna","ben","carla","david","elif","finn","greta","hasan","ines","jonas","kira","lukas","mila","noah","olga","paul","rosa","sven","tara","umut","vera","willi","yara","zoe"],LN=["schmidt","meyer","kaya","novak","rossi","dubois","jansen","nowak","silva","berg","haas","lang","wolf","koch","peters","brandt"];
  var cols=["Device name","Primary user UPN","OS","OS version","Compliance","Encrypted","Last check-in","Enrollment date","Ownership","Serial number","Manufacturer","Model","Jailbroken","Supervised","Managed by","Security patch level","Total storage","Free storage","SkuFamily","Compliance grace period expiration"],rows=[];
  var iso=function(t){return new Date(t).toISOString().replace("T"," ").slice(0,19)};
  function dev(o){
    var u=o.user===undefined?pick(FN)+"."+pick(LN)+"@contoso.com":o.user,ago=o.ago!==undefined?o.ago:rnd()*6,total=o.total||pick([128000,256000,512000]);
    rows.push([o.name,u,o.os,o.ver,o.comp||"Compliant",o.enc===undefined?"True":o.enc,iso(now-ago*DAY),iso(now-(200+rnd()*700)*DAY),o.own||"Corporate",o.serial||("S"+Math.floor(rnd()*9e8+1e8)),o.mf||"",o.model||"",o.jb||"False",o.sup||"False",o.by||"Intune",o.patch||"",total,Math.round(total*(o.free===undefined?0.2+rnd()*0.6:o.free)),o.sku||"",o.grace||""]);
  }
  var i,k=1,wn=function(){return "LT-"+String(1000+k++)};
  for(i=0;i<70;i++)dev({name:wn(),os:"Windows",ver:"10.0.26100.6584",sku:"Enterprise",mf:"Lenovo",model:"ThinkPad T14 Gen 4"});
  for(i=0;i<34;i++)dev({name:wn(),os:"Windows",ver:"10.0.26200.6725",sku:"Enterprise",mf:"Lenovo",model:"ThinkPad T14 Gen 5"});
  for(i=0;i<14;i++)dev({name:wn(),os:"Windows",ver:"10.0.22631.5909",sku:"Enterprise",mf:"HP",model:"EliteBook 840 G9"});
  for(i=0;i<9;i++)dev({name:wn(),os:"Windows",ver:"10.0.22631.5909",sku:"Pro",mf:"HP",model:"ProBook 450 G8",comp:i<4?"Noncompliant":"Compliant"});
  for(i=0;i<11;i++)dev({name:wn(),os:"Windows",ver:"10.0.19045.6332",sku:"Enterprise",mf:"Dell",model:"Latitude 5490",comp:i<6?"Noncompliant":"Compliant",enc:i<5?"False":"True",free:i<4?0.04:undefined});
  for(i=0;i<5;i++)dev({name:wn(),os:"Windows",ver:"10.0.22621.4317",sku:"Pro",mf:"Dell",model:"Latitude 5520",ago:45+i*30,comp:"Noncompliant"});
  for(i=0;i<4;i++)dev({name:"DESKTOP-"+pick(["7QK2","P91X","M3LA","ZT80"])+i,os:"Windows",ver:"10.0.26100.6584",sku:"Home",own:"Personal",enc:"False",comp:"Not evaluated",mf:"ASUS",model:"VivoBook 15"});
  dev({name:"LT-1033",os:"Windows",ver:"10.0.22631.5909",sku:"Enterprise",serial:"PF3DUP01",ago:160,comp:"Noncompliant",mf:"Lenovo",model:"ThinkPad T14 Gen 4",user:"ines.koch@contoso.com"});
  dev({name:"LT-1033-NEW",os:"Windows",ver:"10.0.26100.6584",sku:"Enterprise",serial:"PF3DUP01",mf:"Lenovo",model:"ThinkPad T14 Gen 4",user:"ines.koch@contoso.com"});
  for(i=0;i<3;i++)dev({name:"KIOSK-"+(i+1),os:"Windows",ver:"10.0.26100.6584",sku:"Enterprise",user:"",mf:"HP",model:"ProDesk 400"});
  for(i=0;i<12;i++)dev({name:"MAC-"+(200+i),os:"macOS",ver:i<7?"26.0.1":i<10?"15.7":"13.6.9",enc:i===10||i===4?"False":"True",mf:"Apple",model:"MacBook Pro 14",comp:i>=10?"Noncompliant":"Compliant"});
  for(i=0;i<36;i++)dev({name:"iPhone-"+(300+i),os:"iOS/iPadOS",ver:i<22?"26.0.1":i<31?"18.7":i<34?"17.7.2":"16.7.10",mf:"Apple",model:i<34?"iPhone 15":"iPhone 8",sup:i<26?"True":"False",own:i>=28?"Personal":"Corporate",comp:i===35?"In grace period":"Compliant",grace:i===35?iso(now+4*DAY):"",ago:i===33?70:undefined});
  dev({name:"iPhone-jb",os:"iOS/iPadOS",ver:"17.4",mf:"Apple",model:"iPhone 12",jb:"True",own:"Personal",comp:"Noncompliant"});
  for(i=0;i<24;i++)dev({name:"AND-"+(400+i),os:"Android (personally-owned work profile)",ver:i<12?"16":i<19?"15":i<22?"14":"12",mf:"Samsung",model:i<22?"Galaxy A55":"Galaxy A12",own:"Personal",patch:iso(now-(i<16?25+i:120+i*9)*DAY).slice(0,10),comp:i>=22?"Noncompliant":"Compliant"});
  for(i=0;i<6;i++)dev({name:"SM-G9"+i+"0F",os:"Android",ver:"11",by:"EAS",comp:"Not evaluated",enc:"",own:"Personal",mf:"Samsung",model:"Galaxy S10",ago:2+i});
  var q=function(v){v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  return [cols].concat(rows).map(function(r){return r.map(q).join(",")}).join("\r\n");
}

window.intuneAnalyzer={parse:parseAny,autoMap:autoMap,analyse:analyse,sample:sample,winInfo:winInfo,report:function(){return state.result?report():""}};
if(!$("ia-drop"))return;
var drop=$("ia-drop"),file=$("ia-file");
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(t){drop.addEventListener(t,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(t){drop.addEventListener(t,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files[0])readFile(e.dataTransfer.files[0])});
$("ia-sample").addEventListener("click",function(){load(sample(),"the sample fleet of made-up devices")});
$("ia-sample-dl").addEventListener("click",function(){save("intune-sample-devices.csv",sample(),"text/csv")});
if(location.hash==="#sample")load(sample(),"the sample fleet of made-up devices");
})();
