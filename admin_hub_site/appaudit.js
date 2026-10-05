(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e}

/* ---------- what counts as dangerous ---------- */
/* application permissions that let an app make itself or others administrator */
var TAKEOVER={"RoleManagement.ReadWrite.Directory":"can assign any directory role, including Global Administrator","AppRoleAssignment.ReadWrite.All":"can grant itself any other application permission","Application.ReadWrite.All":"can add a secret to any app and act as that app","PrivilegedAccess.ReadWrite.AzureAD":"can change PIM role settings and assignments","Policy.ReadWrite.ConditionalAccess":"can change or disable Conditional Access","UserAuthenticationMethod.ReadWrite.All":"can register a sign-in method for any user","Domain.ReadWrite.All":"can add a federated domain and forge sign-ins","RoleManagementPolicy.ReadWrite.Directory":"can weaken the rules for activating roles","Policy.ReadWrite.PermissionGrant":"can change who may consent to what","DelegatedPermissionGrant.ReadWrite.All":"can grant delegated permissions on behalf of all users"};
var TIER0ROLE=/^(Global Administrator|Privileged Role Administrator|Privileged Authentication Administrator|Application Administrator|Cloud Application Administrator|Hybrid Identity Administrator|Security Administrator|Conditional Access Administrator|Authentication Administrator|User Administrator|Exchange Administrator|Intune Administrator|Partner Tier2 Support|Helpdesk Administrator|Password Administrator)$/i;
/* application permissions that read or change everybody's data */
var DATA=/^(Mail\.(Read|ReadWrite|Send|ReadBasic\.All)|MailboxSettings\.ReadWrite|Files\.(Read|ReadWrite)\.All|Sites\.(Read|ReadWrite|Manage|FullControl)\.All|Calendars\.(Read|ReadWrite)|Contacts\.(Read|ReadWrite)|Chat\.(Read|ReadWrite)\.All|ChannelMessage\.Read\.All|Notes\.(Read|ReadWrite)\.All|full_access_as_app|Exchange\.ManageAsApp|User\.(Read|ReadWrite)\.All|Group(Member)?\.ReadWrite\.All|Directory\.(Read|ReadWrite)\.All|AuditLog\.Read\.All|SecurityEvents\.ReadWrite\.All|DeviceManagementManagedDevices\.(ReadWrite|PrivilegedOperations)\.All|DeviceManagementConfiguration\.ReadWrite\.All|TeamsActivity\.Send|eDiscovery\.ReadWrite\.All)$/i;
var DATAHIGH=/^(User\.ReadWrite|Group(Member)?\.ReadWrite|Directory\.ReadWrite|Mail\.|MailboxSettings|Files\.|Sites\.|Chat\.|ChannelMessage|Notes\.|full_access_as_app|Exchange\.ManageAsApp|eDiscovery|DeviceManagement)/i;
/* delegated scopes that are worth stealing through a consent prompt */
var SCOPE=/^(Mail\.(Read|ReadWrite|Send)(\.Shared|\.All)?|MailboxSettings\.ReadWrite|Files\.(Read|ReadWrite)(\.All)?|Sites\.(Read|ReadWrite|FullControl)\.All|Contacts\.(Read|ReadWrite)|Notes\.(Read|ReadWrite)\.All|Chat\.(Read|ReadWrite)|EWS\.AccessAsUser\.All|IMAP\.AccessAsUser\.All|POP\.AccessAsUser\.All|SMTP\.Send|full_access_as_user|user_impersonation|Directory\.(ReadWrite|AccessAsUser)\.All|User\.ReadWrite\.All|Group\.ReadWrite\.All|RoleManagement\.ReadWrite\.Directory|Application\.ReadWrite\.All)$/i;
var MSTENANTS={"f8cdef31-a31e-4b4a-93e4-5f571e91255a":1,"72f988bf-86f1-41af-91ab-2d7cd011db47":1,"cdc5aeea-15c5-4db6-b079-fcadd2505dc2":1};

var DAY=864e5;
function t(s){if(!s)return null;var x=Date.parse(s);return isNaN(x)?null:x}
function day(x){return x?new Date(x).toISOString().slice(0,10):"never"}
function arr(v){return Array.isArray(v)?v.filter(function(x){return x!==null&&x!==undefined&&x!==""}):v===null||v===undefined||v===""?[]:[v]}
function plural(n,w){return n+" "+w+(n===1?"":"s")}
function uniq(a){var s={},o=[];a.forEach(function(x){if(!s[x]){s[x]=1;o.push(x)}});return o}
function creds(list){return arr(list).map(function(c){return {name:String(c.name||c.displayName||""),end:t(c.end||c.endDateTime),start:t(c.start||c.startDateTime)}}).filter(function(c){return c.end})}
function permName(p){var s=String(p),i=s.indexOf(": ");return i>=0?s.slice(i+2):s}

