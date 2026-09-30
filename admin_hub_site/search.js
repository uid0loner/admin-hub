(function(){
var I=window.SITE_INDEX||[],ov,inp,ul,sel=0,res=[],prev,BONUS={"tool":2,"page":2};
function score(e,tk){var t=e[0].toLowerCase(),ty=e[2].toLowerCase(),k=(e[3]||"").toLowerCase(),s=BONUS[e[2]]||0;
for(var i=0;i<tk.length;i++){var w=tk[i];
if(t.indexOf(w)===0)s+=6;else if(t.indexOf(w)>-1)s+=4;else if(ty.indexOf(w)>-1)s+=2;else if(k.indexOf(w)>-1)s+=1;else return 0}
return s}
function find(q,max){var tk=String(q).toLowerCase().split(/\s+/).filter(Boolean);if(!tk.length)return[];
var r=[];I.forEach(function(e){var s=score(e,tk);if(s)r.push([s,e])});
r.sort(function(a,b){return b[0]-a[0]});return r.slice(0,max||12).map(function(x){return x[1]})}
function css(){if(document.getElementById("spal-css"))return;var s=document.createElement("style");s.id="spal-css";
s.textContent="#spal{position:fixed;inset:0;z-index:100;background:rgba(7,5,26,.82);display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px;font:14px/1.5 'JetBrains Mono',ui-monospace,monospace}#spal .bx{width:100%;max-width:640px;background:#0d0b2b;border:1px solid #b45cff;border-radius:8px;box-shadow:0 0 40px rgba(180,92,255,.35);overflow:hidden}#spal input{width:100%;box-sizing:border-box;background:transparent;border:0;border-bottom:1px solid #2a2466;color:#d6d9ff;font:inherit;font-size:16px;padding:14px 16px;outline:none}#spal ul{list-style:none;margin:0;padding:6px;max-height:50vh;overflow:auto}#spal li a{display:block;padding:8px 10px;border-radius:6px;color:#d6d9ff;text-decoration:none}#spal li[aria-selected=true] a{background:#1a1650;box-shadow:inset 0 0 0 1px #b45cff}#spal small{color:#8a86c9;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#spal .ty{float:right;color:#4da3ff;font-size:.8rem;margin-left:12px}#spal .ft{padding:8px 16px;border-top:1px solid #2a2466;color:#8a86c9;font-size:.8rem}";
document.head.appendChild(s)}
function open(q){if(ov)return;css();prev=document.activeElement;
ov=document.createElement("div");ov.id="spal";
var bx=document.createElement("div");bx.className="bx";bx.setAttribute("role","dialog");bx.setAttribute("aria-modal","true");bx.setAttribute("aria-label","Search");
inp=document.createElement("input");inp.type="text";inp.placeholder="Search tools, commands, error codes, terms ...";inp.setAttribute("role","combobox");inp.setAttribute("aria-expanded","true");inp.setAttribute("aria-controls","spal-list");inp.setAttribute("autocomplete","off");inp.spellcheck=false;
ul=document.createElement("ul");ul.id="spal-list";ul.setAttribute("role","listbox");
var ft=document.createElement("div");ft.className="ft";ft.textContent="Enter to open, arrows to move, Esc to close";
bx.append(inp,ul,ft);ov.append(bx);document.body.append(ov);
ov.addEventListener("mousedown",function(e){if(e.target===ov)close()});
inp.addEventListener("input",function(){draw(inp.value)});inp.addEventListener("keydown",key);
inp.value=q||"";draw(inp.value);inp.focus()}
function close(){if(!ov)return;ov.remove();ov=null;if(prev&&prev.focus)prev.focus()}
function draw(q){res=q.trim()?find(q,12):I.filter(function(e){return e[2]==="page"}).slice(0,12);sel=0;ul.replaceChildren();
if(!res.length){var n=document.createElement("li");n.style.cssText="padding:10px;color:#8a86c9";n.textContent="No results.";ul.append(n);inp.removeAttribute("aria-activedescendant");return}
res.forEach(function(e,i){var li=document.createElement("li");li.id="spal-"+i;li.setAttribute("role","option");li.setAttribute("aria-selected",i===0?"true":"false");
var a=document.createElement("a");a.href=e[1];var ty=document.createElement("span");ty.className="ty";ty.textContent=e[2];var b=document.createElement("b");b.textContent=e[0];a.append(ty,b);
if(e[3]){var sm=document.createElement("small");sm.textContent=e[3];a.append(sm)}
li.append(a);li.addEventListener("mousemove",function(){mark(i)});ul.append(li)});
inp.setAttribute("aria-activedescendant","spal-0")}
function mark(i){var c=ul.children;if(!c[sel]||!c[i])return;c[sel].setAttribute("aria-selected","false");sel=i;c[i].setAttribute("aria-selected","true");inp.setAttribute("aria-activedescendant","spal-"+i);c[i].scrollIntoView({block:"nearest"})}
function key(e){if(e.key==="Escape"){e.preventDefault();close()}else if(e.key==="ArrowDown"){e.preventDefault();mark(Math.min(sel+1,res.length-1))}else if(e.key==="ArrowUp"){e.preventDefault();mark(Math.max(sel-1,0))}else if(e.key==="Enter"){e.preventDefault();if(res[sel])location.href=res[sel][1]}else if(e.key==="Tab"){e.preventDefault()}}
document.addEventListener("keydown",function(e){var k=(e.key||"").toLowerCase();
if((e.ctrlKey||e.metaKey)&&k==="k"){e.preventDefault();ov?close():open();return}
if(k==="/"&&!ov){var t=e.target,n=t&&t.tagName;if(n==="INPUT"||n==="TEXTAREA"||n==="SELECT"||(t&&t.isContentEditable))return;e.preventDefault();open()}});
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-search]");if(t){e.preventDefault();open()}});
window.siteSearch=find;window.openPalette=open;
})();
