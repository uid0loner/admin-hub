# admin_hub roadmap

How this works: the owner writes "WEITER", the next open item is built, tested and committed to `main`.
Cloudflare Pages publishes `admin_hub_site/` automatically. This file is not part of the published site.

## Next

1. Content: cheat sheets for Defender for Office 365, SharePoint sharing and guest access, Azure networking
2. Explainer: interactive diagram of how a device-code phishing attack works
3. Glossary: 20 more terms from the new cheat sheets and tools

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