/* ---------- parsing: the JSON written by the export script ---------- */
function parse(text){
  var d=JSON.parse(text.replace(/^\uFEFF/,""));
  if(!d||(!Array.isArray(d.apps)&&!Array.isArray(d.sps)))throw new Error("this is not the file from the export script on this page (no apps or sps list)");
  var tenant=String(d.tenantId||"").toLowerCase(),A={},list=[],sign=d.signins&&typeof d.signins==="object"?d.signins:null,signMap=null;
  if(sign){signMap={};(Array.isArray(sign)?sign:Object.keys(sign).map(function(k){return {appId:k,last:sign[k]}})).forEach(function(s){if(s&&s.appId)signMap[String(s.appId).toLowerCase()]=t(s.last)})}
  function get(appId,name){var k=String(appId||"").toLowerCase()||("?"+list.length);if(!A[k]){A[k]={appId:k,name:String(name||"(no name)"),reg:false,sp:false,origin:"",secrets:[],certs:[],spSecrets:[],spCerts:[],appPerms:[],roles:[],owners:null,redirect:[],implicit:false,audience:"",created:null,verified:false,enabled:true,sso:"",grants:[],spId:"",type:""};list.push(A[k])}return A[k]}
  arr(d.apps).forEach(function(a){var x=get(a.appId,a.name);x.reg=true;x.name=String(a.name||x.name);x.secrets=creds(a.secrets);x.certs=creds(a.certs);x.owners=arr(a.owners).map(String);x.redirect=arr(a.redirect).map(String);x.implicit=!!a.implicit;x.audience=String(a.audience||"");x.created=t(a.created);x.origin="yours"});
  var byId={};
  arr(d.sps).forEach(function(s){var x=get(s.appId,s.name);x.sp=true;x.spId=String(s.id||"").toLowerCase();byId[x.spId]=x;if(!x.reg)x.name=String(s.name||x.name);
    x.spSecrets=creds(s.secrets);x.spCerts=creds(s.certs);x.appPerms=arr(s.appPerms).map(String).filter(function(p){return permName(p)});x.roles=arr(s.roles).map(String);
    x.verified=!!s.verified;x.enabled=s.enabled!==false;x.sso=String(s.sso||"").toLowerCase();x.type=String(s.type||"");if(!x.created)x.created=t(s.created);
    var ot=String(s.ownerTenant||"").toLowerCase();
    if(!x.origin)x.origin=MSTENANTS[ot]?"Microsoft":ot&&tenant&&ot===tenant?"yours":/managedidentity/i.test(x.type)?"managed identity":ot?"third party":"unknown"});
  arr(d.grants).forEach(function(g){var x=byId[String(g.client||g.clientId||"").toLowerCase()];if(!x)return;
    x.grants.push({all:/allprincipals/i.test(String(g.type||g.consentType||"")),principal:String(g.principal||g.principalId||""),resource:String(g.resource||""),scopes:String(g.scope||"").split(/\s+/).filter(Boolean)})});
  list.forEach(function(x){x.last=signMap?(signMap[x.appId]||null):undefined;if(!x.origin)x.origin="unknown"});
  if(!list.length)throw new Error("the file contains no applications");
  return {apps:list,hasSignIn:!!signMap,exported:t(d.exported),tenant:tenant};
}

