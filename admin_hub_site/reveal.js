/* scroll-reveal was removed on purpose: content is simply there. What remains is the card spotlight. */
(function(){
if(!window.matchMedia||!matchMedia("(hover:hover)").matches)return;
document.addEventListener("pointermove",function(e){
  var c=e.target&&e.target.closest?e.target.closest(".card,.dcard,.story-card"):null;
  if(!c)return;
  var r=c.getBoundingClientRect();
  c.style.setProperty("--mx",(e.clientX-r.left)+"px");
  c.style.setProperty("--my",(e.clientY-r.top)+"px");
},{passive:true});
})();
