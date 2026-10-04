(function(){
"use strict";
var $=function(i){return document.getElementById(i)};

var RESOLVERS={
  cloudflare: "https://cloudflare-dns.com/dns-query",
  google: "https://dns.google/resolve"
};

var TYPE_CODE={A:1,NS:2,CNAME:5,SOA:6,MX:15,TXT:16,AAAA:28,CAA:257};
var CODE_TYPE={1:"A",2:"NS",5:"CNAME",6:"SOA",15:"MX",16:"TXT",28:"AAAA",257:"CAA"};

var nameInput=$("dl-name"), typeSel=$("dl-type"), resolverSel=$("dl-resolver");
var runBtn=$("dl-run"), status=$("dl-status"), results=$("dl-results");

function validHostname(h){
  if(!h || h.length>253) return false;
  return /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i.test(h);
}

function fetchWithTimeout(url, ms){
  var controller = ("AbortController" in window) ? new AbortController() : null;
  var opts = {headers:{"accept":"application/dns-json"}};
  if(controller) opts.signal = controller.signal;
  var timer = controller ? setTimeout(function(){controller.abort();}, ms) : null;
  return fetch(url, opts).finally(function(){ if(timer) clearTimeout(timer); });
}

function run(){
  var name = nameInput.value.trim().replace(/^https?:\/\//,"").replace(/\/.*$/,"");
  var type = typeSel.value;
  var resolverKey = resolverSel.value;

  results.replaceChildren();

  if(!validHostname(name)){
    status.textContent = "Enter a valid domain name, e.g. example.com";
    return;
  }

  runBtn.disabled = true;
  status.textContent = "Querying " + (resolverKey==="cloudflare"?"Cloudflare":"Google") + " over DNS-over-HTTPS…";

  var base = RESOLVERS[resolverKey];
  var url = base + "?name=" + encodeURIComponent(name) + "&type=" + encodeURIComponent(type);

  fetchWithTimeout(url, 6000)
    .then(function(r){
      if(!r.ok) throw new Error("http " + r.status);
      return r.json();
    })
    .then(function(data){
      renderResult(data, name, type);
    })
    .catch(function(err){
      var msg = (err && err.name === "AbortError")
        ? "No response within 6 seconds — the resolver may be unreachable from your network, or blocked by a firewall/proxy."
        : "Lookup failed — the resolver may be unreachable from your network, blocked by a firewall/extension, or temporarily down. Try the other resolver above.";
      status.textContent = msg;
    })
    .finally(function(){
      runBtn.disabled = false;
    });
}

function rcodeText(status){
  var map={0:"NOERROR",1:"FORMERR",2:"SERVFAIL",3:"NXDOMAIN (domain does not exist)",4:"NOTIMP",5:"REFUSED"};
  return map[status] || ("RCODE " + status);
}

function renderResult(data, name, type){
  if(typeof data.Status === "number" && data.Status !== 0){
    status.textContent = "Response: " + rcodeText(data.Status) + " for " + name + " (" + type + ")";
    return;
  }

  var answers = (data.Answer || []).filter(function(a){ return true; });
  if(!answers.length){
    status.textContent = "No " + type + " records found for " + name + ". The domain resolved, it just has none of this record type — try a different type above.";
    return;
  }

  status.textContent = answers.length + " record" + (answers.length===1?"":"s") + " for " + name + " (" + type + ")";

  var table = document.createElement("table");
  table.className = "tbl";
  var thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Name</th><th>Type</th><th>TTL</th><th>Value</th></tr>";
  var tbody = document.createElement("tbody");

  answers.forEach(function(a){
    var tr = document.createElement("tr");
    var tdName = document.createElement("td"); tdName.textContent = a.name;
    var tdType = document.createElement("td"); tdType.textContent = CODE_TYPE[a.type] || a.type;
    var tdTtl = document.createElement("td"); tdTtl.textContent = a.TTL + "s";
    var tdData = document.createElement("td"); tdData.textContent = a.data;
    tdData.style.wordBreak = "break-all";
    tr.append(tdName, tdType, tdTtl, tdData);
    tbody.append(tr);
  });

  table.append(thead, tbody);
  var wrap = document.createElement("div");
  wrap.className = "tw";
  wrap.append(table);
  results.append(wrap);
}

runBtn.addEventListener("click", run);
nameInput.addEventListener("keydown", function(e){ if(e.key === "Enter") run(); });
})();
