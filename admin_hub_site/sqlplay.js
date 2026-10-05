(function(){"use strict";
var L=window.SQL_LESSONS,DATA=window.SQL_DB,E=window.SQLE;if(!L||!DATA||!E)return;
var $=function(id){return document.getElementById(id)};
var box=$("sq-in"),out=$("sq-out"),chk=$("sq-check"),lessonEl=$("sq-lesson"),nav=$("sq-nav"),txEl=$("sq-tx");
var db=E.make(DATA),cur=0,done={},MAXROWS=200;
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
try{(JSON.parse(sessionStorage.getItem("ah_sql")||"[]")||[]).forEach(function(id){done[id]=1})}catch(e){}
function save(){try{sessionStorage.setItem("ah_sql",JSON.stringify(Object.keys(done)))}catch(e){}}
function grow(){var n=box.value.split("\n").length;box.rows=Math.max(5,Math.min(18,n+1))}
function setBox(s){box.value=s;grow()}

function renderNav(){var n=0;nav.innerHTML=L.map(function(l,i){if(done[l.id])n++;
  return'<li><button type="button" data-i="'+i+'"'+(i===cur?' aria-current="step"':'')+(done[l.id]?' class="isdone"':'')+'><span class="sqn">'+(i+1)+'</span><span>'+esc(l.t)+'</span>'+(done[l.id]?'<span class="sqok" aria-label="done">✓</span>':'')+'</button></li>'}).join("");
 $("sq-count").textContent=n+" of "+L.length+" done"}
function renderLesson(){var l=L[cur],h='<p class="sqstep">Lesson '+(cur+1)+' of '+L.length+'</p><h2 class="plain" id="sq-title" tabindex="-1">'+esc(l.t)+'</h2>';
 l.p.forEach(function(p){h+='<p>'+esc(p)+'</p>'});
 l.ex.forEach(function(x,i){h+='<div class="sqex"><pre>'+esc(x)+'</pre><button type="button" class="btn ghost" data-ex="'+i+'">Run this example</button></div>'});
 h+='<div class="sqtask"><b>Your turn</b><p>'+esc(l.task)+'</p>'+(l.note?'<p class="dim">'+esc(l.note)+'</p>':'')+'</div>';
 lessonEl.innerHTML=h;chk.innerHTML=done[l.id]?'<p class="sqgood">You solved this one already.</p>':"";chk.className="sqcheck";
 $("sq-prev").disabled=cur===0;$("sq-next").disabled=cur===L.length-1;
 renderNav();try{history.replaceState(null,"","#"+l.id)}catch(e){}}
function go(i,focus){cur=Math.max(0,Math.min(L.length-1,i));renderLesson();setBox("");out.innerHTML="";if(focus){var t=$("sq-title");t.focus({preventScroll:true});lessonEl.scrollIntoView({block:"start"})}}

function fmt(v){if(v===null||v===undefined)return'<i class="sqnull">NULL</i>';if(typeof v==="number")return v%1===0?String(v):String(Math.round(v*100)/100);return esc(v)}
function tableHtml(r){var n=r.rows.length,rows=r.rows.slice(0,MAXROWS),num=r.cols.map(function(_,i){return rows.length>0&&rows.every(function(x){return x[i]===null||typeof x[i]==="number"})});
 var h='<p class="sqmeta">'+n+(n===1?" row":" rows")+(n>MAXROWS?", the first "+MAXROWS+" shown":"")+'</p>';
 if(!n)return h+'<p class="dim">The query ran and found nothing. That is an answer too: check the WHERE if you expected rows.</p>';
 h+='<div class="sqscroll" tabindex="0" role="region" aria-label="Result"><table class="sqtbl"><thead><tr>'+r.cols.map(function(c,i){return'<th scope="col"'+(num[i]?' class="num"':'')+'>'+esc(c)+'</th>'}).join("")+'</tr></thead><tbody>';
 rows.forEach(function(x){h+='<tr>'+x.map(function(v,i){return'<td'+(num[i]?' class="num"':'')+'>'+fmt(v)+'</td>'}).join("")+'</tr>'});
 return h+'</tbody></table></div>'}
function resultHtml(r){
 if(r.type==="rows")return tableHtml(r);
 var h='<p class="sqmsg">'+esc(r.text)+'</p>';
 if(r.all&&r.n>0)h+='<p class="sqwarn">No WHERE: this hit every row of the table. '+(r.tx?'You are inside a transaction, so ROLLBACK takes it back.':'It was not inside a transaction, so there is no way back. On this page, "Reset the database" restores the tables. On a real server, that is the moment you need the backup.')+'</p>';
 else if((r.kind==="update"||r.kind==="delete")&&r.n===0)h+='<p class="dim">Nothing matched the WHERE.</p>';
 return h}
function errorHtml(e,sql){var h='<p class="sqerr"><b>That did not run.</b> '+esc(e.message)+'</p>';
 if(e.sql&&e.pos>=0&&e.pos<=sql.length){var a=sql.lastIndexOf("\n",e.pos-1)+1,b=sql.indexOf("\n",e.pos);if(b<0)b=sql.length;var line=sql.slice(a,b),col=e.pos-a;
  if(line.trim())h+='<pre class="sqwhere" aria-hidden="true">'+esc(line.replace(/\t/g," "))+"\n"+new Array(col+1).join(" ")+'^</pre>'}
 return h}
function norm(v){return typeof v==="number"?Math.round(v*1e6)/1e6:v}
function keyRows(rows,perm){return rows.map(function(r){return JSON.stringify((perm||r.map(function(_,i){return i})).map(function(i){return norm(r[i])}))})}
function perms(n){if(n===1)return[[0]];var o=[];perms(n-1).forEach(function(p){for(var i=0;i<=p.length;i++){var c=p.slice();c.splice(i,0,n-1);o.push(c)}});return o}
function same(a,b,ordered){if(a.length!==b.length)return false;if(!ordered){a=a.slice().sort();b=b.slice().sort()}for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}
function solved(l,text){done[l.id]=1;save();renderNav();var all=Object.keys(done).length>=L.length;
 chk.className="sqcheck isgood";chk.innerHTML='<p class="sqgood"><b>Correct.</b> '+esc(text)+'</p>'+(all?'<p>That was the last one: all '+L.length+' lessons are done. The ten questions below are for practice, and the <a href="sql-basics-cheat-sheet.html">SQL basics cheat sheet</a> has every pattern in one place.</p>':(cur<L.length-1?'<p><button type="button" class="btn" id="sq-go">Next lesson</button></p>':''))}
function notyet(t){chk.className="sqcheck isnot";chk.innerHTML='<p><b>Not yet.</b> '+esc(t)+'</p>'}
function check(res,text){var l=L[cur],t=text.replace(/\s+/g," ").trim().replace(/;$/,"");
 if(l.ex.some(function(x){return x.replace(/\s+/g," ").trim().replace(/;$/,"")===t})){chk.innerHTML="";chk.className="sqcheck";return}
 if(l.state){var got;try{got=E.run(db,l.state.q)[0].rows}catch(e){return}
  if(JSON.stringify(got)===JSON.stringify(l.state.want)){if(db.tx)return notyet("The change is there, but the transaction is still open. COMMIT makes it final.");return solved(l,"The devices have moved, and the change is committed.")}
  if(res.some(function(r){return r.kind==="update"||r.kind==="delete"||r.kind==="insert"}))notyet("The tables are not in the state the task asks for. Reset the database and try again: change only the devices of user 3.");
  else{chk.innerHTML="";chk.className="sqcheck"}return}
 var mine=null;res.forEach(function(r){if(r.type==="rows")mine=r});if(!mine){chk.innerHTML="";chk.className="sqcheck";return}
 var want;try{want=E.run(E.make(db.tables),l.sol);want=want[want.length-1]}catch(e){return}
 if(mine.cols.length!==want.cols.length)return notyet("The task asks for "+want.cols.length+(want.cols.length===1?" column":" columns")+", your result has "+mine.cols.length+".");
 if(mine.rows.length!==want.rows.length)return notyet("Your result has "+mine.rows.length+(mine.rows.length===1?" row":" rows")+", the task expects "+want.rows.length+".");
 var w=keyRows(want.rows),ok=false,orderOnly=false,ps=want.cols.length<=5?perms(want.cols.length):[null];
 ps.forEach(function(p){var m=keyRows(mine.rows,p);if(same(m,w,l.ordered))ok=true;else if(l.ordered&&same(m,w,false))orderOnly=true});
 if(ok)return solved(l,mine.rows.length+(mine.rows.length===1?" row":" rows")+", as expected.");
 notyet(orderOnly?"These are the right rows, in the wrong order.":"The number of rows fits, but the values differ. Compare the columns with what the task asks for.")}
function tx(){txEl.hidden=!db.tx}
function run(text,noCheck){var res,h="";
 try{res=E.run(db,text)}catch(e){(e.done||[]).forEach(function(r){h+=resultHtml(r)});out.innerHTML=h+errorHtml(e,text);tx();if(!e.sql&&window.console)console.error(e);return}
 res.forEach(function(r,i){if(res.length>1)h+='<p class="sqstmt">'+esc(r.sql.replace(/\s+/g," ").slice(0,90))+(r.sql.length>90?" ...":"")+'</p>';h+=resultHtml(r)});
 out.innerHTML=h;tx();if(!noCheck)check(res,text)}

$("sq-run").addEventListener("click",function(){run(box.value)});
box.addEventListener("keydown",function(e){if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();run(box.value)}});
box.addEventListener("input",grow);
$("sq-hint").addEventListener("click",function(){chk.className="sqcheck";chk.innerHTML='<p><b>Hint.</b> '+esc(L[cur].hint)+'</p>'});
$("sq-sol").addEventListener("click",function(){setBox(L[cur].sol);chk.className="sqcheck";chk.innerHTML='<p class="dim">One way to write it is in the box. Run it, then change something and see what happens.</p>';box.focus()});
$("sq-reset").addEventListener("click",function(){db=E.make(DATA);tx();out.innerHTML='<p class="sqmsg">The four tables are back in their original state.</p>'});
$("sq-prev").addEventListener("click",function(){go(cur-1,true)});
$("sq-next").addEventListener("click",function(){go(cur+1,true)});
nav.addEventListener("click",function(e){var b=e.target.closest("button[data-i]");if(b)go(+b.getAttribute("data-i"),true)});
lessonEl.addEventListener("click",function(e){var b=e.target.closest("button[data-ex]");if(!b)return;setBox(L[cur].ex[+b.getAttribute("data-ex")]);run(box.value);out.scrollIntoView({block:"nearest"})});
chk.addEventListener("click",function(e){if(e.target.id==="sq-go")go(cur+1,true)});

var sc=$("sq-schema");
sc.innerHTML=window.SQL_SCHEMA.map(function(t){return'<div class="sqt"><button type="button" data-t="'+t[0]+'" title="Show five rows">'+t[0]+'</button><p>'+esc(t[1])+'</p><ul>'+t[2].map(function(c){return'<li><code>'+c[0]+'</code> <span>'+esc(c[1])+(c[2]?", "+esc(c[2]):"")+'</span></li>'}).join("")+'</ul></div>'}).join("");
sc.addEventListener("click",function(e){var b=e.target.closest("button[data-t]");if(!b)return;var q="SELECT * FROM "+b.getAttribute("data-t")+" LIMIT 5;";try{var r=E.run(db,q);out.innerHTML='<p class="sqstmt">'+q+'</p>'+resultHtml(r[0])}catch(x){}out.scrollIntoView({block:"nearest"})});
var ex=$("sq-extra");
ex.innerHTML=window.SQL_EXTRA.map(function(x,i){return'<details class="sqx"><summary>'+esc(x[0])+'</summary><pre>'+esc(x[1])+'</pre><p><button type="button" class="btn ghost" data-x="'+i+'">Put it in the box and run it</button></p></details>'}).join("");
ex.addEventListener("click",function(e){var b=e.target.closest("button[data-x]");if(!b)return;setBox(window.SQL_EXTRA[+b.getAttribute("data-x")][1]);run(box.value,true);chk.innerHTML="";box.scrollIntoView({block:"center"})});

var h=location.hash.slice(1),start=-1;L.forEach(function(l,i){if(l.id===h)start=i});
if(start<0){start=0;for(var i=0;i<L.length;i++)if(!done[L[i].id]){start=i;break}}
cur=start;renderLesson();grow();tx();
})();
