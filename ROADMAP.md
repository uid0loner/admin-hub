# admin_hub roadmap

How this works: the owner writes "WEITER", the next open item is built, tested and committed to `main`.
Cloudflare Pages publishes `admin_hub_site/` automatically. This file is not part of the published site.

## Next: breadth for the IT all-rounder

The site has become Microsoft 365 and Azure heavy. The owner is an all-rounder, so the next rounds go wide.
Microsoft cloud work is paused, not dropped (see the end of this list).

4. Linux server pack: systemd and journalctl troubleshooting, users and permissions, disks and LVM, nginx and Apache, a "the server is slow" walkthrough
5. Network pack: VLAN and IP plan builder (VLSM), switch and Wi-Fi troubleshooting, WireGuard and OpenVPN cheat sheets, DNS and DHCP at home-lab and small-office scale
6. Client and helpdesk pack: Windows stop codes and what they mean, printer troubleshooting, slow PC walkthrough, macOS admin cheat sheet, the 20 tickets every helpdesk gets
7. Virtualisation and storage: Proxmox, Hyper-V and VMware cheat sheets, NAS and SMART reading, snapshot is not a backup explainer
8. Log reader: paste a syslog, auth.log or web server log, get the noisy parts summarised (failed logins, top sources, error bursts)
9. Scripting pack: Bash and PowerShell side by side, Python for admins, a snippets library sorted by task
10. Small office blueprint: what a 10 to 50 person network should look like, as an interactive checklist with a shopping list

Paused Microsoft items: guided "audit my tenant in an hour" flow, two more war stories, quality pass with real exports from the owner.

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
