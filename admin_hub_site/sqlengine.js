/* A small SQL engine for the playground page. It covers what the lessons teach:
   SELECT with joins, grouping, ordering, subqueries in FROM and IN, WITH,
   window functions (OVER), and INSERT, UPDATE, DELETE inside transactions.
   It is not a database. */
(function(){"use strict";
var KW={};"SELECT DISTINCT FROM WHERE GROUP BY HAVING ORDER LIMIT OFFSET AS JOIN INNER LEFT RIGHT FULL OUTER CROSS ON AND OR NOT IS NULL IN LIKE BETWEEN CASE WHEN THEN ELSE END ASC DESC TRUE FALSE WITH INSERT INTO VALUES UPDATE SET DELETE BEGIN COMMIT ROLLBACK TRANSACTION START UNION EXISTS OVER CREATE DROP ALTER TRUNCATE".split(" ").forEach(function(k){KW[k]=1});
var AGG={COUNT:1,SUM:1,AVG:1,MIN:1,MAX:1,GROUP_CONCAT:1,STRING_AGG:1};
var WIN={ROW_NUMBER:[0,0,"ROW_NUMBER()"],RANK:[0,0,"RANK()"],DENSE_RANK:[0,0,"DENSE_RANK()"],NTILE:[1,1,"NTILE(4)"],LAG:[1,3,"LAG(column), LAG(column, 2) or LAG(column, 2, 0)"],LEAD:[1,3,"LEAD(column), LEAD(column, 2) or LEAD(column, 2, 0)"],FIRST_VALUE:[1,1,"FIRST_VALUE(column)"],LAST_VALUE:[1,1,"LAST_VALUE(column)"],SUM:[1,1,"SUM(column)"],AVG:[1,1,"AVG(column)"],COUNT:[0,1,"COUNT(*) or COUNT(column)"],MIN:[1,1,"MIN(column)"],MAX:[1,1,"MAX(column)"]};
var WINLIST="ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD, FIRST_VALUE, LAST_VALUE, SUM, AVG, COUNT, MIN, MAX";
function E(msg,pos){var e=new Error(msg);e.sql=true;e.pos=pos==null?-1:pos;return e}

function lex(s){var t=[],i=0,n=s.length,j,v,c,m;
 while(i<n){c=s[i];
  if(/\s/.test(c)){i++;continue}
  if(c==="-"&&s[i+1]==="-"){while(i<n&&s[i]!=="\n")i++;continue}
  if(c==="/"&&s[i+1]==="*"){j=s.indexOf("*/",i+2);i=j<0?n:j+2;continue}
  if(c==="'"){j=i+1;v="";for(;;){if(j>=n)throw E("A text value starts with ' and never ends.",i);if(s[j]==="'"){if(s[j+1]==="'"){v+="'";j+=2;continue}break}v+=s[j++]}t.push({k:"str",v:v,p:i,e:j+1});i=j+1;continue}
  if(c==='"'||c==="`"||c==="["){var cl=c==="["?"]":c;j=s.indexOf(cl,i+1);if(j<0)throw E("A quoted name starts with "+c+" and never ends.",i);t.push({k:"id",v:s.slice(i+1,j),p:i,e:j+1,q:c});i=j+1;continue}
  m=/^(\d+\.?\d*|\.\d+)/.exec(s.slice(i,i+40));
  if(m){t.push({k:"num",v:parseFloat(m[0]),fl:m[0].indexOf(".")>=0,p:i,e:i+m[0].length});i+=m[0].length;continue}
  m=/^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i,i+80));
  if(m){v=m[0];if(KW[v.toUpperCase()])t.push({k:"kw",v:v.toUpperCase(),p:i,e:i+v.length});else t.push({k:"id",v:v,p:i,e:i+v.length});i+=v.length;continue}
  v=s.substr(i,2);
  if(v==="<="||v===">="||v==="<>"||v==="!="||v==="||"||v==="=="){t.push({k:"op",v:v==="=="?"=":v==="!="?"<>":v,p:i,e:i+2});i+=2;continue}
  if("=<>+-*/%(),.;".indexOf(c)>=0){t.push({k:"op",v:c,p:i,e:i+1});i++;continue}
  throw E("Unexpected character "+c,i)}
 return t}

