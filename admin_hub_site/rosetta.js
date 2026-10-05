(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
/* [task, bash, powershell, note?] grouped by category */
var D=[
["files and folders",[
 ["Where am I","pwd","Get-Location"],
 ["List files, with details and hidden ones","ls -la","Get-ChildItem -Force"],
 ["List files, newest first","ls -lt | head","Get-ChildItem | Sort-Object LastWriteTime -Descending | Select-Object -First 10"],
 ["Find files by name, in all subfolders","find . -name '*.log'","Get-ChildItem -Recurse -Filter *.log"],
 ["Find files larger than 100 MB","find . -type f -size +100M","Get-ChildItem -Recurse -File | Where-Object Length -gt 100MB"],
 ["Find files changed in the last day","find . -type f -mtime -1","Get-ChildItem -Recurse -File | Where-Object LastWriteTime -gt (Get-Date).AddDays(-1)"],
 ["Copy a folder with everything in it","cp -a source/ target/","Copy-Item source target -Recurse"],
 ["Move or rename","mv old.txt new.txt","Move-Item old.txt new.txt"],
 ["Delete a folder and its contents","rm -rf folder","Remove-Item folder -Recurse -Force","Both delete without asking and without a recycle bin."],
 ["Create a folder, including parents","mkdir -p a/b/c","New-Item -ItemType Directory -Force a\\b\\c"],
 ["Create an empty file, or update its time","touch file.txt","New-Item file.txt -ItemType File -Force"],
 ["Size of a folder","du -sh folder","(Get-ChildItem folder -Recurse -File | Measure-Object Length -Sum).Sum / 1GB"],
 ["Free disk space","df -h","Get-PSDrive -PSProvider FileSystem"],
 ["Does a file exist","[[ -f file.txt ]] && echo yes","Test-Path file.txt"],
 ["Checksum of a file","sha256sum file.iso","Get-FileHash file.iso -Algorithm SHA256"],
 ["Pack a folder","tar -czf backup.tar.gz folder","Compress-Archive folder backup.zip"],
 ["Unpack an archive","tar -xzf backup.tar.gz","Expand-Archive backup.zip -DestinationPath ."],
 ["Who owns it, who may do what","ls -l file ; getfacl file","Get-Acl file | Format-List"],
 ["Create a link","ln -s /real/path link","New-Item -ItemType SymbolicLink -Path link -Target C:\\real\\path"]]],
["text",[
 ["Show a file","cat file.txt","Get-Content file.txt"],
 ["First and last lines","head -n 20 file.txt ; tail -n 20 file.txt","Get-Content file.txt -TotalCount 20 ; Get-Content file.txt -Tail 20"],
 ["Follow a file as it grows","tail -f app.log","Get-Content app.log -Wait -Tail 10"],
 ["Search for text in files","grep -rn 'timeout' /var/log","Select-String -Path C:\\Logs\\*.log -Pattern 'timeout'"],
 ["Search, ignoring case, showing the lines around","grep -i -C 2 'error' app.log","Select-String app.log -Pattern 'error' -Context 2"],
 ["Lines that do not match","grep -v 'DEBUG' app.log","Get-Content app.log | Where-Object { $_ -notmatch 'DEBUG' }"],
 ["Count lines","wc -l file.txt","(Get-Content file.txt | Measure-Object -Line).Lines"],
 ["Replace text in a file","sed -i 's/old/new/g' file.txt","(Get-Content file.txt) -replace 'old', 'new' | Set-Content file.txt"],
 ["One column of a delimited file","cut -d, -f2 data.csv","Import-Csv data.csv | Select-Object -ExpandProperty Name","PowerShell reads the header line and gives you the column by name."],
 ["Sort and remove duplicates","sort file.txt | uniq","Get-Content file.txt | Sort-Object -Unique"],
 ["Count how often each line occurs","sort file.txt | uniq -c | sort -rn","Get-Content file.txt | Group-Object | Sort-Object Count -Descending | Select-Object Count, Name"],
 ["Compare two files","diff a.txt b.txt","Compare-Object (Get-Content a.txt) (Get-Content b.txt)"],
 ["Write output to a file, or append","command > out.txt ; command >> out.txt","command | Set-Content out.txt ; command | Add-Content out.txt"],
 ["Show on screen and write to a file","command | tee out.txt","command | Tee-Object out.txt"],
 ["Throw output away","command > /dev/null 2>&1","command *> $null"],
 ["Read JSON and pick a field","jq -r '.server.port' config.json","(Get-Content config.json -Raw | ConvertFrom-Json).server.port","jq is a separate package on most systems."],
 ["Decode and encode Base64","echo 'aGVsbG8=' | base64 -d ; echo -n hello | base64","[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('aGVsbG8=')) ; [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('hello'))"]]],
["processes and services",[
 ["List processes","ps aux","Get-Process"],
 ["What uses the most CPU","ps aux --sort=-%cpu | head","Get-Process | Sort-Object CPU -Descending | Select-Object -First 10"],
 ["What uses the most memory","ps aux --sort=-%mem | head","Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10"],
 ["Find a process by name","pgrep -a nginx","Get-Process nginx"],
 ["End a process","kill 1234 ; kill -9 1234","Stop-Process -Id 1234 ; Stop-Process -Id 1234 -Force"],
 ["End all processes with a name","pkill firefox","Stop-Process -Name firefox"],
 ["State of a service","systemctl status nginx","Get-Service Spooler"],
 ["Start, stop, restart a service","sudo systemctl restart nginx","Restart-Service Spooler"],
 ["Start a service at boot","sudo systemctl enable nginx","Set-Service Spooler -StartupType Automatic"],
 ["All services that are not running but should be","systemctl --failed","Get-Service | Where-Object { $_.StartType -eq 'Automatic' -and $_.Status -ne 'Running' }"],
 ["Scheduled jobs","crontab -l ; systemctl list-timers","Get-ScheduledTask | Where-Object State -ne Disabled"],
 ["Run something in the background","long-command &","Start-Job { long-command }"],
 ["How long has the system been up","uptime","(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime"],
 ["Restart or shut down","sudo reboot ; sudo shutdown -h now","Restart-Computer ; Stop-Computer"]]],
["network",[
 ["My addresses","ip addr","Get-NetIPAddress -AddressFamily IPv4"],
 ["Routes and the default gateway","ip route","Get-NetRoute -DestinationPrefix 0.0.0.0/0"],
 ["Which DNS servers am I using","resolvectl status","Get-DnsClientServerAddress -AddressFamily IPv4"],
 ["Ping","ping -c 4 example.org","Test-Connection example.org -Count 4"],
 ["Is a TCP port reachable","nc -vz example.org 443","Test-NetConnection example.org -Port 443"],
 ["Trace the route","traceroute example.org","Test-NetConnection example.org -TraceRoute"],
 ["Look up a name","dig +short example.org","Resolve-DnsName example.org"],
 ["Look up a record type","dig +short MX example.org","Resolve-DnsName example.org -Type MX"],
 ["What is listening on which port","sudo ss -tlnp","Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess"],
 ["Which process owns a port","sudo ss -tlnp | grep :443","Get-Process -Id (Get-NetTCPConnection -LocalPort 443).OwningProcess"],
 ["Download a file","curl -fLO https://example.org/file.zip","Invoke-WebRequest https://example.org/file.zip -OutFile file.zip"],
 ["Call an API and read JSON","curl -s https://api.example.org/items | jq .","Invoke-RestMethod https://api.example.org/items"],
 ["Only the response headers","curl -sI https://example.org","(Invoke-WebRequest https://example.org -Method Head).Headers"],
 ["Flush the DNS cache","sudo resolvectl flush-caches","Clear-DnsClientCache"],
 ["Firewall rules","sudo nft list ruleset ; sudo ufw status","Get-NetFirewallRule -Enabled True -Direction Inbound"],
 ["Copy a file to another machine","scp file.txt user@host:/tmp/","Copy-Item file.txt -Destination C:\\Temp -ToSession (New-PSSession host)"],
 ["Run a command on another machine","ssh user@host 'uptime'","Invoke-Command -ComputerName host -ScriptBlock { hostname }"]]],
["system and users",[
 ["Operating system and version","cat /etc/os-release ; uname -r","Get-ComputerInfo -Property OsName, OsVersion"],
 ["Host name","hostname","$env:COMPUTERNAME"],
 ["Who am I, and in which groups","id","whoami /groups"],
 ["Who is logged on","w","quser"],
 ["Local users","cut -d: -f1 /etc/passwd","Get-LocalUser"],
 ["Members of the admin group","getent group sudo","Get-LocalGroupMember Administrators"],
 ["Add a user","sudo useradd -m anna","New-LocalUser anna"],
 ["Environment variables","printenv","Get-ChildItem Env:"],
 ["Set a variable for this session","export NAME=value","$env:NAME = 'value'"],
 ["Where is a program","command -v python3","Get-Command python"],
 ["Installed packages","dpkg -l ; rpm -qa","Get-Package ; winget list"],
 ["Install a package","sudo apt install htop ; sudo dnf install htop","winget install Microsoft.PowerToys"],
 ["Install updates","sudo apt update && sudo apt full-upgrade","winget upgrade --all","Windows updates themselves come through Windows Update, not winget."],
 ["Recent system log entries","journalctl -n 50","Get-WinEvent -LogName System -MaxEvents 50"],
 ["Errors in the system log since yesterday","journalctl -p err --since yesterday","Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=(Get-Date).AddDays(-1)}"],
 ["Memory","free -h","Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory"],
 ["Disks and partitions","lsblk","Get-Disk ; Get-Partition"],
 ["Command history","history","Get-History"],
 ["Help for a command","man tar ; tar --help","Get-Help Get-ChildItem -Examples"]]],
["scripting",[
 ["A variable","name=\"web01\"","$name = 'web01'","No spaces around = in Bash."],
 ["Use it in a string","echo \"Server $name\"","\"Server $name\""],
 ["Output of a command into a variable","today=$(date +%F)","$today = Get-Date -Format yyyy-MM-dd"],
 ["If","if [[ -f file ]]; then echo yes; else echo no; fi","if (Test-Path file) { 'yes' } else { 'no' }"],
 ["Compare numbers","if (( n > 10 )); then ...; fi","if ($n -gt 10) { ... }","PowerShell uses -eq -ne -gt -lt -ge -le, because > writes to a file."],
 ["Loop over a list","for h in web01 web02; do echo \"$h\"; done","foreach ($h in 'web01','web02') { $h }"],
 ["Loop over files","for f in *.log; do echo \"$f\"; done","Get-ChildItem *.log | ForEach-Object { $_.Name }"],
 ["Loop over the lines of a file","while IFS= read -r line; do echo \"$line\"; done < hosts.txt","Get-Content hosts.txt | ForEach-Object { $_ }"],
 ["Count from 1 to 10","for i in {1..10}; do echo $i; done","1..10 | ForEach-Object { $_ }"],
 ["A function","greet() { echo \"hello $1\"; }","function Greet($name) { \"hello $name\" }"],
 ["Arguments of the script","$1 $2 \"$@\"","param($First, $Second) or $args"],
 ["Did the last command work","echo $?","$?  and  $LASTEXITCODE","$? is true or false. $LASTEXITCODE holds the number from a program."],
 ["Stop on the first error","set -euo pipefail","$ErrorActionPreference = 'Stop'"],
 ["Run the next command only if the first worked","make && make install","make; if ($?) { make install }","PowerShell 7 also understands && and ||."],
 ["A comment","# comment","# comment  and  <# block #>"],
 ["Run a script","bash script.sh  or  ./script.sh","pwsh script.ps1  or  .\\script.ps1"],
 ["Wait","sleep 5","Start-Sleep -Seconds 5"],
 ["Time a command","time command","Measure-Command { command }"],
 ["Today's date in a file name","backup-$(date +%F).tar.gz","\"backup-$(Get-Date -Format yyyy-MM-dd).zip\""]]]
];
var cat="all";
function copy(text,btn){try{navigator.clipboard.writeText(text).then(function(){btn.textContent="copied";setTimeout(function(){btn.textContent="copy"},1100)})}catch(e){}}
function cell(label,text){var d=el("div","rscell");d.append(el("span","rslab",label));var c=el("code",null,text),b=el("button","rscp","copy");b.type="button";b.setAttribute("aria-label","Copy the "+label+" command");b.addEventListener("click",function(){copy(text,b)});d.append(c,b);return d}
function render(){
  var q=$("q").value.trim().toLowerCase(),words=q.split(/\s+/).filter(Boolean),out=$("rs-out"),n=0,total=0;out.replaceChildren();
  D.forEach(function(g){
    var rows=g[1].filter(function(r){total++;if(cat!=="all"&&cat!==g[0])return false;if(!words.length)return true;var h=(r[0]+" "+r[1]+" "+r[2]+" "+(r[3]||"")+" "+g[0]).toLowerCase();return words.every(function(w){return h.indexOf(w)>=0})});
    if(!rows.length)return;n+=rows.length;
    var sec=el("section","rssec");sec.append(el("h2",null,g[0]));
    rows.forEach(function(r){var row=el("div","rsrow");row.append(el("h3",null,r[0]),cell("bash",r[1]),cell("powershell",r[2]));if(r[3])row.append(el("p","rsnote",r[3]));sec.append(row)});
    out.append(sec);
  });
  $("rs-n").textContent=q||cat!=="all"?n+" of "+total+" tasks":total+" tasks";
  if(!n)out.append(el("p","dim","Nothing matches. Try the name of a command you know from the other side, such as grep or Get-ChildItem."));
  try{history.replaceState(null,"",q?"?q="+encodeURIComponent(q):location.pathname)}catch(e){}
}
var chips=$("rs-cats");[["all","all"]].concat(D.map(function(g){return [g[0],g[0]]})).forEach(function(c){var b=el("button","chipbtn"+(c[0]==="all"?" on":""),c[1]);b.type="button";b.setAttribute("aria-pressed",c[0]==="all"?"true":"false");
  b.addEventListener("click",function(){cat=c[0];chips.querySelectorAll("button").forEach(function(x){var on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on?"true":"false")});render()});chips.append(b)});
$("q").value=new URLSearchParams(location.search).get("q")||"";
$("q").addEventListener("input",render);$("q").addEventListener("keydown",function(e){if(e.key==="Escape"){$("q").value="";render()}});
render();
window.rosetta={count:D.reduce(function(a,g){return a+g[1].length},0),data:D};
})();
