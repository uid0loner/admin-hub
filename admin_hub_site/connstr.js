(function(){
"use strict";
var $=function(i){return document.getElementById(i)};if(!$("cs-out"))return;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
var PORT={pg:5432,mysql:3306,mssql:1433,mongo:27017,redis:6379,sqlite:""};
function enc(s){return encodeURIComponent(s).replace(/[!'()*]/g,function(c){return "%"+c.charCodeAt(0).toString(16).toUpperCase()})}
function q(s){return /[;=\s{}'"]/.test(s)?"'"+s.replace(/'/g,"''")+"'":s}
function build(){var e=$("cs-eng").value,h=$("cs-host").value.trim()||"db.example.internal",p=$("cs-port").value.trim()||PORT[e],d=$("cs-db").value.trim()||(e==="redis"?"0":"mydb"),u=$("cs-user").value.trim()||(e==="redis"?"":"app"),pw=$("cs-pw").value||"PASSWORD",tls=$("cs-tls").value,o=[],U=enc(u),P=enc(pw),D=enc(d);
  var need=tls!=="off",strict=tls==="verify";
  if(e==="pg"){var sm=strict?"verify-full":need?"require":"disable";
    o.push(["URL (most frameworks, DATABASE_URL)","postgresql://"+U+":"+P+"@"+h+":"+p+"/"+D+"?sslmode="+sm]);
    o.push(["Keyword form (libpq, psycopg, pg_dump)","host="+h+" port="+p+" dbname="+q(d)+" user="+q(u)+" password="+q(pw)+" sslmode="+sm]);
    o.push([".NET (Npgsql)","Host="+h+";Port="+p+";Database="+d+";Username="+u+";Password="+pw+";SSL Mode="+(strict?"VerifyFull":need?"Require":"Disable")]);
    o.push(["JDBC","jdbc:postgresql://"+h+":"+p+"/"+D+"?sslmode="+sm]);
    o.push(["Python (SQLAlchemy)","postgresql+psycopg://"+U+":"+P+"@"+h+":"+p+"/"+D+"?sslmode="+sm]);
    o.push(["Command line","psql \"host="+h+" port="+p+" dbname="+d+" user="+u+" sslmode="+sm+"\""]);
    o.push(["Environment variables","PGHOST="+h+"\nPGPORT="+p+"\nPGDATABASE="+d+"\nPGUSER="+u+"\nPGSSLMODE="+sm+"\n# password: PGPASSWORD, or better a ~/.pgpass file"])}
  if(e==="mysql"){
    o.push(["URL (most frameworks)","mysql://"+U+":"+P+"@"+h+":"+p+"/"+D+(need?"?ssl-mode="+(strict?"VERIFY_IDENTITY":"REQUIRED"):"")]);
    o.push([".NET (MySqlConnector)","Server="+h+";Port="+p+";Database="+d+";User ID="+u+";Password="+pw+";SslMode="+(strict?"VerifyFull":need?"Required":"None")]);
    o.push(["JDBC","jdbc:mysql://"+h+":"+p+"/"+D+"?sslMode="+(strict?"VERIFY_IDENTITY":need?"REQUIRED":"DISABLED")]);
    o.push(["Python (SQLAlchemy)","mysql+pymysql://"+U+":"+P+"@"+h+":"+p+"/"+D+"?charset=utf8mb4"]);
    o.push(["Command line","mysql -h "+h+" -P "+p+" -u "+u+" -p "+(need?"--ssl-mode="+(strict?"VERIFY_IDENTITY":"REQUIRED")+" ":"")+d]);
    o.push(["PHP (PDO)","mysql:host="+h+";port="+p+";dbname="+d+";charset=utf8mb4"])}
  if(e==="mssql"){var win=$("cs-win").checked,inst=$("cs-inst").value.trim(),srv=inst?h+"\\"+inst:"tcp:"+h+","+p,auth=win?"Integrated Security=True":"User ID="+u+";Password="+pw;
    o.push([".NET (Microsoft.Data.SqlClient)","Server="+srv+";Database="+d+";"+auth+";Encrypt="+(need?"True":"False")+";TrustServerCertificate="+(strict||!need?"False":"True")+";"]);
    o.push(["ODBC","Driver={ODBC Driver 18 for SQL Server};Server="+srv+";Database="+d+";"+(win?"Trusted_Connection=yes":"Uid="+u+";Pwd="+pw)+";Encrypt="+(need?"yes":"no")+";TrustServerCertificate="+(strict||!need?"no":"yes")+";"]);
    o.push(["JDBC","jdbc:sqlserver://"+h+(inst?"\\"+inst:":"+p)+";databaseName="+d+";encrypt="+(need?"true":"false")+";trustServerCertificate="+(strict||!need?"false":"true")+(win?";integratedSecurity=true":"")]);
    o.push(["Python (SQLAlchemy with pyodbc)","mssql+pyodbc://"+(win?"":U+":"+P+"@")+h+(inst?"\\"+inst:":"+p)+"/"+D+"?driver=ODBC+Driver+18+for+SQL+Server"+(need?"&Encrypt=yes":"&Encrypt=no")+(strict||!need?"":"&TrustServerCertificate=yes")+(win?"&Trusted_Connection=yes":"")]);
    o.push(["Command line","sqlcmd -S "+(inst?h+"\\"+inst:h+","+p)+" -d "+d+(win?" -E":" -U "+u)+(need&&!strict?" -C":"")]);
    o.push(["PowerShell","Invoke-Sqlcmd -ServerInstance \""+(inst?h+"\\"+inst:h+","+p)+"\" -Database \""+d+"\""+(need&&!strict?" -TrustServerCertificate":"")+" -Query \"SELECT @@VERSION\""])}
  if(e==="sqlite"){var f=$("cs-db").value.trim()||"/srv/app/data.db";
    o.push(["URL (SQLAlchemy, many frameworks)","sqlite:///"+f]);o.push([".NET (Microsoft.Data.Sqlite)","Data Source="+f]);o.push(["JDBC","jdbc:sqlite:"+f]);o.push(["Command line","sqlite3 "+q(f)])}
  if(e==="mongo"){o.push(["URL","mongodb://"+U+":"+P+"@"+h+":"+p+"/"+D+"?authSource=admin"+(need?"&tls=true":"")]);
    o.push(["URL for a hosted cluster (DNS seed list)","mongodb+srv://"+U+":"+P+"@"+h+"/"+D+"?retryWrites=true&w=majority"]);
    o.push(["Command line","mongosh \"mongodb://"+h+":"+p+"/"+D+"\" --username "+u+" --authenticationDatabase admin"+(need?" --tls":"")])}
  if(e==="redis"){o.push(["URL",(need?"rediss":"redis")+"://"+(u?U:"")+":"+P+"@"+h+":"+p+"/"+D]);
    o.push(["Command line","REDISCLI_AUTH='"+pw.replace(/'/g,"'\\''")+"' redis-cli -h "+h+" -p "+p+(u?" --user "+u:"")+(need?" --tls":"")+" -n "+d]);
    o.push([".NET (StackExchange.Redis)",h+":"+p+",password="+pw+(u?",user="+u:"")+",ssl="+(need?"True":"False")+",defaultDatabase="+d])}
  return{o:o,e:e,pw:pw,tls:tls,encChanged:P!==pw||U!==u}}
function render(){var e=$("cs-eng").value;document.querySelectorAll("[data-only]").forEach(function(x){x.hidden=x.getAttribute("data-only").split(" ").indexOf(e)<0});
  $("cs-dbl").firstChild.nodeValue=e==="sqlite"?"Path of the database file":e==="redis"?"Database number":"Database";
  var B=build(),out=$("cs-out");out.replaceChildren();
  B.o.forEach(function(x){var w=el("div","csrow"),hd=el("div","cshd");hd.append(el("b",null,x[0]));var b=el("button","btn ghost","Copy");b.type="button";b.addEventListener("click",function(){(navigator.clipboard?navigator.clipboard.writeText(x[1]):Promise.reject()).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy"},1400)},function(){b.textContent="Select and copy by hand"})});hd.append(b);w.append(hd,el("pre",null,x[1]));out.append(w)});
  var notes=$("cs-notes");notes.replaceChildren();
  function note(t){notes.append(el("li",null,t))}
  if(B.pw==="PASSWORD")note("PASSWORD is a placeholder. Put the real one in at the place where the string is used, not into this page: an environment variable, a secret store, a file only the service can read.");
  else note("You typed a real password. It stays in this browser tab and is gone when you close it. Do not paste the result into a ticket, a chat or a Git repository.");
  if(B.encChanged&&e!=="sqlite")note("The user name or password contains characters that have a meaning in a URL (such as @ : / # ?). In the URL forms they are percent-encoded, which is why they look different there. The other forms take them as they are.");
  if(e!=="sqlite"&&B.tls==="off")note("Without encryption the password and all data cross the network in clear text. Acceptable on the same machine, hardly anywhere else.");
  if(e!=="sqlite"&&B.tls==="on")note("\"Encrypted\" protects against listening, not against a server that pretends to be yours. \"Encrypted and verified\" also checks the server's certificate, and needs the server to have one your client trusts.");
  if(e==="mssql")note("ODBC Driver 18 and current .NET clients encrypt by default and refuse a self-signed server certificate. That is the usual reason an old connection string stops working after a driver update: either give the server a proper certificate, or add TrustServerCertificate as a stopgap.");
  if(e==="pg")note("If it connects from the server itself and not from another machine, the answer is in pg_hba.conf and listen_addresses, not in this string.");
  if(e==="mysql")note("MySQL users are a name plus the host they come from. 'app'@'localhost' and 'app'@'%' are two different accounts.");
  if(e==="sqlite")note("Three slashes before a relative path, four before an absolute one on Linux: sqlite:////srv/app/data.db. The folder must be writable too, since SQLite creates files next to the database.");
  try{history.replaceState(null,"","#"+e)}catch(x){}}
var h=location.hash.slice(1);if(PORT[h]!==undefined)$("cs-eng").value=h;
$("cs-eng").addEventListener("change",function(){$("cs-port").value=PORT[$("cs-eng").value];render()});
["cs-host","cs-port","cs-db","cs-user","cs-pw","cs-tls","cs-win","cs-inst"].forEach(function(i){$(i).addEventListener("input",render);$(i).addEventListener("change",render)});
$("cs-port").value=PORT[$("cs-eng").value];render();
})();