function Parser(src){this.s=src;this.t=lex(src);this.i=0}
Parser.prototype={
 pk:function(o){return this.t[this.i+(o||0)]},
 end:function(){return this.i>=this.t.length},
 pos:function(){var x=this.pk();return x?x.p:this.s.length},
 isKw:function(k,o){var x=this.pk(o);return !!x&&x.k==="kw"&&x.v===k},
 isOp:function(k,o){var x=this.pk(o);return !!x&&x.k==="op"&&x.v===k},
 isW:function(w,o){var x=this.pk(o);return !!x&&x.k==="id"&&!x.q&&x.v.toUpperCase()===w},
 eatW:function(w){if(this.isW(w)){this.i++;return true}return false},
 eatKw:function(k){if(this.isKw(k)){this.i++;return true}return false},
 eatOp:function(k){if(this.isOp(k)){this.i++;return true}return false},
 say:function(x){return x?(x.k==="str"?"'"+x.v+"'":String(x.v)):"the end of the query"},
 needKw:function(k){if(!this.eatKw(k))throw E("Expected "+k+" here, found "+this.say(this.pk())+".",this.pos())},
 needOp:function(k){if(!this.eatOp(k))throw E("Expected "+k+" here, found "+this.say(this.pk())+".",this.pos())},
 name:function(what){var x=this.pk();if(!x||x.k!=="id")throw E("Expected "+what+" here, found "+this.say(x)+".",this.pos());this.i++;return x.v},
 statements:function(){var out=[];while(!this.end()){if(this.eatOp(";"))continue;var a=this.pos();var st=this.statement();st.src=this.s.slice(a,this.end()?this.s.length:this.pos()).trim();out.push(st);if(!this.end()&&!this.isOp(";"))throw E("Did not expect "+this.say(this.pk())+" here.",this.pos())}return out},
 statement:function(){var x=this.pk();
  if(x.k==="kw"){
   if(x.v==="SELECT"||x.v==="WITH")return this.select();
   if(x.v==="INSERT")return this.insert();
   if(x.v==="UPDATE")return this.update();
   if(x.v==="DELETE")return this.del();
   if(x.v==="BEGIN"||x.v==="START"){this.i++;this.eatKw("TRANSACTION");return{t:"begin"}}
   if(x.v==="COMMIT"){this.i++;this.eatKw("TRANSACTION");return{t:"commit"}}
   if(x.v==="ROLLBACK"){this.i++;this.eatKw("TRANSACTION");return{t:"rollback"}}
   if(x.v==="CREATE"||x.v==="DROP"||x.v==="ALTER"||x.v==="TRUNCATE")throw E("This practice database has four fixed tables: "+x.v+" is switched off.",x.p)}
  throw E("A statement starts with SELECT, WITH, INSERT, UPDATE, DELETE, BEGIN, COMMIT or ROLLBACK. Found "+this.say(x)+".",x.p)},
 select:function(){var q={t:"select",ctes:[],items:[],from:[],group:[],order:[],distinct:false,where:null,having:null,limit:null,offset:null},x;
  if(this.eatKw("WITH")){do{var n=this.name("a name for the query");this.needKw("AS");this.needOp("(");var sq=this.select();this.needOp(")");q.ctes.push({name:n,q:sq})}while(this.eatOp(","))}
  this.needKw("SELECT");
  x=this.pk();if(x&&x.k==="id"&&x.v.toUpperCase()==="TOP")throw E("TOP is how SQL Server limits rows. Here, put LIMIT 10 at the end of the query.",x.p);
  if(this.eatKw("DISTINCT"))q.distinct=true;
  do{q.items.push(this.item())}while(this.eatOp(","));
  if(this.eatKw("FROM")){
   q.from.push(this.tref("first"));
   for(;;){
    if(this.eatOp(",")){q.from.push(this.tref("cross"));continue}
    var kind=null,p=this.pos();
    if(this.isKw("RIGHT")||this.isKw("FULL"))throw E(this.pk().v+" JOIN is not part of this small engine. Swap the two tables and use LEFT JOIN.",p);
    if(this.eatKw("INNER"))kind="inner";else if(this.eatKw("LEFT")){this.eatKw("OUTER");kind="left"}else if(this.eatKw("CROSS"))kind="cross";
    if(this.eatKw("JOIN")){var r=this.tref(kind||"inner");if(r.join!=="cross"){if(!this.eatKw("ON"))throw E("A JOIN needs ON and the condition that connects the two tables, for example ON d.id = u.department_id.",this.pos());r.on=this.expr()}q.from.push(r);continue}
    if(kind)throw E("Expected JOIN here.",this.pos());
    break}}
  if(this.eatKw("WHERE"))q.where=this.expr();
  if(this.eatKw("GROUP")){this.needKw("BY");do{q.group.push(this.expr())}while(this.eatOp(","))}
  if(this.eatKw("HAVING"))q.having=this.expr();
  if(this.isKw("UNION"))throw E("UNION is not part of this small engine.",this.pos());
  if(this.eatKw("ORDER")){this.needKw("BY");do{var e=this.expr(),d=false;if(this.eatKw("DESC"))d=true;else this.eatKw("ASC");q.order.push({e:e,desc:d})}while(this.eatOp(","))}
  if(this.eatKw("LIMIT")){q.limit=this.int("a number after LIMIT");if(this.eatKw("OFFSET"))q.offset=this.int("a number after OFFSET");else if(this.eatOp(",")){q.offset=q.limit;q.limit=this.int("a number")}}
  if(this.isKw("WHERE")||this.isKw("GROUP")||this.isKw("HAVING")||this.isKw("ORDER")||this.isKw("FROM")||this.isKw("JOIN")||this.isKw("LEFT")||this.isKw("INNER"))throw E(this.pk().v+" is in the wrong place. The order is: SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.",this.pos());
  return q},
 int:function(what){var x=this.pk();if(!x||x.k!=="num"||x.v%1!==0)throw E("Expected "+what+".",this.pos());this.i++;return x.v},
 item:function(){var x=this.pk();
  if(this.isOp("*")){this.i++;return{star:true,tb:null,p:x.p}}
  if(x&&x.k==="id"&&this.isOp(".",1)&&this.isOp("*",2)){this.i+=3;return{star:true,tb:x.v,p:x.p}}
  var e=this.expr(),a=null;
  if(this.eatKw("AS")){x=this.pk();if(x&&(x.k==="id"||x.k==="str")){a=x.v;this.i++}else throw E("Expected a name after AS.",this.pos())}
  else{x=this.pk();if(x&&x.k==="id"){a=x.v;this.i++}}
  return{e:e,alias:a}},
 tref:function(join){var r={join:join,on:null,p:this.pos()},x;
  if(this.eatOp("(")){r.sub=this.select();this.needOp(")")}else r.name=this.name("a table name");
  if(this.eatKw("AS"))r.alias=this.name("a short name for the table");
  else{x=this.pk();if(x&&x.k==="id"){r.alias=x.v;this.i++}}
  if(r.sub&&!r.alias)throw E("A query inside FROM needs a name after the closing bracket, for example ) t.",this.pos());
  if(!r.alias)r.alias=r.name;return r},
 expr:function(){var a=this.and(),p;while(this.isKw("OR")){p=this.pos();this.i++;a=N("bin",a.s,{op:"OR",a:a,b:this.and()},this)}return a},
 and:function(){var a=this.not();while(this.eatKw("AND"))a=N("bin",a.s,{op:"AND",a:a,b:this.not()},this);return a},
 not:function(){var p=this.pos();if(this.eatKw("NOT"))return N("un",p,{op:"NOT",a:this.not()},this);return this.cmp()},
 cmp:function(){var a=this.add(),x=this.pk(),not=false,b;
  if(x&&x.k==="op"&&/^(=|<>|<|>|<=|>=)$/.test(x.v)){this.i++;
   if(this.isKw("NULL"))throw E("Nothing equals NULL, not even NULL. Write IS NULL or IS NOT NULL.",x.p);
   return N("bin",a.s,{op:x.v,a:a,b:this.add()},this)}
  if(this.eatKw("IS")){not=this.eatKw("NOT");this.needKw("NULL");return N("isnull",a.s,{a:a,not:not},this)}
  if(this.isKw("NOT")&&(this.isKw("IN",1)||this.isKw("LIKE",1)||this.isKw("BETWEEN",1))){this.i++;not=true}
  if(this.eatKw("IN")){this.needOp("(");var n;
   if(this.isKw("SELECT")||this.isKw("WITH")){n={a:a,not:not,sub:this.select()}}
   else{var l=[];do{l.push(this.expr())}while(this.eatOp(","));n={a:a,not:not,list:l}}
   this.needOp(")");return N("in",a.s,n,this)}
  if(this.eatKw("LIKE")){b=this.add();return N("like",a.s,{a:a,b:b,not:not},this)}
  if(this.eatKw("BETWEEN")){var lo=this.add();this.needKw("AND");var hi=this.add();return N("between",a.s,{a:a,lo:lo,hi:hi,not:not},this)}
  return a},
 add:function(){var a=this.mul(),x;for(;;){x=this.pk();if(x&&x.k==="op"&&(x.v==="+"||x.v==="-"||x.v==="||")){this.i++;a=N("bin",a.s,{op:x.v,a:a,b:this.mul()},this)}else return a}},
 mul:function(){var a=this.unary(),x;for(;;){x=this.pk();if(x&&x.k==="op"&&(x.v==="*"||x.v==="/"||x.v==="%")){this.i++;a=N("bin",a.s,{op:x.v,a:a,b:this.unary()},this)}else return a}},
 unary:function(){var p=this.pos();if(this.eatOp("-"))return N("un",p,{op:"-",a:this.unary()},this);if(this.eatOp("+"))return this.unary();return this.primary()},
 primary:function(){var x=this.pk(),p=this.pos(),n;
  if(!x)throw E("The query ends too early.",this.s.length);
  if(x.k==="num"){this.i++;return N("num",p,{v:x.v,fl:x.fl},this)}
  if(x.k==="str"){this.i++;return N("str",p,{v:x.v},this)}
  if(x.k==="kw"){
   if(x.v==="NULL"){this.i++;return N("null",p,{},this)}
   if(x.v==="TRUE"||x.v==="FALSE"){this.i++;return N("num",p,{v:x.v==="TRUE"?1:0},this)}
   if(x.v==="CASE"){this.i++;n={base:null,whens:[],els:null};if(!this.isKw("WHEN"))n.base=this.expr();
    while(this.eatKw("WHEN")){var c=this.expr();this.needKw("THEN");n.whens.push([c,this.expr()])}
    if(!n.whens.length)throw E("CASE needs at least one WHEN ... THEN ...",this.pos());
    if(this.eatKw("ELSE"))n.els=this.expr();
    if(!this.eatKw("END"))throw E("CASE must be closed with END.",this.pos());return N("case",p,n,this)}
   if(x.v==="EXISTS")throw E("EXISTS is not part of this small engine. Use IN (SELECT ...) or a JOIN.",p);
   if(x.v==="SELECT")throw E("A query inside a query goes in brackets: (SELECT ...).",p);
   if(x.v==="LEFT"&&this.isOp("(",1)){this.i+=2;var la=[];do{la.push(this.expr())}while(this.eatOp(","));this.needOp(")");return N("fn",p,{name:"LEFT",args:la},this)}
   throw E("Did not expect "+x.v+" here.",p)}
  if(x.k==="op"&&x.v==="("){this.i++;
   if(this.isKw("SELECT")||this.isKw("WITH")){n=N("sub",p,{q:this.select()},this);this.needOp(")");n.e=this.t[this.i-1].e;return n}
   n=this.expr();this.needOp(")");return n}
  if(x.k==="id"){
   if(this.isOp("(",1)&&!x.q){this.i+=2;n={name:x.v.toUpperCase(),args:[],star:false,distinct:false};
    if(this.eatOp("*"))n.star=true;
    else if(!this.isOp(")")){if(this.eatKw("DISTINCT"))n.distinct=true;do{n.args.push(this.expr())}while(this.eatOp(","))}
    this.needOp(")");
    if(this.isW("FILTER"))throw E("FILTER is not part of this small engine. Put a CASE inside the function: SUM(CASE WHEN ... THEN 1 ELSE 0 END).",this.pos());
    if(this.isKw("OVER"))n.over=this.over();
    return N("fn",p,n,this)}
   this.i++;
   if(this.isOp(".")&&this.pk(1)&&this.pk(1).k==="id"){var c2=this.pk(1);this.i+=2;return N("col",p,{tb:x.v,name:c2.v},this)}
   return N("col",p,{tb:null,name:x.v,q:x.q||null},this)}
  throw E("Did not expect "+this.say(x)+" here.",p)},
 over:function(){var o={part:[],order:[],frame:null},e,d;this.i++;
  if(!this.eatOp("("))throw E("OVER needs brackets after it: OVER (PARTITION BY ... ORDER BY ...). Empty brackets, OVER (), mean all rows.",this.pos());
  if(this.eatW("PARTITION")){this.needKw("BY");do{o.part.push(this.expr())}while(this.eatOp(","))}
  if(this.eatKw("ORDER")){this.needKw("BY");do{e=this.expr();d=false;if(this.eatKw("DESC"))d=true;else this.eatKw("ASC");o.order.push({e:e,desc:d})}while(this.eatOp(","))}
  if(this.isW("PARTITION"))throw E("Inside OVER (...), PARTITION BY comes first and ORDER BY second.",this.pos());
  if(this.isW("ROWS")||this.isW("RANGE")||this.isW("GROUPS"))o.frame=this.frame();
  if(!this.eatOp(")"))throw E("Expected ) to close OVER (...) here, found "+this.say(this.pk())+". Inside the brackets go PARTITION BY, then ORDER BY, then ROWS BETWEEN ... AND ...",this.pos());
  return o},
 frame:function(){var f={n:null,all:false},x,bad=E("This frame is not part of this small engine. Three forms work: ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, ROWS BETWEEN 2 PRECEDING AND CURRENT ROW (with any whole number), and ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING.",this.pos());
  if(!this.eatW("ROWS")||!this.eatKw("BETWEEN"))throw bad;
  x=this.pk();
  if(!this.eatW("UNBOUNDED")){if(x&&x.k==="num"&&x.v%1===0&&!x.fl){f.n=x.v;this.i++}else throw bad}
  if(!this.eatW("PRECEDING")||!this.eatKw("AND"))throw bad;
  if(this.eatW("CURRENT")){if(!this.eatW("ROW"))throw bad}
  else if(f.n===null&&this.eatW("UNBOUNDED")&&this.eatW("FOLLOWING"))f.all=true;
  else throw bad;
  if(!this.isOp(")"))throw bad;
  return f},
 insert:function(){this.i++;this.needKw("INTO");var st={t:"insert",table:this.name("a table name"),p:this.pos(),cols:null,rows:[]};
  if(this.eatOp("(")){st.cols=[];do{st.cols.push(this.name("a column name"))}while(this.eatOp(","));this.needOp(")")}
  if(this.isKw("SELECT"))throw E("INSERT ... SELECT is not part of this small engine. Use VALUES.",this.pos());
  this.needKw("VALUES");
  do{this.needOp("(");var r=[];do{r.push(this.expr())}while(this.eatOp(","));this.needOp(")");st.rows.push(r)}while(this.eatOp(","));
  return st},
 update:function(){this.i++;var st={t:"update",p:this.pos(),table:this.name("a table name"),set:[],where:null};
  this.needKw("SET");do{var c=this.name("a column name");this.needOp("=");st.set.push([c,this.expr()])}while(this.eatOp(","));
  if(this.eatKw("WHERE"))st.where=this.expr();return st},
 del:function(){this.i++;this.needKw("FROM");var st={t:"delete",p:this.pos(),table:this.name("a table name"),where:null};
  if(this.eatKw("WHERE"))st.where=this.expr();return st}
};
function N(t,s,o,P){o.t=t;o.s=s;o.e=P.i>0?P.t[P.i-1].e:s;return o}

