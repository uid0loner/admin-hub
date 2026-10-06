# admin_hub roadmap

How this works: the owner writes "WEITER", the next open item is built, tested and committed to `main`.
Cloudflare Pages publishes `admin_hub_site/` automatically. This file is not part of the published site.

## Next: second round for the all-rounder

The first breadth round is done (calculators, certificate decoder, command builder, Linux, network, helpdesk,
virtualisation and storage, log reader, scripting, small office blueprint, databases).

Owner's rule (2026-10-05): the site is for an IT all-rounder and should cover everything in IT, including hardware tips and tricks for servers, PCs and notebooks, with pictures. Every round ("WEITER") adds a bit of everything: one piece from several of the areas below, not one area at a time.

Areas, with what is next in each:

- Hardware: cable length and voltage drop, storage upgrade planner
- Network: a subnet and VLAN poster to print, a switch port finder walkthrough
- Mail and web: mail deliverability from zero, registrar, DNS and certificates for a small site, a header reader for everyday mail problems
- Linux and containers: a log rotation and disk clean-up walkthrough, a systemd unit builder
- Windows Server on-premises: a file server migration checklist
- Databases: SQL playground lessons on window functions
- Monitoring: a status page template, a simple uptime check script collection
- Phones, tablets and peripherals: scanners, label printers, conference room gear
- Telephony and video: a call quality walkthrough, Teams and Zoom room problems
- Procurement and lifecycle: a licence and subscription tracker
- Security basics for small companies: password manager roll-out, phishing drill kit, a phishing drill kit
- Microsoft 365 and Entra: guided "audit my tenant in an hour" flow, two more war stories
- Cockpit for the new tools: keep results from the SMART reader, log reader, firewall and config reviewers, DMARC reader

Still open from earlier: quality pass with real exports from the owner.

## Open questions

- CISA Advisories feed delivers no items to the news page. The run log is not readable from here, so it is unclear whether CISA blocks the request or simply published nothing in 14 days. Check the log of an "Update feeds" run in the Actions tab for a line starting with FAILED

## Needs real data from the owner

- Entra sign-in export (CSV) to verify column mapping in signin-analyzer
- Conditional Access policy export (JSON) for ca-analyzer
- A real .eml phishing sample for phish-analyzer
- A real Intune device export (CSV, all columns) to verify the column names in intune-analyzer
- A real licences.json from the export script on license-optimizer (or the admin center user CSV), and your real prices
- A real apps.json from the export script on app-audit, to verify the script and the property names
- Real bounce messages (NDRs) that the mail flow debugger gets wrong or only reads by code class

## Done

