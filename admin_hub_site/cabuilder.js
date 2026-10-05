(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}

/* ---------- constants ---------- */
var BG="BREAK-GLASS-GROUP-ID",LOC="NAMED-LOCATION-ID";
var GA="62e90394-69f5-4237-9190-012177145e10";
var ADMIN_ROLES=[GA,"9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3","c4e39bd9-1100-46d3-8c65-fb160da0071f","b0f54661-2d74-4c50-afa3-1ec803f12efe",
 "158c047a-c907-4556-b7ef-446551a6b5f7","b1be1c3e-b65d-4f19-8427-f6fa0d97feb9","29232cdf-9323-42fd-ade2-1d097af3e4de","729827e3-9c14-49f7-bb1b-9608f156bbb8",
 "966707d0-3269-4727-9be2-8c3a10f19b9d","7be44c8a-adaf-4e2a-84d6-ab2649e08a13","e8611ab8-c189-46e8-94e1-60213ab1f814","194ae4cb-b126-40b2-bd5b-6091b380977d",
 "f28a1f50-f6e7-4571-818b-6a12f2af6b6c","fe930be7-5e62-47db-91af-98c3a49a38b1"];
var PHISH_RESISTANT="00000000-0000-0000-0000-000000000004";
var EVERY_TIME={isEnabled:true,frequencyInterval:"everyTime",authenticationType:"primaryAndSecondaryAuthentication"};
var GUESTS={guestOrExternalUserTypes:"internalGuest,b2bCollaborationGuest,b2bCollaborationMember,b2bDirectConnectUser,otherExternalUser,serviceProvider",
 externalTenants:{"@odata.type":"#microsoft.graph.conditionalAccessAllExternalTenants",membershipKind:"all"}};

function all(){return {includeUsers:["All"],excludeGroups:[BG]}}
function admins(){return {includeRoles:ADMIN_ROLES.slice(),excludeGroups:[BG]}}
function apps(a){return {includeApplications:a||["All"]}}
function mfa(){return {operator:"OR",builtInControls:["mfa"]}}
function block(){return {operator:"OR",builtInControls:["block"]}}
function device(){return {operator:"OR",builtInControls:["compliantDevice","domainJoinedDevice"]}}

