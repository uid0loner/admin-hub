(function(){
"use strict";
var $=function(i){return document.getElementById(i)};if(!$("rk-draw"))return;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function r1(v){return v>=100?Math.round(v).toLocaleString("en-US"):(Math.round(v*10)/10).toString()}
var PRE=[["Patch panel",1,2,0,"net"],["Switch, 24 or 48 ports",1,5,45,"net"],["PoE switch",1,7,400,"net"],["Cable manager",1,1,0,"net"],["Router or firewall",1,4,30,"net"],["Server, 1U",1,16,250,"srv"],["Server, 2U",2,28,400,"srv"],["Storage shelf, 4U",4,45,500,"srv"],["NAS, 2U",2,14,120,"srv"],["UPS, 2U",2,30,0,"pwr"],["UPS, 3U with battery pack",3,55,0,"pwr"],["Power strip (PDU), 1U",1,3,0,"pwr"],["Shelf with small devices",1,6,40,"oth"],["KVM console drawer",1,12,30,"oth"]];
var KIND={net:"network",srv:"servers and storage",pwr:"power",oth:"other"};
var st={h:42,v:230,a:16,items:[]},uid=1;
function add(name,u,kg,w,kind,at){st.items.push({id:uid++,n:name,u:u,kg:kg,w:w,k:kind,at:at||(kind==="net"?"top":"bottom")})}
function layout(){var top=st.items.filter(function(i){return i.at==="top"}),bot=st.items.filter(function(i){return i.at==="bottom"}),pos={},u=st.h,over=false;
  top.forEach(function(i){pos[i.id]={hi:u,lo:u-i.u+1};u-=i.u});var topEnd=u,b=1;
  bot.forEach(function(i){pos[i.id]={lo:b,hi:b+i.u-1};b+=i.u});
  if(b-1>topEnd)over=true;return{pos:pos,free:topEnd-(b-1),over:over,top:top,bot:bot}}
function auto(){var net=st.items.filter(function(i){return i.k==="net"}),rest=st.items.filter(function(i){return i.k!=="net"});
  net.forEach(function(i){i.at="top"});rest.forEach(function(i){i.at="bottom"});
  rest.sort(function(a,b){return (b.k==="pwr"&&b.kg>=20?1:0)-(a.k==="pwr"&&a.kg>=20?1:0)||b.kg/b.u-a.kg/a.u});
  var order={"Patch panel":0,"Cable manager":1};net.sort(function(a,b){return 0});
  /* interleave patch panels and switches with cable managers where they exist */
  var pp=net.filter(function(i){return /patch/i.test(i.n)}),sw=net.filter(function(i){return /switch/i.test(i.n)}),cm=net.filter(function(i){return /manager/i.test(i.n)}),ot=net.filter(function(i){return !/patch|switch|manager/i.test(i.n)}),seq=[];
  while(pp.length||sw.length){if(pp.length)seq.push(pp.shift());if(cm.length)seq.push(cm.shift());if(sw.length)seq.push(sw.shift())}
  st.items=seq.concat(cm,ot,rest)}
function draw(L){var H=st.h,uh=H>30?13:H>18?17:22,W=420,x0=64,rw=250,top=16,h=H*uh,s='<svg class="hwsvg rksvg" viewBox="0 0 '+W+' '+(h+top*2)+'" role="img" aria-label="Front view of the rack with '+st.items.length+' devices">';
  s+='<rect class="o" x="'+(x0-10)+'" y="'+(top-6)+'" width="'+(rw+20)+'" height="'+(h+12)+'" rx="4"/>';
  for(var u=1;u<=H;u++){var y=top+(H-u)*uh;s+='<rect class="rku" x="'+x0+'" y="'+y+'" width="'+rw+'" height="'+uh+'"/>';if(H<=24||u%2===1||u===H)s+='<text x="'+(x0-16)+'" y="'+(y+uh/2+3.5)+'" text-anchor="end">'+u+'</text>'}
  st.items.forEach(function(i){var p=L.pos[i.id];if(!p)return;var y=top+(H-p.hi)*uh,hh=i.u*uh,bad=p.lo<1||p.hi>H||(L.over);
    s+='<rect class="rkd k-'+i.k+(bad?" bad":"")+'" x="'+(x0+2)+'" y="'+(y+1)+'" width="'+(rw-4)+'" height="'+(hh-2)+'" rx="2"/>';
    s+='<text class="t2" x="'+(x0+10)+'" y="'+(y+hh/2+3.5)+'" text-anchor="start">'+esc(i.n.length>30?i.n.slice(0,29)+"…":i.n)+'</text>';
    s+='<text x="'+(x0+rw+18)+'" y="'+(y+hh/2+3.5)+'" text-anchor="start">'+(i.u>1?"U"+p.lo+"–"+p.hi:"U"+p.lo)+'</text>'});
  return s+"</svg>"}
function finding(sev,title,text){var d=el("details","finding f-"+sev),s=el("summary");s.append(el("span","sevtag s-"+sev,{crit:"critical",high:"high",med:"medium",info:"info"}[sev]),el("b",null,title));d.append(s,el("p",null,text));if(sev==="crit"||sev==="high")d.open=true;return d}
function tile(k,v,s){var d=el("div","stat");d.append(el("span","stat-k",k));var b=el("b","stat-v",v);b.setAttribute("data-raw","1");d.append(b);if(s)d.append(el("span","stat-s",s));return d}
function save(){try{var o={h:st.h,v:st.v,a:st.a,i:st.items.map(function(i){return [i.n,i.u,i.kg,i.w,i.k,i.at==="top"?1:0]})};history.replaceState(null,"","#r="+encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(o))))))}catch(e){}}
function load(){var m=/#r=(.+)$/.exec(location.hash);if(!m)return false;try{var o=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));st.h=Math.min(52,Math.max(4,+o.h||42));st.v=+o.v||230;st.a=+o.a||16;st.items=[];
    (o.i||[]).slice(0,60).forEach(function(x){add(String(x[0]).slice(0,60),Math.min(20,Math.max(1,+x[1]||1)),Math.max(0,+x[2]||0),Math.max(0,+x[3]||0),KIND[x[4]]?x[4]:"oth",x[5]?"top":"bottom")});return true}catch(e){return false}}
