(function(){
var C=window.CHECK||[],o=document.getElementById("cl"),pg=document.getElementById("pg"),n=0,d=0;
function upd(){pg.textContent=d+" of "+n+" done"}
C.forEach(function(s){var h=document.createElement("h2");h.textContent=s.s;o.append(h);
s.i.forEach(function(it){n++;var l=document.createElement("label");l.className="chk";var c=document.createElement("input");c.type="checkbox";
c.addEventListener("change",function(){d+=c.checked?1:-1;upd()});
var t=document.createElement("span"),b=document.createElement("b");b.textContent=it[0];t.append(b);
if(it[1]){var m=document.createElement("small");m.textContent=it[1];t.append(m)}
l.append(c,t);o.append(l)})});
upd();
document.getElementById("rs").addEventListener("click",function(){o.querySelectorAll("input").forEach(function(c){c.checked=false});d=0;upd()});
document.getElementById("pr").addEventListener("click",function(){window.print()});
})();