/* ---------- checks ---------- */
var SEV={crit:0,high:1,med:2,info:3},SEVNAME={crit:"critical",high:"high",med:"medium",info:"info"};
function analyse(data,now){
  now=now||data.exported||Date.now();
  var A=data.apps,F=[],flagged={};
  function who(x){return x.owners===null?"":x.owners.length?x.owners.slice(0,2).join(", ")+(x.owners.length>2?" +"+(x.owners.length-2):""):"no owner"}
  function lastOf(x){return x.last===undefined?"n/a":day(x.last)}
  function add(sev,key,title,rows,summary,steps,ps,detailCol){
    if(!rows.length)return;
    rows.forEach(function(r){flagged[r.x.appId]=Math.min(flagged[r.x.appId]===undefined?9:flagged[r.x.appId],SEV[sev])});
    F.push({sev:sev,key:key,title:title,count:rows.length,summary:summary,steps:steps,ps:ps,cols:["Application","Origin",detailCol,"Owner","Last sign-in"],
      rows:rows.map(function(r){return [r.x.name,r.x.origin+(r.x.origin==="third party"&&!r.x.verified?", unverified":""),r.d,who(r.x),lastOf(r.x)]})});
  }
  var rows,x;

  /* 1 takeover */
  rows=[];A.forEach(function(x){var hit=uniq(x.appPerms.map(permName).filter(function(p){return TAKEOVER[p]})),r=x.roles.filter(function(n){return TIER0ROLE.test(n)});
    if(hit.length||r.length)rows.push({x:x,d:hit.concat(r.map(function(n){return "role: "+n})).join(", "),w:hit[0]?TAKEOVER[hit[0]]:"holds an administrator role"})});
  var foreign=rows.filter(function(r){return r.x.origin==="third party"}).length;
  add(foreign?"crit":"high","takeover","Apps that can take control of the tenant",rows,plural(rows.length,"app")+" hold application permissions or directory roles that lead to full control: "+uniq(rows.map(function(r){return r.w})).slice(0,3).join("; ")+". Whoever holds a secret of such an app is a Global Administrator without MFA and without Conditional Access."+(foreign?" "+foreign+" of them belong to another organisation.":""),
    ["For each app, find out what it does and whether it needs this exact permission. Most need a narrower one.","Replace client secrets with certificates or, for Azure workloads, managed identities.","Restrict where the app may sign in from with Conditional Access for workload identities, if you have the licence.","Watch these apps: alert on new credentials and on sign-ins from unknown addresses."],
    "Get-MgServicePrincipal -All | ForEach-Object { $sp = $_; Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $sp.Id -All |\n  Select-Object @{n='App';e={$sp.DisplayName}}, ResourceDisplayName, AppRoleId }","Permission or role");

  /* 2 broad data access */
  rows=[];A.forEach(function(x){var hit=uniq(x.appPerms.map(permName).filter(function(p){return DATA.test(p)}));if(hit.length&&hit.some(function(p){return DATAHIGH.test(p)}))rows.push({x:x,d:hit.join(", ")})});
  add("high","data","Apps that can read or change everyone's data without a user",rows,plural(rows.length,"app")+" hold application permissions on all mailboxes, all files, all chats or the whole directory. An application permission is not limited to one user and is not subject to MFA.",
    ["Ask whether the app needs every mailbox or site. For Exchange, limit it with RBAC for Applications or an application access policy. For SharePoint, use Sites.Selected.","Remove permissions that were added \"to be safe\" during setup.","Third-party apps with this access hold a copy of your key. Check the vendor and the contract."],
    "$graph = Get-MgServicePrincipal -Filter \"appId eq '00000003-0000-0000-c000-000000000000'\"\nGet-MgServicePrincipalAppRoleAssignedTo -ServicePrincipalId $graph.Id -All |\n  Select-Object PrincipalDisplayName, @{n='Permission';e={ $id = $_.AppRoleId; ($graph.AppRoles | Where-Object Id -eq $id).Value }}","Application permissions");

  /* 3 credentials on service principals */
  rows=[];A.forEach(function(x){if(!x.sp||x.sso==="saml"||x.origin==="managed identity")return;var c=x.spSecrets.concat(x.spCerts).filter(function(k){return k.end>now});
    if(c.length&&(x.origin!=="yours"||!x.reg))rows.push({x:x,d:plural(x.spSecrets.filter(function(k){return k.end>now}).length,"secret")+", "+plural(x.spCerts.filter(function(k){return k.end>now}).length,"certificate")+" on the enterprise app"})});
  add("high","spcred","Credentials added directly to an enterprise app you do not own",rows,"Secrets and certificates normally live on the app registration, in the publisher's tenant. A credential on the enterprise app object in your tenant lets its holder sign in as that app with all the permissions you granted it. Attackers add one to a trusted, highly privileged app to stay in the tenant unnoticed. Apps with SAML single sign-on are excluded, because their signing certificate is stored this way.",
    ["Check who added each credential and when, in the audit log (activity \"Add service principal credentials\").","If nobody can explain it, remove the credential and treat the app's permissions as abused.","Some provisioning and legacy integrations do this legitimately. Document those."],
    "Get-MgServicePrincipal -All -Property displayName, appOwnerOrganizationId, passwordCredentials, keyCredentials, preferredSingleSignOnMode |\n  Where-Object { ($_.PasswordCredentials -or $_.KeyCredentials) -and $_.PreferredSingleSignOnMode -ne 'saml' } |\n  Select-Object DisplayName, AppOwnerOrganizationId, @{n='Secrets';e={$_.PasswordCredentials.Count}}, @{n='Certs';e={$_.KeyCredentials.Count}}","Credentials");

  /* 4 user consent to unverified third-party apps */
  rows=[];A.forEach(function(x){if(x.origin!=="third party"||x.verified)return;var users={},sc={};
    x.grants.forEach(function(g){if(g.all)return;var hit=g.scopes.filter(function(s){return SCOPE.test(s)});if(hit.length){users[g.principal]=1;hit.forEach(function(s){sc[s]=1})}});
    var n=Object.keys(users).length;if(n)rows.push({x:x,d:plural(n,"user")+" consented to "+Object.keys(sc).join(", ")})});
  add("high","consent","Users gave an unverified outside app access to their data",rows,"Individual users approved these apps to read their mail or files. The publisher is not verified. This is exactly what consent phishing looks like: no password is stolen, the app simply keeps a token, and a password reset does not remove it.",
    ["Look at each app: who consented, when, and does anyone know the product.","If it is unknown, remove the consent and the enterprise app, and review what the affected users' mailboxes sent and received since.","Stop it at the source: allow user consent only for verified publishers and low-impact permissions, and turn on the admin consent workflow."],
    "Get-MgOauth2PermissionGrant -All | Where-Object ConsentType -eq 'Principal' |\n  Select-Object ClientId, PrincipalId, Scope","Consent");

  /* 5 tenant-wide delegated grants to outside apps */
  rows=[];A.forEach(function(x){if(x.origin!=="third party")return;var sc={};x.grants.forEach(function(g){if(g.all)g.scopes.filter(function(s){return SCOPE.test(s)}).forEach(function(s){sc[s]=1})});
    if(Object.keys(sc).length)rows.push({x:x,d:"for all users: "+Object.keys(sc).join(", ")})});
  add("med","adminconsent","Outside apps with admin consent for sensitive data of all users",rows,"An administrator approved these apps for the whole organisation. Every user who signs in to the app hands it access to their own mail or files. That may be intended. It should be a decision someone remembers.",
    ["Confirm each app is still in use and still needs these scopes.","Limit who can use the app: set \"Assignment required\" on the enterprise app and assign a group.","Remove grants for products you no longer use. Uninstalling a product does not remove its consent."],
    "Get-MgOauth2PermissionGrant -All | Where-Object ConsentType -eq 'AllPrincipals' |\n  Select-Object ClientId, ResourceId, Scope","Delegated scopes");

  /* 6 credentials about to expire */
  rows=[];A.forEach(function(x){if(x.origin!=="yours")return;var all=x.secrets.concat(x.certs),soon=all.filter(function(k){return k.end>now&&k.end-now<=30*DAY});
    if(soon.length){var later=all.some(function(k){return k.end-now>30*DAY});rows.push({x:x,d:soon.map(function(k){return (k.name||"credential")+" ends "+day(k.end)}).join("; ")+(later?" (another credential is valid longer)":"")})}});
  add("high","expiring","Secrets and certificates that expire within 30 days",rows,"When the last valid credential of an app expires, whatever uses it stops working: a sync, a backup, a sign-in button. Nothing warns you beforehand.",
    ["Find out where each credential is used before you create a new one.","Add the new credential, update the consumer, confirm it works, then delete the old one.","Put the next expiry in a calendar, or better, monitor it."],
    "$limit = (Get-Date).AddDays(30)\nGet-MgApplication -All -Property displayName, passwordCredentials, keyCredentials | ForEach-Object {\n  $a = $_; @($a.PasswordCredentials) + @($a.KeyCredentials) | Where-Object { $_.EndDateTime -gt (Get-Date) -and $_.EndDateTime -lt $limit } |\n    Select-Object @{n='App';e={$a.DisplayName}}, DisplayName, EndDateTime }","Expiry");

  /* 7 long-lived secrets */
  rows=[];A.forEach(function(x){if(x.origin!=="yours")return;var long=x.secrets.filter(function(k){return k.end>now&&((k.start&&k.end-k.start>731*DAY)||k.end-now>731*DAY)});
    if(long.length)rows.push({x:x,d:long.map(function(k){return (k.name||"secret")+" valid until "+day(k.end)}).join("; ")})});
  add("med","longlived","Client secrets that are valid for more than two years",rows,"A secret is a password for an application, stored in a config file or a pipeline somewhere. The longer it lives, the more copies exist and the more people have seen it. The portal limits new secrets to two years. Longer ones were created by script.",
    ["Rotate them on a schedule you can keep, for example yearly.","Use a certificate instead where the application supports it, or a managed identity or workload identity federation where it runs in Azure or a pipeline.","An app management policy can enforce a maximum lifetime for new secrets."],
    "Get-MgApplication -All -Property displayName, passwordCredentials | ForEach-Object { $a = $_; $a.PasswordCredentials |\n  Where-Object { ($_.EndDateTime - $_.StartDateTime).Days -gt 731 } | Select-Object @{n='App';e={$a.DisplayName}}, DisplayName, StartDateTime, EndDateTime }","Secret");

  /* 8 unused */
  if(data.hasSignIn){
    rows=[];A.forEach(function(x){if(!x.sp||x.origin==="Microsoft"||x.origin==="managed identity")return;var has=x.appPerms.length||x.grants.length||x.secrets.some(function(k){return k.end>now})||x.certs.some(function(k){return k.end>now});
      if(!has)return;var old=x.created&&now-x.created>60*DAY;
      if(x.last&&now-x.last>90*DAY)rows.push({x:x,d:"last used "+Math.floor((now-x.last)/DAY)+" days ago"});
      else if(!x.last&&old)rows.push({x:x,d:"no sign-in on record"})});
    add("med","unused","Apps with access that nobody has used for 90 days",rows,plural(rows.length,"app")+" still hold permissions or valid credentials but show no sign-in for 90 days or more. An unused app with standing access is risk with no benefit, and nobody notices when it is misused.",
      ["Ask the owner. No owner and no sign-in is a good reason to disable the app first and delete it a month later.","Disabling the enterprise app (\"Enabled for users to sign in: No\") is reversible. Deleting is recoverable for 30 days.","Sign-in activity for apps needs Entra ID P1 and has limited history. Check before you delete anything business-critical that runs once a year."],
      "Get-MgBetaReportServicePrincipalSignInActivity -All |\n  Select-Object AppId, @{n='LastSignIn';e={$_.LastSignInActivity.LastSignInDateTime}} | Sort-Object LastSignIn","Usage");
  }

  /* 9 no owner */
  rows=[];A.forEach(function(x){if(x.reg&&x.owners&&!x.owners.length)rows.push({x:x,d:(x.secrets.length+x.certs.length)?plural(x.secrets.length+x.certs.length,"credential"):"no credentials"})});
  add("med","noowner","App registrations without an owner",rows,plural(rows.length,"app registration")+" have no owner. Nobody is told when a secret is about to expire, and nobody can say what the app is for. The person who created it has usually left.",
    ["Assign two owners per app: a person and a deputy.","Apps that nobody claims and nobody uses are candidates for removal."],
    "Get-MgApplication -All | Where-Object { -not (Get-MgApplicationOwner -ApplicationId $_.Id) } | Select-Object DisplayName, AppId, CreatedDateTime","Credentials");

  /* 10 redirect URIs and implicit flow */
  rows=[];A.forEach(function(x){if(!x.reg)return;var bad=[];
    x.redirect.forEach(function(u){if(/\*/.test(u))bad.push("wildcard: "+u);else if(/^http:\/\/(?!localhost|127\.0\.0\.1|\[::1\])/i.test(u))bad.push("not encrypted: "+u)});
    if(x.implicit)bad.push("implicit grant issues access tokens");
    if(bad.length)rows.push({x:x,d:bad.slice(0,3).join("; ")+(bad.length>3?" +"+(bad.length-3):"")})});
  add("med","redirect","Risky sign-in settings on app registrations",rows,"The redirect address is where Entra ID sends the token after sign-in. A wildcard or an unencrypted address lets someone else receive it. The implicit grant puts access tokens into the browser's address bar and is no longer recommended.",
    ["Replace wildcards with the exact addresses in use.","Change http addresses to https. Only localhost may stay unencrypted, for development.","Move the application to the authorization code flow with PKCE and switch the implicit grant off."],
    "Get-MgApplication -All -Property displayName, web, spa | Select-Object DisplayName,\n  @{n='RedirectUris';e={@($_.Web.RedirectUris) + @($_.Spa.RedirectUris) -join ', '}}, @{n='ImplicitAccessToken';e={$_.Web.ImplicitGrantSettings.EnableAccessTokenIssuance}}","Setting");

  /* 11 expired leftovers, 12 multi-tenant */
  rows=[];A.forEach(function(x){if(x.origin!=="yours")return;var all=x.secrets.concat(x.certs),exp=all.filter(function(k){return k.end<=now});
    if(exp.length)rows.push({x:x,d:plural(exp.length,"expired credential")+(all.length===exp.length?", none valid":"")})});
  add("info","expired","Expired credentials that were never removed",rows,"Expired secrets and certificates do no harm, but they hide the ones that matter. An app whose credentials have all expired is either broken or no longer used.",
    ["Delete expired credentials.","For apps with no valid credential left, check the sign-in activity and remove the app if it is dead."],
    "Get-MgApplication -All -Property displayName, passwordCredentials, keyCredentials | ForEach-Object { $a = $_; @($a.PasswordCredentials) + @($a.KeyCredentials) |\n  Where-Object { $_.EndDateTime -lt (Get-Date) } | Select-Object @{n='App';e={$a.DisplayName}}, DisplayName, EndDateTime }","Credentials");
  rows=[];A.forEach(function(x){if(x.reg&&/multipleorgs|personalmicrosoftaccount/i.test(x.audience))rows.push({x:x,d:/personal/i.test(x.audience)?"any organisation and personal Microsoft accounts":"any organisation"})});
  add("info","multitenant","Your own apps that accept sign-ins from other organisations",rows,"These app registrations are multi-tenant. Users from any other Entra tenant can sign in to them. That is right for a product you offer to customers and wrong for an internal tool, where the application code is then the only thing checking who the user is.",
    ["Set internal apps to \"Accounts in this organizational directory only\".","For real multi-tenant apps, make sure the code validates the tenant of every token."],
    "Get-MgApplication -All -Property displayName, signInAudience | Where-Object SignInAudience -ne 'AzureADMyOrg' | Select-Object DisplayName, SignInAudience","Accepts");

  F.sort(function(a,b){return SEV[a.sev]-SEV[b.sev]});
  var counts={crit:0,high:0,med:0,info:0};F.forEach(function(f){counts[f.sev]++});
  var worst=F.length?F[0].sev:"none",attention=Object.keys(flagged).filter(function(k){return flagged[k]<=2}).length;
  var inv=A.filter(function(x){return x.origin!=="Microsoft"||flagged[x.appId]!==undefined}).map(function(x){
    var c=x.secrets.concat(x.certs,x.spSecrets,x.spCerts).filter(function(k){return k.end>now}).sort(function(a,b){return a.end-b.end});
    return {x:x,sev:flagged[x.appId],row:[x.name,x.origin,c.length?c.length+", next ends "+day(c[0].end):"none",String(x.appPerms.length),String(uniq([].concat.apply([],x.grants.map(function(g){return g.scopes}))).length),lastOf(x),flagged[x.appId]===undefined?"":["critical","high","medium","info"][flagged[x.appId]]]}});
  inv.sort(function(a,b){return (a.sev===undefined?9:a.sev)-(b.sev===undefined?9:b.sev)||a.x.name.localeCompare(b.x.name)});
  return {findings:F,counts:counts,worst:worst,attention:attention,total:inv.length,inventory:inv.map(function(i){return i.row}),now:now,
    stats:{reg:A.filter(function(x){return x.reg}).length,third:A.filter(function(x){return x.origin==="third party"}).length,secrets:A.filter(function(x){return x.secrets.some(function(k){return k.end>now})}).length,appPerm:A.filter(function(x){return x.origin!=="Microsoft"&&x.appPerms.length}).length},
    notChecked:data.hasSignIn?[]:["unused apps (the file has no sign-in activity; the export script needs the Microsoft.Graph.Beta.Reports module for it)"]};
}

