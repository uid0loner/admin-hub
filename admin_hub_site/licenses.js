(function(){
var sel=document.getElementById("lic-cat"), diff=document.getElementById("lic-diff");
if(!sel)return;
var rows=[].slice.call(document.querySelectorAll(".lic tbody tr"));

function rowDiffers(tr){
  if(tr.classList.contains("cathead"))return true;
  var cells=[].slice.call(tr.querySelectorAll("td")).slice(1);
  var vals=cells.map(function(td){return td.textContent.trim()});
  return vals.some(function(v){return v!==vals[0]});
}

function run(){
  var cat=sel.value, onlyDiff=diff.checked;
  var lastVisibleCat=null;
  rows.forEach(function(tr){
    if(tr.classList.contains("cathead")){
      tr.hidden = !!cat && tr.getAttribute("data-cat")!==cat;
      return;
    }
    var catMatch = !cat || tr.getAttribute("data-cat")===cat;
    var diffMatch = !onlyDiff || rowDiffers(tr);
    tr.hidden = !(catMatch && diffMatch);
  });
}
sel.addEventListener("change",run);
diff.addEventListener("change",run);
})();
