/* A small pretend Windows PowerShell for the playground page: an object pipeline in memory,
   about fifty cmdlets and the made-up file server FS01. Nothing here touches a real system. */
(function(){"use strict";
var NOW=Date.UTC(2026,9,6,8,30,0),DAY=864e5,KB=1024,MB=KB*KB,GB=MB*KB,HOME="C:\\Users\\anna",W=110;
var DN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],MN=["January","February","March","April","May","June","July","August","September","October","November","December"];
function dt(y,mo,d,h,mi,s){return new Date(Date.UTC(y,mo-1,d,h||0,mi||0,s||0))}
function O(t,o){o.__t=t;return o}
function PErr(msg,id,who){this.msg=msg;this.id=id;this.who=who}
function fail(msg,id,who){throw new PErr(msg,id||"RuntimeException",who)}
function fmtErr(e){return(e.who?e.who+" : ":"")+e.msg+"\n    + FullyQualifiedErrorId : "+e.id}
function has(o,k){return Object.prototype.hasOwnProperty.call(o,k)}
function isA(v){return Array.isArray(v)}
function isD(v){return v instanceof Date}
function isO(v){return v!==null&&typeof v==="object"&&!isA(v)&&!isD(v)}
function isSB(v){return isO(v)&&v.__t==="ScriptBlock"}
function isTS(v){return isO(v)&&v.__t==="TimeSpan"}
function prim(v){return v===null||v===undefined||typeof v!=="object"||isD(v)}
function arr(v){return v===null||v===undefined?[]:isA(v)?v:[v]}
function unwrap(a){return a.length===0?null:a.length===1?a[0]:a}
function props(o){return Object.keys(o).filter(function(k){return k.slice(0,2)!=="__"})}
function key(o,n){n=String(n);if(n.slice(0,2)!=="__"&&has(o,n))return n;var l=n.toLowerCase(),ks=props(o),i;for(i=0;i<ks.length;i++)if(ks[i].toLowerCase()===l)return ks[i];return null}
function gp(o,n){var k=key(o,n);return k===null?null:o[k]}
function p2(n){return(n<10?"0":"")+n}
function pad(s,w,right){s=String(s);while(s.length<w)s=right?" "+s:s+" ";return s}
function rep(c,n){var s="";while(n-->0)s+=c;return s}
function dFmt(d,f){var h=d.getUTCHours(),m=d.getUTCMonth(),y=d.getUTCFullYear(),day=d.getUTCDate(),wd=d.getUTCDay(),mi=d.getUTCMinutes(),s=d.getUTCSeconds();
  return f.replace(/yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|hh|h|mm|m|ss|s|tt/g,function(t){switch(t){
    case"yyyy":return y;case"yy":return p2(y%100);case"MMMM":return MN[m];case"MMM":return MN[m].slice(0,3);case"MM":return p2(m+1);case"M":return m+1;
    case"dddd":return DN[wd];case"ddd":return DN[wd].slice(0,3);case"dd":return p2(day);case"d":return day;case"HH":return p2(h);case"H":return h;
    case"hh":return p2(h%12||12);case"h":return h%12||12;case"mm":return p2(mi);case"m":return mi;case"ss":return p2(s);case"s":return s;default:return h<12?"AM":"PM"}})}
function dLong(d){return dFmt(d,"dddd, MMMM d, yyyy h:mm:ss tt")}
function dShort(d){return dFmt(d,"M/d/yyyy h:mm:ss tt")}
function parseDate(s){s=String(s).trim();var m=/^(\d{4})-(\d\d?)-(\d\d?)(?:[T ](\d\d?):(\d\d)(?::(\d\d))?)?$/.exec(s);if(m)return dt(+m[1],+m[2],+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));
  m=/^(\d\d?)\/(\d\d?)\/(\d{4})(?: +(\d\d?):(\d\d)(?::(\d\d))?\s*(AM|PM)?)?$/i.exec(s);if(m){var h=+(m[4]||0);if(m[7]){h=h%12+(/pm/i.test(m[7])?12:0)}return dt(+m[3],+m[1],+m[2],h,+(m[5]||0),+(m[6]||0))}return null}
