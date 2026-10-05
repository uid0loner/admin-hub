# admin_hub roadmap

How this works: the owner writes "WEITER", the next open item is built, tested and committed to `main`.
Cloudflare Pages publishes `admin_hub_site/` automatically. This file is not part of the published site.

## Next

1. Tool (high effort): mail-flow debugger, paste a message trace or NDR and get the cause and the fix
2. Tool (high effort): Intune compliance analyzer, drop a device export and get gaps by platform
3. Checklists: Entra Connect upgrade, tenant-to-tenant migration prep, new-admin first 30 days
4. Design: single-source header and footer in shell.js so a nav change touches one file
5. Lab: third incident-simulator scenario (insider data theft)
6. Feeds: more sources for the news bot, vendor advisories for Fortinet, Cisco, VMware
7. Share cards (og images) for the remaining tool pages
8. Content: cheat sheets for Entra PIM and access reviews, Windows Update for Business, Teams Phone

## Needs real data from the owner

- Entra sign-in export (CSV) to verify column mapping in signin-analyzer
- Conditional Access policy export (JSON) for ca-analyzer
- A real .eml phishing sample for phish-analyzer

## Done

- 2026-10-05: three cheat sheets (Defender XDR hunting, mail flow, Intune app deployment), 20 glossary terms, snippets of all new sheets searchable, stamp v22
- 2026-10-05: four cheat sheets (Active Directory, Entra Connect and hybrid join, BitLocker, Windows LAPS), stamp v21
- 2026-10-05: design pass 4 (calmer motion, directory listings, new footer), stamp v20
