(function(){
"use strict";
var $=function(i){return document.getElementById(i)};

var STATUS_PAGES=[
  ["Microsoft 365", "https://admin.microsoft.com/Adminportal/Home#/servicehealth", "Requires admin sign-in — the authoritative source for your tenant"],
  ["Azure", "https://azure.status.microsoft/en-us/status", "Public, no login required"],
  ["Entra ID / Azure AD", "https://azure.status.microsoft/en-us/status", "Listed under Azure Active Directory on the Azure status page"],
  ["GitHub", "https://www.githubstatus.com", "Public status page"],
  ["Cloudflare", "https://www.cloudflarestatus.com", "Public status page"],
  ["Google Workspace", "https://www.google.com/appsstatus/dashboard/", "Public status page"],
  ["Slack", "https://slack-status.com", "Public status page"],
  ["AWS", "https://health.aws.amazon.com/health/status", "Public status page"]
];

var links=$("status-links");
STATUS_PAGES.forEach(function(s){
  var a=document.createElement("a"); a.className="card"; a.href=s[1]; a.target="_blank"; a.rel="noopener";
  var b=document.createElement("b"); b.textContent=s[0];
  var p=document.createElement("p"); p.textContent=s[2];
  var sm=document.createElement("small"); sm.textContent="open status page ↗";
  a.append(b,p,sm); links.append(a);
});

var ENDPOINTS=[
  ["Microsoft 365 sign-in", "https://login.microsoftonline.com/favicon.ico"],
  ["Exchange Online / Outlook", "https://outlook.office365.com/favicon.ico"],
  ["Microsoft Graph", "https://graph.microsoft.com/favicon.ico"],
  ["Office.com", "https://www.office.com/favicon.ico"],
  ["Azure portal", "https://portal.azure.com/favicon.ico"],
  ["Teams", "https://teams.microsoft.com/favicon.ico"]
];

var runBtn=$("cc-run"), ccStatus=$("cc-status"), results=$("cc-results");

function probe(url, timeoutMs){
  return new Promise(function(resolve){
    var done=false;
    var start=performance.now();
    var timer=setTimeout(function(){
      if(done)return; done=true;
      resolve({ok:false, timeout:true, ms:timeoutMs});
    }, timeoutMs);

    fetch(url, {mode:"no-cors", cache:"no-store"})
      .then(function(){
        if(done)return; done=true; clearTimeout(timer);
        resolve({ok:true, ms:Math.round(performance.now()-start)});
      })
      .catch(function(){
        if(done)return; done=true; clearTimeout(timer);
        resolve({ok:false, timeout:false, ms:Math.round(performance.now()-start)});
      });
  });
}

function run(){
  runBtn.disabled=true;
  ccStatus.textContent="Running…";
  results.replaceChildren();

  var rows={};
  ENDPOINTS.forEach(function(ep){
    var row=document.createElement("div"); row.className="chk"; row.style.cursor="default";
    var dot=document.createElement("span"); dot.className="statusdot pending"; dot.setAttribute("aria-hidden","true");
    var span=document.createElement("span"), b=document.createElement("b"), sm=document.createElement("small");
    b.textContent=ep[0]; sm.textContent="checking…";
    span.append(b,sm);
    row.append(dot,span);
    results.append(row);
    rows[ep[0]]={row:row, dot:dot, sm:sm};
  });

  var promises=ENDPOINTS.map(function(ep){
    return probe(ep[1], 5000).then(function(r){
      var ui=rows[ep[0]];
      if(r.ok){
        ui.dot.className="statusdot ok";
        ui.sm.textContent="reachable (" + r.ms + " ms)";
      } else if(r.timeout){
        ui.dot.className="statusdot bad";
        ui.sm.textContent="no response within " + (r.ms/1000) + "s — could be an outage, or a firewall/proxy blocking it";
      } else {
        ui.dot.className="statusdot bad";
        ui.sm.textContent="request blocked or failed — could be an outage, or a firewall/proxy/ad blocker on your side";
      }
    });
  });

  Promise.all(promises).then(function(){
    runBtn.disabled=false;
    var okCount=Object.keys(rows).filter(function(k){return rows[k].dot.className==="statusdot ok"}).length;
    ccStatus.textContent=okCount+" of "+ENDPOINTS.length+" reachable";
  });
}

runBtn.addEventListener("click", run);
})();