/* ---------- catalogue ---------- */
/* n: fixed number, g: group, t: title, who/when/then: plain sentence parts, w: what to know before switching it on */
var POL=[
{n:1,g:"base",t:"Block legacy authentication",lic:"P1",
 who:"Everyone",when:"signs in with a protocol that cannot do MFA (IMAP, POP, SMTP AUTH, old Office clients)",then:"is blocked",
 w:"Old scanners, copiers and scripts that send mail with a user name and password stop working. Look at the report-only results for a week first.",
 b:function(){return {conditions:{users:all(),applications:apps(),clientAppTypes:["exchangeActiveSync","other"]},grantControls:block()}}},
{n:2,g:"base",t:"Require MFA for administrators",lic:"P1",
 who:"Holders of 14 admin roles",when:"sign in to anything",then:function(o){return o.strong?"need phishing-resistant MFA (passkey, FIDO2 key, Windows Hello, certificate)":"need MFA"},
 w:function(o){return o.strong?"Every admin needs a passkey or FIDO2 key registered before you switch this on, otherwise they are locked out.":"Roles activated through PIM are covered from the moment they are active."},
 b:function(o){return {conditions:{users:admins(),applications:apps(),clientAppTypes:["all"]},
  grantControls:o.strong?{operator:"OR",builtInControls:[],authenticationStrength:{id:PHISH_RESISTANT}}:mfa()}}},
{n:3,g:"base",t:"Require MFA for all users",lic:"P1",
 who:"Everyone",when:"signs in to anything",then:"needs MFA",
 w:"Service accounts that sign in as a user will fail. Move them to a managed identity or an app registration, or exclude them by name and limit them to a location.",
 b:function(){return {conditions:{users:all(),applications:apps(),clientAppTypes:["all"]},grantControls:mfa()}}},
{n:4,g:"base",t:"Require MFA for Azure management and admin portals",lic:"P1",
 who:"Everyone",when:"opens the Azure portal, Azure CLI, Azure PowerShell or a Microsoft admin center",then:"needs MFA",
 w:"Covers the case where a normal user account has rights on a subscription. Automation that signs in as a user to Azure will fail.",
 b:function(){return {conditions:{users:all(),applications:apps(["797f4846-ba00-4fd7-ba43-dac1f8f63013","MicrosoftAdminPortals"]),clientAppTypes:["all"]},grantControls:mfa()}}},
{n:5,g:"identity",t:"Require MFA for guests",lic:"P1",
 who:"Guests and external users",when:"sign in to anything",then:"need MFA",
 w:"Guests register MFA in your tenant unless you trust the MFA of their home tenant in the cross-tenant access settings.",
 b:function(){return {conditions:{users:{includeGuestsOrExternalUsers:GUESTS,excludeGroups:[BG]},applications:apps(),clientAppTypes:["all"]},grantControls:mfa()}}},
{n:6,g:"identity",t:"Protect security info registration",lic:"P1",
 who:"Members",when:"register or change an MFA method from outside a trusted location",then:"need MFA",
 w:"Stops an attacker with a stolen password from registering their own method. New starters need a Temporary Access Pass or have to register from a trusted location, so define one first.",
 b:function(){return {conditions:{users:{includeUsers:["All"],excludeUsers:["GuestsOrExternalUsers"],excludeGroups:[BG]},applications:{includeUserActions:["urn:user:registersecurityinfo"]},
  clientAppTypes:["all"],locations:{includeLocations:["All"],excludeLocations:["AllTrusted"]}},grantControls:mfa()}}},
{n:7,g:"identity",t:"Require MFA to register or join devices",lic:"P1",
 who:"Everyone",when:"registers or joins a device to Entra ID",then:"needs MFA",
 w:"Set \"Require MFA to register or join devices\" in the Entra device settings to No, the two do not work together.",
 b:function(){return {conditions:{users:all(),applications:{includeUserActions:["urn:user:registerdevice"]},clientAppTypes:["all"]},grantControls:mfa()}}},
{n:8,g:"identity",t:"Block device code flow",lic:"P1",
 who:"Everyone",when:"signs in by typing a code on another device",then:"is blocked",
 w:"Stops device code phishing. Breaks sign-in on devices without a browser, such as some meeting room devices, and az login --use-device-code. Exclude those accounts by name.",
 b:function(){return {conditions:{users:all(),applications:apps(),clientAppTypes:["all"],authenticationFlows:{transferMethods:"deviceCodeFlow"}},grantControls:block()}}},
{n:9,g:"risk",t:"Require MFA for risky sign-ins",lic:"P2",
 who:"Everyone",when:"signs in and Microsoft rates the sign-in as medium or high risk",then:"needs MFA again, every time",
 w:"Needs Entra ID P2 for every user in scope. Users without a registered method are blocked when the risk fires.",
 b:function(){return {conditions:{users:all(),applications:apps(),clientAppTypes:["all"],signInRiskLevels:["high","medium"]},grantControls:mfa(),sessionControls:{signInFrequency:EVERY_TIME}}}},
{n:10,g:"risk",t:"Require a password change for high-risk users",lic:"P2",
 who:"Everyone",when:"is rated as a high-risk user, for example after leaked credentials",then:"needs MFA and has to change the password",
 w:"Needs Entra ID P2 and self-service password reset with writeback if passwords live on-premises. Passwordless users cannot change a password: block them instead.",
 b:function(){return {conditions:{users:all(),applications:apps(),clientAppTypes:["all"],userRiskLevels:["high"]},grantControls:{operator:"AND",builtInControls:["mfa","passwordChange"]},sessionControls:{signInFrequency:EVERY_TIME}}}},
{n:11,g:"device",t:"Require a managed device for administrators",lic:"P1",
 who:"Holders of 14 admin roles",when:"sign in to anything",then:"need a compliant or hybrid-joined device",
 w:"Admins can no longer work from a private computer. Needs Intune compliance policies or hybrid join. Keep the break-glass accounts excluded.",
 b:function(){return {conditions:{users:admins(),applications:apps(),clientAppTypes:["all"]},grantControls:device()}}},
{n:12,g:"device",t:"Require a managed device for all users",lic:"P1",
 who:"Members",when:"sign in to anything",then:"need a compliant or hybrid-joined device",
 w:"The strongest and most disruptive policy on this page: every device that is not enrolled is locked out, phones included. Enrol first, watch report-only for weeks, then enforce.",
 b:function(){return {conditions:{users:{includeUsers:["All"],excludeUsers:["GuestsOrExternalUsers"],excludeGroups:[BG]},applications:apps(),clientAppTypes:["all"]},grantControls:device()}}},
{n:13,g:"device",t:"Require app protection on phones and tablets",lic:"P1",
 who:"Everyone",when:"opens Office 365 on iOS or Android",then:"needs an app with an Intune app protection policy, or a compliant device",
 w:"Needs Intune app protection policies assigned to the users, and the Authenticator app (iOS) or Company Portal (Android) on the phone. Native mail apps stop working.",
 b:function(){return {conditions:{users:all(),applications:apps(["Office365"]),clientAppTypes:["all"],platforms:{includePlatforms:["android","iOS"]}},grantControls:{operator:"OR",builtInControls:["compliantApplication","compliantDevice"]}}}},
{n:14,g:"device",t:"Block unknown device platforms",lic:"P1",
 who:"Everyone",when:"signs in from a platform other than Windows, macOS, Linux, iOS or Android",then:"is blocked",
 w:"The platform is read from the user agent, so this is tidiness, not a wall. It mostly catches odd clients and scripts.",
 b:function(){return {conditions:{users:all(),applications:apps(),clientAppTypes:["all"],platforms:{includePlatforms:["all"],excludePlatforms:["android","iOS","windows","macOS","linux"]}},grantControls:block()}}},
{n:15,g:"session",t:"No lasting browser session on unmanaged devices",lic:"P1",
 who:"Everyone",when:"signs in from a device that is neither compliant nor hybrid-joined",then:function(o){return "signs in again after "+o.hours+" hours and is not remembered when the browser closes"},
 w:"Limits how long a stolen session cookie from a private or public computer stays useful. Users on unmanaged devices will notice the extra sign-ins.",
 b:function(o){return {conditions:{users:all(),applications:apps(),clientAppTypes:["all"],devices:{deviceFilter:{mode:"include",rule:"device.trustType -ne \"ServerAD\" -or device.isCompliant -ne True"}}},
  sessionControls:{signInFrequency:{isEnabled:true,type:"hours",value:o.hours,frequencyInterval:"timeBased",authenticationType:"primaryAndSecondaryAuthentication"},persistentBrowser:{isEnabled:true,mode:"never"}}}}},
{n:16,g:"session",t:function(o){return o.cmode==="allow"?"Block sign-ins from outside allowed countries":"Block sign-ins from selected countries"},lic:"P1",
 who:"Everyone",when:function(o){var c=o.countries.length?o.countries.join(", "):"the countries you enter";return o.cmode==="allow"?"signs in from any country except "+c:"signs in from "+c},then:"is blocked",
 w:"Country is derived from the IP address, so a VPN gets around it. It cuts noise, it does not stop a determined attacker. Travelling staff need an exception process.",
 b:function(o){return {conditions:{users:all(),applications:apps(),clientAppTypes:["all"],
  locations:o.cmode==="allow"?{includeLocations:["All"],excludeLocations:[LOC]}:{includeLocations:[LOC]}},grantControls:block()}}}
];
var GROUPS=[["base","the base","Four policies every tenant should have."],["identity","identity and registration","Guests, registration and the sign-in flows attackers abuse."],
 ["risk","risk-based","React to what Microsoft detects. Needs Entra ID P2."],["device","devices","Tie access to a device you manage. Needs Intune or hybrid join."],
 ["session","sessions and locations","How long a session lasts and where it may come from."]];