function render(){var L=layout(),used=st.items.reduce(function(t,i){return t+i.u},0),kg=st.items.reduce(function(t,i){return t+i.kg},0),w=st.items.reduce(function(t,i){return t+i.w},0),cap=st.v*st.a,amp=w/st.v;
  $("rk-draw").innerHTML=draw(L);
  var list=$("rk-list");list.replaceChildren();
  [["top","stacked from the top",L.top],["bottom","stacked from the bottom",L.bot.slice().reverse()]].forEach(function(g){if(!g[2].length)return;list.append(el("h3","rkh",g[1]));
    g[2].forEach(function(i){var p=L.pos[i.id],row=el("div","rkrow k-"+i.k);row.append(el("span","rkpos",i.u>1?"U"+p.lo+"–"+p.hi:"U"+p.lo),el("b",null,i.n),el("span","dim",i.u+"U · "+r1(i.kg)+" kg"+(i.w?" · "+i.w+" W":"")));
      var ctl=el("span","rkctl");[["↑","Move up",-1],["↓","Move down",1]].forEach(function(b){var x=el("button","rkb",b[0]);x.type="button";x.setAttribute("aria-label",b[1]+": "+i.n);x.addEventListener("click",function(){move(i,g[0]==="bottom"?-b[2]:b[2])});ctl.append(x)});
      var sw=el("button","rkb",g[0]==="top"?"to bottom":"to top");sw.type="button";sw.setAttribute("aria-label","Move "+i.n+(g[0]==="top"?" to the bottom stack":" to the top stack"));sw.addEventListener("click",function(){i.at=i.at==="top"?"bottom":"top";render()});
      var rm=el("button","rkb","×");rm.type="button";rm.setAttribute("aria-label","Remove "+i.n);rm.addEventListener("click",function(){st.items=st.items.filter(function(x){return x!==i});render()});
      ctl.append(sw,rm);row.append(ctl);list.append(row)})});
  if(!st.items.length)list.append(el("p","dim","The rack is empty. Add devices above, or load the example."));
  var out=$("rk-out");out.replaceChildren();var s=el("div","stats");s.style.setProperty("--cols","4");
  s.append(tile("height used",used+" of "+st.h+" U",L.over?"does not fit":L.free+" U free"),tile("weight",r1(kg)+" kg","without the rack itself"),tile("power",r1(w)+" W",r1(amp)+" A at "+st.v+" V"),tile("heat",r1(w*3.412)+" BTU/h","what the cooling has to remove"));
  out.append(s);
  if(L.over)out.append(finding("crit","It does not fit","The devices need "+used+" U and the rack has "+st.h+" U. The drawing shows them overlapping in red."));
  else if(st.items.length&&L.free<Math.max(2,Math.round(st.h*0.1)))out.append(finding("med","No room to grow","Fewer than "+Math.max(2,Math.round(st.h*0.1))+" U are free. The next switch or server has nowhere to go, and a full rack is harder to cool and to work in."));
  if(w>cap)out.append(finding("crit","More power than the circuit can deliver","The devices draw "+r1(w)+" W and a "+st.a+" A circuit at "+st.v+" V delivers "+r1(cap)+" W. The breaker trips, and everything on it goes down at once."));
  else if(w>cap*0.8)out.append(finding("high","The circuit is loaded above 80%","Continuous loads should stay below 80% of the breaker's rating, here "+r1(cap*0.8)+" W. Split the rack over two circuits, which you want for redundant power supplies anyway."));
  var high=st.items.filter(function(i){var p=L.pos[i.id];return i.kg>=20&&p&&p.lo>st.h/2});
  if(high.length)out.append(finding("high","Heavy devices in the upper half",high.map(function(i){return i.n+" ("+r1(i.kg)+" kg)"}).join(", ")+". A top-heavy rack can tip when a server is pulled out on its rails, and lifting 25 kg above shoulder height onto rails is how backs and servers get hurt. Heavy goes at the bottom."));
  var ups=st.items.filter(function(i){return i.k==="pwr"&&i.kg>=20}),lowest=L.bot[0];
  if(ups.length&&lowest&&ups.indexOf(lowest)<0&&ups.some(function(i){return i.at==="bottom"}))out.append(finding("med","The UPS is not at the very bottom","A UPS is the heaviest thing per unit in the rack, and its batteries can leak. It belongs in the lowest position."));
  if(ups.some(function(i){return i.at==="top"}))out.append(finding("high","A UPS in the top stack","Move it to the bottom: it is the heaviest device, and the batteries are swapped every few years."));
  if(kg>600)out.append(finding("med","Check the load rating","More than 600 kg. Check the static load rating of the rack and what the floor carries, above all on a raised floor."));
  var sw=st.items.filter(function(i){return /switch/i.test(i.n)}).length,cmn=st.items.filter(function(i){return /manager/i.test(i.n)}).length,ppn=st.items.filter(function(i){return /patch/i.test(i.n)}).length;
  if(sw+ppn>=3&&!cmn)out.append(finding("info","No cable management","With several switches and patch panels, a 1U cable manager between each pair keeps patch cables short and the labels readable."));
  if(st.items.length&&!L.over&&L.free>0)out.append(finding("info","Close the empty units",L.free+" U stay open. Blanking panels keep the hot air at the back from coming round to the front."));
  if(st.items.some(function(i){return i.k==="srv"})&&!ups.length)out.append(finding("info","No UPS in the plan","Servers without a UPS lose power the hard way. Size one with the UPS runtime calculator."));
  $("rk-h").value=st.h;$("rk-circ").value=st.v+"x"+st.a;save()}
