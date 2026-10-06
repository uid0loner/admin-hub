(function(){
"use strict";
var $=function(i){return document.getElementById(i)};if(!$("wf-out"))return;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
function tile(k,v,s){var d=el("div","stat");d.append(el("span","stat-k",k));var b=el("b","stat-v",v);b.setAttribute("data-raw","1");d.append(b);if(s)d.append(el("span","stat-s",s));return d}
function finding(sev,title,text){var d=el("details","finding f-"+sev),s=el("summary");s.append(el("span","sevtag s-"+sev,{crit:"critical",high:"high",med:"medium",info:"info"}[sev]),el("b",null,title));d.append(s,el("p",null,text));if(sev==="crit"||sev==="high")d.open=true;return d}
function table(cols,rows){var w=el("div","tw"),t=el("table","tbl"),h=el("thead"),r=el("tr"),b=el("tbody");cols.forEach(function(c){r.append(el("th",null,c))});h.append(r);rows.forEach(function(x){var tr=el("tr");x.forEach(function(c){tr.append(el("td",null,c))});b.append(tr)});t.append(h,b);w.append(t);return w}
/* 5 GHz: 20 MHz channels by sub-band. dfs = radar detection required */
var B5=[{n:"UNII-1",dfs:false,ch:[36,40,44,48]},{n:"UNII-2A",dfs:true,ch:[52,56,60,64]},{n:"UNII-2C",dfs:true,ch:[100,104,108,112,116,120,124,128,132,136,140,144]},{n:"UNII-3",dfs:false,ch:[149,153,157,161,165]}];
function plan(band,width,region,dfs){var out=[],k=width/20,i;
  if(band==="2.4"){var max=region==="fcc"?11:13;for(i=1;i<=max;i++)out.push({ch:[i],label:String(i),ok:width===20&&(i===1||i===6||i===11),dfs:false,grp:"2.4 GHz",note:""});
    if(width===40)out.forEach(function(c){c.ok=c.ch[0]===3||(region!=="fcc"&&c.ch[0]===11)});return out}
  if(band==="6"){var n=region==="fcc"?59:24,cnt=Math.floor(n/k);for(i=0;i<cnt;i++){var first=1+i*k*4;out.push({ch:[first],label:k===1?String(first):first+"\u2013"+(first+(k-1)*4),ok:true,dfs:false,grp:"6 GHz",note:""})}return out}
  B5.forEach(function(b){for(i=0;i+k<=b.ch.length;i+=k){var c=b.ch.slice(i,i+k),ok=true,note="";
      if(c.indexOf(165)>=0&&k>1)continue;
      if(region==="etsi"&&c.indexOf(144)>=0){ok=false;note="not available in Europe"}
      if(region==="etsi"&&b.n==="UNII-3"){ok=false;note="short-range devices only in most of Europe"}
      if(b.dfs&&!dfs&&ok){ok=false;note="radar detection (DFS), switched off above"}
      out.push({ch:c,label:k===1?String(c[0]):c[0]+"\u2013"+c[c.length-1],ok:ok,dfs:b.dfs,grp:b.n,note:note,radar:c.some(function(x){return x>=120&&x<=128})})}
    if(k===8&&b.n==="UNII-2A"){/* 160 MHz spans UNII-1 and 2A */}});
  if(k===8){out=[];[[36,40,44,48,52,56,60,64],[100,104,108,112,116,120,124,128]].forEach(function(c){out.push({ch:c,label:c[0]+"\u2013"+c[7],ok:dfs,dfs:true,grp:c[0]===36?"UNII-1 and 2A":"UNII-2C",note:dfs?"":"needs radar detection (DFS), switched off above",radar:c[0]===100})})}
  return out}
function draw(list,assign){var W=720,pad=10,x=pad,gap=14,bw,s="",grp="",n=list.length,groups={};
  list.forEach(function(c){groups[c.grp]=1});var g=Object.keys(groups).length;bw=Math.max(18,Math.min(64,(W-2*pad-(g-1)*gap)/n-3));
  list.forEach(function(c,i){if(c.grp!==grp){if(grp)x+=gap;s+='<text x="'+x+'" y="14" text-anchor="start">'+c.grp+'</text>';grp=c.grp}
    var used=assign[c.label]||0;
    s+='<rect class="'+(c.ok?(c.dfs?"wfd":"wfo"):"wfx")+(used?" used":"")+'" x="'+x+'" y="24" width="'+bw+'" height="46" rx="3"/>';
    s+='<text class="'+(c.ok?"t2":"")+'" x="'+(x+bw/2)+'" y="'+(bw<30?52:44)+'" text-anchor="middle"'+(bw<30?' font-size="8"':'')+'>'+c.label+'</text>';
    if(used)s+='<text class="wfn" x="'+(x+bw/2)+'" y="'+(bw<30?64:62)+'" text-anchor="middle">'+used+(bw<30?"":" AP"+(used>1?"s":""))+'</text>';
    x+=bw+3});
  return '<svg class="hwsvg wfsvg" viewBox="0 0 '+Math.max(W,x+pad)+' 82" role="img" aria-label="The channels of the band, with the usable ones highlighted">'+s+'</svg>'}
function run(){var band=$("wf-band").value,width=+$("wf-width").value,region=$("wf-region").value,dfs=$("wf-dfs").value==="yes",aps=Math.min(200,Math.max(1,parseInt($("wf-aps").value,10)||1)),out=$("wf-out");out.replaceChildren();
  if(band==="2.4"&&width>40){width=40;$("wf-width").value="40"}
  var list=plan(band,width,region,dfs),ok=list.filter(function(c){return c.ok});
  /* spread: plain channels first, then DFS, non-radar before radar */
  var order=ok.slice().sort(function(a,b){return (a.dfs?1:0)-(b.dfs?1:0)||(a.radar?1:0)-(b.radar?1:0)}),assign={},rows=[],i;
  if(order.length)for(i=0;i<aps;i++){var c=order[i%order.length];assign[c.label]=(assign[c.label]||0)+1;if(i<60)rows.push(["AP "+(i+1),c.label,c.dfs?"yes":"no",i>=order.length?"shares the channel with AP "+(i%order.length+1)+": keep them far apart":""])}
  var st=el("div","stats");st.style.setProperty("--cols","4");
  st.append(tile("channels you can use",String(ok.length),width+" MHz wide"),tile("without radar detection",String(ok.filter(function(c){return !c.dfs}).length),"always available"),tile("access points",String(aps),""),tile("per channel",ok.length?(aps<=ok.length?"1":"up to "+Math.ceil(aps/ok.length)):"-",aps<=ok.length?"no channel is shared":"channels are reused"));
  out.append(st);var fig=el("div","wffig");fig.innerHTML=draw(list,assign);out.append(fig);
  out.append(el("p","dim wfkey","Blue: free to use. Violet: usable with radar detection (DFS). Grey: not usable with these settings."));
  if(!ok.length)out.append(finding("crit","No channel left","With these settings there is no usable channel. Allow the DFS channels or choose a narrower width."));
  if(band==="2.4"&&width===40)out.append(finding("high","40 MHz on 2.4 GHz","A 40 MHz channel takes two thirds of the whole band. In any building with neighbours it collides with everything, and most devices fall back to 20 MHz anyway. Use 20 MHz here."));
  if(band==="2.4")out.append(finding("info","Three channels is all there is","Only 1, 6 and 11 do not overlap. Channels in between are not a clever compromise: they disturb both neighbours at once. Use 2.4 GHz for range and old devices, and move everything else to 5 GHz."+(region==="etsi"?" In Europe, 1, 5, 9 and 13 give four channels when no 802.11b devices are left, at the price of slight overlap with neighbours who use 1, 6, 11.":"")));
  if(ok.length&&aps>ok.length)out.append(finding(aps>ok.length*3?"high":"med","Channels have to be reused",aps+" access points share "+ok.length+" channels. Two access points on one channel that hear each other take turns, and each gets half the airtime. Give the same channel to access points as far apart as possible, on different floors or opposite ends, and lower their transmit power."+(width>20?" A narrower channel width gives you more channels: with many access points, more channels beat wider ones.":"")));
  if(band==="5"&&width>=80&&aps>4)out.append(finding("med","Wide channels with many access points","At "+width+" MHz there are few channels to go round. In an office with more than a handful of access points, 40 MHz or even 20 MHz gives a faster network overall, because the access points stop competing."));
  if(width===160)out.append(finding("info","160 MHz is for one access point at home","It needs a clean spectrum and clients that support it, and on 5 GHz it always includes radar channels."));
  if(band==="5"&&dfs&&ok.some(function(c){return c.dfs}))out.append(finding("info","What radar detection means in practice","On DFS channels an access point must listen for radar before it transmits, one minute on most channels and ten minutes on 120 to 128 in Europe, and it must leave the channel at once when it detects radar. Near airports, harbours and weather stations that happens. Some older or cheap clients do not see DFS channels at all: test with the devices you have."));
  if(band==="5"&&!dfs)out.append(finding("info","Without DFS you have few channels",(region==="etsi"?"In Europe that leaves channels 36 to 48 only.":"That leaves 36 to 48 and 149 to 165.")+" Fine for a small office. With more access points, allow the DFS channels."));
  if(band==="6")out.append(finding("info","6 GHz needs new devices on both ends","Wi-Fi 6E or Wi-Fi 7 access points and clients, WPA3, and shorter range than 5 GHz. No radar channels and plenty of room"+(region==="etsi"?", though Europe has opened only the lower 480 MHz.":".")));
  if(rows.length){out.append(el("h2",null,"a starting assignment"),el("p","dim","Neighbouring access points should get different channels. Hand them out so that the same channel never sits in adjacent rooms or directly above and below."),table(["Access point","Channel","Radar detection","Note"],rows));if(aps>60)out.append(el("p","note","Showing the first 60."))}
  try{history.replaceState(null,"","#"+[band,width,region,dfs?"dfs":"nodfs",aps].join("-"))}catch(e){}}
var h=location.hash.slice(1).split("-");if(h.length===5){$("wf-band").value=h[0];$("wf-width").value=h[1];$("wf-region").value=h[2];$("wf-dfs").value=h[3]==="dfs"?"yes":"no";$("wf-aps").value=h[4]}
["wf-band","wf-width","wf-region","wf-dfs","wf-aps"].forEach(function(i){$(i).addEventListener("input",run);$(i).addEventListener("change",run)});run();
})();
