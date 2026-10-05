# admin_hub roadmap

How this works: the owner writes "WEITER", the next open item is built, tested and committed to `main`.
Cloudflare Pages publishes `admin_hub_site/` automatically. This file is not part of the published site.

## Next

1. Checklists: Entra Connect upgrade, tenant-to-tenant migration prep, new-admin first 30 days
2. Design: single-source header and footer in shell.js so a nav change touches one file
3. Lab: third incident-simulator scenario (insider data theft)
4. Feeds: more sources for the news bot, vendor advisories for Fortinet, Cisco, VMware
5. Share cards (og images) for the remaining tool pages
6. Content: cheat sheets for Entra PIM and access reviews, Windows Update for Business, Teams Phone
7. Tool (high effort): licence optimizer, drop the user and licence export and find unused, duplicate and oversized licences

## Needs real data from the owner

- Entra sign-in export (CSV) to verify column mapping in signin-analyzer
- Conditional Access policy export (JSON) for ca-analyzer
- A real .eml phishing sample for phish-analyzer
- A real Intune device export (CSV, all columns) to verify the column names in intune-analyzer
- Real bounce messages (NDRs) that the mail flow debugger gets wrong or only reads by code class

## Done

- 2026-10-05: Intune fleet analyzer (15 checks, per-finding CSV, report, cockpit tile), stamp v24
- 2026-10-05: mail flow debugger (49 situations: bounces, SMTP errors, message trace, spam headers), stamp v23
- 2026-10-05: three cheat sheets (Defender XDR hunting, mail flow, Intune app deployment), 20 glossary terms, snippets of all new sheets searchable, stamp v22
- 2026-10-05: four cheat sheets (Active Directory, Entra Connect and hybrid join, BitLocker, Windows LAPS), stamp v21
- 2026-10-05: design pass 4 (calmer motion, directory listings, new footer), stamp v20