/* ---------- export script ---------- */
var SCRIPT=["# Read-only. Writes apps.json into the current folder. PowerShell 7, Microsoft.Graph module.",
"# On a large tenant this takes a few minutes: it asks for the permissions of each app in turn.",
"Connect-MgGraph -Scopes 'Application.Read.All','Directory.Read.All','AuditLog.Read.All' -NoWelcome",
"$tenant = (Get-MgContext).TenantId",
"$microsoft = 'f8cdef31-a31e-4b4a-93e4-5f571e91255a','72f988bf-86f1-41af-91ab-2d7cd011db47'",
"function Creds($list) { @($list | Where-Object { $_ } | ForEach-Object { [pscustomobject]@{ name = $_.DisplayName; start = $_.StartDateTime; end = $_.EndDateTime } }) }",
"",
"$sps = Get-MgServicePrincipal -All -Property id,appId,displayName,servicePrincipalType,appOwnerOrganizationId,accountEnabled,createdDateTime,passwordCredentials,keyCredentials,verifiedPublisher,appRoles,preferredSingleSignOnMode",
"$spName = @{}; $roleName = @{}",
"foreach ($s in $sps) { $spName[$s.Id] = $s.DisplayName; foreach ($r in $s.AppRoles) { $roleName[\"$($s.Id)|$($r.Id)\"] = $r.Value } }",
"",
"$dirRoles = @{}",
"Get-MgRoleManagementDirectoryRoleAssignment -All -ExpandProperty roleDefinition | Where-Object { $spName.ContainsKey($_.PrincipalId) } |",
"  ForEach-Object { $dirRoles[$_.PrincipalId] = @($dirRoles[$_.PrincipalId]) + $_.RoleDefinition.DisplayName }",
"",
"$spOut = foreach ($s in $sps) {",
"  $isMicrosoft = $s.AppOwnerOrganizationId -in $microsoft",
"  if ($isMicrosoft -and -not $s.PasswordCredentials -and -not $s.KeyCredentials -and -not $dirRoles[$s.Id]) { continue }   # skip untouched Microsoft apps",
"  $perms = @(Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $s.Id -All |",
"    ForEach-Object { \"$($spName[$_.ResourceId]): $($roleName[\"$($_.ResourceId)|$($_.AppRoleId)\"])\" })",
"  [pscustomobject]@{ id = $s.Id; appId = $s.AppId; name = $s.DisplayName; type = $s.ServicePrincipalType; ownerTenant = $s.AppOwnerOrganizationId",
"    enabled = $s.AccountEnabled; created = $s.CreatedDateTime; verified = [bool]$s.VerifiedPublisher.VerifiedPublisherId; sso = $s.PreferredSingleSignOnMode",
"    secrets = Creds $s.PasswordCredentials; certs = Creds $s.KeyCredentials; appPerms = $perms; roles = @($dirRoles[$s.Id] | Where-Object { $_ }) }",
"}",
"",
"$appOut = foreach ($a in Get-MgApplication -All -Property id,appId,displayName,createdDateTime,signInAudience,passwordCredentials,keyCredentials,web,spa,publicClient) {",
"  [pscustomobject]@{ appId = $a.AppId; name = $a.DisplayName; created = $a.CreatedDateTime; audience = $a.SignInAudience",
"    secrets = Creds $a.PasswordCredentials; certs = Creds $a.KeyCredentials",
"    redirect = @(@($a.Web.RedirectUris) + @($a.Spa.RedirectUris) + @($a.PublicClient.RedirectUris) | Where-Object { $_ })",
"    implicit = [bool]$a.Web.ImplicitGrantSettings.EnableAccessTokenIssuance",
"    owners = @(Get-MgApplicationOwner -ApplicationId $a.Id -All | ForEach-Object { $_.AdditionalProperties.userPrincipalName ?? $_.AdditionalProperties.displayName }) }",
"}",
"",
"$grants = @(Get-MgOauth2PermissionGrant -All | ForEach-Object {",
"  [pscustomobject]@{ client = $_.ClientId; type = $_.ConsentType; principal = $_.PrincipalId; resource = $spName[$_.ResourceId]; scope = $_.Scope } })",
"",
"# Optional: when each app last signed in. Needs the Microsoft.Graph.Beta.Reports module and Entra ID P1.",
"$signins = $null",
"if (Get-Command Get-MgBetaReportServicePrincipalSignInActivity -ErrorAction SilentlyContinue) {",
"  try { $signins = @(Get-MgBetaReportServicePrincipalSignInActivity -All | ForEach-Object { [pscustomobject]@{ appId = $_.AppId; last = $_.LastSignInActivity.LastSignInDateTime } }) } catch { }",
"}",
"",
"[pscustomobject]@{ exported = (Get-Date).ToUniversalTime().ToString('o'); tenantId = $tenant; apps = @($appOut); sps = @($spOut); grants = $grants; signins = $signins } |",
"  ConvertTo-Json -Depth 6 | Out-File apps.json -Encoding utf8"].join("\n");

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
var state={data:null,result:null,name:""},INV=["Application","Origin","Valid credentials","App permissions","Delegated scopes","Last sign-in","Flag"];