function kids(x){switch(x.t){
 case"bin":return[x.a,x.b];case"un":case"isnull":return[x.a];
 case"in":return x.list?[x.a].concat(x.list):[x.a];
 case"like":return[x.a,x.b];case"between":return[x.a,x.lo,x.hi];
 case"case":var k=x.base?[x.base]:[];x.whens.forEach(function(w){k.push(w[0],w[1])});if(x.els)k.push(x.els);return k;
 case"fn":return x.over?x.args.concat(x.over.part,x.over.order.map(function(o){return o.e})):x.args;case"ref":return[x.to];default:return[]}}
function isAggFn(x){return x.t==="fn"&&!x.over&&AGG[x.name]&&!((x.name==="MIN"||x.name==="MAX")&&x.args.length>1)}
function hasWin(x){if(x.t==="fn"&&x.over)return true;return kids(x).some(hasWin)}
function noWin(x,where){if(hasWin(x))throw E("A window function cannot be used in "+where+". "+(where==="a JOIN condition"?"Work it out in a subquery (FROM (...) x) first, and join that.":"Window functions run after "+where+". Put the query in a subquery (FROM (...) x) and "+(where==="GROUP BY"?"group":"filter")+" outside."),winPos(x))}
function winPos(x){if(x.t==="fn"&&x.over)return x.s;var k=kids(x),i,p;for(i=0;i<k.length;i++){p=winPos(k[i]);if(p>=0)return p}return -1}
function hasAgg(x){if(isAggFn(x))return true;return kids(x).some(hasAgg)}
function key(x){switch(x.t){
 case"num":return"n"+x.v;case"str":return"s"+JSON.stringify(x.v);case"null":return"null";
 case"col":return"c"+x.ti+"."+x.ci;case"ref":return key(x.to);case"sub":return"q"+x.s;
 default:return x.t+(x.op||x.name||"")+(x.not?"!":"")+(x.distinct?"d":"")+(x.star?"*":"")+(x.over?"w"+JSON.stringify([x.args.length,x.over.part.length,x.over.order.map(function(o){return o.desc}),x.over.frame]):"")+"("+kids(x).map(key).join(",")+")"}}

