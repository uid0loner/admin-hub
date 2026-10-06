# admin_hub roadmap

How this works: the owner writes "WEITER", the next open item is built, tested and committed to `main`.
Cloudflare Pages publishes `admin_hub_site/` automatically. This file is not part of the published site.

## Next: six rounds to the masterpiece (plan of 2026-10-06)

Owner's rules: the site is for an IT all-rounder and covers everything in IT, including hardware with drawings.
Every round ("WEITER") adds a bit of everything, has one flagship piece that would normally cost money,
and may change design and GUI where it makes the site better. Colours stay. No ads, no cookies, no tracking.

Each round = 1 flagship + hardware (with drawings) + network + Linux + Windows + cloud/M365 + security +
data/automation + helpdesk + 1 design item. One round per "WEITER".

### Round 8 (v66): the documentation kit
- Flagship: IT documentation generator (network, servers, accounts, backups, contacts, emergency page; printable handbook, state kept in a file you save)
- Design: print style for the whole site (every tool and sheet prints clean, black on white, with date and page numbers)
- Hardware: cable guide with drawings (copper categories, fibre types and colours, DAC and AOC, lengths) and a voltage drop calculator
- Network: cable and port label maker (labels and QR codes to print, own QR generator)
- Procurement: licence and subscription tracker (renewal dates, cost per month, export)
- Monitoring: status page template and a small collection of uptime check scripts
- Windows: handover document for a domain (what to write down before you leave or take over)
- Helpdesk: user how-to cards to print (MFA set-up, VPN, printer, password reset)
- Peripherals: scanners, label printers and conference room gear, with drawings

### Round 9 (v67): security for small companies
- Flagship: firewall rule simulator (rules in, test packets through, first match shown, shadowed rules found)
- Design: severity and status language unified across all analyzers (one legend, one set of icons, readable without colour)
- Hardware: physical security and server room basics with drawings (locks, racks, climate, fire, power paths)
- Network: guest Wi-Fi and IoT separation, explained with a diagram and a checklist
- Linux and Windows: hardening compared side by side (the same twenty measures on both)
- Backup: 3-2-1 checker and restore drill planner
- Risk: risk register builder (ten typical risks pre-filled, printable for management)
- Config reviewer: TLS settings for nginx, Apache and IIS, plus Postfix
- Microsoft 365: two more war stories

### Round 10 (v68): cloud and automation
- Flagship: Docker Compose builder (services from a catalogue, volumes, networks, health checks, reviewed by the config reviewer)
- Design: code blocks everywhere get copy, wrap, line numbers and "explain this line"
- Explainers: Kubernetes in one diagram, CI pipeline in one diagram, infrastructure as code in one diagram
- Reference: the same thing in Azure, AWS and Google Cloud (name map of 60 services)
- Cheat sheets: kubectl, GitHub Actions, AWS CLI
- Calculator: cloud or on-premises cost comparison for a small server
- Scripts: script library with 30 reviewed admin scripts (Bash and PowerShell), each explained
- Hardware: home lab guide with drawings (mini PCs, used servers, power cost, noise)
- Git playground (commits, branches and the usual accidents, on a pretend repository)

### Round 11 (v69): the server room
- Flagship: virtualisation sizing calculator (hosts, cores, RAM, storage, failover reserve, licence count)
- Design: all hardware drawings reworked to one level of detail, with zoom and a legend
- Hardware: server deep dive with drawings (RAID controller and cache, backplane, redundant power, iDRAC, iLO, IPMI)
- Calculators: storage performance (IOPS and throughput per RAID level), backup size and window, power and cooling per rack
- Guide: moving from VMware to Proxmox or Hyper-V, step by step
- Walkthroughs: a virtual machine is slow; a server does not boot
- Windows: Hyper-V cluster and Storage Spaces checklist
- Linux: ZFS and Ceph explained with diagrams
- Network: 10 and 25 Gbit in practice (SFP types, DAC, compatibility)

### Round 12 (v70): helpdesk and people
- Flagship: onboarding kit generator (accounts, hardware, access, first-day sheet for the new colleague, printable)
- Design: mobile pass (bottom bar, larger touch targets, wizard and walkthroughs usable one-handed at the desk under the table)
- Helpdesk: ticket reply templates, remote support guide, ten more wizard trees (sound, camera, VPN, Outlook, Teams, slow Wi-Fi, USB, Bluetooth, battery, storage full)
- Hardware: monitor and ergonomics guide with drawings; mobile phone repair triage
- macOS for Windows admins; Windows for Mac admins
- Telephony and video: Teams and Zoom room problems
- Explainers: IT for non-IT (what a domain, DNS, backup and MFA are, one page each, to hand to management)
- Career: skill map for the all-rounder with learning paths through the site

### Round 13 (v71): polish
- Cockpit 2: every analyzer and planner can keep its result, one overview page, export of everything as one file
- Learning paths with progress, a first-visit tour, favourites and "recently used"
- Search 2: results grouped by kind, typo tolerant, commands searchable down to the single line
- Full accessibility pass (keyboard, screen reader, contrast), performance pass (size, first paint, offline), wording pass
- German version check of the translated interface
- Quality pass with real exports from the owner (see below)
- Changelog page, about page with the method (how things are tested, what is not)

Parked ideas: AD playground, Wireshark capture reader, GPO report reader, PowerShell transcript reader,
SNMP MIB browser, Exchange hybrid guide, print server migration, time and NTP troubleshooting.

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

- 2026-10-06: round 7, practise: packet journey (12 stations, 10 faults, quiz), PowerShell playground (own simulator, 48 cmdlets, 12 missions), Linux playground +5 missions (18), regex tester with explainer, incident simulator 4th scenario (13 decisions), switch port finder, disk full walkthrough, technician's toolkit (3 drawings; replaces the planned notebook repair guide, which the notebook hardware guide already covers), tenant audit in one hour, practise group in the tools hub with a shared progress bar, stamp v65
- 2026-10-06: round 6, the front door: home page with areas map and refreshed features, tools hub with area icons and filter, mail header reader, storage upgrade planner (3 drawings), systemd unit builder, subnet and VLAN poster, phishing drill kit, call quality walkthrough, file server migration checklist, SQL playground window functions (engine + 6 lessons, 66 queries verified against SQLite), stamp v64
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