function render(){
  var out=$("aa-out");out.replaceChildren();
  var R=analyse(state.data);state.result=R;
  $("aa-status").textContent=plural(R.total,"application")+" read from "+state.name+".";
  var v=el("div","verdict v-"+(R.worst==="none"?"info":R.worst));
  v.append(el("b",null,R.worst==="crit"?"Act now":R.worst==="high"?"Needs attention":R.worst==="med"?"Worth a look":R.worst==="info"?"Nothing alarming":"Nothing found"),
    el("span",null,R.findings.length?R.attention+" of "+R.total+" apps need a look · "+["crit","high","med","info"].filter(function(s){return R.counts[s]}).map(function(s){return R.counts[s]+" "+SEVNAME[s]}).join(" · "):"none of the checks matched this export"));
  out.append(v);
  var stats=el("div","stats");stats.style.setProperty("--cols","4");
  stats.append(tile("app registrations",String(R.stats.reg),"created in your tenant"),tile("outside apps",String(R.stats.third),"from other organisations"),tile("with a client secret",String(R.stats.secrets),"your apps with a valid secret"),tile("act without a user",String(R.stats.appPerm),"hold application permissions"));
  out.append(stats);
  out.append(el("h2",null,"findings"));
  if(!R.findings.length)out.append(el("p","dim","None of the checks matched. That is a statement about this export and these checks."));
  R.findings.forEach(function(f,i){
    var d=el("details","finding f-"+f.sev);if(i<2&&SEV[f.sev]<=1)d.open=true;
    var s=el("summary");s.append(el("span","sevtag",SEVNAME[f.sev]),el("b",null,f.title+" ("+f.count+")"));
    d.append(s,el("p",null,f.summary),table(f.cols,f.rows,20));
    var b=el("button","btn ghost","Download this list (.csv)");b.type="button";b.addEventListener("click",function(){save("apps-"+f.key+".csv",csv(f.cols,f.rows),"text/csv")});
    d.append(b,el("h3","fh","what to do"));
    var ol=el("ol","steps");f.steps.forEach(function(x){ol.append(el("li",null,x))});d.append(ol);
    d.append(el("h3","fh","look at it in your tenant"),el("pre",null,f.ps),copyBtn("Copy command",f.ps));out.append(d);
  });
  if(R.notChecked.length){var sk=el("div","note");sk.append(el("b",null,"Not checked: "),document.createTextNode(R.notChecked.join("; ")+"."));out.append(sk)}
  out.append(el("h2",null,"all applications"),el("p","dim","Flagged apps first. Microsoft's own apps are left out unless something was found on them."),table(INV,R.inventory,40));
  var ctl=el("div","ctl");ctl.style.marginTop="28px";
  var a=el("button","btn ghost","Download the app list (.csv)");a.type="button";a.addEventListener("click",function(){save("apps-inventory.csv",csv(INV,R.inventory),"text/csv")});
  var dl=el("button","btn","Download report (.md)");dl.type="button";dl.addEventListener("click",function(){save("app-audit.md",report(),"text/markdown")});
  var pr=el("button","btn ghost","Print / save as PDF");pr.type="button";pr.addEventListener("click",function(){document.querySelectorAll("#aa-out details").forEach(function(x){x.open=true});window.print()});
  ctl.append(dl,a,pr);out.append(ctl);out.hidden=false;
  remember("apps",{worst:R.worst,attention:R.attention,total:R.total,counts:R.counts,top:R.findings.slice(0,3).map(function(f){return f.title+" ("+f.count+")"})});
}
function report(){
  var R=state.result,L=[];if(!R)return "";
  L.push("# Entra application audit","","Source: "+state.name,"Applications: "+R.total+", of which "+R.attention+" need a look","Reference date: "+day(R.now),"Generated in the browser by the admin_hub app audit. No data left this device.","");
  R.findings.forEach(function(f){
    L.push("## ["+SEVNAME[f.sev].toUpperCase()+"] "+f.title+" ("+f.count+")","",f.summary,"","| "+f.cols.join(" | ")+" |","|"+f.cols.map(function(){return " --- "}).join("|")+"|");
    f.rows.forEach(function(r){L.push("| "+r.map(function(c){return String(c).replace(/\|/g,"\\|")}).join(" | ")+" |")});
    L.push("","**What to do**","");f.steps.forEach(function(s,i){L.push((i+1)+". "+s)});L.push("");
  });
  if(R.notChecked.length)L.push("## Not checked","",R.notChecked.map(function(s){return "- "+s}).join("\n"),"");
  return L.join("\n");
}
function load(text,name){
  try{state.data=parse(text);state.name=name;render();$("aa-out").scrollIntoView({behavior:"smooth",block:"start"})}
  catch(e){$("aa-out").hidden=true;$("aa-status").textContent="Could not read that file: "+(e instanceof SyntaxError?"it is not valid JSON":e.message)+"."}
}
function readFile(f){
  if(!f)return;$("aa-status").textContent="Reading "+f.name+" ...";
  var r=new FileReader();r.onload=function(){load(String(r.result),f.name)};r.onerror=function(){$("aa-status").textContent="The browser could not read that file."};r.readAsText(f);
}

