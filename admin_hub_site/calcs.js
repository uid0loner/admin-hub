(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
function num(id,min,max,def){var v=parseFloat(String($(id).value).replace(",","."));if(isNaN(v))v=def;return Math.min(max,Math.max(min,v))}
function round(v){return v>=100?Math.round(v).toLocaleString("en-US"):v>=10?(Math.round(v*10)/10).toString():(Math.round(v*100)/100).toString()}
function size(gb){return gb>=1e6?round(gb/1e6)+" PB":gb>=1000?round(gb/1000)+" TB":gb>=1?round(gb)+" GB":round(gb*1000)+" MB"}
function dur(s){
  if(!isFinite(s))return "never";if(s<1)return "under a second";if(s<60)return Math.round(s)+" s";
  var m=Math.round(s/60);if(m<60)return m+" min";var h=Math.floor(m/60),mm=m%60;if(h<24)return h+" h"+(mm?" "+mm+" min":"");
  var d=Math.floor(h/24),hh=h%24;if(d<60)return d+(d===1?" day":" days")+(hh?" "+hh+" h":"");
  if(d<730)return round(d/30.44)+" months";return round(d/365.25)+" years";
}
function pct(p){return p>0.95?"over 95%":p<0.0005?"under 0.1%":p<0.1?(Math.round(p*1000)/10)+"%":Math.round(p*100)+"%"}
function tile(k,v,s){var d=el("div","stat");d.append(el("span","stat-k",k),el("b","stat-v",v));if(s)d.append(el("span","stat-s",s));return d}
function table(cols,rows){var w=el("div","tw"),t=el("table","tbl"),h=el("thead"),r=el("tr"),b=el("tbody");cols.forEach(function(c){r.append(el("th",null,c))});h.append(r);
  rows.forEach(function(x){var tr=el("tr");if(x.cls)tr.className=x.cls;(x.cells||x).forEach(function(c){tr.append(el("td",null,c))});if(x.on)tr.addEventListener("click",x.on);b.append(tr)});t.append(h,b);w.append(t);return w}
function finding(sev,title,text){var d=el("details","finding"),s=el("summary");s.append(el("span","sevtag s-"+sev,{crit:"critical",high:"high",med:"medium",info:"info"}[sev]),el("b",null,title));d.append(s,el("p",null,text));if(sev==="crit"||sev==="high")d.open=true;return d}
function hashGet(){var q={};location.hash.replace(/^#/,"").split("&").forEach(function(kv){var i=kv.indexOf("=");if(i>0)q[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1))});return q}
function hashSet(o){var s=Object.keys(o).map(function(k){return k+"="+encodeURIComponent(o[k])}).join("&");try{history.replaceState(null,"","#"+s)}catch(e){}}
function bind(ids,fn){ids.forEach(function(i){var e=$(i);if(e){e.addEventListener("input",fn);e.addEventListener("change",fn)}})}

/* ================= RAID ================= */
var RAID={
 "0":{n:"RAID 0",min:2,par:0,d:"Stripes across all disks. Fast, and one failed disk loses everything."},
 "1":{n:"RAID 1",min:2,mirror:true,d:"Every disk holds the same data. Simple and robust, costs the most capacity."},
 "5":{n:"RAID 5",min:3,par:1,d:"One disk worth of parity spread over all disks. Survives one failure."},
 "6":{n:"RAID 6",min:4,par:2,d:"Two disks worth of parity. Survives two failures, and a read error during a rebuild."},
 "10":{n:"RAID 10",min:4,even:true,pairs:true,d:"Mirrored pairs, striped. Fast rebuilds and good write speed, half the capacity."},
 "50":{n:"RAID 50",min:6,even:true,groups:2,par:1,d:"Two RAID 5 groups, striped. One failure per group."},
 "60":{n:"RAID 60",min:8,even:true,groups:2,par:2,d:"Two RAID 6 groups, striped. Two failures per group."},
 "z1":{n:"RAID-Z1",min:3,par:1,zfs:true,d:"ZFS with single parity. Like RAID 5, without the write hole."},
 "z2":{n:"RAID-Z2",min:4,par:2,zfs:true,d:"ZFS with double parity. The usual choice for large disks."},
 "z3":{n:"RAID-Z3",min:5,par:3,zfs:true,d:"ZFS with triple parity, for wide groups of very large disks."}
};
var URE={hdd:[1e14,"consumer hard disk, 1 in 10^14 bits"],ent:[1e15,"enterprise hard disk, 1 in 10^15 bits"],ssd:[1e17,"SSD, 1 in 10^17 bits"]};
function raidCalc(level,n,gb,ure,speed){
  var L=RAID[level];if(n<L.min)return {err:L.n+" needs at least "+L.min+" disks."};
  if(L.even&&n%2)return {err:L.n+" needs an even number of disks."};
  var r={level:level,name:L.n,n:n,desc:L.d},g=L.groups||1,per=n/g;
  if(L.mirror){r.data=1;r.safe=n-1;r.best=n-1;r.read=1}
  else if(L.pairs){r.data=n/2;r.safe=1;r.best=n/2;r.read=1}
  else if(L.par===0){r.data=n;r.safe=0;r.best=0;r.read=0}
  else{if(per<L.par+2&&g>1)return {err:L.n+" needs at least "+(L.par+2)*g+" disks."};r.data=n-L.par*g;r.safe=L.par;r.best=L.par*g;r.read=per-1}
  r.usable=r.data*gb;r.eff=r.data/n;
  r.rebuild=gb*1000/speed; /* seconds: GB -> MB / (MB/s) */
  /* chance that the rebuild after ONE failure meets an unreadable sector it cannot correct */
  if(r.safe===0)r.risk=null;else if((L.par||0)>=2||(L.mirror&&n>=3))r.risk=0;else{var bits=r.read*gb*8e9;r.risk=1-Math.exp(-bits/ure)}
  return r;
}
function initRaid(){
  var out=$("rd-out");if(!out)return;
  var q=hashGet();if(q.l&&RAID[q.l])$("rd-level").value=q.l;if(q.n)$("rd-n").value=q.n;if(q.s)$("rd-size").value=q.s;if(q.u)$("rd-unit").value=q.u;if(q.t&&URE[q.t])$("rd-type").value=q.t;if(q.h)$("rd-spare").value=q.h;
  function run(){
    var n=Math.round(num("rd-n",1,60,4)),sz=num("rd-size",0.001,1e6,8),unit=$("rd-unit").value,gb=unit==="TB"?sz*1000:sz,level=$("rd-level").value,type=$("rd-type").value,spare=Math.round(num("rd-spare",0,8,0));
    var speed=type==="ssd"?450:160,r=raidCalc(level,n,gb,URE[type][0],speed);
    hashSet({l:level,n:n,s:sz,u:unit,t:type,h:spare});
    out.replaceChildren();
    if(r.err){out.append(el("p","note",r.err));$("rd-disks").replaceChildren();return}
    var sev=r.safe===0?"crit":r.risk>0.2?"high":r.risk>0.05?"med":"none";
    var v=el("div","verdict v-"+sev);
    v.append(el("b",null,size(r.usable)+" usable"),el("span",null,"from "+n+" × "+size(gb)+" in "+r.name+" · "+(r.safe===0?"no disk may fail":"any "+(r.safe===1?"one disk":r.safe+" disks")+" may fail")));
    out.append(v);
    var st=el("div","stats");st.style.setProperty("--cols","4");
    st.append(tile("usable",size(r.usable),"your system shows "+round(r.usable*1e9/Math.pow(1024,4))+" TiB"),
     tile("efficiency",Math.round(r.eff*100)+"%",size((n-r.data)*gb)+" go to redundancy"),
     tile("survives",r.safe===0?"nothing":r.safe+(r.safe===1?" failure":" failures"),r.best>r.safe?"up to "+r.best+" if they hit different groups":"whichever disks fail"),
     tile("rebuild",r.safe===0?"-":dur(r.rebuild),r.safe===0?"nothing to rebuild from":"per disk at about "+speed+" MB/s, idle array"));
    out.append(st);
    if(r.safe===0)out.append(finding("crit","One failed disk loses everything","RAID 0 has no redundancy. With "+n+" disks the chance that one of them fails is "+n+" times that of a single disk. Use it only for data you can recreate, such as scratch space or a cache."));
    else if(r.risk===0)out.append(finding("info","A read error during the rebuild is covered","With one disk gone, the remaining redundancy can still correct a sector that cannot be read. That second layer is why double parity is the default for large disks."));
    else out.append(finding(r.risk>0.2?"high":r.risk>0.05?"med":"info","By the data sheet: "+pct(r.risk)+" chance that the rebuild meets an unreadable sector",
     "After one failure the rebuild has to read "+size(r.read*gb)+" without a single error, because nothing is left to correct one. The figure uses the rate from the data sheet ("+URE[type][1]+"), which is a worst-case promise. Real disks usually do better, and a good controller skips the bad block instead of failing the array, but you lose that file. "+(r.risk>0.05?"With disks this large, "+(RAID[level].zfs?"RAID-Z2":"RAID 6")+" is the safer choice.":"")));
    if(spare)out.append(finding("info",spare+(spare===1?" hot spare":" hot spares")+" on top","A spare starts the rebuild at once instead of when someone swaps the disk. It adds no capacity. You need "+(n+spare)+" disks in total."));
    if(RAID[level].zfs)out.append(el("p","note","ZFS keeps some space for metadata and should not run above about 80% full, so plan with roughly "+size(r.usable*0.8)+" of comfortable space."));
    /* disk picture */
    var dk=$("rd-disks");dk.replaceChildren();var L=RAID[level],g=L.groups||1,per=n/g;
    for(var i=0;i<n;i++){var kind="data",label="data";
      if(L.mirror){kind=i===0?"data":"mirror";label=i===0?"data":"copy"}
      else if(L.pairs){kind=i%2?"mirror":"data";label=i%2?"copy":"data"}
      else if(L.par){var pos=i%per;if(pos>=per-L.par){kind="parity";label="parity"}}
      var d=el("div","disk "+kind);d.append(el("i",null,String(i+1)),el("span",null,label));
      if((L.pairs&&i%2===1&&i<n-1)||(g>1&&(i+1)%per===0&&i<n-1))d.classList.add("gap");dk.append(d)}
    for(var s=0;s<spare;s++){var x=el("div","disk spare");x.append(el("i",null,"+"),el("span",null,"spare"));dk.append(x)}
    $("rd-diskn").textContent=L.par&&!L.mirror?"Parity is spread across all disks in turn. The picture shows how much of the total it takes, not where it sits.":L.pairs?"Each pair holds the same data. The array survives as long as no pair loses both disks.":L.mirror?"Every disk is a full copy.":"Every disk holds a different part of the data.";
    /* comparison */
    var rows=[];Object.keys(RAID).forEach(function(k){var c=raidCalc(k,n,gb,URE[type][0],speed);if(c.err)return;
      rows.push({cls:k===level?"iscur":"",on:function(){$("rd-level").value=k;run()},cells:[c.name,size(c.usable),Math.round(c.eff*100)+"%",c.safe===0?"none":String(c.safe)+(c.best>c.safe?" (up to "+c.best+")":""),c.risk===null?"-":c.risk===0?"covered":pct(c.risk)]})});
    $("rd-cmp").replaceChildren(table(["Level","Usable","Efficiency","Disks that may fail","Rebuild read-error risk"],rows));
  }
  bind(["rd-n","rd-size","rd-unit","rd-level","rd-type","rd-spare"],run);run();
}

/* ================= backup planner ================= */
function initBackup(){
  var out=$("bk-out");if(!out)return;
  var IDS=["bk-data","bk-unit","bk-change","bk-red","bk-mode","bk-d","bk-w","bk-m","bk-y","bk-speed","bk-up","bk-grow"],CHK=["bk-c3","bk-c2","bk-c1","bk-ci","bk-c0"];
  var q=hashGet();IDS.forEach(function(i){var k=i.slice(3);if(q[k]!==undefined)$(i).value=q[k]});if(q.r)CHK.forEach(function(i,n){$(i).checked=q.r.charAt(n)==="1"});
  function run(){
    var D=num("bk-data",0.001,1e7,500)*($("bk-unit").value==="TB"?1000:1),c=num("bk-change",0,100,2)/100,red=num("bk-red",1,20,1.5),mode=$("bk-mode").value;
    var nd=Math.round(num("bk-d",0,3650,14)),nw=Math.round(num("bk-w",0,520,8)),nm=Math.round(num("bk-m",0,240,12)),ny=Math.round(num("bk-y",0,50,0));
    var speed=num("bk-speed",1,100000,100),up=num("bk-up",0.1,100000,40),grow=num("bk-grow",0,300,15)/100;
    var o={};IDS.forEach(function(i){o[i.slice(3)]=$(i).value});o.r=CHK.map(function(i){return $(i).checked?"1":"0"}).join("");hashSet(o);
    function delta(k){return D*(1-Math.pow(1-c,k))}
    var rows=[],total=0;
    function add(t,n,each,why){if(!n)return;rows.push([t,String(n),size(each/red),size(n*each/red),why]);total+=n*each/red}
    if(mode==="forever"){add("First full backup",1,D,"the base everything else builds on");add("Daily",nd,delta(1),"what changed in one day");add("Weekly",nw,delta(7),"what changed in a week");add("Monthly",nm,delta(30),"what changed in a month");add("Yearly",ny,delta(365),"what changed in a year")}
    else if(mode==="weekly"){add("Full backups for the daily chain",nd?Math.ceil(nd/7)+1:0,D,"each week of dailies needs its full");add("Daily incrementals",nd,delta(1),"what changed in one day");add("Weekly (full)",nw,D,"kept as complete copies");add("Monthly (full)",nm,D,"kept as complete copies");add("Yearly (full)",ny,D,"kept as complete copies")}
    else{add("Daily (full)",nd,D,"a complete copy every day");add("Weekly (full)",nw,D,"complete copies");add("Monthly (full)",nm,D,"complete copies");add("Yearly (full)",ny,D,"complete copies")}
    var points=nd+nw+nm+ny,oldest=ny?ny*365:nm?nm*30:nw?nw*7:nd,future=total*Math.pow(1+grow,3)*1.2;
    var fullT=D*1000/speed,incT=delta(1)/red*1000/speed,upMBs=up/8*0.9,seedT=(mode==="forever"?D:D)/red*1000/upMBs,upT=(mode==="daily"?D:delta(1))/red*1000/upMBs;
    out.replaceChildren();
    if(!points){out.append(el("p","note","Keep at least one restore point."));return}
    var missing=CHK.filter(function(i){return !$(i).checked}).length,short=oldest<30,v=el("div","verdict v-"+(missing>=3||!$("bk-c1").checked?"crit":missing||short?"high":"none"));
    v.append(el("b",null,size(total)+" of backup storage"),el("span",null,"for "+size(D)+" of data · "+points+" restore points · reaching back "+dur(oldest*86400)));
    out.append(v);
    var st=el("div","stats");st.style.setProperty("--cols","4");
    st.append(tile("buy at least",size(future),"three years of growth plus 20% free"),tile("worst-case loss",nd?"24 hours":nw?"7 days":"a month or more",nd?"one backup per day":"no daily backup"),
     tile("a full backup takes",dur(fullT),"at "+speed+" MB/s"),tile("first offsite upload",dur(seedT),"at "+up+" Mbit/s up, then "+dur(upT)+" a day"));
    out.append(st);
    out.append(el("h2",null,"where the space goes"),table(["Tier","Kept","Size each","Total","What it holds"],rows));
    out.append(el("p","note","Estimate. It assumes "+(c*100)+"% of the data changes per day, that changes fall on different blocks each time, and a reduction of "+red+" to 1 from compression and deduplication. Databases and mail stores change more than file shares, already compressed data (video, images, archives) does not shrink."));
    /* timeline */
    var tl=el("div","bktl"),max=Math.max(oldest,1);
    function dots(n,step,cls){for(var i=1;i<=n;i++){var x=el("i",cls);x.style.left=(100-Math.log(1+i*step)/Math.log(1+max)*100)+"%";x.title=dur(i*step*86400)+" ago";tl.append(x)}}
    dots(ny,365,"y");dots(nm,30,"m");dots(nw,7,"w");dots(nd,1,"d");
    var ax=el("div","bkax");ax.append(el("span",null,dur(max*86400)+" ago"),el("span",null,"today"));
    var lg=el("p","bklg");[["d","daily",nd],["w","weekly",nw],["m","monthly",nm],["y","yearly",ny]].forEach(function(x){if(x[2]){var s=el("span");s.append(el("i",x[0]),document.createTextNode(x[2]+" "+x[1]));lg.append(s)}});
    out.append(el("h2",null,"your restore points"),tl,ax,lg);
    out.append(el("h2",null,"what to fix"));
    var n0=out.childElementCount;
    if(!$("bk-c1").checked)out.append(finding("crit","No copy outside the building","Fire, flood, theft and ransomware reach everything in one place at once. One copy has to live somewhere else: a cloud bucket, a second site, a disk someone takes home in rotation."));
    if(!$("bk-ci").checked)out.append(finding("high","No copy that ransomware cannot reach","Attackers delete or encrypt the backups first. One copy must be offline (unplugged disk, tape) or immutable (object lock, a hardened repository). A NAS share the server can write to is neither."));
    if(!$("bk-c0").checked)out.append(finding("high","Restores are not tested","A backup that has never been restored is a hope, not a backup. Restore a few files every month and one complete system every year, and write down how long it took."));
    if(!$("bk-c3").checked)out.append(finding("med","Fewer than three copies","The original plus two backups. With only one backup, a failed backup job and a failed disk in the same week is enough."));
    if(!$("bk-c2").checked)out.append(finding("med","All copies on the same kind of system","Two copies on the same NAS, the same RAID or the same cloud account fail together. Use a second device or provider."));
    if(short)out.append(finding("high","The oldest restore point is only "+dur(oldest*86400)+" old","Damage is often noticed late: a deleted folder nobody missed, a file that was encrypted weeks ago. Keep at least some monthly points."));
    if(fullT>8*3600&&mode!=="forever")out.append(finding("med","A full backup does not fit into one night","It takes "+dur(fullT)+". Use incremental forever with synthetic fulls, or start the full on Friday evening."));
    if(upT>8*3600)out.append(finding("med","The daily offsite upload does not fit into one night","It takes "+dur(upT)+" at "+up+" Mbit/s. The offsite copy falls further behind every day. Get more upstream, replicate less often, or leave large rarely needed data out of the offsite set."));
    if(seedT>14*86400)out.append(finding("info","The first offsite upload takes "+dur(seedT),"Seed the first copy another way: ship a disk to the provider, or take the backup device to the other site for the first run."));
    if(out.childElementCount===n0)out.append(el("p","dim","Nothing to fix in this plan. Keep testing the restores."));
  }
  bind(IDS.concat(CHK),run);run();
}

/* ================= transfer time ================= */
var LINKS=[["DSL 50 down, 10 up (upload)",10,"mbit"],["Cable 1000 down, 50 up (upload)",50,"mbit"],["Fibre 1000, both ways",1000,"mbit"],["Fast Ethernet",100,"mbit"],["Gigabit Ethernet",1000,"mbit"],["2.5 Gbit Ethernet",2500,"mbit"],["10 Gbit Ethernet",10000,"mbit"],
 ["Wi-Fi 5, good signal",300,"mbit"],["Wi-Fi 6, good signal",700,"mbit"],["USB 2.0 stick",25,"mb"],["USB 3 hard disk",120,"mb"],["SATA SSD",450,"mb"],["NVMe SSD",2000,"mb"]];
function initTransfer(){
  var out=$("tr-out");if(!out)return;
  var q=hashGet();["tr-amt","tr-aunit","tr-spd","tr-sunit","tr-eff"].forEach(function(i){var k=i.slice(3);if(q[k]!==undefined)$(i).value=q[k]});
  var pre=$("tr-presets");LINKS.forEach(function(l){var b=el("button","chipbtn",l[0]);b.type="button";b.addEventListener("click",function(){$("tr-spd").value=l[1];$("tr-sunit").value=l[2];run()});pre.append(b)});
  function mbs(v,u){return u==="mbit"?v/8:u==="gbit"?v*125:v}
  function run(){
    var amt=num("tr-amt",0.000001,1e9,100),au=$("tr-aunit").value,gb=au==="MB"?amt/1000:au==="TB"?amt*1000:amt,spd=num("tr-spd",0.001,1e7,50),su=$("tr-sunit").value,eff=num("tr-eff",1,100,90)/100;
    hashSet({amt:amt,aunit:au,spd:spd,sunit:su,eff:Math.round(eff*100)});
    var real=mbs(spd,su)*eff,t=gb*1000/real;
    out.replaceChildren();
    var v=el("div","verdict v-none");v.append(el("b",null,dur(t)),el("span",null,"for "+size(gb)+" at "+round(real)+" MB/s"));out.append(v);
    var st=el("div","stats");st.style.setProperty("--cols","4");
    st.append(tile("real speed",round(real)+" MB/s",su==="mb"?round(real*8)+" Mbit/s":round(spd*(su==="gbit"?1000:1))+" Mbit/s nominal, "+Math.round(eff*100)+"% usable"),
     tile("in one hour",size(real*3.6)),tile("in one night",size(real*3.6*8),"8 hours"),tile("in one weekend",size(real*3.6*60),"Friday 18:00 to Monday 06:00"));
    out.append(st);
    if(su!=="mb")out.append(el("p","note","Lines are sold in bits, files are measured in bytes: "+round(spd)+" "+(su==="gbit"?"Gbit/s":"Mbit/s")+" is at best "+round(mbs(spd,su))+" MB/s. Divide by eight."));
    if(t>5*86400)out.append(finding("info","Carrying a disk is faster","At this speed the transfer takes "+dur(t)+". Copying to a USB disk and driving or posting it is usually done in a day or two."));
    var rows=LINKS.map(function(l){var r=mbs(l[1],l[2])*(l[2]==="mb"?1:eff);return [l[0],l[2]==="mb"?l[1]+" MB/s":l[1]+" Mbit/s",round(r)+" MB/s",dur(gb*1000/r)]});
    out.append(el("h2",null,"the same "+size(gb)+" over other links"),table(["Link","Nominal","Real","Time"],rows));
  }
  bind(["tr-amt","tr-aunit","tr-spd","tr-sunit","tr-eff"],run);run();
}

initRaid();initBackup();initTransfer();
window.calcs={raid:raidCalc,dur:dur,size:size};
})();
