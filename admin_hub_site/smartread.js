(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
function num(s){var m=/-?\d[\d,.]*/.exec(String(s));return m?parseFloat(m[0].replace(/[,.](?=\d{3}\b)/g,"")):NaN}

/* what the attributes mean; kind: bad = any raw count above zero matters, wear = normalized value is remaining life */
var ATTR={
 1:["Read error rate","Errors while reading. On Seagate and some other drives the raw number is huge by design: judge by the normalised value."],
 3:["Spin-up time","How long the platters take to reach speed."],
 4:["Start/stop count","How often the drive spun up."],
 5:["Reallocated sectors","Sectors the drive gave up on and replaced with spares. Above zero the surface is damaged, and it usually keeps growing.","bad"],
 7:["Seek error rate","Head positioning errors. Huge raw values are normal on Seagate."],
 9:["Power-on hours","How long the drive has been running."],
 10:["Spin retry count","The motor needed more than one attempt to start. A mechanical warning.","bad"],
 12:["Power cycle count","How often the drive was switched on."],
 169:["Remaining life","Vendor's estimate of life left, in percent.","wear"],
 173:["Wear levelling","Erase cycles used, as a percentage of what the flash is rated for.","wear"],
 177:["Wear levelling count","Normalised value counts down from 100 as the flash wears.","wear"],
 179:["Used reserved blocks","Spare flash blocks already used."],
 181:["Program fail count","Flash blocks that failed to write.","bad"],
 182:["Erase fail count","Flash blocks that failed to erase.","bad"],
 183:["Runtime bad blocks","Blocks that went bad during use.","bad"],
 184:["End-to-end error","Data changed between the interface and the platter: a fault inside the drive.","bad"],
 187:["Reported uncorrectable errors","Read errors the drive could not fix and had to report to the computer.","bad"],
 188:["Command timeout","Commands that did not finish in time. Usually cable, power supply or controller.","cable"],
 190:["Airflow temperature","Temperature, on some drives shown as 100 minus degrees.","temp"],
 191:["G-sense error rate","Shocks and vibration registered while running."],
 192:["Unsafe shutdowns","Power lost while the drive was running."],
 193:["Load cycle count","How often the heads parked. Drives are rated for 300,000 to 600,000."],
 194:["Temperature","Drive temperature in degrees Celsius.","temp"],
 195:["Hardware ECC recovered","Errors fixed on the fly. Huge raw values are normal on Seagate and some SSDs."],
 196:["Reallocation events","How often the drive tried to move a sector to a spare.","bad"],
 197:["Pending sectors","Sectors the drive could not read and is waiting to retry. Data in them may already be lost.","bad"],
 198:["Offline uncorrectable","Sectors that failed during the drive's own background scan.","bad"],
 199:["Interface CRC errors","Data damaged on the cable between drive and controller. Points at the cable or connector, not the drive.","cable"],
 200:["Write error rate","Errors while writing."],
 202:["Lifetime remaining","Percent of rated life left (some vendors count used instead).","wear"],
 231:["SSD life left","Percent of rated life left.","wear"],
 232:["Available reserved space","Spare flash left, in percent.","wear"],
 233:["Media wearout indicator","Counts down from 100 as the flash wears.","wear"],
 241:["Total written","Amount of data written over the drive's life, in vendor units."],
 242:["Total read","Amount of data read over the drive's life, in vendor units."]
};

function parse(text){
  var t=text.replace(/\r/g,""),d={kind:null,info:{},attrs:[],tests:[],nvme:{}},m;
  function grab(re){var x=re.exec(t);return x?x[1].trim():""}
  d.info.model=grab(/^(?:Device Model|Model Number|Product):\s*(.+)$/m);d.info.family=grab(/^Model Family:\s*(.+)$/m);d.info.serial=grab(/^Serial [Nn]umber:\s*(.+)$/m);
  d.info.capacity=grab(/^(?:User Capacity|Total NVM Capacity|Namespace 1 Size\/Capacity):\s*.*?\[(.+?)\]/m);d.info.rotation=grab(/^Rotation Rate:\s*(.+)$/m);d.info.firmware=grab(/^Firmware Version:\s*(.+)$/m);
  d.health=grab(/^SMART overall-health self-assessment test result:\s*(.+)$/m)||grab(/^SMART Health Status:\s*(.+)$/m);
  /* ATA attribute table */
  var re=/^\s*(\d{1,3})\s+([A-Za-z0-9_\-\/]+)\s+(0x[0-9a-fA-F]{4})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3}|---)\s+(Pre-fail|Old_age)\s+(Always|Offline)\s+(\S+)\s+(.+)$/gm;
  while((m=re.exec(t)))d.attrs.push({id:+m[1],name:m[2],value:+m[4],worst:+m[5],thresh:m[6]==="---"?0:+m[6],type:m[7],failed:m[9],raw:m[10].trim(),rawN:num(m[10])});
  /* NVMe log */
  [["warn",/^Critical Warning:\s*(0x[0-9a-fA-F]+)/m],["temp",/^Temperature:\s*(\d+)\s*Celsius/m],["spare",/^Available Spare:\s*(\d+)%/m],["spareT",/^Available Spare Threshold:\s*(\d+)%/m],["used",/^Percentage Used:\s*(\d+)%/m],
   ["written",/^Data Units Written:\s*[\d,.]+\s*\[(.+?)\]/m],["hours",/^Power On Hours:\s*([\d,.]+)/m],["unsafe",/^Unsafe Shutdowns:\s*([\d,.]+)/m],["media",/^Media and Data Integrity Errors:\s*([\d,.]+)/m],["errlog",/^Error Information Log Entries:\s*([\d,.]+)/m],["cycles",/^Power Cycles:\s*([\d,.]+)/m]]
   .forEach(function(x){var r=x[1].exec(t);if(r)d.nvme[x[0]]=x[0]==="written"||x[0]==="warn"?r[1]:num(r[1])});
  var st=/^#\s*\d+\s+(.+?)\s{2,}(Completed[^\n]*?|Interrupted[^\n]*?|Aborted[^\n]*?|Fatal[^\n]*?|Self-test routine in progress[^\n]*?)\s{2,}(\d+%)\s+(\d+)\s+(\S+)/gm;
  while((m=st.exec(t)))d.tests.push({type:m[1].trim(),status:m[2].trim(),hours:+m[4],lba:m[5]});
  d.noTests=/No self-tests have been logged/.test(t);
  var ec=/^ATA Error Count:\s*(\d+)/m.exec(t);d.errCount=ec?+ec[1]:/No Errors Logged/.test(t)?0:null;
  d.kind=d.attrs.length?"ata":Object.keys(d.nvme).length>=3?"nvme":null;
  if(!d.kind){if(/SMART support is:\s*Unavailable|Device does not support SMART/i.test(t))throw new Error("this output says the device does not support SMART. Disks behind a USB adapter or a RAID controller often need an extra switch, such as -d sat or -d megaraid,0");
    throw new Error("no SMART data found. Paste the complete output of smartctl -a for one disk")}
  d.ssd=d.kind==="nvme"||/Solid State/i.test(d.info.rotation)||d.attrs.some(function(a){return ATTR[a.id]&&ATTR[a.id][2]==="wear"});
  return d;
}
function analyse(d){
  var F=[],A={},rank={crit:0,high:1,med:2,info:3};
  function add(sev,t,x){F.push({sev:sev,title:t,text:x})}
  d.attrs.forEach(function(a){A[a.id]=a});
  function raw(id){return A[id]&&!isNaN(A[id].rawN)?A[id].rawN:0}
  var hours=d.kind==="nvme"?d.nvme.hours:raw(9),temp=d.kind==="nvme"?d.nvme.temp:(A[194]?raw(194):A[190]?raw(190):NaN);
  if(d.kind==="ata"&&hours>500000)hours=NaN;
  if(/FAIL/i.test(d.health))add("crit","The drive says it is failing","The overall health test result is \""+d.health+"\". The drive itself predicts its end. Copy the data off now and replace it.");
  if(d.kind==="ata"){
    d.attrs.forEach(function(a){
      if(/FAILING_NOW/i.test(a.failed))add("crit",a.name.replace(/_/g," ")+" is below its threshold right now","Normalised value "+a.value+", threshold "+a.thresh+". This is one of the conditions the manufacturer defines as failed.");
      else if(/In_the_past/i.test(a.failed))add("med",a.name.replace(/_/g," ")+" was below its threshold in the past","It recovered, but the drive has been in a failed state before. For temperature that means it once ran too hot.");
    });
    var re=raw(5),pe=raw(197),ou=raw(198),ru=raw(187);
    if(pe>0)add(pe>=10?"crit":"high",pe+" pending sector"+(pe===1?"":"s"),"The drive could not read these sectors and is waiting for a chance to retry or replace them. Files that live there are damaged or unreadable. Back up everything now, then replace the drive. A number that drops back to zero after a full write means the sectors were remapped or recovered.");
    if(re>0)add(re>=100?"crit":"high",re+" reallocated sector"+(re===1?"":"s"),"The drive has replaced damaged sectors with spares. A handful that does not grow can stay for years in a redundant array. A number that rises between two readings means the surface is failing: replace it.");
    if(ou>0)add("high",ou+" uncorrectable sector"+(ou===1?"":"s")+" found by the background scan","The drive's own offline test found sectors it cannot read.");
    if(ru>0)add("high",ru+" uncorrectable error"+(ru===1?"":"s")+" reported to the computer","Read errors the drive could not hide. The operating system has seen I/O errors from this disk.");
    if(raw(10)>0)add("high","The motor needed retries to spin up","Spin retry count is "+raw(10)+". A mechanical problem, or not enough power on the 12 V line.");
    if(raw(184)>0)add("high","End-to-end errors","The drive caught data changing on its internal path "+raw(184)+" times. That is a fault inside the drive.");
    [181,182,183].forEach(function(id){if(raw(id)>0)add("med",A[id].name.replace(/_/g," ")+": "+raw(id),"Flash blocks that failed. A few over the life of an SSD are normal, a rising number is not.")});
    if(raw(199)>0)add("med",raw(199)+" CRC errors on the cable","Data arrived damaged between drive and controller. This is the cable or the connector, not the disk: replace the SATA cable or reseat the drive in its bay. The counter never goes back to zero, so note the value and see whether it still rises.");
    if(raw(188)>0&&raw(188)<1e6)add("info","Command timeouts: "+raw(188),"Commands that did not complete in time. Often a weak power supply, a bad cable or a controller problem, more rarely the drive.");
    d.attrs.forEach(function(a){var k=ATTR[a.id];if(k&&k[2]==="wear"&&a.value<=100){if(a.value<=10)add("high",k[0]+" at "+a.value+"%","The flash is close to the end of its rated life. Plan the replacement now. SSDs often keep working past zero, but nobody promises it.");else if(a.value<=30)add("med",k[0]+" at "+a.value+"%","Most of the rated write endurance is used. Order a replacement and watch the value.")}});
    d.attrs.forEach(function(a){if(a.thresh>0&&a.value<=a.thresh&&!/FAILING_NOW/i.test(a.failed)&&a.type==="Pre-fail")add("crit",a.name.replace(/_/g," ")+" has reached its threshold","Value "+a.value+", threshold "+a.thresh+".")});
    if(raw(193)>300000)add("info","Heads parked "+raw(193).toLocaleString("en-US")+" times","Drives are rated for 300,000 to 600,000 load cycles. An aggressive power-saving setting parks the heads every few seconds: it can be turned down with hdparm -B or the vendor's tool.");
    if(d.errCount>0)add("med",d.errCount+" errors in the drive's error log","Run smartctl -l error to read them. Errors with the letters UNC are unreadable sectors, ICRC and ABRT point at the cable or controller. Old errors from one event matter less than new ones.");
  }else{
    var w=parseInt(d.nvme.warn||"0",16);
    if(w){var bits=[];if(w&1)bits.push("spare space is below the threshold");if(w&2)bits.push("temperature is outside the limit");if(w&4)bits.push("reliability is degraded");if(w&8)bits.push("the drive has switched to read-only");if(w&16)bits.push("the backup capacitor has failed");
      add("crit","Critical warning "+d.nvme.warn,"The drive reports: "+bits.join(", ")+". Copy the data off and replace it.")}
    if(d.nvme.spare!==undefined&&d.nvme.spareT!==undefined&&d.nvme.spare<=d.nvme.spareT)add("crit","Spare space used up","Available spare is "+d.nvme.spare+"%, the threshold is "+d.nvme.spareT+"%. No reserve is left to replace worn blocks.");
    else if(d.nvme.spare<50)add("med","Available spare down to "+d.nvme.spare+"%","The drive has used a good part of its reserve blocks.");
    if(d.nvme.media>0)add("high",d.nvme.media+" media and data integrity error"+(d.nvme.media===1?"":"s"),"The drive returned data it knew to be wrong, or could not read it. Any number above zero is a reason to replace an NVMe drive.");
    if(d.nvme.used>=100)add("high","Rated endurance used up: "+d.nvme.used+"%","The drive has written more than the manufacturer rates it for. It may run on for a long time, but it is out of its design life: replace it at the next opportunity.");
    else if(d.nvme.used>=80)add("med","Endurance "+d.nvme.used+"% used","Plan the replacement. The value is the manufacturer's estimate from the amount written.");
    if(d.nvme.errlog>0)add("info",d.nvme.errlog.toLocaleString("en-US")+" entries in the error log","On NVMe this counter often rises for harmless reasons, such as a command the drive does not support. It matters together with media errors, not alone.");
    if(d.nvme.unsafe>100)add("info",d.nvme.unsafe.toLocaleString("en-US")+" unsafe shutdowns","Power was lost that often while the drive was on. On a laptop that is held power buttons and empty batteries. On a server it is a reason to look at the power supply.");
  }
  if(!isNaN(temp)&&temp>0&&temp<120){var lim=d.kind==="nvme"?70:d.ssd?65:50;if(temp>=lim+10)add("high","Running hot: "+temp+" °C","Well above what this kind of drive should see in normal operation. Heat shortens the life of every drive. Check fans and airflow.");else if(temp>=lim)add("med","Warm: "+temp+" °C","At the upper end. Check airflow, especially for drives packed closely in a NAS or an NVMe drive without a heat sink.")}
  var bad=d.tests.filter(function(x){return /fail/i.test(x.status)});
  if(bad.length)add("crit","A self-test failed","\""+bad[0].type+"\" ended with \""+bad[0].status+"\" at "+bad[0].hours+" power-on hours"+(bad[0].lba&&bad[0].lba!=="-"?", first bad sector "+bad[0].lba:"")+". The drive failed its own test. Replace it.");
  else if(d.kind==="ata"&&(d.noTests||!d.tests.length))add("info","No self-test on record","The attributes only show problems the drive has stumbled over. A long self-test reads the whole surface: smartctl -t long /dev/sdX, then read the result some hours later with smartctl -l selftest. A monthly test by smartd or the NAS is good practice.");
  var years=hours/8766;
  if(!isNaN(hours)&&years>=5&&!d.ssd)add("info","In service for "+(Math.round(years*10)/10)+" years","Hard disks fail more often after about five years of running. Not a reason to replace a healthy drive, but a reason to be sure the backup works.");
  F.sort(function(a,b){return rank[a.sev]-rank[b.sev]});
  return {findings:F,worst:F.length?F[0].sev:"none",hours:hours,years:years,temp:temp,A:A};
}
function rowState(a){var k=ATTR[a.id];if(/FAILING_NOW/i.test(a.failed))return "failing";if(k&&k[2]==="bad"&&a.rawN>0)return "bad";if(k&&k[2]==="cable"&&a.rawN>0&&a.rawN<1e6)return "check";if(k&&k[2]==="wear"&&a.value<=30)return "worn";return ""}
function render(d,R,name){
  var out=$("sm-out");out.replaceChildren();
  var v=el("div","verdict v-"+(R.worst==="none"||R.worst==="info"?"none":R.worst));
  v.append(el("b",null,R.worst==="crit"?"Replace this drive":R.worst==="high"?"Back up now and plan the replacement":R.worst==="med"?"Usable, with points to watch":"Looks healthy"),
   el("span",null,[d.info.model||d.info.family||"unknown model",d.info.capacity,d.kind==="nvme"?"NVMe SSD":d.ssd?"SATA SSD":"hard disk"].filter(Boolean).join(" · ")));
  out.append(v);
  function tile(k,val,s){var x=el("div","stat"),b=el("b","stat-v",val);b.setAttribute("data-raw","");x.append(el("span","stat-k",k),b);if(s)x.append(el("span","stat-s",s));return x}
  var st=el("div","stats");st.style.setProperty("--cols","4");
  st.append(tile("running for",isNaN(R.hours)?"unknown":R.years>=1?(Math.round(R.years*10)/10)+" years":Math.round(R.hours/24)+" days",isNaN(R.hours)?"":Math.round(R.hours).toLocaleString("en-US")+" power-on hours"),tile("temperature",isNaN(R.temp)||R.temp<=0||R.temp>=120?"unknown":R.temp+" °C",d.kind==="nvme"?"up to 70 is fine":d.ssd?"up to 60 is fine":"25 to 45 is ideal"));
  if(d.kind==="nvme")st.append(tile("endurance used",d.nvme.used===undefined?"unknown":d.nvme.used+"%",d.nvme.written?d.nvme.written+" written":""),tile("media errors",d.nvme.media===undefined?"unknown":String(d.nvme.media),"spare: "+(d.nvme.spare===undefined?"?":d.nvme.spare+"%")));
  else{var wear=d.attrs.filter(function(a){return ATTR[a.id]&&ATTR[a.id][2]==="wear"&&a.value<=100})[0];
    st.append(tile("bad sectors",String((R.A[5]?R.A[5].rawN||0:0)+(R.A[197]?R.A[197].rawN||0:0)),"reallocated plus pending"),wear?tile("life left",wear.value+"%",ATTR[wear.id][0].toLowerCase()):tile("self-tests",d.tests.length?String(d.tests.length):"none",d.tests.length?"last: "+d.tests[0].status.toLowerCase():"none on record"))}
  out.append(st);
  out.append(el("h2",null,"findings"));
  if(!R.findings.length)out.append(el("p","dim","Nothing in this output points at a problem. SMART catches about two thirds of failures in advance, the rest come without warning: a healthy reading does not replace a backup."));
  R.findings.forEach(function(f){var dd=el("details","finding"),s=el("summary");s.append(el("span","sevtag s-"+f.sev,{crit:"critical",high:"high",med:"medium",info:"info"}[f.sev]),el("b",null,f.title));dd.append(s,el("p",null,f.text));if(f.sev==="crit"||f.sev==="high")dd.open=true;out.append(dd)});
  if(d.kind==="ata"){
    out.append(el("h2",null,"the attributes in plain words"),el("p","dim","Value counts down from 100 or 200 towards the threshold: lower is worse. Raw is the real count. Rows that matter are marked."));
    var w=el("div","tw"),t=el("table","tbl smtbl"),th=el("thead"),tr=el("tr"),tb=el("tbody");["#","Attribute","Value","Worst","Thresh","Raw","What it means"].forEach(function(c){tr.append(el("th",null,c))});th.append(tr);
    d.attrs.forEach(function(a){var k=ATTR[a.id],x=el("tr"),s=rowState(a);if(s)x.className="sm-"+s;
      x.append(el("td",null,a.id),el("td",null,k?k[0]:a.name.replace(/_/g," ")),el("td",null,a.value),el("td",null,a.worst),el("td",null,a.thresh||"-"),el("td",null,a.raw),el("td",null,(s==="bad"||s==="failing"?"Not zero. ":s==="check"?"Check the cable. ":s==="worn"?"Nearly used up. ":"")+(k?k[1]:"Vendor-specific attribute.")));tb.append(x)});
    t.append(th,tb);w.append(t);out.append(w);
  }else{
    out.append(el("h2",null,"the health log in plain words"));
    var rows=[["Critical warning",d.nvme.warn,"Should be 0x00. Anything else is the drive raising its hand."],["Available spare",d.nvme.spare===undefined?"":d.nvme.spare+"% (threshold "+(d.nvme.spareT===undefined?"?":d.nvme.spareT)+"%)","Reserve blocks left to replace worn ones."],["Percentage used",d.nvme.used===undefined?"":d.nvme.used+"%","Rated write endurance consumed. Can go past 100."],["Data written",d.nvme.written||"","Total over the drive's life."],
     ["Media and data integrity errors",d.nvme.media,"Should be 0."],["Unsafe shutdowns",d.nvme.unsafe,"Power lost while running."],["Error log entries",d.nvme.errlog,"Often harmless on its own."],["Power cycles",d.nvme.cycles,""],["Power-on hours",d.nvme.hours,""],["Temperature",d.nvme.temp===undefined?"":d.nvme.temp+" °C",""]];
    var w2=el("div","tw"),t2=el("table","tbl"),b2=el("tbody");rows.forEach(function(r){if(r[1]===undefined||r[1]==="")return;var x=el("tr");x.append(el("td",null,r[0]),el("td",null,typeof r[1]==="number"?r[1].toLocaleString("en-US"):r[1]),el("td",null,r[2]));b2.append(x)});t2.append(b2);w2.append(t2);out.append(w2);
  }
  if(d.tests.length){out.append(el("h2",null,"self-tests"));var w3=el("div","tw"),t3=el("table","tbl"),h3=el("thead"),r3=el("tr"),b3=el("tbody");["Test","Result","At power-on hours","First bad sector"].forEach(function(c){r3.append(el("th",null,c))});h3.append(r3);
    d.tests.slice(0,8).forEach(function(x){var r=el("tr");r.append(el("td",null,x.type),el("td",null,x.status),el("td",null,x.hours.toLocaleString("en-US")),el("td",null,x.lba));b3.append(r)});t3.append(h3,b3);w3.append(t3);out.append(w3)}
  $("sm-status").textContent="Read "+(d.kind==="ata"?d.attrs.length+" attributes":"the NVMe health log")+" from "+name+"."+(d.info.serial?" Serial number ends in "+d.info.serial.slice(-4)+".":"");
  out.hidden=false;
}
function load(text,name){
  try{var d=parse(text);render(d,analyse(d),name);$("sm-out").scrollIntoView({behavior:"smooth",block:"start"})}
  catch(e){$("sm-out").hidden=true;$("sm-status").textContent="Could not read that: "+e.message+"."}
}
var SAMPLES={
hdd:"smartctl 7.4 2023-08-01 r5530 [x86_64-linux-6.8.0] (local build)\n\n=== START OF INFORMATION SECTION ===\nModel Family:     Example NAS HDD\nDevice Model:     EX8000NAS-00ABCD\nSerial Number:    ZX12AB34\nFirmware Version: 82.00A82\nUser Capacity:    8,001,563,222,016 bytes [8.00 TB]\nSector Sizes:     512 bytes logical, 4096 bytes physical\nRotation Rate:    5400 rpm\nSMART support is: Available - device has SMART capability.\nSMART support is: Enabled\n\n=== START OF READ SMART DATA SECTION ===\nSMART overall-health self-assessment test result: PASSED\n\nSMART Attributes Data Structure revision number: 16\nVendor Specific SMART Attributes with Thresholds:\nID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE\n  1 Raw_Read_Error_Rate     0x002f   200   200   051    Pre-fail  Always       -       37\n  3 Spin_Up_Time            0x0027   186   178   021    Pre-fail  Always       -       7683\n  4 Start_Stop_Count        0x0032   100   100   000    Old_age   Always       -       412\n  5 Reallocated_Sector_Ct   0x0033   196   196   140    Pre-fail  Always       -       152\n  7 Seek_Error_Rate         0x002e   200   200   000    Old_age   Always       -       0\n  9 Power_On_Hours          0x0032   032   032   000    Old_age   Always       -       49830\n 10 Spin_Retry_Count        0x0032   100   100   000    Old_age   Always       -       0\n 12 Power_Cycle_Count       0x0032   100   100   000    Old_age   Always       -       118\n192 Power-Off_Retract_Count 0x0032   200   200   000    Old_age   Always       -       71\n193 Load_Cycle_Count        0x0032   178   178   000    Old_age   Always       -       68211\n194 Temperature_Celsius     0x0022   108   096   000    Old_age   Always       -       44\n196 Reallocated_Event_Ct    0x0032   178   178   000    Old_age   Always       -       22\n197 Current_Pending_Sector  0x0032   200   200   000    Old_age   Always       -       16\n198 Offline_Uncorrectable   0x0030   200   200   000    Old_age   Offline      -       9\n199 UDMA_CRC_Error_Count    0x0032   200   200   000    Old_age   Always       -       3\n200 Multi_Zone_Error_Rate   0x0008   200   200   000    Old_age   Offline      -       2\n\nSMART Error Log Version: 1\nATA Error Count: 14 (device log contains only the most recent five errors)\n\nSMART Self-test log structure revision number 1\nNum  Test_Description    Status                  Remaining  LifeTime(hours)  LBA_of_first_error\n# 1  Extended offline    Completed: read failure       40%     49811         5120773944\n# 2  Short offline       Completed without error       00%     49650         -\n# 3  Extended offline    Completed without error       00%     48930         -\n",
ok:"smartctl 7.4 2023-08-01 r5530 [x86_64-linux-6.8.0] (local build)\n\n=== START OF INFORMATION SECTION ===\nModel Family:     Example Enterprise HDD\nDevice Model:     EX16000ENT-11EFGH\nSerial Number:    2CK9XYZW\nUser Capacity:    16,000,900,608,000 bytes [16.0 TB]\nRotation Rate:    7200 rpm\n\n=== START OF READ SMART DATA SECTION ===\nSMART overall-health self-assessment test result: PASSED\n\nID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE\n  1 Raw_Read_Error_Rate     0x000b   100   100   001    Pre-fail  Always       -       0\n  3 Spin_Up_Time            0x0007   084   084   001    Pre-fail  Always       -       343\n  4 Start_Stop_Count        0x0012   100   100   000    Old_age   Always       -       31\n  5 Reallocated_Sector_Ct   0x0033   100   100   001    Pre-fail  Always       -       0\n  7 Seek_Error_Rate         0x000a   100   100   001    Old_age   Always       -       0\n  9 Power_On_Hours          0x0012   098   098   000    Old_age   Always       -       17544\n 10 Spin_Retry_Count        0x0012   100   100   001    Old_age   Always       -       0\n 12 Power_Cycle_Count       0x0032   100   100   000    Old_age   Always       -       31\n193 Load_Cycle_Count        0x0012   100   100   000    Old_age   Always       -       1120\n194 Temperature_Celsius     0x0002   162   162   000    Old_age   Always       -       37 (Min/Max 19/46)\n196 Reallocated_Event_Ct    0x0032   100   100   000    Old_age   Always       -       0\n197 Current_Pending_Sector  0x0022   100   100   000    Old_age   Always       -       0\n198 Offline_Uncorrectable   0x0008   100   100   000    Old_age   Offline      -       0\n199 UDMA_CRC_Error_Count    0x000a   200   200   000    Old_age   Always       -       0\n\nSMART Error Log Version: 1\nNo Errors Logged\n\nNum  Test_Description    Status                  Remaining  LifeTime(hours)  LBA_of_first_error\n# 1  Extended offline    Completed without error       00%     17380         -\n# 2  Short offline       Completed without error       00%     17212         -\n",
nvme:"smartctl 7.4 2023-08-01 r5530 [x86_64-linux-6.8.0] (local build)\n\n=== START OF INFORMATION SECTION ===\nModel Number:                       Example NVMe 1TB\nSerial Number:                      S6XNNX0T123456\nFirmware Version:                   4B2QGXA7\nTotal NVM Capacity:                 1,000,204,886,016 [1.00 TB]\n\n=== START OF SMART DATA SECTION ===\nSMART overall-health self-assessment test result: PASSED\n\nSMART/Health Information (NVMe Log 0x02)\nCritical Warning:                   0x00\nTemperature:                        74 Celsius\nAvailable Spare:                    100%\nAvailable Spare Threshold:          10%\nPercentage Used:                    86%\nData Units Read:                    412,300,111 [211 TB]\nData Units Written:                 1,032,551,402 [528 TB]\nHost Read Commands:                 3,912,004,188\nHost Write Commands:                9,120,774,301\nController Busy Time:               41,202\nPower Cycles:                       1,204\nPower On Hours:                     21,877\nUnsafe Shutdowns:                   312\nMedia and Data Integrity Errors:    0\nError Information Log Entries:      2,418\nWarning  Comp. Temperature Time:    1,130\nCritical Comp. Temperature Time:    0\n"};
window.smartRead={parse:parse,analyse:analyse};
var drop=$("sm-drop"),file=$("sm-file"),ta=$("sm-text");
function readFile(f){if(!f)return;var r=new FileReader();r.onload=function(){ta.value=String(r.result);load(ta.value,f.name)};r.readAsText(f)}
file.addEventListener("change",function(){readFile(file.files[0]);file.value=""});
["dragenter","dragover"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.add("over")})});
["dragleave","drop"].forEach(function(x){drop.addEventListener(x,function(e){e.preventDefault();drop.classList.remove("over")})});
drop.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files[0])readFile(e.dataTransfer.files[0])});
$("sm-run").addEventListener("click",function(){if(ta.value.trim())load(ta.value,"pasted text");else $("sm-status").textContent="Paste the output of smartctl -a first."});
[["sm-sample","hdd","a made-up failing hard disk"],["sm-sample2","ok","a made-up healthy hard disk"],["sm-sample3","nvme","a made-up worn NVMe drive"]].forEach(function(x){$(x[0]).addEventListener("click",function(){ta.value=SAMPLES[x[1]];load(ta.value,x[2])})});
if(location.hash==="#sample"){ta.value=SAMPLES.hdd;load(ta.value,"a made-up failing hard disk")}
})();
