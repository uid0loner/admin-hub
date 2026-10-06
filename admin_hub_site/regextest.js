(function(){
"use strict";
/* Regex tester. Three parts: a tolerant parser for JavaScript regex syntax (explain, traps, variants),
   a guarded match runner (also used inside a worker so a runaway pattern can be stopped), and the page. */
var INF=Infinity,MAXTEXT=100000,MAXMATCH=2000,MAXMS=1000,ROWS=200;
var NUMW=["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve"];
function nw(n){return n<NUMW.length?NUMW[n]:String(n)}
var CHN={" ":"a space","\t":"a tab","\n":"a line feed","\r":"a carriage return",",":"a comma","-":"a hyphen",".":"a dot","_":"an underscore","\\":"a backslash","/":"a slash","\"":"a double quote","'":"a single quote",":":"a colon",";":"a semicolon","|":"a pipe","@":"an at sign","#":"a hash sign","$":"a dollar sign","%":"a percent sign","&":"an ampersand","*":"a star","+":"a plus sign","?":"a question mark","(":"an opening parenthesis",")":"a closing parenthesis","[":"an opening bracket","]":"a closing bracket","{":"an opening brace","}":"a closing brace","^":"a caret","=":"an equals sign","<":"a less-than sign",">":"a greater-than sign","!":"an exclamation mark","~":"a tilde","`":"a backtick"};
var SPECIAL=".^$*+?()[]{}|\\",ALIEN={A:"start of the text",Z:"end of the text",z:"end of the text",h:"a horizontal space",G:"where the last match ended",Q:"start of a quoted part",E:"end of a quoted part",K:"forget what was matched so far",R:"any line break",X:"a full character with its accents",e:"the escape character",a:"the bell character"};
var SETN={d:"a digit (0 to 9)",D:"any character that is not a digit",w:"a word character (letter, digit or underscore)",W:"any character that is not a letter, digit or underscore",s:"a whitespace character (space, tab or line break)",S:"any character that is not whitespace"};
var SETC={d:"digits",D:"anything that is not a digit",w:"letters, digits and underscore",W:"anything that is not a letter, digit or underscore",s:"whitespace",S:"anything that is not whitespace"};
var CTL={n:["\n","a line feed (new line)"],r:["\r","a carriage return"],t:["\t","a tab"],f:["\f","a form feed"],v:["\x0B","a vertical tab"],"0":["\x00","the NUL character"]};
function strip(s){return s.replace(/^an? /,"")}
function printable(c){var k=c.charCodeAt(0);return !(k<33||k===127||(k>=128&&k<161)||k===0x200B||k===0xFEFF)}
function ucode(c){var h=c.charCodeAt(0).toString(16).toUpperCase();while(h.length<4)h="0"+h;return "U+"+h}
function chName(c){if(CHN[c])return strip(CHN[c]);return printable(c)?c:ucode(c)}
function quote(s){return "\""+s+"\""}

/* ---------- parser ---------- */
function parse(src){
  src=String(src);
  var i=0,n=src.length,gc=0,groups=[],errs=[];
  function err(s,e,msg){errs.push({s:s,e:e,msg:msg});return{t:"err",s:s,e:e,msg:msg}}
  function hex(k,len){var h=src.substr(k,len);return h.length===len&&/^[0-9a-fA-F]+$/.test(h)?parseInt(h,16):-1}
  function lit(ch,s,e,how){return{t:"lit",ch:ch,s:s,e:e,esc:how!=="plain",how:how}}
  function esc(inClass){
    var s=i,c=src.charAt(i+1),v,m;
    if(c===""){i=n;return err(s,n,"The pattern ends with a single backslash. A backslash always needs a character after it. Write \\\\ for a real backslash.")}
    i+=2;
    if("dDwWsS".indexOf(c)>=0)return{t:"set",c:c,s:s,e:i};
    if(c==="b"&&inClass)return lit("\b",s,i,"bs");
    if(c==="b"||c==="B")return{t:"wb",c:c,s:s,e:i};
    if(c==="0"&&!/[0-9]/.test(src.charAt(i)))return lit("\x00",s,i,"ctl");
    if("nrtfv".indexOf(c)>=0)return lit(CTL[c][0],s,i,"ctl");
    if(/[0-9]/.test(c)){
      if(inClass||c==="0"){m=/^[0-7]{1,3}/.exec(src.substr(s+1,3));if(m){i=s+1+m[0].length;return lit(String.fromCharCode(parseInt(m[0],8)&255),s,i,"oct")}return lit(c,s,i,"id")}
      m=/^[0-9]+/.exec(src.substr(s+1,6));i=s+1+m[0].length;return{t:"bref",num:+m[0],s:s,e:i}}
    if(c==="k"&&!inClass&&(m=/^<([^>]*)>/.exec(src.substr(i,80)))){i+=m[0].length;return{t:"bref",name:m[1],s:s,e:i}}
    if(c==="x"&&(v=hex(i,2))>=0){i+=2;return lit(String.fromCharCode(v),s,i,"hex")}
    if(c==="u"&&(v=hex(i,4))>=0){i+=4;return lit(String.fromCharCode(v),s,i,"hex")}
    if(c==="c"&&/[A-Za-z]/.test(src.charAt(i))){v=src.charAt(i);i++;return{t:"lit",ch:String.fromCharCode(v.toUpperCase().charCodeAt(0)-64),s:s,e:i,esc:true,how:"cx",key:v.toUpperCase()}}
    if((c==="p"||c==="P")&&src.charAt(i)==="{"){v=lit(c,s,i,"id");v.prop=true;return v}
    return lit(c,s,i,"id");
  }
  function citem(){
    if(src.charAt(i)==="\\")return esc(true);
    var s=i,c=src.charAt(i),k=src.charCodeAt(i);i++;
    if(k>=0xD800&&k<0xDC00&&i<n){var k2=src.charCodeAt(i);if(k2>=0xDC00&&k2<0xE000){c+=src.charAt(i);i++}}
    return lit(c,s,i,"plain");
  }
  function cls(){
    var s=i,neg=false,items=[],closed=false,a,b,hy;i++;
    if(src.charAt(i)==="^"){neg=true;i++}
    while(i<n){
      if(src.charAt(i)==="]"){i++;closed=true;break}
      a=citem();if(a.t==="err"){items.push(a);break}
      if(src.charAt(i)==="-"&&i+1<n&&src.charAt(i+1)!=="]"){
        hy=i;i++;b=citem();
        if(b.t==="err"){items.push(a,lit("-",hy,hy+1,"plain"),b);break}
        if(a.t==="lit"&&b.t==="lit"){
          if(a.ch.length===1&&b.ch.length===1&&b.ch.charCodeAt(0)<a.ch.charCodeAt(0))errs.push({s:a.s,e:b.e,msg:"The range "+src.slice(a.s,b.e)+" runs backwards. The lower character must come first."});
          items.push({t:"range",a:a,b:b,s:a.s,e:b.e})}
        else items.push(a,lit("-",hy,hy+1,"plain"),b);
      }else items.push(a);
    }
    if(!closed)errs.push({s:s,e:s+1,msg:"The character class opened with [ at position "+(s+1)+" is never closed. Add a ] or write \\[ for a real bracket."});
    return{t:"class",neg:neg,items:items,s:s,e:i,closed:closed};
  }
  function group(){
    var s=i,k="cap",name=null,num=0,bad=null,m,r;i++;
    if(src.charAt(i)==="?"){
      r=src.substr(i,90);
      if(r.indexOf("?:")===0){k="nc";i+=2}
      else if(r.indexOf("?=")===0){k="la";i+=2}
      else if(r.indexOf("?!")===0){k="nla";i+=2}
      else if(r.indexOf("?<=")===0){k="lb";i+=3}
      else if(r.indexOf("?<!")===0){k="nlb";i+=3}
      else if((m=/^\?<([A-Za-z_$][\w$]*)>/.exec(r))){k="named";name=m[1];i+=m[0].length}
      else if((m=/^\?P<([A-Za-z_]\w*)>/.exec(r))){k="named";name=m[1];i+=m[0].length;bad="(?P<"+name+"> is the Python way to name a group. JavaScript and .NET write (?<"+name+">."}
      else if((m=/^\?[a-zA-Z-]+(?=\))/.exec(r))){k="bad";i+=m[0].length;bad="Inline flags such as ("+m[0]+") are not part of JavaScript regex. Use the flag boxes instead."}
      else if((m=/^\?[a-zA-Z-]+:/.exec(r))){k="bad";i+=m[0].length;bad="A group with its own flags, ("+m[0]+"...), is not supported here. Use the flag boxes instead."}
      else if(r.indexOf("?#")===0){k="bad";i+=2;bad="(?#...) comments are not part of JavaScript regex."}
      else if(r.indexOf("?>")===0){k="bad";i+=2;bad="(?>...) is an atomic group. PCRE and .NET know it, JavaScript does not."}
      else{k="bad";i++;bad="After (? JavaScript expects one of : = ! <= <! or <name>."}
    }
    if(k==="cap"||k==="named"){num=++gc;groups.push({num:num,name:name})}
    var body=alt(true),closed=false;
    if(src.charAt(i)===")"){i++;closed=true}
    else errs.push({s:s,e:s+1,msg:"The group opened with ( at position "+(s+1)+" is never closed. Add a ) or write \\( for a real parenthesis."});
    if(bad)errs.push({s:s,e:i,msg:bad});
    return{t:"group",k:k,name:name,num:num,body:body,s:s,e:i,closed:closed,bad:bad};
  }
  function atom(){
    var s=i,c=src.charAt(i),m,k;
    if(c==="^"){i++;return{t:"bol",s:s,e:i}}
    if(c==="$"){i++;return{t:"eol",s:s,e:i}}
    if(c==="."){i++;return{t:"dot",s:s,e:i}}
    if(c==="("){return group()}
    if(c==="["){return cls()}
    if(c==="\\"){return esc(false)}
    if(c==="*"||c==="+"||c==="?"){i++;return err(s,i,"The quantifier "+c+" at position "+(s+1)+" has nothing in front of it to repeat. Write \\"+c+" for the real character.")}
    if(c==="{"&&(m=/^\{\d+(?:,\d*)?\}/.exec(src.substr(i,40)))){i+=m[0].length;return err(s,i,"The quantifier "+m[0]+" at position "+(s+1)+" has nothing in front of it to repeat.")}
    i++;k=src.charCodeAt(s);
    if(k>=0xD800&&k<0xDC00&&i<n){var k2=src.charCodeAt(i);if(k2>=0xDC00&&k2<0xE000){c+=src.charAt(i);i++}}
    return lit(c,s,i,"plain");
  }
  function quant(a){
    var s=i,c=src.charAt(i),min,max,m;
    if(c==="*"){min=0;max=INF;i++}
    else if(c==="+"){min=1;max=INF;i++}
    else if(c==="?"){min=0;max=1;i++}
    else if(c==="{"&&(m=/^\{(\d+)(?:(,)(\d*))?\}/.exec(src.substr(i,40)))){min=+m[1];max=m[2]?(m[3]===""?INF:+m[3]):min;i+=m[0].length;
      if(max<min)errs.push({s:s,e:i,msg:"The quantifier "+m[0]+" has its numbers the wrong way round. The smaller number comes first."})}
    else return a;
    var lazy=false;if(src.charAt(i)==="?"){lazy=true;i++}
    a.q={min:min,max:max,lazy:lazy,s:s,e:i};a.e=i;return a;
  }
  function alt(inGroup){
    var s=i,alts=[],items=[],ss=i,c,a;
    while(i<n){
      c=src.charAt(i);
      if(c==="|"){alts.push({t:"seq",items:items,s:ss,e:i});i++;items=[];ss=i;continue}
      if(c===")"){if(inGroup)break;a=err(i,i+1,"The ) at position "+(i+1)+" closes a group that was never opened. Write \\) for a real parenthesis.");i++;a.as=a.s;a.ae=a.e;items.push(a);continue}
      a=atom();a.as=a.s;a.ae=a.e;if(a.t!=="err")a=quant(a);items.push(a);
    }
    alts.push({t:"seq",items:items,s:ss,e:i});
    return{t:"alt",alts:alts,s:s,e:i};
  }
  var root=alt(false);
  return{src:src,root:root,errs:errs,groups:groups,ngroups:gc};
}
/* pre-order walk in source order. fn(node, seq, index, parentGroup) */
function walk(a,fn,parent){
  a.alts.forEach(function(q){q.items.forEach(function(x,k){fn(x,q,k,parent||null);if(x.t==="group")walk(x.body,fn,x)})});
}

/* ---------- explanation ---------- */
function qtext(q){
  var t,lazy=q.lazy;
  if(q.min===0&&q.max===INF)t="zero or more times";
  else if(q.min===1&&q.max===INF)t="one or more times";
  else if(q.min===0&&q.max===1)return lazy?"optional, and left out when possible":"optional";
  else if(q.max===INF)t=nw(q.min)+" or more times";
  else if(q.min===q.max)return q.min===1?"exactly once":q.min===0?"zero times, so it never matches anything":"exactly "+nw(q.min)+" times";
  else if(q.max<q.min)return "with the two numbers the wrong way round";
  else if(q.min===0)t="up to "+nw(q.max)+" times";
  else t=nw(q.min)+" to "+nw(q.max)+" times";
  return t+(lazy?", as few as possible":"");
}
function classText(x){
  var parts=[];
  x.items.forEach(function(it){
    if(it.t==="range"){var a=it.a.ch,b=it.b.ch,al=/^[A-Za-z0-9]$/;parts.push(al.test(a)&&al.test(b)?a+" to "+b:quote(chName(a))+" to "+quote(chName(b)))}
    else if(it.t==="set")parts.push(SETC[it.c]);
    else if(it.t==="lit")parts.push(it.how==="bs"?"backspace":chName(it.ch));
    else if(it.t==="wb")parts.push("B");
    else if(it.t==="bref")parts.push("the digit "+it.num);
  });
  if(!parts.length)return !x.closed?"a character class that is opened and never closed":x.neg?"any character at all, line breaks included":"an empty class. It can never match";
  return (x.neg?"one character that is not one of: ":"one character out of: ")+parts.join(", ")+(x.closed?"":" (the class is not closed)");
}
function litText(x){
  var c=x.ch;
  if(x.how==="plain")return CHN[c]||(printable(c)?"the character "+quote(c):"the character "+ucode(c));
  if(x.how==="ctl"){for(var k in CTL)if(CTL[k][0]===c)return CTL[k][1]}
  if(x.how==="hex"||x.how==="oct")return (printable(c)?(CHN[c]||"the character "+quote(c)):"the character "+ucode(c))+", written as a character code";
  if(x.how==="cx")return "the control character Ctrl+"+x.key;
  if(x.prop)return "the letter "+quote(c)+". Unicode property classes like \\p{L} need the u flag, which this page does not set";
  if(SPECIAL.indexOf(c)>=0)return "a literal "+strip(CHN[c]||c);
  if(ALIEN[c])return "the letter "+quote(c)+". In JavaScript \\"+c+" has no special meaning. In PCRE it means: "+ALIEN[c];
  if(c==="/")return "a slash. The backslash is only needed inside /.../ in JavaScript code";
  return (CHN[c]||"the character "+quote(c))+". The backslash is not needed here";
}
function groupText(x,P){
  var t;
  if(x.k==="cap")t="capture group "+x.num;
  else if(x.k==="named")t="capture group "+x.num+", named "+quote(x.name);
  else if(x.k==="nc")t="a group that bundles its content without capturing it";
  else if(x.k==="la")t="lookahead: what comes next must match the inside. It is checked, not consumed";
  else if(x.k==="nla")t="negative lookahead: what comes next must not match the inside";
  else if(x.k==="lb")t="lookbehind: what stands just before must match the inside. It is checked, not consumed";
  else if(x.k==="nlb")t="negative lookbehind: what stands just before must not match the inside";
  else t="not valid in JavaScript. "+x.bad;
  if(x.bad&&x.k!=="bad")t+=" (Python spelling)";
  if(!x.closed)t+=" (never closed)";
  return t;
}
function nodeText(x,P,flags){
  var t;
  switch(x.t){
    case "lit":t=litText(x);break;
    case "set":t=SETN[x.c];break;
    case "wb":t=x.c==="b"?"a word boundary: the spot between a word character and anything else":"not a word boundary: the spot inside a word or between two non-word characters";break;
    case "dot":t=flags.indexOf("s")>=0?"any single character, line breaks included (s flag)":"any single character except a line break";break;
    case "bol":t=flags.indexOf("m")>=0?"the start of a line (m flag)":"the start of the whole text";break;
    case "eol":t=flags.indexOf("m")>=0?"the end of a line (m flag)":"the end of the whole text";break;
    case "class":t=classText(x);break;
    case "bref":
      if(x.name!==undefined)t=P.groups.some(function(g){return g.name===x.name})?"the same text that the group named "+quote(x.name)+" matched":"refers to a group named "+quote(x.name)+", which does not exist in this pattern";
      else t=x.num<=P.ngroups?"the same text that group "+x.num+" matched":"refers to group "+x.num+", which does not exist in this pattern";
      break;
    case "group":t=groupText(x,P);break;
    default:t=x.msg;
  }
  if(x.q){var q=qtext(x.q);t+=x.t==="group"&&q!=="optional"&&q.indexOf("optional,")!==0&&q.indexOf("exactly once")!==0?", repeated "+q:", "+q}
  return t;
}
function explain(src,flags){
  var P=parse(src),out=[];flags=String(flags||"");
  function add(d,s,e,text,kind){out.push({depth:d,start:s,end:e,src:P.src.slice(s,e),text:text,kind:kind})}
  function plain(x){return x.t==="lit"&&!x.q&&x.how==="plain"}
  function seq(q,d){
    var it=q.items,k=0,j,x,s;
    while(k<it.length){
      x=it[k];
      if(plain(x)){j=k;while(j+1<it.length&&plain(it[j+1]))j++;
        if(j>k){s=P.src.slice(x.s,it[j].e);add(d,x.s,it[j].e,"the text "+quote(s)+(flags.indexOf("i")>=0&&/[A-Za-z]/.test(s)?", in upper or lower case (i flag)":""),"lit");k=j+1;continue}}
      add(d,x.s,x.e,nodeText(x,P,flags),x.t==="err"||(x.t==="group"&&x.k==="bad")?"err":x.t);
      if(x.t==="group")alt(x.body,d+1);
      k++;
    }
  }
  function alt(a,d){
    if(a.alts.length>1)a.alts.forEach(function(q,k){add(d,q.s,q.e,(k?"or option ":"option ")+(k+1)+" of "+a.alts.length+(q.items.length?"":": nothing at all, so this option always fits"),"alt");seq(q,d+1)});
    else seq(a.alts[0],d);
  }
  if(P.src===""){add(0,0,0,"The pattern is empty. An empty pattern fits at every position of the text.","note");return out}
  alt(P.root,0);
  return out;
}

/* ---------- guarded runner ---------- */
function plainError(msg){
  var m=String(msg).replace(/^Invalid regular expression: /,""),k=/^[\s\S]*\/[a-z]*: /.exec(m);
  if(k)m=m.slice(k[0].length);
  var map=[[/unterminated group|missing \)/i,"A group is opened with ( and never closed with )."],
    [/unmatched '?\)|unmatched \)/i,"There is a ) without a ( before it."],
    [/nothing to repeat/i,"A quantifier (* + ? or {n}) has nothing in front of it to repeat."],
    [/\\ at end of pattern/i,"The pattern ends with a single backslash."],
    [/unterminated character class|missing \/|missing \]/i,"A character class is opened with [ and never closed with ]."],
    [/invalid group/i,"After (? comes something JavaScript does not know."],
    [/range out of order/i,"A range inside [ ] runs backwards, such as z-a."],
    [/numbers out of order/i,"A quantifier like {5,2} has its numbers the wrong way round."],
    [/duplicate capture group name/i,"Two groups have the same name."],
    [/invalid capture group name/i,"A group name may only use letters, digits and underscore, and must not start with a digit."],
    [/invalid named reference|invalid named capture referenced/i,"\\k<name> refers to a group name that does not exist."],
    [/too large|too big/i,"The pattern is too large for the engine."]];
  for(var i=0;i<map.length;i++)if(map[i][0].test(m))return{plain:map[i][1],raw:m};
  return{plain:"The engine cannot read this pattern.",raw:m};
}
function cleanFlags(f){var o="";f=String(f||"");"gims".split("").forEach(function(c){if(f.indexOf(c)>=0)o+=c});return o}
function run(pattern,flags,text,repl){
  var t0=Date.now(),re,res={matches:[],total:0,capped:null,truncated:false,repl:null,ms:0};
  flags=cleanFlags(flags);text=String(text===undefined||text===null?"":text);
  if(text.length>MAXTEXT){text=text.slice(0,MAXTEXT);res.truncated=true}
  try{re=new RegExp(pattern,flags)}catch(e){return{err:plainError(e.message)}}
  var glob=flags.indexOf("g")>=0,m,g,k;
  while((m=re.exec(text))){
    g=null;
    if(res.total<ROWS){g=[];for(k=1;k<m.length;k++)g.push(m[k]===undefined?null:m[k].length>300?m[k].slice(0,300)+"...":m[k])}
    res.matches.push({i:m.index,e:m.index+m[0].length,g:g});res.total++;
    if(!glob)break;
    if(m[0]==="")re.lastIndex++;
    if(re.lastIndex>text.length)break;
    if(res.total>=MAXMATCH){res.capped="count";break}
    if(Date.now()-t0>MAXMS){res.capped="time";break}
  }
  if(repl!==undefined&&repl!==null&&repl!==""){
    if(res.capped==="time")res.repl={skipped:true};
    else{try{var out=text.replace(new RegExp(pattern,flags),String(repl));res.repl={out:out.length>20000?out.slice(0,20000):out,cut:out.length>20000}}catch(e2){res.repl={skipped:true}}}
  }
  res.ms=Date.now()-t0;return res;
}

