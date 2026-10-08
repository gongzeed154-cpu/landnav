/* Minimal QR Code generator (byte mode, error correction M, versions 1-10).
   qrMatrix(text) -> array of rows of booleans (true = dark). No dependencies. */
(function(root){
'use strict';
const EC_M={1:[10,1,16],2:[16,1,28],3:[26,1,44],4:[18,2,32],5:[24,2,43],6:[16,4,27],7:[18,4,31],8:[22,2,38,2,39],9:[22,3,36,2,37],10:[26,4,43,1,44]};
const ALIGN={1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50]};
function gmul(x,y){let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x;}return z&255;}
function rsDivisor(deg){const d=new Array(deg).fill(0);d[deg-1]=1;let r=1;for(let i=0;i<deg;i++){for(let j=0;j<deg;j++){d[j]=gmul(d[j],r);if(j+1<deg)d[j]^=d[j+1];}r=gmul(r,2);}return d;}
function rsRem(data,div){const res=new Array(div.length).fill(0);for(const b of data){const f=b^res.shift();res.push(0);for(let i=0;i<div.length;i++)res[i]^=gmul(div[i],f);}return res;}
function utf8(s){return Array.from(new TextEncoder().encode(s));}
function qrMatrix(text){
  const bytes=utf8(text);let ver=0;
  for(let v=1;v<=10;v++){const e=EC_M[v];const cap=e[1]*e[2]+(e[3]||0)*(e[4]||0);const bits=4+(v<10?8:16)+bytes.length*8;if(bits<=cap*8){ver=v;break;}}
  if(!ver)throw new Error('text too long for QR v10-M');
  const e=EC_M[ver],ecLen=e[0];const blocks=[];for(let k=0;k<e[1];k++)blocks.push(e[2]);for(let k=0;k<(e[3]||0);k++)blocks.push(e[4]);
  const cap=blocks.reduce((a,b)=>a+b,0);
  // bit stream
  const bb=[];const put=(v,n)=>{for(let i=n-1;i>=0;i--)bb.push((v>>>i)&1);};
  put(4,4);put(bytes.length,ver<10?8:16);for(const b of bytes)put(b,8);
  put(0,Math.min(4,cap*8-bb.length));while(bb.length%8)bb.push(0);
  for(let p=0xEC;bb.length<cap*8;p^=0xEC^0x11)put(p,8);
  const data=[];for(let i=0;i<bb.length;i+=8){let v=0;for(let j=0;j<8;j++)v=(v<<1)|bb[i+j];data.push(v);}
  // blocks + ecc
  const div=rsDivisor(ecLen);const dB=[],eB=[];let off=0;for(const n of blocks){const d=data.slice(off,off+n);off+=n;dB.push(d);eB.push(rsRem(d,div));}
  const out=[];const maxD=Math.max(...blocks);for(let i=0;i<maxD;i++)for(const d of dB)if(i<d.length)out.push(d[i]);for(let i=0;i<ecLen;i++)for(const c of eB)out.push(c[i]);
  // matrix
  const N=ver*4+17;const M=[],F=[];for(let y=0;y<N;y++){M.push(new Array(N).fill(false));F.push(new Array(N).fill(false));}
  const set=(x,y,d)=>{M[y][x]=d;F[y][x]=true;};
  for(let i=0;i<N;i++){set(6,i,i%2===0);set(i,6,i%2===0);}
  const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=N||y>=N)continue;const dist=Math.max(Math.abs(dx),Math.abs(dy));set(x,y,dist!==2&&dist!==4);}};
  finder(3,3);finder(N-4,3);finder(3,N-4);
  const al=ALIGN[ver];for(let i=0;i<al.length;i++)for(let j=0;j<al.length;j++){if((i===0&&j===0)||(i===0&&j===al.length-1)||(i===al.length-1&&j===0))continue;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(al[i]+dx,al[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);}
  const fmt=(mask)=>{const d=(0<<3)|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=((d<<10)|r)^0x5412;const g=i=>((b>>>i)&1)===1;
    for(let i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));for(let i=9;i<15;i++)set(14-i,8,g(i));
    for(let i=0;i<8;i++)set(N-1-i,8,g(i));for(let i=8;i<15;i++)set(8,N-15+i,g(i));set(8,N-8,true);};
  fmt(0);
  if(ver>=7){let r=ver;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=(ver<<12)|r;for(let i=0;i<18;i++){const bit=((b>>>i)&1)===1,a=N-11+i%3,c=Math.floor(i/3);set(a,c,bit);set(c,a,bit);}}
  // place data
  let i=0;for(let right=N-1;right>=1;right-=2){if(right===6)right=5;for(let v=0;v<N;v++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?N-1-v:v;
    if(!F[y][x]&&i<out.length*8){M[y][x]=((out[i>>>3]>>>(7-(i&7)))&1)===1;i++;}}}
  const MASKS=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
  const apply=m=>{for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!F[y][x]&&MASKS[m](x,y))M[y][x]=!M[y][x];};
  const penalty=()=>{let p=0;for(let y=0;y<N;y++){let run=1;for(let x=1;x<=N;x++){if(x<N&&M[y][x]===M[y][x-1])run++;else{if(run>=5)p+=run-2;run=1;}}}
    for(let x=0;x<N;x++){let run=1;for(let y=1;y<=N;y++){if(y<N&&M[y][x]===M[y-1][x])run++;else{if(run>=5)p+=run-2;run=1;}}}
    for(let y=0;y<N-1;y++)for(let x=0;x<N-1;x++){const c=M[y][x];if(c===M[y][x+1]&&c===M[y+1][x]&&c===M[y+1][x+1])p+=3;}
    let dark=0;for(const r of M)for(const c of r)if(c)dark++;p+=Math.floor(Math.abs(dark*20-N*N*10)/(N*N))*10;return p;};
  let best=0,bp=Infinity;for(let m=0;m<8;m++){apply(m);fmt(m);const p=penalty();if(p<bp){bp=p;best=m;}apply(m);}
  apply(best);fmt(best);return M;}
function qrSVG(text,px){const M=qrMatrix(text),N=M.length,q=4;let d='';for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(M[y][x])d+=`M${x+q} ${y+q}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N+2*q} ${N+2*q}" width="${px||200}" height="${px||200}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;}
root.qrMatrix=qrMatrix;root.qrSVG=qrSVG;
if(typeof module!=='undefined')module.exports={qrMatrix,qrSVG};
})(typeof window!=='undefined'?window:globalThis);
