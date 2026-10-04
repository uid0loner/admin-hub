const CACHE = "admin-hub-v2";
const PRECACHE = ["404.html", "aadsts-lookup.html", "about.html", "admin-links.html", "aitm-help-desk.html", "aitm-phishing-explained.html", "autopilot-deployment-cheat-sheet.html", "azure-cli-cheat-sheet.html", "azure-limits-reference.html", "backup-disaster-recovery-checklist.html", "bicep-arm-cheat-sheet.html", "certificate-authentication-cheat-sheet.html", "cheat-sheets.html", "cheat.js", "check.js", "checklists.html", "compromised-account-response-checklist.html", "conditional-access-explained.html", "conditional-access-simulator.html", "consent.js", "contact.html", "crypto-quick-reference.html", "cve.html", "diag.js", "diagnose.html", "dns-record-types-reference.html", "docker-cheat-sheet.html", "docker-compose-cheat-sheet.html", "email-error-codes.html", "entra-id-hardening-checklist.html", "entra-id-roles-reference.html", "event-id-reference.html", "exchange-online-deep-dive.html", "explainers.html", "flow.js", "git-cheat-sheet.html", "glossary.html", "graph-cheat-sheet.html", "graph-permissions-reference.html", "group-policy-cheat-sheet.html", "home.js", "http-status-codes.html", "icon-192.png", "icon-512.png", "imprint.html", "index.html", "intune-defender-cheat-sheet.html", "kerberoast-service-account.html", "kerberos-explained.html", "kql-cheat-sheet.html", "linux-cheat-sheet.html", "log-file-locations-reference.html", "m365-security-checklist.html", "manifest.json", "networking-cheat-sheet.html", "news.html", "oauth-flow-explained.html", "og-default.png", "onboarding-offboarding-checklist.html", "openssl-cheat-sheet.html", "phish-or-legit.html", "pki-chain-explained.html", "powershell-cheat-sheet.html", "privacy.html", "purview-compliance-cheat-sheet.html", "ransomware-backup-gap.html", "regex-patterns-library.html", "reveal.js", "script-generator.html", "scriptgen.js", "search-index.js", "search.js", "security-self-check.html", "server-hardening-checklist.html", "sharepoint-teams-cheat-sheet.html", "site-onboarding-checklist.html", "ssh-cheat-sheet.html", "start-here.html", "style.css", "terraform-cheat-sheet.html", "tools.html", "war-stories.html", "wifi-network-cheat-sheet.html", "windows-server-roles-reference.html", "windows-troubleshooting-cheat-sheet.html"];

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

  // Navigations go network-first so redirects (https, canonical host, etc.)
  // are always handled live by the browser; cache is only the offline fallback.
  if(e.request.mode === "navigate"){
    e.respondWith(
      fetch(e.request).catch(function(){
        return caches.match(e.request).then(function(cached){
          return cached || caches.match("404.html");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached){
      var network = fetch(e.request).then(function(res){
        if(res && res.ok && !res.redirected){
          var copy = res.clone();
          caches.open(CACHE).then(function(cache){ cache.put(e.request, copy) });
        }
        return res;
      }).catch(function(){
        return cached;
      });
      return (cached && !cached.redirected) ? cached : network;
    })
  );
});