function isFl(x){if(x.t==="num")return !!x.fl;if(x.t==="fn")return x.name==="AVG"||x.name==="ROUND"||((x.name==="COALESCE"||x.name==="SUM"||x.name==="MIN"||x.name==="MAX"||x.name==="ABS"||(x.over&&(x.name==="LAG"||x.name==="LEAD"||x.name==="FIRST_VALUE"||x.name==="LAST_VALUE")))&&x.args.some(isFl));if(x.t==="bin")return "+-*/".indexOf(x.op)>=0&&(isFl(x.a)||isFl(x.b));if(x.t==="un")return x.op==="-"&&isFl(x.a);if(x.t==="ref")return isFl(x.to);if(x.t==="case")return x.whens.some(function(w){return isFl(w[1])})||(!!x.els&&isFl(x.els));return false}
function truth(v){if(v===null)return null;if(typeof v==="number")return v!==0;var n=Number(v);return !isNaN(n)&&n!==0}
function numlike(s){return typeof s==="string"&&s.trim()!==""&&!isNaN(Number(s))}
function cmp(a,b){var ta=typeof a,tb=typeof b;
 if(ta!==tb){if(ta==="number"){if(numlike(b))b=Number(b);else return -1}else{if(numlike(a))a=Number(a);else return 1}}
 return a<b?-1:a>b?1:0}
function num(v){if(v===null)return null;if(typeof v==="number")return v;var n=parseFloat(v);return isNaN(n)?0:n}
function str(v){return v===null?null:String(v)}
function likeRe(p){return new RegExp("^"+String(p).replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&").replace(/%/g,"[\\s\\S]*").replace(/_/g,"[\\s\\S]")+"$","i")}
function b3(v){return v===null?null:(v?1:0)}
var SCALAR={
 COALESCE:function(a){for(var i=0;i<a.length;i++)if(a[i]!==null)return a[i];return null},
 IFNULL:function(a){return a[0]!==null?a[0]:a[1]},ISNULL:function(a){return a[0]!==null?a[0]:a[1]},
 NULLIF:function(a){return a[0]!==null&&a[1]!==null&&cmp(a[0],a[1])===0?null:a[0]},
 UPPER:function(a){return a[0]===null?null:String(a[0]).toUpperCase()},
 LOWER:function(a){return a[0]===null?null:String(a[0]).toLowerCase()},
 LENGTH:function(a){return a[0]===null?null:String(a[0]).length},LEN:function(a){return a[0]===null?null:String(a[0]).length},
 TRIM:function(a){return a[0]===null?null:String(a[0]).trim()},
 ABS:function(a){return a[0]===null?null:Math.abs(num(a[0]))},
 ROUND:function(a){if(a[0]===null)return null;var d=a.length>1&&a[1]!==null?num(a[1]):0,f=Math.pow(10,d),v=num(a[0]);return (v<0?-1:1)*Math.round(Math.abs(v)*f+1e-9)/f},
 SUBSTR:function(a){if(a[0]===null||a[1]==null)return null;var s=String(a[0]),st=num(a[1]),ln=a.length>2&&a[2]!==null?num(a[2]):null;if(st<0)st=Math.max(s.length+st+1,1);if(st===0){st=1;if(ln!==null)ln=Math.max(ln-1,0)}return ln===null?s.substr(st-1):s.substr(st-1,Math.max(ln,0))},
 LEFT:function(a){return a[0]===null?null:String(a[0]).substr(0,Math.max(num(a[1])||0,0))},
 REPLACE:function(a){if(a[0]===null||a[1]==null||a[2]==null)return null;return a[1]===""?String(a[0]):String(a[0]).split(String(a[1])).join(String(a[2]))},
 CONCAT:function(a){return a.filter(function(v){return v!==null}).join("")},
 STRFTIME:function(a){if(a[0]===null||a[1]==null)return null;var m=/^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d))?/.exec(String(a[1]));if(!m)return null;return String(a[0]).replace(/%([YmdHM])/g,function(_,c){return{Y:m[1],m:m[2],d:m[3],H:m[4]||"00",M:m[5]||"00"}[c]})}
};
SCALAR.SUBSTRING=SCALAR.SUBSTR;
var NOCLOCK={NOW:1,GETDATE:1,SYSDATETIME:1,CURRENT_DATE:1,CURDATE:1,DATE:1,DATETIME:1,JULIANDAY:1,DATEADD:1,DATEDIFF:1,DATE_TRUNC:1,DATE_FORMAT:1,FORMAT:1};

