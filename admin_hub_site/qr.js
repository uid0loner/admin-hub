/* admin_hub QR encoder: byte mode, versions 1 to 40, error correction L/M/Q/H, best mask by penalty score.
   Written for this site after the ISO/IEC 18004 procedure. No library, nothing leaves the page.
   window.ahQR.make(text, "M") -> {size, get(x,y), version, ecl}; window.ahQR.svg(code, opts) -> SVG string */
(function(){
"use strict";
var ECL={L:[0,1],M:[1,0],Q:[2,3],H:[3,2]};             // [table index, format bits]
var ECC_PER_BLOCK=[
 [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
 [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
 [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
 [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]];
var BLOCKS=[
 [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
 [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
 [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
 [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]];

function rawModules(v){var r=(16*v+128)*v+64;if(v>=2){var n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r}
function dataCodewords(v,e){return Math.floor(rawModules(v)/8)-ECC_PER_BLOCK[e][v]*BLOCKS[e][v]}

/* Reed-Solomon over GF(256), polynomial 0x11D */
function mul(x,y){var z=0;for(var i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z}
function divisor(deg){var r=[];for(var i=0;i<deg-1;i++)r.push(0);r.push(1);var root=1;
 for(i=0;i<deg;i++){for(var j=0;j<r.length;j++){r[j]=mul(r[j],root);if(j+1<r.length)r[j]^=r[j+1]}root=mul(root,2)}return r}
function remainder(data,div){var r=div.map(function(){return 0});
 data.forEach(function(b){var f=b^r.shift();r.push(0);div.forEach(function(c,i){r[i]^=mul(c,f)})});return r}

function utf8(s){var out=[],b=unescape(encodeURIComponent(s));for(var i=0;i<b.length;i++)out.push(b.charCodeAt(i));return out}

function make(text,level){
 level=ECL[level]?level:"M";var e=ECL[level][0],bytes=utf8(text||""),v,cap;
 for(v=1;v<=40;v++){cap=dataCodewords(v,e)*8;var need=4+(v<10?8:16)+bytes.length*8;if(need<=cap)break}
 if(v>40)throw new Error("Text too long for a QR code");
 // bit stream
 var bits=[];function put(val,len){for(var i=len-1;i>=0;i--)bits.push((val>>>i)&1)}
 put(4,4);put(bytes.length,v<10?8:16);bytes.forEach(function(b){put(b,8)});
 put(0,Math.min(4,cap-bits.length));put(0,(8-bits.length%8)%8);
 for(var pad=0xEC;bits.length<cap;pad^=0xEC^0x11)put(pad,8);
 var data=[];for(var i=0;i<bits.length;i+=8){var b=0;for(var j=0;j<8;j++)b=(b<<1)|bits[i+j];data.push(b)}
 // blocks and interleave
 var nb=BLOCKS[e][v],eb=ECC_PER_BLOCK[e][v],raw=Math.floor(rawModules(v)/8),nshort=nb-raw%nb,shortLen=Math.floor(raw/nb);
 var div=divisor(eb),blocks=[],k=0;
 for(i=0;i<nb;i++){var len=shortLen-eb+(i<nshort?0:1),dat=data.slice(k,k+len);k+=len;
  var ecc=remainder(dat,div);if(i<nshort)dat.push(0);blocks.push(dat.concat(ecc))}
 var cw=[];for(i=0;i<blocks[0].length;i++)blocks.forEach(function(bl,jj){if(i!==shortLen-eb||jj>=nshort)cw.push(bl[i])});
 // matrix
 var size=v*4+17,mod=[],fn=[];for(i=0;i<size;i++){mod.push(new Array(size).fill(false));fn.push(new Array(size).fill(false))}
 function set(x,y,d){mod[y][x]=d;fn[y][x]=true}
 for(i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
 function finder(cx,cy){for(var dy=-4;dy<=4;dy++)for(var dx=-4;dx<=4;dx++){var d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;
  if(x>=0&&x<size&&y>=0&&y<size)set(x,y,d!==2&&d!==4)}}
 finder(3,3);finder(size-4,3);finder(3,size-4);
 var al=[];if(v>1){var n=Math.floor(v/7)+2,step=Math.floor((v*8+n*3+5)/(n*4-4))*2;al=[6];for(var p=size-7;al.length<n;p-=step)al.splice(1,0,p)}
 al.forEach(function(ax,ii){al.forEach(function(ay,jj){if((ii===0&&jj===0)||(ii===0&&jj===al.length-1)||(ii===al.length-1&&jj===0))return;
  for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++)set(ax+dx,ay+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)})});
 function format(mask){var d=ECL[level][1]<<3|mask,r=d;for(var q=0;q<10;q++)r=(r<<1)^((r>>>9)*0x537);var b=(d<<10|r)^0x5412;
  for(q=0;q<=5;q++)set(8,q,((b>>>q)&1)!==0);set(8,7,((b>>>6)&1)!==0);set(8,8,((b>>>7)&1)!==0);set(7,8,((b>>>8)&1)!==0);
  for(q=9;q<15;q++)set(14-q,8,((b>>>q)&1)!==0);for(q=0;q<8;q++)set(size-1-q,8,((b>>>q)&1)!==0);
  for(q=8;q<15;q++)set(8,size-15+q,((b>>>q)&1)!==0);set(8,size-8,true)}
 format(0);
 if(v>=7){var r=v;for(i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);var vb=v<<12|r;
  for(i=0;i<18;i++){var bt=((vb>>>i)&1)!==0,a=size-11+i%3,c=Math.floor(i/3);set(a,c,bt);set(c,a,bt)}}
 // place data
 var bi=0;for(var right=size-1;right>=1;right-=2){if(right===6)right=5;
  for(var vert=0;vert<size;vert++)for(j=0;j<2;j++){var x=right-j,up=((right+1)&2)===0,y=up?size-1-vert:vert;
   if(!fn[y][x]&&bi<cw.length*8){mod[y][x]=((cw[bi>>>3]>>>(7-(bi&7)))&1)!==0;bi++}}}
 // masks
 var MASK=[function(x,y){return(x+y)%2===0},function(x,y){return y%2===0},function(x){return x%3===0},function(x,y){return(x+y)%3===0},
  function(x,y){return(Math.floor(x/3)+Math.floor(y/2))%2===0},function(x,y){return x*y%2+x*y%3===0},
  function(x,y){return(x*y%2+x*y%3)%2===0},function(x,y){return((x+y)%2+x*y%3)%2===0}];
 function apply(m){for(var y=0;y<size;y++)for(var x=0;x<size;x++)if(!fn[y][x]&&MASK[m](x,y))mod[y][x]=!mod[y][x]}
 function penalty(){var s=0,x,y,run,dark=0;
  function lineScore(get){var sc=0;for(var a=0;a<size;a++){var col=get(a,0),rl=1,hist=[];
   for(var b=1;b<=size;b++){var cur=b<size?get(a,b):null;if(cur===col){rl++}else{if(rl>=5)sc+=rl-2;hist.push([col,rl]);col=cur;rl=1}}
   // finder-like 1:1:3:1:1 with 4 light on one side
   var seq=[false,0].concat([]);var line=[];for(b=0;b<size;b++)line.push(get(a,b));
   for(b=0;b+6<size;b++)if(line[b]&&!line[b+1]&&line[b+2]&&line[b+3]&&line[b+4]&&!line[b+5]&&line[b+6]){
    var lb=true,rb=true;for(var t=1;t<=4;t++){if(b-t>=0&&line[b-t])lb=false;if(b+6+t<size&&line[b+6+t])rb=false}if(lb||rb)sc+=40}}
   return sc}
  s+=lineScore(function(a,b){return mod[a][b]});s+=lineScore(function(a,b){return mod[b][a]});
  for(y=0;y<size-1;y++)for(x=0;x<size-1;x++){var c=mod[y][x];if(c===mod[y][x+1]&&c===mod[y+1][x]&&c===mod[y+1][x+1])s+=3}
  for(y=0;y<size;y++)for(x=0;x<size;x++)if(mod[y][x])dark++;
  s+=Math.floor(Math.abs(dark*20-size*size*10)/(size*size))*10;return s}
 var best=0,bestScore=Infinity;
 for(var m=0;m<8;m++){apply(m);format(m);var sc=penalty();if(sc<bestScore){bestScore=sc;best=m}apply(m)}
 apply(best);format(best);
 return {size:size,version:v,ecl:level,mask:best,get:function(x,y){return x>=0&&x<size&&y>=0&&y<size&&mod[y][x]}};
}

function svg(code,o){o=o||{};var q=o.quiet==null?4:o.quiet,n=code.size+q*2,d="";
 for(var y=0;y<code.size;y++)for(var x=0;x<code.size;x++)if(code.get(x,y))d+="M"+(x+q)+","+(y+q)+"h1v1h-1z";
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+n+' '+n+'" shape-rendering="crispEdges"'+(o.cls?' class="'+o.cls+'"':'')+' role="img" aria-label="QR code">'+
  '<rect width="'+n+'" height="'+n+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>'}

window.ahQR={make:make,svg:svg};
})();