var PRESETS={starter:[1,2,3,4],recommended:[1,2,3,4,5,6,7,8,15],strict:[1,2,3,4,5,6,7,8,9,10,11,13,14,15],none:[]};
var STATES={report:["enabledForReportingButNotEnforced","report-only"],on:["enabled","on"],off:["disabled","off"]};

/* ---------- state ---------- */
var sel={},view="script";
function opts(){
  var c=$("cb-countries").value.toUpperCase().split(/[^A-Z]+/).filter(function(x){return x.length===2});
  var h=parseInt($("cb-hours").value,10);if(!(h>=1&&h<=720))h=8;
  return {prefix:$("cb-prefix").value.replace(/[^A-Za-z0-9 _-]/g,"").trim()||"CA",bg:$("cb-bg").value.trim().toLowerCase(),state:$("cb-state").value,strong:$("cb-strong").checked,
   countries:c.filter(function(x,i){return c.indexOf(x)===i}),cmode:$("cb-cmode").value,hours:h};
}
function val(v,o){return typeof v==="function"?v(o):v}
function sentence(p,o){return val(p.who,o)+" who "+val(p.when,o)+" "+val(p.then,o)+"."}
function pad(n){return ("00"+n).slice(-3)}
function nameOf(p,o){return o.prefix+pad(p.n)+" - "+val(p.t,o)}
function validGuid(s){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)}
function chosen(){return POL.filter(function(p){return sel[p.n]})}
function build(o){
  return chosen().map(function(p){
    var b=p.b(o),r={displayName:nameOf(p,o),state:STATES[o.state][0],conditions:b.conditions};
    if(b.grantControls)r.grantControls=b.grantControls;
    if(b.sessionControls)r.sessionControls=b.sessionControls;
    return r;
  });
}
function withIds(text,o){return validGuid(o.bg)?text.split(BG).join(o.bg):text}

