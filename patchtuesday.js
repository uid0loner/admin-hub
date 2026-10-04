(function(){
"use strict";
var $=function(i){return document.getElementById(i)};

// Patch Tuesday = the second Tuesday of the month, US time. We compute in UTC
// and treat "the day" loosely (Microsoft's own rollout spans US business hours),
// which is accurate enough for planning purposes.
function secondTuesday(year, monthIndex){
  var d = new Date(Date.UTC(year, monthIndex, 1));
  var dow = d.getUTCDay(); // 0=Sun..6=Sat
  var firstTuesday = 1 + ((2 - dow + 7) % 7);
  var second = firstTuesday + 7;
  return new Date(Date.UTC(year, monthIndex, second));
}

function fmtDate(d){
  return d.toLocaleDateString("en-US", {weekday:"long", year:"numeric", month:"long", day:"numeric", timeZone:"UTC"});
}

var DAY_MS = 86400000;
function daysUntil(d){
  var now = new Date();
  var nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - nowUTC) / DAY_MS);
}

function fmtDays(n){
  if(n === 0) return "today";
  if(n === 1) return "tomorrow";
  return "in " + n + " days";
}

var list = $("pt-list");
var now = new Date();
var y = now.getFullYear(), m = now.getMonth();

var dates = [];
// walk forward from current month; if this month's already passed, start next month
var cursorY = y, cursorM = m;
var thisMonthPT = secondTuesday(y, m);
if(daysUntil(thisMonthPT) < 0){
  cursorM += 1;
  if(cursorM > 11){ cursorM = 0; cursorY += 1; }
}
for(var i=0; i<8; i++){
  var mm = cursorM + i, yy = cursorY + Math.floor(mm/12);
  mm = ((mm % 12) + 12) % 12;
  dates.push(secondTuesday(yy, mm));
}

dates.forEach(function(d, idx){
  var days = daysUntil(d);
  var card = document.createElement("div");
  card.className = "card";
  var b = document.createElement("b");
  b.textContent = fmtDate(d);
  var p = document.createElement("p");
  p.textContent = idx === 0 ? ("Next Patch Tuesday — " + fmtDays(days)) : fmtDays(days);
  var sm = document.createElement("small");
  sm.textContent = idx === 0 ? "upcoming" : "";
  card.append(b, p, sm);
  list.append(card);
});
})();
