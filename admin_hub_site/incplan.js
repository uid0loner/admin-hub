(function(){
"use strict";
var $=function(i){return document.getElementById(i)};if(!$("ip2-plan"))return;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
var F=[["company","Company or site","Example Ltd, main office"],
 ["lead","Who decides in an incident","name, mobile number"],["deputy","Deputy, when that person cannot be reached","name, mobile number"],
 ["it","IT contact","internal admin or the person who knows the systems: name, mobile number"],["provider","External IT provider","company, emergency number, customer or contract number"],
 ["insurer","Cyber insurance","insurer, emergency hotline, policy number"],["privacy","Data protection contact","name, number"],
 ["bank","Bank","hotline to block payments and cards"],["isp","Internet and phone provider","fault hotline, customer number"],
 ["backup","Backups","where they are, and who can restore"],["secrets","Emergency passwords","where the sealed envelope or the offline copy of the password vault is"],
 ["channel","How we talk when mail and chat are down","for example: a phone list on paper, a messenger group on private phones"],["authority","Police and authorities","local police number for cybercrime, national CERT if you have a contact"]];
var grid=$("ip2-form");
F.forEach(function(f){var l=el("label",null,f[1]),i=el(f[0]==="backup"||f[0]==="channel"?"textarea":"input","sel");if(i.tagName==="INPUT")i.type="text";else i.rows=2;i.id="ip2-"+f[0];i.placeholder=f[2];i.autocomplete="off";i.maxLength=300;l.append(i);grid.append(l);i.addEventListener("input",render)});
$("ip2-gdpr").addEventListener("change",render);
var FIRST=["Stay calm and write down the time. From now on, note what you see and what you do, with the time.","Do not switch the affected computer off. Pull its network cable or switch off its Wi-Fi instead: that stops the spread and keeps the evidence.","Do not delete anything, do not try to clean up, do not pay and do not answer the attackers.","Call the person who decides. By phone, not by mail: the mail system may be part of the problem.","Take photos of what is on the screen with a phone.","Tell colleagues nearby not to open the same mail or file, and to keep working only on what is not affected."];
var NEXT=["The decider calls the IT contact and, if there is one, the insurer's hotline. Many policies require the call before anything else is done, and the insurer sends specialists.","Decide together what is disconnected: single machines, a department, the internet line.","Change the passwords of the affected accounts from a clean device, administrator accounts first, and sign out all their sessions.","Check that the backups are intact and out of reach. Do not connect a backup disk to a machine that may be infected.","If money is involved (a fake invoice paid, changed bank details), call the bank at once: transfers can sometimes be recalled within hours."];
function val(k){return ($("ip2-"+k).value||"").trim()}
function plan(){var g=$("ip2-gdpr").checked,L={title:"If something happens: "+(val("company")||"our incident plan"),contacts:[],days:[]};
  [["lead","Decides"],["deputy","Deputy"],["it","IT"],["provider","IT provider"],["insurer","Insurance"],["privacy","Data protection"],["bank","Bank"],["isp","Internet and phone"],["authority","Police and authorities"]].forEach(function(x){L.contacts.push([x[1],val(x[0])])});
  L.days=["Report to the police. It costs nothing and insurers usually ask for it."];
  if(g)L.days.push("If personal data may have been seen, copied or lost: the data protection authority must be told within 72 hours of noticing (GDPR Article 33). The clock started when you found out. The data protection contact decides and files the report.");
  L.days.push("Tell customers and partners yourself, before they hear it elsewhere. One person speaks for the company: the decider, or someone they name.","Restore only onto systems that were cleaned or rebuilt, and only after you know how the attackers got in.","Afterwards: write down what happened and what will change. Update this page.");
  return L}
function render(){var L=plan(),p=$("ip2-plan");p.replaceChildren();
  p.append(el("h2","ip2t",L.title));p.append(el("p","ip2sub","Print this page. Hang it where people will look for it, and keep a copy at home: in an incident, files on the network cannot be read."));
  function block(title,items,ordered){p.append(el("h3",null,title));var l=el(ordered?"ol":"ul");items.forEach(function(x){l.append(el("li",null,x))});p.append(l)}
  block("The first 15 minutes, for whoever notices",FIRST,true);
  p.append(el("h3",null,"Who to call"));var t=el("table","tbl ip2tbl"),b=el("tbody");L.contacts.forEach(function(c){var r=el("tr");r.append(el("th",null,c[0]));var td=el("td",c[1]?null:"ip2empty",c[1]||"fill in");r.append(td);b.append(r)});t.append(b);p.append(t);
  block("The first hour, for the person who decides",NEXT,true);
  p.append(el("h3",null,"Where things are"));var u=el("ul");[["Backups",val("backup")],["Emergency passwords",val("secrets")],["How we talk when mail and chat are down",val("channel")]].forEach(function(x){var li=el("li");li.append(el("b",null,x[0]+": "),el("span",x[1]?null:"ip2empty",x[1]||"fill in"));u.append(li)});p.append(u);
  block("The first days",L.days,false);
  p.append(el("p","ip2foot","Last checked: ____________   by: ____________   Check the numbers twice a year."));
  var miss=F.filter(function(f){return f[0]!=="company"&&!val(f[0])}).length;$("ip2-status").textContent=miss?miss+" of "+(F.length-1)+" fields are still empty. Empty ones are marked on the plan.":"Everything is filled in."}
function md(){var L=plan(),o=["# "+L.title,"","## The first 15 minutes, for whoever notices",""];FIRST.forEach(function(x,i){o.push((i+1)+". "+x)});
  o.push("","## Who to call","");L.contacts.forEach(function(c){o.push("- **"+c[0]+":** "+(c[1]||"________"))});
  o.push("","## The first hour, for the person who decides","");NEXT.forEach(function(x,i){o.push((i+1)+". "+x)});
  o.push("","## Where things are","","- **Backups:** "+(val("backup")||"________"),"- **Emergency passwords:** "+(val("secrets")||"________"),"- **How we talk when mail and chat are down:** "+(val("channel")||"________"),"","## The first days","");L.days.forEach(function(x){o.push("- "+x)});
  o.push("","Last checked: ________ by: ________");return o.join("\n")}
$("ip2-print").addEventListener("click",function(){window.print()});
$("ip2-md").addEventListener("click",function(){var blob=new Blob([md()],{type:"text/markdown"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="incident-plan.md";document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)});
render();
})();