/* ---------- outputs ---------- */
function jsonOut(o){return withIds(JSON.stringify(build(o),null,2),o)}
function scriptOut(o){
  var pols=build(o),needLoc=!!sel[16],L=[];
  L.push("# Conditional Access policies, generated by admin-hub.xyz/ca-policy-builder.html");
  L.push("# Creates "+pols.length+" polic"+(pols.length===1?"y":"ies")+" in state: "+STATES[o.state][1]+". Policies whose name already exists are skipped.");
  L.push("# Read it before you run it. Needs the Conditional Access Administrator role.");
  L.push("");
  L.push("$BreakGlassGroupId = '"+(validGuid(o.bg)?o.bg:"")+"'   # object ID of the group that holds your emergency access accounts");
  L.push("");
  L.push("$ErrorActionPreference = 'Stop'");
  L.push("if ($BreakGlassGroupId -notmatch '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') { throw 'Set $BreakGlassGroupId first. Without it these policies can lock everyone out.' }");
  L.push("Connect-MgGraph -Scopes 'Policy.ReadWrite.ConditionalAccess','Policy.Read.All','Application.Read.All','GroupMember.Read.All' -NoWelcome");
  L.push("$base = 'https://graph.microsoft.com/v1.0/identity/conditionalAccess'");
  L.push("");
  L.push("# The excluded group must exist and must not be empty");
  L.push("$members = (Invoke-MgGraphRequest -Method GET -Uri \"https://graph.microsoft.com/v1.0/groups/$BreakGlassGroupId/members?`$select=id\").value");
  L.push("if (-not $members) { throw 'The break-glass group has no members. Add your emergency access accounts first.' }");
  L.push("");
  if(needLoc){
    L.push("# Named location for the country policy");
    L.push("$locName = '"+o.prefix+" countries'");
    L.push("$loc = (Invoke-MgGraphRequest -Method GET -Uri \"$base/namedLocations\").value | Where-Object { $_.displayName -eq $locName } | Select-Object -First 1");
    L.push("if (-not $loc) {");
    L.push("  $body = @{ '@odata.type' = '#microsoft.graph.countryNamedLocation'; displayName = $locName");
    L.push("             countriesAndRegions = @("+o.countries.map(function(c){return "'"+c+"'"}).join(", ")+"); includeUnknownCountriesAndRegions = $false } | ConvertTo-Json");
    L.push("  $loc = Invoke-MgGraphRequest -Method POST -Uri \"$base/namedLocations\" -Body $body -ContentType 'application/json'");
    L.push("  Write-Host \"created  named location $locName\"");
    L.push("}");
    L.push("");
  }
  L.push("$policies = @(");
  pols.forEach(function(p,i){L.push("@'");L.push(JSON.stringify(p,null,2));L.push("'@"+(i<pols.length-1?",":""))});
  L.push(")");
  L.push("");
  L.push("$existing = @()");
  L.push("$uri = \"$base/policies?`$select=displayName\"");
  L.push("while ($uri) { $page = Invoke-MgGraphRequest -Method GET -Uri $uri; $existing += $page.value.displayName; $uri = $page.'@odata.nextLink' }");
  L.push("");
  L.push("foreach ($json in $policies) {");
  L.push("  $json = $json.Replace('"+BG+"', $BreakGlassGroupId)"+(needLoc?".Replace('"+LOC+"', $loc.id)":""));
  L.push("  $name = ($json | ConvertFrom-Json).displayName");
  L.push("  if ($existing -contains $name) { Write-Host \"exists   $name\"; continue }");
  L.push("  Invoke-MgGraphRequest -Method POST -Uri \"$base/policies\" -Body $json -ContentType 'application/json' | Out-Null");
  L.push("  Write-Host \"created  $name\"");
  L.push("}");
  return L.join("\n");
}

