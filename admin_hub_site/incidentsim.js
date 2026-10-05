(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}

/* A scenario is a fixed sequence of beats. Every option costs minutes and earns 0-3 points.
   Options can set flags; later beats can show extra feed lines when a flag is set.
   dmg adds to the scenario's damage counter. */
var S={
 bec:{
  title:"Friday 16:40: the invoice",kicker:"Microsoft 365 · adversary-in-the-middle phishing · payment fraud",
  brief:"You are the only admin at a 60-person company. It is Friday afternoon. Finance has a payment run at 17:30.",
  start:[16,40],unit:"EUR at risk",dmg0:0,
  beats:[
   {feed:["16:40  Phone: Marta (accounts payable) says a 'shared invoice' link asked her to sign in at 15:55. She approved MFA. Then the page showed an error.",
          "16:41  Sign-in log: SUCCESS marta@  15:57  IP 185.x.x.x (NL)  Chrome/Windows  MFA: satisfied",
          "16:41  Sign-in log: SUCCESS marta@  15:58  same IP  app: Office 365 Exchange Online"],
    q:"She signed in on a phishing proxy. The attacker has had a session for 43 minutes. What do you do first?",
    o:[["Revoke her sessions, reset the password, and look at her registered MFA methods",10,3,"A stolen session cookie survives a password reset. Revoking sessions is what throws the attacker out. Checking MFA methods comes next because that is how they get back in.",{clean:1}],
       ["Reset her password and tell her to be more careful",5,1,"The password is changed, but the attacker never needed it again: they hold a session token that stays valid. They are still in the mailbox.",{stillIn:1}],
       ["Block the Dutch IP address in Conditional Access",10,0,"The attacker changes IP in seconds. The session token is still valid from anywhere else.",{stillIn:1}],
       ["Ask her to forward the mail so you can analyse it properly on Monday",0,0,"The mail is evidence, not the emergency. The attacker keeps working all weekend.",{stillIn:1,late:1}]]},
   {feed:["Authentication methods for marta@:","  Microsoft Authenticator  'Pixel 7'    registered 2024-03-11","  Microsoft Authenticator  'iPhone 13'  registered TODAY 16:02"],
    q:"Marta uses a Pixel. What about the iPhone?",
    o:[["Delete the iPhone method now and require her to re-register MFA",5,3,"That method was the attacker's way back in after any password reset. Deleting it closes the door.",{}],
       ["Call Marta back to ask whether she bought a new phone",10,2,"She did not, and you remove it. Correct result, ten minutes later than necessary: a method registered six minutes after a phishing sign-in needs no confirmation.",{}],
       ["Leave it. People change phones all the time",0,0,"The attacker can now pass MFA as Marta whenever they like, with or without her password.",{persist:1}]]},
   {feed:["Get-InboxRule -Mailbox marta@","  Name: '.'   Created: TODAY 16:05","  If subject or body contains: invoice, payment, IBAN, bank","  Move to folder: RSS Feeds   Mark as read: True"],
    ifFlag:{stillIn:"16:5x  Sign-in log: SUCCESS marta@  new IP (DE)  existing session token. The attacker is still active."},
    q:"A rule is hiding every message about payments from her.",
    o:[["Delete the rule, check mailbox forwarding, and search Sent Items since 15:57",15,3,"The rule tells you what they are after. Sent Items tells you what they have already done with it.",{sawSent:1}],
       ["Delete the rule",5,1,"Marta will see replies again, but you have not looked at what the attacker already sent in her name.",{}],
       ["Leave the rule in place to observe the attacker",0,0,"You are not a honeypot operator and this is a live finance mailbox. Every hidden reply is one the real Marta cannot react to.",{ruleStays:1}]]},
   {feed:["Sent Items, marta@, 16:11:","  To: accounts-payable@   Re: Invoice 1187 (Brandl Metallbau)","  'Please note our bank details have changed, see attached. Kindly use the new account for today's run.'","  Attachment: Brandl_bank_details.pdf      Amount of invoice 1187: EUR 48,200"],
    q:"A reply inside a real invoice thread, sent from Marta's real account, 49 minutes before the payment run.",
    dmg:48200,
    o:[["Phone the head of finance now: stop the run, and verify every bank-detail change by calling the supplier on a known number",10,3,"A phone call cannot be hidden by an inbox rule. The payment is stopped and the forged change is caught.",{saved:1}],
       ["Email the finance team a warning about the forged message",5,1,"It depends on someone reading it before 17:30 on a Friday. If the hiding rule or a second compromised mailbox is still in play, they may never see it.",{maybe:1}],
       ["Note it for the incident report and deal with it on Monday",0,0,"The run goes out at 17:30. Recalling a transfer after the weekend rarely works.",{}]]},
   {feed:["Message trace, subject 'Shared invoice INV-4471', 15:40-15:55:","  delivered to 14 internal recipients","URL click report:  3 users clicked  (marta@, jonas@, petra@)"],
    q:"Marta is not the only one who got the mail.",
    o:[["Purge the mail from all 14 mailboxes, revoke sessions and reset passwords for all three who clicked, and check their sign-ins and rules",20,3,"A click is not a compromise, but you cannot tell from the click report who typed a password. Treat all three alike.",{scoped:1}],
       ["Send everyone a warning not to click the link",10,1,"Useful for the eleven who had not clicked. It does nothing for the two other accounts that may already be in the attacker's hands.",{}],
       ["Marta is the only one who called, so she is the only case",0,0,"Jonas entered his password too. His mailbox is used for the next round of phishing on Monday morning.",{second:1}]]},
   {feed:["17:25  Marta's laptop: EDR shows nothing unusual. The phishing page ran in the browser only.","17:26  The audit log is retained for a limited time, depending on your licence."],
    q:"The accounts are secured. What about the record of what happened?",
    o:[["Export sign-in and audit logs for the affected accounts, write down the timeline, and bring in the data protection officer to assess the 72-hour notification duty",20,3,"A mailbox with payment data and personal data was read by a third party. Whether that must be reported is a legal assessment with a deadline, and it needs the evidence you are saving now.",{}],
       ["Nothing more. It is contained and it is Friday evening",0,1,"Probably fine technically. But if this is a reportable breach the clock started when you found out, and next month you will not be able to reconstruct what the attacker read.",{}],
       ["Wipe and reinstall Marta's laptop to be safe",60,0,"The device was never compromised: the attack happened on a web page. You spent an hour, destroyed potential evidence, and Marta cannot work on Monday.",{}]]},
   {feed:["Monday. The question from management: how do we make sure this does not happen again?"],
    q:"You get to push one measure first. Which?",
    o:[["Phishing-resistant sign-in (passkeys or FIDO2), or Conditional Access that requires a compliant device",0,3,"Either one breaks this attack at the first step: a passkey will not sign in to a proxy domain, and a token issued to an unmanaged device is refused.",{}],
       ["Another round of phishing awareness training",0,1,"Worth doing, and Marta did report it. But she was trained before and the page was a perfect copy. Training lowers the click rate; it does not reach zero.",{}],
       ["Longer passwords with more complexity",0,0,"The password was not guessed. It was typed into the attacker's page, and it would have been just as stolen at 40 characters.",{}]]}
  ],
  outcome:function(f,d){
    var lost=f.saved?0:(f.maybe&&!f.ruleStays&&!f.stillIn?0:48200),lines=[];
    lines.push(lost?"EUR 48,200 went to the attacker's account in the 17:30 run.":"The payment run was stopped. No money left the company.");
    if(f.persist)lines.push("The attacker kept a registered MFA method and signed in again on Saturday.");
    if(f.second)lines.push("A second mailbox stayed compromised and was used for internal phishing on Monday.");
    if(f.late)lines.push("The attacker had the whole weekend in Marta's mailbox.");
    return {dmg:lost,lines:lines};
  },
  links:[["aitm-phishing-explained.html","AiTM phishing explained"],["compromised-account-response-checklist.html","compromised account checklist"],["signin-analyzer.html","sign-in analyzer"],["attack-map.html","attack map"]]
 },
 ransom:{
  title:"Sunday 03:12: the backup job failed",kicker:"Active Directory · ransomware in progress",
  brief:"You are on call for a manufacturer with 200 staff, two file servers and one domain. Your phone wakes you.",
  start:[3,12],unit:"servers encrypted",dmg0:0,
  beats:[
   {feed:["03:12  EDR alert, FS01: vssadmin.exe delete shadows /all /quiet   user: CORP\\svc-backup",
          "03:12  EDR alert, FS01: wbadmin delete catalog -quiet",
          "02:58  Backup job 'FS01-nightly' failed: repository unreachable"],
    q:"Shadow copies are being deleted on a file server at three in the morning.",
    o:[["Isolate FS01 from the network through the EDR console",5,3,"Isolation stops the spread and the encryption of network shares, and keeps the machine running so memory and logs survive for the investigation.",{iso1:1}],
       ["Shut FS01 down",5,2,"It stops the damage on that server. You lose what was in memory, which may include the encryption key and the attacker's tools.",{iso1:1}],
       ["RDP into FS01 with your Domain Admin account to have a look",15,0,"You have just typed Domain Admin credentials into a machine the attacker controls, and given them fifteen more minutes.",{dmg:1,exposed:1}],
       ["It is one alert. Look at it at 08:00",0,0,"By 08:00 there is nothing left to look at.",{dmg:3,late:1}]]},
   {feed:["Account svc-backup:  member of Domain Admins   password last set: 2019","Logon events (4624) for svc-backup in the last hour:","  02:31  WS-ACCT-07 (workstation, accounting)   logon type 3","  02:44  FS01   02:46  FS02   02:51  BKP01"],
    q:"A five-year-old service account with Domain Admin rights, coming from an accounting workstation.",
    o:[["Disable svc-backup, and isolate WS-ACCT-07, FS02 and BKP01",10,3,"Disabling stops new logons at once. Isolating the machines it touched deals with the sessions that already exist.",{acct:1,iso2:1}],
       ["Reset the password of svc-backup",5,1,"New logons with the old password fail. Sessions and Kerberos tickets the attacker already holds keep working for hours.",{acct:1}],
       ["Force a password reset for all 200 users",60,0,"An hour of work on accounts the attacker is not using, while the one they are using stays enabled.",{dmg:1}]]},
   {feed:["03:3x  FS02: files are being renamed to *.locked at about 400 per second","03:3x  FS02: new file in every folder: RESTORE_FILES.txt"],
    alt:{flag:"iso2",feed:["03:3x  FS02: isolated in time. A few hundred files on one volume were renamed to *.locked before the connection dropped","03:3x  EDR: the same binary was just blocked on APP03 and SQL02"],q:"FS02 is contained, but the attacker is trying other servers."},
    q:"Encryption has started on the second file server.",
    o:[["Isolate every server svc-backup logged on to in the last 24 hours, and block SMB between the server segments",15,3,"You are cutting the paths the ransomware uses to reach more data, based on evidence of where the account has been.",{contained:1}],
       ["Disconnect the site from the internet and take the core switch down",10,2,"Blunt, and the business is offline, but it works: no command channel, no lateral movement. You will have a harder time investigating without a network.",{contained:1}],
       ["Start restoring FS01 from last night's backup",30,0,"You are restoring into an environment the attacker still controls. The restored data is encrypted again within the hour.",{dmg:1}]]},
   {feed:["BKP01: domain-joined, backup repository on a local volume, reachable with svc-backup","Offsite copy: weekly, to a NAS at the second site. Last successful: 6 days ago","The NAS uses a local account that is not in Active Directory"],
    q:"The backups decide whether this is a bad week or the end of the company.",
    o:[["Physically disconnect the NAS at the second site now, then check from a clean machine that last week's copy is readable",10,3,"The one copy the attacker's account cannot reach is your recovery. Protect it before anything else and verify it before you rely on it.",{backup:1}],
       ["Run a fresh full backup of everything that still works",60,0,"You are writing possibly encrypted data over your repository and giving the attacker an hour and a reason to look at BKP01.",{dmg:1}],
       ["The backup software reported success all week, so the backups are fine",0,0,"The repository on BKP01 was reachable with the compromised account. At 04:10 it is wiped. Nobody checked the offsite copy.",{}]]},
   {feed:["DC01 security log, 02:40:","  Event 4662: replication rights (DS-Replication-Get-Changes-All) used by CORP\\svc-backup from WS-ACCT-07","  Source is not a domain controller"],
    q:"That is DCSync. The attacker has copied every password hash in the domain, including krbtgt.",
    o:[["Treat the whole domain as compromised: plan to reset krbtgt twice, rotate every privileged credential, and rebuild domain controllers from known-good state",20,3,"With the krbtgt hash the attacker can forge tickets for any account for as long as that key is valid. Nothing short of this ends their access.",{domain:1}],
       ["Reset the passwords of all Domain Admins",10,1,"Necessary, and not sufficient. A golden ticket made from the old krbtgt hash still works after every admin password has changed.",{}],
       ["Stay focused on the file servers. That is where the damage is",0,0,"The file servers are the symptom. The attacker owns the directory and will be back the day you finish restoring.",{}]]},
   {feed:["06:00  Managing director on the phone: 'They want 1.2 million. The note says 72 hours. Production starts Monday 06:00. Do we pay?'"],
    q:"What do you tell her?",
    o:[["That this is not your decision or hers alone: activate the incident response plan, call the cyber insurer and their incident responders, legal counsel and the police, and report what you know about the backups",15,3,"Paying has legal, insurance and practical consequences nobody should weigh alone at 06:00. Your job is to give the people who decide accurate facts, starting with whether you can restore.",{plan:1}],
       ["Pay. It is the fastest way back to production",0,0,"Payment guarantees nothing: decryptors are slow and often fail, the data may be published anyway, and your insurer and lawyer have not been asked.",{}],
       ["Say nothing to staff or anyone outside until it is fixed",0,0,"Two hundred people arrive on Monday to machines that do not work, and any reporting deadline has passed without a decision.",{}]]},
   {feed:["Day 2. Incident responders are on site. The offsite copy has been verified.","Everyone wants their files back."],
    q:"In which order do you rebuild?",
    o:[["Identity first: clean domain controllers and new credentials. Then restore servers into an isolated network, scan them, and reconnect one by one",0,3,"Everything else trusts the directory. Restore into a domain the attacker still owns and you repeat this week next month.",{order:1}],
       ["File servers first, because users need their files to work",0,0,"Restored data on a domain the attacker still controls gets encrypted a second time.",{}],
       ["Try a decryptor tool for this ransomware family from a forum",0,0,"Unknown software from an anonymous source, run with admin rights on your remaining systems.",{}]]}
  ],
  outcome:function(f,d){
    // FS01 is always lost; each missed containment step lets it reach more servers
    var n=1+(f.iso1?0:1)+(f.iso2?0:1)+(f.contained?0:4)+(d||0)*2,lines=[];
    n=Math.min(n,14);
    lines.push(n+" of 14 servers "+(n===1?"was":"were")+" encrypted before the spread stopped.");
    lines.push(f.backup?"The offsite copy survived. Six days of data were lost and had to be re-entered.":"No usable backup survived. Recovery depended on the attacker.");
    lines.push(f.domain?"The domain was rebuilt with new keys. The attacker's access ended.":"The attacker kept working credentials for the domain.");
    if(f.exposed)lines.push("Your own Domain Admin credentials were captured on FS01.");
    return {dmg:n,lines:lines};
  },
  links:[["ransomware-backup-gap.html","war story: the backup gap"],["backup-disaster-recovery-checklist.html","backup checklist"],["incident-runbook.html","incident runbook"],["kerberos-explained.html","Kerberos explained"],["attack-map.html","attack map"]]
 },
 insider:{
  title:"Thursday 11:20: the resignation",kicker:"Microsoft 365 · insider data theft",
  brief:"You run IT for a 120-person sales and engineering company. A key account manager handed in his notice yesterday. He works four more weeks.",
  start:[11,20],unit:"exposure",dmg0:0,
  beats:[
   {feed:["11:20  Alert: unusual volume of file downloads   user: jonas.berger@   3,412 files in 40 minutes",
          "11:20  Source: SharePoint site 'Sales / Customers', through the OneDrive sync client on LT-2231",
          "11:22  Mail from HR, marked confidential: Jonas Berger resigned yesterday. He is said to be joining a competitor."],
    q:"A leaver is pulling the whole customer folder onto his laptop. He is still an employee with a valid reason to open those files.",
    o:[["Tell HR and your manager what you see, ask who decides what happens next, and save the audit log entries now",10,3,"This is an employment matter with a technical trail. Your job is to make the facts visible and keep them safe. What is done to the employee is for HR and management to decide, and they need to hear it from you before anyone acts.",{chain:1}],
       ["Disable his account immediately",5,1,"It stops the download, and it is an employment decision you took alone, about someone who is still entitled to work. It also tells him he has been noticed, before anyone has secured his laptop.",{tipped:1}],
       ["Call Jonas and ask him what he is doing",5,0,"He says he is tidying up for the handover. He now knows the downloads are watched, and he has the rest of the day with the laptop.",{tipped:1}],
       ["Syncing a team site is normal for sales. Close the alert",0,0,"It is normal on any other day. On the day after a resignation to a competitor it is the clearest signal you will get.",{late:1,dmg:2}]]},
   {feed:["11:40  Call with HR and the managing director.","Managing director: \"Find out what he took. Go through his mailbox if you have to. You are the admin, you can see everything.\""],
    q:"You can technically open his mailbox. Should you, on a spoken instruction?",
    o:[["Ask for a written instruction with a defined scope, bring in the data protection officer or legal counsel, and start with the audit logs and business data rather than reading mail",10,3,"Being able to and being allowed to are different things. A documented purpose, a limited scope and a second person are what make the findings usable later, and what protect you personally. Audit logs already answer most of the question without reading anyone's messages.",{authorized:1}],
       ["Open the mailbox now and read through the last month",20,0,"His mailbox also holds private messages, and in many countries employee representatives or the data protection officer have a say. Evidence gathered this way can be thrown out, and the person who gathered it is you.",{unauth:1}],
       ["Refuse to look at anything without a court order",0,1,"Too far the other way. An employer may investigate a concrete suspicion in a proportionate, documented way. Refusing outright only delays the things that are clearly allowed, such as reviewing audit logs.",{}]]},
   {feed:["Audit log for jonas.berger@, last 30 days:",
          "  3 weeks ago  Inbox rule 'archive': forward mail containing 'offer' or 'contract' to j.berger.privat@ (external)",
          "  today 10:40  Anonymous sharing links created: 'Pricing 2026.xlsx', 'Customer master.xlsx'",
          "  today 10:48  LT-2231: USB storage connected, 1.9 GB written",
          "  today 11:00  3,412 files synced to LT-2231"],
    ifFlag:{tipped:"  today 11:35  LT-2231: a disk clean-up tool was installed and started"},
    q:"Three channels are open: forwarding, public links and a USB stick. What do you close, and how?",
    o:[["Remove the forwarding rule, revoke the anonymous links, block USB storage on his device and external sharing for his account. Leave the account itself working until HR decides",15,3,"You close the leaks you can still close and change nothing about his employment. What is already on the USB stick is out of your reach and becomes a matter for legal counsel.",{stopped:1}],
       ["Delete the synced files from his OneDrive and laptop",10,0,"He has copies on the stick. What you deleted is the evidence of what he took, with its timestamps.",{evidenceLost:1}],
       ["Reset his password so he cannot sign in",5,1,"His phone and laptop stay signed in for a while, the links stay public and the rule keeps forwarding. And he calls the help desk within ten minutes.",{tipped:1}]]},
   {feed:["12:10  HR: \"We will talk to him this afternoon. Legal asks whether we can prove any of this in three months.\""],
    q:"How do you make sure the evidence still exists and still counts?",
    o:[["Put his mailbox and OneDrive on hold, export the relevant audit records, and write down who did what and when",15,3,"A hold keeps content even if he or anyone else deletes it. Audit records age out, so export them now. Your own notes with times are what lets someone else rely on the material later.",{hold:1}],
       ["Take screenshots of the alerts and the audit search",5,1,"Better than nothing, but a screenshot proves little on its own, and the underlying records disappear when their retention ends.",{}],
       ["Copy his entire OneDrive and mailbox to your own computer for safekeeping",30,0,"Now the customer list and his private files sit on a second laptop, yours, with no record of who touched them. You have added a leak and weakened the evidence.",{evidenceLost:1}]]},
   {feed:["13:30  HR has decided: Jonas is released from his duties today. The conversation starts at 14:00 in the meeting room. His manager will be present.","HR: \"What does IT do, and when?\""],
    q:"Timing matters here more than tooling.",
    o:[["When the meeting starts: block sign-in and revoke his sessions. The laptop and company phone are collected in the room. Nothing is deleted. Mailbox access for his manager only as HR instructs",10,3,"Access ends at the moment he learns about it, not before and not hours after. The devices are evidence and go into a locked cabinet as they are. The account stays, blocked, because it carries the hold.",{offboard:1}],
       ["Block the account tomorrow morning, to be decent about it",0,0,"He has an evening with full access to mail and files, knowing he is out. Being decent is how HR conducts the conversation. It is not a reason to leave the doors open.",{dmg:2}],
       ["Wipe his laptop remotely at 14:00 so the data is gone",5,0,"The laptop is the best evidence there is: what was copied to the stick, when, and which sites he uploaded to. You have just erased it.",{evidenceLost:1}],
       ["Delete his account right after the meeting",5,0,"Deleting the account starts the clock on his mailbox and OneDrive, removes the licence that keeps them, and makes later questions much harder to answer. Block, do not delete.",{evidenceLost:1}]]},
   {feed:["14:20  Laptop and company phone are handed over.","Jonas also has Outlook and OneDrive on his private iPhone. An app protection policy applies to those apps. The phone itself is not enrolled.","About the USB stick he says: \"Family photos.\""],
    q:"Company mail and files are cached on a phone that belongs to him.",
    o:[["Run a selective wipe of the company apps through the app protection policy. Leave the rest of the phone alone and record that you did it",5,3,"Exactly what app protection is for: company data goes, his photos stay. The USB stick is not yours to demand or search. That goes through legal counsel.",{phone:1}],
       ["Factory-reset his private phone",5,0,"You cannot do it without enrolment, and trying to pressure him into it would destroy his private data and put the company in the wrong.",{overreach:1}],
       ["Nothing. His account is blocked, so the apps are useless",0,1,"Mail and files that were already synced stay readable offline until the apps next check in, which he can prevent by keeping the phone in flight mode.",{}]]},
   {feed:["Two weeks later. The company's lawyer has written to Jonas and to his new employer.","Management: \"What do we change so we notice this earlier next time?\""],
    q:"Which change does the most?",
    o:[["A leaver routine that starts on the day of the resignation: HR informs IT, alerts for mass downloads, new forwarding and public links are watched for that person, external auto-forwarding is blocked for everyone, and access is reviewed before the last day",0,3,"The forwarding rule ran for three weeks before anyone looked. Most of this is configuration you already own. What was missing was the trigger from HR and someone looking at the right person at the right time.",{}],
       ["Block USB storage and OneDrive sync for the whole company",0,1,"USB control is sensible. Taking sync away from everyone pushes people to send files to private mail instead, which you see even less of. And it would not have stopped the forwarding rule.",{}],
       ["Have everyone sign a stricter confidentiality agreement",0,1,"Useful for the lawyer afterwards. It detects nothing and stops nobody who has already decided to leave.",{}],
       ["Review all employees' mailboxes at random from now on",0,0,"Monitoring everyone without suspicion is unlawful in many places and poisons the workplace everywhere. Targeted, documented checks on a concrete suspicion are the opposite of this.",{}]]}
  ],
  outcome:function(f,d){
    var lines=[];
    lines.push("The customer folder was already on the USB stick before the first alert. That copy could not be taken back by technical means.");
    lines.push(f.stopped?"The forwarding rule and the public links were closed within the hour.":"The forwarding rule and the public links stayed open. Offers and contracts kept reaching a private mailbox.");
    if(f.late)lines.push("The first alert was closed. The trail was only picked up when HR asked.");
    if(f.tipped)lines.push("Jonas noticed he was being watched and cleaned up the laptop before it was collected.");
    if(f.unauth)lines.push("His mailbox was read without a documented basis. That became the main subject of the dispute, and the company's position was weaker for it.");
    if(f.evidenceLost)lines.push("Evidence was destroyed or contaminated by IT's own actions.");
    lines.push(f.hold&&f.authorized&&!f.evidenceLost&&!f.tipped?"The evidence held. Jonas signed an undertaking, returned the stick, and the new employer confirmed it would not use the data.":"The evidence was incomplete or open to challenge. The company could not show what was taken and settled for a warning letter.");
    if(!f.offboard)lines.push("His access did not end when he was released from his duties.");
    if(f.overreach)lines.push("The attempt to wipe his private phone led to a complaint.");
    return {dmg:(f.stopped?0:1)+(d||0),lines:lines};
  },
  links:[["onboarding-offboarding-checklist.html","offboarding checklist"],["mail-flow-cheat-sheet.html?q=forward","find forwarding"],["purview-compliance-cheat-sheet.html","Purview cheat sheet"],["kql-cheat-sheet.html","KQL cheat sheet"],["compromised-account-response-checklist.html","account response checklist"]]
 }
};