function ts(ms){var a=Math.abs(ms),sg=ms<0?-1:1;return O("TimeSpan",{Days:sg*Math.floor(a/DAY),Hours:sg*Math.floor(a%DAY/36e5),Minutes:sg*Math.floor(a%36e5/6e4),Seconds:sg*Math.floor(a%6e4/1e3),TotalDays:ms/DAY,TotalHours:ms/36e5,TotalMinutes:ms/6e4,TotalSeconds:ms/1e3,__ms:ms})}
function num(w){var m=/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(kb|mb|gb|tb)?$/i.exec(String(w).trim());if(!m)return null;return parseFloat(m[1])*(m[2]?{kb:KB,mb:MB,gb:GB,tb:GB*KB}[m[2].toLowerCase()]:1)}
function tonum(v){if(v===null||v===undefined)return 0;if(typeof v==="number")return v;if(typeof v==="boolean")return v?1:0;if(typeof v==="string")return num(v);return null}
function numStr(n){if(!isFinite(n))return String(n);return String(parseFloat(n.toPrecision(15)))}
function size(n){var u=["B","KB","MB","GB","TB"],k=0;while(n>=1024&&k<4){n/=1024;k++}return(k?n.toFixed(2):String(n))+" "+u[k]}
function wild(p){var s=String(p).replace(/[.+^${}()|\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".");try{return new RegExp("^"+s+"$","i")}catch(e){return new RegExp("^"+s.replace(/[\[\]]/g,"\\$&")+"$","i")}}
function hasWild(p){return /[*?]/.test(String(p))}
function truthy(v){if(v===null||v===undefined)return false;if(typeof v==="boolean")return v;if(typeof v==="number")return v!==0;if(typeof v==="string")return v!=="";if(isA(v))return v.length===1?truthy(v[0]):v.length>0;return true}

/* ---------- types and how they print ---------- */
var COMMON=[["Equals","bool Equals(System.Object obj)"],["GetHashCode","int GetHashCode()"],["GetType","type GetType()"],["ToString","string ToString()"]];
var TYPES={
  Service:{n:"System.ServiceProcess.ServiceController",v:[["Status"],["Name"],["DisplayName"]],m:[["Refresh","void Refresh()"],["Start","void Start()"],["Stop","void Stop()"]],d:{Status:"System.ServiceProcess.ServiceControllerStatus",StartType:"System.ServiceProcess.ServiceStartMode"}},
  Process:{n:"System.Diagnostics.Process",v:[["Id"],["ProcessName"],["CPU",function(o){return o.CPU.toFixed(2)},1],["WS(MB)",function(o){return Math.round(o.WorkingSet/MB)}]],m:[["Kill","void Kill()"],["Refresh","void Refresh()"],["WaitForExit","void WaitForExit()"]]},
  File:{n:"System.IO.FileInfo",v:[["Mode"],["LastWriteTime",function(o){return dFmt(o.LastWriteTime,"M/d/yyyy")+" "+pad(dFmt(o.LastWriteTime,"h:mm tt"),8,1)},1],["Length"],["Name"]],g:function(o){return"    Directory: "+o.__dir},m:[["CopyTo","System.IO.FileInfo CopyTo(string destFileName)"],["Delete","void Delete()"],["MoveTo","void MoveTo(string destFileName)"]]},
  Event:{n:"System.Diagnostics.Eventing.Reader.EventLogRecord",v:[["TimeCreated"],["Id"],["LevelDisplayName"],["Message"]]},
  LocalUser:{n:"Microsoft.PowerShell.Commands.LocalUser",v:[["Name"],["Enabled"],["Description"]]},
  LocalGroup:{n:"Microsoft.PowerShell.Commands.LocalGroup",v:[["Name"],["Description"]]},
  LocalMember:{n:"Microsoft.PowerShell.Commands.LocalPrincipal",v:[["ObjectClass"],["Name"],["PrincipalSource"]]},
  ADUser:{n:"Microsoft.ActiveDirectory.Management.ADUser",list:1},
  Volume:{n:"Microsoft.Management.Infrastructure.CimInstance#MSFT_Volume",v:[["DriveLetter"],["FileSystemLabel"],["SizeRemaining",function(o){return size(o.SizeRemaining)},1],["Size",function(o){return size(o.Size)},1]]},
  Disk:{n:"Microsoft.Management.Infrastructure.CimInstance#MSFT_Disk",v:[["Number"],["FriendlyName"],["HealthStatus"],["Size",function(o){return size(o.Size)},1]]},
  NetIP:{n:"Microsoft.Management.Infrastructure.CimInstance#MSFT_NetIPAddress",list:1},
  Ping:{n:"System.Management.ManagementObject#Win32_PingStatus",v:[["Source"],["Destination"],["IPV4Address"],["Bytes"],["Time(ms)","ResponseTime"]]},
  TNC:{n:"TestNetConnectionResult",list:1},
  Group:{n:"Microsoft.PowerShell.Commands.GroupInfo",v:[["Count"],["Name"],["Group"]]},
  Measure:{n:"Microsoft.PowerShell.Commands.GenericMeasureInfo",list:1},
  Member:{n:"Microsoft.PowerShell.Commands.MemberDefinition",v:[["Name"],["MemberType"],["Definition"]],g:function(o){return"   TypeName: "+o.TypeName}},
  Command:{n:"System.Management.Automation.CmdletInfo",v:[["CommandType"],["Name"],["Source"]]},
  History:{n:"Microsoft.PowerShell.Commands.HistoryInfo",v:[["Id"],["CommandLine"]]},
  Path:{n:"System.Management.Automation.PathInfo",v:[["Path"]]},
  LogInfo:{n:"System.Diagnostics.Eventing.Reader.EventLogConfiguration",v:[["LogName"],["RecordCount"]]},
  TimeSpan:{n:"System.TimeSpan",list:1}
};
TYPES.Dir={n:"System.IO.DirectoryInfo",v:TYPES.File.v,g:TYPES.File.g,m:[["Delete","void Delete()"],["MoveTo","void MoveTo(string destDirName)"]]};
function typeName(v){if(v===null||v===undefined)return"null";if(typeof v==="string")return"System.String";if(typeof v==="boolean")return"System.Boolean";if(typeof v==="number")return v%1===0?(Math.abs(v)>2147483647?"System.Int64":"System.Int32"):"System.Double";
  if(isD(v))return"System.DateTime";if(isA(v))return"System.Object[]";if(v.__t==="Hashtable")return"System.Collections.Hashtable";if(v.__t==="ScriptBlock")return"System.Management.Automation.ScriptBlock";
  if(v.__t&&TYPES[v.__t])return TYPES[v.__t].n;return v.__base?"Selected."+v.__base:"System.Management.Automation.PSCustomObject"}
function objStr(o){switch(o.__t){case"Process":return"System.Diagnostics.Process ("+o.ProcessName+")";case"File":case"Dir":return o.Name;case"ADUser":return o.DistinguishedName;case"ScriptBlock":return o.src;
    case"TimeSpan":var a=Math.abs(o.__ms);return(o.__ms<0?"-":"")+(a>=DAY?Math.floor(a/DAY)+".":"")+p2(Math.floor(a%DAY/36e5))+":"+p2(Math.floor(a%36e5/6e4))+":"+p2(Math.floor(a%6e4/1e3));
    case"Hashtable":return"System.Collections.Hashtable"}
  if(o.__t&&TYPES[o.__t])return TYPES[o.__t].n;return"@{"+props(o).map(function(k){return k+"="+cell(o[k])}).join("; ")+"}"}
function cell(v){if(v===null||v===undefined)return"";if(typeof v==="string")return v;if(typeof v==="boolean")return v?"True":"False";if(typeof v==="number")return numStr(v);if(isD(v))return dShort(v);
  if(isA(v))return"{"+v.slice(0,4).map(cell).join(", ")+(v.length>4?"...":"")+"}";return objStr(v)}
function str(v){if(isA(v))return v.map(str).join(" ");if(isD(v))return dFmt(v,"MM/dd/yyyy HH:mm:ss");return cell(v)}
function colOf(c){var g=c[1]===undefined?c[0]:c[1];return{h:c[0],r:!!c[2],p:typeof g==="string"?g:null,get:typeof g==="function"?g:function(o){return isO(o)?gp(o,g):member(o,g)}}}
function table(objs,cols,grp,nohead){var out=[],k=0,j;
  function block(rows,head){var vals=rows.map(function(o){return cols.map(function(c){return c.get(o)})}),cells=vals.map(function(r){return r.map(function(v){return cell(v).replace(/\r?\n/g," ")})}),last=cols.length-1,tot=0,
      right=cols.map(function(c,x){return c.r||vals.some(function(r){return typeof r[x]==="number"})&&vals.every(function(r){return r[x]===null||r[x]===undefined||typeof r[x]==="number"})}),
      w=cols.map(function(c,x){var m=c.h.length;cells.forEach(function(r){if(r[x].length>m)m=r[x].length});return m});
    w.forEach(function(x){tot+=x+1});if(tot-1>W&&last>=0)w[last]=Math.max(cols[last].h.length,12,w[last]-(tot-1-W));
    function row(r){return r.map(function(t,x){if(t.length>w[x])t=t.slice(0,w[x]-3)+"...";return right[x]?pad(t,w[x],1):pad(t,w[x])}).join(" ").replace(/\s+$/,"")}
    var L=[""];if(head)L.push(head,"");if(!nohead){L.push(row(cols.map(function(c){return c.h})));L.push(row(cols.map(function(c){return rep("-",c.h.length)})))}
    cells.forEach(function(r){L.push(row(r))});L.push("");return L.join("\n")}
  if(!grp)return block(objs,null);
  while(k<objs.length){var h=grp(objs[k]);j=k;while(j<objs.length&&grp(objs[j])===h)j++;out.push(block(objs.slice(k,j),h));k=j}
  return out.join("\n")}
function listFmt(objs,cols){var w=0,L=[""];cols.forEach(function(c){if(c.h.length>w)w=c.h.length});
  objs.forEach(function(o){cols.forEach(function(c){L.push(pad(c.h,w)+" : "+cell(c.get(o)).replace(/\r?\n/g," "))});L.push("")});return L.join("\n")}
function allCols(o){return props(o).map(function(k){return colOf([k])})}
function viewCols(first){var T=TYPES[first.__t];if(!T||!T.v)return null;return T.v.map(colOf).filter(function(c){return !c.p||key(first,c.p)!==null})}
function fmtDefault(objs){var f=objs[0],T=TYPES[f.__t];
  if(f.__t==="Hashtable"){var rows=[];objs.forEach(function(h){props(h).forEach(function(k){rows.push({Name:k,Value:h[k]})})});return table(rows,[colOf(["Name"]),colOf(["Value"])])}
  var v=viewCols(f);if(v)return table(objs,v,T.g);var c=allCols(f);return(T&&T.list)||c.length>4?listFmt(objs,c):table(objs,c)}
function shape(v){return v.__t==="File"||v.__t==="Dir"?"fs":v.__t||"c:"+props(v).join(",")}
function render(items){var out=[],k=0,j,v;
  while(k<items.length){v=items[k];
    if(v===null||v===undefined){k++;continue}
    if(isO(v)&&v.__t==="#fmt"){if(v.items.length)out.push(v.kind==="list"?listFmt(v.items,v.cols||allCols(v.items[0])):table(v.items,v.cols||viewCols(v.items[0])||allCols(v.items[0]),v.cols?null:(TYPES[v.items[0].__t]||{}).g,v.nohead));k++;continue}
    if(!isO(v)||v.__t==="ScriptBlock"){out.push(isD(v)?dLong(v):cell(v));k++;continue}
    j=k;var s=shape(v);while(j<items.length&&isO(items[j])&&items[j].__t!=="#fmt"&&shape(items[j])===s)j++;out.push(fmtDefault(items.slice(k,j)));k=j}
  return out.join("\n")}

/* ---------- parser ---------- */
var LOG={and:1,or:1,xor:1},CMP={eq:1,ne:1,gt:1,ge:1,lt:1,le:1,like:1,notlike:1,match:1,notmatch:1,contains:1,notcontains:1,"in":1,notin:1,replace:1,split:1,join:1};
function parse(src){var i=0,n=src.length,nc=0;
  function perr(m){throw new PErr(m,"ParserError")}
  function ch(k){return src.charAt(k===undefined?i:k)}
  function ws(nl){for(;i<n;){var c=ch();if(c===" "||c==="\t"||c==="\r"||(nl&&c==="\n"))i++;else if(c==="`"&&ch(i+1)==="\n")i+=2;else if(c==="#"){while(i<n&&ch()!=="\n")i++}else break}}
  function tok(){var m=/^\S+/.exec(src.slice(i));return m?m[0].slice(0,24):""}
  function unexp(){perr(i>=n?"Incomplete line: something is missing at the end.":"Unexpected token '"+tok()+"' in expression or statement.")}
  function script(close){var L=[],c;for(;;){ws(true);while(ch()===";"){i++;ws(true)}
      if(i>=n)break;c=ch();if(close&&c===close)break;if(c===")"||c==="}")unexp();
      L.push(statement());ws();c=ch();if(i<n&&c!==";"&&c!=="\n"&&c!==close)unexp()}
    return L}
  function statement(){var m=/^(if|foreach|for|while|do|switch|function|try|param)\b\s*([({])?/i.exec(src.slice(i));
    if(m&&!(m[1].toLowerCase()==="foreach"&&m[2]!=="(")&&(m[2]||/^(function|param)$/i.test(m[1])))perr("The playground has no '"+m[1].toLowerCase()+"' statement. Use the pipeline: Where-Object and ForEach-Object do that job here.");
    m=/^\$([A-Za-z_]\w*)\s*(\+?=)(?!=)/.exec(src.slice(i));if(m){i+=m[0].length;ws(true);return{t:"set",n:m[1].toLowerCase(),o:m[2],v:pipeline()}}
    return pipeline()}
  function pipeline(){var el=[element(true)];for(;;){ws();if(ch()==="|"){if(ch(i+1)==="|")perr("The token '||' is not a valid statement separator in this version.");i++;ws(true);el.push(element(false))}else break}return{t:"pipe",el:el}}
  function element(first){ws();var c=ch();
    if(i>=n||c==="|"||c===";"||c===")"||c==="}")perr("An empty pipe element is not allowed.");
    if(c==="&")perr("The call operator & is not part of the playground.");
    if(/[$"'(@\[{0-9!+-]/.test(c)||(c==="."&&/\d/.test(ch(i+1)))){if(!first)perr("Expressions are only allowed as the first element of a pipeline.");return{t:"expr",e:expr()}}
    return command()}
  function command(){var m=/^[^\s|;(){}]+/.exec(src.slice(i));if(!m)unexp();i+=m[0].length;var nd={t:"cmd",name:m[0],args:[]},c,a;
    for(;;){ws();c=ch();if(i>=n||c==="|"||c===";"||c==="\n"||c===")"||c==="}")break;
      if(c==="-"&&/[A-Za-z?]/.test(ch(i+1))){m=/^-([A-Za-z?]\w*)(:?)/.exec(src.slice(i));i+=m[0].length;a={k:"p",n:m[1]};if(m[2]){ws();a.v=argList()}nd.args.push(a)}
      else if(c===">"){var ap=ch(i+1)===">";i+=ap?2:1;ws();if(i>=n)perr("Missing file specification after redirection operator.");nd.redir={v:arg(),ap:ap}}
      else nd.args.push({k:"a",v:argList()})}
    return nd}
  function argList(){var a=arg(),L=null;for(;;){ws();if(ch()===","){i++;ws(true);if(i>=n)perr("Missing argument in parameter list.");if(!L)L=[a];L.push(arg())}else break}return L?{t:"arr",items:L}:a}
  function bare(w){var parts=[],re=/\$(\{[^}]+\}|[A-Za-z_]\w*(?::\w+)?)/g,m,k=0;while((m=re.exec(w))){if(m.index>k)parts.push(w.slice(k,m.index));parts.push({t:"var",n:m[1].replace(/[{}]/g,"").toLowerCase()});k=re.lastIndex}
    if(k<w.length)parts.push(w.slice(k));return{t:"dq",p:parts}}
  function arg(){var c=ch();
    if(c==='"'||c==="'"||c==="$"||c==="("||c==="{"||(c==="@"&&/[({]/.test(ch(i+1))))return postfix(primary());
    var m=/^[^\s|;,(){}]+/.exec(src.slice(i));if(!m)unexp();i+=m[0].length;var w=m[0],x=num(w);
    if(x!==null)return{t:"num",v:x};if(/\$[A-Za-z_{]/.test(w))return bare(w);return{t:"str",v:w}}
  function margs(){var L=[];i++;nc++;ws(true);if(ch()===")"){i++;nc--;return L}
    for(;;){L.push(expr());ws(true);if(ch()===","){i++;continue}if(ch()===")"){i++;break}perr("Missing ')' in method call.")}nc--;return L}
  function dq(){i++;var parts=[],s="",c,m;for(;;){if(i>=n)perr("The string is missing the terminator: \".");c=ch();
      if(c==='"'){if(ch(i+1)==='"'){s+='"';i+=2;continue}i++;break}
      if(c==="`"){var e=ch(i+1);s+=e==="n"?"\n":e==="t"?"\t":e;i+=2;continue}
      if(c==="$"&&(ch(i+1)==="("||/^\$(\{[^}]+\}|[A-Za-z_])/.test(src.substr(i,40)))){if(s){parts.push(s);s=""}parts.push(primary());continue}
      s+=c;i++}
    if(s||!parts.length)parts.push(s);return parts.length===1&&typeof parts[0]==="string"?{t:"str",v:parts[0]}:{t:"dq",p:parts}}
  function primary(){var c=ch(),m,s,k,b;
    if(c==="'"){i++;s="";for(;;){if(i>=n)perr("The string is missing the terminator: '.");c=src.charAt(i++);if(c==="'"){if(ch()==="'"){s+="'";i++}else break}else s+=c}return{t:"str",v:s}}
    if(c==='"')return dq();
    if(c==="$"){if(ch(i+1)==="("){i+=2;k=nc;nc=0;b=script(")");if(ch()!==")")perr("Missing closing ')' in subexpression.");i++;nc=k;return{t:"sub",b:b}}
      m=/^\$(\{[^}]+\}|[A-Za-z_]\w*(?::\w+)?)/.exec(src.slice(i));if(!m)unexp();i+=m[0].length;return{t:"var",n:m[1].replace(/[{}]/g,"").toLowerCase()}}
    if(c==="("){i++;k=nc;nc=0;ws(true);var p=statement();ws(true);if(ch()!==")")perr("Missing closing ')' in expression.");i++;nc=k;return{t:"paren",p:p}}
    if(c==="@"&&ch(i+1)==="("){i+=2;k=nc;nc=0;b=script(")");if(ch()!==")")perr("Missing closing ')' in expression.");i++;nc=k;return{t:"arrsub",b:b}}
    if(c==="@"&&ch(i+1)==="{"){i+=2;var pairs=[],kn;k=nc;nc=0;for(;;){ws(true);while(ch()===";"){i++;ws(true)}if(ch()==="}"){i++;break}if(i>=n)perr("The hash literal was incomplete.");
        c=ch();if(c==="'"||c==='"'){kn=primary();if(kn.t==="str")kn=kn.v}else{m=/^[\w.-]+/.exec(src.slice(i));if(!m)perr("Missing key in the hash literal.");i+=m[0].length;kn=m[0]}
        ws();if(ch()!=="=")perr("Missing '=' operator after key in hash literal.");i++;ws(true);pairs.push([kn,statement()])}
      nc=k;return{t:"hash",p:pairs}}
    if(c==="{"){var st=++i;k=nc;nc=0;b=script("}");if(ch()!=="}")perr("Missing closing '}' in statement block or type definition.");i++;nc=k;return{t:"sb",b:b,src:src.slice(st,i-1)}}
    if(c==="["){m=/^\[([A-Za-z_][\w.]*)\]::([A-Za-z_]\w*)/.exec(src.slice(i));if(m){i+=m[0].length;var nd={t:"static",ty:m[1].toLowerCase().replace(/^system\./,""),n:m[2].toLowerCase()};if(ch()==="(")nd.a=margs();return nd}}
    m=/^(\d+(?:\.\d+)?|\.\d+)(e[+-]?\d+)?(kb|mb|gb|tb)?/i.exec(src.slice(i));if(m){i+=m[0].length;return{t:"num",v:num(m[0])}}
    if(i>=n)perr("You must provide a value expression following the operator.");
    if(/[A-Za-z]/.test(c))perr("Unexpected token '"+tok()+"' in expression or statement. Text needs quotes here, and a property needs $_ in front, for example $_."+tok().replace(/\W.*$/,"")+".");
    unexp()}
  function postfix(e){for(;;){var c=ch(),m,k;
      if(c==="."&&/[A-Za-z_]/.test(ch(i+1))){m=/^\.([A-Za-z_]\w*)/.exec(src.slice(i));i+=m[0].length;if(ch()==="(")e={t:"call",l:e,n:m[1].toLowerCase(),a:margs()};else e={t:"prop",l:e,n:m[1]}}
      else if(c==="["&&e.t!=="str"&&e.t!=="dq"){i++;k=nc;nc=0;var x=expr();ws();if(ch()!=="]")perr("Array index expression is missing or not valid.");i++;nc=k;e={t:"idx",l:e,x:x}}
      else return e}}
  function op(){var m=/^-([A-Za-z]+)/.exec(src.substr(i,16));return m?m[1].toLowerCase():null}
  function unary(){ws();var c=ch(),o,m;
    if(c==="!"){i++;return{t:"not",e:unary()}}
    if(c==="-"){o=op();if(o==="not"){i+=4;return{t:"not",e:unary()}}if(o==="join"){i+=5;return{t:"ujoin",e:unary()}}if(!o){i++;return{t:"neg",e:unary()}}unexp()}
    if(c==="+"){i++;return unary()}
    if(c==="["){m=/^\[([A-Za-z_][\w.]*(?:\[\])?)\](?!::)/.exec(src.slice(i));if(m){i+=m[0].length;return{t:"cast",ty:m[1].toLowerCase().replace(/^system\./,""),e:unary()}}}
    return postfix(primary())}
  function commax(){var l=unary(),L=null,s;if(nc)return l;for(;;){s=i;ws();if(ch()===","){i++;ws(true);if(!L)L=[l];L.push(unary())}else{i=s;break}}return L?{t:"arr",items:L}:l}
  function rangex(){var l=commax();if(src.substr(i,2)===".."){i+=2;return{t:"range",l:l,r:commax()}}return l}
  function mulx(){var l=rangex(),c;for(;;){ws();c=ch();if(c==="*"||c==="/"||c==="%"){i++;ws(true);l={t:"bin",o:c,l:l,r:rangex()}}else return l}}
  function addx(){var l=mulx(),c;for(;;){ws();c=ch();if(c==="+"||(c==="-"&&!/[A-Za-z]/.test(ch(i+1)))){i++;ws(true);l={t:"bin",o:c,l:l,r:mulx()}}else return l}}
  function cmpx(){var l=addx(),o;for(;;){ws();o=op();if(!o)return l;if(CMP[o]!==1&&LOG[o]!==1&&/^[ic]/.test(o)&&CMP[o.slice(1)]===1){i++;o=o.slice(1)}
      if(CMP[o]===1){i+=o.length+1;ws(true);l={t:"bin",o:o,l:l,r:addx()}}else if(LOG[o]===1)return l;else unexp()}}
  function expr(){var l=cmpx(),o;for(;;){ws();o=op();if(o&&LOG[o]===1){i+=o.length+1;ws(true);l={t:"bin",o:o,l:l,r:cmpx()}}else return l}}
  var L=script(null);if(i<n)unexp();return L}

/* ---------- values and expressions ---------- */
function coerce(l,r){if(r===null||r===undefined)return null;
  if(typeof l==="number"){if(typeof r==="string"){var x=num(r);return x===null?r:x}if(typeof r==="boolean")return r?1:0;return r}
  if(typeof l==="string")return isO(r)||isA(r)?r:str(r);
  if(typeof l==="boolean")return truthy(r);
  if(isD(l)&&typeof r==="string"){var d=parseDate(r);return d||r}
  return r}
function eq(l,r){if(l===undefined)l=null;if(isO(l)||isO(r))return l===r;r=coerce(l,r);if(l===null||r===null)return l===r;
  if(isD(l))return isD(r)&&l.getTime()===r.getTime();if(typeof l==="string")return typeof r==="string"&&l.toLowerCase()===r.toLowerCase();return l===r}
function cmp(l,r){if(l===undefined)l=null;r=coerce(l,r);if(l===null&&r===null)return 0;if(l===null)return -1;if(r===null)return 1;
  if(isD(l)&&isD(r))return l<r?-1:l>r?1:0;if(typeof l==="number"&&typeof r==="number")return l<r?-1:l>r?1:0;if(typeof l==="boolean"&&typeof r==="boolean")return l===r?0:l?1:-1;
  var a=str(l).toLowerCase(),b=str(r).toLowerCase();return a<b?-1:a>b?1:0}
function rx(p,f){try{return new RegExp(str(p),f||"i")}catch(e){fail("The regular expression pattern "+str(p)+" is not valid.","InvalidRegularExpression")}}
function test(o,l,r){switch(o){case"eq":return eq(l,r);case"ne":return !eq(l,r);case"gt":return cmp(l,r)>0;case"ge":return cmp(l,r)>=0;case"lt":return cmp(l,r)<0;case"le":return cmp(l,r)<=0;
  case"like":return wild(str(r)).test(str(l));case"notlike":return !wild(str(r)).test(str(l));case"match":return rx(r).test(str(l));default:return !rx(r).test(str(l))}}
function cmpOp(o,l,r){var a;switch(o){
    case"contains":return arr(l).some(function(x){return eq(x,r)});case"notcontains":return !arr(l).some(function(x){return eq(x,r)});
    case"in":return arr(r).some(function(x){return eq(l,x)});case"notin":return !arr(r).some(function(x){return eq(l,x)});
    case"join":return arr(l).map(str).join(str(r));case"split":return str(l).split(rx(r));
    case"replace":a=arr(r);return str(l).replace(rx(a[0],"gi"),a.length>1?str(a[1]):"")}
  if(isA(l))return l.filter(function(x){return test(o,x,r)});return test(o,l,r)}
function arith(o,l,r){if(l===undefined)l=null;if(r===undefined)r=null;
  if(o==="+"){if(isA(l))return l.concat(isA(r)?r:[r]);if(typeof l==="string")return l+str(r);if(isD(l)&&isTS(r))return new Date(l.getTime()+r.__ms);if(l===null&&(typeof r==="string"||isA(r)))return r}
  if(o==="-"&&isD(l)){if(isD(r))return ts(l-r);if(isTS(r))return new Date(l.getTime()-r.__ms)}
  if(o==="*"&&typeof l==="string")return rep(l,Math.max(0,Math.floor(tonum(r)||0)));
  var a=tonum(l),b=tonum(r);if(a===null||b===null)fail("Cannot convert value \""+str(a===null?l:r)+"\" to type \"System.Int32\". Error: \"Input string was not in a correct format.\"","InvalidCastFromStringToInteger");
  switch(o){case"+":return a+b;case"-":return a-b;case"*":return a*b;case"/":if(b===0)fail("Attempted to divide by zero.","RuntimeException");return a/b;default:if(b===0)fail("Attempted to divide by zero.","RuntimeException");return a%b}}
function member(v,name){var l=String(name).toLowerCase(),k;if(v===null||v===undefined)return null;
  if(isA(v)){if(l==="count"||l==="length")return v.length;var out=[];v.forEach(function(x){var y=member(x,name);if(y!==null&&y!==undefined){if(isA(y))out=out.concat(y);else out.push(y)}});return unwrap(out)}
  if(typeof v==="string")return l==="length"?v.length:l==="count"?1:null;
  if(isD(v)){switch(l){case"year":return v.getUTCFullYear();case"month":return v.getUTCMonth()+1;case"day":return v.getUTCDate();case"hour":return v.getUTCHours();case"minute":return v.getUTCMinutes();case"second":return v.getUTCSeconds();
      case"dayofweek":return DN[v.getUTCDay()];case"dayofyear":return Math.floor((v-Date.UTC(v.getUTCFullYear(),0,1))/DAY)+1;case"date":return dt(v.getUTCFullYear(),v.getUTCMonth()+1,v.getUTCDate());case"count":return 1}return null}
  if(isO(v)){k=key(v,name);if(k!==null)return v[k];if(v.__t==="Hashtable"){if(l==="keys")return props(v);if(l==="values")return props(v).map(function(x){return v[x]});if(l==="count")return props(v).length}return l==="count"?1:null}
  return l==="count"||l==="length"?1:null}
function cast(ty,v){var x;switch(ty){
    case"int":case"int32":case"long":case"int64":x=tonum(v);if(x===null)fail("Cannot convert value \""+str(v)+"\" to type \"System.Int32\". Error: \"Input string was not in a correct format.\"","InvalidCastFromStringToInteger");return Math.round(x);
    case"double":case"decimal":case"float":case"single":x=tonum(v);if(x===null)fail("Cannot convert value \""+str(v)+"\" to type \"System.Double\". Error: \"Input string was not in a correct format.\"","InvalidCastFromStringToDoubleOrSingle");return x;
    case"string":return str(v);case"bool":case"boolean":return truthy(v);case"void":return null;
    case"datetime":if(isD(v))return v;x=parseDate(str(v));if(!x)fail("Cannot convert value \""+str(v)+"\" to type \"System.DateTime\". Error: \"String was not recognized as a valid DateTime.\" The playground reads 2026-10-06 and 10/6/2026.","InvalidCastParseTargetInvocationWithFormatProvider");return x;
    case"array":case"object[]":case"string[]":case"int[]":return arr(v);
    case"pscustomobject":case"psobject":if(isO(v)&&v.__t==="Hashtable"){x={};props(v).forEach(function(k){x[k]=v[k]});return x}return v}
  fail("Unable to find type ["+ty+"]. The playground knows a few: [int] [double] [string] [bool] [datetime] [math] [pscustomobject].","TypeNotFound")}
function stat(S,nd){var a=(nd.a||[]).map(function(x){return ev(S,x)}),f;switch(nd.ty+"::"+nd.n){
    case"math::round":f=Math.pow(10,tonum(a[1])||0);return Math.round(tonum(a[0])*f)/f;case"math::floor":return Math.floor(tonum(a[0]));case"math::ceiling":return Math.ceil(tonum(a[0]));case"math::truncate":return tonum(a[0])<0?Math.ceil(tonum(a[0])):Math.floor(tonum(a[0]));
    case"math::abs":return Math.abs(tonum(a[0]));case"math::sqrt":return Math.sqrt(tonum(a[0]));case"math::pow":return Math.pow(tonum(a[0]),tonum(a[1]));case"math::max":return Math.max(tonum(a[0]),tonum(a[1]));case"math::min":return Math.min(tonum(a[0]),tonum(a[1]));case"math::pi":return Math.PI;
    case"datetime::now":case"datetime::utcnow":return new Date(NOW);case"datetime::today":return dt(2026,10,6);case"datetime::parse":return cast("datetime",a[0]);
    case"string::isnullorempty":return a[0]===null||a[0]===undefined||a[0]==="";case"string::join":return arr(a[1]).map(str).join(str(a[0]));
    case"environment::machinename":return"FS01";case"environment::username":return"anna";case"int::maxvalue":case"int32::maxvalue":return 2147483647}
  fail("The playground does not know ["+nd.ty+"]::"+nd.n+". It has no .NET, only a few helpers like [math]::Round and [datetime]::Now.","MethodNotFound")}
function call(S,v,n,a){var x;
  if(n==="tostring"&&!a.length)return str(v);
  if(n==="gettype"){x=typeName(v);return{Name:x.replace(/^.*\./,""),FullName:x}}
  if(typeof v==="string"){switch(n){
    case"toupper":return v.toUpperCase();case"tolower":return v.toLowerCase();case"trim":return v.trim();case"trimstart":return v.replace(/^\s+/,"");case"trimend":return v.replace(/\s+$/,"");
    case"contains":return v.indexOf(str(a[0]))>=0;case"startswith":return v.indexOf(str(a[0]))===0;case"endswith":x=str(a[0]);return v.slice(-x.length)===x&&x.length<=v.length;
    case"replace":return v.split(str(a[0])).join(str(a[1]));case"split":x=arr(a[0]).map(str).join("");return x?v.split(new RegExp("["+x.replace(/[\]\\^-]/g,"\\$&")+"]")):v.split(/\s+/);
    case"substring":x=tonum(a[0])||0;if(x<0||x>v.length)fail("Exception calling \"Substring\" with \""+a.length+"\" argument(s): \"startIndex cannot be larger than length of string.\"","ArgumentOutOfRangeException");return a.length>1?v.substr(x,tonum(a[1])):v.slice(x);
    case"indexof":return v.indexOf(str(a[0]));case"padleft":return pad(v,tonum(a[0])||0,1);case"padright":return pad(v,tonum(a[0])||0)}}
  if(isD(v)){switch(n){case"adddays":return new Date(v.getTime()+tonum(a[0])*DAY);case"addhours":return new Date(v.getTime()+tonum(a[0])*36e5);case"addminutes":return new Date(v.getTime()+tonum(a[0])*6e4);case"addseconds":return new Date(v.getTime()+tonum(a[0])*1e3);
    case"addmonths":x=new Date(v.getTime());x.setUTCMonth(x.getUTCMonth()+Math.round(tonum(a[0])));return x;case"addyears":x=new Date(v.getTime());x.setUTCFullYear(x.getUTCFullYear()+Math.round(tonum(a[0])));return x;
    case"tostring":return dFmt(v,str(a[0]));case"toshortdatestring":return dFmt(v,"M/d/yyyy");case"touniversaltime":case"tolocaltime":return v}}
  if(typeof v==="number"&&n==="tostring"){x=/^([nf])(\d*)$/i.exec(str(a[0]));if(x){var s=v.toFixed(x[2]===""?2:+x[2]);return /n/i.test(x[1])?s.replace(/\B(?=(\d{3})+(?!\d))/g,function(m,g,o,all){return all.indexOf(".")>=0&&o>all.indexOf(".")?"":","}):s}return numStr(v)}
  if(isA(v)&&n==="contains")return v.some(function(y){return eq(y,a[0])});
  if(isSB(v)&&n==="invoke")return unwrap(invoke(S,v,a.length?a[0]:null));
  if(isO(v)&&v.__t==="Hashtable"&&n==="containskey")return key(v,str(a[0]))!==null;
  if(isO(v)&&TYPES[v.__t]&&(TYPES[v.__t].m||[]).some(function(m){return m[0].toLowerCase()===n}))fail("The playground does not run .NET methods on this object. Use a cmdlet for it, for example Start-Service, Stop-Service or Stop-Process.","MethodNotSupported");
  if(v===null||v===undefined)fail("You cannot call a method on a null-valued expression.","InvokeMethodOnNull");
  fail("Method invocation failed because ["+typeName(v)+"] does not contain a method named '"+n+"'.","MethodNotFound")}
function getVar(S,n){switch(n){case"true":return true;case"false":return false;case"null":return null;case"psitem":n="_";break;case"pwd":return S.cwd;case"home":case"env:userprofile":return HOME;
    case"env:computername":return"FS01";case"env:username":return"anna";case"env:userdomain":return"EXAMPLE";case"pid":return 6020;case"psversiontable":return{PSVersion:"5.1 (pretend)",PSEdition:"Desktop"}}
  return has(S.vars,n)?S.vars[n]:null}
function invoke(S,sb,item){if(!isSB(sb))fail("A script block is needed here, for example { $_.Name }.","InvalidArgument");var old=has(S.vars,"_")?S.vars._:null,out;S.vars._=item;try{out=runBody(S,sb.body)}finally{S.vars._=old}return out}
function ev(S,nd){var l,r,o;switch(nd.t){
    case"num":case"str":return nd.v;
    case"dq":return nd.p.map(function(p){return typeof p==="string"?p:str(ev(S,p))}).join("");
    case"var":return getVar(S,nd.n);
    case"sub":return unwrap(runBody(S,nd.b));case"arrsub":return runBody(S,nd.b);
    case"paren":return unwrap(execStmt(S,nd.p));
    case"hash":o=O("Hashtable",{});nd.p.forEach(function(p){o[typeof p[0]==="string"?p[0]:str(ev(S,p[0]))]=unwrap(execStmt(S,p[1]))});return o;
    case"sb":return O("ScriptBlock",{body:nd.b,src:nd.src});
    case"arr":return nd.items.map(function(x){return ev(S,x)});
    case"range":l=Math.round(tonum(ev(S,nd.l))||0);r=Math.round(tonum(ev(S,nd.r))||0);o=[];if(Math.abs(r-l)>5000)fail("That range is too long for the playground.","RangeTooLong");if(l<=r)for(;l<=r;l++)o.push(l);else for(;l>=r;l--)o.push(l);return o;
    case"prop":return member(ev(S,nd.l),nd.n);
    case"call":l=ev(S,nd.l);return call(S,l,nd.n,nd.a.map(function(x){return ev(S,x)}));
    case"idx":l=ev(S,nd.l);r=ev(S,nd.x);if(l===null)fail("Cannot index into a null array.","NullArray");if(isO(l))return gp(l,str(r));if(typeof l==="string")l=l.split("");
      if(isA(r))return r.map(function(x){x=tonum(x);return l[x<0?l.length+x:x]}).filter(function(x){return x!==undefined});r=tonum(r);if(!isA(l))l=[l];o=l[r<0?l.length+r:r];return o===undefined?null:o;
    case"static":return stat(S,nd);
    case"cast":return cast(nd.ty,ev(S,nd.e));
    case"not":return !truthy(ev(S,nd.e));
    case"neg":return arith("-",0,ev(S,nd.e));
    case"ujoin":return arr(ev(S,nd.e)).map(str).join("");
    case"bin":if(nd.o==="and")return truthy(ev(S,nd.l))&&truthy(ev(S,nd.r));if(nd.o==="or")return truthy(ev(S,nd.l))||truthy(ev(S,nd.r));if(nd.o==="xor")return truthy(ev(S,nd.l))!==truthy(ev(S,nd.r));
      l=ev(S,nd.l);r=ev(S,nd.r);return CMP[nd.o]===1?cmpOp(nd.o,l,r):arith(nd.o,l,r)}
  return null}
function execStmt(S,st){if(st.t==="set"){var v=unwrap(runPipe(S,st.v));S.vars[st.n]=st.o==="+="?arith("+",has(S.vars,st.n)?S.vars[st.n]:null,v):v;return[]}return runPipe(S,st)}
function runBody(S,b){var out=[],k;for(k=0;k<b.length;k++)out=out.concat(execStmt(S,b[k]));return out}
function runPipe(S,p){var cur=[],k,e,v;for(k=0;k<p.el.length;k++){e=p.el[k];if(e.t==="expr"){v=ev(S,e.e);cur=v===null||v===undefined?[]:isA(v)?v.slice():[v]}else cur=runCmd(S,e,cur)}return cur}

/* ---------- pretend file system ---------- */
function fd(c,m){return{d:c||{},m:m||dt(2025,3,14,9,12)}}
function ff(s,m,x){return{s:x!==undefined?x.length:Math.round(s),m:m,x:x}}
function makeFs(){
  var notes="Handover notes for Anna, from Henrik (last day: 2 October)\r\n\r\n1. Printing stopped again last week. The spooler keeps falling over. Check the service.\r\n2. FS01 feels slow in the afternoon. Something eats the memory.\r\n3. C: is nearly full. Nobody has cleaned C:\\Shares\\Projects for years.\r\n4. The Security log is full of failed logons. I never found the time to look.\r\n5. HR asked for a list of accounts that nobody uses any more. Dirk Osten left in March, I am not sure his account was ever closed.\r\n6. Someone switched off Windows Update. It was not me.\r\n\r\nGood luck. Everything you need is in PowerShell.\r\n";
  return{C:fd({
    "Program Files":fd({ReportBuilder:fd({"ReportBuilder.exe":ff(48.2*MB,dt(2025,11,3,10,20)),"config.ini":ff(0,dt(2026,9,14,6,1),"[cache]\r\nrelease_after_render=false\r\nmax_reports=0\r\n\r\n[log]\r\nlevel=info\r\n")},dt(2026,9,14,6,1))},dt(2026,9,14,6,1)),
    Shares:fd({Projects:fd({
      "2023-Archive":fd({"customer-list-old.csv":ff(2.1*MB,dt(2023,6,30,16,5)),"offer-template.docx":ff(88*KB,dt(2023,4,12,9,41)),"site-photos.zip":ff(1.12*GB,dt(2023,9,5,14,22))},dt(2023,9,5,14,22)),
      Engineering:fd({"build-cache.zip":ff(780*MB,dt(2026,9,20,14,14)),"cad-drawings-2022.zip":ff(1.9*GB,dt(2022,11,15,11,3)),"pump-controller-spec.docx":ff(2.1*MB,dt(2026,9,28,15,47)),"test-results.xlsx":ff(640*KB,dt(2026,10,1,10,9)),"vm-export-old.vhdx":ff(12.5*GB,dt(2023,8,2,18,30))},dt(2026,10,1,10,9)),
      Finance:fd({"budget-2026.xlsx":ff(1.4*MB,dt(2026,9,30,17,2)),"invoices-2024.zip":ff(340*MB,dt(2025,1,20,8,15)),"year-end-2023.pdf":ff(6.2*MB,dt(2024,2,8,13,36))},dt(2026,9,30,17,2)),
      Marketing:fd({"brochure-2026.pdf":ff(18.4*MB,dt(2026,8,14,12,0)),"logo-pack.zip":ff(96*MB,dt(2025,2,3,9,27)),"newsletter-october.docx":ff(310*KB,dt(2026,10,2,11,18)),"trade-fair-video-raw.mov":ff(4.2*GB,dt(2024,3,11,19,44))},dt(2026,10,2,11,18)),
      "README.txt":ff(0,dt(2026,1,10,8,0),"Project share of Example Pumps Ltd.\r\nOne folder per department. Please do not park private files here.\r\n")},dt(2026,10,2,11,18))},dt(2022,5,2,8,0)),
    Temp:fd({},dt(2026,10,5,17,40)),
    Users:fd({anna:fd({Desktop:fd({},dt(2026,10,5,8,10)),Documents:fd({"handover-notes.txt":ff(0,dt(2026,10,2,16,48),notes)},dt(2026,10,2,16,48)),Downloads:fd({},dt(2026,10,5,8,10))},dt(2026,10,5,8,10)),Public:fd({},dt(2022,5,2,8,0))},dt(2026,10,5,8,10)),
    Windows:fd({System32:fd({drivers:fd({etc:fd({hosts:ff(0,dt(2024,6,18,10,0),"# Hosts file of FS01\r\n127.0.0.1    localhost\r\n10.87.10.40  print01\r\n")},dt(2024,6,18,10,0))},dt(2024,6,18,10,0))},dt(2026,9,10,3,0))},dt(2026,9,10,3,0))},dt(2022,5,2,8,0)),
   D:fd({Backup:fd({"backup.log":ff(0,dt(2026,9,19,23,0),"2026-09-16 23:00 backup started\r\n2026-09-16 23:41 backup finished, 38.1 GB\r\n2026-09-17 23:00 backup started\r\n2026-09-17 23:43 backup finished, 38.2 GB\r\n2026-09-18 23:00 backup started\r\n2026-09-18 23:42 backup finished, 38.2 GB\r\n2026-09-19 23:00 service did not start: logon failure for EXAMPLE\\svc_backup\r\n"),
      "fs01-2026-09-16.bak":ff(38.1*GB,dt(2026,9,16,23,41)),"fs01-2026-09-17.bak":ff(38.2*GB,dt(2026,9,17,23,43)),"fs01-2026-09-18.bak":ff(38.2*GB,dt(2026,9,18,23,42))},dt(2026,9,18,23,42))},dt(2022,5,2,8,0))}}
function parts(p){return p.split("\\").filter(function(x){return x!==""})}
function join(d,n){return d.slice(-1)==="\\"?d+n:d+"\\"+n}
function pathOf(p){return isO(p)&&p.FullName?p.FullName:isO(p)&&p.Path?p.Path:str(p)}
function abs(S,p){p=pathOf(p).replace(/\//g,"\\");if(p==="~"||p.slice(0,2)==="~\\")p=HOME+p.slice(1);
  var m=/^([A-Za-z]):(.*)$/.exec(p),drive=S.cwd.charAt(0),rest,out=[];if(m){drive=m[1].toUpperCase();rest=m[2]}else if(p.charAt(0)==="\\")rest=p;else rest=S.cwd.slice(2)+"\\"+p;
  parts(rest).forEach(function(x){if(x==="..")out.pop();else if(x!==".")out.push(x)});return drive+":\\"+out.join("\\")}
function look(S,a){var ps=parts(a.slice(3)),n=has(S.fs,a.charAt(0))?S.fs[a.charAt(0)]:null,p=a.slice(0,3),k,j;if(!n)return null;
  for(k=0;k<ps.length;k++){if(!n.d)return null;var hit=null,ks=Object.keys(n.d),lw=ps[k].toLowerCase();for(j=0;j<ks.length;j++)if(ks[j].toLowerCase()===lw){hit=ks[j];break}if(hit===null)return null;n=n.d[hit];p=join(p,hit)}
  return{n:n,p:p}}
function finfo(n,name,dir,full){var x=/\.[^.]+$/.exec(name),isd=!!n.d;return O(isd?"Dir":"File",{Mode:isd?"d-----":"-a----",LastWriteTime:n.m,Length:isd?null:n.s,Name:name,FullName:full||join(dir,name),Extension:isd||!x?"":x[0],BaseName:isd||!x?name:name.slice(0,-x[0].length),DirectoryName:dir,CreationTime:n.c||n.m,PSIsContainer:isd,__dir:dir,__n:n})}
function kids(r){return Object.keys(r.n.d).sort(function(a,b){var da=r.n.d[a].d?0:1,db=r.n.d[b].d?0:1;if(da!==db)return da-db;a=a.toLowerCase();b=b.toLowerCase();return a<b?-1:a>b?1:0}).map(function(k){return finfo(r.n.d[k],k,r.p)})}
function selfInfo(r){var ix=r.p.lastIndexOf("\\");return r.p.length<=3?finfo(r.n,r.p,"",r.p):finfo(r.n,r.p.slice(ix+1),ix===2?r.p.slice(0,3):r.p.slice(0,ix))}
function items(S,p){var a=abs(S,p),ix,r;if(hasWild(a)){ix=a.lastIndexOf("\\");r=look(S,ix===2?a.slice(0,3):a.slice(0,ix));if(!r||!r.n.d||hasWild(a.slice(0,ix)))return[];var re=wild(a.slice(ix+1));return kids(r).filter(function(f){return re.test(f.Name)})}
  r=look(S,a);if(!r)fail("Cannot find path '"+a+"' because it does not exist.","PathNotFound");return[selfInfo(r)]}
function writeText(S,p,text,append){var a=abs(S,p),ix=a.lastIndexOf("\\"),r=look(S,ix===2?a.slice(0,3):a.slice(0,ix)),name=a.slice(ix+1),k;
  if(!r||!r.n.d||!name)fail("Could not find a part of the path '"+a+"'.","FileOpenFailure");
  Object.keys(r.n.d).forEach(function(x){if(x.toLowerCase()===name.toLowerCase())k=x});if(k&&r.n.d[k].d)fail("Access to the path '"+a+"' is denied.","UnauthorizedAccess");
  if(k&&append)text=(r.n.d[k].x||"")+text;var n={s:text.length,x:text,m:new Date(NOW)};r.n.d[k||name]=n;return n}
function treeSize(n){var s=0;if(!n.d)return n.s;Object.keys(n.d).forEach(function(k){s+=treeSize(n.d[k])});return s}

/* ---------- pretend data: services, processes, logs, users ---------- */
var SVCPROC={spooler:["spoolsv",14,0.42],reportbuilder:["ReportBuilder",182,1.25],mssqlserver:["sqlservr",410,6.5],windefend:["MsMpEng",190,3.1],fsbackup:["fsbackup",46,0.3]};
function mkProc(id,name,cpu,mb,start,svc){return O("Process",{Id:id,ProcessName:name,Name:name,CPU:cpu,WorkingSet:Math.round(mb*MB),WS:Math.round(mb*MB),Handles:120+id%977,StartTime:start,Path:id<900?null:"C:\\"+(svc||/^(chrome|OUTLOOK|Teams)$/.test(name)?"Program Files\\"+name:"Windows\\System32")+"\\"+name+".exe",__svc:svc||null})}
function mkEvent(log,time,id,level,prov,msg,user,ip,failed){var e=O("Event",{TimeCreated:time,Id:id,LevelDisplayName:level,Message:msg,ProviderName:prov,LogName:log,MachineName:"FS01.example.org"});
  if(log==="Security"){e.KeywordsDisplayNames=failed?"Audit Failure":"Audit Success";e.TargetUserName=user||null;e.IpAddress=ip||null}return e}
function secLog(){var L=[],k,d,A="Microsoft-Windows-Security-Auditing";
  function bad(t,u,ip){L.push(mkEvent("Security",t,4625,"Information",A,"An account failed to log on. Account: "+u+". Source address: "+ip+". Reason: Unknown user name or bad password.",u,ip,1))}
  function good(t,u,ip){L.push(mkEvent("Security",t,4624,"Information",A,"An account was successfully logged on. Account: "+u+". Source address: "+ip+". Logon type: 3.",u,ip))}
  for(k=0;k<38;k++)bad(new Date(Date.UTC(2026,9,6,1,12,4)+k*236e3+(k*37%50)*1e3),"svc_backup","203.0.113.45");
  L.push(mkEvent("Security",dt(2026,10,6,1,31,50),4740,"Information",A,"A user account was locked out. Account: svc_backup. Caller computer: FS01.","svc_backup",null));
  for(k=0;k<5;k++)bad(dt(2026,9,12,23,30+k*2,11+k*7),"Administrator","198.51.100.9");
  good(dt(2026,9,12,23,41,2),"Administrator","198.51.100.9");
  L.push(mkEvent("Security",dt(2026,9,12,23,47,30),4720,"Information",A,"A user account was created. New account: support. Created by: Administrator.","support",null));
  L.push(mkEvent("Security",dt(2026,9,12,23,48,5),4732,"Information",A,"A member was added to a security-enabled local group. Member: support. Group: Administrators.","support",null));
  bad(dt(2026,10,5,8,1,12),"m.keller","10.87.20.31");bad(dt(2026,10,5,8,1,40),"m.keller","10.87.20.31");bad(dt(2026,10,5,8,2,9),"m.keller","10.87.20.31");
  bad(dt(2026,10,6,8,1,55),"anna","10.87.20.14");bad(dt(2026,10,2,13,14,3),"l.vogt","10.87.20.22");bad(dt(2026,10,6,8,2,20),"anna","10.87.20.14");
  var U=[["anna","10.87.20.14"],["m.keller","10.87.20.31"],["l.vogt","10.87.20.22"],["t.novak","10.87.20.35"],["n.roth","10.87.20.27"],["s.lindqvist","10.87.20.29"]];
  [1,2,5,6].forEach(function(day){U.forEach(function(u,x){if(day===6&&x>3&&x!==4)return;if(day===5&&x===5)return;good(dt(2026,10,day,7,48+x*4,(day*13+x*7)%60),u[0],u[1])})});
  good(dt(2026,10,6,2,0,3),"svc_sql","10.87.10.20");
  L.push(mkEvent("Security",dt(2026,10,6,8,3,1),4672,"Information",A,"Special privileges assigned to new logon. Account: anna.","anna",null));
  L.sort(function(a,b){return b.TimeCreated-a.TimeCreated});return L}
function sysLog(){var S="Service Control Manager",I="Information",E="Error";return[
  mkEvent("System",dt(2026,10,6,6,0,12),1014,"Warning","Microsoft-Windows-DNS-Client","Name resolution for the name old-nas.example.org timed out after none of the configured DNS servers responded."),
  mkEvent("System",dt(2026,10,2,11,26,9),7036,I,S,"The Print Spooler service entered the stopped state."),
  mkEvent("System",dt(2026,10,2,11,26,8),7031,E,S,"The Print Spooler service terminated unexpectedly. It has done this 3 time(s)."),
  mkEvent("System",dt(2026,10,2,9,41,30),7036,I,S,"The Print Spooler service entered the running state."),
  mkEvent("System",dt(2026,10,2,9,40,2),7031,E,S,"The Print Spooler service terminated unexpectedly. It has done this 2 time(s)."),
  mkEvent("System",dt(2026,10,1,15,13,44),7036,I,S,"The Print Spooler service entered the running state."),
  mkEvent("System",dt(2026,10,1,15,12,27),7031,E,S,"The Print Spooler service terminated unexpectedly. It has done this 1 time(s)."),
  mkEvent("System",dt(2026,9,29,3,10,0),2013,"Warning","srv","The C: disk is at or near capacity. You may need to delete some files."),
  mkEvent("System",dt(2026,9,22,16,14,51),7040,I,S,"The start type of the Windows Update service was changed from auto start to disabled."),
  mkEvent("System",dt(2026,9,19,23,0,7),7000,E,S,"The FS Backup Agent service failed to start due to the following error: The service did not start due to a logon failure."),
  mkEvent("System",dt(2026,9,19,23,0,7),7038,E,S,"The FSBackup service was unable to log on as EXAMPLE\\svc_backup with the currently configured password."),
  mkEvent("System",dt(2026,9,18,23,42,30),7036,I,S,"The FS Backup Agent service entered the stopped state."),
  mkEvent("System",dt(2026,9,14,6,2,10),7036,I,S,"The Report Builder service entered the running state."),
  mkEvent("System",dt(2026,9,10,3,4,40),6005,I,"EventLog","The Event log service was started.")]}
function appLog(){return[
  mkEvent("Application",dt(2026,10,6,7,45,18),1000,"Error","ReportBuilder","Out of memory while rendering report 'monthly-sales'. The report was not created."),
  mkEvent("Application",dt(2026,10,5,14,20,3),1001,"Warning","ReportBuilder","Memory use is above 3 GB. The report cache is not released (release_after_render=false)."),
  mkEvent("Application",dt(2026,9,28,9,15,40),1001,"Warning","ReportBuilder","Memory use is above 2 GB. The report cache is not released (release_after_render=false)."),
  mkEvent("Application",dt(2026,9,14,6,2,11),1,"Information","ReportBuilder","Report Builder started. Version 4.2."),
  mkEvent("Application",dt(2026,9,10,3,5,2),17137,"Information","MSSQLSERVER","Starting up database 'reports'.")]}
function adUsers(){var rows=[
  ["Administrator","","","Administrator",1,"IT","","Built-in account for administering the domain",dt(2026,9,12,23,41),1,dt(2019,3,4,10,0)],
  ["Anna Berg","Anna","Berg","anna",1,"IT","System administrator","",dt(2026,10,6,8,2),0,dt(2026,9,28,9,0)],
  ["Markus Keller","Markus","Keller","m.keller",1,"Sales","Sales manager","",dt(2026,10,6,7,52),0,dt(2026,8,3,8,10)],
  ["Lena Vogt","Lena","Vogt","l.vogt",1,"Finance","Accountant","",dt(2026,10,6,7,56),0,dt(2026,7,20,8,30)],
  ["Tomas Novak","Tomas","Novak","t.novak",1,"Engineering","Design engineer","",dt(2026,10,6,8,0),0,dt(2026,9,1,7,45)],
  ["Sara Lindqvist","Sara","Lindqvist","s.lindqvist",1,"Marketing","Marketing lead","",dt(2026,10,2,8,8),0,dt(2026,8,17,9,20)],
  ["Jonas Weber","Jonas","Weber","j.weber",1,"Engineering","Test engineer","Parental leave until December 2026",dt(2026,5,12,16,30),0,dt(2026,3,2,8,0)],
  ["Petra Hahn","Petra","Hahn","p.hahn",1,"Finance","Controller","",dt(2026,6,20,12,5),0,dt(2026,4,14,10,0)],
  ["Dirk Osten","Dirk","Osten","d.osten",1,"Sales","Sales representative","Left the company on 2026-03-31",dt(2026,3,3,17,12),0,dt(2025,12,1,8,0)],
  ["Nina Roth","Nina","Roth","n.roth",1,"Marketing","Designer","",dt(2026,10,6,8,4),0,dt(2026,9,9,8,15)],
  ["Olaf Brandt","Olaf","Brandt","o.brandt",1,"Management","Managing director","",dt(2026,10,1,9,30),1,dt(2021,1,11,9,0)],
  ["svc_backup","","","svc_backup",1,"Service accounts","","Runs the FS Backup Agent",dt(2026,9,18,23,0),1,dt(2020,6,2,14,0)],
  ["svc_sql","","","svc_sql",1,"Service accounts","","Runs SQL Server on FS01",dt(2026,10,6,2,0),1,dt(2020,6,2,14,5)],
  ["Temp Intern","Temp","Intern","t.intern",0,"Engineering","Intern","Summer 2025",dt(2025,8,29,15,40),0,dt(2025,6,2,8,0)]];
  return rows.map(function(r){var ou=r[5]==="Service accounts"?"Service Accounts":r[3]==="Administrator"?"Users":"Staff";
    return{Name:r[0],GivenName:r[1]||null,Surname:r[2]||null,SamAccountName:r[3],Enabled:!!r[4],Department:r[5],Title:r[6]||null,Description:r[7]||null,LastLogonDate:r[8],PasswordNeverExpires:!!r[9],PasswordLastSet:r[10],
      whenCreated:dt(r[10].getUTCFullYear()-(r[9]?0:2),3,1,9,0),EmailAddress:ou==="Staff"?r[3]+"@example.org":null,DistinguishedName:"CN="+r[0]+","+(ou==="Users"?"CN=Users":"OU="+ou)+",DC=example,DC=org",UserPrincipalName:r[3]+"@example.org",ObjectClass:"user"}})}
var ADDEF=["DistinguishedName","Enabled","GivenName","Name","ObjectClass","SamAccountName","Surname","UserPrincipalName"],ADEXT=["Department","Title","Description","LastLogonDate","PasswordNeverExpires","PasswordLastSet","whenCreated","EmailAddress"];
var HOSTS=[{n:["fs01","fs01.example.org","localhost","127.0.0.1"],ip:"10.87.10.20",up:1,p:[135,445,1433,3389,5985],ms:0},{n:["dc01","dc01.example.org"],ip:"10.87.10.10",up:1,p:[53,88,135,389,445,636,3389],ms:1},
  {n:["print01","print01.example.org"],ip:"10.87.10.40",up:1,p:[80,9100],ms:2},{n:["gw","gw.example.org"],ip:"10.87.10.1",up:1,p:[],ms:1},{n:["old-nas","old-nas.example.org"],ip:"10.87.10.60",up:0,p:[],ms:0},
  {n:["mail.example.org"],ip:"198.51.100.25",up:1,p:[25,443,587],ms:14},{n:["www.example.org","example.org"],ip:"203.0.113.10",up:1,p:[80,443],ms:19}];
function make(){var st=dt(2026,9,10,3,4),svc=[["Running","BFE","Base Filtering Engine","Automatic"],["Stopped","BITS","Background Intelligent Transfer Service","Manual"],["Running","Dhcp","DHCP Client","Automatic"],["Running","Dnscache","DNS Client","Automatic"],
    ["Running","EventLog","Windows Event Log","Automatic"],["Stopped","FSBackup","FS Backup Agent","Automatic"],["Running","LanmanServer","Server","Automatic"],["Running","LanmanWorkstation","Workstation","Automatic"],
    ["Running","MSSQLSERVER","SQL Server (MSSQLSERVER)","Automatic"],["Running","Netlogon","Netlogon","Automatic"],["Stopped","RemoteRegistry","Remote Registry","Disabled"],["Running","ReportBuilder","Report Builder","Automatic"],
    ["Running","Schedule","Task Scheduler","Automatic"],["Stopped","Spooler","Print Spooler","Automatic"],["Running","TermService","Remote Desktop Services","Manual"],["Running","W32Time","Windows Time","Manual"],
    ["Running","WinDefend","Microsoft Defender Antivirus Service","Automatic"],["Running","WinRM","Windows Remote Management (WS-Management)","Automatic"],["Stopped","WSearch","Windows Search","Manual"],["Stopped","wuauserv","Windows Update","Disabled"]];
  return{cwd:HOME,vars:{},hist:[],fs:makeFs(),pid:7004,buf:[],errs:[],cmds:[],objs:[],cur:"",
    svc:svc.map(function(s){return O("Service",{Status:s[0],Name:s[1],DisplayName:s[2],StartType:s[3],ServiceName:s[1],MachineName:"."})}),
    proc:[mkProc(4,"System",412.31,6.2,st),mkProc(512,"smss",0.19,1.1,st),mkProc(688,"csrss",9.84,5.4,st),mkProc(780,"wininit",0.31,6.0,st),mkProc(812,"services",24.61,11.3,st),mkProc(824,"lsass",61.2,22.7,st),
      mkProc(1040,"svchost",18.44,31.5,st),mkProc(1188,"svchost",44.92,58.1,st),mkProc(1320,"svchost",7.7,19.3,st),mkProc(1764,"dwm",120.33,96.4,st),mkProc(2104,"MsMpEng",388.56,412.3,st,"WinDefend"),mkProc(2480,"sqlservr",1904.7,1280.6,st,"MSSQLSERVER"),
      mkProc(3012,"explorer",77.5,141.2,dt(2026,10,6,8,2)),mkProc(4812,"ReportBuilder",5120.44,3960.8,dt(2026,9,14,6,2),"ReportBuilder"),mkProc(5236,"chrome",210.81,524.9,dt(2026,10,6,8,5)),mkProc(5290,"chrome",96.14,318.2,dt(2026,10,6,8,5)),
      mkProc(5644,"OUTLOOK",143.2,356.7,dt(2026,10,6,8,4)),mkProc(6020,"powershell",3.12,88.5,dt(2026,10,6,8,29)),mkProc(6388,"Teams",301.4,612.4,dt(2026,10,6,8,4))],
    ad:adUsers(),logs:{Security:secLog(),System:sysLog(),Application:appLog()},
    lu:[["Administrator",false,"Built-in account for administering the computer"],["anna",true,"Local account of the system administrator"],["DefaultAccount",false,"A user account managed by the system."],["Guest",false,"Built-in account for guest access to the computer"],["support",true,""]].map(function(u){return O("LocalUser",{Name:u[0],Enabled:u[1],Description:u[2],PrincipalSource:"Local",ObjectClass:"User"})}),
    lg:{Administrators:["Members have complete and unrestricted access to the computer",[["User","FS01\\Administrator","Local"],["User","FS01\\anna","Local"],["User","FS01\\support","Local"],["Group","EXAMPLE\\Domain Admins","ActiveDirectory"]]],
        "Remote Desktop Users":["Members are granted the right to log on remotely",[["User","FS01\\support","Local"],["Group","EXAMPLE\\IT","ActiveDirectory"]]],
        Users:["Users are prevented from making system-wide changes",[["Group","EXAMPLE\\Domain Users","ActiveDirectory"],["Group","NT AUTHORITY\\Authenticated Users","Unknown"]]]}}}

/* ---------- cmdlets ---------- */
var CMD={},ALIAS={},ORDER=[],MM="Microsoft.PowerShell.Management",MU="Microsoft.PowerShell.Utility",MC="Microsoft.PowerShell.Core";
var OPS=["EQ","NE","GT","GE","LT","LE","Like","NotLike","Match","NotMatch","Contains","NotContains","In","NotIn"];
function def(name,mod,al,spec,syn,ex,fn){var C={n:name,l:name.toLowerCase(),mod:mod,al:al?al.split(" "):[],ps:[],pos:[],rest:null,syn:syn,ex:ex,fn:fn};
  (spec?spec.split(" "):[]).forEach(function(t){var m=/^([\w=]+)([@!*]*)$/.exec(t),ns=m[1].split("="),p={n:ns[0],al:ns.slice(1),sw:m[2].indexOf("!")>=0};C.ps.push(p);if(m[2].indexOf("@")>=0)C.pos.push(p.n);if(m[2].indexOf("*")>=0)C.rest=p.n});
  C.ps.push({n:"ErrorAction",al:["EA"],sw:false},{n:"Verbose",al:[],sw:true});CMD[C.l]=C;C.al.forEach(function(a){ALIAS[a]=C.l});ORDER.push(C.l)}
function resolve(n){n=String(n).toLowerCase();if(has(ALIAS,n))n=ALIAS[n];return has(CMD,n)?CMD[n]:null}
function findParam(C,n){var l=n.toLowerCase(),hit=[],k;if(l==="?")return{n:"?",sw:true};
  for(k=0;k<C.ps.length;k++)if(C.ps[k].n.toLowerCase()===l||C.ps[k].al.some(function(a){return a.toLowerCase()===l}))return C.ps[k];
  C.ps.forEach(function(p){if(p.n.toLowerCase().indexOf(l)===0||p.al.some(function(a){return a.toLowerCase().indexOf(l)===0}))hit.push(p)});
  if(hit.length===1)return hit[0];
  if(!hit.length)fail("A parameter cannot be found that matches parameter name '"+n+"'.","NamedParameterNotFound");
  fail("Parameter cannot be processed because the parameter name '"+n+"' is ambiguous. Possible matches include:"+hit.map(function(p){return" -"+p.n}).join("")+".","AmbiguousParameter")}
function bind(S,C,nd){var P={},pos=[],a=nd.args,k,x,d,pi=0;
  for(k=0;k<a.length;k++){x=a[k];
    if(x.k==="p"){d=findParam(C,x.n);
      if(d.sw)P[d.n]=x.v?truthy(ev(S,x.v)):true;
      else if(x.v)P[d.n]=ev(S,x.v);
      else{if(!a[k+1]||a[k+1].k!=="a")fail("Missing an argument for parameter '"+d.n+"'. Specify a parameter of type 'System.Object' and try again.","MissingArgument");P[d.n]=ev(S,a[++k].v)}}
    else pos.push(ev(S,x.v))}
  pos.forEach(function(v){while(pi<C.pos.length&&has(P,C.pos[pi]))pi++;
    if(pi>=C.pos.length){if(C.rest){P[C.rest]=arr(P[C.rest]).concat(isA(v)?v:[v]);return}fail("A positional parameter cannot be found that accepts argument '"+str(v)+"'.","PositionalParameterNotFound")}
    P[C.pos[pi++]]=v});
  return P}
function warn(S,msg,id){S.errs.push(fmtErr(new PErr(msg,id,S.cur)))}
function host(S,t){S.buf.push(t)}
function int(v,name){var x=tonum(isA(v)?v[0]:v);if(x===null)fail("Cannot bind parameter '"+name+"'. Cannot convert value \""+str(v)+"\" to type \"System.Int32\".","CannotConvertArgumentNoMessage");return Math.round(x)}
function runCmd(S,nd,input){var nm=nd.name,C=resolve(nm),out,P,prev=S.cur,n0=S.errs.length,quiet=false;
  if(!C){if(has(NATIVE,nm.toLowerCase())){S.cmds.push(nm.toLowerCase());return NATIVE[nm.toLowerCase()](S,nd)}
    fail("The term '"+nm+"' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again."+(has(S.vars,"_")&&isO(S.vars._)&&key(S.vars._,nm)!==null?"\n(Inside a script block a property needs $_ in front: $_."+key(S.vars._,nm)+")":""),"CommandNotFoundException",nm)}
  S.cmds.push(C.l);S.cur=C.n;
  try{P=bind(S,C,nd);quiet=/^(silentlycontinue|ignore)$/i.test(str(P.ErrorAction));out=P["?"]?[helpText(C,false)]:C.fn(S,P,input)||[]}
  catch(e){if(e instanceof PErr){if(quiet){S.errs.length=n0;return[]}if(!e.who&&e.id!=="ParserError")e.who=C.n}throw e}
  finally{S.cur=prev}
  if(quiet)S.errs.length=n0;
  if(nd.redir){writeText(S,str(ev(S,nd.redir.v)),render(out).replace(/\n/g,"\r\n")+"\r\n",nd.redir.ap);return[]}
  return out}
function specs(S,val,first){var out=[];arr(val).forEach(function(p){var e,nm,sub,k;
    if(isSB(p)){out.push({h:p.src.trim(),get:function(o){return unwrap(invoke(S,p,o))}});return}
    if(isO(p)&&p.__t==="Hashtable"){e=gp(p,"Expression");if(e===null)e=gp(p,"e");nm=gp(p,"Name");if(nm===null)nm=gp(p,"Label");if(nm===null)nm=gp(p,"n");if(nm===null)nm=gp(p,"l");
      if(e===null)fail("A calculated property needs an Expression key, for example @{Name='MB';Expression={$_.Length/1MB}}.","ExpressionMissing");
      sub=specs(S,e,first)[0];out.push({h:nm===null?sub.h:str(nm),get:sub.get,desc:truthy(gp(p,"Descending"))});return}
    p=str(p);if(hasWild(p)&&isO(first)){var re=wild(p);props(first).forEach(function(x){if(re.test(x))out.push(colOf([x]))});return}
    k=isO(first)?key(first,p):null;out.push(colOf([k||p]))});
  return out}
function sortCmp(a,b){if(a===undefined)a=null;if(b===undefined)b=null;if(a===null||b===null)return a===b?0:a===null?-1:1;
  if(typeof a==="number"&&typeof b==="number")return a-b;if(isD(a)&&isD(b))return a-b;if(typeof a==="boolean"&&typeof b==="boolean")return a===b?0:a?1:-1;
  a=str(a).toLowerCase();b=str(b).toLowerCase();return a<b?-1:a>b?1:0}
function svcs(S,P,input,need){var names=P.Name!==undefined?arr(P.Name):null,out=[];
  if(!names&&P.DisplayName===undefined){input.forEach(function(o){if(isO(o)&&o.__t==="Service")out.push(o);else if(isO(o)&&gp(o,"Name")!==null)names=(names||[]).concat([gp(o,"Name")]);else if(typeof o==="string")names=(names||[]).concat([o])});
    if(!names&&!out.length){if(need)fail("Say which service: give -Name, for example -Name Spooler, or pipe services into this cmdlet.","MissingName");return input.length?[]:S.svc.slice()}}
  if(names)names.forEach(function(nm){if(isO(nm)&&nm.__t==="Service"){out.push(nm);return}var re=wild(str(nm)),hit=S.svc.filter(function(s){return re.test(s.Name)});
    if(!hit.length&&!hasWild(nm))warn(S,"Cannot find any service with service name '"+str(nm)+"'.","NoServiceFoundForGivenName");out=out.concat(hit)});
  if(P.DisplayName!==undefined)arr(P.DisplayName).forEach(function(nm){var re=wild(str(nm));out=out.concat(S.svc.filter(function(s){return re.test(s.DisplayName)}))});
  return out}
function sysEvent(S,id,level,msg){S.logs.System.unshift(mkEvent("System",new Date(NOW),id,level,"Service Control Manager",msg))}
function svcState(S,s,run){var l=s.Name.toLowerCase();
  if(run){if(s.Status==="Running")return;
    if(s.StartType==="Disabled"||l==="fsbackup"){warn(S,"Service '"+s.DisplayName+" ("+s.Name+")' cannot be started due to the following error: Cannot start service "+s.Name+" on computer '.'.","CouldNotStartService");
      sysEvent(S,7000,"Error","The "+s.DisplayName+" service failed to start due to the following error: "+(l==="fsbackup"?"The service did not start due to a logon failure.":"The service cannot be started, either because it is disabled or because it has no enabled devices associated with it."));return}
    s.Status="Running";if(has(SVCPROC,l)){S.pid+=36;S.proc.push(mkProc(S.pid,SVCPROC[l][0],SVCPROC[l][2],SVCPROC[l][1],new Date(NOW),s.Name))}}
  else{if(s.Status==="Stopped")return;s.Status="Stopped";S.proc=S.proc.filter(function(p){return p.__svc!==s.Name})}
  sysEvent(S,7036,"Information","The "+s.DisplayName+" service entered the "+(run?"running":"stopped")+" state.")}
function svcAct(verb,fn){return function(S,P,input){var L=svcs(S,P,input,true);L.forEach(function(s){if(P.WhatIf)host(S,"What if: Performing the operation \""+verb+"\" on target \""+s.DisplayName+" ("+s.Name+")\".");else fn(S,s)});return P.PassThru&&!P.WhatIf?L:[]}}
function adFind(S,id){var l=(isO(id)?str(gp(id,"SamAccountName")):str(id)).toLowerCase(),k;for(k=0;k<S.ad.length;k++){var u=S.ad[k];if(u.SamAccountName.toLowerCase()===l||u.Name.toLowerCase()===l||u.DistinguishedName.toLowerCase()===l||u.UserPrincipalName.toLowerCase()===l)return u}
  fail("Cannot find an object with identity: '"+(isO(id)?str(gp(id,"SamAccountName")):str(id))+"' under: 'DC=example,DC=org'.","ADIdentityNotFoundException")}
function adOut(u,ext){var o=O("ADUser",{});ADDEF.concat(ext).sort(function(a,b){a=a.toLowerCase();b=b.toLowerCase();return a<b?-1:a>b?1:0}).forEach(function(k){o[k]=u[k]});return o}
function adFilter(S,f){if(isSB(f))f=f.src;f=str(f).trim();if(f==="*")return function(){return true};var toks=f.split(/\s+-(and|or)\s+/i),cl=[],k,m,v,q;
  for(k=0;k<toks.length;k+=2){m=/^\(?\s*(\w+)\s+-(eq|ne|like|notlike|gt|ge|lt|le)\s+(.+?)\s*\)?$/i.exec(toks[k]);if(!m)fail("Error parsing query: '"+f+"'. Write it like: Enabled -eq $true, or: Name -like 'A*'.","ADFilterParsingException");
    v=m[3];q=/^(['"])(.*)\1$/.exec(v);if(q)v=/^(true|false)$/i.test(q[2])?/^true$/i.test(q[2]):q[2];else if(v.charAt(0)==="$")v=getVar(S,v.slice(1).toLowerCase());else if(num(v)!==null)v=num(v);
    cl.push({p:m[1],o:m[2].toLowerCase(),v:v,j:k?toks[k-1].toLowerCase():null})}
  return function(u){var r=true;cl.forEach(function(c,x){var kk=key(u,c.p),t=kk===null?false:test(c.o,u[kk],c.v);r=x===0?t:c.j==="and"?r&&t:r||t});return r}}
function adAct(on){return function(S,P,input){var ids=P.Identity!==undefined?arr(P.Identity):input,out=[];if(!ids.length)fail("Say which account: give -Identity, for example -Identity d.osten, or pipe users into this cmdlet.","MissingIdentity");
  ids.forEach(function(id){var u=adFind(S,id);if(P.WhatIf){host(S,"What if: Performing the operation \"Set\" on target \""+u.DistinguishedName+"\".");return}u.Enabled=on;out.push(adOut(u,[]))});return P.PassThru?out:[]}}
function hostFind(n){var l=str(n).toLowerCase(),k;for(k=0;k<HOSTS.length;k++)if(HOSTS[k].ip===l||HOSTS[k].n.indexOf(l)>=0)return HOSTS[k];return /^\d+\.\d+\.\d+\.\d+$/.test(l)?{n:[l],ip:l,up:0,p:[],ms:0}:null}
var STRM=[["Contains","bool Contains(string value)"],["EndsWith","bool EndsWith(string value)"],["IndexOf","int IndexOf(string value)"],["Replace","string Replace(string oldValue, string newValue)"],["Split","string[] Split(Params char[] separator)"],["StartsWith","bool StartsWith(string value)"],["Substring","string Substring(int startIndex, int length)"],["ToLower","string ToLower()"],["ToUpper","string ToUpper()"],["Trim","string Trim()"]],
    DATEM=[["AddDays","datetime AddDays(double value)"],["AddHours","datetime AddHours(double value)"],["AddMonths","datetime AddMonths(int months)"],["AddYears","datetime AddYears(int value)"]],DATEP=["Date","Day","DayOfWeek","Hour","Minute","Month","Second","Year"];
function members(v){var T=isO(v)?TYPES[v.__t]:null,tn=typeName(v),out=[];
  function add(n,mt,d){out.push(O("Member",{Name:n,MemberType:mt,Definition:d,TypeName:tn}))}
  function ty(x){var t=typeName(x);return{"System.String":"string","System.Int32":"int","System.Int64":"long","System.Double":"double","System.Boolean":"bool","System.DateTime":"datetime","null":"System.Object"}[t]||t}
  (typeof v==="string"?STRM:isD(v)?DATEM:T&&T.m||[]).concat(COMMON).sort(function(a,b){return a[0]<b[0]?-1:1}).forEach(function(m){add(m[0],"Method",m[1])});
  if(typeof v==="string")add("Length","Property","int Length {get;}");
  else if(isD(v))DATEP.forEach(function(k){add(k,"Property",(k==="Date"?"datetime ":k==="DayOfWeek"?"System.DayOfWeek ":"int ")+k+" {get;}")});
  else if(isO(v))props(v).sort(function(a,b){a=a.toLowerCase();b=b.toLowerCase();return a<b?-1:a>b?1:0}).forEach(function(k){if(T)add(k,"Property",(T.d&&T.d[k]||ty(v[k]))+" "+k+" {get;"+(v.__t==="ADUser"?"set;":"")+"}");else add(k,"NoteProperty",ty(v[k])+" "+k+"="+cell(v[k]))});
  return out}
function toCsv(input,P){var d=P.Delimiter===undefined?",":str(P.Delimiter),L=[],f=input[0],ks;if(!input.length)return L;
  function q(v){return'"'+(isA(v)?"System.Object[]":isO(v)?objStr(v):cell(v)).replace(/"/g,'""')+'"'}
  if(!P.NoTypeInformation)L.push("#TYPE "+typeName(f));
  if(!isO(f)){L.push('"Length"');input.forEach(function(v){L.push(q(str(v).length))});return L}
  ks=props(f);L.push(ks.map(q).join(d));input.forEach(function(o){L.push(ks.map(function(k){return q(isO(o)?gp(o,k):null)}).join(d))});return L}
function csvLine(s,d){var out=[],cur="",inq=false,k,c;for(k=0;k<s.length;k++){c=s.charAt(k);if(inq){if(c==='"'){if(s.charAt(k+1)==='"'){cur+='"';k++}else inq=false}else cur+=c}else if(c==='"')inq=true;else if(c===d){out.push(cur);cur=""}else cur+=c}out.push(cur);return out}
function toJson(v,ind,cp,depth){var nl=cp?"":"\n",pad1=cp?"":ind+"  ",sep=cp?":":": ";
  if(v===null||v===undefined)return"null";if(typeof v==="string")return JSON.stringify(v);if(typeof v==="number")return isFinite(v)?numStr(v):"null";if(typeof v==="boolean")return String(v);if(isD(v))return'"'+dFmt(v,"yyyy-MM-dd")+"T"+dFmt(v,"HH:mm:ss")+'"';
  if(depth>3)return JSON.stringify(str(v));
  if(isA(v))return v.length?"["+nl+v.map(function(x){return pad1+toJson(x,ind+"  ",cp,depth+1)}).join(","+nl)+nl+(cp?"":ind)+"]":"[]";
  if(v.__t==="ScriptBlock")return JSON.stringify(v.src);
  return"{"+nl+props(v).map(function(k){return pad1+JSON.stringify(k)+sep+toJson(v[k],ind+"  ",cp,depth+1)}).join(","+nl)+nl+(cp?"":ind)+"}"}
function syntax(C){return C.n+C.ps.filter(function(p){return p.n!=="ErrorAction"&&p.n!=="Verbose"}).map(function(p){var pos=C.pos.indexOf(p.n)>=0;return" ["+(p.sw?"-"+p.n:(pos?"[-"+p.n+"]":"-"+p.n)+" <value>")+"]"}).join("")}
function helpText(C,examples){var L=["","NAME","    "+C.n,""],k;
  if(examples){for(k=0;k<C.ex.length;k+=2)L.push("    -------------------------- EXAMPLE "+(k/2+1)+" --------------------------","","    PS C:\\> "+C.ex[k],"","    "+C.ex[k+1],"")}
  else{L.push("SYNOPSIS","    "+C.syn,"","SYNTAX","    "+syntax(C),"");if(C.al.length)L.push("ALIASES","    "+C.al.join(", "),"");L.push("REMARKS","    To see two examples, type: Get-Help "+C.n+" -Examples","    This is the playground's own help. It lists the parameters that work here.","")}
  return L.join("\n")}
function overview(){return["","TOPIC","    PowerShell playground help","","SHORT DESCRIPTION","    A cmdlet is named Verb-Noun, for example Get-Service. Cmdlets hand objects to each other with the pipe |.","",
  "    Get-Command                 lists every cmdlet that works here","    Get-Command *service*       finds cmdlets by name","    Get-Help Get-Service        explains one cmdlet","    Get-Help Get-Service -Examples",
  "    Get-Service | Get-Member    shows what properties the objects have","","    The usual pattern:  Get-Something | Where-Object { ... } | Sort-Object ... | Select-Object ...",""].join("\n")}
def("Get-Process",MM,"ps gps","Name@ Id","Gets the processes that run on the computer.",["Get-Process","Lists all processes with their Id, CPU seconds and memory.","Get-Process -Name chrome","Shows only the processes called chrome."],function(S,P,input){var out=S.proc.slice();
  if(P.Id!==undefined){var ids=arr(P.Id).map(function(x){return int(x,"Id")});out=[];ids.forEach(function(id){var h=S.proc.filter(function(p){return p.Id===id});if(!h.length)warn(S,"Cannot find a process with the process identifier "+id+".","NoProcessFoundForGivenId");out=out.concat(h)})}
  if(P.Name!==undefined){var all=out;out=[];arr(P.Name).forEach(function(nm){var re=wild(str(nm)),h=all.filter(function(p){return re.test(p.ProcessName)});if(!h.length&&!hasWild(nm))warn(S,"Cannot find a process with the name \""+str(nm)+"\". Verify the process name and call the cmdlet again.","NoProcessFoundForGivenName");out=out.concat(h)})}
  return out.map(function(p,k){return[p,k]}).sort(function(a,b){return sortCmp(a[0].ProcessName,b[0].ProcessName)||a[0].Id-b[0].Id}).map(function(x){return x[0]})});
def("Stop-Process",MM,"kill spps","Id@ Name Force! PassThru! WhatIf!","Stops one or more running processes.",["Stop-Process -Id 5290","Ends the process with that Id.","Get-Process chrome | Stop-Process","Ends every process that comes down the pipeline."],function(S,P,input){var L=[],out=[];
  if(P.Id!==undefined)arr(P.Id).forEach(function(x){var id=int(x,"Id"),h=S.proc.filter(function(p){return p.Id===id});if(!h.length)warn(S,"Cannot find a process with the process identifier "+id+".","NoProcessFoundForGivenId");L=L.concat(h)});
  else if(P.Name!==undefined)arr(P.Name).forEach(function(nm){var re=wild(str(nm)),h=S.proc.filter(function(p){return re.test(p.ProcessName)});if(!h.length)warn(S,"Cannot find a process with the name \""+str(nm)+"\". Verify the process name and call the cmdlet again.","NoProcessFoundForGivenName");L=L.concat(h)});
  else if(input.length)L=input.filter(function(o){return isO(o)&&o.__t==="Process"});else fail("Say which process: give -Id or -Name, or pipe processes into this cmdlet.","MissingProcess");
  L.forEach(function(p){if(P.WhatIf){host(S,"What if: Performing the operation \"Stop-Process\" on target \""+p.ProcessName+" ("+p.Id+")\".");return}
    if(p.Id<1000||p.Id===6020){warn(S,"Cannot stop process \""+p.ProcessName+" ("+p.Id+")\" because of the following error: Access is denied"+(p.Id===6020?" (that is this session)":""),"CouldNotStopProcess");return}
    S.proc=S.proc.filter(function(q){return q!==p});if(p.__svc)S.svc.forEach(function(s){if(s.Name===p.__svc&&!S.proc.some(function(q){return q.__svc===s.Name})){s.Status="Stopped";sysEvent(S,7034,"Error","The "+s.DisplayName+" service terminated unexpectedly.")}});out.push(p)});
  return P.PassThru?out:[]});
def("Get-Service",MM,"gsv","Name@ DisplayName","Gets the services on the computer.",["Get-Service","Lists all services with their status.","Get-Service -Name Spooler | Select-Object Name,Status,StartType","Shows one service and how it is set to start."],function(S,P,input){return svcs(S,P,input,false)});
def("Start-Service",MM,"sasv","Name@ DisplayName PassThru! WhatIf!","Starts a stopped service.",["Start-Service -Name Spooler","Starts the print spooler.","Get-Service W* | Start-Service -WhatIf","Shows what would be started, and starts nothing."],svcAct("Start-Service",function(S,s){svcState(S,s,true)}));
def("Stop-Service",MM,"spsv","Name@ DisplayName Force! PassThru! WhatIf!","Stops a running service.",["Stop-Service -Name Spooler","Stops the print spooler.","Stop-Service -Name WSearch -WhatIf","Shows what would be stopped, and stops nothing."],svcAct("Stop-Service",function(S,s){svcState(S,s,false)}));
def("Restart-Service",MM,"","Name@ DisplayName Force! PassThru! WhatIf!","Stops and then starts a service.",["Restart-Service -Name Spooler","Stops the spooler and starts it again.","Restart-Service -Name ReportBuilder -PassThru","Restarts the service and shows it afterwards."],svcAct("Restart-Service",function(S,s){svcState(S,s,false);svcState(S,s,true)}));
def("Set-Service",MM,"","Name@ StartupType=StartMode Status PassThru! WhatIf!","Changes how a service starts, or its status.",["Set-Service -Name wuauserv -StartupType Manual","Lets Windows Update be started again.","Set-Service -Name BITS -StartupType Automatic -PassThru","Changes the start type and shows the service."],function(S,P,input){var L=svcs(S,P,input,true),st=null,k,T=["Automatic","Manual","Disabled"];
  if(P.StartupType!==undefined){for(k=0;k<3;k++)if(T[k].toLowerCase()===str(P.StartupType).toLowerCase())st=T[k];if(!st)fail("Cannot bind parameter 'StartupType'. Cannot convert value \""+str(P.StartupType)+"\" to type \"System.ServiceProcess.ServiceStartMode\". The possible enumeration values are \"Automatic,Manual,Disabled\".","CannotConvertArgumentNoMessage")}
  if(P.Status!==undefined&&!/^(running|stopped)$/i.test(str(P.Status)))fail("Cannot bind parameter 'Status'. The possible values are \"Running,Stopped\".","CannotConvertArgumentNoMessage");
  L.forEach(function(s){if(P.WhatIf){host(S,"What if: Performing the operation \"Set-Service\" on target \""+s.DisplayName+" ("+s.Name+")\".");return}
    if(st&&st!==s.StartType){sysEvent(S,7040,"Information","The start type of the "+s.DisplayName+" service was changed from "+s.StartType.toLowerCase()+" to "+st.toLowerCase()+".");s.StartType=st}
    if(P.Status!==undefined)svcState(S,s,/^running$/i.test(str(P.Status)))});return P.PassThru&&!P.WhatIf?L:[]});
def("Get-ChildItem",MM,"ls dir gci","Path@ Filter@ Recurse! File! Directory! Name! Force!","Lists the files and folders in a folder.",["Get-ChildItem C:\\Shares\\Projects","Lists what is in the folder.","Get-ChildItem C:\\Shares -Recurse -File -Filter *.zip","Finds all zip files below the folder."],function(S,P,input){var out=[],filt=P.Filter!==undefined?wild(str(P.Filter)):null,paths=P.Path!==undefined?arr(P.Path):input.length?input:["."];
  function walk(list){list.forEach(function(f){if(filt&&!filt.test(f.Name))return;if(P.File&&f.PSIsContainer)return;if(P.Directory&&!f.PSIsContainer)return;out.push(f)});if(P.Recurse)list.forEach(function(f){if(f.PSIsContainer)walk(kids({n:f.__n,p:f.FullName}))})}
  paths.forEach(function(p){var its=items(S,p);if(its.length===1&&its[0].PSIsContainer&&!hasWild(pathOf(p)))walk(kids({n:its[0].__n,p:its[0].FullName}));else walk(its)});
  return P.Name?out.map(function(f){return f.Name}):out});
def("Get-Content",MM,"cat gc type","Path@ TotalCount=Head=First Tail=Last Raw!","Reads a text file, one line per object.",["Get-Content C:\\Users\\anna\\Documents\\handover-notes.txt","Prints the file.","Get-Content D:\\Backup\\backup.log -Tail 2","Prints only the last two lines."],function(S,P,input){var out=[],paths=P.Path!==undefined?arr(P.Path):input;if(!paths.length)fail("Say which file: give -Path.","MissingPath");
  paths.forEach(function(p){var a=abs(S,p),r=look(S,a),L;if(!r)fail("Cannot find path '"+a+"' because it does not exist.","PathNotFound");if(r.n.d)fail("Access to the path '"+r.p+"' is denied. It is a folder. Use Get-ChildItem.","GetContentReaderUnauthorizedAccessError");
    if(r.n.x===undefined){out.push("(binary file, "+r.n.s+" bytes, nothing to read here)");return}if(P.Raw){out.push(r.n.x);return}L=r.n.x.replace(/\r?\n$/,"").split(/\r?\n/);
    if(P.TotalCount!==undefined)L=L.slice(0,Math.max(0,int(P.TotalCount,"TotalCount")));if(P.Tail!==undefined){var t=int(P.Tail,"Tail");L=t>0?L.slice(-t):[]}out=out.concat(L)});return out});
def("Set-Location",MM,"cd sl chdir","Path@","Changes the folder you are in.",["Set-Location C:\\Shares\\Projects","Goes to that folder.","Set-Location ..","Goes one folder up."],function(S,P){var a=abs(S,P.Path===undefined?"~":P.Path),r=look(S,a);if(!r)fail("Cannot find path '"+a+"' because it does not exist.","PathNotFound");if(!r.n.d)fail("Cannot find path '"+a+"' because it is not a folder.","PathNotFound");S.cwd=r.p;return[]});
def("Get-Location",MM,"pwd gl","","Shows the folder you are in.",["Get-Location","Prints the current folder.","(Get-Location).Path","Gives only the path as text."],function(S){return[O("Path",{Path:S.cwd,Drive:S.cwd.charAt(0)})]});
def("Test-Path",MM,"","Path@","Tells you whether a file or folder exists.",["Test-Path C:\\Shares\\Projects","True, the folder is there.","Test-Path C:\\Nothing","False."],function(S,P){if(P.Path===undefined)fail("Say which path: give -Path.","MissingPath");return arr(P.Path).map(function(p){return hasWild(pathOf(p))?items(S,p).length>0:!!look(S,abs(S,p))})});
def("Select-Object",MU,"select","Property@ First Last Skip ExpandProperty Unique!","Picks properties of objects, or the first or last few objects.",["Get-Service | Select-Object Name,Status,StartType","Keeps three properties of each service.","Get-Process | Select-Object -First 3","Keeps only the first three objects."],function(S,P,input){var a=input,n,out,sp,seen={};
  if(P.Skip!==undefined)a=a.slice(Math.max(0,int(P.Skip,"Skip")));if(P.First!==undefined)a=a.slice(0,Math.max(0,int(P.First,"First")));if(P.Last!==undefined){n=int(P.Last,"Last");a=n>0?a.slice(-n):[]}
  if(P.ExpandProperty!==undefined){n=str(P.ExpandProperty);out=[];a.forEach(function(o){var v=member(o,n);if((v===null||v===undefined)&&!(isO(o)&&key(o,n)!==null)){if(!seen.__w)warn(S,"Property \""+n+"\" cannot be found.","ExpandPropertyNotFound");seen.__w=1;return}if(isA(v))out=out.concat(v);else if(v!==null)out.push(v)});a=out}
  else if(P.Property!==undefined&&a.length){sp=specs(S,P.Property,a[0]);a=a.map(function(o){var r={};sp.forEach(function(c){r[c.h]=c.get(o)});r.__base=typeName(o).replace(/^Selected\./,"");return r})}
  if(P.Unique)a=a.filter(function(o){var k=isO(o)?objStr(o):typeName(o)+cell(o);k=k.toLowerCase();if(has(seen,k))return false;seen[k]=1;return true});
  return a});
def("Where-Object",MC,"where ?","Property@ Value@ FilterScript "+OPS.join(" ")+" Not!","Keeps only the objects that pass a test.",["Get-Service | Where-Object { $_.Status -eq 'Running' }","Script block form: $_ is the current object.","Get-Service | Where-Object Status -eq Stopped","Simple form, for one comparison."],function(S,P,input){var f=P.FilterScript!==undefined?P.FilterScript:P.Property,op=null,val=P.Value;
  if(f===undefined)fail("Where-Object needs a test: a script block like { $_.Status -eq 'Running' }, or the simple form: Status -eq Running.","MissingFilter");
  if(isSB(f))return input.filter(function(o){return truthy(unwrap(invoke(S,f,o)))});
  OPS.forEach(function(o){if(has(P,o)){op=o.toLowerCase();val=P[o]}});
  return input.filter(function(o){var l=member(o,str(f)),r=op?truthy(cmpOp(op,l===undefined?null:l,val===undefined?null:val)):truthy(l);return P.Not?!r:r})});
def("Sort-Object",MU,"sort","Property@ Descending! Unique!","Sorts objects by one or more properties.",["Get-Process | Sort-Object WorkingSet -Descending","Biggest memory user first.","Get-Service | Sort-Object Status,Name","Sorts by status, then by name."],function(S,P,input){if(!input.length)return[];var sp=P.Property!==undefined?specs(S,P.Property,input[0]):[{get:function(o){return isO(o)?objStr(o):o}}],
    rows=input.map(function(o,k){return{o:o,k:sp.map(function(c){return c.get(o)}),x:k}}),d=P.Descending?-1:1;
  rows.sort(function(a,b){var k,c;for(k=0;k<sp.length;k++){c=sortCmp(a.k[k],b.k[k]);if(c)return(sp[k].desc?-1:d)*c}return a.x-b.x});
  if(P.Unique)rows=rows.filter(function(r,k){return k===0||r.k.some(function(v,x){return sortCmp(v,rows[k-1].k[x])!==0})});
  return rows.map(function(r){return r.o})});
def("Group-Object",MU,"group","Property@ NoElement!","Puts objects with the same value into groups and counts them.",["Get-Service | Group-Object Status","Counts the services per status.","Get-ChildItem C:\\Shares\\Projects -Recurse -File | Group-Object Extension -NoElement","Counts files per file type, without keeping the files."],function(S,P,input){if(!input.length)return[];var sp=P.Property!==undefined?specs(S,P.Property,input[0]):[{get:function(o){return o}}],map={},L=[];
  input.forEach(function(o){var vals=sp.map(function(c){var v=c.get(o);return v===undefined?null:v}),nm=vals.map(cell).join(", "),k=nm.toLowerCase(),g;if(has(map,k))g=map[k];else{g=map[k]=O("Group",{Count:0,Name:nm,Group:[],Values:vals});L.push(g)}g.Count++;g.Group.push(o)});
  L=L.map(function(g,k){return[g,k]}).sort(function(a,b){var k,c;for(k=0;k<sp.length;k++){c=sortCmp(a[0].Values[k],b[0].Values[k]);if(c)return c}return a[1]-b[1]}).map(function(x){return x[0]});
  if(P.NoElement)L.forEach(function(g){delete g.Group});return L});
def("Measure-Object",MU,"measure","Property@ Sum! Average! Maximum! Minimum!","Counts objects, and adds up or averages a number property.",["Get-ChildItem C:\\Shares\\Projects -Recurse -File | Measure-Object -Property Length -Sum","Adds up the size of all files below the folder.","Get-Process | Measure-Object WorkingSet -Average -Maximum","Average and largest memory use."],function(S,P,input){var names=P.Property!==undefined?arr(P.Property).map(str):[null],out=[],stats=P.Sum||P.Average||P.Maximum||P.Minimum;
  names.forEach(function(nm){var vals=[],nums=[],bad=false,sum=0,mx=null,mn=null;
    input.forEach(function(o){var v=nm===null?o:member(o,nm);if(v===null||v===undefined)return;vals.push(v);var x=isD(v)?null:tonum(v);if(isO(v)||isA(v))x=null;if(x===null){if(P.Sum||P.Average){if(!bad)warn(S,"Input object \""+str(v)+"\" is not numeric.","NonNumericInputObject");bad=true}}else{nums.push(x);sum+=x}
      var c=x===null?v:x;if(mx===null||sortCmp(c,mx)>0)mx=c;if(mn===null||sortCmp(c,mn)<0)mn=c});
    if(nm!==null&&!vals.length&&input.length&&stats){warn(S,"The property \""+nm+"\" cannot be found in the input for any objects.","GenericMeasurePropertyNotFound");return}
    out.push(O("Measure",{Count:vals.length,Average:P.Average&&nums.length?sum/nums.length:null,Sum:P.Sum?sum:null,Maximum:P.Maximum?mx:null,Minimum:P.Minimum?mn:null,Property:nm}))});
  return out});
def("ForEach-Object",MC,"foreach %","Process@ MemberName","Runs a script block once for each object.",["Get-Service | ForEach-Object { $_.Name.ToUpper() }","Prints every service name in capitals.","1..3 | ForEach-Object { $_ * 2 }","Doubles each number."],function(S,P,input){var f=P.Process!==undefined?P.Process:P.MemberName,out=[];
  if(f===undefined)fail("ForEach-Object needs a script block, for example { $_.Name }.","MissingProcess");
  input.forEach(function(o){var v=isSB(f)?invoke(S,f,o):arr(member(o,str(f)));out=out.concat(v)});return out});
function fmtCmd(kind){return function(S,P,input){var a=[];input.forEach(function(o){if(isO(o)&&o.__t==="#fmt")a=a.concat(o.items);else if(o!==null)a.push(o)});if(!a.length)return[];
  if(!isO(a[0]))return a;var sp=P.Property!==undefined?specs(S,P.Property,a[0]):null;if(sp){sp.forEach(function(c){var g=c.get,memo=[];c.get=function(o){var k=a.indexOf(o);if(k<0)return g(o);if(!has(memo,k))memo[k]=g(o);return memo[k]}})}
  return[O("#fmt",{kind:kind,items:a,cols:sp,nohead:!!P.HideTableHeaders})]}}
def("Format-Table",MU,"ft","Property@ AutoSize! Wrap! HideTableHeaders!","Shows objects as a table. Use it last in a pipeline.",["Get-Service | Format-Table Name,Status,StartType","A table with the columns you name.","Get-ADUser -Filter * | Format-Table Name,Enabled -AutoSize","Turns the long list view into a short table."],fmtCmd("table"));
def("Format-List",MU,"fl","Property@","Shows objects as a list, one property per line. Use it last in a pipeline.",["Get-Service Spooler | Format-List *","Shows every property of the service.","Get-Process -Id 4812 | Format-List Name,Id,StartTime","Shows three properties as a list."],fmtCmd("list"));
def("Out-String",MU,"","Stream!","Turns the formatted output into text.",["Get-Service | Out-String","Gives the table as one piece of text.","(Get-Service Spooler | Out-String).Length","Counts the characters of that text."],function(S,P,input){var t=render(input);return P.Stream?t.split("\n"):[t+"\n"]});
def("Out-Null",MC,"","","Throws the output away.",["Get-Service | Out-Null","Prints nothing.","Start-Service Spooler -PassThru | Out-Null","Starts the service and hides the result."],function(){return[]});
def("Out-File",MU,"","FilePath@ Append! Encoding Force!","Writes the formatted output into a text file.",["Get-Service | Out-File C:\\Temp\\services.txt","Saves the table as text.","Get-Date | Out-File C:\\Temp\\log.txt -Append","Adds a line to the end of a file."],function(S,P,input){if(P.FilePath===undefined)fail("Say where to write: give -FilePath.","MissingPath");writeText(S,P.FilePath,render(input).replace(/\n/g,"\r\n")+"\r\n",P.Append);return[]});
def("Get-Member",MU,"gm","Name@ MemberType","Shows the type of an object and its properties and methods.",["Get-Service | Get-Member","Shows what a service object is made of.","Get-Process | Get-Member -MemberType Property","Shows only the properties."],function(S,P,input){var seen={},out=[],mt=P.MemberType!==undefined?arr(P.MemberType).map(function(x){return str(x).toLowerCase()}):null,re=P.Name!==undefined?arr(P.Name).map(wild):null;
  if(!input.length)fail("You must specify an object for the Get-Member cmdlet. Pipe something into it: Get-Service | Get-Member","NoObjectInGetMember");
  input.forEach(function(o){if(isO(o)&&o.__t==="#fmt")return;var t=typeName(o);if(has(seen,t))return;seen[t]=1;out=out.concat(members(o))});
  return out.filter(function(m){var l=m.MemberType.toLowerCase();if(mt&&!mt.some(function(x){return x===l||(x==="properties"&&/property/.test(l))||(x==="methods"&&l==="method")||x==="all"}))return false;return !re||re.some(function(r){return r.test(m.Name)})})});
def("Get-Help",MC,"help man","Name@ Examples! Full! Detailed!","Explains a cmdlet.",["Get-Help Get-Service","Shows what the cmdlet does and its parameters.","Get-Help Where-Object -Examples","Shows two examples."],function(S,P){if(P.Name===undefined)return[overview()];var nm=str(P.Name),C=resolve(nm);
  if(C)return[helpText(C,!!P.Examples)+(P.Full||P.Detailed?helpText(C,true):"")];
  var re=wild(hasWild(nm)?nm:"*"+nm+"*"),L=ORDER.filter(function(l){return re.test(CMD[l].n)}).sort().map(function(l){return{Name:CMD[l].n,Synopsis:CMD[l].syn}});
  if(!L.length)fail("Get-Help could not find "+nm+" in a help file in this session. Try Get-Command to see what is here.","HelpNotFound");return L});
def("Get-Command",MC,"gcm","Name@ Verb Noun Module","Lists the cmdlets you can use.",["Get-Command *service*","Finds cmdlets with service in the name.","Get-Command -Verb Get","Lists every cmdlet that reads something."],function(S,P){var out=[],names=P.Name!==undefined?arr(P.Name).map(str):null;
  function ok(C){return(P.Verb===undefined||arr(P.Verb).some(function(v){return wild(str(v)).test(C.n.split("-")[0])}))&&(P.Noun===undefined||arr(P.Noun).some(function(v){return wild(str(v)).test(C.n.split("-")[1])}))&&(P.Module===undefined||wild(str(P.Module)).test(C.mod))}
  function row(C){return O("Command",{CommandType:"Cmdlet",Name:C.n,Source:C.mod,Definition:syntax(C)})}
  if(!names)return ORDER.slice().sort().map(function(l){return CMD[l]}).filter(ok).map(row);
  names.forEach(function(nm){var re=wild(nm),h=ORDER.slice().sort().map(function(l){return CMD[l]}).filter(function(C){return re.test(C.n)&&ok(C)}).map(row);
    Object.keys(ALIAS).sort().forEach(function(a){if(re.test(a)&&ok(CMD[ALIAS[a]]))h.unshift(O("Command",{CommandType:"Alias",Name:a+" -> "+CMD[ALIAS[a]].n,Source:"",Definition:CMD[ALIAS[a]].n}))});
    if(!h.length&&!hasWild(nm))warn(S,"The term '"+nm+"' is not recognized as the name of a cmdlet, function, script file, or operable program.","CommandNotFoundException");out=out.concat(h)});return out});
def("Get-Alias",MU,"gal","Name@ Definition","Lists the short names of cmdlets.",["Get-Alias","Lists all short names.","Get-Alias -Definition Get-ChildItem","Shows the short names of one cmdlet."],function(S,P){var re=P.Name!==undefined?wild(str(P.Name)):null,de=P.Definition!==undefined?wild(str(P.Definition)):null;
  return Object.keys(ALIAS).sort().filter(function(a){return(!re||re.test(a))&&(!de||de.test(CMD[ALIAS[a]].n))}).map(function(a){return O("Command",{CommandType:"Alias",Name:a+" -> "+CMD[ALIAS[a]].n,Source:"",Definition:CMD[ALIAS[a]].n})})});
def("Get-Date",MU,"","Date@ Format","Gives the date and time as an object.",["Get-Date","The clock of the playground. It stands still at 6 October 2026, 08:30.","(Get-Date).AddDays(-90)","The date 90 days ago, ready to compare with."],function(S,P){var d=P.Date!==undefined?cast("datetime",P.Date):new Date(NOW);return[P.Format!==undefined?dFmt(d,str(P.Format)):d]});
def("Get-WinEvent","Microsoft.PowerShell.Diagnostics","","LogName@ MaxEvents FilterHashtable ListLog Oldest!","Reads events from the Windows event logs.",["Get-WinEvent -LogName System -MaxEvents 5","The five newest events of the System log.","Get-WinEvent -FilterHashtable @{LogName='Security';Id=4625}","All failed logons. The filter runs inside the log, so it is fast."],function(S,P){var h=P.FilterHashtable,logs,ids=null,lv=null,st=null,en=null,out=[],LV={1:"Critical",2:"Error",3:"Warning",4:"Information"};
  if(P.ListLog!==undefined){var re=wild(str(P.ListLog));return Object.keys(S.logs).filter(function(k){return re.test(k)}).map(function(k){return O("LogInfo",{LogName:k,RecordCount:S.logs[k].length})})}
  if(h!==undefined){if(!isO(h)||h.__t!=="Hashtable")fail("-FilterHashtable needs a hash table, for example @{LogName='Security';Id=4625}.","InvalidFilter");
    props(h).forEach(function(k){if(!/^(logname|id|level|starttime|endtime|providername)$/i.test(k))fail("The playground filters on LogName, Id, Level, ProviderName, StartTime and EndTime. It does not know '"+k+"'.","InvalidFilter")});
    logs=gp(h,"LogName");if(gp(h,"Id")!==null)ids=arr(gp(h,"Id")).map(tonum);if(gp(h,"Level")!==null)lv=arr(gp(h,"Level")).map(function(x){return LV[tonum(x)]||str(x)});if(gp(h,"StartTime")!==null)st=cast("datetime",gp(h,"StartTime"));if(gp(h,"EndTime")!==null)en=cast("datetime",gp(h,"EndTime"));var pv=gp(h,"ProviderName")}
  else logs=P.LogName;
  if(logs===undefined||logs===null)fail("Say which log: -LogName Security, System or Application, or -FilterHashtable @{LogName='Security';Id=4625}.","MissingLogName");
  arr(logs).forEach(function(nm){var k=key(S.logs,str(nm));if(k===null)fail("There is not an event log on the localhost computer that matches \""+str(nm)+"\". Here are Security, System and Application.","NoMatchingLogsFound");out=out.concat(S.logs[k])});
  out=out.filter(function(e){return(!ids||ids.indexOf(e.Id)>=0)&&(!lv||lv.indexOf(e.LevelDisplayName)>=0)&&(!st||e.TimeCreated>=st)&&(!en||e.TimeCreated<=en)&&(pv===undefined||pv===null||wild(str(pv)).test(e.ProviderName))});
  out=out.map(function(e,k){return[e,k]}).sort(function(a,b){return(b[0].TimeCreated-a[0].TimeCreated)||a[1]-b[1]}).map(function(x){return x[0]});if(P.Oldest)out.reverse();
  if(P.MaxEvents!==undefined)out=out.slice(0,Math.max(0,int(P.MaxEvents,"MaxEvents")));
  if(!out.length)warn(S,"No events were found that match the specified selection criteria.","NoMatchingEventsFound");return out});
def("Get-LocalUser","Microsoft.PowerShell.LocalAccounts","","Name@","Lists the local user accounts of this computer.",["Get-LocalUser","Lists the local accounts.","Get-LocalUser | Where-Object Enabled","Shows only the accounts that can log on."],function(S,P){if(P.Name===undefined)return S.lu.slice();var out=[];arr(P.Name).forEach(function(nm){var re=wild(str(nm)),h=S.lu.filter(function(u){return re.test(u.Name)});if(!h.length&&!hasWild(nm))warn(S,"User "+str(nm)+" was not found.","UserNotFound");out=out.concat(h)});return out});
def("Get-LocalGroup","Microsoft.PowerShell.LocalAccounts","","Name@","Lists the local groups of this computer.",["Get-LocalGroup","Lists the local groups.","Get-LocalGroup -Name Admin*","Finds groups by name."],function(S,P){var re=P.Name!==undefined?wild(str(P.Name)):null;return Object.keys(S.lg).filter(function(k){return !re||re.test(k)}).map(function(k){return O("LocalGroup",{Name:k,Description:S.lg[k][0]})})});
def("Get-LocalGroupMember","Microsoft.PowerShell.LocalAccounts","","Group=Name@","Lists who is in a local group.",["Get-LocalGroupMember -Group Administrators","Shows who is a local administrator.","Get-LocalGroupMember Administrators | Where-Object PrincipalSource -eq Local","Shows only the local accounts in the group."],function(S,P){if(P.Group===undefined)fail("Say which group: -Group Administrators.","MissingGroup");var k=key(S.lg,str(P.Group));if(k===null)fail("Group "+str(P.Group)+" was not found.","GroupNotFound");
  return S.lg[k][1].map(function(m){return O("LocalMember",{ObjectClass:m[0],Name:m[1],PrincipalSource:m[2]})})});
def("Get-ADUser","ActiveDirectory","","Identity@ Filter Properties SearchBase Server","Reads user accounts from Active Directory (here: the pretend domain example.org).",["Get-ADUser -Filter * | Format-Table Name,SamAccountName,Enabled","Lists all users as a table.","Get-ADUser -Filter * -Properties LastLogonDate | Sort-Object LastLogonDate","Asks for one more property and sorts by it."],function(S,P){var ext=[],L;
  if(P.Properties!==undefined)arr(P.Properties).forEach(function(p){p=str(p);if(p==="*"){ext=ADEXT.slice();return}var k=null;ADEXT.forEach(function(x){if(x.toLowerCase()===p.toLowerCase())k=x});if(k){if(ext.indexOf(k)<0)ext.push(k)}else if(!ADDEF.some(function(x){return x.toLowerCase()===p.toLowerCase()}))fail("One or more properties are invalid. The playground knows: "+ADEXT.join(", ")+".","ADInvalidProperty")});
  if(P.Identity!==undefined)L=arr(P.Identity).map(function(id){return adFind(S,id)});
  else if(P.Filter!==undefined){var f=adFilter(S,P.Filter);L=S.ad.filter(f)}
  else fail("Give -Filter (for all users: -Filter *) or -Identity. Real PowerShell would stop here and ask for the filter.","MissingFilter");
  return L.map(function(u){return adOut(u,ext)})});
def("Disable-ADAccount","ActiveDirectory","","Identity@ PassThru! WhatIf!","Disables a user account. The account stays, but nobody can log on with it.",["Disable-ADAccount -Identity t.intern","Disables one account.","Get-ADUser -Identity t.intern | Disable-ADAccount -WhatIf","Shows what would happen, and changes nothing."],adAct(false));
def("Enable-ADAccount","ActiveDirectory","","Identity@ PassThru! WhatIf!","Enables a user account again.",["Enable-ADAccount -Identity t.intern","Enables one account.","Enable-ADAccount -Identity t.intern -PassThru","Enables it and shows the account."],adAct(true));
def("Get-Volume","Storage","","DriveLetter@","Lists the volumes with their size and free space.",["Get-Volume","Lists the drives.","Get-Volume -DriveLetter C | Format-List *","Shows every property of drive C."],function(S,P){var V=[O("Volume",{DriveLetter:"C",FileSystemLabel:"System",FileSystem:"NTFS",DriveType:"Fixed",HealthStatus:"Healthy",SizeRemaining:Math.round(6.1*GB),Size:Math.round(237.9*GB)}),O("Volume",{DriveLetter:"D",FileSystemLabel:"Backup",FileSystem:"NTFS",DriveType:"Fixed",HealthStatus:"Healthy",SizeRemaining:Math.round(816.4*GB),Size:Math.round(931.5*GB)})];
  if(P.DriveLetter===undefined)return V;var w=arr(P.DriveLetter).map(function(x){return str(x).charAt(0).toUpperCase()});return V.filter(function(v){return w.indexOf(v.DriveLetter)>=0})});
def("Get-Disk","Storage","","Number@","Lists the physical disks.",["Get-Disk","Lists the disks.","Get-Disk | Select-Object Number,FriendlyName,PartitionStyle","Picks three properties."],function(S,P){var D=[O("Disk",{Number:0,FriendlyName:"Pretend SSD 256GB",HealthStatus:"Healthy",OperationalStatus:"Online",Size:256060514304,PartitionStyle:"GPT"}),O("Disk",{Number:1,FriendlyName:"Pretend HDD 1TB",HealthStatus:"Healthy",OperationalStatus:"Online",Size:1000204886016,PartitionStyle:"GPT"})];
  if(P.Number===undefined)return D;var w=arr(P.Number).map(tonum);return D.filter(function(d){return w.indexOf(d.Number)>=0})});
def("Get-NetIPAddress","NetTCPIP","","IPAddress@ AddressFamily InterfaceAlias","Lists the IP addresses of this computer.",["Get-NetIPAddress -AddressFamily IPv4","Shows the IPv4 addresses.","Get-NetIPAddress | Format-Table IPAddress,InterfaceAlias,PrefixLength","The same as a short table."],function(S,P){var L=[["fe80::87:10ff:fe20:1%4","Ethernet","IPv6",64,"WellKnown"],["::1","Loopback Pseudo-Interface 1","IPv6",128,"WellKnown"],["10.87.10.20","Ethernet","IPv4",24,"Manual"],["127.0.0.1","Loopback Pseudo-Interface 1","IPv4",8,"WellKnown"]].map(function(a){return O("NetIP",{IPAddress:a[0],InterfaceAlias:a[1],AddressFamily:a[2],PrefixLength:a[3],PrefixOrigin:a[4],AddressState:"Preferred"})});
  return L.filter(function(a){return(P.IPAddress===undefined||wild(str(P.IPAddress)).test(a.IPAddress))&&(P.AddressFamily===undefined||str(P.AddressFamily).toLowerCase()===a.AddressFamily.toLowerCase())&&(P.InterfaceAlias===undefined||wild(str(P.InterfaceAlias)).test(a.InterfaceAlias))})});
def("Test-Connection",MM,"","ComputerName=TargetName@ Count Quiet!","Sends pings to a computer.",["Test-Connection dc01","Four pings to the domain controller.","Test-Connection old-nas -Count 1 -Quiet","Only True or False."],function(S,P){if(P.ComputerName===undefined)fail("Say which computer: -ComputerName dc01.","MissingComputerName");var out=[],n=P.Count!==undefined?Math.min(20,Math.max(1,int(P.Count,"Count"))):4;
  arr(P.ComputerName).forEach(function(nm){var h=hostFind(nm),k;if(!h||!h.up){if(P.Quiet)out.push(false);else warn(S,"Testing connection to computer '"+str(nm)+"' failed: "+(h?"The host did not answer.":"No such host is known"),"TestConnectionException");return}
    if(P.Quiet){out.push(true);return}for(k=0;k<n;k++)out.push(O("Ping",{Source:"FS01",Destination:str(nm),IPV4Address:h.ip,Bytes:32,ResponseTime:h.ms+(k===0&&h.ms>5?3:0)}))});return out});
def("Test-NetConnection","NetTCPIP","tnc","ComputerName@ Port CommonTCPPort","Tests whether a computer answers, and whether a TCP port is open.",["Test-NetConnection dc01 -Port 389","Is LDAP reachable on the domain controller?","Test-NetConnection print01","A simple ping test."],function(S,P){var nm=P.ComputerName===undefined?"www.example.org":str(P.ComputerName),h=hostFind(nm),port=null,o,CP={http:80,rdp:3389,smb:445,winrm:5985};
  if(P.Port!==undefined)port=int(P.Port,"Port");else if(P.CommonTCPPort!==undefined){port=CP[str(P.CommonTCPPort).toLowerCase()];if(!port)fail("Cannot bind parameter 'CommonTCPPort'. The possible values are \"HTTP,RDP,SMB,WINRM\".","CannotConvertArgumentNoMessage")}
  if(!h){host(S,"WARNING: Name resolution of "+nm+" failed");return[O("TNC",{ComputerName:nm,RemoteAddress:null,InterfaceAlias:null,SourceAddress:null,PingSucceeded:false})]}
  o=O("TNC",{ComputerName:nm,RemoteAddress:h.ip});if(port!==null)o.RemotePort=port;o.InterfaceAlias="Ethernet";o.SourceAddress="10.87.10.20";
  if(port!==null){o.TcpTestSucceeded=!!h.up&&h.p.indexOf(port)>=0;if(!o.TcpTestSucceeded){host(S,"WARNING: TCP connect to ("+h.ip+" : "+port+") failed");o.PingSucceeded=!!h.up}}
  else{o.PingSucceeded=!!h.up;if(h.up)o.PingReplyDetails=h.ms+" ms";else host(S,"WARNING: Ping to "+h.ip+" failed with status: TimedOut")}return[o]});
def("ConvertTo-Csv",MU,"","Delimiter NoTypeInformation!","Turns objects into lines of CSV text.",["Get-Service | Select-Object Name,Status | ConvertTo-Csv -NoTypeInformation","Prints the services as CSV.","Get-Volume | ConvertTo-Csv -Delimiter ';'","Uses a semicolon between the columns."],function(S,P,input){return toCsv(input,P)});
def("Export-Csv",MU,"epcsv","Path@ Delimiter NoTypeInformation! Encoding Force! Append!","Writes objects into a CSV file, one line per object.",["Get-Service | Select-Object Name,Status,StartType | Export-Csv -Path services.csv -NoTypeInformation","Writes three columns into a file in the current folder.","Get-Process | Select-Object Name,Id,WS | Export-Csv C:\\Temp\\proc.csv -NoTypeInformation","Writes the file somewhere else."],function(S,P,input){if(P.Path===undefined)fail("Say where to write: -Path report.csv.","MissingPath");var L=toCsv(input,P),a=abs(S,P.Path),r=look(S,a),n;
  if(P.Append&&r&&r.n.x){L=L.filter(function(x,k){return k>0&&x.indexOf("#TYPE")!==0});n=writeText(S,P.Path,r.n.x+L.join("\r\n")+"\r\n")}else n=writeText(S,P.Path,L.length?L.join("\r\n")+"\r\n":"");
  n.sel=input.length>0&&isO(input[0])&&!input[0].__t;return[]});
def("Import-Csv",MU,"ipcsv","Path@ Delimiter","Reads a CSV file and gives one object per line.",["Import-Csv services.csv","Reads the file back as objects. Every value is text now.","Import-Csv services.csv | Where-Object Status -eq Stopped","The objects go down the pipeline like any others."],function(S,P){if(P.Path===undefined)fail("Say which file: -Path report.csv.","MissingPath");var a=abs(S,P.Path),r=look(S,a),d=P.Delimiter===undefined?",":str(P.Delimiter),L,hd;
  if(!r||r.n.d)fail("Could not find file '"+a+"'.","FileOpenFailure");if(r.n.x===undefined)fail("'"+a+"' is not a text file.","FileOpenFailure");
  L=r.n.x.split(/\r?\n/).filter(function(x){return x!==""&&x.indexOf("#TYPE")!==0});if(!L.length)return[];hd=csvLine(L[0],d);return L.slice(1).map(function(x){var c=csvLine(x,d),o={};hd.forEach(function(h,k){o[h]=k<c.length?c[k]:null});return o})});
def("ConvertTo-Json",MU,"","Depth Compress!","Turns objects into JSON text.",["Get-Service Spooler | Select-Object Name,Status | ConvertTo-Json","One object as JSON.","Get-Volume | ConvertTo-Json -Compress","All on one line."],function(S,P,input){return input.length?[toJson(input.length===1?input[0]:input,"",!!P.Compress,0)]:[]});
def("Write-Output",MU,"echo write","InputObject@*","Sends values down the pipeline.",["Write-Output 'hello'","Prints the text.","Write-Output 1,2,3 | Measure-Object -Sum","Sends three numbers into the next cmdlet."],function(S,P){return arr(P.InputObject)});
def("Write-Host",MU,"","Object@* NoNewline! ForegroundColor BackgroundColor","Writes text to the screen, not into the pipeline.",["Write-Host 'done'","Prints the text.","Write-Host \"There are $((Get-Service).Count) services\"","Text with a value inside."],function(S,P){host(S,arr(P.Object).map(str).join(" "));return[]});
def("Clear-Host",MC,"cls clear","","Clears the screen.",["Clear-Host","Empties the screen.","cls","The short name does the same."],function(S){S.clear=true;S.buf=[];return[]});
def("Get-History",MC,"h history","Count","Lists the commands you typed in this session.",["Get-History","Lists the commands so far.","Get-History -Count 3","Only the last three."],function(S,P){var L=S.hist.slice(0,-1).map(function(c,k){return O("History",{Id:k+1,CommandLine:c})});return P.Count!==undefined?L.slice(-Math.max(1,int(P.Count,"Count"))):L});
var NATIVE={whoami:function(){return["example\\anna"]},hostname:function(){return["FS01"]},exit:function(){return["This is a pretend session, there is nothing to leave. Reset brings it back to the start."]},
  ipconfig:function(){return[["","Windows IP Configuration","","Ethernet adapter Ethernet:","","   IPv4 Address. . . . . . . . . . . : 10.87.10.20","   Subnet Mask . . . . . . . . . . . : 255.255.255.0","   Default Gateway . . . . . . . . . : 10.87.10.1",""].join("\n")]}};

/* ---------- run a line, complete a word ---------- */
function flat(a){var out=[];a.forEach(function(o){if(isO(o)&&o.__t==="#fmt")out=out.concat(o.items);else out.push(o)});return out}
function run(S,line){var cmd=String(line).trim(),ast,k,o,t;S.buf=[];S.errs=[];S.cmds=[];S.objs=[];S.clear=false;S.cur="";if(cmd)S.hist.push(cmd);
  try{ast=parse(String(line));
    for(k=0;k<ast.length;k++){o=execStmt(S,ast[k]);if(o.length){S.objs=S.objs.concat(flat(o));t=render(o);if(t!=="")S.buf.push(t)}}}
  catch(e){if(e instanceof PErr)S.errs.push(fmtErr(e));else S.errs.push("The playground itself tripped over this line ("+(e&&e.message||e)+"). That is a bug in the page, not your mistake.")}
  return{out:S.buf.join("\n"),err:S.errs.join("\n"),clear:S.clear,objs:S.objs,cmds:S.cmds}}
var PROPSRC={"get-service":"svc","get-process":"proc","get-localuser":"lu"};
function propNames(S,stmt){var m=/^\s*\(?\s*([^\s|;(){}]+)/.exec(stmt),C=m?resolve(m[1]):null,o=null,seen={},out=[];
  function add(x){if(x)props(x).forEach(function(k){if(!has(seen,k.toLowerCase())){seen[k.toLowerCase()]=1;out.push(k)}})}
  if(C){if(has(PROPSRC,C.l))o=S[PROPSRC[C.l]][0];else if(C.l==="get-childitem")o=finfo({s:0,m:new Date(NOW)},"x","C:\\");else if(C.l==="get-winevent")o=S.logs.Security[0];else if(C.l==="get-aduser"||C.l==="disable-adaccount")o=adOut(S.ad[0],ADEXT);
    else if(C.l==="get-volume")o={DriveLetter:1,FileSystemLabel:1,FileSystem:1,HealthStatus:1,SizeRemaining:1,Size:1};else if(C.l==="import-csv"){return[]}}
  if(o){add(o);if(/group(-object)?\s/i.test(stmt))out=["Count","Name","Group"].concat(out)}else{add(S.svc[0]);add(S.proc[0]);add(finfo({s:0,m:new Date(NOW)},"x","C:\\"));add(S.logs.Security[0]);add(adOut(S.ad[0],ADEXT));out=["Count","Sum"].concat(out)}
  return out}
function complete(S,line){var m=/([^\s|;(){},=]*)$/.exec(line),word=m[1],start=line.length-word.length,before=line.slice(0,start),seg=before.replace(/^[\s\S]*[|;{(=]/,""),stmt=before.replace(/^[\s\S]*;/,""),
    sm=/^\s*(\S+)/.exec(seg),C=sm?resolve(sm[1]):null,lw=word.toLowerCase(),cands=[],pre="",suf=" ",prev=/(-\w+)\s+$/.exec(before),pm;
  function starts(list){return list.filter(function(x){return x.toLowerCase().indexOf(lw)===0})}
  function pathc(){var w=word.replace(/\//g,"\\"),ix=w.lastIndexOf("\\"),dir=ix>=0?w.slice(0,ix+1):"",leaf=w.slice(ix+1).toLowerCase(),r=look(S,abs(S,dir||"."));if(!r||!r.n.d)return[];pre=dir;suf="";lw=leaf;
    return Object.keys(r.n.d).filter(function(k){return k.toLowerCase().indexOf(leaf)===0}).sort().map(function(k){return k+(r.n.d[k].d?"\\":"")})}
  if((pm=/^(\$_\.|\$psitem\.)(.*)$/i.exec(word))){pre=pm[1];lw=pm[2].toLowerCase();suf="";cands=starts(propNames(S,stmt))}
  else if(word.charAt(0)==="$"){cands=starts(Object.keys(S.vars).filter(function(k){return k!=="_"}).map(function(k){return"$"+k}).concat(["$true","$false","$null","$_"]));suf=""}
  else if(!sm){if(!word)return{line:line,list:[]};cands=starts(ORDER.map(function(l){return CMD[l].n}).sort());if(!cands.length)cands=starts(Object.keys(ALIAS).filter(function(a){return /^[a-z]/.test(a)}).sort())}
  else if(word.charAt(0)==="-"){if(C){lw=lw.slice(1);pre="-";cands=starts(C.ps.map(function(p){return p.n}))}}
  else if(C){var pn=prev?prev[1].slice(1).toLowerCase():"",l=C.l;
    if(/^(select|where|sort|group|measure|format|foreach)-/.test(l)){if(!/^(first|last|skip|maxevents)$/.test(pn))cands=starts(propNames(S,stmt));suf=l==="where-object"?" ":""}
    else if(/-service$/.test(l)&&pn==="startuptype")cands=starts(["Automatic","Manual","Disabled"]);
    else if(/-service$/.test(l))cands=starts(S.svc.map(function(s){return s.Name}));
    else if(/-process$/.test(l)&&pn!=="id")cands=starts(S.proc.map(function(p){return p.ProcessName}).filter(function(x,k,a){return a.indexOf(x)===k}).sort());
    else if(l==="get-help"||l==="get-command")cands=starts(ORDER.map(function(k){return CMD[k].n}).sort());
    else if(l==="get-winevent")cands=starts(Object.keys(S.logs));
    else if(/^(get-aduser|disable-adaccount|enable-adaccount)$/.test(l)){cands=pn==="properties"?starts(ADEXT):pn==="filter"?[]:starts(S.ad.map(function(u){return u.SamAccountName}))}
    else if(l==="get-localgroupmember")cands=starts(Object.keys(S.lg));
    else if(/^(test-connection|test-netconnection)$/.test(l))cands=starts(["dc01","fs01","gw","old-nas","print01","mail.example.org","www.example.org"]);
    else cands=pathc()}
  else cands=pathc();
  if(!cands.length)return{line:line,list:[]};
  if(cands.length===1)return{line:before+pre+cands[0]+(/\\$/.test(cands[0])?"":suf),list:[]};
  var p=cands[0];cands.forEach(function(c){while(c.toLowerCase().indexOf(p.toLowerCase())!==0)p=p.slice(0,-1)});
  return{line:before+pre+(p.length>lw.length?p:word.slice(pre.length)),list:cands.slice(0,60)}}
function prompt(S){return"PS "+S.cwd+">"}
window.PSSIM={make:make,run:run,complete:complete,prompt:prompt,now:NOW,look:function(S,p){return look(S,abs(S,p))},treeSize:treeSize,cmdlets:function(){return ORDER.map(function(l){return{n:CMD[l].n,al:CMD[l].al,ex:CMD[l].ex}})}};
})();
