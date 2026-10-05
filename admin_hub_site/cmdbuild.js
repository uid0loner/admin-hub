(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}

/* ---------- quoting ---------- */
function wq(s){s=String(s).trim().replace(/^"|"$/g,"");return /[\s&()^%!,;=]/.test(s)||s===""?'"'+s+'"':s}
function sq(s){s=String(s).trim();if(s==="")return "''";if(/^[A-Za-z0-9_.\/:@~+=,%-]+$/.test(s))return s;return "'"+s.replace(/'/g,"'\\''")+"'"}
function list(s){return String(s||"").split(/[,;\n]+/).map(function(x){return x.trim()}).filter(Boolean)}

/* A control: [id, type, label, default, hint, options]   types: text, num, check, select */
var TOOLS={
robocopy:{name:"robocopy",os:"Windows",intro:"Copy, mirror or move folders on Windows, with restart after a dropped connection. Built in since Vista.",
 presets:[["Copy a folder tree",{mode:"e"}],["Mirror to a backup target",{mode:"mir",fft:true,log:"C:\\Logs\\robocopy.log",xj:true}],["Migrate a file share with permissions",{mode:"e",sec:true,zb:true,mt:"32",dcopy:true,log:"C:\\Logs\\migration.log",xj:true}],["Move and delete the source",{mode:"move"}],["Dry run: show what would happen",{mode:"mir",dry:true}]],
 controls:[["src","text","Source folder","C:\\Data","A drive path or a share such as \\\\server\\share\\folder"],["dst","text","Destination folder","\\\\nas\\backup\\Data"],["files","text","Only these files (optional)","","For example *.pdf *.docx. Empty means everything."],
  ["mode","select","What to copy","e","",[["e","All subfolders, including empty ones"],["mir","Mirror: make the destination identical (deletes there)"],["move","Move: copy, then delete the source"],["top","Only the files in the top folder"]]],
  ["sec","check","Copy permissions, owner and auditing too",false,"Needed for file server migrations. Without it only data, attributes and timestamps are copied."],
  ["dcopy","check","Keep the timestamps of folders",true],["z","check","Restartable: resume a file after a dropped connection",true,"Slower on a fast local network, worth it over VPN and WAN."],
  ["zb","check","Backup mode: copy files you have no permission to read",false,"Needs an elevated prompt and the backup privilege. Replaces the restartable switch."],
  ["xj","check","Do not follow junctions",true,"Without this, a user profile sends robocopy into an endless loop through Application Data."],
  ["fft","check","The other side is a NAS or Linux server",false,"Tolerates two seconds of difference in timestamps, otherwise everything is copied again each run."],
  ["xo","check","Skip files that are newer at the destination",false],
  ["mt","num","Threads","8","1 to 128. More helps with many small files, not with a few large ones."],["r","num","Retries per file","2","The built-in default is one million."],["w","num","Seconds between retries","5","The built-in default is 30."],
  ["xd","text","Skip these folders","","Separate with commas, for example $RECYCLE.BIN, System Volume Information, node_modules"],["xf","text","Skip these files","","For example *.tmp, ~$*, Thumbs.db"],
  ["log","text","Write a log file","","Full path. Leave empty for no log."],["dry","check","Dry run: list only, change nothing",false]],
 build:function(v){
  var P=[],W=[];function p(t,why){P.push([t,why])}
  var src=v.src.trim().replace(/^"|"$/g,""),dst=v.dst.trim().replace(/^"|"$/g,"");
  if(/\\$/.test(src)&&/\s/.test(src)||/\\$/.test(dst)&&/\s/.test(dst))W.push(["info","The trailing backslash was removed. In quotes, \\\" is read as an escaped quote and robocopy misreads the whole line. This is the most common robocopy error."]);
  if(/\s/.test(src))src=src.replace(/\\+$/,"");if(/\s/.test(dst))dst=dst.replace(/\\+$/,"");
  p("robocopy","");p(wq(src),"source");p(wq(dst),"destination");
  list(v.files.replace(/\s+/g,",")).forEach(function(f){p(wq(f),"only files matching this pattern")});
  if(v.mode==="e")p("/E","all subfolders, including empty ones");
  if(v.mode==="mir"){p("/MIR","mirror: copy everything and delete at the destination what is not in the source");W.push([v.dry?"info":"high","/MIR deletes files at the destination that do not exist in the source. With source and destination swapped, or a source that is empty because a drive was not mounted, it empties the destination. Run it with the dry run first."])}
  if(v.mode==="move"){p("/E","all subfolders, including empty ones");p("/MOVE","delete files and folders in the source after they have been copied");W.push(["med","/MOVE deletes the source. A file that fails to copy stays, everything else is gone from the source when the run ends."])}
  if(v.sec)p("/COPYALL","copy data, attributes, timestamps, permissions, owner and auditing");else p("/COPY:DAT","copy data, attributes and timestamps (the default, written out)");
  if(v.dcopy)p("/DCOPY:DAT","keep attributes and timestamps of folders");
  if(v.zb)p("/ZB","restartable, and fall back to backup mode where access is denied");else if(v.z)p("/Z","restartable mode: a broken transfer continues where it stopped");
  if(v.sec&&!v.zb)W.push(["info","Copying permissions usually runs into files the admin account may not read. Backup mode in an elevated prompt gets past that."]);
  if(v.xj)p("/XJ","do not follow junctions and symbolic links");
  if(v.fft)p("/FFT","accept two seconds of timestamp difference (NAS, Samba, FAT)");
  if(v.xo)p("/XO","skip files that are older in the source than at the destination");
  var mt=parseInt(v.mt,10);if(mt>1)p("/MT:"+Math.min(128,mt),"copy with "+Math.min(128,mt)+" threads");
  var r=parseInt(v.r,10),w=parseInt(v.w,10);if(!isNaN(r))p("/R:"+r,"retry a failed file "+r+" times");if(!isNaN(w))p("/W:"+w,"wait "+w+" seconds between retries");
  var xd=list(v.xd),xf=list(v.xf);if(xd.length)p("/XD "+xd.map(wq).join(" "),"skip these folders");if(xf.length)p("/XF "+xf.map(wq).join(" "),"skip these files");
  if(/\$/.test(v.xd+v.xf+src+dst))W.push(["info","In PowerShell a name with a dollar sign, such as $RECYCLE.BIN, is read as a variable and vanishes. Put it in single quotes there, or run the line in cmd."]);
  if(v.dry)p("/L","list only: show what would be copied or deleted, change nothing");
  if(v.log.trim()){p("/LOG:"+wq(v.log),"write the output to this file (overwrites it; /LOG+: appends)");p("/TEE","also show the output on screen");p("/NP","no percentage per file, keeps the log readable")}
  if(mt>1&&v.log.trim()==="")W.push(["info","With several threads the screen output gets jumbled. Add a log file for long runs."]);
  if(src&&dst&&src.toLowerCase()===dst.toLowerCase())W.push(["high","Source and destination are the same folder."]);
  return {parts:P,warn:W,sep:" "};
 },
 after:[["Exit code","Meaning"],["0","Nothing to do, source and destination already match."],["1","Files were copied. Success."],["2","Extra files exist at the destination. Nothing failed."],["3","Files copied and extra files found (1 + 2)."],["4","Mismatched files or folders. Look at the log."],["8","Some files could not be copied."],["16","Serious error, nothing was copied: wrong path or no access."]],
 afterTitle:"exit codes",afterNote:"The codes add up. Anything below 8 is a success, which matters in scripts and scheduled tasks: a check for \"not 0\" reports a failure after every successful copy."},

rsync:{name:"rsync",os:"Linux, macOS",intro:"Synchronise folders locally or over SSH, transferring only what changed.",
 presets:[["Copy a folder to another server",{remote:true}],["Mirror, deleting what is gone",{del:true}],["Backup with permissions as root",{acl:true,numeric:true,onefs:true,del:true}],["Snapshot backup with hard links",{linkdest:"../latest",dst:"/backup/2026-10-05/"}],["Dry run",{dry:true,del:true}]],
 controls:[["src","text","Source","/srv/data/"],["dst","text","Destination","backup@nas.example.org:/volume1/backup/data/","A local path, or user@host:/path for SSH"],
  ["slash","select","Trailing slash on the source","keep","",[["keep","As typed"],["contents","Copy the contents of the folder (with slash)"],["folder","Copy the folder itself (no slash)"]]],
  ["a","check","Archive mode: keep permissions, times, owner, links",true],["v","check","Show what is transferred",true],["P","check","Show progress and keep partial files",true,"A broken transfer of a large file resumes instead of starting over."],
  ["z","check","Compress during transfer",false,"Helps on slow lines with text-like data. On a fast local network it only costs CPU."],
  ["del","check","Delete at the destination what is gone from the source",false],["dry","check","Dry run: show what would happen",false],
  ["acl","check","Also ACLs, extended attributes and hard links",false,"For full system or file server copies. Run as root on both sides."],["numeric","check","Keep numeric user and group IDs",false,"For backups: names may map to other IDs on the backup server."],
  ["onefs","check","Stay on one file system",false,"Does not descend into other mounts such as /proc, /sys or network shares."],["sum","check","Compare by checksum instead of size and time",false,"Much slower. For verifying a copy, not for daily runs."],
  ["port","num","SSH port","","Only if it is not 22"],["bw","num","Limit bandwidth, KB/s","","For example 5000 for about 40 Mbit/s"],
  ["ex","text","Exclude","","Patterns separated by commas, for example .cache/, *.tmp, node_modules/"],["linkdest","text","Hard-link unchanged files against this folder","","For snapshot backups: path of the previous backup, relative to the destination"]],
 build:function(v){
  var P=[],W=[];function p(t,why){P.push([t,why])}
  var src=v.src.trim(),dst=v.dst.trim();
  if(v.slash==="contents"&&!/\/$/.test(src))src+="/";if(v.slash==="folder")src=src.replace(/\/+$/,"")||"/";
  p("rsync","");var f="";
  if(v.a){f+="a"}if(v.acl){f+="HAX"}if(v.v)f+="v";if(v.z)f+="z";if(v.onefs)f+="x";if(v.dry)f+="n";if(f){var why=[];if(v.a)why.push("a: archive (recursive, keeps permissions, times, owner, group, symlinks)");if(v.acl)why.push("H: hard links, A: ACLs, X: extended attributes");if(v.v)why.push("v: list the files");if(v.z)why.push("z: compress in transit");if(v.onefs)why.push("x: do not cross file system boundaries");if(v.dry)why.push("n: dry run, change nothing");p("-"+f,why.join("; "))}
  if(!v.a)W.push(["med","Without archive mode rsync does not even recurse into folders and loses permissions and timestamps, so the next run copies everything again."]);
  p("-h","sizes in readable units");if(v.P)p("-P","show progress and keep partly transferred files for resuming");
  if(v.del){p("--delete","delete files at the destination that no longer exist in the source");W.push([v.dry?"info":"high","--delete removes files at the destination. If the source is empty because a disk was not mounted, the destination is emptied. Run it once with the dry run and read the lines that start with \"deleting\"."])}
  if(v.numeric)p("--numeric-ids","keep user and group numbers instead of mapping names");if(v.sum)p("--checksum","compare file contents, not just size and time");
  var bw=parseInt(v.bw,10);if(bw>0)p("--bwlimit="+bw,"use at most "+bw+" KB/s");
  list(v.ex).forEach(function(x){p("--exclude="+sq(x),"skip everything matching "+x)});
  if(v.linkdest.trim())p("--link-dest="+sq(v.linkdest),"files unchanged since that backup become hard links and take no extra space");
  var port=parseInt(v.port,10);if(port>0&&port!==22)p("-e "+sq("ssh -p "+port),"connect over SSH on port "+port);
  p(sq(src),/\/$/.test(src)?"source: the trailing slash means the contents of this folder":"source: no trailing slash, so the folder itself is created inside the destination");p(sq(dst),"destination");
  W.push(["info",/\/$/.test(src)?"With the trailing slash, the files inside "+src+" land directly in the destination.":"Without a trailing slash, rsync creates the folder \""+src.split("/").pop()+"\" inside the destination. Add a slash to copy only its contents. This is the classic rsync surprise."]);
  if(/^~/.test(src)&&sq(src)!==src||/^~/.test(dst.split(":").pop())&&sq(dst)!==dst)W.push(["med","A path in quotes that starts with ~ is not expanded to the home directory. Write the full path."]);
  if(v.acl&&!v.numeric)W.push(["info","For a backup of a whole system, add numeric IDs so that owners survive a restore on another machine."]);
  return {parts:P,warn:W,sep:" "};
 }},

tar:{name:"tar",os:"Linux, macOS, Windows 10+",intro:"Pack a folder into one archive, unpack it, or look inside.",
 presets:[["Pack a folder, gzip",{act:"c",comp:"z"}],["Pack small, zstd",{act:"c",comp:"zstd",archive:"backup.tar.zst"}],["Unpack into a folder",{act:"x",target:"/opt/app"}],["Look inside",{act:"t"}],["Unpack without the top folder",{act:"x",strip:"1",target:"/opt/app"}]],
 controls:[["act","select","What to do","c","",[["c","Create an archive"],["x","Extract an archive"],["t","List the contents"]]],["archive","text","Archive file","backup.tar.gz"],
  ["paths","text","What to pack","/etc /var/www","Create only. Several paths separated by spaces."],["target","text","Unpack into this folder","","Extract only. Empty means the current folder. The folder must exist."],
  ["comp","select","Compression","z","",[["","None (.tar)"],["z","gzip (.tar.gz): fast, works everywhere"],["j","bzip2 (.tar.bz2): smaller, slow"],["J","xz (.tar.xz): smallest, slowest"],["zstd","zstd (.tar.zst): fast and small, needs a recent tar"]]],
  ["v","check","List the files while working",true],["p","check","Keep permissions exactly",false,"Extract as root to restore owners too."],["rel","check","Store paths relative to the parent folder",true,"Create only. Unpacking then creates just the folder, not the full path from the root."],
  ["onefs","check","Stay on one file system",false],["ex","text","Exclude","","Patterns separated by commas, for example *.log, cache"],["strip","num","Drop leading path levels on extract","","1 removes the top folder of the archive"],["only","text","Extract only this path","","As shown by the list action"]],
 build:function(v){
  var P=[],W=[];function p(t,why){P.push([t,why])}
  var names={c:"create a new archive",x:"extract",t:"list the contents"},cn={z:"gzip",j:"bzip2",J:"xz"};
  p("tar","");var f=v.act+(cn[v.comp]?v.comp:"")+(v.v&&v.act!=="t"?"v":"")+(v.p&&v.act==="x"?"p":"")+"f";
  var why=[v.act+": "+names[v.act]];if(cn[v.comp])why.push(v.comp+": "+cn[v.comp]+" compression");if(v.v&&v.act!=="t")why.push("v: list each file");if(v.p&&v.act==="x")why.push("p: restore permissions exactly");why.push("f: the next word is the archive file");
  if(v.comp==="zstd")p("--zstd","zstd compression");
  p("-"+f,why.join("; "));p(sq(v.archive),"the archive");
  if(v.act==="c"){
    if(v.onefs)p("--one-file-system","do not descend into other mounts");list(v.ex).forEach(function(x){p("--exclude="+sq(x),"leave out everything matching "+x)});
    var paths=v.paths.trim().split(/\s+/).filter(Boolean);if(!paths.length)W.push(["high","Nothing to pack: enter at least one path."]);
    paths.forEach(function(x){var clean=x.replace(/\/+$/,"");if(v.rel&&clean.indexOf("/")>=0){var i=clean.lastIndexOf("/");p("-C "+sq(clean.slice(0,i)||"/"),"change into this folder first");p(sq(clean.slice(i+1)),"pack this folder, stored without its parent path")}else p(sq(x),"pack this")});
    var ext={z:/\.(tar\.gz|tgz)$/,j:/\.(tar\.bz2|tbz2?)$/,J:/\.(tar\.xz|txz)$/,zstd:/\.(tar\.zst|tzst)$/,"":/\.tar$/}[v.comp];if(!ext.test(v.archive.trim()))W.push(["info","The file name does not match the compression. It works, but the next person will guess wrong."]);
    if(paths.some(function(x){return v.archive.trim()&&(x==="."||x==="./")}))W.push(["med","Packing the current folder into an archive inside it makes tar try to pack the archive into itself. Write the archive somewhere else."]);
  }else{
    if(v.comp)W.push(["info","Current versions of tar detect the compression on their own when reading, so -"+v.act+"f is enough. The letter does no harm."]);
    if(v.act==="x"){if(v.target.trim())p("-C "+sq(v.target),"unpack into this folder");var s=parseInt(v.strip,10);if(s>0)p("--strip-components="+s,"drop the first "+s+" path level"+(s===1?"":"s")+" of every file");
      W.push(["info","Look inside first (the list action). An archive without a top folder scatters its files into the current folder, and files that exist are overwritten without a question."])}
    if(v.only.trim())p(sq(v.only),"only this path from the archive");
  }
  return {parts:P,warn:W,sep:" "};
 }},

find:{name:"find",os:"Linux, macOS",intro:"Find files by name, age, size or owner, and do something with them.",
 presets:[["Large files",{size:"+500M",type:"f",act:"ls"}],["Logs older than 30 days",{name:"*.log",days:"+30",type:"f",path:"/var/log"}],["Delete old temp files",{path:"/tmp",days:"+7",type:"f",act:"delete"}],["Changed in the last hour",{mins:"-60",type:"f"}],["World-writable files",{perm:"-o+w",type:"f",path:"/"}],["Empty folders",{type:"d",empty:true}]],
 controls:[["path","text","Where to look","/var/www"],["name","text","Name pattern","","For example *.log or backup-*. Empty means any name."],["icase","check","Ignore upper and lower case",true],
  ["type","select","Kind","f","",[["","Anything"],["f","Files"],["d","Folders"],["l","Symbolic links"]]],["size","text","Size","","+100M larger than 100 MB, -10k smaller than 10 KB"],
  ["days","text","Changed, in days","","+30 more than 30 days ago, -1 within the last day"],["mins","text","Changed, in minutes","","-60 within the last hour"],
  ["user","text","Owner","","User name or ID"],["perm","text","Permissions","","644 exactly, -o+w writable for everyone, /u+s setuid"],["depth","num","Maximum depth","","1 means only the folder itself, no subfolders"],
  ["empty","check","Only empty files or folders",false],["onefs","check","Stay on one file system",false,"Keeps find out of /proc, network shares and other mounts."],["not","text","Skip paths matching","","For example */node_modules/* or */.git/*"],
  ["act","select","Do what with the hits","print","",[["print","Print the path"],["ls","Show details (size, owner, date)"],["delete","Delete them"],["exec","Run a command on them"],["xargs","Pipe to another command (safe with spaces)"]]],
  ["cmd","text","Command","chmod 644","For the last two actions. The file names are appended."]],
 build:function(v){
  var P=[],W=[];function p(t,why){P.push([t,why])}
  p("find","");p(sq(v.path||"."),"start here and descend into subfolders");
  if(v.onefs)p("-xdev","do not cross into other file systems");var d=parseInt(v.depth,10);if(d>0)p("-maxdepth "+d,"go at most "+d+" level"+(d===1?"":"s")+" deep");
  if(v.not.trim())list(v.not).forEach(function(x){p("-not -path "+sq(x),"skip everything below paths matching "+x)});
  if(v.type)p("-type "+v.type,{f:"only regular files",d:"only folders",l:"only symbolic links"}[v.type]);
  if(v.name.trim())p((v.icase?"-iname ":"-name ")+"'"+v.name.trim().replace(/'/g,"'\\''")+"'","name matches this pattern"+(v.icase?", any case":"")+" (in quotes so the shell does not expand it first)");
  var sz=v.size.trim();if(sz){if(/^[+-]?\d+[cwbkMG]$/.test(sz))p("-size "+sz,(sz[0]==="+"?"larger than ":sz[0]==="-"?"smaller than ":"exactly ")+sz.replace(/^[+-]/,""));else W.push(["med","Size not understood. Write a number with a unit, such as +100M, -10k or +2G."])}
  var dy=v.days.trim();if(dy){if(/^[+-]?\d+$/.test(dy))p("-mtime "+dy,dy[0]==="+"?"last changed more than "+dy.slice(1)+" days ago":dy[0]==="-"?"changed within the last "+dy.slice(1)+" days":"changed "+dy+" days ago");else W.push(["med","Days not understood. Write +30, -7 or a plain number."])}
  var mn=v.mins.trim();if(mn){if(/^[+-]?\d+$/.test(mn))p("-mmin "+mn,mn[0]==="-"?"changed within the last "+mn.slice(1)+" minutes":mn[0]==="+"?"changed more than "+mn.slice(1)+" minutes ago":"changed "+mn+" minutes ago");else W.push(["med","Minutes not understood. Write -60 or +10."])}
  if(dy&&/^\+/.test(dy))W.push(["info","find counts whole days and drops the rest: -mtime +30 means at least 31 full days old."]);
  if(v.user.trim())p("-user "+sq(v.user),"owned by "+v.user.trim());if(v.perm.trim())p("-perm "+sq(v.perm),"permissions match "+v.perm.trim());if(v.empty)p("-empty","empty files or folders");
  var cmd=v.cmd.trim()||"echo";
  if(v.act==="ls")p("-ls","print details like ls -l");
  else if(v.act==="delete"){p("-delete","delete every hit");W.push(["high","-delete removes the hits without asking, and it must stand at the end: anything written after it is no longer a condition. Run the same line with -print first and read the list."]);
    if(!v.name.trim()&&!dy&&!mn&&!sz&&!v.empty&&!v.user.trim())W.push(["crit","No condition is set, so this deletes everything below "+(v.path||".")+"."])}
  else if(v.act==="exec")p("-exec "+cmd+" {} +","run the command with the hits appended, as many per call as fit");
  else if(v.act==="xargs"){p("-print0","separate the names with a zero byte, so spaces and line breaks in names are safe");p("| xargs -0 "+cmd,"hand the names to the command")}
  if(/^\/$/.test((v.path||"").trim())&&!v.onefs)W.push(["info","Searching from / walks into /proc, /sys and every mounted share. Add \"stay on one file system\", and expect permission errors unless you are root (append 2>/dev/null to hide them)."]);
  return {parts:P,warn:W,sep:" "};
 }}
};

/* ---------- UI ---------- */
var cur="robocopy",vals={};
function defaults(t){var o={};TOOLS[t].controls.forEach(function(c){o[c[0]]=c[3]});return o}
function form(){
  var T=TOOLS[cur],host=$("cmd-form");host.replaceChildren();
  T.controls.forEach(function(c){
    var id="cmd-"+c[0],wrap;
    if(c[1]==="check"){wrap=el("label","cmdchk");var i=document.createElement("input");i.type="checkbox";i.id=id;i.checked=!!vals[c[0]];i.addEventListener("change",function(){vals[c[0]]=i.checked;out()});var tx=el("span");tx.append(el("b",null,c[2]));if(c[4])tx.append(el("small",null,c[4]));wrap.append(i,tx)}
    else{wrap=el("label","fl cmdfld"+(c[1]==="num"?" narrow":""));wrap.append(document.createTextNode(c[2]));var e;
      if(c[1]==="select"){e=document.createElement("select");c[5].forEach(function(o){var op=el("option",null,o[1]);op.value=o[0];e.append(op)})}else{e=document.createElement("input");e.type="text";if(c[1]==="num")e.inputMode="numeric";e.autocomplete="off";e.spellcheck=false}
      e.className="q";e.id=id;e.value=vals[c[0]]===undefined?"":vals[c[0]];var h=function(){vals[c[0]]=e.value;out()};e.addEventListener("input",h);e.addEventListener("change",h);wrap.append(e);if(c[4])wrap.append(el("small",null,c[4]))}
    host.append(wrap);
  });
  var pr=$("cmd-presets");pr.replaceChildren(el("span","dim","start from"));
  T.presets.forEach(function(x){var b=el("button","chipbtn",x[0]);b.type="button";b.addEventListener("click",function(){vals=defaults(cur);Object.keys(x[1]).forEach(function(k){vals[k]=x[1][k]});form();out()});pr.append(b)});
  $("cmd-intro").textContent=T.intro+" Runs on: "+T.os+".";
  document.querySelectorAll("#cmd-tabs button").forEach(function(b){var on=b.getAttribute("data-tool")===cur;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on?"true":"false")});
  var af=$("cmd-after");af.replaceChildren();
  if(T.after){af.append(el("h2",null,T.afterTitle));var w=el("div","tw"),t=el("table","tbl"),th=el("thead"),tr=el("tr"),tb=el("tbody");T.after[0].forEach(function(x){tr.append(el("th",null,x))});th.append(tr);T.after.slice(1).forEach(function(r){var x=el("tr");r.forEach(function(c){x.append(el("td",null,c))});tb.append(x)});t.append(th,tb);w.append(t);af.append(w,el("p","note",T.afterNote))}
}
function out(){
  var T=TOOLS[cur],r=T.build(vals),text=r.parts.map(function(p){return p[0]}).join(" ");
  $("cmd-line").textContent=text;$("cmd-copy").onclick=function(){var b=$("cmd-copy");try{navigator.clipboard.writeText(text).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy"},1200)})}catch(e){}};
  var w=$("cmd-warn");w.replaceChildren();var rank={crit:0,high:1,med:2,info:3};
  r.warn.sort(function(a,b){return rank[a[0]]-rank[b[0]]}).forEach(function(x){var d=el("div","cmdw w-"+x[0]);d.append(el("span","sevtag s-"+x[0],{crit:"critical",high:"careful",med:"note",info:"good to know"}[x[0]]),el("p",null,x[1]));w.append(d)});
  var ex=$("cmd-explain");ex.replaceChildren();r.parts.forEach(function(p){if(!p[1])return;var row=el("div","cmdx");row.append(el("code",null,p[0]),el("span",null,p[1]));ex.append(row)});
  var q=["t="+cur];Object.keys(vals).forEach(function(k){var def=defaults(cur)[k];if(vals[k]!==def)q.push(k+"="+encodeURIComponent(vals[k]===true?"1":vals[k]===false?"0":vals[k]))});
  try{history.replaceState(null,"","#"+q.join("&"))}catch(e){}
}
function pick(t,keep){cur=t;if(!keep)vals=defaults(t);form();out()}
(function init(){
  var q={};location.hash.replace(/^#/,"").split("&").forEach(function(kv){var i=kv.indexOf("=");if(i>0)q[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1));else if(TOOLS[kv])q.t=kv});
  if(q.t&&TOOLS[q.t])cur=q.t;vals=defaults(cur);
  TOOLS[cur].controls.forEach(function(c){if(q[c[0]]!==undefined)vals[c[0]]=c[1]==="check"?q[c[0]]==="1":q[c[0]]});
  document.querySelectorAll("#cmd-tabs button").forEach(function(b){b.addEventListener("click",function(){pick(b.getAttribute("data-tool"))})});
  pick(cur,true);
})();
window.cmdBuild={TOOLS:TOOLS,line:function(t,v){var d=defaults(t);Object.keys(v||{}).forEach(function(k){d[k]=v[k]});return TOOLS[t].build(d).parts.map(function(p){return p[0]}).join(" ")}};
})();
