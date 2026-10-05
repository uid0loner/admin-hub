(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
function num(id,min,max,def){var e=$(id);if(!e)return def;var v=parseFloat(String(e.value).replace(",","."));if(isNaN(v))v=def;return Math.min(max,Math.max(min,v))}
function r1(v){return v>=100?Math.round(v).toLocaleString("en-US"):(Math.round(v*10)/10).toString()}
function dur(min){if(!isFinite(min))return "no limit";if(min<1)return "under a minute";if(min<90)return Math.round(min)+" min";var h=Math.floor(min/60),m=Math.round(min%60);return h+" h"+(m?" "+m+" min":"")}
function tile(k,v,s){var d=el("div","stat");d.append(el("span","stat-k",k));var b=el("b","stat-v",v);b.setAttribute("data-raw","1");d.append(b);if(s)d.append(el("span","stat-s",s));return d}
function finding(sev,title,text){var d=el("details","finding f-"+sev),s=el("summary");s.append(el("span","sevtag s-"+sev,{crit:"critical",high:"high",med:"medium",info:"info"}[sev]),el("b",null,title));d.append(s,el("p",null,text));if(sev==="crit"||sev==="high")d.open=true;return d}
function table(cols,rows){var w=el("div","tw"),t=el("table","tbl"),h=el("thead"),r=el("tr"),b=el("tbody");cols.forEach(function(c){r.append(el("th",null,c))});h.append(r);rows.forEach(function(x){var tr=el("tr");x.forEach(function(c){tr.append(el("td",null,c))});b.append(tr)});t.append(h,b);w.append(t);return w}
function bar(pct,label){var w=el("div","pwbar"),f=el("i");f.style.width=Math.min(100,Math.max(0,pct))+"%";if(pct>100)w.classList.add("over");else if(pct>80)w.classList.add("warn");w.append(f);w.setAttribute("role","img");w.setAttribute("aria-label",label);return w}
function hashGet(){var q={};location.hash.replace(/^#/,"").split("&").forEach(function(kv){var i=kv.indexOf("=");if(i>0)q[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1))});return q}
function hashSet(o){try{history.replaceState(null,"","#"+Object.keys(o).map(function(k){return k+"="+encodeURIComponent(o[k])}).join("&"))}catch(e){}}
function wire(ids,fn){var h=hashGet();ids.forEach(function(i){var e=$(i);if(!e)return;var k=i.slice(3);if(h[k]!==undefined)e.value=h[k];e.addEventListener("input",fn);e.addEventListener("change",fn)});fn()}
function keep(ids){var o={};ids.forEach(function(i){var e=$(i);if(e)o[i.slice(3)]=e.value});hashSet(o)}

/* ================= UPS ================= */
if($("up-out")){
  var UPL=[["pc","PC with monitor",120],["nb","Notebook on a dock",60],["sv","Rack server",220],["ts","Tower server",150],["na","NAS, four disks",50],["sw","Switch, 24 ports",30],["fw","Router or firewall",20],["ap","Access point or phone base",12]];
  var rows=$("up-rows");UPL.forEach(function(d){var l=el("label",null,d[1]+" ");l.append(el("span","dim","about "+d[2]+" W"));var i=el("input","sel");i.type="number";i.min="0";i.max="200";i.value=d[0]==="sv"||d[0]==="sw"||d[0]==="fw"?"1":"0";i.id="up-"+d[0];i.inputMode="numeric";l.append(i);rows.append(l)});
  var UIDS=UPL.map(function(d){return "up-"+d[0]}).concat(["up-other","up-va","up-pf","up-blocks","up-ah","up-target","up-age"]);
  var peukert=function(wh,volts,ah,load){if(load<=0)return Infinity;var I=load/(volts*0.9),H=20;return H*Math.pow(ah/(I*H),1.25)*60};
  var ups=function(){
    var load=num("up-other",0,100000,0),parts=[];UPL.forEach(function(d){var n=Math.round(num("up-"+d[0],0,200,0));if(n){load+=n*d[2];parts.push(n+" x "+d[1].toLowerCase())}});
    var va=num("up-va",100,200000,1500),pf=num("up-pf",0.5,1,0.9),cap=va*pf,blocks=Math.round(num("up-blocks",1,40,2)),ah=num("up-ah",1,200,9),volts=blocks*12,wh=volts*ah,target=num("up-target",1,600,10),age=num("up-age",0.3,1,1);
    var pct=cap?load/cap*100:0,tNew=peukert(wh,volts,ah,load),tNow=peukert(wh*age,volts,ah*age,load),out=$("up-out");out.replaceChildren();
    var st=el("div","stats");st.style.setProperty("--cols","4");
    st.append(tile("load",r1(load)+" W",parts.length?parts.length+" kinds of device":"enter the devices"),tile("of the UPS",load?Math.round(pct)+"%":"-","it can deliver "+r1(cap)+" W"),tile("runtime, new battery",load?dur(tNew):"-",r1(wh)+" Wh in the batteries"),tile("runtime, as it is now",load?dur(tNow):"-",age<1?"battery at "+Math.round(age*100)+"% of new":"same as new"));
    out.append(st,bar(pct,Math.round(pct)+" percent of the UPS capacity in use"));
    if(!load){out.append(el("p","dim","Enter how many of each device hang on the UPS, or type the measured load into the last field."));keep(UIDS);return}
    if(pct>100)out.append(finding("crit","The UPS is overloaded","The devices draw "+r1(load)+" W and the UPS can deliver "+r1(cap)+" W. It will switch to bypass or shut down the moment the mains fail, which is the one moment it is there for. Note that the VA figure on the box is not watts: "+va+" VA at a power factor of "+pf+" is "+r1(cap)+" W."));
    else if(pct>80)out.append(finding("high","Little headroom","Above 80% the runtime drops steeply, the batteries age faster, and one more device or a server under full load tips it over. Plan for 50 to 70%."));
    if(tNow<5&&pct<=100)out.append(finding("high","Not enough time for a clean shutdown","A server needs three to five minutes to shut down once it is told to, and the UPS should not be run completely empty. With "+dur(tNow)+" there is no margin: the machines lose power in the middle of shutting down."));
    else if(tNow<target&&pct<=100)out.append(finding("med","Shorter than your target","You want "+dur(target)+", the estimate is "+dur(tNow)+"."));
    if(pct<=100){var need=null,a;for(a=1;a<=400;a+=0.5){if(peukert(volts*a*age,volts,a*age,load)>=target){need=a;break}}
      var rows2=[["Halve the load","Take everything off that does not need to survive an outage: monitors, printers, PCs that can simply restart.",dur(peukert(wh*age,volts,ah*age,load/2))]];
      if(need&&need>ah)rows2.push(["More battery","At this load, "+dur(target)+" needs about "+r1(need)+" Ah per string of "+volts+" V. That means an extended battery pack, or a larger UPS.","about "+dur(target)]);
      out.append(el("h2",null,"what changes the runtime"),table(["Change","How","Runtime then"],rows2))}
    out.append(el("h2",null,"what to set"),table(["Setting","Value","Why"],[
      ["Start the shutdown when","about "+dur(Math.max(1,tNow*0.4))+" on battery, or at 50% charge","Leaves time for the shutdown itself and a reserve for a second outage right after the first."],
      ["Do not start the servers again before","the battery is back at 30 to 50%","Otherwise the next flicker catches them with an empty UPS."],
      ["Replace the batteries","after three to five years, or when the self-test fails","Lead batteries lose capacity every year, faster in a warm room."]]));
    keep(UIDS)};
  wire(UIDS,ups);
}

/* ================= PoE ================= */
if($("po-out")){
  var CL=[["c1","Class 1","4","door sensors, small IoT devices"],["c2","Class 2","7","desk phones, simple cameras"],["c3","Class 3 (PoE, 802.3af)","15.4","Wi-Fi 5 access points, cameras, video phones"],["c4","Class 4 (PoE+, 802.3at)","30","Wi-Fi 6 access points, PTZ cameras, small displays"],["c6","Class 6 (PoE++, 802.3bt)","60","Wi-Fi 6E and 7 access points, thin clients"],["c8","Class 8 (PoE++, 802.3bt)","90","displays, small switches, lighting"]];
  var pr=$("po-rows");CL.forEach(function(c){var l=el("label",null,c[1]+" ");l.append(el("span","dim",c[2]+" W each: "+c[3]));var i=el("input","sel");i.type="number";i.min="0";i.max="400";i.value=c[0]==="c2"?"12":c[0]==="c4"?"6":"0";i.id="po-"+c[0];i.inputMode="numeric";l.append(i);pr.append(l)});
  var PIDS=CL.map(function(c){return "po-"+c[0]}).concat(["po-budget","po-ports","po-mode"]);
  var poe=function(){var budget=num("po-budget",1,10000,370),ports=Math.round(num("po-ports",1,400,24)),mode=$("po-mode").value,sum=0,n=0,rows=[],max=0;
    CL.forEach(function(c){var k=Math.round(num("po-"+c[0],0,400,0)),w=parseFloat(c[2]);if(!k)return;var each=mode==="class"?w:w*0.6;sum+=k*each;n+=k;max=Math.max(max,w);rows.push([c[1],String(k),r1(each)+" W",r1(k*each)+" W"])});
    var pct=sum/budget*100,out=$("po-out");out.replaceChildren();
    var st=el("div","stats");st.style.setProperty("--cols","4");
    st.append(tile("needed",r1(sum)+" W",mode==="class"?"reserved by class":"typical draw"),tile("of the budget",n?Math.round(pct)+"%":"-",r1(budget)+" W available"),tile("left over",r1(Math.max(0,budget-sum))+" W",sum>budget?r1(sum-budget)+" W short":"headroom"),tile("powered ports",n+" of "+ports,n>ports?"more devices than ports":""));
    out.append(st,bar(pct,Math.round(pct)+" percent of the PoE budget in use"));
    if(!n){out.append(el("p","dim","Enter how many devices of each class the switch has to feed."));keep(PIDS);return}
    if(sum>budget)out.append(finding("crit","The switch cannot power all of these","The devices need "+r1(sum)+" W and the switch has "+r1(budget)+" W. It powers ports in order of priority and port number until the budget is used up, and the rest stay dark. Which ones depends on which device was plugged in or started last, so the fault looks random: an access point that is dead after a power cut, a phone that restarts when a camera is added."));
    else if(pct>80)out.append(finding("high","Little headroom","Above 80% of the budget, one more device or a firmware update that raises a device's class is enough to push a port off. Access points also draw more when they are busy."));
    if(n>ports)out.append(finding("high","More devices than ports","You entered "+n+" powered devices for a switch with "+ports+" ports."));
    if(mode==="typical"&&sum<=budget)out.append(finding("info","This is the typical draw, not what the switch reserves","Many switches reserve the full class value for each port unless the device reports its real need by LLDP. Switch the calculation to \"reserved by class\" to see the worst case."));
    if(max>=60)out.append(finding("info","Check the port type","Classes 5 to 8 need ports that support 802.3bt. A PoE+ port gives such a device 30 W at most, and it then runs with reduced functions: fewer radios, lower brightness."));
    out.append(el("h2",null,"where the power goes"),table(["Class","Devices","Each","Together"],rows));
    keep(PIDS)};
  wire(PIDS,poe);
}
})();