/* ---------- preflight ---------- */
function preflight(o){
  var f=[],s=sel,n=chosen().length;
  function add(sev,t,x){f.push({sev:sev,t:t,x:x})}
  if(!n)return f;
  if(!validGuid(o.bg))add("crit","No break-glass group set",o.bg?"\""+o.bg+"\" is not an object ID. It looks like 0a1b2c3d-1111-2222-3333-444455556666 and you find it on the group's overview page in Entra.":"Every policy here excludes one group, so that two emergency access accounts still get in when MFA, a device check or the policy itself goes wrong. Create a security group, put two cloud-only Global Administrator accounts with long random passwords in it, and paste its object ID above. The script refuses to run without it.");
  if(o.state==="on")add("high","You are creating the policies switched on","They apply from the first second. Create them in report-only, read the sign-in logs for a week (Conditional Access tab, Report-only column), then switch them on one at a time.");
  if(s[16]&&!o.countries.length)add("high","The country policy has no countries","Enter two-letter country codes such as DE, AT, CH. Without them the script creates an empty location and the policy "+(o.cmode==="allow"?"blocks every sign-in.":"blocks nothing."));
  if(s[16]&&o.cmode==="allow"&&o.countries.length&&o.state==="on")add("high","Allow-list by country, switched on","Anyone travelling outside "+o.countries.join(", ")+" is locked out at once, admins included. Start in report-only.");
  if(s[2]&&o.strong)add("med","Phishing-resistant MFA for admins needs preparation","Every admin has to register a passkey, FIDO2 key, Windows Hello for Business or certificate before this is enforced. Check Authentication methods, User registration details, first.");
  if(s[12])add("med","Managed device for all users is in the set","Every device that is not compliant or hybrid-joined loses access, including private phones. Do not enforce it before enrolment is finished.");
  if(s[11]||s[12]||s[13])add("info","Device policies in report-only can prompt on Mac, iOS and Android","While a policy that checks device compliance is in report-only, users on those platforms may be asked to pick a certificate. Exclude those platforms during the test or keep the test short.");
  if(s[9]||s[10])add("info","Two policies need Entra ID P2","Risk-based policies need a P2 licence for every user they apply to. Without it, creating the policy fails or the condition never fires.");
  if(s[6])add("info","Registration policy: think about day one","A new starter outside a trusted location cannot register a first method. Issue a Temporary Access Pass, and define your office addresses as a trusted named location.");
  if(s[8])add("info","Device code flow: find who uses it first","Sign-in logs, add the filter Authentication protocol = Device code. Whatever shows up there breaks when this policy is on.");
  var gaps=[];if(!s[1])gaps.push("legacy authentication stays open, which bypasses MFA completely");if(!s[2]&&!s[3])gaps.push("admins are not asked for MFA");if(!s[3])gaps.push("normal users are not asked for MFA");
  if(gaps.length)add("med","This set leaves the basics open",gaps.join("; ")+". Unless existing policies already cover it, add the base policies.");
  add("info","Security defaults and Conditional Access exclude each other","If security defaults are on, switch them off in the same step in which you switch your MFA policies on (Entra, Overview, Properties, Manage security defaults). In between, nothing asks for MFA.");
  return f;
}

