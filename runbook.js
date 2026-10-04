(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
var qbox=$("rb-questions"), typeSel=$("rb-type"), goBtn=$("rb-go");
var formBox=$("rb-form"), resultBox=$("rb-result"), titleEl=$("rb-title"), clBox=$("cl"), pg=$("pg");

// Each incident type: label, a short set of follow-up questions (id, label, options),
// and a build(answers) function returning [{s:"Section", i:[["step","detail"],...]}, ...]
var TYPES={

"phish-click": {
  title: "Phishing click / malicious attachment response",
  questions: [
    {id:"creds", label:"Did they enter their password or MFA code on the page?", opts:[["yes","Yes"],["no","No"],["unsure","Not sure"]]},
    {id:"attach", label:"Did they open or run an attachment?", opts:[["yes","Yes"],["no","No"]]},
    {id:"m365", label:"Is this a Microsoft 365 / Entra ID environment?", opts:[["yes","Yes"],["no","No / other"]]}
  ],
  build: function(a){
    var s=[];
    var contain=[["Disconnect the device from the network", "Unplug ethernet or turn off Wi-Fi — don't shut it down, you may need it for forensics"]];
    if(a.attach==="yes") contain.push(["Do not run any further files on this device", "Including anything the attachment may have dropped"]);
    s.push({s:"Contain immediately", i:contain});

    if(a.creds==="yes"||a.creds==="unsure"){
      var cred=[["Reset the password for the affected account", "Use a strong, unique password"]];
      if(a.m365==="yes"){
        cred.push(["Revoke all active sessions and refresh tokens", "Entra admin center, or Revoke-MgUserSignInSession"]);
        cred.push(["Check and reset MFA / authentication methods", "Remove any method the user doesn't recognize"]);
      } else {
        cred.push(["Sign the account out of all sessions on every service it uses", ""]);
      }
      cred.push(["Assume any other account using the same password is also at risk", "Reset those too if the password was reused"]);
      s.push({s:"Credentials may be compromised", i:cred});
    }

    if(a.attach==="yes"){
      s.push({s:"Malware risk", i:[
        ["Run a full antivirus / EDR scan on the device", ""],
        ["Check for new scheduled tasks, startup items or services", ""],
        ["If you have EDR, check its timeline for what the file did", ""],
        ["If anything looks installed or persistent, treat this as a malware incident", "See the malware runbook for next steps"]
      ]});
    }

    var scope=[["Find out who else received the same email", "Search mail flow / message trace for the same sender or subject"]];
    if(a.m365==="yes") scope.push(["Check the user's sign-in log for logins from unfamiliar locations since the click", ""]);
    scope.push(["Ask the user exactly what they clicked, typed or downloaded", "Specifics matter — a password-only page is different from a fake MFA prompt"]);
    s.push({s:"Scope the incident", i:scope});

    s.push({s:"Clean up and notify", i:[
      ["Delete or quarantine the phishing email for all recipients who got it", ""],
      ["Block the sending domain / URL at your mail gateway or firewall", ""],
      ["Report the phishing page to Microsoft, Google Safe Browsing, or your browser vendor", "Helps get it blocklisted for everyone"],
      ["Tell the user what happened in plain terms, without blame", "They did the right thing by reporting it"],
      ["Note whether this needs to go in your incident log", ""]
    ]});

    s.push({s:"Prevent the next one", i:[
      ["Check whether MFA is enforced for this user and this app", ""],
      ["Consider this a prompt to re-run phishing awareness training", "The phish-or-legit game on this site is a quick refresher"],
      ["If the email passed your filters, check why — SPF/DKIM/DMARC, sender reputation", ""]
    ]});
    return s;
  }
},

"compromised": {
  title: "Compromised account response",
  questions: [
    {id:"admin", label:"Is this an administrator or privileged account?", opts:[["yes","Yes"],["no","No, standard user"]]},
    {id:"mail", label:"Has mail been sent from the account that the user didn't send?", opts:[["yes","Yes"],["no","Not that we've seen"]]},
    {id:"m365", label:"Is this Microsoft 365 / Entra ID?", opts:[["yes","Yes"],["no","No / other"]]}
  ],
  build: function(a){
    var s=[];
    s.push({s:"Confirm and scope", i:[
      ["Review the account's sign-in logs for unusual IPs, countries or devices", ""],
      ["Note the time of the first suspicious activity", "This defines your investigation window"],
      ["Check whether other accounts show the same pattern", "Same source IP, user agent, or timing can indicate a wider breach"]
    ]});

    var contain=[["Block sign-in for the account", "Temporarily, while you investigate"],
      ["Reset the password to a strong random value", ""]];
    if(a.m365==="yes") contain.push(["Revoke all sessions and refresh tokens", "Entra admin center or Revoke-MgUserSignInSession"]);
    else contain.push(["Sign the account out everywhere and invalidate active sessions/tokens", ""]);
    s.push({s:"Contain", i:contain});

    if(a.admin==="yes"){
      s.push({s:"Privileged account — extra steps", i:[
        ["Review every action the account took during the suspected window", "Role changes, new admin accounts, security setting changes"],
        ["Check for new or modified Conditional Access policies", "Attackers sometimes weaken policies to keep access"],
        ["Check for new app registrations, service principals or API permissions granted", ""],
        ["Rotate any shared secrets or credentials the admin had access to", "Service accounts, API keys, vault secrets"],
        ["Consider this a candidate for a wider compromise assessment", "Privileged accounts justify a lower bar for escalating"]
      ]});
    }

    var persist=[["Review registered authentication methods and remove unrecognized ones", ""],
      ["Check inbox rules, forwarding addresses and delegates", "A common persistence technique after a mailbox compromise"],
      ["Review app consents and OAuth grants for the account", "Remove suspicious enterprise app consents"],
      ["Check registered and joined devices", ""]];
    if(a.m365==="yes") persist.push(["Check for new mail flow rules or connectors at the tenant level", "Especially after an admin account was affected"]);
    s.push({s:"Remove persistence", i:persist});

    if(a.mail==="yes"){
      s.push({s:"Mail was sent from the account", i:[
        ["Run a message trace / mail log search for everything sent during the window", ""],
        ["Identify every external recipient who received attacker mail", ""],
        ["Send a follow-up warning to those recipients", "Short, factual, no blame on the affected user"],
        ["Check if the sent mail contained a phishing link or attachment of its own", "You may need to run the phishing runbook for recipients who engaged"]
      ]});
    }

    s.push({s:"Assess impact", i:[
      ["Search the audit log for mail and file activity during the window", "Items read, files downloaded, sharing links created"],
      ["List the data and systems the account could reach", "Mailbox, file storage, connected apps, any admin scope"],
      ["Decide whether this meets your threshold for a reportable data breach", "GDPR: the supervisory authority must generally be notified within 72 hours if personal data was likely exposed"]
    ]});

    s.push({s:"Recover and close out", i:[
      ["Restore access with a temporary access method and fresh MFA enrollment", ""],
      ["Tell the user what happened and what to watch for", ""],
      ["Inform management and your security contact", ""],
      ["Document the full timeline and every action taken", ""],
      ["Close the gap that allowed it", "Missing MFA, legacy auth, reused password, etc."]
    ]});
    return s;
  }
},

"ransomware": {
  title: "Ransomware response",
  questions: [
    {id:"spread", label:"Is it still spreading, or contained to one device so far?", opts:[["spreading","Still spreading / multiple devices"],["one","One device so far"]]},
    {id:"backup", label:"Do you have backups you believe are clean?", opts:[["yes","Yes"],["unsure","Not sure"],["no","No / backups also affected"]]}
  ],
  build: function(a){
    var s=[];
    var contain=[["Disconnect affected devices from the network immediately", "Pull the cable or disable Wi-Fi — don't power off, you may lose volatile evidence"],
      ["Do not pay, negotiate, or interact with the ransom note yet", "That's a business and legal decision, not a first step"]];
    if(a.spread==="spreading"){
      contain.unshift(["Isolate the network segment or disconnect core switches if needed", "Stopping the spread outweighs short-term disruption"]);
      contain.push(["Disable or restrict domain admin and other privileged accounts", "Ransomware often rides privileged credentials to spread"]);
    }
    s.push({s:"Stop the spread", i:contain});

    s.push({s:"Preserve evidence before you touch anything else", i:[
      ["Photograph the ransom note and any on-screen message", ""],
      ["Note which systems are affected and when symptoms were first seen", ""],
      ["Avoid reinstalling or wiping affected systems yet", "You may need them for investigation and insurance"],
      ["If you have the budget or insurance requires it, bring in incident response specialists now", ""]
    ]});

    s.push({s:"Identify the scope", i:[
      ["List every affected device and server", ""],
      ["Check backup systems and file shares for signs of encryption", "Attackers often target backups specifically"],
      ["Check for data exfiltration, not just encryption", "Many ransomware groups steal data before encrypting — assume this until ruled out"],
      ["Identify the entry point if possible", "Phishing, exposed RDP, a vulnerable VPN appliance, a compromised account"]
    ]});

    if(a.backup==="yes"){
      s.push({s:"Recovery from backup", i:[
        ["Verify backups are actually clean before restoring", "Restoring an already-compromised backup reintroduces the problem"],
        ["Rebuild affected systems from a known-clean state rather than just restoring files onto them", ""],
        ["Restore in an isolated environment first if possible, then reconnect gradually", ""],
        ["Change all credentials before reconnecting restored systems", "Assume credentials were exposed"]
      ]});
    } else {
      s.push({s:"No confirmed clean backup", i:[
        ["Check for shadow copies, file history, or immutable/offline backups you may have missed", ""],
        ["Check whether a free decryptor exists for this ransomware family", "No More Ransom project and similar resources track known decryptors"],
        ["Get legal and insurance advice before any decision on paying a ransom", "This is a business decision with legal implications, not an IT one"],
        ["Start planning this as a case for the backup & disaster recovery gap", "See the backup/DR checklist for what to fix afterward"]
      ]});
    }

    s.push({s:"Notify and document", i:[
      ["Inform management and your security/legal contact immediately", ""],
      ["Assess whether this is a reportable data breach", "GDPR: 72-hour notification window if personal data was likely exposed, including via exfiltration"],
      ["Keep a detailed timeline of detection, decisions and actions", "Needed for insurance, legal, and the post-incident review"],
      ["Consider notifying affected customers or partners if their data was involved", ""]
    ]});

    s.push({s:"After containment", i:[
      ["Patch or close the entry point before reconnecting anything", ""],
      ["Reset all credentials tenant-wide if the scope is unclear", ""],
      ["Run a full post-incident review", "What let it in, what let it spread, what would have stopped it earlier"],
      ["Test your backup restore process regularly — not just backup completion", "A backup you've never restored from is not a verified backup"]
    ]});
    return s;
  }
},

"lost-device": {
  title: "Lost or stolen device response",
  questions: [
    {id:"encrypted", label:"Was the device's disk encrypted (BitLocker / FileVault)?", opts:[["yes","Yes"],["no","No"],["unsure","Not sure"]]},
    {id:"loggedin", label:"Was the device logged in / unlocked when it was lost?", opts:[["yes","Yes, or likely"],["no","No, it was locked"],["unsure","Not sure"]]}
  ],
  build: function(a){
    var s=[];
    s.push({s:"Act immediately", i:[
      ["Remotely lock the device if you have MDM/Find My device capability", ""],
      ["Revoke the device's sessions and sign it out of all accounts remotely", "Entra: mark device as lost/wipe; equivalent in your MDM"],
      ["Reset the password for any account that was actively signed in on the device", ""],
      ["Revoke saved credentials and tokens the device had", "Browser-saved passwords, app refresh tokens, VPN certificates"]
    ]});

    if(a.loggedin==="yes"||a.loggedin==="unsure"){
      s.push({s:"Device was unlocked or may have been", i:[
        ["Treat any account the user was logged into as potentially exposed", ""],
        ["Check sign-in logs for activity on those accounts since the device went missing", ""],
        ["Revoke MFA methods tied to this device", "Authenticator app, SMS to a lost phone, etc."],
        ["If this was a phone used for MFA push approvals, assume MFA fatigue risk until resolved", ""]
      ]});
    }

    if(a.encrypted==="no"||a.encrypted==="unsure"){
      s.push({s:"Encryption unclear or absent", i:[
        ["Treat any data on the device as potentially exposed", "Without disk encryption, data can be read by removing the drive"],
        ["Inventory what was stored locally on the device", "Cached email, documents, saved files, browser profile"],
        ["This likely needs to be assessed as a possible data breach", "See the data-leak runbook for the notification question"]
      ]});
    } else {
      s.push({s:"Device was encrypted", i:[
        ["Confirm the encryption key / recovery key wasn't also stored on or with the device", "E.g. written on a sticky note, or saved in an unencrypted file"],
        ["Risk of data exposure is lower, but device and account access steps still apply", ""]
      ]});
    }

    s.push({s:"Close out", i:[
      ["Remotely wipe the device once you're confident you don't need it for recovery", ""],
      ["Remove the device from your MDM/Entra device inventory once wiped", ""],
      ["File a police report if required for insurance or company policy", ""],
      ["Document what was on the device and what action was taken", ""],
      ["Issue a replacement with encryption and MDM enrolled from day one", ""]
    ]});
    return s;
  }
},

"data-leak": {
  title: "Data exposure / accidental leak response",
  questions: [
    {id:"personal", label:"Did it involve personal data (customers, employees, etc.)?", opts:[["yes","Yes"],["no","No, internal/business data only"],["unsure","Not sure"]]},
    {id:"scope", label:"Roughly how far did it go?", opts:[["onerecipient","One wrong recipient"],["group","A group or mailing list"],["public","Publicly accessible (public link, misconfigured storage, etc.)"]]}
  ],
  build: function(a){
    var s=[];
    var contain=[["Identify exactly what was exposed and to whom", "Specific files, fields, or data types — be precise, not general"]];
    if(a.scope==="public") contain.unshift(["Take the public link or exposed resource down or restrict it immediately", "Stopping ongoing exposure comes before anything else"]);
    if(a.scope==="onerecipient"||a.scope==="group") contain.push(["If sent by email, attempt to recall the message", "Recall often fails once opened — don't rely on it alone"]);
    s.push({s:"Contain", i:contain});

    s.push({s:"Scope it precisely", i:[
      ["List every person or system that could have accessed the data", "Don't guess — check access logs, send logs, or sharing settings"],
      ["Determine the time window the data was exposed", "From when it was shared/published to when it was contained"],
      ["Check whether the data was actually viewed, downloaded, or just technically accessible", "Share link access logs, file activity logs if available"]
    ]});

    if(a.scope==="onerecipient"){
      s.push({s:"Wrong recipient", i:[
        ["Contact the recipient directly and ask them to delete it without opening or forwarding further", ""],
        ["Get written confirmation of deletion if the data is sensitive", ""],
        ["Don't assume good faith is enough for highly sensitive data — treat it as exposed until confirmed deleted", ""]
      ]});
    }

    if(a.personal==="yes"||a.personal==="unsure"){
      s.push({s:"Personal data involved", i:[
        ["Assess this against your breach notification obligations now, don't wait", "GDPR: the supervisory authority generally must be notified within 72 hours of becoming aware, if there's likely risk to individuals"],
        ["Identify whether affected individuals need to be notified directly", "Required when there's a high risk to their rights and freedoms"],
        ["Loop in whoever handles data protection / your DPO if you have one", ""],
        ["Document your assessment even if you conclude notification isn't required", "Regulators expect to see that you assessed it, not just the outcome"]
      ]});
    }

    s.push({s:"Fix the cause", i:[
      ["Identify why it happened", "Wrong autocomplete recipient, misconfigured sharing default, no DLP rule, etc."],
      ["Put a control in place so the same mistake is harder to repeat", "DLP policy, external-recipient warning banners, sharing link defaults, naming conventions"],
      ["If it was a permissions or configuration error, audit similar resources for the same mistake", "One misconfigured share is rarely the only one"]
    ]});

    s.push({s:"Document and close out", i:[
      ["Write up what was exposed, to whom, for how long, and what was done", ""],
      ["Record your breach-notification decision and reasoning", ""],
      ["Brief the people involved on what to do differently next time, without blame", ""]
    ]});
    return s;
  }
},

"malware": {
  title: "Malware on a device — response",
  questions: [
    {id:"server", label:"Is this a server / critical infrastructure, or an end-user device?", opts:[["server","Server / critical system"],["user","End-user device"]]},
    {id:"spreading", label:"Any sign it has spread to other devices?", opts:[["yes","Yes or possibly"],["no","No, contained to one device"]]}
  ],
  build: function(a){
    var s=[];
    var contain=[["Disconnect the device from the network", "Pull the cable / disable Wi-Fi, don't power off if you may need forensics"]];
    if(a.spreading==="yes") contain.push(["Check other devices on the same network segment for the same indicators", ""]);
    if(a.server==="server") contain.push(["If this is a production server, assess whether to fail over to a standby or take the service down", "Weigh ongoing compromise risk against service disruption"]);
    s.push({s:"Contain", i:contain});

    s.push({s:"Identify what you're dealing with", i:[
      ["Run your EDR/antivirus and check what it detected and its confidence", ""],
      ["Check for known indicators: unusual processes, scheduled tasks, outbound connections", ""],
      ["Search the detected file hash or name against threat intel sources", "VirusTotal and similar can quickly tell you if this is known and what family it is"],
      ["Determine the likely entry point", "Phishing attachment, drive-by download, exposed service, compromised credentials"]
    ]});

    s.push({s:"Assess impact", i:[
      ["Check what the device had access to", "Network shares, saved credentials, VPN, admin sessions"],
      ["Check for signs of data access or exfiltration, not just the malware itself", "Outbound connections, unusual data transfers"],
      ["Check whether any credentials used on this device need to be rotated", "Especially if a credential-stealer or keylogger is suspected"]
    ]});

    s.push({s:"Remediate", i:[
      ["Reimage the device rather than trying to fully clean it", "The safest assumption with malware is that you can't be certain everything is gone"],
      ["Restore data from a backup predating the infection, not from the infected device directly", ""],
      ["Rotate any credentials that were used on or accessible from the device", ""],
      ["Patch the vulnerability or close the gap that allowed entry before reconnecting", ""]
    ]});

    s.push({s:"Document and improve", i:[
      ["Record the timeline: detection, containment, remediation", ""],
      ["Update detection rules if this bypassed existing defenses", ""],
      ["If it arrived via phishing, consider running the phishing runbook for the originating email too", ""]
    ]});
    return s;
  }
}

};

function renderQuestions(){
  var t=TYPES[typeSel.value];
  qbox.replaceChildren();
  var grid=document.createElement("div"); grid.className="sim"; grid.style.marginTop="14px";
  t.questions.forEach(function(q){
    var label=document.createElement("label");
    label.textContent=q.label;
    var sel=document.createElement("select"); sel.className="sel"; sel.id="rb-q-"+q.id;
    q.opts.forEach(function(o){
      var opt=document.createElement("option"); opt.value=o[0]; opt.textContent=o[1];
      sel.append(opt);
    });
    label.append(sel);
    grid.append(label);
  });
  qbox.append(grid);
}

function buildRunbook(){
  var t=TYPES[typeSel.value];
  var answers={};
  t.questions.forEach(function(q){ answers[q.id]=$("rb-q-"+q.id).value; });
  var sections=t.build(answers);

  titleEl.textContent=t.title;
  clBox.replaceChildren();
  var n=0,d=0;
  function upd(){ pg.textContent=d+" of "+n+" done"; }

  sections.forEach(function(sec){
    var h=document.createElement("h2"); h.textContent=sec.s; clBox.append(h);
    sec.i.forEach(function(it){
      n++;
      var l=document.createElement("label"); l.className="chk";
      var c=document.createElement("input"); c.type="checkbox";
      c.addEventListener("change", function(){ d+=c.checked?1:-1; upd(); });
      var span=document.createElement("span"), b=document.createElement("b");
      b.textContent=it[0]; span.append(b);
      if(it[1]){ var sm=document.createElement("small"); sm.textContent=it[1]; span.append(sm); }
      l.append(c,span); clBox.append(l);
    });
  });
  upd();

  formBox.style.display="none";
  resultBox.style.display="block";
  resultBox.scrollIntoView({behavior:"smooth", block:"start"});

  $("rs").onclick=function(){
    clBox.querySelectorAll("input").forEach(function(c){c.checked=false});
    d=0; upd();
  };
  $("pr").onclick=function(){ window.print(); };
  $("rb-restart").onclick=function(){
    resultBox.style.display="none";
    formBox.style.display="block";
    formBox.scrollIntoView({behavior:"smooth", block:"start"});
  };
}

typeSel.addEventListener("change", renderQuestions);
goBtn.addEventListener("click", buildRunbook);
renderQuestions();
})();