- 2026-10-06: round five, larger pieces: Linux playground (own shell simulator, 13 missions), network diagram builder (SVG/PNG export, checks), PC build checker (scale drawing), asset inventory (CSV), DHCP walkthrough, password manager roll-out checklist, cheat sheets Let's Encrypt/certbot and SQL window functions, 9 glossary terms, stamp v63
- 2026-10-06: mixed round four: cron and timer builder, DNS walkthrough, printer hardware guide (4 drawings), security posters to print (10), device management explained, monitoring baseline checklist, disk wiping cheat sheet, 11 glossary terms, stamp v62
- 2026-10-06: mixed round three: BIOS and UEFI settings explained (27), Git fix-it (25 situations), Group Policy walkthrough, Wi-Fi channel planner, connection string builder, incident plan builder, wizard trees for monitors and docks, hardware buying guide, 10 glossary terms, stamp v61
- 2026-10-05: mixed round two: rack planner with a drawing, dcdiag and repadmin reader, Docker container troubleshooting walkthrough, network hardware guide (5 drawings), uptime and SLA calculator, VoIP and SIP cheat sheet, mobile device checklist, 10 glossary terms, stamp v60
- 2026-10-05: mixed round: DMARC report reader (XML, zip, gz), beep code lookup (41 entries), UPS runtime and PoE budget calculators, cheat sheets for NTFS and share permissions, Ansible, SNMP and monitoring, new PC setup checklist, 10 glossary terms, stamp v59
- 2026-10-05: hardware pack: connector identifier (42 drawings), hardware guides for desktop PCs, notebooks and servers with 14 drawings, wizard tree for the PC that does not start, 16 glossary terms, stamp v58
- 2026-10-05: config reviewer for sshd_config, nginx and Docker Compose (own nginx and YAML readers, findings with the line, the reason and the replacement, annotated file view), stamp v57
- 2026-10-05: databases pack: SQL playground (own engine, 16 checked lessons), slow database walkthrough, cheat sheets for SQL basics, PostgreSQL, MySQL and MariaDB, SQL Server, backup and restore, 17 glossary terms, stamp v56
- 2026-10-05: design 7, motion and palette: page transitions with a fixed header, results that arrive in order with counting numbers, palette with a start list, example chips, actions and highlighted matches, stamp v40
- 2026-10-05: design 6, start-here (six tracks as directories, one new: "I just took over an environment"), about and 404 in the new style, stamp v39
- 2026-10-05: design 5, components: one focus ring, quiet form fields, one button shape, visible links in running text, inline code, tables, findings with a chevron, snippets with the copy button next to the title, pictograms on the home page, stamp v38
- 2026-10-05: design 4, tool frame: the eight analyzer pages show an example result next to the input, with a section menu; the preview gives way to the real result, stamp v37
- 2026-10-05: design 3, home page: three starting points, directory tiles, live strip in two columns, a third shorter. The grouped tool list moved to the tools page, which now has a filter. Note for later rounds: the "new here" list on the home page holds 6 items, and the counts live in the tiles (data-count) and in start-here and about, stamp v35
- 2026-10-05: design 2, hub pages: cheat sheets, checklists and explainers as grouped directories with a filter, stamp v33
- 2026-10-05: design 1, typography: IBM Plex Sans for running text, JetBrains Mono (now really delivered by the site) for identity, interface and data, stamp v32
- 2026-10-05: removed the cookie banner and every mention of advertising (there are no ads, no cookies, no tracking), stamp v31
- 2026-10-05: device code phishing explainer, 20 glossary terms (122 in total), stamp v30
- 2026-10-05: Entra app audit (12 checks, export script, inventory, cockpit tile), stamp v29
- 2026-10-05: license optimizer (9 checks, savings per month, editable prices, export script, cockpit tile), stamp v28
- 2026-10-05: share cards for 18 more tool and lab pages; cheat sheets for Entra PIM and access reviews, Windows Update, Teams Phone, stamp v27
- 2026-10-05: news bot: six more sources (Talos, Unit 42, The Record, advisories from Fortinet, Cisco, Palo Alto) with a per-source cap. VMware/Broadcom has no usable feed
- 2026-10-05: incident simulator, third scenario (insider data theft), stamp v26
- Dropped: single-source header and footer. With direct commits it saves nothing, and it would take the navigation out of the HTML (worse for search engines and for visitors without JavaScript)
- 2026-10-05: three checklists (Entra Connect upgrade, tenant migration prep, new admin first 30 days), stamp v25
- 2026-10-05: Intune fleet analyzer (15 checks, per-finding CSV, report, cockpit tile), stamp v24
- 2026-10-05: mail flow debugger (49 situations: bounces, SMTP errors, message trace, spam headers), stamp v23
- 2026-10-05: three cheat sheets (Defender XDR hunting, mail flow, Intune app deployment), 20 glossary terms, snippets of all new sheets searchable, stamp v22
- 2026-10-05: four cheat sheets (Active Directory, Entra Connect and hybrid join, BitLocker, Windows LAPS), stamp v21
- 2026-10-05: design pass 4 (calmer motion, directory listings, new footer), stamp v20