function core(x,f,env){var a,b,v,i,l;
 switch(x.t){
 case"num":case"str":return x.v;case"null":return null;
 case"un":a=f(x.a);if(x.op==="-")return a===null?null:-num(a);v=truth(a);return v===null?null:(v?0:1);
 case"bin":
  if(x.op==="AND"){a=truth(f(x.a));if(a===false)return 0;b=truth(f(x.b));if(b===false)return 0;return a===null||b===null?null:1}
  if(x.op==="OR"){a=truth(f(x.a));if(a===true)return 1;b=truth(f(x.b));if(b===true)return 1;return a===null||b===null?null:0}
  a=f(x.a);b=f(x.b);if(a===null||b===null)return null;
  switch(x.op){
   case"=":return cmp(a,b)===0?1:0;case"<>":return cmp(a,b)!==0?1:0;
   case"<":return cmp(a,b)<0?1:0;case"<=":return cmp(a,b)<=0?1:0;case">":return cmp(a,b)>0?1:0;case">=":return cmp(a,b)>=0?1:0;
   case"||":return String(a)+String(b);
   case"+":return num(a)+num(b);case"-":return num(a)-num(b);case"*":return num(a)*num(b);
   case"/":a=num(a);b=num(b);if(b===0)return null;if(x._fl===undefined)x._fl=isFl(x.a)||isFl(x.b);return !x._fl&&a%1===0&&b%1===0?Math.trunc(a/b):a/b;
   case"%":a=num(a);b=num(b);return b===0?null:a%b}
  return null;
 case"isnull":a=f(x.a);return (a===null)!==x.not?1:0;
 case"in":a=f(x.a);l=x.sub?subq(x.sub,env).rows.map(function(r){return r[0]}):x.list.map(f);if(a===null)return null;v=0;
  for(i=0;i<l.length;i++){if(l[i]===null)v=v||null;else if(cmp(a,l[i])===0){v=1;break}}
  return v===null?null:(x.not?(v?0:1):v);
 case"like":a=f(x.a);b=f(x.b);if(a===null||b===null)return null;v=likeRe(b).test(String(a));return v!==x.not?1:0;
 case"between":a=f(x.a);var lo=f(x.lo),hi=f(x.hi);
  var c1=a===null||lo===null?null:cmp(a,lo)>=0,c2=a===null||hi===null?null:cmp(a,hi)<=0;
  v=c1===false||c2===false?false:(c1===null||c2===null?null:true);return v===null?null:((v!==x.not)?1:0);
 case"case":
  if(x.base){a=f(x.base);for(i=0;i<x.whens.length;i++){b=f(x.whens[i][0]);if(a!==null&&b!==null&&cmp(a,b)===0)return f(x.whens[i][1])}}
  else for(i=0;i<x.whens.length;i++)if(truth(f(x.whens[i][0]))===true)return f(x.whens[i][1]);
  return x.els?f(x.els):null;
 case"fn":
  if(x.over){if(!env.wv||x._wi===undefined)throw E("A window function (OVER) only works in the SELECT list and in ORDER BY of a query.",x.s);return env.wv[x._wi][env.wi]}
  if(WIN[x.name]&&!AGG[x.name])throw E(x.name+" is a window function and needs OVER (...) after it, for example "+WIN[x.name][2].split(",")[0].split(" or ")[0]+" OVER (ORDER BY id).",x.s);
  if((x.name==="MIN"||x.name==="MAX")&&x.args.length>1){l=x.args.map(f);if(l.indexOf(null)>=0)return null;return l.reduce(function(p,c){return (x.name==="MIN"?cmp(c,p)<0:cmp(c,p)>0)?c:p})}
  if(!SCALAR[x.name]){if(NOCLOCK[x.name])throw E("Date functions differ in every database, and this engine has no clock. Dates are text here: compare with '2026-09-01', and cut with SUBSTR(opened, 1, 7) for the month.",x.s);throw E("There is no function "+x.name+" here. Available: COUNT, SUM, AVG, MIN, MAX, COALESCE, NULLIF, UPPER, LOWER, LENGTH, SUBSTR, TRIM, REPLACE, ROUND, ABS, CONCAT, GROUP_CONCAT. With OVER (...): "+WINLIST+".",x.s)}
  return SCALAR[x.name](x.args.map(f));
 case"sub":v=subq(x.q,env);if(v.cols.length!==1)throw E("A query used as a single value must return one column.",x.s);return v.rows.length?v.rows[0][0]:null;
 case"ref":return f(x.to)}
 throw E("Cannot evaluate this.",x.s)}
function subq(q,env){if(!q._r)q._r=runSelect(q,{db:env.db,ctes:env.ctes,depth:env.depth+1});return q._r}

function aggregate(x,rows,evRow,env){var n=x.name,vals,i,v;
 if(n==="COUNT"&&x.star)return rows.length;
 if(x.star)throw E(n+"(*) does not exist. Only COUNT takes a star.",x.s);
 if(!x.args.length)throw E(n+" needs a column or an expression.",x.s);
 vals=[];for(i=0;i<rows.length;i++){v=evRow(x.args[0],rows[i]);if(v!==null)vals.push(v)}
 if(x.distinct){var seen={},d=[];vals.forEach(function(v){var k=typeof v+":"+v;if(!seen[k]){seen[k]=1;d.push(v)}});vals=d}
 switch(n){
  case"COUNT":return vals.length;
  case"SUM":return vals.length?vals.reduce(function(a,b){return a+num(b)},0):null;
  case"AVG":return vals.length?vals.reduce(function(a,b){return a+num(b)},0)/vals.length:null;
  case"MIN":return vals.length?vals.reduce(function(a,b){return cmp(b,a)<0?b:a}):null;
  case"MAX":return vals.length?vals.reduce(function(a,b){return cmp(b,a)>0?b:a}):null;
  default:var sep=",";if(x.args.length>1&&rows.length){sep=evRow(x.args[1],rows[0]);sep=sep===null?"":String(sep)}return vals.length?vals.join(sep):null}}