function move(i,d){var g=st.items.filter(function(x){return x.at===i.at}),k=g.indexOf(i),j=k+d;if(j<0||j>=g.length)return;var a=st.items.indexOf(i),b=st.items.indexOf(g[j]);st.items[a]=g[j];st.items[b]=i;render()}
var sel=$("rk-pre");PRE.forEach(function(p,i){var o=el("option",null,p[0]+" ("+p[1]+"U)");o.value=i;sel.append(o)});
function fill(){var p=PRE[+sel.value];$("rk-name").value=p[0];$("rk-u").value=p[1];$("rk-kg").value=p[2];$("rk-w").value=p[3]}
sel.addEventListener("change",fill);fill();
$("rk-add").addEventListener("click",function(){var p=PRE[+sel.value],n=$("rk-name").value.trim()||p[0],c=Math.min(20,Math.max(1,parseInt($("rk-count").value,10)||1));
  for(var k=0;k<c&&st.items.length<60;k++)add(n.slice(0,60),Math.min(20,Math.max(1,parseInt($("rk-u").value,10)||1)),Math.max(0,parseFloat($("rk-kg").value)||0),Math.max(0,parseFloat($("rk-w").value)||0),p[4]);render()});
$("rk-h").addEventListener("change",function(){st.h=Math.min(52,Math.max(4,parseInt($("rk-h").value,10)||42));render()});
$("rk-circ").addEventListener("change",function(){var x=$("rk-circ").value.split("x");st.v=+x[0];st.a=+x[1];render()});
$("rk-auto").addEventListener("click",function(){auto();render()});
$("rk-clear").addEventListener("click",function(){st.items=[];render()});
function sample(){st.h=24;st.items=[];add("Patch panel A",1,2,0,"net");add("Cable manager",1,1,0,"net");add("PoE switch, floor 1",1,7,400,"net");add("Patch panel B",1,2,0,"net");add("Switch, servers",1,5,45,"net");add("Firewall",1,4,30,"net");
  add("UPS, 2U",2,30,0,"pwr");add("Storage shelf, 4U",4,45,500,"srv");add("Server, 2U: hypervisor 1",2,28,400,"srv");add("Server, 2U: hypervisor 2",2,28,400,"srv");add("NAS, 2U: backup",2,14,120,"srv");add("KVM console drawer",1,12,30,"oth");render()}
$("rk-sample").addEventListener("click",sample);
$("rk-copy").addEventListener("click",function(){var L=layout(),rows=st.items.map(function(i){var p=L.pos[i.id];return{hi:p.hi,t:(i.u>1?"U"+p.lo+"-"+p.hi:"U"+p.lo)+"\t"+i.n+"\t"+i.u+"U\t"+i.kg+" kg\t"+i.w+" W"}}).sort(function(a,b){return b.hi-a.hi}).map(function(r){return r.t});
  var t="Rack plan, "+st.h+"U\nPosition\tDevice\tHeight\tWeight\tPower\n"+rows.join("\n"),b=$("rk-copy");
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy as a table"},1500)},function(){b.textContent="Copying is blocked here"})});
$("rk-print").addEventListener("click",function(){window.print()});
if(!load())sample();else render();
})();