/* ---------- engine ---------- */
var st=null;
function clock(){var m=st.sc.start[0]*60+st.sc.start[1]+st.min,d=Math.floor(m/1440);m%=1440;return (d?"+"+d+"d ":"")+String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
function max(sc){return sc.beats.length*3}
function begin(id){
  var sc=S[id];st={id:id,sc:sc,i:0,min:0,pts:0,flags:{},dmg:0,log:[]};
  $("is-pick").hidden=true;$("is-end").hidden=true;$("is-play").hidden=false;
  $("is-title").textContent=sc.title;$("is-feed").replaceChildren();
  line(sc.brief,"sys");
  beat();
  $("is-play").scrollIntoView({behavior:"smooth",block:"start"});
}
function line(text,cls){
  var p=el("p",cls||"",text),f=$("is-feed");f.append(p);f.scrollTop=f.scrollHeight;return p;
}
function hud(){
  $("is-clock").textContent=clock();
  $("is-step").textContent=(st.i+1)+" / "+st.sc.beats.length;
  $("is-elapsed").textContent=st.min+" min";
}
function beat(){
  var b=st.sc.beats[st.i];hud();
  line("--- "+clock()+" ---","sep");
  var useAlt=b.alt&&st.flags[b.alt.flag];
  (useAlt?b.alt.feed:b.feed).forEach(function(t){line(t)});
  if(b.ifFlag)Object.keys(b.ifFlag).forEach(function(k){if(st.flags[k])line(b.ifFlag[k],"warn")});
  var box=$("is-choices");box.replaceChildren();
  $("is-q").textContent=useAlt?b.alt.q:b.q;$("is-fb").hidden=true;
  // options are shown in a stable shuffled order so the best one is not always first
  var order=b.o.map(function(_,i){return i}),seed=st.id.length*7+st.i*13;
  order.sort(function(x,y){return ((x*31+seed)%7)-((y*31+seed)%7)||x-y});
  order.forEach(function(idx){
    var o=b.o[idx],btn=el("button","choice");btn.type="button";
    btn.append(el("span",null,o[0]),el("small",null,o[1]?"takes about "+o[1]+" min":"no time cost"));
    btn.addEventListener("click",function(){choose(idx)});
    box.append(btn);
  });
  var first=box.querySelector("button");if(first&&st.i>0)first.focus({preventScroll:true});
}
function choose(idx){
  var b=st.sc.beats[st.i],o=b.o[idx];
  st.min+=o[1];st.pts+=o[2];
  Object.keys(o[4]||{}).forEach(function(k){if(k==="dmg")st.dmg+=o[4][k];else st.flags[k]=1});
  var best=b.o.filter(function(x){return x[2]===3})[0];
  st.log.push({q:(b.alt&&st.flags[b.alt.flag])?b.alt.q:b.q,pick:o[0],pts:o[2],why:o[3],best:best[0]});
  line("> "+o[0],"you");
  [].forEach.call($("is-choices").children,function(c){c.disabled=true});
  var fb=$("is-fb");fb.replaceChildren();fb.className="isfb r"+o[2];
  fb.append(el("b",null,o[2]===3?"Good call.":o[2]===2?"Works, at a cost.":o[2]===1?"Not enough.":"That made it worse."),el("p",null,o[3]));
  var nx=el("button","btn solid",st.i+1<st.sc.beats.length?"Continue":"See how it ended");nx.type="button";
  nx.addEventListener("click",function(){st.i++;if(st.i<st.sc.beats.length)beat();else finish()});
  fb.append(nx);fb.hidden=false;hud();nx.focus({preventScroll:true});
  fb.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function finish(){
  var sc=st.sc,res=sc.outcome(st.flags,st.dmg),pct=Math.round(st.pts/max(sc)*100);
  $("is-play").hidden=true;
  var end=$("is-end");end.replaceChildren();
  var grade=pct>=85?["Contained","info"]:pct>=60?["Contained, with losses","med"]:pct>=35?["Lost ground","high"]:["Lost control","crit"];
  var v=el("div","verdict v-"+grade[1]);v.append(el("b",null,grade[0]),el("span",null,sc.title+" · "+pct+"% of the best possible response · "+st.min+" minutes spent"));end.append(v);
  var ul=el("ul","steps");res.lines.forEach(function(l){ul.append(el("li",null,l))});end.append(el("h2",null,"how it ended"),ul);
  end.append(el("h2",null,"debrief"));
  st.log.forEach(function(l,i){
    var d=el("details","finding f-"+(l.pts===3?"info":l.pts===2?"med":l.pts===1?"high":"crit"));if(l.pts<3)d.open=true;
    var s=el("summary");s.append(el("span","sevtag",l.pts===3?"best":l.pts===2?"ok":l.pts===1?"weak":"harmful"),el("b",null,(i+1)+". "+l.q));
    d.append(s,el("p",null,"You chose: "+l.pick+"."),el("p",null,l.why));
    if(l.pts<3)d.append(el("p","amnote","Better: "+l.best+"."));
    end.append(d);
  });
  var rel=el("p","rel");rel.append(document.createTextNode("Go deeper: "));sc.links.forEach(function(l){var a=el("a",null,l[1]);a.href=l[0];rel.append(a," ")});end.append(rel);
  var ctl=el("div","ctl");ctl.style.marginTop="20px";
  var again=el("button","btn","Play this one again");again.type="button";again.addEventListener("click",function(){begin(st.id)});
  var other=el("button","btn ghost","Choose another scenario");other.type="button";other.addEventListener("click",function(){end.hidden=true;$("is-pick").hidden=false;$("is-pick").scrollIntoView({behavior:"smooth"})});
  ctl.append(again,other);end.append(ctl);
  end.hidden=false;end.scrollIntoView({behavior:"smooth",block:"start"});
}
var pick=$("is-list");
Object.keys(S).forEach(function(id){
  var sc=S[id],b=el("button","fcard pickcard");b.type="button";
  b.append(el("span","kick",sc.kicker),el("h3",null,sc.title),el("p",null,sc.brief),el("span","go",sc.beats.length+" decisions, about 10 minutes →"));
  b.addEventListener("click",function(){begin(id)});pick.append(b);
});
window.incidentSim={scenarios:S,state:function(){return st}};
})();