function kcmp(a,b,order){for(var i=0;i<order.length;i++){var x=a[i],y=b[i],c=x===null?(y===null?0:-1):(y===null?1:cmp(x,y));if(c)return order[i].desc?-c:c}return 0}
/* One window function for all rows (or groups) of a query. Returns one value per row. */
function winVals(w,ctxs,evX,env){var o=w.over,n=w.name,a=w.args,d=WIN[n],res=new Array(ctxs.length),parts=[],pi={};
 if(!d)throw E(n+" cannot be used with OVER. These can: "+WINLIST+".",w.s);
 if(w.distinct)throw E("DISTINCT cannot be used inside a window function.",w.s);
 if(w.star&&n!=="COUNT")throw E(n+"(*) does not exist. Only COUNT takes a star.",w.s);
 if(a.length>d[1]||(a.length<d[0]&&!w.star))throw E(n+" is written like this: "+d[2]+", followed by OVER (...).",w.s);
 ctxs.forEach(function(c,i){var k=JSON.stringify(o.part.map(function(e){return evX(e,c)}));if(pi[k]===undefined){pi[k]=parts.length;parts.push([])}parts[pi[k]].push(i)});
 parts.forEach(function(ix){var m=ix.length,ks={},ps=[],pe=[],dr=[],vals=null,p,j,c,v,lo,hi,off,nb,sz,big,cl=-1,ch=-1,cv=null;
  if(o.order.length){ix.forEach(function(i){ks[i]=o.order.map(function(k){return evX(k.e,ctxs[i])})});ix.sort(function(x,y){return kcmp(ks[x],ks[y],o.order)||x-y})}
  for(p=0;p<m;p++){if(p>0&&(!o.order.length||kcmp(ks[ix[p]],ks[ix[p-1]],o.order)===0)){ps[p]=ps[p-1];dr[p]=dr[p-1]}else{ps[p]=p;dr[p]=p?dr[p-1]+1:1}}
  for(p=m-1;p>=0;p--)pe[p]=p<m-1&&ps[p+1]===ps[p]?pe[p+1]:p;
  if(n==="NTILE"){nb=evX(a[0],ctxs[ix[0]]);if(typeof nb!=="number"||nb%1!==0||nb<1)throw E("NTILE needs a whole number above zero: NTILE(4) makes four parts of equal size.",w.s);sz=Math.floor(m/nb);big=m%nb}
  else if(AGG[n]||n==="FIRST_VALUE"||n==="LAST_VALUE")vals=ix.map(function(i){return a.length?evX(a[0],ctxs[i]):1});
  for(p=0;p<m;p++){c=ctxs[ix[p]];
   if(n==="ROW_NUMBER")v=p+1;
   else if(n==="RANK")v=ps[p]+1;
   else if(n==="DENSE_RANK")v=dr[p];
   else if(n==="NTILE")v=p<big*(sz+1)?Math.floor(p/(sz+1))+1:big+Math.floor((p-big*(sz+1))/sz)+1;
   else if(n==="LAG"||n==="LEAD"){off=a.length>1?evX(a[1],c):1;
    if(off===null)v=null;
    else{off=num(off);if(off<0||off%1!==0)throw E("The second value of "+n+" says how many rows to go "+(n==="LAG"?"back":"forward")+". It must be a whole number, zero or above.",w.s);
     j=n==="LAG"?p-off:p+off;v=j>=0&&j<m?evX(a[0],ctxs[ix[j]]):(a.length>2?evX(a[2],c):null)}}
   else{
    if(o.frame){if(o.frame.all){lo=0;hi=m-1}else{lo=o.frame.n===null?0:Math.max(0,p-o.frame.n);hi=p}}
    else{lo=0;hi=o.order.length?pe[p]:m-1}
    if(n==="FIRST_VALUE")v=vals[lo];
    else if(n==="LAST_VALUE")v=vals[hi];
    else{if(lo!==cl||hi!==ch){cv=aggregate(w,vals.slice(lo,hi+1),function(_,x){return x},env);cl=lo;ch=hi}v=cv}}
   res[ix[p]]=v}});
 return res}

function table(env,name,pos){var k=name.toLowerCase();if(env.ctes[k])return env.ctes[k];
 var t=env.db.tables;for(var n in t)if(n.toLowerCase()===k)return t[n];
 throw E("There is no table "+name+". The tables are: "+Object.keys(t).join(", ")+".",pos)}

