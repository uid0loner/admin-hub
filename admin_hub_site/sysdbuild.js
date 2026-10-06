/* systemd unit builder: a service file, an optional timer, every line explained. */
(function(){"use strict";
var $=function(i){return document.getElementById(i)};if(!$("sd-out"))return;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var ids=["kind","name","desc","cmd","user","dir","restart","after","env","hard","mem","cpu","when","custom","persist"];
function val(k){var e=$("sd-"+k);return e.type==="checkbox"?e.checked:e.value.trim()}
var WHEN={"hourly":["hourly","every hour, on the hour"],"daily":["*-*-* 02:00:00","every day at 02:00"],"weekdays":["Mon..Fri *-*-* 01:30:00","Monday to Friday at 01:30"],"weekly":["Sun *-*-* 22:00:00","every Sunday at 22:00"],"monthly":["*-*-01 04:00:00","on the first of every month at 04:00"],"15min":["*:0/15","every 15 minutes"],"boot":["",""],"custom":["",""]};
function build(){var v={};ids.forEach(function(k){v[k]=val(k)});var warn=[],L=[],T=[],name=v.name.replace(/\.(service|timer)$/,"").replace(/[^A-Za-z0-9:_.@-]/g,"-")||"myjob",job=v.kind!=="service",timer=v.kind==="timer";
  function add(arr,line,why){arr.push([line,why])}
  if(v.name&&name!==v.name.replace(/\.(service|timer)$/,""))warn.push(["info","The name was changed to "+name,"Unit names may contain letters, digits and : _ . @ - only."]);
  if(!v.cmd)warn.push(["high","There is no command yet","ExecStart needs the program to run, with its full path."]);
  var cmd=v.cmd||"/usr/local/bin/"+name,shell=/[|<>&;*$`]|\s&&\s|\|\|/.test(cmd)&&!/^\/(usr\/)?bin\/(ba)?sh\s+-c/.test(cmd),first=cmd.split(/\s+/)[0];
  if(shell){warn.push(["med","The command uses shell features","systemd starts the program directly, without a shell. Pipes, redirects, && and wildcards are passed to the program as plain text. The command is wrapped in /bin/sh -c below. A script file is the cleaner way."]);cmd="/bin/sh -c '"+cmd.replace(/'/g,"'\\''")+"'"}
  else if(first[0]!=="/"&&first[0]!=="-"&&first[0]!=="@"){warn.push(["high","The command needs its full path","systemd does not search PATH the way your shell does: \""+first+"\" must be written as /usr/bin/"+first+" or wherever it lives. Find it with: command -v "+first]);}
  if(/^(sudo|su)\b/.test(v.cmd))warn.push(["high","Do not use sudo in a unit","The unit already runs as the user named in User=. sudo inside a service waits for a password that nobody types."]);
  if(/\bnohup\b|&\s*$/.test(v.cmd))warn.push(["med","No nohup and no & at the end","systemd keeps the program running and watches it. A program that sends itself to the background looks to systemd as if it had ended."]);
  /* [Unit] */
  add(L,"[Unit]","What the unit is and when it may start.");
  add(L,"Description="+(v.desc||name),"Shown in systemctl status and in the journal. Write what it does, not its name again.");
  if(v.after==="network"){add(L,"Wants=network-online.target","Asks systemd to bring the network fully up.");add(L,"After=network-online.target","Start only after the network has an address. Without this pair a service that needs the network fails at boot and works when started by hand.")}
  else if(v.after==="db"){add(L,"Wants=network-online.target","Asks for the network to be fully up.");add(L,"After=network-online.target postgresql.service mariadb.service","Start after the network and after the database, if one of these is installed. After= only orders, it does not start them.")}
  if(v.dir)add(L,"ConditionPathExists="+v.dir,"Skip the unit quietly when the folder is missing, instead of failing.");
  add(L,"","");add(L,"[Service]","How the program is run.");
  if(job){add(L,"Type=oneshot","The program does its work and ends. systemd waits for it and records success or failure.")}
  else{add(L,"Type=simple","The program stays in the foreground and runs until stopped. Right for nearly everything. Type=notify is for programs that report \"ready\" themselves, Type=forking for old daemons that fork into the background.")}
  add(L,"ExecStart="+cmd,"The program and its arguments. Full path, no shell.");
  var user=v.user||"root";
  if(user==="dynamic"){add(L,"DynamicUser=yes","systemd invents a user for this service at start and removes it at stop. The service cannot own files outside the folders below.");add(L,"StateDirectory="+name,"Creates /var/lib/"+name+", owned by the service, for data that must survive a restart.")}
  else if(user!=="root"){add(L,"User="+user,"Run as this user instead of root. The user must exist: sudo useradd --system --no-create-home --shell /usr/sbin/nologin "+user);add(L,"Group="+user,"And as this group.")}
  else if(v.hard==="none")warn.push(["med","The service runs as root without any restriction","If the program is taken over, the attacker is root. Give it its own user, or at least the basic hardening."]);
  if(v.dir)add(L,"WorkingDirectory="+v.dir,"The folder the program starts in. Relative paths in the program resolve from here.");
  if(v.env)add(L,"EnvironmentFile="+(v.env[0]==="-"?v.env:"-"+v.env),"Reads KEY=value lines from this file into the environment. Keep passwords here, not in the unit, and chmod 600 the file. The leading minus means: no error if the file is missing.");
  if(!job){var r=v.restart;if(r!=="no"){add(L,"Restart="+r,r==="on-failure"?"Start again when the program crashes or exits with an error, not when it was stopped on purpose or ended cleanly.":"Start again whenever it ends, whatever the reason.");add(L,"RestartSec=5","Wait five seconds before the restart, so that a broken service does not spin.");
      L.splice(2,0,["StartLimitIntervalSec=300","Counting window for the next line. These two belong in [Unit]."],["StartLimitBurst=5","Give up after five failed starts within five minutes, instead of restarting for ever. systemctl reset-failed clears the counter."])}
    else warn.push(["info","The service is not restarted after a crash","Restart=no is the default. For anything that should simply stay up, on-failure is the usual choice."])}
  if(v.mem)add(L,"MemoryMax="+v.mem,"The kernel kills the service when it uses more memory than this. Protects the rest of the machine from a leak.");
  if(v.cpu)add(L,"CPUQuota="+v.cpu.replace(/%?$/,"%"),"At most this share of one CPU core. 200% means two cores.");
  if(v.hard!=="none"){add(L,"NoNewPrivileges=yes","The program and its children can never gain more rights, for example through setuid programs.");add(L,"PrivateTmp=yes","Its own empty /tmp, invisible to other services, deleted at stop.");add(L,"ProtectSystem="+(v.hard==="strict"?"strict":"full"),v.hard==="strict"?"The whole file system is read-only for this service, except the paths allowed below.":"/usr, /boot and /etc are read-only for this service.");add(L,"ProtectHome=yes","/home, /root and /run/user are not visible. Remove this line if the program works in a home folder.");
    if(v.hard==="strict"){if(user!=="dynamic")add(L,"ReadWritePaths="+(v.dir||"/var/lib/"+name),"The only place the service may write. Add more paths separated by spaces.");add(L,"ProtectKernelTunables=yes","No writing to /proc/sys and /sys.");add(L,"ProtectKernelModules=yes","No loading of kernel modules.");add(L,"ProtectControlGroups=yes","The cgroup tree is read-only.");add(L,"RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6","Only local sockets and normal IPv4 and IPv6 networking. No raw packets.");add(L,"RestrictNamespaces=yes","No creating of new namespaces (containers inside the service).");add(L,"LockPersonality=yes","Cannot switch the kernel's execution domain, an old trick for exploits.");add(L,"CapabilityBoundingSet=","An empty list: no root capabilities at all, even if the program runs as root. If it must bind to a port below 1024, write CAP_NET_BIND_SERVICE here and add AmbientCapabilities=CAP_NET_BIND_SERVICE.");add(L,"SystemCallFilter=@system-service","Only the system calls a normal service needs.")}}
  if(!timer){add(L,"","");add(L,"[Install]","What \"enable\" means for this unit.");add(L,"WantedBy=multi-user.target","systemctl enable links the unit into the normal boot. Without an [Install] section, enable does nothing.")}
  if(timer){var w=v.when,oc=w==="custom"?v.custom:WHEN[w][0];
    add(T,"[Unit]","");add(T,"Description="+(v.desc||name)+" (timer)","");add(T,"","");add(T,"[Timer]","When the service of the same name is started.");
    if(w==="boot"){add(T,"OnBootSec=5min","Five minutes after the machine has started.");add(T,"OnUnitActiveSec=1d","And then again one day after each run.")}
    else{if(!oc)warn.push(["high","There is no schedule yet","Enter an OnCalendar expression, for example Mon..Fri 01:30 or *-*-01 04:00:00."]);add(T,"OnCalendar="+(oc||"daily"),w==="custom"?"Your schedule. Check it with the systemd-analyze command below.":"Runs "+WHEN[w][1]+", in the server's time zone.")}
    if(v.persist&&w!=="boot")add(T,"Persistent=true","If the machine was off at the planned time, run once as soon as it is up again. Cron does not do this.");
    add(T,"RandomizedDelaySec=5min","Start up to five minutes late, at random, so that not every machine hits the backup server in the same second. Remove it when the exact minute matters.");
    add(T,"","");add(T,"[Install]","");add(T,"WantedBy=timers.target","Enable the timer, not the service: the timer starts the service.")}
  return{name:name,L:L,T:T,warn:warn,timer:timer,job:job,when:v.when,oc:timer?(v.when==="custom"?v.custom:WHEN[v.when][0]):""}}
function fileText(a){return a.map(function(x){return x[0]}).join("\n")+"\n"}
function block(title,path,a,id){var h='<h2 class="plain" style="margin-top:34px">'+esc(title)+'</h2><p class="dim" style="margin:0 0 8px">Save as <code>'+esc(path)+'</code></p><div class="csrow"><pre id="'+id+'">'+esc(fileText(a))+'</pre><button type="button" class="btn ghost sdcopy" data-copy="'+id+'">Copy</button></div>';
  h+='<details class="sdwhy"><summary>Every line explained</summary><div class="tw"><table class="tbl"><tbody>'+a.filter(function(x){return x[0]&&x[1]}).map(function(x){return '<tr><th scope="row"><code>'+esc(x[0].length>46?x[0].slice(0,44)+"...":x[0])+'</code></th><td>'+esc(x[1])+'</td></tr>'}).join("")+'</tbody></table></div></details>';return h}
function render(){var r=build(),n=r.name,h="";
  $("sd-timerbox").hidden=!r.timer;$("sd-custombox").hidden=!(r.timer&&$("sd-when").value==="custom");$("sd-restartbox").hidden=r.job;
  r.warn.forEach(function(w){h+='<details class="finding f-'+w[0]+'"'+(w[0]==="high"?" open":"")+'><summary><span class="sevtag s-'+w[0]+'">'+({high:"fix this",med:"think about",info:"note"})[w[0]]+'</span><b>'+esc(w[1])+'</b></summary><p>'+esc(w[2])+'</p></details>'});
  h+=block(n+".service","/etc/systemd/system/"+n+".service",r.L,"sd-svc");
  if(r.timer)h+=block(n+".timer","/etc/systemd/system/"+n+".timer",r.T,"sd-tmr");
  var cmds=["sudo systemctl daemon-reload","sudo systemd-analyze verify /etc/systemd/system/"+n+".service"];
  if(r.timer){if(r.oc)cmds.push('systemd-analyze calendar "'+r.oc+'"     # shows the next run');cmds.push("sudo systemctl enable --now "+n+".timer","systemctl list-timers "+n+".timer","sudo systemctl start "+n+".service     # run it once now, to test","journalctl -u "+n+".service -n 50")}
  else if(r.job)cmds.push("sudo systemctl start "+n+".service","systemctl status "+n+".service","journalctl -u "+n+".service -n 50","sudo systemctl enable "+n+".service     # run at every boot");
  else cmds.push("sudo systemctl enable --now "+n+".service","systemctl status "+n+".service","journalctl -u "+n+".service -f");
  if($("sd-hard").value!=="none")cmds.push("systemd-analyze security "+n+".service     # rates the hardening, line by line");
  h+='<h2 class="plain" style="margin-top:34px">install and test</h2><div class="csrow"><pre id="sd-cmds">'+esc(cmds.join("\n"))+'</pre><button type="button" class="btn ghost sdcopy" data-copy="sd-cmds">Copy</button></div>';
  $("sd-out").innerHTML=h}
$("sd-out").addEventListener("click",function(e){var b=e.target.closest("[data-copy]");if(!b)return;var t=$(b.getAttribute("data-copy")).textContent;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy"},1400)})});
var form=$("sd-form");form.addEventListener("input",render);form.addEventListener("change",render);
var EX={web:{kind:"service",name:"shop-api",desc:"Shop API (Node.js)",cmd:"/usr/bin/node /srv/shop/server.js",user:"shop",dir:"/srv/shop",restart:"on-failure",after:"db",env:"/etc/shop/shop.env",hard:"basic",mem:"512M",cpu:""},
 backup:{kind:"timer",name:"nightly-backup",desc:"Nightly backup of /srv to the NAS",cmd:"/usr/local/bin/backup.sh",user:"root",dir:"",restart:"no",after:"network",env:"",hard:"basic",mem:"",cpu:"50",when:"daily",persist:true},
 pipe:{kind:"job",name:"cleanup",desc:"Remove old exports",cmd:"find /srv/exports -mtime +30 -delete && echo done > /var/log/cleanup.last",user:"root",dir:"",restart:"no",after:"none",env:"",hard:"none",mem:"",cpu:""}};
Array.prototype.forEach.call(document.querySelectorAll("[data-sd]"),function(b){b.addEventListener("click",function(){var e=EX[b.getAttribute("data-sd")];Object.keys(e).forEach(function(k){var x=$("sd-"+k);if(x.type==="checkbox")x.checked=!!e[k];else x.value=e[k]});render()})});
render();window.sdTest={build:build,text:fileText};
})();
