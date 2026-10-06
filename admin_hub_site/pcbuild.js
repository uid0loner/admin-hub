/* PC build checker: do the parts fit each other, the case and the power supply? */
(function(){"use strict";
var $=function(i){return document.getElementById(i)};var form=$("pb-form");if(!form)return;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var SOCK={am4:["AM4 (Ryzen 1000 to 5000)",["ddr4"],"amd"],am5:["AM5 (Ryzen 7000 and newer)",["ddr5"],"amd"],lga1700:["LGA 1700 (Intel 12th to 14th gen)",["ddr4","ddr5"],"intel"],lga1851:["LGA 1851 (Core Ultra 200)",["ddr5"],"intel"],lga1200:["LGA 1200 (Intel 10th and 11th gen)",["ddr4"],"intel"]};
var FF={itx:["Mini-ITX",170,170,1],matx:["Micro-ATX",244,244,2],atx:["ATX",244,305,3],eatx:["E-ATX",330,305,4]};
var GPU={none:["none",0,0,0],low:["entry card, no power cable",75,0,0],mid:["mid-range, about 200 W",200,1,0],high:["high-end, about 320 W",320,2,0],top:["top model, 450 W and more",450,3,1]};
var CPUW={65:[90,"65 W class"],105:[150,"105 to 125 W class"],125:[220,"125 W class with boost"],170:[260,"170 W class and above"]};
var F=[
 ["g","What it is for"],
 ["use","Use",{office:"office and web",dev:"development and virtual machines",game:"gaming",media:"video and 3D work"},"office"],
 ["g","Processor and board"],
 ["cs","Processor socket",SOCK,"am5"],["cw","Processor power class",{65:"65 W (most desktop chips)",105:"105 W",125:"125 W (unlocked chips)",170:"170 W and more"},"65"],["igpu","Graphics built into the processor",{yes:"yes",no:"no (for example Intel F models)"},"yes"],
 ["bs","Board socket",SOCK,"am5"],["bf","Board size",FF,"matx"],["br","Memory the board takes",{ddr4:"DDR4",ddr5:"DDR5"},"ddr5"],["bslots","Memory slots",{2:"2",4:"4"},"4"],["bm2","M.2 slots on the board",{0:"0",1:"1",2:"2",3:"3",4:"4"},"2"],
 ["g","Memory and drives"],
 ["rt","Memory modules",{ddr4:"DDR4",ddr5:"DDR5"},"ddr5"],["rn","Number of modules",{1:"1",2:"2",4:"4"},"2"],["rg","Size of each module",{4:"4 GB",8:"8 GB",16:"16 GB",24:"24 GB",32:"32 GB",48:"48 GB"},"16"],
 ["m2","M.2 drives",{0:"0",1:"1",2:"2",3:"3",4:"4"},"1"],["sata","SATA drives (2.5 or 3.5 inch)",{0:"0",1:"1",2:"2",4:"4",6:"6"},"0"],
 ["g","Graphics card and cooler"],
 ["gpu","Graphics card",GPU,"none"],["gl","Card length in mm","n",0,[0,420]],
 ["cool","Processor cooler",{stock:"the one from the box",low:"low-profile cooler",tower:"tower cooler",aio240:"water, 240 mm radiator",aio360:"water, 360 mm radiator"},"stock"],["ch","Cooler height in mm","n",0,[0,180]],
 ["g","Case and power supply"],
 ["cf","Largest board the case takes",FF,"atx"],["cgl","Longest card the case takes, mm","n",330,[100,500]],["cch","Tallest cooler the case takes, mm","n",160,[30,200]],["crad","Largest radiator the case takes",{0:"none",240:"240 mm",360:"360 mm"},"240"],["cpsu","Power supply the case takes",{atx:"ATX",sfx:"SFX only"},"atx"],
 ["pw","Power supply, watts","n",450,[150,1600]],["pf","Power supply size",{atx:"ATX",sfx:"SFX"},"atx"],["p8","PCIe 8-pin plugs on the power supply",{0:"0",1:"1",2:"2",3:"3",4:"4"},"0"],["p12","12V-2x6 (16-pin) cable",{no:"no",yes:"yes"},"no"]];
var v={};
function buildForm(){var h="",open=false;F.forEach(function(f){if(f[0]==="g"){if(open)h+="</div></fieldset>";h+='<fieldset class="pbset"><legend>'+f[1]+'</legend><div class="sim">';open=true;return}
    var id="pb-"+f[0];if(f[2]==="n"){v[f[0]]=f[3];h+='<label>'+f[1]+'<input class="sel" id="'+id+'" type="number" inputmode="numeric" min="'+f[4][0]+'" max="'+f[4][1]+'" value="'+f[3]+'"></label>'}
    else{v[f[0]]=String(f[3]);h+='<label>'+f[1]+'<select class="sel" id="'+id+'">'+Object.keys(f[2]).map(function(k){var t=f[2][k];return '<option value="'+k+'"'+(String(f[3])===k?" selected":"")+'>'+esc(Array.isArray(t)?t[0]:t)+'</option>'}).join("")+'</select></label>'}});
  form.innerHTML=h+"</div></fieldset>"}
function read(){F.forEach(function(f){if(f[0]==="g")return;var e=$("pb-"+f[0]);if(f[2]==="n"){var n=parseInt(e.value,10);v[f[0]]=isNaN(n)?0:Math.max(0,Math.min(f[4][1],n))}else v[f[0]]=e.value})}
function check(){var f=[],cpu=CPUW[v.cw][0],g=GPU[v.gpu],load=cpu+g[1]+50+(+v.rn)*4+(+v.m2)*7+(+v.sata)*9+(v.cool.indexOf("aio")===0?15:5),rec=Math.ceil(load/0.65/50)*50,ram=(+v.rn)*(+v.rg);
  function add(s,t,x){f.push([s,t,x])}
  if(v.cs!==v.bs)add("crit","The processor does not fit the board","The processor is "+SOCK[v.cs][0]+", the board has "+SOCK[v.bs][0]+". Sockets are not compatible with each other, not even between two generations of the same maker. One of the two has to change.");
  if(SOCK[v.bs][1].indexOf(v.br)<0)add("crit","No "+SOCK[v.bs][0].split(" (")[0]+" board takes "+v.br.toUpperCase(),"This platform only works with "+SOCK[v.bs][1].join(" or ").toUpperCase()+". Check the board's data sheet again.");
  if(v.rt!==v.br)add("crit","The memory does not fit the board","The modules are "+v.rt.toUpperCase()+", the board takes "+v.br.toUpperCase()+". The notch sits in a different place, so they cannot even be pushed in. DDR4 and DDR5 are never interchangeable.");
  if(+v.rn>+v.bslots)add("crit",v.rn+" modules, "+v.bslots+" slots","Take fewer and larger modules.");
  if(+v.rn===1)add("med","One module runs in single channel","Two modules give the processor two memory channels. With one, memory throughput halves: built-in graphics lose up to a third of their speed, games noticeably, office work hardly. Two times "+(+v.rg/2>=4?(+v.rg/2)+" GB":"half the size")+" is the better buy.");
  if(+v.rn===4&&v.rt==="ddr5")add("info","Four DDR5 modules often do not reach their rated speed","Boards train four modules at lower speeds than two. If you want the speed on the label (the XMP or EXPO profile), take two larger modules. If you need the capacity, expect to set a slower speed by hand.");
  if(+v.rn===2&&+v.bslots===4)add("info","Use the second and fourth slot","Counted from the processor, most boards want two modules in slots 2 and 4 (often marked A2 and B2). In 1 and 2 they share one channel. The manual has the picture.");
  var need={office:8,dev:32,game:16,media:32}[v.use];if(ram<need)add("med",ram+" GB of memory is tight for this use","For "+({office:"office work",dev:"development and virtual machines",game:"current games",media:"video and 3D work"})[v.use]+", plan with "+need+" GB or more."+(v.use==="office"?" Windows 11 with a browser and Teams fills 8 GB by itself.":""));
  if(FF[v.bf][3]>FF[v.cf][3])add("crit","The board is too large for the case","The board is "+FF[v.bf][0]+" ("+FF[v.bf][1]+" by "+FF[v.bf][2]+" mm) and does not go into a case built for "+FF[v.cf][0]+" at most. Smaller boards in larger cases always fit: the screw holes are a subset.");
  if(v.gpu==="none"&&v.igpu==="no")add("crit","No picture: no graphics card and no graphics in the processor","The monitor ports on the board only work when the processor has a graphics unit. Either add a card, or take a processor with graphics (Intel without F, most current Ryzen).");
  if(v.gpu!=="none"){
    if(!v.gl)add("info","Enter the length of the graphics card","Current cards are between 170 and 360 mm long. Length is the measure that most often does not fit.");
    else if(v.gl>v.cgl)add("crit","The graphics card is "+(v.gl-v.cgl)+" mm too long for the case","Card "+v.gl+" mm, case "+v.cgl+" mm. The case figure sometimes assumes no front fans or no drive cage: read the small print before returning one of them.");
    else if(v.cgl-v.gl<15)add("med","Only "+(v.cgl-v.gl)+" mm of room behind the graphics card","It fits on paper. Front fans, a radiator in the front or stiff power cables can use up that margin.");
    if(g[3]){if(v.p12!=="yes"&&+v.p8<3)add("crit","The power supply cannot feed this card","Top cards want a 12V-2x6 cable (16-pin), or an adapter fed by three or four separate 8-pin cables. This power supply offers "+v.p8+" 8-pin plug"+(v.p8==="1"?"":"s")+" and no 16-pin cable.");
      else add("info","Push the 16-pin plug in all the way","The 12V-2x6 plug must sit flush, with no gap, and the cable must not be bent sharply within the first 3 to 4 cm. A half-seated plug is how these connectors melted.")}
    else if(g[2]>+v.p8&&!(v.p12==="yes"))add("crit","Not enough PCIe plugs for the graphics card","The card needs "+g[2]+" 8-pin plug"+(g[2]>1?"s":"")+", the power supply has "+v.p8+". Do not use adapters from SATA or Molex plugs: they are not built for the current.");
    else if(g[2]>=2)add("info","Use separate cables for each 8-pin socket","Many power supplies have one cable with two plugs on it. For cards above about 225 W, run two separate cables from the power supply.");
    if(v.bf==="itx"&&v.gpu!=="low")add("info","Check the thickness of the card as well","Small cases often take only cards that are two slots thick. Many high-end cards are three or more.")}
  if(v.cool==="stock"&&+v.cw>=125)add("high","The boxed cooler is not enough for this processor","Processors of the "+CPUW[v.cw][1]+" usually come without a cooler at all, and they draw around "+cpu+" W under load. Plan a large tower cooler or a 240 mm water cooler at least.");
  if(v.cool==="low"&&+v.cw>=105)add("high","A low-profile cooler will not hold this processor","It will run, hot and loud, and slow down under load. Low-profile coolers are made for 65 W.");
  if((v.cool==="tower"||v.cool==="low")){if(!v.ch)add("info","Enter the height of the cooler","Tower coolers are between 120 and 168 mm tall. Slim cases take 150 to 160 mm.");else if(v.ch>v.cch)add("crit","The cooler is "+(v.ch-v.cch)+" mm too tall for the case","Cooler "+v.ch+" mm, case "+v.cch+" mm. The side panel will not close.");else if(v.cch-v.ch<4)add("med","Only "+(v.cch-v.ch)+" mm between cooler and side panel","Fits by the numbers. Glass panels and sound mats sometimes take those millimetres.")}
  if(v.cool==="tower"&&v.rt==="ddr5"&&+v.rn===4)add("info","Tall memory under a wide cooler","Large tower coolers hang over the first memory slots. Modules with tall heat spreaders may not fit under the fan; the fan can usually be clipped a little higher, which adds to the height.");
  var rad=v.cool==="aio240"?240:v.cool==="aio360"?360:0;if(rad&&rad>+v.crad)add("crit","The case has no place for a "+rad+" mm radiator",+v.crad?"It takes "+v.crad+" mm at most.":"It takes no radiator at all. Use an air cooler.");
  if(rad)add("info","Mount the radiator so that air collects away from the pump","Radiator in the top, or in the front with the hose connections at the bottom. If the pump is the highest point of the loop, the air ends up in it and it rattles and wears.");
  if(v.cs==="am4"||v.cs==="am5"||v.cs==="lga1700"||v.cs==="lga1851")add("info","An older cooler may need a new mounting kit",{am4:"AM4 and AM5 use the same mounting, so nearly every AM4 cooler fits.",am5:"AM4 coolers fit AM5, with a few exceptions that replace the board's own backplate.",lga1700:"LGA 1700 has wider hole spacing than LGA 1200 and 115x. Older coolers need a kit from the maker, often free.",lga1851:"LGA 1851 uses the hole spacing of LGA 1700. Coolers for LGA 1700 fit; much older ones need a kit."}[v.cs]);
  if(+v.m2>+v.bm2)add("crit",v.m2+" M.2 drives, "+v.bm2+" M.2 slots","An adapter card for a free PCIe slot adds a slot. Check that the board can boot from it if it is to hold the system.");
  if(+v.m2>=2&&+v.sata>=1)add("info","M.2 slots can switch off SATA ports","On many boards a used M.2 slot disables one or two SATA ports, and a second M.2 slot shares its lanes with a PCIe slot. The table is in the board's manual: look before you wonder why a drive is missing.");
  if(v.pf==="atx"&&v.cpsu==="sfx")add("crit","The power supply is too large for the case","The case takes SFX power supplies only. An ATX unit is 150 mm wide and 86 mm high and does not go in.");
  if(v.pf==="sfx"&&v.cpsu==="atx")add("info","An SFX power supply in an ATX case needs a bracket","Some come with one. The cables of SFX units are short: check that the processor cable reaches the top of the board.");
  if(v.pw<load*1.1)add("crit","The power supply is too small","Estimated peak draw "+load+" W, power supply "+v.pw+" W. The PC will start, and switch off under load.");
  else if(v.pw<rec-49)add("med","The power supply is small for this build","Estimated peak draw "+load+" W, which is "+Math.round(load/v.pw*100)+" percent of "+v.pw+" W. It will work with a good unit. With "+rec+" W the fan stays quiet, short peaks of the graphics card have room, and a later upgrade does not need a new power supply.");
  else if(v.pw>load*3.2&&v.pw>=650)add("info","The power supply is much larger than needed","Estimated peak draw "+load+" W, power supply "+v.pw+" W. Not a problem, only money: at idle a very large unit works in its least efficient range.");
  if(+v.cw>=105)add("info","Two processor power plugs on the board?","Boards for strong processors have an 8-pin and an extra 4- or 8-pin EPS socket. One 8-pin is enough for nearly every processor at stock settings; the second one is for overclocking.");
  if(v.bs==="am5")add("info","The first start of an AM5 system takes minutes","DDR5 is trained on first power-on and after every BIOS reset. A black screen for one to five minutes with 32 GB and more is normal. Do not switch off.");
  if(v.cs===v.bs)add("info","A new processor on an older board may need a BIOS update first",SOCK[v.bs][2]==="amd"?"A board that was produced before the processor came out does not know it and shows nothing. Look for a button called BIOS Flashback or Q-Flash Plus on the back: it updates from a USB stick without a working processor.":"A board that was produced before the processor came out may not start it. Boards with a BIOS Flashback button can update without a working processor; otherwise you need an older processor, or the dealer does it.");
  return{f:f,load:load,rec:rec,ram:ram,cpu:cpu}}
function gauge(x,y,w,label,val,max,unit,bad,empty){var s='<text class="t2" x="'+x+'" y="'+(y-8)+'">'+label+'</text>',frac=max?Math.min(1.25,val/max):0;
  s+='<rect class="i" x="'+x+'" y="'+y+'" width="'+w+'" height="16" rx="4"/>';
  if(!empty)s+='<rect x="'+x+'" y="'+y+'" width="'+Math.max(4,Math.min(w+10,w*frac))+'" height="16" rx="4" class="'+(bad?"pbbad":"pbok")+'"/>';
  s+='<path class="pbmax" d="M'+(x+w)+' '+(y-5)+'v26"/><text class="tk" x="'+(x+w+18)+'" y="'+(y+12)+'">'+(empty?"":val+" of ")+max+" "+unit+'</text>';return s}
function draw(r){var crit=function(re){return r.f.some(function(x){return x[0]==="crit"&&re.test(x[1])})};
  var cs=FF[v.cf],bd=FF[v.bf],sc=0.62,cw=Math.round((cs[2]+150)*sc),chh=Math.round((cs[1]+110)*sc),ox=30,oy=46,W=760,Hh=Math.max(chh+oy+40,330);
  var s='<svg class="hwsvg pbsvg" viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="Side view of the case with board, cooler, graphics card and power supply, and three gauges for card length, cooler height and power">';
  s+='<text class="t2" x="'+ox+'" y="28">side view, '+esc(cs[0])+' case</text>';
  s+='<rect class="o" x="'+ox+'" y="'+oy+'" width="'+cw+'" height="'+chh+'" rx="8"/>';
  var bx=ox+14,by=oy+14,bw=Math.round(bd[1]*sc),bh=Math.round(bd[2]*sc),bbad=crit(/board is too large/);
  s+='<rect class="'+(bbad?"pbbadl":"pbboard")+'" x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+bh+'" rx="3"/><text class="tk" text-anchor="end" x="'+(bx+bw-6)+'" y="'+(by+bh-7)+'">'+esc(bd[0])+' board</text>';
  /* socket and cooler */
  var sx=bx+bw*0.42,sy=by+Math.min(46,bh*0.3),cb=crit(/cooler is|radiator/)||r.f.some(function(x){return x[0]==="high"&&/cooler/.test(x[1])});
  s+='<rect class="i" x="'+(sx-17)+'" y="'+(sy-17)+'" width="34" height="34" rx="2"/>';
  if(v.cool==="tower")s+='<rect class="'+(cb?"pbbadl":"h")+'" x="'+(sx-30)+'" y="'+(sy-30)+'" width="60" height="60" rx="4"/><circle class="i" cx="'+sx+'" cy="'+sy+'" r="22"/>';
  else if(v.cool.indexOf("aio")===0){var rl=(v.cool==="aio240"?240:360)*sc*0.86;s+='<circle class="'+(cb?"pbbadl":"h")+'" cx="'+sx+'" cy="'+sy+'" r="20"/><rect class="'+(cb?"pbbadl":"h")+'" x="'+(ox+cw-24-rl)+'" y="'+(oy+5)+'" width="'+rl+'" height="14" rx="3"/><path class="dash" d="M'+(sx+14)+' '+(sy-14)+'Q'+(sx+40)+' '+(oy+34)+' '+(ox+cw-24-rl/2)+' '+(oy+19)+'"/>'}
  else s+='<circle class="'+(cb?"pbbadl":"h")+'" cx="'+sx+'" cy="'+sy+'" r="'+(v.cool==="low"?19:17)+'"/>';
  /* memory */
  var n=+v.rn,slots=+v.bslots,rb=crit(/memory does not fit|modules,/);for(var i=0;i<slots;i++){var used=slots===4&&n===2?(i===1||i===3):i<n;s+='<rect class="'+(used?(rb?"pbbadl":"sel"):"i")+'" x="'+(sx+44+i*9)+'" y="'+(sy-34)+'" width="5" height="'+Math.min(78,bh*0.5)+'"/>'}
  /* graphics card */
  if(v.gpu!=="none"){var gy=by+Math.min(bh-30,Math.max(92,bh*0.52)),gl=(v.gl||({low:170,mid:240,high:310,top:340})[v.gpu])*sc,gb=crit(/graphics card is|PCIe plugs|cannot feed/);
    s+='<rect class="'+(gb?"pbbadl":"sel")+'" x="'+(ox+4)+'" y="'+gy+'" width="'+gl+'" height="'+({low:16,mid:22,high:28,top:32})[v.gpu]+'" rx="3"/><text class="tk" x="'+(ox+10)+'" y="'+(gy-5)+'">graphics card</text>';
    s+='<path class="pbmax" d="M'+(ox+4+v.cgl*sc)+' '+(gy-8)+'v48"/>'}
  /* power supply */
  var pb=crit(/power supply/),pwid=(v.pf==="sfx"?125:150)*sc,ph=(v.pf==="sfx"?64:86)*sc;s+='<rect class="'+(pb?"pbbadl":"a")+'" x="'+(ox+8)+'" y="'+(oy+chh-ph-8)+'" width="'+pwid+'" height="'+ph+'" rx="3"/><text class="tk" x="'+(ox+14)+'" y="'+(oy+chh-ph/2-4)+'">'+v.pw+' W</text>';
  /* gauges */
  var gx=Math.max(ox+cw+40,430),gw=W-gx-130;
  s+=gauge(gx,80,gw,"graphics card length",v.gl,v.cgl,"mm",v.gl>v.cgl,v.gpu==="none"||!v.gl);
  s+=gauge(gx,150,gw,"cooler height",v.ch,v.cch,"mm",v.ch>v.cch,!(v.cool==="tower"||v.cool==="low")||!v.ch);
  s+=gauge(gx,220,gw,"estimated peak power draw",r.load,v.pw,"W",v.pw<r.load*1.1,false);
  s+='<text class="tk" x="'+gx+'" y="262">processor '+r.cpu+' W, graphics '+GPU[v.gpu][1]+' W, rest '+(r.load-r.cpu-GPU[v.gpu][1])+' W</text>';
  return s+'</svg>'}
function render(){read();var r=check(),out=$("pb-out"),crit=r.f.filter(function(x){return x[0]==="crit"}).length,warn=r.f.filter(function(x){return x[0]==="high"||x[0]==="med"}).length;
  var h='<div class="verdict '+(crit?"v-crit":warn?"v-med":"v-none")+'"><b>'+(crit?crit+(crit===1?" part does":" parts do")+" not fit":warn?"Fits, with "+warn+(warn===1?" thing":" things")+" to think about":"These parts fit together")+'</b><span>'+(crit?"Fix the red ones before you order.":"Checked: socket, memory, sizes, clearances, plugs and power.")+'</span></div>';
  h+='<div class="stats"><div class="stat"><span class="stat-k">estimated peak draw</span><b class="stat-v" data-raw="1">'+r.load+' W</b></div><div class="stat"><span class="stat-k">sensible power supply</span><b class="stat-v" data-raw="1">'+r.rec+' W</b><span class="stat-s">peak at about two thirds</span></div><div class="stat"><span class="stat-k">memory</span><b class="stat-v" data-raw="1">'+r.ram+' GB</b><span class="stat-s">'+v.rn+' x '+v.rg+' GB '+v.rt.toUpperCase()+'</span></div></div>';
  h+='<figure class="hwfig pbfig">'+draw(r)+'<figcaption>Drawn to scale from your numbers. Pink is what does not fit, the dashed lines are the limits of the case.</figcaption></figure>';
  var order={crit:0,high:1,med:2,info:3};r.f.sort(function(a,b){return order[a[0]]-order[b[0]]});
  h+='<h2 class="plain" style="margin-top:30px">what the check found</h2>';
  r.f.forEach(function(x){h+='<details class="finding f-'+x[0]+'"'+(x[0]==="crit"||x[0]==="high"?" open":"")+'><summary><span class="sevtag s-'+x[0]+'">'+({crit:"does not fit",high:"problem",med:"think about",info:"tip"})[x[0]]+'</span><b>'+esc(x[1])+'</b></summary><p>'+esc(x[2])+'</p></details>'});
  out.innerHTML=h;
  try{history.replaceState(null,"","#b="+F.filter(function(f){return f[0]!=="g"}).map(function(f){return v[f[0]]}).join("."))}catch(e){}}
buildForm();
try{var m=/#b=([a-z0-9.]+)/.exec(location.hash);if(m){var p=m[1].split("."),k=0;F.forEach(function(f){if(f[0]==="g")return;var e=$("pb-"+f[0]),val=p[k++];if(val===undefined)return;if(f[2]==="n")e.value=val;else if(f[2][val]!==undefined)e.value=val})}}catch(e){}
form.addEventListener("input",render);form.addEventListener("change",render);
var EX={office:{use:"office",cs:"am5",cw:"65",igpu:"yes",bs:"am5",bf:"matx",br:"ddr5",bslots:"4",bm2:"2",rt:"ddr5",rn:"2",rg:"16",m2:"1",sata:"0",gpu:"none",gl:0,cool:"stock",ch:0,cf:"matx",cgl:330,cch:160,crad:"240",cpsu:"atx",pw:450,pf:"atx",p8:"0",p12:"no"},
 game:{use:"game",cs:"am5",cw:"105",igpu:"yes",bs:"am5",bf:"atx",br:"ddr5",bslots:"4",bm2:"3",rt:"ddr5",rn:"2",rg:"16",m2:"2",sata:"0",gpu:"high",gl:320,cool:"tower",ch:158,cf:"atx",cgl:380,cch:165,crad:"360",cpsu:"atx",pw:850,pf:"atx",p8:"3",p12:"yes"},
 bad:{use:"game",cs:"lga1700",cw:"125",igpu:"no",bs:"am5",bf:"atx",br:"ddr5",bslots:"2",bm2:"1",rt:"ddr4",rn:"4",rg:"8",m2:"2",sata:"2",gpu:"top",gl:357,cool:"stock",ch:0,cf:"matx",cgl:330,cch:155,crad:"240",cpsu:"atx",pw:550,pf:"atx",p8:"2",p12:"no"}};
Array.prototype.forEach.call(document.querySelectorAll("[data-pb]"),function(b){b.addEventListener("click",function(){var e=EX[b.getAttribute("data-pb")];Object.keys(e).forEach(function(k){$("pb-"+k).value=e[k]});render();$("pb-out").scrollIntoView({block:"start",behavior:"auto"})})});
render();window.pbTest={check:function(){read();return check()}};
})();