function runSelect(q,env){var ctes=Object.create(env.ctes);env={db:env.db,ctes:ctes,depth:env.depth};
 q.ctes.forEach(function(c){ctes[c.name.toLowerCase()]=runSelect(c.q,env)});
 var src=[],rows=[[]];
 function resolve(x,soft){var hits=[],i,ci,nm=x.name.toLowerCase();
  if(x.tb){var tb=x.tb.toLowerCase(),found=false;for(i=0;i<src.length;i++)if(src[i].alias.toLowerCase()===tb){found=true;ci=src[i].lc.indexOf(nm);if(ci>=0)hits.push([i,ci])}
   if(!found){if(soft)return false;var real=null;for(i=0;i<src.length;i++)if(src[i].name&&src[i].name.toLowerCase()===tb)real=src[i];
    throw E(real?"The table "+real.name+" got the short name "+real.alias+" in this query. Write "+real.alias+"."+x.name+".":"There is no table or short name "+x.tb+" in this query.",x.s)}}
  else for(i=0;i<src.length;i++){ci=src[i].lc.indexOf(nm);if(ci>=0)hits.push([i,ci])}
  if(hits.length>1)throw E("The column "+x.name+" exists in more than one table here. Say which one: "+hits.map(function(h){return src[h[0]].alias+"."+x.name}).join(" or ")+".",x.s);
  if(!hits.length){if(soft)return false;
   if(x.q==='"')throw E("\""+x.name+"\" in double quotes is read as a column name, and there is none. Text values go in single quotes: '"+x.name+"'.",x.s);
   throw E("There is no column "+x.name+(x.tb?" in "+x.tb:"")+". Columns here: "+src.map(function(s){return (src.length>1?s.alias+": ":"")+s.cols.join(", ")}).join("; ")+"."+(env.depth?" A query in brackets cannot see the tables of the query around it.":""),x.s)}
  x.ti=hits[0][0];x.ci=hits[0][1];return true}
 function bind(x,mode,amap,items){
  if(x.t==="col"){
   if(amap&&!x.tb){var al=amap[x.name.toLowerCase()];
    if(al!==undefined&&(mode==="order"||!resolve(x,true))){x.t="ref";x.to=items[al].e;return}
    if(x.ti!==undefined)return}
   if(mode==="where"&&!x.tb&&q._amap&&q._amap[x.name.toLowerCase()]!==undefined&&!resolve(x,true))throw E(hasWin(q._it[q._amap[x.name.toLowerCase()]].e)?"WHERE cannot use the name "+x.name+": it comes from a window function, and those are worked out after WHERE. Put the query in a subquery (FROM (...) x) and filter outside.":"WHERE cannot use the name "+x.name+": it is given in SELECT, which runs later. Repeat the expression in WHERE"+(q.group.length?", or filter the groups with HAVING":"")+".",x.s);
   resolve(x,false);return}
  if(mode==="where"&&isAggFn(x))throw E(x.name+" cannot be used in WHERE: WHERE looks at single rows, before they are grouped. Filter groups with HAVING.",x.s);
  if(mode==="on"&&isAggFn(x))throw E(x.name+" cannot be used in a JOIN condition.",x.s);
  kids(x).forEach(function(k){bind(k,mode,amap,items)})}
 var ev=function(x,row){return x.t==="col"?(row[x.ti]?row[x.ti][x.ci]:null):core(x,function(c){return ev(c,row)},env)};
 q.from.forEach(function(f,fi){var t=f.sub?runSelect(f.sub,env):table(env,f.name,f.p);
  src.forEach(function(s){if(s.alias.toLowerCase()===f.alias.toLowerCase())throw E("Two tables in this query are both called "+f.alias+". Give each a short name: "+f.name+" a JOIN "+f.name+" b.",f.p)});
  src.push({alias:f.alias,name:f.name||null,cols:t.cols,lc:t.cols.map(function(c){return c.toLowerCase()})});
  if(f.on){bind(f.on,"on");noWin(f.on,"a JOIN condition")}
  var out=[],i,j,hit,cand;
  for(i=0;i<rows.length;i++){hit=false;
   for(j=0;j<t.rows.length;j++){cand=rows[i].concat([t.rows[j]]);if(!f.on||truth(ev(f.on,cand))===true){out.push(cand);hit=true}}
   if(!hit&&f.join==="left")out.push(rows[i].concat([null]))}
  rows=out;if(rows.length>400000)throw E("This join produces more than 400,000 rows. A JOIN condition is probably missing.",f.p)});
 // select list
 var items=[];
 q.items.forEach(function(it){if(!it.star){items.push(it);return}
  if(!src.length)throw E("SELECT * needs a FROM.",it.p);var any=false;
  src.forEach(function(s,ti){if(it.tb&&s.alias.toLowerCase()!==it.tb.toLowerCase())return;any=true;s.cols.forEach(function(c,ci){items.push({e:{t:"col",tb:s.alias,name:c,ti:ti,ci:ci,s:it.p,e:it.p},alias:null,name:c})})});
  if(!any)throw E("There is no table or short name "+it.tb+" in this query.",it.p)});
 var amap={};items.forEach(function(it,i){if(it.alias&&amap[it.alias.toLowerCase()]===undefined)amap[it.alias.toLowerCase()]=i});
 q._amap=amap;q._it=items;
 if(q.where){bind(q.where,"where");noWin(q.where,"WHERE");rows=rows.filter(function(r){return truth(ev(q.where,r))===true})}
 items.forEach(function(it){if(!it.name)bind(it.e,"select")});
 function positional(e,what){if(e.t==="num"&&e.v%1===0){if(e.v<1||e.v>items.length)throw E(what+" "+e.v+" points at column "+e.v+" of the result, which has "+items.length+".",e.s);return items[e.v-1].e}return null}
 var group=q.group.map(function(g){var p=positional(g,"GROUP BY");if(p){noWin(p,"GROUP BY");return p}bind(g,"group",amap,items);noWin(g,"GROUP BY");if(hasAgg(g))throw E("GROUP BY cannot contain COUNT, SUM and the like.",g.s);return g});
 if(q.having){bind(q.having,"having",amap,items);noWin(q.having,"HAVING")}
 var order=q.order.map(function(o){var p=positional(o.e,"ORDER BY");if(p)return{e:p,desc:o.desc};bind(o.e,"order",amap,items);return o});
 var agg=group.length>0||!!q.having||items.some(function(it){return hasAgg(it.e)})||order.some(function(o){return hasAgg(o.e)});
 var cols=items.map(function(it){return it.alias||it.name||(it.e.t==="col"?it.e.name:env.db._src.slice(it.e.s,it.e.e).replace(/\s+/g," ").trim())});
 var out=[],wins=[],ctxs=rows,evX=ev;
 var findWin=function(x,inside){if(x.t==="fn"&&x.over){if(inside)throw E("A window function cannot sit inside another one. Work out the inner one in a subquery (FROM (...) x) first.",x.s);if(wins.indexOf(x)<0)wins.push(x);kids(x).forEach(function(k){findWin(k,true)})}else kids(x).forEach(function(k){findWin(k,inside)})};
 items.forEach(function(it){findWin(it.e,false)});order.forEach(function(o){findWin(o.e,false)});
 if(agg){
  var gk={};group.forEach(function(g){gk[key(g)]=1});
  var check=function(x,inAgg){if(!inAgg&&gk[key(x)])return;
   if(isAggFn(x)){if(inAgg)throw E("A function like "+x.name+" cannot sit inside another one.",x.s);x.args.forEach(function(a){check(a,x.name)});return}
   if(x.over&&inAgg)throw E("A window function cannot sit inside "+inAgg+". Work it out in a subquery (FROM (...) x) first, then use "+inAgg+" outside.",x.s);
   if(x.t==="col"&&!inAgg)throw E(group.length?"The column "+x.name+" is neither in GROUP BY nor inside a function such as COUNT or MAX. With several rows in a group, the database cannot know which value you want.":"This query mixes a plain column ("+x.name+") with a function that sums up all rows. Add GROUP BY "+x.name+", or wrap the column in MIN or MAX.",x.s);
   kids(x).forEach(function(k){check(k,inAgg)})};
  items.forEach(function(it){check(it.e,false)});if(q.having)check(q.having,false);order.forEach(function(o){check(o.e,false)});
  var groups=[],gi={};
  if(group.length)rows.forEach(function(r){var k=JSON.stringify(group.map(function(g){return ev(g,r)}));if(gi[k]===undefined){gi[k]=groups.length;groups.push([])}groups[gi[k]].push(r)});
  else groups.push(rows);
  var evA=function(x,rs){if(gk[key(x)])return rs.length?ev(x,rs[0]):null;
   if(isAggFn(x))return aggregate(x,rs,ev,env);
   return core(x,function(c){return evA(c,rs)},env)};
  ctxs=q.having?groups.filter(function(rs){return truth(evA(q.having,rs))===true}):groups;evX=evA}
 if(wins.length){var wv=wins.map(function(w){return winVals(w,ctxs,evX,env)});wins.forEach(function(w,i){w._wi=i});env.wv=wv}
 ctxs.forEach(function(c,i){env.wi=i;out.push({r:items.map(function(it){return evX(it.e,c)}),k:order.map(function(o){return evX(o.e,c)})})});
 if(q.distinct){var seen={};out=out.filter(function(o){var k=JSON.stringify(o.r);if(seen[k])return false;seen[k]=1;return true})}
 if(order.length){out.forEach(function(o,i){o.i=i});out.sort(function(a,b){return kcmp(a.k,b.k,order)||a.i-b.i})}
 var res=out.map(function(o){return o.r}),off=q.offset||0;
 if(q.limit!==null)res=res.slice(off,off+q.limit);else if(off)res=res.slice(off);
 return{cols:cols,rows:res}}