/* ---------- render ---------- */
var SEVTXT={crit:"critical",high:"high",med:"medium",info:"info"},RANK={crit:0,high:1,med:2,info:3};
function render(){
  var o=opts(),list=chosen(),out=$("cb-out");
  out.replaceChildren();
  POL.forEach(function(p){var r=$("cb-p"+p.n);if(r){r.classList.toggle("on",!!sel[p.n]);r.querySelector("input").checked=!!sel[p.n];r.querySelector("b").textContent=nameOf(p,o);r.querySelector(".cbtxt span").textContent=sentence(p,o)}});
  $("cb-count").textContent=list.length+" of "+POL.length+" selected";
  $("cb-o2").hidden=!sel[2];$("cb-o15").hidden=!sel[15];$("cb-o16").hidden=!sel[16];
  if(!list.length){out.append(el("p","dim","Pick at least one policy, or start with a preset."));save(o);return}
  var f=preflight(o).sort(function(a,b){return RANK[a.sev]-RANK[b.sev]}),worst=f.length?f[0].sev:"info";
  var v=el("div","verdict v-"+(worst==="info"?"none":worst));
  v.append(el("b",null,list.length+" polic"+(list.length===1?"y":"ies")+", created "+(o.state==="report"?"in report-only":o.state==="on"?"switched on":"switched off")),
   el("span",null,worst==="crit"?"Not safe to run yet: see the first point below.":worst==="high"?"Read the warnings before you run the script.":"Excludes your break-glass group everywhere."));
  out.append(v);
  var h=el("h2",null,"before you run it");out.append(h);
  f.forEach(function(x){var d=el("details","finding");if(x.sev==="crit"||x.sev==="high")d.open=true;var s=el("summary");s.append(el("span","sevtag s-"+x.sev,SEVTXT[x.sev]),el("b",null,x.t));d.append(s,el("p",null,x.x));out.append(d)});
  out.append(el("h2",null,"what each policy does"));
  var tw=el("div","tw"),tb=el("table","tbl cbt"),th=el("thead"),tr=el("tr");["Policy","In plain words","Know before you enforce"].forEach(function(x){tr.append(el("th",null,x))});th.append(tr);tb.append(th);
  var body=el("tbody");list.forEach(function(p){var r=el("tr");r.append(el("td",null,nameOf(p,o)),el("td",null,sentence(p,o)),el("td",null,val(p.w,o)));body.append(r)});
  tb.append(body);tw.append(tb);out.append(tw);
  out.append(el("h2",null,"the result"));
  var tabs=el("div","ctl cbtabs");
  [["script","PowerShell script"],["json","JSON"]].forEach(function(t){var b=el("button","chipbtn"+(view===t[0]?" on":""),t[1]);b.type="button";b.setAttribute("aria-pressed",view===t[0]?"true":"false");b.addEventListener("click",function(){view=t[0];render()});tabs.append(b)});
  out.append(tabs);
  var text=view==="script"?scriptOut(o):jsonOut(o);
  out.append(el("p","dim",view==="script"?"Microsoft Graph PowerShell, works in Windows PowerShell 5.1 and PowerShell 7. It checks the break-glass group, skips policies that already exist and prints what it created.":"The request bodies for POST /identity/conditionalAccess/policies, as one list. "+BG+(sel[16]?" and "+LOC:"")+" stand"+(sel[16]?"":"s")+" for the ID"+(sel[16]?"s":"")+" you put in."));
  var pre=el("pre",null,text);pre.id="cb-code";pre.tabIndex=0;out.append(pre);
  var ctl=el("div","ctl");
  var cp=el("button","btn","Copy");cp.type="button";cp.addEventListener("click",function(){try{navigator.clipboard.writeText(text).then(function(){cp.textContent="Copied";setTimeout(function(){cp.textContent="Copy"},1200)})}catch(e){}});
  var dl=el("button","btn ghost",view==="script"?"Download ca-policies.ps1":"Download ca-policies.json");dl.type="button";
  dl.addEventListener("click",function(){var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/plain"}));a.download=view==="script"?"ca-policies.ps1":"ca-policies.json";document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},500)});
  var an=el("button","btn ghost","Check this set in the CA analyzer");an.type="button";
  an.addEventListener("click",function(){try{sessionStorage.setItem("ah_ca_built",JSON.stringify(build(o)))}catch(e){}location.href="ca-analyzer.html#built"});
  ctl.append(cp,dl,an);out.append(ctl);
  save(o);
}
function save(o){
  var ids=chosen().map(function(p){return p.n}).join(".");
  var q="p="+ids+"&s="+o.state+(o.strong?"&k=1":"")+(o.prefix!=="CA"?"&x="+encodeURIComponent(o.prefix):"")+(sel[16]?"&m="+o.cmode+"&c="+o.countries.join("."):"")+(sel[15]&&o.hours!==8?"&h="+o.hours:"");
  try{history.replaceState(null,"","#"+q)}catch(e){}
}
function restore(){
  var h=location.hash.replace(/^#/,"");if(!h||h.indexOf("p=")<0)return false;
  var q={};h.split("&").forEach(function(kv){var i=kv.indexOf("=");if(i>0)q[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1))});
  sel={};(q.p||"").split(".").forEach(function(n){n=parseInt(n,10);if(POL.some(function(p){return p.n===n}))sel[n]=true});
  if(STATES[q.s])$("cb-state").value=q.s;
  $("cb-strong").checked=q.k==="1";
  if(q.x)$("cb-prefix").value=q.x.replace(/[^A-Za-z0-9 _-]/g,"").slice(0,12);
  if(q.m==="allow"||q.m==="block")$("cb-cmode").value=q.m;
  if(q.c)$("cb-countries").value=q.c.split(".").join(", ");
  if(q.h)$("cb-hours").value=String(parseInt(q.h,10)||8);
  return true;
}

/* ---------- catalogue UI ---------- */
function catalogue(){
  var host=$("cb-list");
  GROUPS.forEach(function(g){
    var box=el("div","cbgroup"),hd=el("h3",null,g[1]);box.append(hd,el("p","dim",g[2]));
    POL.filter(function(p){return p.g===g[0]}).forEach(function(p){
      var l=el("label","cbrow");l.id="cb-p"+p.n;var c=document.createElement("input");c.type="checkbox";
      c.addEventListener("change",function(){sel[p.n]=c.checked;render()});
      var t=el("span","cbtxt");t.append(el("b"),el("span"));
      l.append(c,t,el("i","cblic"+(p.lic==="P2"?" p2":""),"Entra ID "+p.lic));box.append(l);
    });
    host.append(box);
  });
  [[2,"cb-o2"],[15,"cb-o15"],[16,"cb-o16"]].forEach(function(x){$("cb-p"+x[0]).after($(x[1]))});
}
function preset(k){sel={};PRESETS[k].forEach(function(n){sel[n]=true});render()}

catalogue();
["cb-prefix","cb-bg","cb-countries","cb-hours"].forEach(function(i){$(i).addEventListener("input",render)});
["cb-state","cb-strong","cb-cmode"].forEach(function(i){$(i).addEventListener("change",render)});
document.querySelectorAll("[data-preset]").forEach(function(b){b.addEventListener("click",function(){preset(b.getAttribute("data-preset"))})});
if(!restore())PRESETS.starter.forEach(function(n){sel[n]=true});
render();
window.caBuilder={build:function(){return build(opts())},script:function(){return scriptOut(opts())},preflight:function(){return preflight(opts())},POL:POL};
})();
