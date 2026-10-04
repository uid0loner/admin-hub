(function(){
if(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var sel=".card,.dcard,.snip,.story-card,.lesson-box,section,.timeline .tl-entry";
var els=[].slice.call(document.querySelectorAll(sel));
if(!els.length)return;
function vis(el){var r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}
var targets=els.filter(function(el){return !vis(el)});
if(!targets.length)return;
targets.forEach(function(el){el.classList.add("reveal")});
var io=new IntersectionObserver(function(entries){
  entries.forEach(function(en){
    if(en.isIntersecting){en.target.classList.add("in");io.unobserve(en.target)}
  })
},{threshold:.1,rootMargin:"0px 0px -30px 0px"});
targets.forEach(function(el){io.observe(el)});
})();
