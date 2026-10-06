const CACHE = "admin-hub-v65";
const PRECACHE = ["packet-journey.html", "powershell-playground.html", "regex-tester.html", "switch-port-finder.html", "disk-full-log-cleanup.html", "technician-toolkit-guide.html", "tenant-audit-one-hour-checklist.html", "packetjourney.js", "practise.js", "pssim.js", "psplay.js", "regextest.js", "mail-header-reader.html", "systemd-unit-builder.html", "storage-upgrade-planner.html", "subnet-vlan-poster.html", "phishing-drill-kit.html", "call-quality-troubleshooting.html", "file-server-migration-checklist.html", "mailhdr.js", "sysdbuild.js", "storplan.js", "linux-playground.html", "network-diagram-builder.html", "pc-build-checker.html", "asset-inventory.html", "dhcp-not-working.html", "password-manager-rollout-checklist.html", "shellsim.js", "shellplay.js", "netdraw.js", "pcbuild.js", "assets.js", "sql-window-functions-cheat-sheet.html", "lets-encrypt-certbot-cheat-sheet.html", "cron-builder.html", "security-posters.html", "dns-not-resolving.html", "printer-hardware-guide.html", "device-management-explained.html", "monitoring-baseline-checklist.html", "cronbuild.js", "posters.js", "disk-wiping-cheat-sheet.html", "bios-settings-explained.html", "git-fix-it.html", "group-policy-not-applying.html", "wifi-channel-planner.html", "connection-string-builder.html", "incident-plan-builder.html", "hardware-buying-guide.html", "wifiplan.js", "connstr.js", "incplan.js", "rack-planner.html", "dcdiag-reader.html", "docker-container-troubleshooting.html", "uptime-sla-calculator.html", "network-hardware-guide.html", "mobile-device-checklist.html", "rackplan.js", "dcdiagread.js", "voip-sip-troubleshooting-cheat-sheet.html", "dmarc-report-reader.html", "beep-code-lookup.html", "ups-runtime-calculator.html", "poe-budget-calculator.html", "new-pc-setup-checklist.html", "dmarcread.js", "powercalc.js", "snmp-monitoring-cheat-sheet.html", "ansible-cheat-sheet.html", "ntfs-share-permissions-cheat-sheet.html", "connector-identifier.html", "desktop-pc-hardware-guide.html", "notebook-hardware-guide.html", "server-hardware-guide.html", "connectors.js", "config-reviewer.html", "confreview.js", "sql-playground.html", "database-slow.html", "sqlengine.js", "sqldata.js", "sqlplay.js", "database-backup-restore-cheat-sheet.html", "sql-server-admin-cheat-sheet.html", "mysql-mariadb-admin-cheat-sheet.html", "postgresql-admin-cheat-sheet.html", "sql-basics-cheat-sheet.html", "small-office-blueprint.html", "blueprint.js", "bash-powershell-side-by-side.html", "rosetta.js", "python-for-admins-cheat-sheet.html", "powershell-scripting-cheat-sheet.html", "bash-scripting-cheat-sheet.html", "log-reader.html", "logread.js", "smart-reader.html", "snapshot-is-not-a-backup.html", "smartread.js", "zfs-nas-cheat-sheet.html", "vmware-esxi-cheat-sheet.html", "hyper-v-cheat-sheet.html", "proxmox-cheat-sheet.html", "stop-code-lookup.html", "helpdesk-top-tickets.html", "windows-pc-slow.html", "refcards.js", "printer-troubleshooting-cheat-sheet.html", "macos-admin-cheat-sheet.html", "ip-plan-builder.html", "ipplan.js", "dns-dhcp-cheat-sheet.html", "switching-vlan-cheat-sheet.html", "openvpn-cheat-sheet.html", "wireguard-cheat-sheet.html", "linux-server-slow.html", "slowwalk.js", "nginx-apache-cheat-sheet.html", "linux-disks-lvm-cheat-sheet.html", "linux-users-permissions-cheat-sheet.html", "systemd-journalctl-cheat-sheet.html", "command-builder.html", "cmdbuild.js", "certificate-decoder.html", "certdecode.js", "raid-calculator.html", "backup-planner.html", "transfer-time-calculator.html", "calcs.js", "firewall-rule-reviewer.html", "fwreview.js", "ca-policy-builder.html", "cabuilder.js", "azure-networking-cheat-sheet.html", "sharepoint-sharing-cheat-sheet.html", "defender-office-365-cheat-sheet.html", "frame.js", "hub.js", "plex-400.woff2", "plex-600.woff2", "jbmono.woff2", "device-code-phishing-explained.html", "app-audit.html", "appaudit.js", "license-optimizer.html", "licenseopt.js", "teams-phone-cheat-sheet.html", "windows-update-cheat-sheet.html", "entra-pim-cheat-sheet.html", "new-admin-first-30-days-checklist.html", "tenant-migration-prep-checklist.html", "entra-connect-upgrade-checklist.html", "intune-analyzer.html", "intune.js", "mailflow-debugger.html", "mailflow.js", "intune-app-deployment-cheat-sheet.html", "mail-flow-cheat-sheet.html", "defender-xdr-hunting-cheat-sheet.html", "windows-laps-cheat-sheet.html", "bitlocker-cheat-sheet.html", "entra-connect-cheat-sheet.html", "active-directory-cheat-sheet.html", "404.html", "aadsts-lookup.html", "about.html", "admin-links.html", "aitm-help-desk.html", "aitm-phishing-explained.html", "autopilot-deployment-cheat-sheet.html", "azure-cli-cheat-sheet.html", "azure-limits-reference.html", "backup-disaster-recovery-checklist.html", "bicep-arm-cheat-sheet.html", "certificate-authentication-cheat-sheet.html", "cheat-sheets.html", "cheat.js", "check.js", "checklists.html", "compromised-account-response-checklist.html", "conditional-access-explained.html", "conditional-access-simulator.html", "consent.js", "contact.html", "crypto-quick-reference.html", "cve.html", "diag.js", "diagnose.html", "dns-record-types-reference.html", "docker-cheat-sheet.html", "docker-compose-cheat-sheet.html", "email-error-codes.html", "entra-id-hardening-checklist.html", "entra-id-roles-reference.html", "event-id-reference.html", "exchange-online-deep-dive.html", "explainers.html", "flow.js", "git-cheat-sheet.html", "glossary.html", "graph-cheat-sheet.html", "graph-permissions-reference.html", "group-policy-cheat-sheet.html", "home.js", "http-status-codes.html", "icon-192.png", "icon-512.png", "imprint.html", "index.html", "intune-defender-cheat-sheet.html", "kerberoast-service-account.html", "kerberos-explained.html", "kql-cheat-sheet.html", "license-comparison.html", "licenses.js", "linux-cheat-sheet.html", "log-file-locations-reference.html", "m365-security-checklist.html", "manifest.json", "networking-cheat-sheet.html", "news.html", "oauth-flow-explained.html", "og-default.png", "onboarding-offboarding-checklist.html", "openssl-cheat-sheet.html", "phish-or-legit.html", "pki-chain-explained.html", "powershell-cheat-sheet.html", "privacy.html", "purview-compliance-cheat-sheet.html", "ransomware-backup-gap.html", "regex-patterns-library.html", "reveal.js", "script-generator.html", "scriptgen.js", "search-index.js", "search.js", "security-self-check.html", "server-hardening-checklist.html", "sharepoint-teams-cheat-sheet.html", "site-onboarding-checklist.html", "ssh-cheat-sheet.html", "start-here.html", "style.css", "subnet-calculator.html", "subnetcalc.js", "incident-runbook.html", "runbook.js", "password-strength.html", "pwstrength.js", "status-center.html", "statuscenter.js", "product-lifecycle.html", "productlifecycle.js", "dns-lookup.html", "dnslookup.js", "patch-tuesday.html", "patchtuesday.js", "cvss-calculator.html", "cvss.js", "signin-analyzer.html", "signin.js", "shell.js", "translate.js", "phish-analyzer.html", "phishanalyzer.js", "cockpit.html", "cockpit.js", "domain-check.html", "domaincheck.js", "incident-sim.html", "incidentsim.js", "pwa.js", "attack-map.html", "attackmap.js", "ca-analyzer.html", "caanalyzer.js", "terraform-cheat-sheet.html", "tools.html", "war-stories.html", "wifi-network-cheat-sheet.html", "windows-server-roles-reference.html", "windows-troubleshooting-cheat-sheet.html"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return Promise.all(PRECACHE.map(function(url){
        return fetch(url, {redirect:"error"}).then(function(res){
          if(res && res.ok)return cache.put(url, res);
        }).catch(function(){ /* skip files that fail or redirect, don't block install */ });
      }));
    })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
    }).then(function(){ return self.clients.claim() })
  );
});

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET")return;
  var url = new URL(e.request.url);
  if(url.origin !== location.origin)return;
  var key = url.origin + url.pathname;   // cache without the ?v= stamp

  // Everything is network-first: a new deploy is visible at once and pages can
  // never be paired with a stale stylesheet. The cache is the offline fallback.
  e.respondWith(
    fetch(e.request).then(function(res){
      if(res && res.ok && !res.redirected && e.request.mode !== "navigate"){
        var copy = res.clone();
        caches.open(CACHE).then(function(cache){ cache.put(key, copy) });
      }
      return res;
    }).catch(function(){
      return caches.match(e.request, {ignoreSearch:true}).then(function(cached){
        if(cached)return cached;
        if(e.request.mode === "navigate")return caches.match("404.html");
        return Response.error();
      });
    })
  );
});
