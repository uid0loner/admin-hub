# admin_hub roadmap

How this works: the owner writes "WEITER", the next open item is built, tested and committed to `main`.
Cloudflare Pages publishes `admin_hub_site/` automatically. This file is not part of the published site.

## Next

1. Content: cheat sheets for Defender XDR hunting, Exchange Online mail flow, Intune app deployment; 20 glossary terms
2. Tool (high effort): mail-flow debugger, paste a message trace or NDR and get the cause and the fix
3. Tool (high effort): Intune compliance analyzer, drop a device export and get gaps by platform
4. Checklists: Entra Connect upgrade, tenant-to-tenant migration prep, new-admin first 30 days
5. Design: single-source header and footer in shell.js so a nav change touches one file
6. Lab: third incident-simulator scenario (insider data theft)
7. Feeds: more sources for the news bot, vendor advisories for Fortinet, Cisco, VMware
8. Share cards (og images) for the remaining tool pages

## Needs real data from the owner

- Entra sign-in export (CSV) to verify column mapping in signin-analyzer
- Conditional Access policy export (JSON) for ca-analyzer
- A real .eml phishing sample for phish-analyzer

## Done

- 2026-10-05: four cheat sheets (Active Directory, Entra Connect and hybrid join, BitLocker, Windows LAPS), stamp v21
- 2026-10-05: design pass 4 (calmer motion, directory listings, new footer), stamp v20
