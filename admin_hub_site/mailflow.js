(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}

/* ================= knowledge base =================
   who: S sending side, R receiving side, U the person who wrote the mail, W wait, E either side
   codes: exact enhanced status codes, cre: regex on a code, re: regex on the text, need: text must match
   s: steps if your organisation sent the mail, r: steps if your organisation should have received it */
var WHO={S:"the sending side has to fix this",R:"the receiving side has to fix this",U:"the person who wrote the mail can fix this",W:"temporary, the sending server retries by itself",E:"either side can be the cause",F:"a verdict of the receiving mail filter"};
var RULES=[
{id:"imceaex",t:"Outlook used an outdated cached address",who:"U",re:/IMCEAEX|\/o=ExchangeLabs|\/o=[^\s]*\/ou=/i,need:1,w:8,
 what:"The message was addressed to an internal Exchange address (X500 / LegacyExchangeDN) that no longer exists. This happens after a mailbox was migrated, recreated or converted, when Outlook still offers the old entry from its autocomplete list.",
 s:["Ask the sender to delete the suggestion in Outlook (start typing the name, then press Delete on the entry) and pick the recipient from the address book.","If many people are affected, add the old address as an X500 proxy address to the recipient so old entries keep working."],
 r:[],
 cmd:"Set-Mailbox {rcpt} -EmailAddresses @{add='X500:PASTE-THE-OLD-ADDRESS-FROM-THE-BOUNCE'}",
 tell:"Outlook remembered an old address for this person. Please start typing the name, remove the suggestion with the Delete key, choose the contact from the address book and send again."},

{id:"dbeb",t:"The recipient is not known to Exchange Online",who:"R",codes:["5.4.1"],re:/Recipient address rejected:\s*Access denied/i,need:1,w:3,
 what:"Directory-based edge blocking rejected the mail at the border because no object with this address exists in the recipient's tenant. Either the address is wrong, or the mailbox lives somewhere else (on-premises, another system) and the tenant does not know it.",
 s:["Check the address for a typo and confirm it with the recipient through another channel.","Nothing else can be fixed on the sending side."],
 r:["Check whether the address exists as a mailbox, alias, group or mail contact.","If the recipients of this domain live in another system, sync them to Entra ID or set the accepted domain to Internal relay. Internal relay switches the edge block off for that domain.","Mail-enabled public folders need to be synced as well, or they are rejected the same way."],
 cmd:"Get-Recipient -Filter \"EmailAddresses -eq 'smtp:{rcpt}'\"\nGet-AcceptedDomain | Select-Object DomainName, DomainType",
 tell:"The receiving mail system does not know this address. Please check the spelling with the recipient. If it is correct, their IT has to fix it on their side."},

{id:"notfound",t:"The recipient address does not exist",who:"U",codes:["5.1.1","5.1.10","5.1.2","5.1.3","5.1.6"],re:/user unknown|unknown user|no such (user|recipient|mailbox|address)|does(n't| not) exist|recipient.{0,30}not found|mailbox not found|invalid (recipient|mailbox|address)|recipient address rejected|couldn't be found|RecipientNotFound|RecipNotFound|bad destination mailbox/i,
 what:"The receiving system has no mailbox, alias or group with this address. Most of the time it is a typo, an address of someone who has left, or an old autocomplete entry.",
 s:["Check the address character by character, especially the domain.","Confirm the current address with the recipient by phone or chat.","If the address was right last week, the mailbox was probably removed. Only the receiving side can say."],
 r:["Check whether the address exists and whether an alias was removed recently.","In a hybrid setup, check that the object has synced and that the accepted domain type matches where the mailbox lives.","For a leaver, decide whether to add the address as an alias to a successor or a shared mailbox."],
 cmd:"Get-Recipient -Filter \"EmailAddresses -eq 'smtp:{rcpt}'\" | Select-Object Name, RecipientTypeDetails, PrimarySmtpAddress\nGet-AcceptedDomain | Select-Object DomainName, DomainType",
 tell:"This address does not exist at the recipient's mail system. Please check the spelling or ask the recipient for their current address."},

{id:"dmarc",t:"The sending domain failed DMARC and its policy says reject",who:"S",codes:["5.7.509"],re:/does not pass DMARC|DMARC policy of reject|due to (the )?domain'?s DMARC policy|dmarc.{0,20}(fail|reject)/i,
 what:"The From domain publishes a DMARC policy of reject, and this message passed neither SPF nor DKIM in alignment with that domain. The receiver did exactly what the domain owner asked for. Typical causes: a newsletter or ticket system sends as your domain without being set up, or the mail was forwarded and lost its SPF pass.",
 s:["Find out which system really sent the mail (the mail server, a CRM, a scanner, a web shop).","Add that system to the SPF record of the From domain and, more importantly, let it sign with DKIM for your domain.","If the mail was auto-forwarded by someone else, DKIM is what survives forwarding. Make sure it is on.","Check the result with the domain check before you resend."],
 r:["If this is a mailing list or a forwarder you trust, configure it as a trusted ARC sealer instead of weakening the check.","Do not add a general exception for the domain. A DMARC reject is the one signal that says the sender is forged."],
 cmd:"Get-DkimSigningConfig | Select-Object Domain, Enabled, Status\nResolve-DnsName _dmarc.{sdom} -Type TXT\nResolve-DnsName {sdom} -Type TXT | Where-Object Strings -like 'v=spf1*'",
 tell:"The recipient's mail system rejected the message because it could not verify that it really comes from our domain. IT is checking the sending configuration. Please do not resend until you hear back.",
 links:[["domain check","domain-check.html{sdomhash}"]]},

{id:"gmailauth",t:"The receiver requires sender authentication and the mail had none",who:"S",codes:["5.7.26","5.7.27","5.7.30","5.7.515"],re:/sender is unauthenticated|requires all senders to authenticate|required authentication level|SPF .{0,60}did not pass|DKIM = did not pass|unauthenticated email/i,
 what:"Large providers such as Gmail, Yahoo and Outlook.com only accept mail that passes SPF or DKIM, and from bulk senders both plus a DMARC record. This message passed none of the required checks.",
 s:["Publish an SPF record that includes every system sending for the domain.","Turn on DKIM signing for the domain in each sending system.","Publish at least a DMARC record with p=none so the big providers accept bulk mail.","Run the domain check and send a test to a mailbox at that provider."],
 r:[],
 cmd:"Get-DkimSigningConfig | Select-Object Domain, Enabled, Status\nResolve-DnsName {sdom} -Type TXT | Where-Object Strings -like 'v=spf1*'\nResolve-DnsName _dmarc.{sdom} -Type TXT",
 tell:"The recipient's provider rejected the message because our domain's mail authentication is incomplete. IT is fixing the DNS records. The mail has to be sent again afterwards.",
 links:[["domain check","domain-check.html{sdomhash}"]]},

{id:"spf",t:"SPF check failed",who:"S",codes:["5.7.23"],re:/SPF (validation|check) failed|spf.{0,12}(hard)?fail|not (a )?permitted sender|does not designate|sender policy framework/i,
 what:"The server that delivered the mail is not listed in the SPF record of the sender's domain, and the receiver rejects on SPF failure.",
 s:["Find the IP address that delivered the mail (it is usually in the bounce) and the service behind it.","Add that service to the SPF record with its include, and stay under the limit of 10 DNS lookups.","If the mail was forwarded, SPF fails by design. DKIM signing is the fix."],
 r:["Rejecting on SPF alone breaks legitimate forwarding. Consider evaluating DMARC instead."],
 cmd:"Resolve-DnsName {sdom} -Type TXT | Where-Object Strings -like 'v=spf1*'",
 tell:"The recipient's mail system does not accept our mail from the system that sent it. IT is adding it to the allowed senders in DNS.",
 links:[["domain check","domain-check.html{sdomhash}"]]},

{id:"ptr",t:"The sending IP has no valid reverse DNS",who:"S",codes:["5.7.25"],re:/PTR record|reverse DNS|rDNS|cannot find your (hostname|reverse hostname)|does not have a PTR/i,need:1,
 what:"The receiving server looked up the name of the IP address that connected and found none, or the name does not point back to the same IP. Many servers refuse such connections.",
 s:["Ask whoever owns the IP address (the ISP or hosting provider) to set a PTR record that matches the server's HELO name.","Make sure the name in the PTR resolves back to the same IP.","If you send from a dial-up or dynamic range, relay through your provider or Microsoft 365 instead."],
 r:[],
 cmd:"Resolve-DnsName {ip} -Type PTR",
 tell:"The recipient's server refuses mail from our sending server because of a missing DNS entry. IT is having it corrected by the provider."},

{id:"exo-banned-ip",t:"The sending IP is on Microsoft's block list",who:"S",cre:/^5\.7\.6(0[6-9]|[1-4]\d)$/,re:/banned sending IP/i,
 what:"Microsoft 365 refuses mail from this IP address because it sent spam before. The bounce names the IP.",
 s:["Find out why the IP sent spam: an open relay, a compromised account or a hacked web form. Fix that first.","Request removal in Microsoft's delist portal at sender.office.com with the IP from the bounce.","If the IP belongs to a shared hosting provider, they have to request the removal."],
 r:[],
 tell:"Microsoft is currently blocking mail from our sending server. IT has requested removal. This usually takes up to a day."},

{id:"exo-banned-sender",t:"The sender is blocked by Microsoft",who:"S",codes:["5.7.511"],re:/banned sender/i,
 what:"Microsoft 365 blocks this sender or its IP address and the normal delist portal does not apply. The bounce text explains how to request removal.",
 s:["Follow the instruction in the bounce: forward the complete bounce message to delist@microsoft.com.","Check for a compromised account or system that caused the block."],
 r:[],
 tell:"Microsoft is blocking our mail at the moment. IT has asked for the block to be lifted."},

{id:"blocklist",t:"The sending server is on a block list",who:"S",re:/blocked using|block ?list|black ?list|spamhaus|spamcop|barracuda|sorbs|uceprotect|\bRBL\b|DNSBL|(poor|bad|low) reputation|listed (in|on|at|by)/i,need:1,w:2,
 what:"The receiving server checked the sending IP address against a public block list and found it. The list is named in the bounce. Block lists react to spam that was really sent from the address, or to the whole range of a provider.",
 s:["Take the IP address and the list name from the bounce and look the IP up on the list's website. It states the reason.","Stop the cause before asking for removal: a compromised mailbox, an infected PC behind the same public IP, a web form that is being abused.","Request delisting on the list's website. A second listing takes much longer to clear.","If you send through a shared service, tell the provider. Only they can clean up a shared IP."],
 r:["If the sender is important and the list is known for false positives, you can allow the sender in your own filter. Do not switch the list off for everyone."],
 tell:"The recipient's mail system is blocking our mail server at the moment. IT is having the block removed. Please use the phone for anything urgent."},

{id:"newtenant-ip",t:"Microsoft does not accept mail from this tenant's IP yet",who:"S",codes:["5.7.708"],re:/traffic not accepted from this IP/i,
 what:"The sending Microsoft 365 tenant was routed through a low-reputation outbound IP pool. This mainly hits new and trial tenants and tenants that recently sent suspicious volumes.",
 s:["Open a support request with Microsoft from the sending tenant and quote the code 5.7.708.","Check that no account in the tenant is sending bulk mail."],
 r:[],
 tell:"Microsoft is limiting outgoing mail from our tenant at the moment. IT has opened a case with Microsoft."},

{id:"tenant-threshold",t:"The sending tenant was blocked for sending spam",who:"S",cre:/^5\.7\.7(0[0-9]|[1-4]\d)$/,re:/tenant has exceeded threshold/i,
 what:"Too much of the mail leaving this Microsoft 365 tenant was classified as spam, so Microsoft stopped outgoing mail for the whole tenant. A compromised account sending bulk mail is the usual reason.",
 s:["Treat this as a security incident: find the accounts that sent the volume, reset their passwords and revoke their sessions.","Check for forwarding rules and unknown connectors.","Then contact Microsoft support to have the tenant released."],
 r:[],
 cmd:"Get-BlockedSenderAddress\nGet-MessageTraceV2 -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date) | Group-Object SenderAddress | Sort-Object Count -Descending | Select-Object -First 10 Count, Name",
 tell:"Outgoing mail from our organisation is blocked at the moment. IT is working on it with Microsoft.",
 links:[["compromised account checklist","compromised-account-response-checklist.html"]]},

{id:"unregistered-domain",t:"The tenant sent from a domain it does not own",who:"S",codes:["5.7.750"],re:/unregistered domain/i,
 what:"A Microsoft 365 tenant relayed too much mail from domains that are not registered as accepted domains in it. This usually comes from an on-premises server or application that relays through the tenant with foreign sender addresses.",
 s:["Add every domain you really send from as an accepted domain.","Find the system that relays with other sender domains and correct its From addresses.","Check the inbound connector from on-premises: it should only accept your own servers."],
 r:[],
 cmd:"Get-AcceptedDomain | Select-Object DomainName, DomainType\nGet-InboundConnector | Select-Object Name, ConnectorType, SenderIPAddresses, TlsSenderCertificateName",
 tell:"Our mail system rejected the message because of the sender address used. IT is correcting the configuration."},

{id:"restricted-user",t:"The sender's account is blocked from sending",who:"S",codes:["5.1.8"],re:/bad outbound sender/i,need:1,
 what:"Exchange Online restricted this account because it exceeded the sending limits or sent mail that was classified as spam. Very often the account is compromised.",
 s:["Assume compromise until shown otherwise: check the sign-ins, reset the password, revoke sessions, review inbox rules and forwarding.","Remove the account from the restricted entities list only after that.","If the user legitimately sends bulk mail, move that to a service made for it."],
 r:[],
 cmd:"Get-BlockedSenderAddress\nGet-InboxRule -Mailbox {sender} | Select-Object Name, Enabled, ForwardTo, RedirectTo, DeleteMessage\nRemove-BlockedSenderAddress -SenderAddress {sender}",
 tell:"Your mailbox was blocked from sending because of unusual activity. IT needs to check the account with you before it is released.",
 links:[["sign-in analyzer","signin-analyzer.html"],["compromised account checklist","compromised-account-response-checklist.html"]]},

{id:"ratelimit",t:"A sending limit was reached",who:"S",codes:["5.1.90","5.2.0","5.7.232","5.7.233"],re:/daily (message|sending) limit|message limit|recipient rate limit|external recipient rate limit|sending (rate|quota)|exceeded .{0,30}(quota|limit) for sending|submission quota/i,
 what:"The mailbox or the tenant sent to more recipients than allowed in the time window. In Exchange Online a mailbox may address 10,000 recipients per day. Sudden bulk sending from a normal user mailbox is also what a compromised account looks like.",
 s:["Check whether the user really sent that much. If not, treat the account as compromised.","Wait for the window to reset. Limits cannot be raised for a mailbox.","Move newsletters and application mail to a bulk mail service or High Volume Email."],
 r:[],
 cmd:"Get-MessageTraceV2 -SenderAddress {sender} -StartDate (Get-Date).AddDays(-1) -EndDate (Get-Date) | Measure-Object",
 tell:"Your mailbox reached the daily sending limit. It is released automatically within 24 hours. Please contact IT if you did not send a large number of mails yourself."},

{id:"rcpt-receive-limit",t:"The recipient is receiving too much mail right now",who:"W",codes:["5.2.121","5.2.122","4.2.1"],re:/receiv(e|ing) (mail )?(limit|at a rate|too (quickly|fast|many))|per-hour receive limit/i,
 what:"The recipient's mailbox hit its limit for incoming mail, either overall or from this one sender. The limit protects mailboxes from floods and resets within the hour.",
 s:["Wait an hour and send again.","If an application sends many mails to one mailbox, spread them over several mailboxes or slow it down."],
 r:["Find out what is flooding the mailbox. A sudden flood of subscription mails can be cover for fraud happening elsewhere."],
 tell:"The recipient's mailbox is temporarily not accepting more mail. Please try again in an hour."},

{id:"mailbox-full",t:"The recipient's mailbox is full",who:"R",codes:["5.2.2","4.2.2"],re:/mailbox (is )?full|over ?quota|quota exceeded|exceeded (storage|mailbox)|insufficient (system )?storage|out of storage/i,
 what:"The mailbox has reached its storage quota and accepts no new mail until space is freed.",
 s:["Tell the recipient through another channel. They do not see the mail that bounced.","Resend once they have made room."],
 r:["Free space: empty Deleted Items and the Recoverable Items folder if needed, or enable the archive mailbox.","Check whether a retention hold keeps the mailbox from shrinking.","Raise the quota only if the licence allows it."],
 cmd:"Get-MailboxStatistics {rcpt} | Select-Object TotalItemSize, TotalDeletedItemSize, ItemCount\nGet-Mailbox {rcpt} | Select-Object ProhibitSendReceiveQuota, ArchiveStatus\nEnable-Mailbox {rcpt} -Archive",
 tell:"The recipient's mailbox is full, so your mail could not be delivered. Please let them know by phone or chat and send it again once they have made room."},

{id:"size",t:"The message is too large",who:"U",codes:["5.2.3","5.3.4","4.3.4"],re:/message (is )?too (large|big)|size limit|exceeds .{0,40}size|message size|RecipSizeLimit|SendSizeLimit|max(imum)? (message )?size/i,
 what:"The message is bigger than the sending or the receiving system allows. Attachments grow by about a third in transit, so a 20 MB file needs roughly 27 MB of allowance. The Exchange Online default is 35 MB, many other systems accept less.",
 s:["Share the file as a link from OneDrive or SharePoint instead of attaching it.","If it has to be an attachment, compress it or split it over several mails."],
 r:["Check the receive limit of the mailbox if large mails from this sender are expected regularly."],
 cmd:"Get-Mailbox {rcpt} | Select-Object MaxSendSize, MaxReceiveSize",
 tell:"The mail was too large for the recipient's system. Please send the file as a sharing link instead of an attachment."},

{id:"fwd-blocked",t:"External auto-forwarding is blocked",who:"S",codes:["5.7.520"],re:/does not allow external forwarding/i,
 what:"A mailbox tried to forward mail automatically to an address outside the organisation, and the outbound spam policy does not allow that. The block is the default and a deliberate protection: attackers set up forwarding to keep reading a mailbox after the password was changed.",
 s:["Find out who set the forwarding and whether the user knows about it. An unknown forward is a sign of a compromised mailbox.","If it is legitimate, create a separate outbound spam policy that allows forwarding for just these users. Do not open it for everyone.","Consider a shared mailbox or a mail contact instead of forwarding to a private address."],
 r:[],
 cmd:"Get-Mailbox {sender} | Select-Object ForwardingSmtpAddress, ForwardingAddress, DeliverToMailboxAndForward\nGet-InboxRule -Mailbox {sender} | Select-Object Name, ForwardTo, ForwardAsAttachmentTo, RedirectTo\nGet-HostedOutboundSpamFilterPolicy | Select-Object Name, AutoForwardingMode",
 tell:"Automatic forwarding to external addresses is switched off in our organisation for security reasons. If you need it for work, please ask IT for an exception.",
 links:[["mail flow cheat sheet","mail-flow-cheat-sheet.html?q=forward"]]},

{id:"restricted-rcpt",t:"The recipient only accepts mail from certain senders",who:"R",codes:["5.7.12","5.7.124","5.7.129","5.7.13","5.7.133","5.7.134","5.7.135","5.7.136","5.7.193"],re:/allowed[- ]senders list|only accepts? (mail|messages) from|not authenticated .{0,40}(group|recipient|organization)|sender (was|is) not authenticated|restricted (group|recipient)|not allowed to send to this (group|recipient)|aren't allowed to send|RecipientRestricted|DeliveryRestriction/i,
 what:"The group, mailbox or public folder is configured to accept mail only from inside the organisation or from a specific list of senders, and this sender is not on it. New Microsoft 365 groups and distribution lists reject external senders by default.",
 s:["Ask the owner of the group or mailbox to allow you, or send to a person instead."],
 r:["For external senders: allow mail from outside on the group.","For internal senders: add them to the accepted senders or remove the restriction.","For a Teams channel address, check who is allowed to send to the channel in its settings."],
 cmd:"Get-DistributionGroup {rcpt} | Select-Object RequireSenderAuthenticationEnabled, AcceptMessagesOnlyFromSendersOrMembers\nSet-DistributionGroup {rcpt} -RequireSenderAuthenticationEnabled $false\nSet-UnifiedGroup {rcpt} -RequireSenderAuthenticationEnabled $false",
 tell:"This address only accepts mail from approved senders. Please ask the owner of the group to add you, or write to a person directly."},

{id:"connector-restrict",t:"A partner connector at the recipient rejected the sending server",who:"R",codes:["5.7.51"],re:/RestrictDomainsToIPAddresses|RestrictDomainsToCertificate|TenantInboundAttribution/i,
 what:"The receiving Microsoft 365 tenant has an inbound partner connector that only accepts mail for its domains from certain IP addresses or a certain certificate. That is the usual setup behind a third-party mail gateway. This message arrived from somewhere else, so it was refused.",
 s:["Check that mail to this domain goes to the MX record and not straight to Microsoft 365 through a hard-coded smart host."],
 r:["If you changed the mail gateway or its IP addresses, update the connector.","If the mail is meant to arrive directly, the restriction has to be relaxed for that sender.","Senders that ignore the MX and deliver directly to the tenant's onmicrosoft address are rejected by design."],
 cmd:"Get-InboundConnector | Select-Object Name, Enabled, ConnectorType, SenderDomains, SenderIPAddresses, RestrictDomainsToIPAddresses, RestrictDomainsToCertificate, TlsSenderCertificateName",
 tell:"The recipient's mail system refused the connection from our server. Their IT has to adjust a setting. Please let your contact there know."},

{id:"relay-exo",t:"Exchange Online refused to relay the message",who:"S",codes:["5.7.64"],re:/TenantAttribution|Relay Access Denied/i,
 what:"A server or application tried to send through Exchange Online to an outside recipient, and Exchange Online could not match the connection to a tenant. The inbound connector identifies your servers by certificate name or IP address, and neither matched, or the sender domain is not an accepted domain.",
 s:["Check the on-premises connector: the certificate name or public IP in it must match what your server presents today. A changed public IP or a renewed certificate with a new name is the classic cause.","Make sure the sender address uses an accepted domain of the tenant.","For devices and applications, use the tenant's MX endpoint with a connector that lists the public IP."],
 r:[],
 cmd:"Get-InboundConnector | Select-Object Name, Enabled, ConnectorType, SenderIPAddresses, TlsSenderCertificateName\nGet-AcceptedDomain | Select-Object DomainName, DomainType",
 tell:"The device or application is not allowed to send mail through our mail system in its current setup. IT is correcting the configuration."},

{id:"relay",t:"The server refused to relay the message",who:"S",re:/relay(ing)? (access )?(denied|not (permitted|allowed))|unable to relay|not permitted to relay|relay access/i,need:1,
 what:"The mail was handed to a server that is not responsible for the recipient's domain and will not pass it on for this client. Either the application sends through the wrong server, it does not authenticate, or its IP address is not on the server's relay list.",
 s:["Check which server the application or device sends through and whether that server knows it: authentication or an allowed IP address.","If the public IP changed, update the relay or connector setting.","Check the recipient domain for a typo. A wrong domain can end up at a server that has nothing to do with it."],
 r:["If your own server shows this for one of your domains, the domain is missing from its accepted domains."],
 tell:"The device or application is not allowed to send mail the way it is configured. IT has to correct the settings."},

{id:"smtpauth-off",t:"SMTP AUTH is disabled for this mailbox or tenant",who:"S",codes:["5.7.139"],re:/SmtpClientAuthentication is disabled|Authentication unsuccessful|basic authentication is disabled|blocked by .{0,30}(security defaults|conditional access)/i,
 what:"A device or application tried to sign in to smtp.office365.com with a user name and password. That is refused when SMTP AUTH is switched off for the tenant or the mailbox, when security defaults are on, or when a Conditional Access policy blocks legacy authentication. Microsoft is retiring basic authentication for SMTP AUTH altogether.",
 s:["Prefer a setup without a password: a connector for the device's public IP (SMTP relay), High Volume Email, or an application that supports OAuth.","If it has to be SMTP AUTH for now, enable it for this one mailbox only and exclude the account from the blocking policy.","Check the sign-in log for the account. The failure reason there is exact."],
 r:[],
 cmd:"Get-TransportConfig | Select-Object SmtpClientAuthenticationDisabled\nGet-CASMailbox {sender} | Select-Object SmtpClientAuthenticationDisabled\nSet-CASMailbox {sender} -SmtpClientAuthenticationDisabled $false",
 tell:"The scanner or application signs in to the mail system in a way that is no longer allowed. IT has to change how it sends."},

{id:"noauth",t:"The client sent without signing in",who:"S",codes:["5.7.57"],re:/not authenticated to send anonymous mail|Client (was )?not authenticated|authentication required|must authenticate/i,
 what:"The device or application connected to the submission server but did not authenticate, or did not start TLS first. Exchange Online accepts client submission only on port 587 with STARTTLS and a sign-in.",
 s:["Set the device to smtp.office365.com, port 587, STARTTLS, with the user name and password of a licensed mailbox.","Check that the device supports TLS 1.2. Old firmware often does not.","If the device cannot authenticate at all, use SMTP relay through a connector or direct send to your MX endpoint instead."],
 r:[],
 tell:"The device is not set up correctly for sending mail. IT has to adjust its mail settings."},

{id:"sendas",t:"The sender is not allowed to send as this address",who:"S",codes:["5.7.60"],re:/does not have permissions? to send as|not (allowed|authorized) to send (as|on behalf)|SendAsDenied|send as this sender/i,
 what:"The signed-in account tried to send with a From address that belongs to another mailbox or group and has no Send As right for it. With devices this happens when the From address differs from the account that signs in.",
 s:["Give the account Send As permission on the address it sends from.","Or change the From address to the account's own address.","Permission changes can take up to an hour to apply."],
 r:[],
 cmd:"Add-RecipientPermission -Identity 'shared@contoso.com' -Trustee {sender} -AccessRights SendAs\nGet-RecipientPermission -Identity 'shared@contoso.com'",
 tell:"Your account is not yet allowed to send from this address. IT is adding the permission. It can take up to an hour to work."},

{id:"policy",t:"A policy or mail flow rule rejected the message",who:"E",re:/organization'?s? policy|rejected by .{0,20}(policy|rule)|mail flow rule|transport rule|policy violation|local policy|rejected due to .{0,20}policy|administrative prohibition|message rejected.{0,40}polic/i,need:1,
 what:"A rule on one of the two sides refused the message on purpose: a mail flow rule, a data loss prevention policy or a content filter. The text of the bounce is written by whoever made the rule and often names it.",
 s:["If the bounce comes from your own system, the message trace detail names the rule that fired.","If it comes from the recipient's system, only their administrator can say which rule it was. Send them the bounce.","Check what triggered it: a certain attachment type, a keyword, an encrypted file, a sensitive information type."],
 r:["Look up the message in the trace and read the rule name from the detail.","Decide whether the rule did what it should, or whether it needs an exception for this sender."],
 cmd:"Get-MessageTraceV2 -RecipientAddress {rcpt} -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date) | Select-Object Received, SenderAddress, Subject, Status, MessageTraceId\nGet-TransportRule | Where-Object { $_.RejectMessageReasonText -or $_.DeleteMessage } | Select-Object Name, State, RejectMessageReasonText",
 tell:"The message was stopped by a security rule. Please do not try to get around it. IT is checking which rule it was and whether an exception is appropriate."},

{id:"attachment",t:"An attachment or the content was blocked as dangerous",who:"U",re:/attachment|file ?type|executable|virus|malware|infected|blocked .{0,20}extension|potential security issue|unsafe content/i,need:1,
 what:"The receiving system refused the message because of what is in it: a blocked file type (such as .exe, .js, .iso or a macro document), an archive it could not scan, or a malware detection.",
 s:["Do not rename the file or pack it with a password to get it through. That is exactly what attackers do, and it gets the sender blocked.","Share the file through OneDrive, SharePoint or the recipient's upload portal.","If the file is flagged as malware, treat that as real until it is checked."],
 r:["If the file type is needed for business, allow it for a defined sender instead of for everyone."],
 tell:"The recipient's mail system does not accept this kind of attachment. Please share the file as a link instead."},

{id:"spam",t:"The receiver classified the message as spam",who:"S",codes:["5.7.350"],re:/detected as spam|likely (unsolicited|spam)|looks like spam|appears to be spam|spam (content|message|detected|score)|classified as spam|high probability of spam|unsolicited (bulk|mail|message)|content rejected|message content rejected/i,
 what:"The recipient's spam filter refused the message because of its content or the reputation of the sender. No single rule decides this. Missing authentication, a new domain, link shorteners, an image-only body or a sudden jump in volume all add up.",
 s:["Check SPF, DKIM and DMARC for the sending domain first. Unauthenticated mail is judged much harder.","Look at the mail itself: links to unrelated domains, shortened links, attachments, very little text.","Ask the recipient to add you as a safe sender or to report the mail as not junk, and have their admin submit it to their filter vendor."],
 r:["Check the quarantine and the message trace for the reason.","Report the message as a false positive to the filter vendor rather than building a permanent exception."],
 tell:"The recipient's spam filter rejected the message. IT is checking our sending configuration. If it is urgent, please reach the recipient another way.",
 links:[["domain check","domain-check.html{sdomhash}"]]},

{id:"sender-rejected",t:"The receiver does not accept the sender address",who:"S",codes:["5.1.0","5.1.7"],w:1,re:/sender (address )?(rejected|denied|refused|invalid)|sender domain (must exist|not found|does not exist)|domain of sender address .{0,60}does not (exist|resolve)|invalid sender|bad sender/i,
 what:"The receiving server refused the envelope sender. Either the sender's domain cannot be resolved in DNS, the address is malformed, or the recipient blocks this particular sender.",
 s:["Check that the domain in the sender address exists and has an MX or A record.","Applications often send as noreply@ a domain that was never set up. Use a real domain of yours.","If DNS is fine, the recipient blocks you. Only their administrator can remove that."],
 r:["Check your blocked senders list and the tenant block list for the address or domain."],
 cmd:"Resolve-DnsName {sdom} -Type MX\nGet-TenantAllowBlockListItems -ListType Sender",
 tell:"The recipient's mail system does not accept our sender address. IT is checking why."},

{id:"dane",t:"The recipient's server failed a transport security check",who:"R",cre:/^[45]\.7\.32[1-5]$|^[45]\.4\.8$/,re:/starttls-not-supported|certificate-expired|certificate-host-mismatch|tlsa-invalid|dnssec-invalid|failed MTA-STS validation|MTA-STS/i,
 what:"The recipient's domain announces that mail must be delivered over verified TLS (through MTA-STS or DANE), and the server that answered did not meet that promise: no STARTTLS, an expired certificate, a certificate for another name, or broken DNSSEC records. The sending side refuses to deliver insecurely, as the recipient asked.",
 s:["Nothing is wrong on your side. Tell the recipient's IT and include the bounce. Until they fix it, no sender that honours these standards can reach them."],
 r:["Check the certificate on every MX host: valid, not expired, and issued for the MX host name.","Check that the MTA-STS policy file lists exactly the MX hosts in DNS.","If you use DANE, the TLSA records must match the current certificate. Update them before you renew.","Set MTA-STS to testing mode while you repair it."],
 cmd:"Resolve-DnsName {dom} -Type MX\nResolve-DnsName _mta-sts.{dom} -Type TXT\nInvoke-WebRequest https://mta-sts.{dom}/.well-known/mta-sts.txt | Select-Object -Expand Content",
 tell:"The recipient's mail server has a certificate or security configuration problem, so our system refuses to deliver to it. Their IT has to fix it. Please let your contact know.",
 links:[["domain check","domain-check.html{domhash}"]]},

{id:"tls-required",t:"The server requires an encrypted connection",who:"S",re:/must issue a STARTTLS|STARTTLS (is )?required|TLS (is )?required|encryption required|requires? TLS|TLS (negotiation|handshake) failed|no shared cipher|unsupported protocol/i,need:1,
 what:"The receiving server only accepts mail over TLS, and the sending system did not start an encrypted session or could not agree on a protocol version. Old devices that only speak TLS 1.0 or 1.1 fail this way.",
 s:["Enable STARTTLS in the sending device or application.","Update firmware or software so that TLS 1.2 is supported.","If the device cannot be updated, let it send through an internal relay that can."],
 r:[],
 tell:"The device or system cannot send securely enough for the recipient's server. IT has to update or reconfigure it."},

{id:"loop",t:"The message went in circles",who:"E",codes:["5.4.6","5.4.14","4.4.6"],re:/hop count exceeded|mail loop|loop detected|too many hops|routing loop|loops back/i,
 what:"The mail was passed back and forth between servers until the hop limit stopped it. Usual causes: two mailboxes forwarding to each other, an accepted domain set to Internal relay with a connector that sends the mail straight back, or an MX record that points to a system which hands the mail back to where it came from.",
 s:["If your own systems appear several times in the Received lines of the bounce, the loop is on your side."],
 r:["Check forwarding on the mailbox and on its forwarding target.","Check the accepted domain type: Authoritative if all mailboxes are in Exchange Online, Internal relay only if some live elsewhere and a connector leads there.","In a hybrid or gateway setup, follow the route hop by hop: MX, gateway, connector, target."],
 cmd:"Get-Mailbox {rcpt} | Select-Object ForwardingSmtpAddress, ForwardingAddress\nGet-AcceptedDomain | Select-Object DomainName, DomainType\nGet-OutboundConnector | Select-Object Name, Enabled, RecipientDomains, SmartHosts",
 tell:"The mail could not be delivered because of a routing problem between mail servers. IT is looking into it."},

{id:"dns",t:"The recipient's domain cannot be found in DNS",who:"U",codes:["5.4.310","5.4.312","5.1.2","5.4.4"],re:/DNS domain .{0,80}does not exist|domain (not found|does not exist)|host (or domain name )?not found|NXDOMAIN|no MX|DNS query failed|unrouteable|name service error|could not be resolved|unknown host/i,
 what:"The sending server asked DNS where to deliver mail for this domain and got no usable answer. The domain is misspelled, it has expired, or its DNS records are broken.",
 s:["Check the domain part of the address for a typo. This is the cause nine times out of ten.","Look the domain up. If it has no MX record, tell the recipient through another channel."],
 r:["Check that the domain is still registered and that its name servers answer.","Check that an MX record exists and points to a host name, not to an IP address or a CNAME."],
 cmd:"Resolve-DnsName {dom} -Type MX\nResolve-DnsName {dom} -Type NS",
 tell:"The part of the address after the @ does not exist or cannot be reached. Please check the spelling of the address.",
 links:[["DNS lookup","dns-lookup.html"]]},

{id:"connect",t:"The recipient's mail server could not be reached",who:"R",codes:["4.4.316","5.4.316","4.4.1","4.4.2"],re:/connection (refused|timed out|dropped|reset)|could not connect|unable to connect|failed to connect|timed out while|no route to host|network is unreachable|connection died/i,
 what:"DNS named a mail server for the recipient's domain, but the server did not answer on port 25 or cut the connection. It is down, a firewall blocks the sender, or the MX record points to the wrong place. The sending server keeps retrying, usually for one to two days.",
 s:["If only you are affected, check that your network may send on port 25 at all. Many providers and cloud platforms block it.","Otherwise wait, and tell the recipient through another channel if it is urgent."],
 r:["Check that the MX host is up and reachable on port 25 from the internet.","Check firewall and gateway allow lists if only some senders fail.","After a migration, check that the MX record points to the new system."],
 cmd:"Resolve-DnsName {dom} -Type MX\nTest-NetConnection MX-HOST-FROM-ABOVE -Port 25",
 tell:"The recipient's mail server is not reachable at the moment. Our system keeps trying. If it is urgent, please contact the recipient another way."},

{id:"throttle",t:"The receiver is slowing this sender down",who:"W",tempOnly:1,cre:/^4\.7\.(5\d\d|6\d\d)$|^4\.7\.0$/,re:/rate limit|too many (connections|messages|recipients|emails)|throttl|server busy|temporarily (rate )?limited|unusual rate|try again later.{0,40}(rate|volume)/i,
 what:"The receiving server accepts only a certain amount of mail from one source in a given time and has reached that amount. New IP addresses and new domains start with a low allowance that grows with a clean sending history.",
 s:["Nothing is lost. The sending server retries automatically.","If you send bulk mail, slow the sending rate down and ramp volume up over days, not hours.","Persistent throttling points to a reputation problem. Check authentication and block lists."],
 r:[],
 tell:"The recipient's mail system is accepting our mail slowly at the moment. Your message is queued and will be delivered automatically."},

{id:"greylist",t:"The receiver asked the sender to try again later",who:"W",tempOnly:1,codes:["4.7.1","4.2.0","4.3.2","4.5.1","4.3.0"],re:/greylist|graylist|try again later|temporarily (deferred|rejected|unavailable)|please retry|temporary (failure|error|problem)|service (temporarily )?unavailable/i,
 what:"A temporary refusal. Greylisting is the common reason: the server turns away the first attempt from an unknown sender and accepts the retry a few minutes later, because spam software rarely retries. Maintenance or load on the receiving side looks the same.",
 s:["Do nothing. A proper mail server retries by itself and the mail arrives with a delay.","Applications that send directly and never retry lose mail this way. Let them send through a real mail server."],
 r:["If the delay is a problem for a known sender, put that sender on the greylisting allow list."],
 tell:"The recipient's mail system has delayed your message. It will be delivered automatically, usually within the hour."},

{id:"expired",t:"The message expired after repeated delivery attempts",who:"E",codes:["4.4.7","5.4.300","5.4.7"],re:/message expired|delivery time expired|retry (time|timeout) exceeded|delay(ed)? .{0,30}expired|could not be delivered within|too old/i,w:-2,
 what:"The sending server tried to deliver for one to two days and gave up. This code only says that time ran out. The real reason is the error from the last attempt, which normally stands right next to it in the bounce.",
 s:["Read the rest of the line for the last error: connection refused, DNS failure, TLS problem or a temporary rejection by the recipient.","If nothing else is given, test whether the recipient's server is reachable now."],
 r:["Check that your MX host was reachable during the period and that nothing rejected the sender temporarily for a long time."],
 cmd:"Resolve-DnsName {dom} -Type MX\nTest-NetConnection MX-HOST-FROM-ABOVE -Port 25",
 tell:"The mail could not be delivered for more than a day, so our system gave up. Please contact the recipient another way and send it again later."},

{id:"disabled",t:"The recipient's mailbox is disabled or not accepting mail",who:"R",codes:["5.2.1","5.5.0"],re:/mailbox (is )?(disabled|unavailable|inactive|locked|suspended)|account (is |has been )?(disabled|inactive|suspended|closed)|not accepting (mail|messages)|recipient .{0,20}(disabled|inactive)/i,
 what:"The address exists, but the mailbox behind it has been disabled, suspended or closed. With free mail providers this also happens when the account was not used for a long time.",
 s:["Reach the recipient through another channel and ask for a current address."],
 r:["Check whether the mailbox was disabled on purpose, lost its licence or was soft-deleted. A removed licence deletes the mailbox after 30 days."],
 cmd:"Get-Mailbox {rcpt} -ErrorAction SilentlyContinue | Select-Object AccountDisabled, IsMailboxEnabled, SKUAssigned\nGet-Mailbox -SoftDeletedMailbox | Select-Object PrimarySmtpAddress, WhenSoftDeleted",
 tell:"The recipient's mailbox is no longer active. Please ask them for a current address."},

{id:"too-many-rcpt",t:"Too many recipients in one message",who:"U",codes:["5.5.3","4.5.3"],re:/too many recipients|recipient limit|exceeds .{0,30}recipients/i,
 what:"The message was addressed to more recipients than the server accepts in one mail. Exchange Online allows 500 by default, up to 1,000 if raised, and a distribution group counts as one.",
 s:["Send to a distribution group instead of single addresses, or split the list.","For regular bulk mail use a mailing service."],
 r:[],
 cmd:"Get-Mailbox {sender} | Select-Object RecipientLimits",
 tell:"The mail has too many recipients for one message. Please use a distribution list or send it in smaller batches."},

{id:"generic-571",t:"The receiver refused the message for a policy or security reason",who:"E",codes:["5.7.1","5.7.0"],w:-3,
 what:"5.7.1 is the catch-all code for \"not allowed\". On its own it does not say why. The reason is in the text that follows the code, which the rejecting server writes itself: a block list, a relay restriction, a content rule, a restricted recipient or a spam verdict.",
 s:["Read the text after the code and look at which server sent it.","If the text gives no reason, send the bounce to the administrator of the rejecting system. With the time and both addresses they find the exact cause in their logs."],
 r:["Look the message up in the trace or the gateway log. The entry names the rule or filter that refused it."],
 cmd:"Get-MessageTraceV2 -RecipientAddress {rcpt} -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date) | Select-Object Received, SenderAddress, Subject, Status, MessageTraceId",
 tell:"The recipient's mail system refused the message. IT is finding out why. If it is urgent, please reach the recipient another way."},

{id:"barelf",t:"The message contains invalid line endings",who:"S",codes:["5.6.11"],re:/bare ?line ?feeds?|BareLinefeed|invalid characters/i,
 what:"The message contains line breaks that do not follow the mail standard (a line feed without a carriage return). The receiving server does not support the extension that would allow it. The message was produced by an application or script, not by a normal mail client.",
 s:["Fix the application so that it ends every line with CRLF.","As a workaround, send the content as an attachment or through a different sending library."],
 r:[],
 tell:"The application creates mails in a format the recipient's server does not accept. IT or the software vendor has to correct it."}
];

/* fallback when only the class of the code is known */
var SUBJECT={"0":"an unspecified problem","1":"the address","2":"the mailbox","3":"the receiving mail system","4":"the network or routing","5":"the mail protocol","6":"the message content or format","7":"a security or policy decision"};

/* message trace words and header fields (no bounce code needed) */
var TRACE=[
{id:"tr-failed",re:/\bFailed\b|\bFail\b/i,t:"The trace shows that delivery failed",who:"E",w:2,
 what:"Exchange Online could not deliver the message. The status alone does not say why. The detail trace contains the event with the error text and status code.",
 r:[],s:["Run the detail trace for this message and read the Fail event.","Paste the Detail text of that event here to get the diagnosis."],
 cmd:"Get-MessageTraceDetailV2 -MessageTraceId 'TRACE-ID' -RecipientAddress {rcpt} | Select-Object Date, Event, Detail",
 tell:"The mail could not be delivered. IT is looking up the exact reason."},
{id:"tr-quarantine",re:/\bQuarantined?\b/i,t:"The message is in quarantine",who:"R",
 what:"Exchange Online accepted the message and held it back. The quarantine entry shows why: spam, phishing, malware or a mail flow rule.",
 r:["Open the quarantine entry and read the reason and the policy that put it there.","Release it only if you are sure. High-confidence phishing and malware are held for a reason.","If it was wrong, release it and report it to Microsoft as a false positive so the filter learns."],s:[],
 cmd:"Get-QuarantineMessage -RecipientAddress {rcpt} -StartReceivedDate (Get-Date).AddDays(-7) | Select-Object ReceivedTime, SenderAddress, Subject, Type, PolicyName",
 tell:"The mail was held back by the spam filter. IT is checking whether it is safe and will release it if so."},
{id:"tr-junk",re:/FilteredAsSpam|\bSFV:SPM\b|Junk Email folder/i,t:"The message was delivered to the Junk Email folder",who:"R",
 what:"Exchange Online classified the message as spam and delivered it to the recipient's Junk Email folder. It did arrive.",
 r:["Ask the user to look in Junk Email and mark it as not junk.","Check the headers for the reason (the CAT and SFV fields).","Report it as a false positive rather than adding a broad allow rule."],s:[],
 tell:"The mail arrived but was sorted into your Junk Email folder. Please have a look there and mark it as not junk."},
{id:"tr-pending",re:/\bPending\b|\bDefer(red)?\b|GettingStatus/i,t:"The message is still on its way",who:"W",
 what:"Exchange Online has the message and is still trying to deliver it, or has not finished processing it. For external recipients this means the other server answered with a temporary error and delivery is being retried.",
 r:[],s:["Run the detail trace and read the last Defer event. It contains the error from the other server.","Paste that error line here for a diagnosis."],
 cmd:"Get-MessageTraceDetailV2 -MessageTraceId 'TRACE-ID' -RecipientAddress {rcpt} | Select-Object Date, Event, Detail",
 tell:"The mail has not been delivered yet. The system is still trying. IT is checking why it is delayed."},
{id:"tr-expanded",re:/\bExpanded\b/i,t:"The message went to a group and was split up",who:"E",
 what:"The recipient was a distribution group. Exchange Online replaced it with its members and delivers one copy to each. The status of the group itself says nothing about the individual deliveries.",
 r:["Trace the same message for the member who did not get it."],s:[],
 cmd:"Get-DistributionGroupMember {rcpt} | Select-Object Name, PrimarySmtpAddress",
 tell:"The mail was sent on to the members of the group. IT is checking the delivery to the person who is missing it."},
{id:"tr-sent-external",re:/Send external|SendExternal/i,t:"Your tenant handed the message to the recipient's server",who:"R",
 what:"The trace shows that the message left Exchange Online and was accepted by the next server. From that point only the administrator of the receiving system can see what happened to it: spam filter, quarantine, a rule, or a full mailbox.",
 s:["Send the recipient's IT the time of delivery, the sender address and the Message-ID so they can look it up."],r:[],
 tell:"Our system delivered the mail to the recipient's mail server and it was accepted there. Please ask the recipient to check their junk folder or have their IT look for it."},
{id:"tr-delivered",re:/\bDelivered\b|\bDeliver\b/i,t:"The message was delivered to the mailbox",who:"R",w:-3,
 what:"Exchange Online placed the message in the recipient's mailbox. If the user cannot find it, something moved or hid it after delivery.",
 r:["Search the whole mailbox, not just the inbox: Junk Email, Deleted Items, the Other tab of Focused Inbox, the archive.","Check inbox rules and Sweep rules, including ones created on another device.","Check whether a delegate or a phone deleted it."],s:[],
 cmd:"Get-InboxRule -Mailbox {rcpt} | Select-Object Name, Enabled, MoveToFolder, DeleteMessage, ForwardTo\nGet-MessageTraceDetailV2 -MessageTraceId 'TRACE-ID' -RecipientAddress {rcpt} | Select-Object Date, Event, Detail",
 tell:"The mail was delivered to your mailbox. Please search all folders, including Junk Email, Deleted Items and the Other tab. IT is checking your inbox rules."}
];

var SFV={NSPM:"not spam",SPM:"marked as spam by the filter",SKA:"filtering skipped: sender is on the allowed list of the anti-spam policy",SKN:"filtering skipped: a mail flow rule marked it as safe",SKB:"marked as spam: sender is on the blocked list of the anti-spam policy",SKQ:"released from quarantine",SKS:"marked as spam by a mail flow rule before filtering",SKI:"internal mail, filtering skipped",SFE:"filtering skipped: sender is in the user's Safe Senders list",BLK:"blocked: sender is in the user's Blocked Senders list"};
var CAT={BULK:"bulk mail",DIMP:"domain impersonation",FTBP:"blocked file type (common attachments filter)",GIMP:"impersonation detected by mailbox intelligence",HPHSH:"high-confidence phishing",HPHISH:"high-confidence phishing",HSPM:"high-confidence spam",MALW:"malware",NONE:"clean",OSPM:"outbound spam",PHSH:"phishing",SAP:"Safe Attachments detection",SPM:"spam",SPOOF:"spoofing",UIMP:"user impersonation"};

/* ================= parsing ================= */
function uniq(a){var s={},o=[];a.forEach(function(x){var k=String(x).toLowerCase();if(!s[k]){s[k]=1;o.push(x)}});return o}
function parse(text){
  var raw=String(text||"").replace(/\r\n?/g,"\n"),flat=raw.replace(/\n(?:\d{3}[- ])?/g," ").replace(/\s+/g," ");
  var C={raw:raw,flat:flat,codes:[],smtp:[],emails:[],ips:[],lists:[],servers:[]};
  var m,re=/(^|[^\d.])([245]\.\d{1,3}\.\d{1,3})(?![\d]|\.\d)/g;
  while(m=re.exec(raw))C.codes.push(m[2]);
  C.codes=uniq(C.codes);
  re=/(?:^|[\s'"(;:])([245][0-5]\d)[ -](?=[245]\.\d{1,3}\.\d)/gm;
  while(m=re.exec(raw))C.smtp.push(m[1]);
  C.smtp=uniq(C.smtp);
  if(!C.codes.length&&/^\s*[245]\.\d{1,3}\.\d{1,3}\s*$/.test(raw))C.codes=[raw.trim()];
  C.emails=uniq(raw.match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g)||[]).filter(function(e){return !/@(.*\.)?(prod\.outlook\.com|prod\.protection\.outlook\.com)$/i.test(e)&&!/^(postmaster|mailer-daemon|delist)@/i.test(e)});
  C.ips=uniq((raw.match(/(?:^|[^\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.]*\d)/gm)||[]).map(function(x){return x.replace(/^[^\d]/,"")}).filter(function(ip){return ip.split(".").every(function(o){return +o<=255})}));
  C.lists=uniq((flat.match(/[a-z0-9.-]*(?:spamhaus|spamcop|barracudacentral|sorbs|uceprotect|abusix|invaluement|mailspike|surbl)[a-z0-9.-]*/gi)||[]).map(function(x){return x.replace(/[.,;]+$/,"")}));
  var f=/Final-Recipient:\s*rfc822;\s*(\S+)/i.exec(raw)||/Recipient(?:Address)?\s*:\s*(\S+@\S+)/i.exec(raw)||/Original-Recipient:\s*rfc822;\s*(\S+)/i.exec(raw);
  C.rcpt=f?f[1].replace(/[<>,;]/g,""):(C.emails[0]||"");
  var g=/Remote-MTA:\s*dns;\s*(\S+)/i.exec(raw);if(g)C.servers.push(["rejecting server",g[1]]);
  g=/Generating server:\s*(\S+)/i.exec(raw)||/Reporting-MTA:\s*dns;\s*(\S+)/i.exec(raw);if(g)C.servers.push(["reported by",g[1]]);
  g=/smtp\.mailfrom=([^\s;]+)/i.exec(raw);var sd=g?g[1].replace(/^.*@/,""):"";
  if(!sd){g=/sending domain \[?([a-z0-9.-]+\.[a-z]{2,})\]?/i.exec(flat)||/SPF \[([a-z0-9.-]+\.[a-z]{2,})\]/i.exec(flat)||/header\.from=([a-z0-9.-]+\.[a-z]{2,})/i.exec(flat)||/domain of (?:sender address )?\S*?@?([a-z0-9-]+(?:\.[a-z0-9-]+)+)\s+does not/i.exec(flat);if(g)sd=g[1]}
  C.sdom=sd.toLowerCase();
  C.dom=C.rcpt.indexOf("@")>0?C.rcpt.split("@")[1].toLowerCase():"";
  C.provider=/gsmtp|google\.com|googlemail|gmail/i.test(flat)?"Google (Gmail / Workspace)":/outlook\.com|protection\.outlook|PROD\.OUTLOOK|Office ?365|Exchange Online|RESOLVER\.|TenantAttribution|AS\(\d+\)/i.test(flat)?"Microsoft 365 / Exchange Online":/yahoo|ymail|aol\.com/i.test(flat)?"Yahoo":/pphosted|proofpoint/i.test(flat)?"Proofpoint":/mimecast/i.test(flat)?"Mimecast":/barracuda/i.test(flat)?"Barracuda":"";
  /* spam headers */
  var h=/X-Forefront-Antispam-Report(?:-Untrusted)?:\s*([^\n]+(?:\n[ \t][^\n]+)*)/i.exec(raw);
  if(h){C.hdr={};h[1].replace(/\s+/g,"").split(";").forEach(function(kv){var i=kv.indexOf(":");if(i>0)C.hdr[kv.slice(0,i).toUpperCase()]=kv.slice(i+1)})}
  else if(/\bSCL:-?\d/.test(flat)&&/\bSFV:[A-Z]{3,4}/.test(flat)){C.hdr={};flat.replace(/\b(SCL|SFV|CAT|CIP|CTRY|BCL|PTR|H|IPV|DIR):([^;\s]*)/g,function(_,k,v){C.hdr[k]=v})}
  var bcl=/\bBCL:(\d+)/.exec(flat);if(bcl&&C.hdr&&!C.hdr.BCL)C.hdr.BCL=bcl[1];
  var ar=/Authentication-Results:\s*([^\n]+(?:\n[ \t][^\n]+)*)/i.exec(raw);
  if(ar){C.auth={};["spf","dkim","dmarc","compauth"].forEach(function(k){var x=new RegExp("\\b"+k+"=([a-z]+)","i").exec(ar[1]);if(x)C.auth[k]=x[1].toLowerCase()})}
  return C;
}

function fill(s,C){
  if(!s)return s;
  var sender="user@contoso.com",rc=C.rcpt||"user@contoso.com";
  return s.replace(/\{rcpt\}/g,rc).replace(/\{sender\}/g,sender).replace(/\{dom\}/g,C.dom||"example.org").replace(/\{sdom\}/g,C.sdom||"contoso.com").replace(/\{ip\}/g,C.ips[0]||"203.0.113.10").replace(/\{sdomhash\}/g,C.sdom?"#d="+C.sdom:"").replace(/\{domhash\}/g,C.dom?"#d="+C.dom:"");
}
function evidence(C,rule,code){
  var lines=C.raw.split("\n"),i,hit=-1;
  for(i=0;i<lines.length&&hit<0;i++)if(rule.re&&rule.re.test(lines[i]))hit=i;
  for(i=0;i<lines.length&&hit<0;i++)if(code&&lines[i].indexOf(code)>=0)hit=i;
  if(hit<0)return "";
  var s=lines[hit].trim();
  if(s.length<60&&lines[hit+1]&&lines[hit+1].trim())s+=" "+lines[hit+1].trim();
  return s.length>320?s.slice(0,320)+"…":s;
}
function headerResult(C){
  var H=C.hdr||{},A=C.auth||{},scl=H.SCL!==undefined?parseInt(H.SCL,10):null,rows=[],bad=[];
  if(scl!==null&&!isNaN(scl))rows.push(["SCL "+scl,scl<0?"spam filtering was skipped":scl<=1?"not spam":scl<=6?"spam":"high-confidence spam"]);
  if(H.SFV)rows.push(["SFV "+H.SFV,SFV[H.SFV.toUpperCase()]||"verdict code"]);
  if(H.CAT)rows.push(["CAT "+H.CAT,CAT[H.CAT.toUpperCase()]||"protection policy category"]);
  if(H.BCL)rows.push(["BCL "+H.BCL,+H.BCL>=7?"bulk mail that generates many complaints":+H.BCL>=4?"bulk mail with mixed complaints":"not bulk, or bulk with few complaints"]);
  if(H.CIP)rows.push(["CIP "+H.CIP,"connecting IP address"+(H.CTRY?" ("+H.CTRY+")":"")]);
  ["spf","dkim","dmarc","compauth"].forEach(function(k){if(A[k]){rows.push([k+" "+A[k],k==="compauth"?"Microsoft's combined authentication verdict":k.toUpperCase()+" result recorded by the receiving server"]);if(/fail|none|softfail|temperror|permerror/.test(A[k])&&!(k==="dkim"&&A[k]==="none"&&A.spf==="pass"))bad.push(k)}});
  var cat=(H.CAT||"").toUpperCase(),sfv=(H.SFV||"").toUpperCase(),t,what,r=[],who="F";
  if(/^(SKA|SKN|SFE|SKI)$/.test(sfv)){t="Spam filtering was skipped for this message";what="The message was not filtered, because "+(SFV[sfv]||"an allow entry matched").replace(/^filtering skipped: /,"")+". If it was spam or phishing, that allow entry is the reason it got through.";r=["Find the allow entry and decide whether it is still needed. Allowing whole domains is how spoofed mail reaches the inbox.","Prefer the tenant allow/block list with an expiry over permanent safe sender entries."]}
  else if(sfv==="BLK"||sfv==="SKB"||sfv==="SKS"){t="A block entry or rule marked this message as spam";what="The filter did not judge the content. The message was marked because "+(SFV[sfv]||"a block entry matched")+".";r=["Remove the block entry or the rule if the sender should get through."]}
  else if(/^(PHSH|HPHSH|HPHISH|SPOOF|UIMP|DIMP|GIMP)$/.test(cat)){t="The filter treated this message as "+(CAT[cat]||"phishing");what="Defender for Office 365 classified the message as "+(CAT[cat]||"phishing")+(bad.length?", and the sender authentication backs that up ("+bad.join(", ")+" did not pass)":"")+". Treat it as hostile unless you know the sender and can explain the failed checks.";r=["Do not release it on the user's word alone. Check the sender address and the links first.","If it is a legitimate partner whose mail fails authentication, they have to fix SPF, DKIM and DMARC on their side.","For impersonation false positives, add the sender to the trusted senders of the anti-phishing policy."]}
  else if(cat==="MALW"||cat==="FTBP"||cat==="SAP"){t="The message was stopped because of an attachment";what="The verdict is "+(CAT[cat]||"malware")+". The attachment is the reason, not the sender.";r=["Leave it in quarantine. If the file is needed, have the sender share it another way."]}
  else if(cat==="BULK"||(H.BCL&&+H.BCL>=7)){t="The message was treated as bulk mail";what="The sender is a bulk mailer whose mail draws complaints (BCL "+(H.BCL||"high")+"). Newsletters land in Junk when the bulk threshold of the anti-spam policy is at or below that level.";r=["If the users want this newsletter, allow that sender. Do not raise the bulk threshold for everyone."]}
  else if(scl!==null&&scl>=5||sfv==="SPM"||cat==="SPM"||cat==="HSPM"){t="The filter marked this message as spam";what="The content or the sender's reputation led to a spam verdict"+(scl!==null?" (SCL "+scl+")":"")+(bad.length?". Failed sender authentication contributed ("+bad.join(", ")+")":"")+".";r=["If it is a false positive, report it to Microsoft from the quarantine or the submissions page.","If the sender is a partner, ask them to fix their authentication. That is the lasting fix."]}
  else if(bad.length){t="The message passed the spam filter, but sender authentication failed";what="The filter verdict is clean, yet "+bad.join(", ")+" did not pass. The mail was delivered this time. Other receivers may be stricter.";r=["If this is your own domain, fix the records. If it is a partner's, tell them."];who="S"}
  else{t="The filter found nothing wrong with this message";what="The verdict is not spam"+(scl!==null?" (SCL "+scl+")":"")+" and no authentication check failed. If the mail is missing, look for an inbox rule, the Other tab or a client-side filter.";r=["Run a message trace to see where it was delivered.","Check the user's inbox rules."];who="R"}
  return {id:"headers",t:t,who:who,what:what,s:[],r:r,rows:rows,
    cmd:"Get-QuarantineMessage -RecipientAddress {rcpt} -StartReceivedDate (Get-Date).AddDays(-7) | Select-Object ReceivedTime, SenderAddress, Subject, Type, PolicyName\nGet-TenantAllowBlockListItems -ListType Sender",
    tell:null,links:[["mail flow cheat sheet","mail-flow-cheat-sheet.html?q=spam%20verdict"],["phish analyzer","phish-analyzer.html"]]};
}

function analyse(text){
  var C=parse(text),hits=[],fail=C.codes.filter(function(c){return c[0]!=="2"}),perm=fail.some(function(c){return c[0]==="5"})&&!fail.some(function(c){return c[0]==="4"});
  if(!C.raw.trim())return {empty:true};
  RULES.forEach(function(r){
    var cHit=null,rHit=r.re?r.re.test(C.flat):false;
    fail.forEach(function(c){if(!cHit&&((r.codes&&r.codes.indexOf(c)>=0)||(r.cre&&r.cre.test(c))))cHit=c});
    if(r.need&&!rHit)return;
    if(r.tempOnly&&perm&&!cHit)return;
    if(!cHit&&!rHit)return;
    var score=(cHit?5:0)+(rHit?6:0)+(r.w||0);
    if(!cHit&&fail.length&&(r.codes||r.cre))score-=2;
    hits.push({r:r,score:score,code:cHit});
  });
  if(C.hdr||C.auth)hits.push({r:headerResult(C),score:fail.length?4:20,code:null});
  if(!fail.length&&!C.hdr&&!C.auth)TRACE.forEach(function(r){if(r.re.test(C.flat))hits.push({r:r,score:7+(r.w||0),code:null})});
  hits.sort(function(a,b){return b.score-a.score});
  var top=hits[0],res={C:C,others:hits.slice(1).filter(function(h){return h.score>=5&&h.r.id!=="generic-571"}).slice(0,3).map(function(h){return h.r})};
  if(top){res.rule=top.r;res.code=top.code||fail[0]||"";}
  else if(fail.length){
    var c=fail[0],p=c.split(".");
    res.code=c;res.rule={id:"class",t:(p[0]==="4"?"Temporary":"Permanent")+" failure related to "+(SUBJECT[p[1]]||"an unspecified problem"),who:p[0]==="4"?"W":"E",
      what:"This exact code is not in the knowledge base. Its structure still tells you something: the first digit ("+p[0]+") means "+(p[0]==="4"?"a temporary problem, so the sending server retries":"a permanent failure, so the message will not be retried")+", and the second digit ("+p[1]+") points to "+(SUBJECT[p[1]]||"an unspecified area")+". The text that follows the code in the bounce is written by the rejecting server and usually names the reason.",
      s:["Read the text right after the code. It is the most specific information there is.","Look at which server rejected the mail. Its administrator can find the exact reason in the logs with the time and the addresses."],r:[],tell:null,links:[["email error codes","email-error-codes.html?q="+c]]};
  }else return {C:C,unknown:true};
  res.temp=fail.length?!fail.some(function(c){return c[0]==="5"}):res.rule.who==="W";
  res.evidence=res.rule.id==="headers"?"":evidence(C,res.rule,res.code);
  return res;
}

function summary(R){
  if(!R||!R.rule)return "";
  var C=R.C,r=R.rule,L=["Mail flow diagnosis: "+r.t];
  if(R.code)L.push("Status code: "+R.code+(R.temp?" (temporary)":" (permanent)"));
  if(C.rcpt)L.push("Recipient: "+C.rcpt);
  C.servers.forEach(function(s){L.push(s[0][0].toUpperCase()+s[0].slice(1)+": "+s[1])});
  if(C.ips.length)L.push("IP addresses: "+C.ips.slice(0,4).join(", "));
  L.push("Who acts: "+WHO[r.who],"",fill(r.what,C));
  if(r.s&&r.s.length){L.push("","If we sent the mail:");r.s.forEach(function(x,i){L.push((i+1)+". "+x)})}
  if(r.r&&r.r.length){L.push("","If we should have received it:");r.r.forEach(function(x,i){L.push((i+1)+". "+x)})}
  if(R.evidence)L.push("","Deciding line: "+R.evidence);
  return L.join("\n");
}

/* ================= samples ================= */
var SAMPLES={
"recipient not found":"Delivery has failed to these recipients or groups:\n\nanna.schmidt@fabrikam.com\nThe email address you entered couldn't be found. Please check the recipient's email address and try to resend the message. If the problem continues, please contact your email admin.\n\nDiagnostic information for administrators:\n\nGenerating server: FR0P281MB1234.DEUP281.PROD.OUTLOOK.COM\n\nanna.schmidt@fabrikam.com\nRemote Server returned '550 5.1.10 RESOLVER.ADR.RecipientNotFound; Recipient not found by SMTP address lookup'",
"DMARC reject":"Your message to orders@fabrikam.com couldn't be delivered.\n\nDiagnostic information for administrators:\n\nGenerating server: AM9PR08MB6789.eurprd08.prod.outlook.com\n\norders@fabrikam.com\nRemote Server returned '550 5.7.509 Access denied, sending domain [contoso.com] does not pass DMARC verification and has a DMARC policy of reject.'",
"Gmail: unauthenticated":"Final-Recipient: rfc822; lena.k@gmail.com\nAction: failed\nStatus: 5.7.26\nRemote-MTA: dns; gmail-smtp-in.l.google.com\nDiagnostic-Code: smtp; 550-5.7.26 This mail has been blocked because the sender is unauthenticated.\n550-5.7.26 Gmail requires all senders to authenticate with either SPF or DKIM.\n550-5.7.26\n550-5.7.26  Authentication results:\n550-5.7.26  DKIM = did not pass\n550-5.7.26  SPF [contoso.com] with ip: [203.0.113.25] = did not pass\n550 5.7.26  For instructions on setting up authentication, go to https://support.google.com/mail/answer/81126#authentication - gsmtp",
"block list":"Final-Recipient: rfc822; einkauf@example.org\nAction: failed\nStatus: 5.7.1\nRemote-MTA: dns; mx01.example.org\nDiagnostic-Code: smtp; 554 5.7.1 Service unavailable; Client host [198.51.100.77] blocked using zen.spamhaus.org; https://check.spamhaus.org/query/ip/198.51.100.77",
"forwarding blocked":"Delivery has failed to these recipients or groups:\n\nmarta.private@example.net\nYour message wasn't delivered because the recipient's email provider rejected it.\n\nDiagnostic information for administrators:\n\nGenerating server: FR2P281MB0456.DEUP281.PROD.OUTLOOK.COM\n\nmarta.private@example.net\nRemote Server returned '550 5.7.520 Access denied, Your organization does not allow external forwarding. Please contact your administrator for further assistance. AS(7555)'",
"mailbox full":"Reporting-MTA: dns; mail.contoso.com\n\nFinal-Recipient: rfc822; j.doe@example.org\nAction: failed\nStatus: 5.2.2\nRemote-MTA: dns; mx01.example.org\nDiagnostic-Code: smtp; 552 5.2.2 <j.doe@example.org>: Recipient mailbox is full (over quota)",
"spam headers":"Authentication-Results: spf=fail (sender IP is 203.0.113.9)\n smtp.mailfrom=fabrikam.com; dkim=none (message not signed)\n header.d=none;dmarc=fail action=quarantine header.from=fabrikam.com;compauth=fail reason=000\nX-Forefront-Antispam-Report:\n CIP:203.0.113.9;CTRY:NL;LANG:en;SCL:5;SRV:;IPV:NLI;SFV:SPM;H:mail.example.net;PTR:mail.example.net;CAT:SPOOF;SFS:(13230040);DIR:INB;\nX-Microsoft-Antispam: BCL:0;",
"scanner cannot send":"The scanner shows: SMTP error 535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Tenant. Visit https://aka.ms/smtp_auth_disabled for more information. [FR0P281CA0101.DEUP281.PROD.OUTLOOK.COM]"
};

/* ================= rendering ================= */
function copyBtn(label,getText){
  var b=el("button","btn ghost",label);b.type="button";
  b.addEventListener("click",function(){var t=getText();(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent="copied";setTimeout(function(){b.textContent=label},1400)},function(){var ta=el("textarea");ta.value=t;document.body.append(ta);ta.select();try{document.execCommand("copy");b.textContent="copied"}catch(e){}ta.remove();setTimeout(function(){b.textContent=label},1400)})});
  return b;
}
function list(title,items,C){
  var f=document.createDocumentFragment();if(!items||!items.length)return f;
  f.append(el("h3",null,title));var ol=el("ol","steps");items.forEach(function(x){ol.append(el("li",null,fill(x,C)))});f.append(ol);return f;
}
function render(R){
  var out=$("mf-out");out.textContent="";out.hidden=false;
  if(R.empty){out.hidden=true;return}
  if(R.unknown){
    var v0=el("div","verdict v-info");v0.append(el("b",null,"Nothing recognisable in this text"),el("span",null,"no status code, no known error text, no message trace status"));out.append(v0);
    out.append(el("p","dim","Paste the complete bounce message including the part headed \"Diagnostic information for administrators\", an SMTP error line from a device or log, the output of a message trace, or the X-Forefront-Antispam-Report header of a received mail."));
    return;
  }
  var C=R.C,r=R.rule,sev=r.who==="W"?"info":R.temp?"med":"high";
  var v=el("div","verdict v-"+sev);
  v.append(el("b",null,r.t),el("span",null,(R.code?(R.temp?"temporary":"permanent")+" · ":"")+WHO[r.who]));out.append(v);
  var dl=el("dl","kv"),add=function(k,val){if(val){dl.append(el("dt",null,k),el("dd",null,val))}};
  add("status code",R.code);add("smtp reply",C.smtp.join(", "));add("recipient",C.rcpt);
  C.servers.forEach(function(s){add(s[0],s[1])});
  add("mail system",C.provider);add("sender domain",C.sdom);add("ip addresses",C.ips.slice(0,5).join(", "));add("block list",C.lists.join(", "));
  (r.rows||[]).forEach(function(x){add(x[0],x[1])});
  if(dl.children.length)out.append(dl);
  out.append(el("h2",null,"what happened"));
  var p=el("p",null,fill(r.what,C));p.style.maxWidth="78ch";out.append(p);
  if(R.evidence){var ev=el("pre",null,R.evidence);ev.style.whiteSpace="pre-wrap";ev.style.marginTop="12px";out.append(el("p","dim","The line that decided it:"),ev)}
  if((r.s&&r.s.length)||(r.r&&r.r.length)){
    out.append(el("h2",null,"what to do"));
    out.append(list("If your organisation sent the mail",r.s,C),list("If your organisation should have received it",r.r,C));
  }
  if(r.cmd){
    out.append(el("h2",null,"commands"));
    var cmd=fill(r.cmd,C),pre=el("pre",null,cmd);pre.style.whiteSpace="pre-wrap";
    out.append(el("p","dim","Exchange Online PowerShell. Placeholders such as user@contoso.com need your values."),pre,copyBtn("copy commands",function(){return cmd}));
  }
  if(r.tell){
    out.append(el("h2",null,"what to tell the user"));
    var t=el("p",null,r.tell);t.style.cssText="max-width:78ch;border-left:3px solid var(--violet);padding:4px 0 4px 14px";
    out.append(t,copyBtn("copy reply",function(){return r.tell}));
  }
  var ctl=el("div","ctl");ctl.style.marginTop="26px";
  ctl.append(copyBtn("copy ticket note",function(){return summary(R)}));out.append(ctl);
  var links=(r.links||[]).slice();if(R.code&&r.id!=="class")links.push(["all error codes","email-error-codes.html?q="+R.code]);
  if(links.length){var rel=el("p","rel","Next: ");links.forEach(function(l){var a=el("a",null,l[0]);a.href=fill(l[1],C);rel.append(a," ")});out.append(rel)}
  if(R.others.length){
    out.append(el("h2",null,"other readings"));
    out.append(el("p","dim","The text also matches these. Open one if the first diagnosis does not fit what you see."));
    R.others.forEach(function(o){
      var d=el("details","finding"),s=el("summary");s.append(el("span","sevtag s-info",o.who==="W"?"wait":o.who==="U"?"user":o.who==="S"?"sender":o.who==="R"?"receiver":o.who==="F"?"filter":"either"),el("b",null,o.t));
      d.append(s,el("p",null,fill(o.what,C)));
      var steps=(o.s||[]).concat(o.r||[]);if(steps.length){var ol=el("ol","steps");steps.slice(0,4).forEach(function(x){ol.append(el("li",null,fill(x,C)))});d.append(ol)}
      out.append(d);
    });
  }
}

function run(text){
  var R=analyse(text);render(R);
  var st=$("mf-status");
  if(st)st.textContent=R.empty?"":R.unknown?"":"Read "+R.C.raw.length.toLocaleString("en-US")+" characters in your browser. Nothing was sent anywhere.";
  return R;
}
window.mailflow={analyse:analyse,summary:summary,samples:SAMPLES,rules:RULES.length};

if(!$("mf-text"))return;
var ta=$("mf-text");
$("mf-run").addEventListener("click",function(){run(ta.value)});
ta.addEventListener("paste",function(){setTimeout(function(){run(ta.value)},30)});
ta.addEventListener("keydown",function(e){if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();run(ta.value)}});
$("mf-clear").addEventListener("click",function(){ta.value="";run("");ta.focus();history.replaceState(null,"",location.pathname)});
var sel=$("mf-samples");
Object.keys(SAMPLES).forEach(function(k){var b=el("button","chipbtn",k);b.type="button";b.addEventListener("click",function(){ta.value=SAMPLES[k];run(ta.value);$("mf-out").scrollIntoView({block:"nearest"})});sel.append(b)});
var cnt=$("mf-count");if(cnt)cnt.textContent=String(RULES.length+TRACE.length);
function fromHash(){var m=/^#q=(.+)$/.exec(location.hash);if(m){try{ta.value=decodeURIComponent(m[1])}catch(e){ta.value=m[1]}run(ta.value)}}
fromHash();window.addEventListener("hashchange",fromHash);
})();