/* ---------- traps ---------- */
var EXT=["txt","log","com","org","net","exe","dll","csv","conf","cfg","json","xml","ps1","sh","bat","cmd","local","ini","yml","yaml","zip","gz","bak","tmp","html","php","sys","msi","pdf","docx","xlsx","evtx","pem","crt","key","de","uk","io","eu"];
function unb(q){return !!q&&q.max>=10}
function nullable(x){
  if(x.q&&x.q.min===0)return true;
  if(x.t==="lit"||x.t==="set"||x.t==="dot"||x.t==="class")return false;
  if(x.t==="group"){if(x.k!=="cap"&&x.k!=="named"&&x.k!=="nc")return true;return x.body.alts.some(function(q){return q.items.every(nullable)})}
  return true;
}
var UNI=null;
function charsOf(x,P,fl){ /* which of 130 sample characters can this node consume. null = anything */
  var set,k,re;
  if(x.t==="lit"||x.t==="set"||x.t==="dot"||x.t==="class"){
    if(x.t==="class"&&!x.closed)return null;
    try{re=new RegExp("^(?:"+P.src.slice(x.as===undefined?x.s:x.as,x.ae===undefined?x.e:x.ae)+")$",fl)}catch(e){return null}
    set=[];for(k=0;k<130;k++)set.push(re.test(k<128?String.fromCharCode(k):k===128?"\u00e9":"\u6f22"));return set}
  if(x.t==="group"){
    if(x.k!=="cap"&&x.k!=="named"&&x.k!=="nc")return [];
    set=[];var bad=false;
    x.body.alts.forEach(function(q){q.items.forEach(function(y){var c=charsOf(y,P,fl);if(c===null)bad=true;else for(var j=0;j<c.length;j++)if(c[j])set[j]=true})});
    return bad?null:set}
  if(x.t==="bref")return null;
  return [];
}
function disjoint(a,b){if(a===null||b===null)return false;for(var k=0;k<130;k++)if(a[k]&&b[k])return false;return true}
function nestedRisk(P,flags){ /* returns the first group whose repetition can be split in many ways */
  var found=null,fl=flags.indexOf("i")>=0?"i":"";if(flags.indexOf("s")>=0)fl+="s";
  function ambiguous(q){ /* does this sequence hold an open-ended repeat with no clear separator next to it */
    var hit=false;
    q.items.forEach(function(x,k){
      if(hit)return;
      var cand=false;
      if(x.t==="err"||x.t==="bol"||x.t==="eol"||x.t==="wb")return;
      if(x.t==="group"&&(x.k==="la"||x.k==="nla"||x.k==="lb"||x.k==="nlb"||x.k==="bad"))return;
      if(unb(x.q))cand=true;
      else if(x.t==="group"&&x.body.alts.some(ambiguous))cand=true;
      if(!cand)return;
      var cx=charsOf(x,P,fl),sep=false;
      q.items.forEach(function(y,j){if(j===k||sep||nullable(y))return;var cy=charsOf(y,P,fl);if(cy&&cy.length&&disjoint(cx,cy))sep=true});
      if(!sep)hit=true;
    });
    return hit;
  }
  walk(P.root,function(x){
    if(found||x.t!=="group"||!unb(x.q))return;
    if(x.k!=="cap"&&x.k!=="named"&&x.k!=="nc")return;
    if(x.body.alts.some(ambiguous))found=x;
  });
  return found;
}
function isDigitish(x){
  if(!x)return false;
  if(x.t==="set")return x.c==="d";
  if(x.t==="lit")return /^[0-9]$/.test(x.ch);
  if(x.t==="class")return !x.neg&&x.items.length>0&&x.items.every(function(it){return (it.t==="range"&&/^[0-9]$/.test(it.a.ch)&&/^[0-9]$/.test(it.b.ch))||(it.t==="lit"&&/^[0-9]$/.test(it.ch))||(it.t==="set"&&it.c==="d")});
  if(x.t==="group"&&(x.k==="cap"||x.k==="named"||x.k==="nc")&&x.body.alts.length===1){var it=x.body.alts[0].items;return it.length>0&&it.every(isDigitish)}
  return false;
}
function isWordish(x){
  if(!x)return false;
  if(x.t==="set")return x.c==="w"||x.c==="d"||x.c==="S";
  if(x.t==="lit")return /^[A-Za-z0-9_]$/.test(x.ch);
  if(x.t==="class")return !x.neg;
  if(x.t==="group")return x.k==="cap"||x.k==="named"||x.k==="nc";
  return false;
}
function cat(c){return /[0-9]/.test(c)?1:/[a-z]/.test(c)?2:/[A-Z]/.test(c)?3:0}
function listPos(a){var s=a.map(function(x){return x+1});return (s.length>1?"positions ":"position ")+(s.length>1?s.slice(0,-1).join(", ")+" and "+s[s.length-1]:s[0])}
function traps(pattern,flags,text,res){
  var P=parse(pattern),src=P.src,out=[],k;flags=cleanFlags(flags);text=String(text===undefined||text===null?"":text);
  function add(sev,id,title,body,fix){out.push({sev:sev,id:id,title:title,text:body,fix:fix||null})}
  if(src==="")return out;
  try{new RegExp(src,flags)}catch(e0){return out}
  var nested=nestedRisk(P,flags);
  if(nested)add("high","nested","A repeat inside a repeat can take a very long time",
    "The group "+src.slice(nested.s,nested.e)+" repeats, and inside it something repeats again with no fixed separator between the rounds. The same text can then be split in a huge number of ways. When a match fails near the end, the engine tries all of them, and the time doubles with every extra character. On a server this is how a single log line or a single form field stalls a process. Remove one of the two repeats, or put a required separator inside the group, as in (?:\\w+\\.)+ where the dot ends every round.");
  /* unescaped dot */
  var dots=[],why="";
  walk(P.root,function(x,q,i){
    if(x.t!=="dot"||x.q)return;
    var a=q.items[i-1],b=q.items[i+1];
    if(isDigitish(a)&&isDigitish(b)){dots.push(x.s);if(!why)why="num";return}
    if(!isWordish(a))return;
    var s="",j=i+1;while(j<q.items.length&&q.items[j].t==="lit"&&!q.items[j].q&&q.items[j].how==="plain"&&/[A-Za-z0-9]/.test(q.items[j].ch)){s+=q.items[j].ch;j++}
    if(j<q.items.length&&q.items[j].t==="lit"&&q.items[j].q&&/[A-Za-z0-9]/.test(q.items[j].ch))return;
    if(EXT.indexOf(s.toLowerCase())>=0){dots.push(x.s);if(!why)why="name"}
  });
  if(dots.length){var fixed=src;dots.slice().sort(function(a,b){return b-a}).forEach(function(p){fixed=fixed.slice(0,p)+"\\"+fixed.slice(p)});
    add("high","dot","A dot that probably should be a real dot",
      "The dot at "+listPos(dots)+" stands for any character, not only for a dot. "+(why==="num"?"A pattern meant for 10.87.4.12 then also accepts 10x87y4z12, and 1.5 also fits 125.":"A pattern meant for app.log then also accepts app-log and appXlog.")+" For a real dot write \\. with a backslash.",fixed)}
  /* greedy .* */
  var greedy=[];
  walk(P.root,function(x,q,i,par){
    var any=x.t==="dot"||(x.t==="class"&&x.neg&&x.items.length===0);
    if(!any||!x.q||x.q.lazy||x.q.max!==INF||(par&&(par.k==="la"||par.k==="nla")))return;
    if(src.slice(x.e).replace(/[)$]/g,"")!=="")greedy.push(x.s);
  });
  if(greedy.length)add("med","greedy","A greedy .* takes as much as it can",
    "The "+src.substr(greedy[0],2)+" at "+listPos(greedy)+" first runs to the end of the line and then gives back only as much as it has to. With two quoted values on one line, \".*\" reaches from the first quote to the very last one. If you want the shortest piece, write "+src.substr(greedy[0],2)+"? to stop at the first place that fits, or use a class that cannot run past the delimiter, such as [^\"]* for everything up to the next quote. The class is also faster.");
  /* anchors */
  var top=P.root.alts,hasBol=false,hasEol=false,first=top[0].items[0],lastSeq=top[top.length-1].items,last=lastSeq[lastSeq.length-1];
  walk(P.root,function(x){if(x.t==="bol")hasBol=true;if(x.t==="eol")hasEol=true});
  var startA=!!first&&first.t==="bol",endA=!!last&&last.t==="eol";
  var trim=top.every(function(q){return q.items.every(function(x){return x.t==="bol"||x.t==="eol"||(x.t==="set"&&x.c==="s")||(x.t==="class"&&!x.neg&&x.items.every(function(it){return (it.t==="set"&&it.c==="s")||(it.t==="lit"&&/\s/.test(it.ch))}))})});
  if(top.length>1&&(startA||endA)&&!trim&&!top.every(function(q){var it=q.items;return it.length&&it[0].t==="bol"&&it[it.length-1].t==="eol"})){
    add("high","altanchor","The anchors belong to one option only",
      "The | splits the whole pattern, anchors included. "+(startA?"The ^ only counts for the first option":"The $ only counts for the last option")+(startA&&endA?", and the $ only for the last one":"")+". ^cat|dog$ means: cat at the start, or dog at the end. To anchor all options, put them in a group.",
      (startA?"^":"")+"(?:"+src.slice(startA?first.e:0,endA?last.s:src.length)+")"+(endA?"$":""));
  }
  var valueLike=src.length>=4,hasCls=false,many=false;
  walk(P.root,function(x){
    if(x.t==="dot"||x.t==="wb"||x.t==="bol"||x.t==="eol"||x.t==="err")valueLike=false;
    if(x.t==="set"){if(x.c!=="d"&&x.c!=="w")valueLike=false;else hasCls=true}
    if(x.t==="class"){hasCls=true;if(x.neg)valueLike=false}
    if(x.q&&x.q.max>1)many=true;
    if(x.t==="group"&&x.k!=="cap"&&x.k!=="named"&&x.k!=="nc")valueLike=false;
  });
  if(top.length===1&&startA!==endA&&!(hasBol&&hasEol)){
    add("info","oneanchor","Anchored on one side only",startA?"The pattern must begin at the start, but anything may follow after it. If the whole value has to fit, end the pattern with $.":"The pattern must end at the end, but anything may stand in front of it. If the whole value has to fit, begin the pattern with ^.");
  }else if(valueLike&&hasCls&&many&&!hasBol&&!hasEol){
    if(res===undefined&&!nested&&text){try{res=run(src,flags,text.slice(0,5000))}catch(e){res=null}}
    var ev="";
    if(res&&res.matches)for(k=0;k<res.matches.length&&!ev;k++){
      var m=res.matches[k];if(m.e===m.i||m.e-m.i>60)continue;
      if(/\w/.test(text.charAt(m.i-1))||/\w/.test(text.charAt(m.e))){var a=m.i,b=m.e;while(a>0&&/\S/.test(text.charAt(a-1))&&m.i-a<30)a--;while(b<text.length&&/\S/.test(text.charAt(b))&&b-m.e<30)b++;
        ev=" In the test text it finds "+quote(text.slice(m.i,m.e))+" inside "+quote(text.slice(a,b))+"."}
    }
    add(ev?"med":"info","noanchor","No anchors: the pattern also fits inside longer text",
      "This looks like a pattern for one value. Without ^ and $ it is enough that the value appears somewhere, so a longer or broken value passes as well."+ev+" To check a whole value, write ^ at the start and $ at the end. To find values inside running text, \\b on both sides keeps a match from starting or ending in the middle of a word.",
      "^"+(top.length>1?"(?:"+src+")":src)+"$");
  }
  /* classes */
  var az=[],oddRange=[],pipe=[],empty=[];
  walk(P.root,function(x){
    if(x.t!=="class")return;
    if(!x.items.length&&!x.neg&&x.closed)empty.push(x.s);
    var letters=0;
    x.items.forEach(function(it){
      if(it.t==="lit"&&/[A-Za-z]/.test(it.ch))letters++;
      if(it.t==="lit"&&it.ch==="|"&&it.how==="plain")pipe.push(x);
      if(it.t!=="range"||it.a.ch.length!==1||it.b.ch.length!==1)return;
      var ca=cat(it.a.ch),cb=cat(it.b.ch);
      if(ca===3&&cb===2)az.push(src.slice(it.s,it.e));
      else if(ca!==cb&&(it.a.how==="plain"&&it.b.how==="plain"))oddRange.push(src.slice(it.s,it.e));
    });
  });
  if(az.length)add("high","az","The range "+az[0]+" holds more than letters",
    "Between Z and a the character table has six other characters: [ \\ ] ^ _ and the backtick. "+az[0]+" accepts all of them. Write A-Za-z for letters only.");
  if(oddRange.length)add("med","range","A hyphen in the middle of a class makes a range",
    "In "+oddRange[0]+" the hyphen is read as \"from "+oddRange[0].charAt(0)+" to "+oddRange[0].charAt(oddRange[0].length-1)+"\", which covers every character between the two in the character table. If you mean a real hyphen, put it last in the class or write \\- with a backslash.");
  if(pipe.length){var pc=pipe[0],inner=src.slice(pc.s+1+(pc.neg?1:0),pc.e-(pc.closed?1:0));
    add("med","pipe","A | inside [ ] does not mean \"or\"",
      "Inside brackets every character stands for itself. "+src.slice(pc.s,pc.e)+" fits exactly one character: any single one from the list, or the pipe itself. For whole words as alternatives use a group.",/^\w+(\|\w+)+$/.test(inner)&&!pc.neg?src.slice(0,pc.s)+"(?:"+inner+")"+src.slice(pc.e):null)}
  if(empty.length)add("med","empty","[] is an empty class in JavaScript",
    "At "+listPos(empty)+" the class closes straight away and can never match. grep, sed, PCRE and Python read a ] that comes first as a member of the class, so []abc] means something else there. To be clear in every tool, write \\] for the bracket.");
  /* multi-line */
  if((hasBol||hasEol)&&flags.indexOf("m")<0&&/\n/.test(text.replace(/\n+$/,"")))
    add("med","multiline","^ and $ without the m flag on a text with several lines",
      "The test text has "+text.replace(/\n+$/,"").split("\n").length+" lines. Without the m flag, ^ only fits at the very start of the whole text and $ only at its very end. Tick m to let them fit at every line. grep and sed read line by line anyway, so there the pattern behaves as if m were set.");
  /* literal brace */
  var lb=/\{,\d+\}/.exec(src);
  if(lb){var isLit=false;walk(P.root,function(x){if(x.t==="lit"&&x.s===lb.index&&x.how==="plain")isLit=true});
    if(isLit)add("med","brace",lb[0]+" is not a quantifier in JavaScript",
      "A quantifier needs the lower number. "+lb[0]+" is read as the plain text "+quote(lb[0])+". Python reads it as \"up to\", which makes this easy to carry over by mistake.",src.slice(0,lb.index)+"{0"+lb[0].slice(1)+src.slice(lb.index+lb[0].length))}
  /* escapes from other dialects */
  var alien=[];
  walk(P.root,function(x){if(x.t==="lit"&&x.how==="id"&&ALIEN[x.ch]&&alien.indexOf("\\"+x.ch)<0)alien.push("\\"+x.ch)});
  if(alien.length)add("med","alien",alien.join(" and ")+(alien.length>1?" have":" has")+" no special meaning in JavaScript",
    "PCRE, .NET or Python give "+(alien.length>1?"these escapes":"this escape")+" a meaning. JavaScript reads "+(alien.length>1?"them as plain letters":"it as a plain letter")+", so the pattern looks for the letter instead. Use ^ and $ for the start and end of the text.");
  /* repeated capture group */
  var rep=null;
  walk(P.root,function(x){if(!rep&&x.t==="group"&&x.num&&x.q&&x.q.max>1)rep=x});
  if(rep&&!nested)add("info","repcap","A repeated group keeps only its last round",
    "Group "+rep.num+" is repeated. After the match it holds what the last repetition matched, not all of them. To capture the whole run, put the repeat inside a group: ((?:...)+).");
  var order={high:0,med:1,info:2};
  out.sort(function(a,b){return order[a.sev]-order[b.sev]});
  return out;
}

