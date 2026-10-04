(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
var inp=$("cidr-in"), rng=$("pfx-range"), pfxVal=$("pfx-val"), out=$("cidr-out"), err=$("cidr-err"), map=$("cidr-map"), quick=$("cidr-quick");

function ipToInt(ip){
  var p=ip.split(".");
  if(p.length!==4)return null;
  var n=0;
  for(var i=0;i<4;i++){
    var v=Number(p[i]);
    if(!/^\d{1,3}$/.test(p[i])||v<0||v>255)return null;
    n=(n<<8)|v;
  }
  return n>>>0;
}
function intToIp(n){
  return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join(".");
}
function maskForPrefix(p){
  if(p<=0)return 0;
  if(p>=32)return 0xFFFFFFFF;
  return (0xFFFFFFFF<<(32-p))>>>0;
}
function parseCidr(s){
  s=s.trim();
  var m=s.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s*\/\s*(\d{1,2})$/);
  if(!m)return {error:"Use the form address/prefix, e.g. 10.0.0.0/22."};
  var ip=ipToInt(m[1]);
  if(ip===null)return {error:"That doesn't look like a valid IPv4 address."};
  var p=Number(m[2]);
  if(p<0||p>32)return {error:"Prefix length must be between 0 and 32."};
  return {ip:ip, ipStr:m[1], prefix:p};
}

function render(ip, prefix){
  var mask=maskForPrefix(prefix);
  var network=(ip & mask)>>>0;
  var broadcast=(network | (~mask>>>0))>>>0;
  var total=Math.pow(2,32-prefix);
  var usable, firstHost, lastHost;
  if(prefix>=31){
    usable=total;
    firstHost=network; lastHost=broadcast;
  } else {
    usable=total-2;
    firstHost=network+1; lastHost=broadcast-1;
  }

  out.replaceChildren();
  var box=document.createElement("div"); box.className="rbox";
  var rows=[
    ["Network address", intToIp(network)],
    ["Broadcast address", prefix>=31?"— (none, /"+prefix+")":intToIp(broadcast)],
    ["Subnet mask", intToIp(mask)],
    ["Wildcard mask", intToIp((~mask)>>>0)],
    ["Usable host range", usable>0?(intToIp(firstHost)+" – "+intToIp(lastHost)):"—"],
    ["Total addresses", total.toLocaleString("en-US")],
    ["Usable hosts", usable.toLocaleString("en-US")],
    ["CIDR", intToIp(network)+"/"+prefix]
  ];
  var h=document.createElement("b"); h.textContent=intToIp(network)+"/"+prefix;
  box.append(h);
  var dl=document.createElement("div"); dl.className="kvlist";
  rows.forEach(function(r){
    var row=document.createElement("div"); row.className="kvrow";
    var k=document.createElement("span"); k.className="k"; k.textContent=r[0];
    var v=document.createElement("code"); v.textContent=r[1];
    row.append(k,v); dl.append(row);
  });
  box.append(dl);
  out.append(box);

  renderMap(network, prefix);
}

function renderMap(network, prefix){
  map.replaceChildren();
  // Show the /24 that contains this network, split into 16 blocks of 16 addresses,
  // or if prefix <= 24, show how many /24s the subnet spans (capped visually).
  if(prefix>=24){
    var base24=(network & 0xFFFFFF00)>>>0;
    var blockSize=Math.pow(2,32-prefix); // size of the actual subnet
    var grid=document.createElement("div"); grid.className="smgrid";
    for(var i=0;i<16;i++){
      var cellStart=base24+i*16;
      var cellEnd=cellStart+15;
      var inSubnet=cellStart>=network && cellEnd<=(network+blockSize-1) ||
                   (cellStart<=network && cellEnd>=network) ||
                   (network<=cellStart && network+blockSize-1>=cellEnd);
      var covers = (cellStart < network+blockSize) && (cellEnd >= network);
      var cell=document.createElement("div");
      cell.className="smcell"+(covers?" on":"");
      cell.textContent=(i*16);
      cell.title=intToIp(cellStart)+" – "+intToIp(cellEnd);
      grid.append(cell);
    }
    map.append(grid);
    var lbl=document.createElement("p"); lbl.className="dim"; lbl.style.marginTop="8px";
    lbl.textContent="Base network shown: "+intToIp(base24)+"/24. Highlighted blocks fall inside your subnet (each block = 16 addresses).";
    map.append(lbl);
  } else {
    var count=Math.pow(2,24-prefix);
    var capped=Math.min(count,64);
    var grid2=document.createElement("div"); grid2.className="smgrid wide";
    for(var j=0;j<capped;j++){
      var c=document.createElement("div"); c.className="smcell on";
      c.title=intToIp(network+j*256)+"/24";
      grid2.append(c);
    }
    map.append(grid2);
    var lbl2=document.createElement("p"); lbl2.className="dim"; lbl2.style.marginTop="8px";
    lbl2.textContent="Your /"+prefix+" spans "+count.toLocaleString("en-US")+" /24 networks"+(count>64?" (first 64 shown)":"")+".";
    map.append(lbl2);
  }
}

function showError(msg){
  err.textContent=msg; err.style.display="block";
  out.replaceChildren(); map.replaceChildren();
}
function hideError(){ err.style.display="none"; }

function sync(fromInput){
  var r=parseCidr(inp.value);
  if(r.error){ showError(r.error); return; }
  hideError();
  rng.value=r.prefix;
  pfxVal.textContent="/"+r.prefix;
  render(r.ip, r.prefix);
}

inp.addEventListener("input", function(){ sync(true); });
rng.addEventListener("input", function(){
  var r=parseCidr(inp.value);
  var ipStr = r.error ? "192.168.1.0" : r.ipStr;
  var p=Number(rng.value);
  pfxVal.textContent="/"+p;
  inp.value=ipStr+"/"+p;
  sync(false);
});

var QUICK=[
  ["/32","255.255.255.255","1","Single host route"],
  ["/31","255.255.255.254","2","Point-to-point link"],
  ["/30","255.255.255.252","2","Router-to-router link"],
  ["/29","255.255.255.248","6","Tiny office, few devices"],
  ["/28","255.255.255.240","14","Small office subnet"],
  ["/27","255.255.255.224","30","Small team or VLAN"],
  ["/26","255.255.255.192","62","Department subnet"],
  ["/25","255.255.255.128","126","Half a /24"],
  ["/24","255.255.255.0","254","Classic LAN / office subnet"],
  ["/23","255.255.254.0","510","Larger site, two /24s"],
  ["/22","255.255.252.0","1022","Campus or data-center segment"],
  ["/16","255.255.0.0","65,534","Large private network (e.g. 10.x)"]
];
QUICK.forEach(function(q){
  var tr=document.createElement("tr");
  q.forEach(function(v,idx){ var td=document.createElement(idx===0?"th":"td"); td.textContent=v; tr.append(td); });
  quick.append(tr);
});

sync(true);
})();