function one(env,name,pos){var t=table({db:env.db,ctes:{}},name,pos);return{t:t,src:[{alias:name,name:name,cols:t.cols,lc:t.cols.map(function(c){return c.toLowerCase()})}]}}
function bind1(x,o,name){if(x.t==="col"){var ci=o.src[0].lc.indexOf(x.name.toLowerCase());if(x.tb&&x.tb.toLowerCase()!==name.toLowerCase())throw E("There is no table "+x.tb+" in this statement.",x.s);if(ci<0){if(x.q==='"')throw E("\""+x.name+"\" in double quotes is read as a column name. Text values go in single quotes: '"+x.name+"'.",x.s);throw E("There is no column "+x.name+" in "+name+". Columns: "+o.t.cols.join(", ")+".",x.s)}x.ti=0;x.ci=ci;return}
 if(isAggFn(x))throw E(x.name+" cannot be used here.",x.s);kids(x).forEach(function(k){bind1(k,o,name)})}
function colIndex(o,c,name,pos){var i=o.src[0].lc.indexOf(c.toLowerCase());if(i<0)throw E("There is no column "+c+" in "+name+". Columns: "+o.t.cols.join(", ")+".",pos);return i}
function plural(n,w){return n+" "+(n===1?w:w+"s")}

function nocol(x){if(x.t==="col")throw E(x.q==='"'?"Text values go in single quotes: '"+x.name+"'.":"VALUES takes values, not column names: "+x.name+".",x.s);kids(x).forEach(nocol)}
function exec(db,st){var env={db:db,ctes:Object.create(null),depth:0},o,n=0,ev;
 ev=function(x,row){return x.t==="col"?row[0][x.ci]:core(x,function(c){return ev(c,row)},env)};
 switch(st.t){
 case"select":var r=runSelect(st,env);return{type:"rows",cols:r.cols,rows:r.rows};
 case"begin":if(db.tx)throw E("A transaction is already open. End it with COMMIT or ROLLBACK first.",0);db.tx=JSON.stringify(db.tables);return{type:"msg",text:"Transaction started. Nothing you change is final until COMMIT."};
 case"commit":if(!db.tx)throw E("There is no open transaction. Start one with BEGIN.",0);db.tx=null;return{type:"msg",text:"Committed. The changes are final."};
 case"rollback":if(!db.tx)throw E("There is no open transaction to roll back. Without BEGIN, every change is final at once.",0);db.tables=JSON.parse(db.tx);db.tx=null;return{type:"msg",text:"Rolled back. The tables are as they were at BEGIN."};
 case"insert":o=one(env,st.table,st.p);
  var idx=st.cols?st.cols.map(function(c){return colIndex(o,c,st.table,st.p)}):o.t.cols.map(function(_,i){return i}),idc=o.src[0].lc.indexOf("id");
  st.rows.forEach(function(vals){if(vals.length!==idx.length)throw E("The statement names "+plural(idx.length,"column")+" but gives "+plural(vals.length,"value")+".",st.p);
   var row=o.t.cols.map(function(){return null});
   vals.forEach(function(v,i){nocol(v);row[idx[i]]=ev(v,[row])});
   if(idc>=0&&idx.indexOf(idc)<0)row[idc]=o.t.rows.reduce(function(m,r){return Math.max(m,num(r[idc])||0)},0)+1;
   o.t.rows.push(row);n++});
  return{type:"msg",text:plural(n,"row")+" added to "+st.table+".",n:n,tx:!!db.tx};
 case"update":o=one(env,st.table,st.p);
  var sets=st.set.map(function(s){bind1(s[1],o,st.table);return[colIndex(o,s[0],st.table,st.p),s[1]]});
  if(st.where)bind1(st.where,o,st.table);
  o.t.rows.forEach(function(row,i){if(st.where&&truth(ev(st.where,[row]))!==true)return;var nv=sets.map(function(s){return ev(s[1],[row])}),c=row.slice();sets.forEach(function(s,k){c[s[0]]=nv[k]});o.t.rows[i]=c;n++});
  return{type:"msg",text:plural(n,"row")+" changed in "+st.table+".",n:n,tx:!!db.tx,all:!st.where,total:o.t.rows.length};
 case"delete":o=one(env,st.table,st.p);if(st.where)bind1(st.where,o,st.table);
  var keep=o.t.rows.filter(function(row){return st.where&&truth(ev(st.where,[row]))!==true});n=o.t.rows.length-keep.length;o.t.rows=keep;
  return{type:"msg",text:plural(n,"row")+" deleted from "+st.table+".",n:n,tx:!!db.tx,all:!st.where,total:n}}
 throw E("Cannot run this.",0)}

function run(db,sql){var P=new Parser(sql),sts=P.statements(),out=[];
 if(!sts.length)throw E("Nothing to run: the box is empty.",0);
 db._src=sql;
 for(var i=0;i<sts.length;i++){try{var r=exec(db,sts[i]);r.sql=sts[i].src;r.kind=sts[i].t;out.push(r)}catch(e){e.done=out;throw e}}
 return out}
window.SQLE={run:run,make:function(data){return{tables:JSON.parse(JSON.stringify(data)),tx:null}}};
})();
