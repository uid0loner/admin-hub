(function(){
"use strict";
var $=function(i){return document.getElementById(i)};

// Dates are the end of EXTENDED support (when security updates stop), verified against
// Microsoft's own lifecycle pages. Where a product shares a retirement date with others
// (e.g. Exchange 2016/2019, Office 2016/2019) that's Microsoft's own joint announcement,
// not a data-entry mistake. Always double-check via the linked official page before you
// act on a specific date — Microsoft does occasionally revise these.
var DATA=[
  ["Windows Server 2012", "2023-10-11", "windows-server-2012-r2-and-windows-server-2012"],
  ["Windows Server 2012 R2", "2023-10-11", "windows-server-2012-r2-and-windows-server-2012"],
  ["Windows Server 2016", "2027-01-13", "windows-server-2016"],
  ["Windows Server 2019", "2029-01-10", "windows-server-2019"],
  ["Windows Server 2022", "2031-10-15", "windows-server-2022"],
  ["Windows Server 2025", "2034-11-15", "windows-server-2025"],
  ["Windows 10 (22H2, final version)", "2025-10-15", "windows-10-home-and-pro"],
  ["Windows 11 22H2", "2024-10-09", "windows-11-home-and-pro"],
  ["Windows 11 23H2", "2025-11-12", "windows-11-home-and-pro"],
  ["Windows 11 24H2 (Home/Pro)", "2026-10-14", "windows-11-home-and-pro"],
  ["Exchange Server 2016", "2025-10-15", "exchange-server-2016"],
  ["Exchange Server 2019", "2025-10-15", "exchange-server-2019"],
  ["SQL Server 2016", "2026-07-15", "sql-server-2016"],
  ["SQL Server 2017", "2027-10-13", "sql-server-2017"],
  ["SQL Server 2019", "2030-01-09", "sql-server-2019"],
  ["SQL Server 2022", "2033-01-12", "sql-server-2022"],
  ["Office 2016", "2025-10-15", "office-2016"],
  ["Office 2019", "2025-10-15", "office-2019"],
  ["Office LTSC 2021", "2026-10-14", "office-ltsc-2021"],
  ["SharePoint Server 2016", "2026-07-15", "sharepoint-server-2016"],
  ["SharePoint Server 2019", "2026-07-15", "sharepoint-server-2019"]
];

var ASOF = new Date("2026-10-01T00:00:00Z");
$("pl-asof").textContent = ASOF.toLocaleDateString("en-US", {year:"numeric", month:"long", day:"numeric"});

var DAY_MS = 86400000;

function daysUntil(dateStr){
  var target = new Date(dateStr + "T00:00:00Z");
  var now = new Date();
  var nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - nowUTC) / DAY_MS);
}

function fmtDate(dateStr){
  var d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {year:"numeric", month:"long", day:"numeric", timeZone:"UTC"});
}

function statusFor(days){
  if(days < 0) return {label:"End of support (" + fmtAgo(-days) + " ago)", cls:"st-broken", eol:true};
  if(days === 0) return {label:"Ends support today", cls:"st-broken", eol:false};
  if(days <= 180) return {label:"Ends in " + fmtAgo(days), cls:"st-legacy", eol:false};
  if(days <= 365) return {label:"Ends in " + fmtAgo(days), cls:"st-acceptable", eol:false};
  return {label:"Ends in " + fmtAgo(days), cls:"st-recommended", eol:false};
}

function fmtAgo(days){
  if(days < 60) return days + " day" + (days===1?"":"s");
  var months = Math.round(days/30.44);
  if(months < 24) return months + " month" + (months===1?"":"s");
  var years = (days/365.25);
  return years.toFixed(1) + " years";
}

var tbody = $("pl-body");
var rows = [];

DATA.forEach(function(item){
  var name = item[0], dateStr = item[1], slug = item[2];
  var days = daysUntil(dateStr);
  var status = statusFor(days);

  var tr = document.createElement("tr");
  tr.dataset.name = name.toLowerCase();
  tr.dataset.eol = status.eol ? "1" : "0";

  var tdName = document.createElement("td"); tdName.textContent = name;
  var tdDate = document.createElement("td"); tdDate.textContent = fmtDate(dateStr);
  var tdStatus = document.createElement("td");
  var b = document.createElement("b"); b.className = status.cls; b.textContent = status.label;
  tdStatus.append(b);
  var tdLink = document.createElement("td");
  var a = document.createElement("a"); a.href = "https://learn.microsoft.com/en-us/lifecycle/products/" + slug;
  a.target = "_blank"; a.rel = "noopener"; a.textContent = "verify ↗"; a.style.color="var(--violet)";
  tdLink.append(a);

  tr.append(tdName, tdDate, tdStatus, tdLink);
  tbody.append(tr);
  rows.push(tr);
});

// sort rows by urgency: soonest-to-expire (or most overdue) first
var withDays = DATA.map(function(item, i){ return {row: rows[i], days: daysUntil(item[1])}; });
withDays.sort(function(a,b){ return a.days - b.days; });
withDays.forEach(function(w){ tbody.append(w.row); });

var q = $("pl-q"), eolOnly = $("pl-eol-only");
function applyFilter(){
  var term = q.value.trim().toLowerCase();
  var onlyEol = eolOnly.checked;
  rows.forEach(function(tr){
    var matchesText = !term || tr.dataset.name.indexOf(term) !== -1;
    var matchesEol = !onlyEol || tr.dataset.eol === "1";
    tr.hidden = !(matchesText && matchesEol);
  });
}
q.addEventListener("input", applyFilter);
eolOnly.addEventListener("change", applyFilter);
})();