/* ---------- the same pattern in other tools ---------- */
function shq(s){return "'"+s.replace(/'/g,"'\\''")+"'"}
function psq(s){return "'"+s.replace(/'/g,"''")+"'"}
function pyq(s){
  if(s.indexOf("'")<0)return "r'"+s+"'";
  if(s.indexOf("\"")<0)return "r\""+s+"\"";
  return "r'''"+s+"'''";
}
function fixedLen(a){
  var len=-2;
  a.alts.forEach(function(q){
    var l=0;
    q.items.forEach(function(x){
      if(l<0)return;
      var one;
      if(x.t==="group"){one=(x.k==="cap"||x.k==="named"||x.k==="nc")?fixedLen(x.body):0}
      else if(x.t==="lit"||x.t==="set"||x.t==="dot"||x.t==="class")one=1;
      else if(x.t==="bref")one=-1;
      else one=0;
      if(one<0||(x.q&&x.q.min!==x.q.max)){l=-1;return}
      l+=one*(x.q?x.q.min:1);
    });
    if(len===-2)len=l;else if(len!==l)len=-1;
  });
  return len;
}
function replTokens(r,P){
  var out=[],i=0,m,lit="";
  function flush(){if(lit){out.push({k:"lit",v:lit});lit=""}}
  while(i<r.length){
    var c=r.charAt(i),d=r.charAt(i+1);
    if(c==="$"&&d==="$"){lit+="$";i+=2;continue}
    if(c==="$"&&d==="&"){flush();out.push({k:"all"});i+=2;continue}
    if(c==="$"&&d==="<"&&P.groups.some(function(g){return g.name})&&(m=/^<([^>]+)>/.exec(r.slice(i+1)))){flush();out.push({k:"name",v:m[1]});i+=1+m[0].length;continue}
    if(c==="$"&&/[0-9]/.test(d)){
      var two=/^[0-9]{2}/.exec(r.slice(i+1)),num=two&&+two[0]>=1&&+two[0]<=P.ngroups?two[0]:d;
      if(+num>=1&&+num<=P.ngroups){flush();out.push({k:"num",n:+num});i+=1+num.length;continue}
    }
    lit+=c;i++;
  }
  flush();return out;
}
function variants(src,flags,repl){
  var P=parse(src);src=P.src;flags=cleanFlags(flags);repl=repl===undefined||repl===null?"":String(repl);
  var fi=flags.indexOf("i")>=0,fg=flags.indexOf("g")>=0,fm=flags.indexOf("m")>=0,fs=flags.indexOf("s")>=0;
  var ereNum={},nameNum={},cnt=0,has={};
  walk(P.root,function(x){
    if(x.t==="group"){if(x.k==="cap"||x.k==="named"||x.k==="nc"){cnt++;if(x.num)ereNum[x.num]=cnt}if(x.name)nameNum[x.name]=x.num;has[x.k]=1;if((x.k==="lb"||x.k==="nlb")&&fixedLen(x.body)<0)has.varlb=1}
    if(x.t==="set"){has.set=1;if(x.c==="d"||x.c==="w"||x.c==="D"||x.c==="W")has.dw=1}
    if(x.t==="dot")has.dot=1;
    if(x.t==="bol"||x.t==="eol")has.anchor=1;
    if(x.t==="class"){if(!x.items.length&&!x.neg)has.emptycls=1;x.items.forEach(function(it){if(it.t==="set"&&(it.c==="d"||it.c==="w"))has.dw=1})}
    if(x.t==="err"||(x.t==="group"&&x.k==="bad"))has.err=1;
  });
  function ser(D,C){
    function note(t){if(C.notes.indexOf(t)<0)C.notes.push(t)}
    function litOut(x,inClass){
      var raw=src.slice(x.as===undefined?x.s:x.as,x.ae===undefined?x.e:x.ae),c=x.ch;
      if(D==="ere"){
        if(x.how==="plain")return !inClass&&c==="{"?"\\{":raw;
        if(x.how==="id")return inClass?c:(".[\\()*+?{}|^$".indexOf(c)>=0?"\\"+c:c);
        if(x.how==="ctl"&&c==="\t"){note("\\t for a tab is not understood by every grep and sed. GNU sed knows it. In bash you can type the tab as $'\\t'.");return raw}
        if(x.how==="ctl"&&(c==="\n"||c==="\r")){note("These tools read one line at a time, so a line break inside the pattern never matches.");return raw}
        note("Character codes such as \\x41 or \\u00e9 are not supported. Type the character itself.");return raw}
      if(D==="pcre"&&x.how==="hex"&&raw.charAt(1)==="u")return "\\x{"+raw.slice(2)+"}";
      if(D==="js"&&x.how==="plain"&&c==="/"&&!inClass)return "\\/";
      return raw;
    }
    function clsOut(x){
      if(D!=="ere"){
        if(!x.items.length&&!x.neg&&D!=="js")note("The empty class [] exists only in JavaScript. Here a ] right after [ is a member of the class.");
        if(D==="pcre"){var o="["+(x.neg?"^":"");x.items.forEach(function(it){o+=it.t==="range"?litOut(it.a,true)+"-"+litOut(it.b,true):it.t==="lit"?litOut(it,true):src.slice(it.s,it.e)});return o+(x.closed?"]":"")}
        return src.slice(x.as,x.ae)}
      var parts="",close=false,hy=false,caret=false;
      x.items.forEach(function(it){
        if(it.t==="range"){parts+=it.a.ch+"-"+it.b.ch;return}
        if(it.t==="set"){
          if(it.c==="d")parts+="0-9";else if(it.c==="w")parts+="[:alnum:]_";else if(it.c==="s")parts+="[:space:]";
          else{note("\\"+it.c+" inside [ ] has no POSIX form. That class needs to be rewritten by hand.");parts+="\\"+it.c}
          return}
        if(it.t!=="lit"){parts+=src.slice(it.s,it.e);return}
        if(it.ch==="]")close=true;else if(it.ch==="-")hy=true;else if(it.ch==="^")caret=true;
        else if(it.how==="plain"||it.how==="id"||it.how==="ctl"&&it.ch==="\t")parts+=it.ch;
        else parts+=litOut(it,true);
      });
      if(!x.items.length){note(x.neg?"[^] for any character exists only in JavaScript. A dot is used instead.":"The empty class [] exists only in JavaScript.");return x.neg?".":"[]"}
      if(!x.neg&&caret&&!parts&&!close&&!hy)return "\\^";
      return "["+(x.neg?"^":"")+(close?"]":"")+parts+(caret?"^":"")+(hy?"-":"")+"]";
    }
    function one(x){
      var raw=src.slice(x.as,x.ae),o;
      switch(x.t){
        case "lit":o=litOut(x,false);break;
        case "set":
          if(D==="ere"){o={d:"[0-9]",D:"[^0-9]",w:"[[:alnum:]_]",W:"[^[:alnum:]_]",s:"[[:space:]]",S:"[^[:space:]]"}[x.c];note("The shorthands \\d, \\w and \\s are not part of POSIX. They are written out as bracket classes, which every grep and sed understands.")}
          else o=raw;break;
        case "wb":o=raw;if(D==="ere")note("\\b is an extension of GNU grep and GNU sed. On macOS and BSD it may not work.");break;
        case "class":o=clsOut(x);break;
        case "bref":
          if(x.name!==undefined){
            if(D==="ere"){o="\\"+(ereNum[nameNum[x.name]]||1);note("Backreferences in extended regex are an extension. GNU grep and sed support them.")}
            else if(D==="py")o="(?P="+x.name+")";else o=raw}
          else if(D==="ere"){var nn=ereNum[x.num]||x.num;if(nn>9)C.fail="a backreference above \\9";o="\\"+nn;note("Backreferences in extended regex are an extension. GNU grep and sed support them.")}
          else o=raw;
          break;
        case "group":
          var pre;
          if(x.k==="cap")pre="(";
          else if(x.k==="named"){
            if(D==="ere"){pre="(";note("Named groups do not exist. The group is a plain numbered group here.")}
            else if(D==="py"){pre="(?P<"+x.name+">";note("Python names a group with (?P<name>...). Since Python 3.11 nothing else changes.")}
            else pre="(?<"+x.name+">"}
          else if(x.k==="nc"){if(D==="ere"){pre="(";note("(?:...) does not exist. Every group captures, so group numbers can shift.")}else pre="(?:"}
          else if(x.k==="bad")pre=src.slice(x.s,x.body.s);
          else{pre={la:"(?=",nla:"(?!",lb:"(?<=",nlb:"(?<!"}[x.k];
            if(D==="ere")C.fail=x.k==="la"||x.k==="nla"?"lookahead":"lookbehind";
            else if((x.k==="lb"||x.k==="nlb")&&(D==="pcre"||D==="py")&&fixedLen(x.body)<0)note("A lookbehind must have a fixed length here. This one can vary in length and will be rejected.")}
          o=pre+altOut(x.body)+(x.closed?")":"");break;
        default:o=raw;
      }
      if(x.q){var qs=src.slice(x.q.s,x.q.e);
        if(D==="ere"&&x.q.lazy){qs=qs.slice(0,-1);note("Lazy quantifiers such as *? do not exist. The ? was removed, so the repeat is greedy here and can match more than in the tester.")}
        o+=qs}
      return o;
    }
    function altOut(a){return a.alts.map(function(q){return q.items.map(one).join("")}).join("|")}
    return altOut(P.root);
  }
  function ctx(){return{notes:[],fail:null}}
  var toks=replTokens(repl,P),rows=[];
  function replFor(D,delim){
    return toks.map(function(t){
      if(t.k==="all")return D==="sed"?"&":D==="py"?"\\g<0>":"$&";
      if(t.k==="num")return D==="sed"?"\\"+(ereNum[t.n]||t.n):D==="py"?"\\g<"+t.n+">":D==="ps"?"${"+t.n+"}":"$"+t.n;
      if(t.k==="name")return D==="sed"?"\\"+(ereNum[nameNum[t.v]]||1):D==="py"?"\\g<"+t.v+">":D==="ps"?"${"+t.v+"}":"$<"+t.v+">";
      var v=t.v;
      if(D==="sed"){v=v.replace(/[\\&]/g,"\\$&");if(delim)v=v.split(delim).join("\\"+delim)}
      else if(D==="py")v=v.replace(/\\/g,"\\\\");
      else v=v.replace(/\$/g,"$$$$");
      return v}).join("");
  }
  var lineNote="grep and sed read one line at a time. The s flag has no meaning there, and ^ and $ always work per line.";
  /* grep -E */
  var C=ctx(),ere=ser("ere",C),dash=ere.charAt(0)==="-"?"-e ":"";
  if(fs&&has.dot||fm&&has.anchor)C.notes.push(lineNote);
  rows.push(C.fail?{tool:"grep -E",code:null,ok:false,notes:["POSIX extended regex has no "+C.fail+". Use grep -P, or one of the languages below."]}
    :{tool:"grep -E",code:"grep -E "+(fi?"-i ":"")+dash+shq(ere)+" app.log",ok:true,notes:C.notes});
  /* grep -P */
  var C2=ctx(),pcre=ser("pcre",C2);
  C2.notes.unshift("GNU grep only. The grep on macOS and BSD has no -P.");
  if(fs&&has.dot||fm&&has.anchor)C2.notes.push(lineNote);
  rows.push({tool:"grep -P",code:"grep -P "+(fi?"-i ":"")+(pcre.charAt(0)==="-"?"-e ":"")+shq(pcre)+" app.log",ok:true,notes:C2.notes});
  /* sed -E */
  var C3=ctx(),sedp=ser("ere",C3),delim="/",cand=["/",",","#","|","@",";","!","%"],k;
  if(C3.fail)rows.push({tool:"sed -E",code:null,ok:false,notes:["POSIX extended regex has no "+C3.fail+". Use perl -pe or one of the languages below."]});
  else{
    for(k=0;k<cand.length;k++)if(sedp.indexOf(cand[k])<0&&repl.indexOf(cand[k])<0){delim=cand[k];break}
    if(k===cand.length)sedp=sedp.replace(/\//g,"\\/");
    if(fi)C3.notes.push("The I after the command for ignoring case is a GNU sed extension.");
    if(delim!=="/")C3.notes.push("The pattern contains a slash, so "+delim+" is used as the delimiter instead.");
    if(fs&&has.dot||fm&&has.anchor)C3.notes.push(lineNote);
    var sedcmd=repl?"s"+delim+sedp+delim+replFor("sed",delim)+delim+(fg?"g":"")+(fi?"I":""):(delim==="/"?"/":"\\"+delim)+sedp+delim+(fi?"I":"")+"p";
    if(repl&&toks.some(function(t){return t.k!=="lit"}))C3.notes.push("In the replacement, sed writes \\1 for group 1 and & for the whole match.");
    rows.push({tool:"sed -E",code:"sed -E "+(repl?"":"-n ")+shq(sedcmd)+" app.log",ok:true,notes:C3.notes});
  }
  /* PowerShell */
  var C4=ctx(),net=ser("net",C4),inl=(fm?"m":"")+(fs?"s":"");if(inl)net="(?"+inl+")"+net;
  if(!fi)C4.notes.push("-match and Select-String ignore case unless told otherwise. -cmatch and -CaseSensitive are the strict forms.");
  if(has.dw)C4.notes.push("In .NET, \\d and \\w also accept digits and letters of other scripts, not only 0 to 9 and a to z.");
  if(inl)C4.notes.push("The m and s flags are written into the pattern as (?"+inl+").");
  if(P.ngroups)C4.notes.push("After -match the groups are in $Matches, for example "+(P.groups[0].name?"$Matches."+P.groups[0].name:"$Matches[1]")+".");
  if(repl&&!fg)C4.notes.push("-replace always replaces every match.");
  rows.push({tool:"PowerShell",code:repl?"$line "+(fi?"-replace":"-creplace")+" "+psq(net)+", "+psq(replFor("ps")):"$line "+(fi?"-match":"-cmatch")+" "+psq(net)+"\nSelect-String -Path app.log -Pattern "+psq(net)+(fi?"":" -CaseSensitive")+(fg?" -AllMatches":""),ok:true,notes:C4.notes});
  /* Python */
  var C5=ctx(),py=ser("py",C5),pf=[];if(fi)pf.push("re.I");if(fm)pf.push("re.M");if(fs)pf.push("re.S");
  if(has.dw)C5.notes.push("In Python 3, \\d and \\w also accept digits and letters of other scripts. Add re.ASCII to limit them.");
  if(!repl&&fg&&P.ngroups)C5.notes.push("With groups in the pattern, findall returns the groups and not the whole match. Use re.finditer to get both.");
  rows.push({tool:"Python (re)",code:repl?"re.sub("+pyq(py)+", "+pyq(replFor("py"))+", text"+(fg?"":", count=1")+(pf.length?", flags="+pf.join(" | "):"")+")":"re."+(fg?"findall":"search")+"("+pyq(py)+", text"+(pf.length?", "+pf.join(" | "):"")+")",ok:true,notes:C5.notes});
  /* JavaScript */
  var C6=ctx(),js=ser("js",C6)||"(?:)";
  C6.notes.push("This is the engine the tester on this page runs.");
  rows.push({tool:"JavaScript",code:repl?"text.replace(/"+js+"/"+flags+", "+JSON.stringify(repl)+")":"text.match(/"+js+"/"+flags+")",ok:true,notes:C6.notes});
  return rows;
}

var api={explain:explain,traps:traps,variants:variants,run:run,parse:parse};
if(typeof document==="undefined"){
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else if(typeof self!=="undefined")self.onmessage=function(e){var d=e.data;self.postMessage({id:d.id,res:run(d.p,d.f,d.t,d.r)})};
  return;
}
window.rxTest=api;

/* ---------- page ---------- */
var $=function(i){return document.getElementById(i)};if(!$("rx-pat"))return;
var SELF=document.currentScript&&document.currentScript.src;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=String(x);return e}
var EX=[
 {id:"ipv4",name:"IPv4 address",p:"\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b",f:"g",
  t:"Oct  6 07:31:02 fw01 kernel: DROP IN=eth0 SRC=203.0.113.45 DST=10.87.4.12 PROTO=TCP DPT=3389\nOct  6 07:31:09 fw01 kernel: ACCEPT IN=eth1 SRC=10.87.4.20 DST=198.51.100.7 PROTO=UDP DPT=53\nagent version 4.12.0 started\nbad value 999.300.1.1 from a broken script",
  note:"The pattern checks the shape, not the numbers: 999.300.1.1 passes too. Checking that every part is 0 to 255 is easier in code than in a regex."},
 {id:"mail",name:"e-mail address",p:"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}",f:"g",
  t:"From: Anna Keller <anna.keller@example.org>\nTo: ops-team@mail.example.net, backup+alerts@example.org\nReply-To: nobody@localhost\nSubject: disk space on fs01",
  note:"A simple pattern that finds most addresses in a text. A regex that accepts exactly the valid addresses and nothing else does not exist. To know whether an address works, send a mail to it."},
 {id:"date",name:"date 2026-10-06",p:"\\b(\\d{4})-(\\d{2})-(\\d{2})\\b",f:"g",
  t:"Backup finished 2026-10-06 02:14, next run 2026-10-13.\nCertificate for intranet.example.org expires 2027-01-31.\nTicket 512026-10-0612 is not a date.",
  note:"Three groups: year, month and day. The pattern does not know that month 13 or day 32 do not exist."},
 {id:"win",name:"Windows log line",p:"^(?<date>\\d{4}-\\d{2}-\\d{2}) (?<time>\\d{2}:\\d{2}:\\d{2}), (?<level>Info|Warning|Error) +(?<source>\\S+) +(?<message>.*)$",f:"gm",
  t:"2026-10-06 07:30:02, Info                  CBS    Starting TrustedInstaller initialization.\n2026-10-06 07:30:04, Info                  CSI    00000001 Performing 1 operations\n2026-10-06 07:30:09, Warning               CBS    Could not load file, the store may be damaged\n2026-10-06 07:30:11, Error                 CBS    Failed to resolve package [HRESULT = 0x800f0831]",
  note:"A line from CBS.log, cut into named groups. The m flag lets ^ and $ fit at every line."},
 {id:"ssh",name:"failed SSH login",p:"Failed password for (?:invalid user )?(?<user>\\S+) from (?<addr>\\d{1,3}(?:\\.\\d{1,3}){3}) port (?<port>\\d+)",f:"g",
  t:"Oct  6 06:58:11 srv01 sshd[2211]: Failed password for invalid user admin from 203.0.113.45 port 51122 ssh2\nOct  6 06:58:14 srv01 sshd[2211]: Failed password for root from 203.0.113.45 port 51140 ssh2\nOct  6 07:02:40 srv01 sshd[2301]: Accepted publickey for deploy from 10.87.4.20 port 40112 ssh2\nOct  6 07:05:03 srv01 sshd[2340]: Failed password for backup from 198.51.100.7 port 60233 ssh2",
  note:"Lines from auth.log. The group named addr holds the source address, ready for counting attempts per address."},
 {id:"mac",name:"MAC address",p:"\\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\\b",f:"g",
  t:"10.87.4.1     00:00:5e:00:53:01   dynamic\n10.87.4.20    00-00-5E-00-53-A4   dynamic\n10.87.4.31    00:00:5e:00:53      incomplete",
  note:"Accepts colons or hyphens between the pairs. It also accepts a mix of both in one address."},
 {id:"unc",name:"UNC path",p:"\\\\\\\\(?<server>[A-Za-z0-9.-]+)\\\\(?<share>[^\\\\\\s]+)(?<path>(?:\\\\[^\\\\\\s]+)*)",f:"g",
  t:"net use Z: \\\\fs01.example.org\\projects\\2026\\plan.xlsx\nrobocopy D:\\data \\\\10.87.4.20\\backup$ /MIR\nlocal path C:\\Windows\\System32 does not count",
  note:"Every backslash of the path is written twice, because a single backslash is the escape character. Folder names with spaces end the match early."}
];
var worker=null,busy=null,pending=null,seq=0,timer=0,allow="",useWorker=!!window.Worker&&!!SELF&&!/[?&]rxsync=1/.test(location.search),hashT=0,last=null;
function state(){var f="";["g","i","m","s"].forEach(function(c){if($("rx-f"+c).checked)f+=c});return{p:$("rx-pat").value,f:f,t:$("rx-text").value,r:$("rx-rep").value}}
function setState(s){$("rx-pat").value=s.p||"";$("rx-text").value=s.t||"";$("rx-rep").value=s.r||"";["g","i","m","s"].forEach(function(c){$("rx-f"+c).checked=(s.f||"").indexOf(c)>=0})}
function readHash(){
  var h=location.hash.slice(1),o={},any=false;if(!h)return null;
  h.split("&").forEach(function(kv){var k=kv.indexOf("=");if(k<1)return;try{o[kv.slice(0,k)]=decodeURIComponent(kv.slice(k+1));any=true}catch(e){}});
  return any&&o.p!==undefined?{p:o.p,f:o.f||"",t:o.t||"",r:o.r||""}:null;
}
function writeHash(){
  var s=state(),h="#p="+encodeURIComponent(s.p)+"&f="+s.f+(s.t?"&t="+encodeURIComponent(s.t.slice(0,2000)):"")+(s.r?"&r="+encodeURIComponent(s.r):"");
  try{history.replaceState(null,"",h)}catch(e){}
}
function copyBtn(text){var b=el("button","btn ghost","Copy");b.type="button";b.addEventListener("click",function(){(navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy"},1400)},function(){b.textContent="Select and copy by hand"})});return b}
function finding(sev,label,title,paras,open){
  var d=el("details","finding f-"+sev),s=el("summary");if(open)d.open=true;
  s.append(el("span","sevtag s-"+sev,label),el("b",null,title));d.append(s);
  paras.forEach(function(p){d.append(typeof p==="string"?el("p",null,p):p)});return d;
}
function show(v){return v.replace(/\n/g,"\u21b5\n")}

function renderExplain(s){
  var box=$("rx-exp"),lines=explain(s.p,s.f),copy=el("div","rxpat"),ul=el("ul","rxtree");box.replaceChildren();
  copy.setAttribute("translate","no");copy.setAttribute("aria-hidden","true");
  function paint(a,b){copy.replaceChildren();if(a===undefined||b<=a){copy.textContent=s.p||" ";return}
    copy.append(document.createTextNode(s.p.slice(0,a)),el("mark","rxhl",s.p.slice(a,b)),document.createTextNode(s.p.slice(b)))}
  paint();
  lines.forEach(function(l){
    var li=el("li","rxline rxk-"+l.kind);li.style.setProperty("--d",l.depth);
    if(l.kind!=="note"){li.tabIndex=0;var piece=l.src.length>46?l.src.slice(0,44)+"\u2026":l.src;li.append(el("code","rxpiece",piece===""?"(empty)":piece))}
    li.append(el("span","rxmean",l.text));
    li.addEventListener("mouseenter",function(){paint(l.start,l.end)});li.addEventListener("focus",function(){paint(l.start,l.end)});
    li.addEventListener("mouseleave",function(){paint()});li.addEventListener("blur",function(){paint()});
    ul.append(li);
  });
  if(s.p)box.append(copy);
  box.append(ul);
}
function renderVariants(s,valid){
  var box=$("rx-var");box.replaceChildren();
  if(!s.p){box.append(el("p","dim","Type a pattern to see it written for other tools."));return}
  if(!valid){box.append(el("p","dim","The pattern has an error. Fix it first, then this table shows it for the other tools."));return}
  var tw=el("div","tw"),tb=el("table","tbl rxvar"),th=el("thead"),tr=el("tr"),body=el("tbody");
  ["Tool","Command","What is different there"].forEach(function(h){tr.append(el("th",null,h))});th.append(tr);tb.append(th,body);
  variants(s.p,s.f,s.r).forEach(function(v){
    var r=el("tr"),c1=el("th",null,v.tool),c2=el("td"),c3=el("td");c1.scope="row";
    if(v.code){var pre=el("pre","rxcmd",v.code);pre.setAttribute("translate","no");c2.append(pre,copyBtn(v.code))}else c2.append(el("span","dim","cannot be written for this tool"));
    if(v.notes.length){var ul=el("ul","rxnotes");v.notes.forEach(function(n){ul.append(el("li",null,n))});c3.append(ul)}else c3.append(el("span","dim","Works as written."));
    r.append(c1,c2,c3);body.append(r);
  });
  tw.append(tb);box.append(tw);
  box.append(el("p","dim rxsmall","app.log, $line and text are placeholders. grep prints the whole line that contains a match. Add -o to print only the matching part."));
}
function renderTraps(s,res){
  var box=$("rx-traps"),list=[];box.replaceChildren();
  try{list=traps(s.p,s.f,s.t,res||null)}catch(e){list=[]}
  if(!s.p){box.append(el("p","dim","No pattern yet."));return}
  if(!list.length){box.append(el("p","dim","None of the usual traps were found in this pattern. That is not a proof that it is right: test it against lines that should match and lines that should not."));return}
  list.forEach(function(t,i){
    var paras=[t.text];
    if(t.fix){var w=el("div","csrow"),pre=el("pre",null,t.fix);pre.setAttribute("translate","no");var use=el("button","btn ghost","Use this pattern");use.type="button";
      use.addEventListener("click",function(){$("rx-pat").value=t.fix;update();$("rx-pat").focus()});
      var c=el("div","ctl rxfixctl");c.append(use,copyBtn(t.fix));w.append(el("p","dim rxsmall",t.id==="noanchor"?"For checking a whole value:":"Probably meant:"),pre,c);paras.push(w)}
    box.append(finding(t.sev,t.sev==="high"?"likely bug":t.sev==="med"?"check":"note",t.title,paras,t.sev==="high"||i===0));
  });
}
function statTile(k,v,sub){var d=el("div","stat");d.append(el("span","stat-k",k));var b=el("b","stat-v",v);b.setAttribute("data-raw","1");d.append(b);if(sub)d.append(el("span","stat-s",sub));return d}
function renderResult(s,res,P){
  var box=$("rx-out");box.replaceChildren();
  if(!s.p){box.append(el("p","dim","Type a pattern above, or pick one of the examples."));return}
  if(res.err){
    var paras=[res.err.plain,"The engine says: "+res.err.raw+"."];
    if(P.errs.length){var ul=el("ul","rxnotes");P.errs.forEach(function(e){ul.append(el("li",null,e.msg))});paras.push(ul)}
    else paras.push("The usual causes: a ( or [ that is never closed, a quantifier such as * or + with nothing in front of it, or a backslash at the very end.");
    box.append(finding("high","error","This pattern is not valid",paras,true));return;
  }
  if(res.timeout){
    box.append(finding("high","stopped","Matching was stopped after two seconds",["The engine did not finish. This is what runaway backtracking looks like: the pattern can split the text in so many ways that trying them all takes minutes or years. The page stopped the run so the tab stays usable. The traps section below usually names the cause."],true));return;
  }
  if(res.refused){
    var why=el("p",null,"This pattern has a repeat inside a repeat (see the traps section). On the wrong text the browser's regex engine can run for a very long time, and a running match cannot be interrupted from this page. Because of that the pattern was not run."),go=el("button","btn","Run anyway");go.type="button";
    go.addEventListener("click",function(){allow=s.p;update()});
    box.append(finding("high","not run","This pattern was not run",[why,"If the tab stops responding after you run it, close the tab.",go],true));return;
  }
  var text=res.truncated?s.t.slice(0,MAXTEXT):s.t,n=res.total,lines=text?text.split("\n").length:0,glob=s.f.indexOf("g")>=0;
  var stats=el("div","stats");stats.style.setProperty("--cols",3);
  stats.append(statTile("matches",n+(res.capped?"+":""),!glob&&n?"first match only, g is off":res.capped==="count"?"stopped at the limit":res.capped==="time"?"stopped after one second":"in the test text"),
    statTile("capture groups",P.ngroups,P.groups.filter(function(g){return g.name}).length?P.groups.filter(function(g){return g.name}).length+" named":P.ngroups?"numbered":"none in this pattern"),
    statTile("test text",text.length,"characters in "+lines+(lines===1?" line":" lines")));
  box.append(stats);
  if(res.capped==="count")box.append(el("p","rxwarn","Only the first "+MAXMATCH+" matches are shown. The page stops there to stay fast."));
  if(res.capped==="time")box.append(el("p","rxwarn","Matching took longer than one second and was stopped after "+n+" matches. A pattern this slow on this little text will be a problem on a real log file."));
  if(res.truncated)box.append(el("p","rxwarn","The test text is longer than "+MAXTEXT/1000+" kB. Only the first "+MAXTEXT/1000+" kB were searched."));
  if(!text){box.append(el("p","dim","Add some test text to see matches."));}
  else{
    var pre=el("pre","rxout"),pos=0,marks=[];pre.tabIndex=0;pre.setAttribute("role","region");pre.setAttribute("aria-label","Test text with the matches highlighted");pre.setAttribute("translate","no");
    res.matches.forEach(function(m,k){
      if(m.i>pos)pre.append(document.createTextNode(text.slice(pos,m.i)));
      var mk=el("mark","rxm rxm"+(k%2)+(m.e===m.i?" rxz":""),text.slice(m.i,m.e));mk.title="match "+(k+1)+", position "+m.i+(m.e>m.i?" to "+m.e:", empty");
      pre.append(mk);marks.push(mk);pos=m.e;
    });
    if(pos<text.length)pre.append(document.createTextNode(text.slice(pos)));
    box.append(pre);
    if(!n)box.append(el("p","dim","No match. "+(s.f.indexOf("i")<0&&/[A-Za-z]/.test(s.p)?"Upper and lower case count unless the i flag is set.":"Check the traps section below.")));
    else{
      var tw=el("div","tw"),tb=el("table","tbl rxtbl"),hd=el("tr"),body=el("tbody"),cap=el("caption","rxcap",n>ROWS?"The first "+ROWS+" of "+n+" matches. Point at a row to see the match in the text.":"Point at a row to see the match in the text.");
      ["#","Match","Position"].forEach(function(h){hd.append(el("th",null,h))});
      P.groups.forEach(function(g){hd.append(el("th",null,g.name?g.num+" "+g.name:"Group "+g.num))});
      var th=el("thead");th.append(hd);tb.append(cap,th,body);
      res.matches.slice(0,ROWS).forEach(function(m,k){
        var r=el("tr"),mt=text.slice(m.i,m.e),ln=text.slice(0,m.i).split("\n").length;
        r.append(el("td",null,k+1));
        var c=el("td","rxval");if(mt==="")c.append(el("span","dim","empty"));else c.textContent=show(mt.length>200?mt.slice(0,200)+"\u2026":mt);r.append(c);
        r.append(el("td","rxpos",m.i+(m.e>m.i?" to "+m.e:"")+(lines>1?", line "+ln:"")));
        (m.g||[]).forEach(function(g){var d=el("td","rxval");if(g===null)d.append(el("span","dim","not used"));else if(g==="")d.append(el("span","dim","empty"));else d.textContent=show(g);r.append(d)});
        r.addEventListener("mouseenter",function(){var mk=marks[k];mk.classList.add("rxon");if(mk.offsetTop<pre.scrollTop||mk.offsetTop>pre.scrollTop+pre.clientHeight-24)pre.scrollTop=Math.max(0,mk.offsetTop-40)});
        r.addEventListener("mouseleave",function(){marks[k].classList.remove("rxon")});
        body.append(r);
      });
      tw.append(tb);box.append(tw);
    }
  }
  if(s.r){
    box.append(el("h3","rxh3","after replacing"));
    if(!res.repl||res.repl.skipped)box.append(el("p","dim","The replacement preview was skipped because matching was stopped."));
    else{var w=el("div","csrow"),rp=el("pre","rxrep",res.repl.out);rp.setAttribute("translate","no");rp.tabIndex=0;w.append(rp,copyBtn(res.repl.out));box.append(w);
      if(res.repl.cut)box.append(el("p","dim rxsmall","Only the first 20,000 characters of the result are shown."));
      box.append(el("p","dim rxsmall","In the replacement, $1 stands for group 1, $<name> for a named group and $& for the whole match."+(s.f.indexOf("g")<0?" Without the g flag only the first match is replaced.":"")))}
  }
}
function deliver(job,res){
  if(job.id!==seq)return;
  last={s:job.s,res:res};
  renderResult(job.s,res,job.P);
  renderTraps(job.s,res.err||res.timeout||res.refused?null:res);
}
function spawn(){
  try{worker=new Worker(SELF)}catch(e){worker=null;useWorker=false;return}
  worker.onmessage=function(e){var j=busy;if(!j||e.data.id!==j.id)return;clearTimeout(timer);busy=null;deliver(j,e.data.res);next()};
  worker.onerror=function(){clearTimeout(timer);var j=busy;busy=null;worker=null;useWorker=false;if(j){pending=pending||j;next()}};
}
function next(){
  if(busy||!pending)return;
  var j=pending;pending=null;
  if(useWorker&&!worker)spawn();
  if(useWorker&&worker){
    busy=j;worker.postMessage({id:j.id,p:j.s.p,f:j.s.f,t:j.s.t,r:j.s.r});
    timer=setTimeout(function(){if(busy!==j)return;try{worker.terminate()}catch(e){}worker=null;busy=null;deliver(j,{timeout:true});next()},2000);
    return;
  }
  /* no worker: a running match cannot be stopped, so risky patterns need a click first */
  var risky=false;try{risky=traps(j.s.p,j.s.f,"",null).some(function(t){return t.id==="nested"})}catch(e){}
  if(risky&&allow!==j.s.p){deliver(j,{refused:true});return}
  deliver(j,run(j.s.p,j.s.f,j.s.t,j.s.r));
}
function update(){
  var s=state(),P=parse(s.p),valid=true;
  try{new RegExp(s.p,s.f)}catch(e){valid=false}
  renderExplain(s);renderVariants(s,valid);
  [].forEach.call(document.querySelectorAll("#rx-chips .chipbtn"),function(b){var x=EX[+b.getAttribute("data-i")],on=x.p===s.p&&x.t===s.t;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on?"true":"false");if(on)$("rx-exnote").textContent=x.note});
  if(!document.querySelector("#rx-chips .chipbtn.on"))$("rx-exnote").textContent="";
  clearTimeout(hashT);hashT=setTimeout(writeHash,250);
  seq++;
  if(!s.p){busy=null;pending=null;renderResult(s,{},P);renderTraps(s,null);return}
  pending={id:seq,s:s,P:P};
  if(busy&&worker){clearTimeout(timer);try{worker.terminate()}catch(e){}worker=null;busy=null}
  next();
}
var chips=$("rx-chips");
EX.forEach(function(x,i){var b=el("button","chipbtn",x.name);b.type="button";b.setAttribute("data-i",i);b.setAttribute("aria-pressed","false");
  b.addEventListener("click",function(){setState({p:x.p,f:x.f,t:x.t,r:""});update()});chips.append(b)});
["rx-pat","rx-text","rx-rep","rx-fg","rx-fi","rx-fm","rx-fs"].forEach(function(i){$(i).addEventListener("input",update);$(i).addEventListener("change",function(){if(i.indexOf("rx-f")===0)update()})});
window.addEventListener("hashchange",function(){var h=readHash(),s=state();if(h&&(h.p!==s.p||h.f!==s.f||h.r!==s.r||h.t!==s.t.slice(0,2000))){setState(h);update()}});
setState(readHash()||{p:EX[0].p,f:EX[0].f,t:EX[0].t,r:""});
update();
})();
