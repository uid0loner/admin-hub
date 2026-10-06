/* Storage upgrade planner: what to buy, what fits, and the steps to move the system over. */
(function(){"use strict";
var $=function(i){return document.getElementById(i)};if(!$("st-out"))return;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var ids=["dev","now","slot","goal","used","os","enc","move","age"];
function render(){var v={};ids.forEach(function(k){v[k]=$("st-"+k).value});var used=Math.max(0,parseInt(v.used,10)||0),F=[],steps=[],buy=[],crit=0;
  function add(s,t,x){F.push([s,t,x]);if(s==="crit")crit++}
  var soldered=v.now==="emmc",nvmeSlot=v.slot==="nvme",sataM2=v.slot==="m2sata",bay=v.slot==="bay",none=v.slot==="none",unknown=v.slot==="unknown";
  /* size */
  var need=Math.max(used*1.6,used+60),size=[500,1000,2000,4000,8000].filter(function(s){return s>=need})[0]||8000;if(v.goal==="space")size=Math.max(size,[500,1000,2000,4000,8000].filter(function(s){return s>=used*2.5})[0]||8000);if(size<480&&v.os!=="none")size=500;
  var label=size>=1000?(size/1000)+" TB":size+" GB";
  /* what to buy */
  var kind="";
  if(unknown){add("high","Find out which slots the device has before you buy","M.2 slots look alike and are not. A slot can take NVMe only, SATA only, or both, and the wrong drive is simply not found.","");
    kind="depends on the slot"}
  else if(nvmeSlot){kind="NVMe SSD, M.2 2280";buy.push(label+" NVMe SSD in M.2 2280 (check the length the slot takes: 2230, 2242 or 2280)")}
  else if(sataM2){kind="SATA SSD in M.2 form";buy.push(label+" M.2 SATA SSD (not NVMe: the slot is keyed and wired for SATA)")}
  else if(bay){kind="2.5 inch SATA SSD";buy.push(label+" 2.5 inch SATA SSD, 7 mm high");if(v.dev==="desktop")buy.push("A 2.5 to 3.5 inch bracket and a SATA data cable, if the case has no 2.5 inch place")}
  else if(none){kind="replace the existing drive";
    if(v.now==="hdd35"||v.now==="hdd25"||v.now==="ssd25")buy.push(label+" 2.5 inch SATA SSD, 7 mm high, to take the place of the old drive");
    else if(v.now==="m2sata")buy.push(label+" M.2 SATA SSD (or NVMe, only if the manual says the slot takes both)");
    else if(v.now==="nvme")buy.push(label+" NVMe SSD in the same length as the old one")}
  if(soldered){add("crit","The storage is soldered to the board","eMMC and many thin notebooks have no replaceable drive. Look for a free M.2 slot in the service manual. If there is none, the options are an external SSD on USB-C for data, or another device.");}
  if(none&&!soldered)buy.push(v.now==="nvme"||v.now==="m2sata"?"A USB enclosure for M.2 drives (NVMe or SATA, matching the new drive), to clone before swapping":"A USB to SATA adapter cable, to clone before swapping");
  if(v.dev==="notebook"&&bay)add("info","Check the height of the bay","Slim notebooks take 7 mm drives only. Nearly all SSDs are 7 mm, old hard disks were often 9.5 mm. Some notebooks need the old drive's frame, cable or rubber rails: keep them.");
  if(v.dev==="notebook"&&(nvmeSlot||sataM2))add("info","Check the length of the M.2 slot","2280 (80 mm) is the standard, but small notebooks and handhelds take 2230 or 2242 only. The screw post shows it. A shorter drive fits a longer slot only if there is a second screw position.");
  if(v.dev==="server")add("high","A server is not a PC: check the controller and the tray first","Servers want drives on the maker's compatibility list, in the right tray, and behind a RAID controller the new drive joins an array, it is not cloned. Replacing a failed member means: mark it offline, swap, let the controller rebuild. Read the server hardware guide before pulling anything.");
  if(v.now==="hdd35"||v.now==="hdd25"){if(v.goal!=="space")add("info","This is the upgrade with the largest effect","From a hard disk to any SSD, start and program launches get several times faster. From a SATA SSD to NVMe the difference is measurable and rarely felt in office work.")}
  else if(v.now==="ssd25"&&v.goal==="speed"&&nvmeSlot)add("info","Faster on paper, modest in daily use","NVMe copies large files three to ten times faster than SATA. Windows starts a second or two quicker. If the complaint is \"the PC is slow\", look at memory and autostart first.");
  else if(v.goal==="speed"&&!nvmeSlot&&(v.now==="ssd25"||v.now==="m2sata"))add("med","A new SATA SSD will not be faster than the old one","Both are limited by SATA at about 550 MB/s. Speed needs an NVMe slot. If the old SSD has become slow, it may be nearly full or worn: check it with the SMART reader.");
  if(v.goal==="space"&&v.dev==="desktop"&&!none&&!soldered)add("info","For space alone, add instead of replace","A second drive for data leaves the system untouched: no cloning, no risk. Large and cheap is still a 3.5 inch hard disk; put only data on it, never the system.");
  if(v.age==="old")add("med","An old board may not boot from NVMe","Boards from before about 2015 often have no M.2 slot, or can use NVMe only as a data drive. A PCIe adapter card works for data. For the system, a SATA SSD is the safe choice on these machines.");
  /* the move */
  if(v.goal==="failing"){add("crit","Do not clone a failing drive with a normal cloning tool","They stop at the first unreadable sector, or keep hammering it until the drive dies. Stop using the drive. Make an image with ddrescue from a Linux USB stick, which skips bad areas and comes back to them later, then restore that image to the new drive. If the data matters and there is no backup, a recovery lab comes before any experiment.");
    steps=["Stop working on the old drive. Every start makes it worse.","Boot a Linux USB stick (SystemRescue has ddrescue on board).","Image the old drive to the new one or to a file: ddrescue -f -n /dev/OLD /dev/NEW rescue.map, then a second pass with -r3.","Run a file system check on the copy, not on the original.","If the system on the copy does not start, install fresh and copy the data from the image."]}
  else if(v.os==="none"){steps=["Shut down, disconnect power"+(v.dev==="notebook"?" and, if you can reach it, the battery plug":"")+".","Fit the new drive.","Start, open Disk Management (Windows) or lsblk (Linux). The drive is there but empty.","Initialise it as GPT, create a volume, format it.","Move the data, and include the new drive in the backup."]}
  else if(v.move==="fresh"){steps=["Back up the data and export what lives outside the user folders: browser profiles, licence keys, the list of installed programs."+(v.enc==="yes"?" Save the BitLocker recovery key somewhere that is not this drive.":""),"Create an install USB stick with the maker's media creation tool, on another PC.","Shut down, disconnect power, fit the new drive. Leave the old one out for the installation, so that the boot files cannot land on the wrong drive.","Install, run the updates, install drivers from the maker of the PC, not from a driver tool.","Connect the old drive (inside or by USB), copy the data back, then wipe it."]}
  else{steps=[v.enc==="yes"?"Suspend BitLocker (Control Panel, BitLocker, Suspend protection) and save the recovery key. A cloned encrypted drive that asks for the key at first boot is the most common surprise.":"Check for encryption first: manage-bde -status on Windows. If it is on, suspend it and save the recovery key.",
      "Clean up: empty the recycle bin, uninstall what nobody uses. Run chkdsk C: /scan and fix what it finds.",
      none?"Connect the new drive through the USB enclosure or adapter.":"Shut down, fit the new drive in the free slot, start again.",
      "Clone with the tool of the SSD's maker if it has one (Samsung, Crucial, WD and Kingston offer one), or with Clonezilla or Macrium Reflect. Select the whole disk, not single partitions, so that the hidden boot and recovery partitions come along.",
      used&&size<1.2*used?"The new drive is close to the used space: tick the option to shrink partitions, and expect it to refuse.":"If the new drive is larger, let the tool grow the main partition, or extend it afterwards in Disk Management.",
      none?"Shut down, swap the drives, start.":"Shut down and unplug the old drive for the first start. Two identical systems confuse the firmware, and Windows may take the new one offline.",
      "If it does not start: open the firmware set-up, set the new drive first in the boot order, and check that UEFI or legacy mode is what it was before.",
      "When everything works: resume BitLocker, check that TRIM is on (fsutil behavior query DisableDeleteNotify shows 0), then wipe the old drive or keep it a week as a fallback."];
    if(v.now==="hdd35"||v.now==="hdd25")add("info","Coming from a hard disk: check the partition style","Old installations use MBR and legacy boot. They clone and run, but Windows 11 and Secure Boot need GPT and UEFI. Converting afterwards with mbr2gpt works on a healthy system; a fresh installation is the clean way.")}
  if(v.enc==="unknown"&&v.os==="win")add("med","Find out whether the drive is encrypted","Windows 11 switches on device encryption by itself on many PCs. Run manage-bde -status. If it says \"Protection On\", you need the recovery key before any change to the hardware: it is in the Microsoft account or in Entra ID or Active Directory.");
  if(used&&size&&used>size*0.8)add("med","The drive would start nearly full","SSDs slow down and wear faster above 80 to 90 percent. Take the next size up.");
  add("info","Buy by endurance and warranty, not by the fastest number","For office use any drive from a known maker with five years of warranty is right. Avoid the cheapest models without DRAM cache for a system drive, and QLC drives for workloads that write all day (virtual machines, video). Check the model, not only the brand.");
  add("info","The old drive still holds everything","Before it goes into a drawer, another PC or the bin: wipe it. For an SSD that means the maker's secure erase, not formatting.");
  var h='<div class="verdict '+(crit?"v-crit":F.some(function(x){return x[0]==="high"})?"v-high":"v-none")+'"><b>'+(soldered?"Not replaceable":unknown?"Check the slot first":esc(label)+", "+esc(kind))+'</b><span>'+(used?used+" GB in use today":"enter the used space for a size")+'</span></div>';
  if(buy.length&&!soldered)h+='<h2 class="plain" style="margin-top:30px">what to buy</h2><ul class="prose">'+buy.map(function(b){return "<li>"+esc(b)+"</li>"}).join("")+"</ul>";
  var order={crit:0,high:1,med:2,info:3};F.sort(function(a,b){return order[a[0]]-order[b[0]]});
  h+='<h2 class="plain" style="margin-top:30px">what to know</h2>';F.forEach(function(x){h+='<details class="finding f-'+x[0]+'"'+(order[x[0]]<2?" open":"")+'><summary><span class="sevtag s-'+x[0]+'">'+({crit:"stop",high:"first",med:"think about",info:"tip"})[x[0]]+'</span><b>'+esc(x[1])+'</b></summary><p>'+esc(x[2])+'</p></details>'});
  if(steps.length&&!soldered)h+='<h2 class="plain" style="margin-top:30px">the steps</h2><ol class="prose stsol">'+steps.map(function(s){return "<li>"+esc(s)+"</li>"}).join("")+"</ol>";
  $("st-out").innerHTML=h;$("st-movebox").hidden=v.os==="none"||v.goal==="failing";$("st-encbox").hidden=v.os!=="win"}
var form=$("st-form");form.addEventListener("input",render);form.addEventListener("change",render);render();
})();
