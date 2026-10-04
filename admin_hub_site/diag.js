(function(){
var T=window.TREES||{},box=document.getElementById("diag");
if(!box)return;
var state={tree:null,node:null,trail:[]};

function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function btn(txt,fn,cls){var b=el("button",cls||"btn");b.type="button";b.textContent=txt;b.addEventListener("click",fn);return b}

function renderPicker(){
  state.tree=null;state.node=null;state.trail=[];
  history.replaceState(null,"","diagnose.html");
  box.replaceChildren();
  var grid=el("div","grid");
  Object.keys(T).forEach(function(id){
    var tr=T[id],a=el("a","card");a.href="#"+id;
    a.appendChild(el("b",null,tr.title));
    a.appendChild(el("p",null,tr.desc));
    a.appendChild(el("small",null,tr.steps+" questions, max"));
    a.addEventListener("click",function(e){e.preventDefault();openTree(id)});
    grid.appendChild(a)
  });
  box.appendChild(grid)
}

function openTree(id){
  var tr=T[id];if(!tr)return renderPicker();
  state.tree=id;state.node=tr.start;state.trail=[];
  history.replaceState(null,"","diagnose.html#"+id);
  render()
}

function render(){
  var tr=T[state.tree];if(!tr)return renderPicker();
  var n=tr.nodes[state.node];if(!n)return renderPicker();
  box.replaceChildren();

  var top=el("div","dtop");
  top.appendChild(btn("← all problems",function(){renderPicker()},"btn ghost"));
  var h=el("h2",null,tr.title);h.style.margin="0 0 4px";
  box.appendChild(h);
  box.appendChild(top);

  if(state.trail.length){
    var bc=el("div","dtrail");
    state.trail.forEach(function(s){bc.appendChild(el("span",null,s))});
    box.appendChild(bc)
  }

  var card=el("div","dcard"+(n.leaf?" dleaf":""));
  if(n.leaf){
    card.appendChild(el("h3",null,n.h));
    card.appendChild(el("p",null,n.p));
    if(n.lk&&n.lk.length){
      var ul=el("ul","dlinks");
      n.lk.forEach(function(l){var li=el("li");var a=el("a",null,l[0]);a.href=l[1];li.appendChild(a);ul.appendChild(li)});
      card.appendChild(ul)
    }
    var ctl=el("div","dctl");
    if(state.trail.length)ctl.appendChild(btn("back",function(){goBack()}));
    ctl.appendChild(btn("start over",function(){openTree(state.tree)}));
    ctl.appendChild(btn("different problem",function(){renderPicker()},"btn ghost"));
    card.appendChild(ctl)
  }else{
    card.appendChild(el("h3",null,n.q));
    var opts=el("div","dopts");
    n.o.forEach(function(o){
      opts.appendChild(btn(o[0],function(){
        state.trail.push(n.q+" → "+o[0]);
        state.node=o[1];
        render()
      }))
    });
    card.appendChild(opts);
    if(state.trail.length){
      var ctl2=el("div","dctl");
      ctl2.appendChild(btn("back",function(){goBack()},"btn ghost"));
      card.appendChild(ctl2)
    }
  }
  box.appendChild(card)
}

function goBack(){
  if(!state.trail.length)return;
  state.trail.pop();
  var tr=T[state.tree],cur=tr.start,path=state.trail.slice();
  for(var i=0;i<path.length;i++){
    var n=tr.nodes[cur];
    var lbl=path[i].split(" → ")[1];
    var m=n.o.filter(function(o){return o[0]===lbl})[0];
    if(m)cur=m[1]
  }
  state.node=cur;
  render()
}

var h0=location.hash.replace("#","");
if(h0&&T[h0])openTree(h0);else renderPicker();
window.addEventListener("hashchange",function(){
  var h=location.hash.replace("#","");
  if(h&&T[h]&&h!==state.tree)openTree(h)
});
})();
