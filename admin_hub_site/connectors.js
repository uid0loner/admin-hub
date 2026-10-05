(function(){"use strict";
var q=document.getElementById("cn-q"),grid=document.getElementById("cn-grid");if(!q||!grid)return;
var cards=[].slice.call(grid.querySelectorAll(".cncard")),chips=[].slice.call(document.querySelectorAll(".cnchip")),n=document.getElementById("cn-n"),none=document.getElementById("cn-none"),fam="";
cards.forEach(function(c){c._t=c.textContent.toLowerCase()});
function apply(){var words=q.value.toLowerCase().trim().split(/\s+/).filter(Boolean),k=0;
 cards.forEach(function(c){var ok=(!fam||c.getAttribute("data-f")===fam)&&words.every(function(w){return c._t.indexOf(w)>=0});c.hidden=!ok;if(ok)k++});
 n.textContent=k+" of "+cards.length;none.hidden=k>0}
q.addEventListener("input",apply);
chips.forEach(function(b){b.addEventListener("click",function(){fam=b.getAttribute("data-f");chips.forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});apply()})});
var m=/[?&]q=([^&]*)/.exec(location.search);if(m){try{q.value=decodeURIComponent(m[1].replace(/\+/g," "))}catch(e){}}
apply();
})();