/* ---------- sample: a made-up tenant ---------- */
function sample(){
  var now=Date.now(),iso=function(d){return new Date(now+d*DAY).toISOString()},T="11111111-2222-3333-4444-555555555555",V="99999999-8888-7777-6666-000000000001",n=0;
  var apps=[],sps=[],grants=[],sign=[],G="Microsoft Graph: ";
  function id(){n++;return "00000000-0000-4000-8000-"+String(100000000000+n)}
  function own(name,o){o=o||{};var appId=id(),sid=id();
    apps.push({appId:appId,name:name,created:iso(-(o.age||400)),audience:o.audience||"AzureADMyOrg",secrets:o.secrets||[],certs:o.certs||[],redirect:o.redirect||[],implicit:!!o.implicit,owners:o.owners===undefined?["anna.schmidt@contoso.com","ben.meyer@contoso.com"]:o.owners});
    sps.push({id:sid,appId:appId,name:name,type:"Application",ownerTenant:T,enabled:true,created:iso(-(o.age||400)),verified:false,sso:"",secrets:[],certs:[],appPerms:(o.perms||[]).map(function(p){return p.indexOf(":")>0?p:G+p}),roles:o.roles||[]});
    if(o.last!==null)sign.push({appId:appId,last:iso(-(o.last===undefined?1:o.last))});return sid}
  function ext(name,o){o=o||{};var appId=id(),sid=id();
    sps.push({id:sid,appId:appId,name:name,type:"Application",ownerTenant:o.ms?"f8cdef31-a31e-4b4a-93e4-5f571e91255a":V,enabled:true,created:iso(-(o.age||300)),verified:!!o.verified,sso:o.sso||"",secrets:o.secrets||[],certs:o.certs||[],appPerms:(o.perms||[]).map(function(p){return G+p}),roles:[]});
    (o.all||[]).length&&grants.push({client:sid,type:"AllPrincipals",principal:null,resource:"Microsoft Graph",scope:o.all.join(" ")});
    (o.users||[]).forEach(function(u,i){grants.push({client:sid,type:"Principal",principal:"user-"+name.length+"-"+i,resource:"Microsoft Graph",scope:u})});
    if(o.last!==null)sign.push({appId:appId,last:iso(-(o.last===undefined?2:o.last))});return sid}
  var S=function(name,start,end){return {name:name,start:iso(start),end:iso(end)}};
  own("HR onboarding automation",{perms:["User.ReadWrite.All","Group.ReadWrite.All","Mail.Send"],secrets:[S("prod",-300,65)]});
  own("Tenant admin script",{perms:["RoleManagement.ReadWrite.Directory","Application.ReadWrite.All"],secrets:[S("never-expires",-900,25000)],owners:[],last:140,age:900});
  own("Backup connector",{perms:["Mail.ReadWrite","Files.ReadWrite.All","Sites.FullControl.All"],certs:[S("backup-cert",-340,21)]});
  own("Intranet portal",{secrets:[S("web",-200,160)],redirect:["https://intranet.contoso.com/signin-oidc","http://intranet-test.contoso.com/signin-oidc","https://*.contoso.com/auth"],implicit:true});
  own("Scanner mail relay",{perms:["Mail.Send"],secrets:[S("old",-800,-70),S("current",-60,300)]});
  own("Reporting dashboard",{perms:["Reports.Read.All","User.Read.All"],secrets:[S("dash",-350,12)]});
  own("Customer portal",{audience:"AzureADMultipleOrgs",secrets:[S("portal",-100,265)],redirect:["https://portal.contoso.com/callback"]});
  own("Old migration tool",{perms:["Directory.ReadWrite.All","full_access_as_app"].map(function(p,i){return i?"Office 365 Exchange Online: "+p:p}),secrets:[S("mig",-1100,-400)],owners:[],last:null,age:1100});
  own("Teams room booking",{perms:["Calendars.ReadWrite","Place.Read.All"],secrets:[S("rooms",-90,640)],owners:["carla.kaya@contoso.com"]});
  own("Dev sandbox",{secrets:[S("test",-30,335)],redirect:["http://localhost:3000"],owners:[],last:200,age:500});
  for(var i=0;i<6;i++)own("Line-of-business app "+(i+1),{secrets:[S("s",-120,245)],perms:i%2?["User.Read.All"]:[]});
  ext("Salesforce",{verified:true,sso:"saml",certs:[S("SAML signing",-200,530)],all:["User.Read"]});
  ext("Zoom",{verified:true,all:["User.Read","Calendars.ReadWrite","OnlineMeetings.ReadWrite"]});
  ext("DocuSign",{verified:true,all:["User.Read","Files.ReadWrite.All","Mail.Send"]});
  ext("Backup vendor cloud",{verified:true,perms:["Mail.ReadWrite","Files.ReadWrite.All","Sites.FullControl.All","User.Read.All"]});
  ext("PDF Converter Pro",{users:["offline_access Mail.Read Files.Read.All","offline_access Mail.Read","offline_access Mail.Read Contacts.Read"],age:20,last:1});
  ext("Mail Insights Free",{users:["offline_access Mail.ReadWrite MailboxSettings.ReadWrite"],age:9,last:0});
  ext("Calendar helper",{verified:true,users:["Calendars.Read","Calendars.Read"],last:30});
  ext("Legacy CRM connector",{verified:false,perms:["AppRoleAssignment.ReadWrite.All","Directory.ReadWrite.All","Mail.Read"],last:260,age:1300});
  ext("Vendor monitoring agent",{verified:true,perms:["AuditLog.Read.All","Directory.Read.All"],secrets:[S("added-in-tenant",-12,353)],age:600});
  ext("Office 365 Exchange Online",{ms:true,secrets:[S("unknown",-5,725)],age:2000});
  for(i=0;i<9;i++)ext("SaaS tool "+(i+1),{verified:i%3!==0,all:["User.Read","openid","profile"],last:i*20});
  return JSON.stringify({exported:new Date(now).toISOString(),tenantId:T,apps:apps,sps:sps,grants:grants,signins:sign},null,1);
}

window.appAudit={parse:parse,analyse:analyse,sample:sample,script:SCRIPT,report:function(){return state.result?report():""}};
if(!$("aa-drop"))return;
var drop=$("aa-drop"),file=$("aa-file");
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files[0])readFile(e.dataTransfer.files[0])});
$("aa-sample").addEventListener("click",function(){load(sample(),"a made-up sample tenant")});
$("aa-sample-dl").addEventListener("click",function(){save("apps-sample.json",sample(),"application/json")});
var sc=$("aa-script");if(sc){sc.textContent=SCRIPT;sc.after(copyBtn("Copy script",SCRIPT))}
if(location.hash==="#sample")load(sample(),"a made-up sample tenant");
})();
