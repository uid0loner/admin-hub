(function(){
var NS="http://www.w3.org/2000/svg",F=window.FLOWS||[];
function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function build(box,f){
var n=f.actors.length,W=Math.max(680,n*200),cw=W/n,top=72,rh=62,H=top+f.steps.length*rh+16,cx=f.actors.map(function(_,i){return cw*(i+.5)}),cur=1,timer=null,g=[],bw=Math.min(212,cw-14);
var wrap=document.createElement("div");wrap.className="fw";wrap.tabIndex=0;wrap.setAttribute("aria-label",f.title+" diagram. Use the left and right arrow keys to step through.");
var svg=el("svg",{viewBox:"0 0 "+W+" "+H,"class":"fsvg",role:"img","aria-label":f.title});
f.actors.forEach(function(a,i){var x=cx[i];el("line",{x1:x,y1:44,x2:x,y2:H,"class":"life"},svg);el("rect",{x:x-bw/2,y:8,width:bw,height:36,rx:6,"class":"box"},svg);var t=el("text",{x:x,y:31,"text-anchor":"middle"},svg);t.textContent=a});
f.steps.forEach(function(s,i){var y=top+i*rh,x1=cx[s.f],x2=cx[s.t],gr=el("g",{"class":"st"+(s.k?" atk":"")},svg),t;
if(s.f===s.t){el("path",{d:"M"+x1+" "+y+"H"+(x1+70)+"V"+(y+26)+"H"+(x1+10)},gr);el("polygon",{points:(x1+2)+","+(y+26)+" "+(x1+12)+","+(y+21)+" "+(x1+12)+","+(y+31)},gr);t=el("text",{x:x1+80,y:y+18},gr)}
else{var d=x2>x1?1:-1;el("line",{x1:x1,y1:y,x2:x2-d*2,y2:y},gr);el("polygon",{points:x2+","+y+" "+(x2-d*11)+","+(y-5)+" "+(x2-d*11)+","+(y+5)},gr);t=el("text",{x:(x1+x2)/2,y:y-9,"text-anchor":"middle"},gr)}
t.textContent=(i+1)+". "+s.l;g.push(gr)});
wrap.appendChild(svg);
var ctl=document.createElement("div");ctl.className="ctl";var cnt=document.createElement("span");cnt.className="fcnt";
var cap=document.createElement("div");cap.className="fcap";cap.setAttribute("aria-live","polite");
function show(){g.forEach(function(e,i){e.setAttribute("class","st"+(f.steps[i].k?" atk":"")+(i<cur?" on":"")+(i===cur-1?" now":""))});
var s=f.steps[cur-1];cnt.textContent="Step "+cur+" of "+f.steps.length;cap.replaceChildren();
var h=document.createElement("b");h.textContent=cur+". "+s.l;var p=document.createElement("p");p.textContent=s.d;cap.append(h,p);
if(s.n){var q=document.createElement("p");q.className="fnote"+(s.k?" atk":"");q.textContent=s.n;cap.append(q)}
if(wrap.scrollWidth>wrap.clientWidth){var mid=(cx[s.f]+cx[s.t])/2/W*svg.getBoundingClientRect().width;wrap.scrollLeft=Math.max(0,mid-wrap.clientWidth/2)}}
function stop(){if(timer){clearInterval(timer);timer=null;play.textContent="play"}}
function go(d){stop();cur=Math.max(1,Math.min(f.steps.length,cur+d));show()}
function btn(t,fn){var b=document.createElement("button");b.className="btn";b.type="button";b.textContent=t;b.addEventListener("click",fn);ctl.append(b);return b}
btn("back",function(){go(-1)});btn("next",function(){go(1)});
var play=btn("play",function(){if(timer){stop();return}if(cur>=f.steps.length)cur=0;play.textContent="pause";cur++;show();
timer=setInterval(function(){if(cur>=f.steps.length){stop();return}cur++;show()},2600)});
btn("reset",function(){stop();cur=1;show()});ctl.append(cnt);
wrap.addEventListener("keydown",function(e){if(e.key==="ArrowRight"){e.preventDefault();go(1)}else if(e.key==="ArrowLeft"){e.preventDefault();go(-1)}});
box.append(wrap,ctl,cap);show()}
document.querySelectorAll(".fdiag").forEach(function(b){var f=F[+b.getAttribute("data-i")];if(f)build(b,f)});
})();
