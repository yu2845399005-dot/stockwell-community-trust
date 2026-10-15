(()=>{
  const root=document.getElementById('chroma-day-night');
  const canvas=root.querySelector('canvas'), ctx=canvas.getContext('2d');
  const buttons=[...root.querySelectorAll('button')];
  const caption=root.querySelector('.chroma-caption'), phase=root.querySelector('.chroma-phase');
  const peopleInput=root.querySelector('#chroma-people'),peopleOutput=root.querySelector('#chroma-people-value');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sites=[[-.43,-.43],[.49,-.40],[-.56,.42],[.15,.17],[.48,.72],[-.12,-.78],[.77,.08],[-.12,.71],[-.81,-.12],[-.38,-.08],[.32,-.78],[.38,.42],[-.63,-.63],[-.45,.77],[.85,-.45],[-.82,.40],[.02,-.36],[.86,.48],[.02,.94],[.02,.015]];
  const night=[[147,91,255],[255,155,105],[69,204,211],[249,94,181],[255,206,83],[179,140,255],[112,153,255],[255,127,143],[83,226,180],[252,151,201],[255,199,111],[149,210,108],[109,178,251],[205,134,255],[247,178,131],[86,211,188],[168,141,255],[249,180,219],[255,215,125],[147,200,247]];
  const day=night.map(color=>{const grey=(color[0]+color[1]+color[2])/3;return color.map(v=>221+(v-grey)*.065);});
  const dusk=night.map(color=>{const grey=color[0]*.21+color[1]*.72+color[2]*.07;return color.map(v=>(v*.65+grey*.35)*.74);});
  const modes={day:{light:0,caption:'Soft, pale colour',label:'Day',phase:'DAYLIGHT'},dusk:{light:1,caption:'Gentle, muted colour',label:'Dusk',phase:'SUNSET'},night:{light:2,caption:'Bright, vivid colour',label:'Night',phase:'NIGHTFALL'}};
  const ring=Array.from({length:200},(_,i)=>[Math.cos(i*Math.PI/100),Math.sin(i*Math.PI/100)]);
  let people=5,value=5,illumination=0,mode='day',frame=0,width=0,height=0,lastTime=0;
  let geometryVelocity=0,lightVelocity=0;
  const options={duration:2800,depth:10};
  const view={yaw:-14,tilt:50};
  const angleInputs=[...root.querySelectorAll('[data-angle]')];
  // A stable, evenly spaced crowd: existing figures stay put as people are added.
  const figurePositions=[[0,.42]];
  const floorCandidates=Array.from({length:240},(_,i)=>{const r=.72*Math.sqrt((i+.5)/240),a=i*2.399963;return[r*Math.cos(a),r*Math.sin(a)];}).filter(p=>Math.min(Math.hypot(p[0]-.84,p[1]),Math.hypot(p[0]+.84,p[1]))>.19);
  while(figurePositions.length<20){let best=null,bestDistance=-1;for(const candidate of floorCandidates){const distance=Math.min(...figurePositions.map(p=>Math.hypot(p[0]-candidate[0],p[1]-candidate[1])));if(distance>bestDistance){best=candidate;bestDistance=distance;}}figurePositions.push(best);}
  const grain=document.createElement('canvas');grain.width=grain.height=128;
  const grainCtx=grain.getContext('2d'),grainData=grainCtx.createImageData(128,128);
  let seed=7321;
  for(let i=0;i<grainData.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=seed>>>24;grainData.data[i]=grainData.data[i+1]=grainData.data[i+2]=v>127?255:35;grainData.data[i+3]=v>127?10:5;}
  grainCtx.putImageData(grainData,0,0);
  const frost=ctx.createPattern(grain,'repeat');
  const mix=(a,b,t)=>a+(b-a)*t;
  function clip(poly,a,b,c){
    const out=[];
    for(let i=0;i<poly.length;i++){
      const p=poly[i],q=poly[(i+1)%poly.length];
      const dp=a*p[0]+b*p[1]-c,dq=a*q[0]+b*q[1]-c;
      if(dp<=1e-8)out.push(p);
      if((dp<=0)!==(dq<=0)){const f=dp/(dp-dq);out.push([mix(p[0],q[0],f),mix(p[1],q[1],f)]);}
    }
    return out;
  }
  function cell(i,t){
    let poly=ring;
    const activeSites=Math.min(sites.length,Math.ceil(Math.max(0,t)));
    const weight=k=>{const activation=Math.max(0,Math.min(1,t-k));return -8*Math.pow(1-activation,2);};
    const s=sites[i],wi=weight(i);
    for(let j=0;j<activeSites&&poly.length;j++){
      if(i===j)continue;
      const q=sites[j],wj=weight(j);
      poly=clip(poly,2*(q[0]-s[0]),2*(q[1]-s[1]),q[0]*q[0]+q[1]*q[1]-s[0]*s[0]-s[1]*s[1]+wi-wj);
    }
    return poly;
  }
  function path(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
  function draw(t){
    if(!width||!height)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const poleRatio=1.4*4/3;
    const angle=view.yaw*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle),tilt=view.tilt*Math.PI/180,ct=Math.cos(tilt),st=Math.sin(tilt);
    const depthRatio=options.depth/134,cameraDistance=7;
    function camera(p,z=0){
      const x=p[0]*cs-p[1]*sn,y=p[0]*sn+p[1]*cs;
      const distance=y*st+z*ct,perspective=cameraDistance/(cameraDistance-distance);
      return [x*perspective,(y*ct-z*st)*perspective,distance];
    }
    // Fit the actual perspective projection, including both column ends.
    const framing=[];
    for(const p of ring){framing.push(camera(p,poleRatio*.5+depthRatio*.5+.028));framing.push(camera(p,poleRatio*.5-depthRatio*.5));}
    for(const x of [-.84,.84])for(const z of [-poleRatio*.5,poleRatio*.5-depthRatio*.5])for(let a=0;a<32;a++)framing.push(camera([x+.058*Math.cos(a*Math.PI/16),.058*Math.sin(a*Math.PI/16)],z));
    for(let a=0;a<32;a++)framing.push(camera([.80*Math.cos(a*Math.PI/16),.80*Math.sin(a*Math.PI/16)],-poleRatio*.5));
    const minX=Math.min(...framing.map(p=>p[0])),maxX=Math.max(...framing.map(p=>p[0]));
    const minY=Math.min(...framing.map(p=>p[1])),maxY=Math.max(...framing.map(p=>p[1]))+.15;
    const topSpace=30,bottomSpace=52,sideSpace=28;
    const radius=Math.min(width*.36,height*.36,236,(width-sideSpace*2)/(maxX-minX),(height-topSpace-bottomSpace)/(maxY-minY));
    const cx=width/2-radius*(minX+maxX)*.5;
    const originY=topSpace+(height-topSpace-bottomSpace-radius*(maxY-minY))*.5-radius*minY;
    const depth=depthRatio*radius,poleHeight=poleRatio*radius;
    function project(p,z=0){const q=camera(p,z/radius);return[cx+q[0]*radius,originY+q[1]*radius,q[2]*radius];}
    const cy=project([0,0],poleHeight*.5)[1];
    const rgba=(color,alpha,k=1)=>`rgba(${color.map(c=>Math.round(Math.min(255,Math.max(0,c*k)))).join(',')},${alpha})`;
    const nightAmount=Math.max(0,illumination-1),environment=illumination/2;
    const floor=project([0,0],-poleHeight*.5);
    ctx.save();ctx.translate(floor[0]+7,floor[1]+4);ctx.scale(1,.12+ct*.10);
    const shadow=ctx.createRadialGradient(0,0,0,0,0,radius*1.3);
    shadow.addColorStop(0,`rgba(36,29,44,${mix(.13,.32,environment)})`);shadow.addColorStop(.65,'rgba(24,20,34,.035)');shadow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=shadow;ctx.fillRect(-radius*1.4,-radius*1.4,radius*2.8,radius*2.8);ctx.restore();
    const wood=[173,123,77].map((v,k)=>mix(v,[146,96,62][k],environment*.5));
    function cylinder(center,r,zBottom,zTop){
      const circle=Array.from({length:64},(_,i)=>[center[0]+r*Math.cos(i*Math.PI/32),center[1]+r*Math.sin(i*Math.PI/32)]),top=circle.map(p=>project(p,zTop)),bottom=circle.map(p=>project(p,zBottom));
      const xs=top.map(p=>p[0]),left=Math.min(...xs),right=Math.max(...xs);
      const topAxis=project(center,zTop),bottomAxis=project(center,zBottom),axisX=topAxis[0]-bottomAxis[0],axisY=topAxis[1]-bottomAxis[1],axisLength=Math.hypot(axisX,axisY)||1;
      const normal=[-axisY/axisLength,axisX/axisLength],mid=[(topAxis[0]+bottomAxis[0])*.5,(topAxis[1]+bottomAxis[1])*.5],halfWidth=(right-left)*.46;
      const sides=ctx.createLinearGradient(mid[0]-normal[0]*halfWidth,mid[1]-normal[1]*halfWidth,mid[0]+normal[0]*halfWidth,mid[1]+normal[1]*halfWidth);
      sides.addColorStop(0,rgba(wood,1,.69));sides.addColorStop(.22,rgba(wood,1,1.02));sides.addColorStop(.43,rgba(wood,1,1.20));sides.addColorStop(.68,rgba(wood,1,1.04));sides.addColorStop(1,rgba(wood,1,.64));
      ctx.beginPath();for(let k=0;k<top.length;k++){const j=(k+1)%top.length;if(top[j][0]-top[k][0]>0)continue;ctx.moveTo(...top[k].slice(0,2));ctx.lineTo(...top[j].slice(0,2));ctx.lineTo(...bottom[j].slice(0,2));ctx.lineTo(...bottom[k].slice(0,2));ctx.closePath();}ctx.fillStyle=sides;ctx.fill();
      ctx.save();ctx.clip();
      for(let strand=0;strand<13;strand++){
        const theta=Math.PI*.5-angle+(strand/12-.5)*2.7;
        ctx.beginPath();for(let j=0;j<=36;j++){const a=theta+Math.sin(j*.34+strand*1.7)*.018,z=mix(zBottom,zTop,j/36),p=project([center[0]+r*Math.cos(a),center[1]+r*Math.sin(a)],z);j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}
        ctx.strokeStyle=strand%3===0?'rgba(84,43,20,.24)':'rgba(239,197,138,.17)';ctx.lineWidth=strand%3===0?.45:.35;ctx.stroke();
      }
      ctx.restore();
      path(top);ctx.fillStyle=rgba(wood,1,1.12);ctx.fill();ctx.strokeStyle=rgba(wood,.65,1.35);ctx.lineWidth=.65;ctx.stroke();
      for(const f of [.3,.55,.78]){path(circle.map(p=>project([center[0]+(p[0]-center[0])*f,center[1]+(p[1]-center[1])*f],zTop+.01)));ctx.strokeStyle='rgba(98,57,29,.18)';ctx.lineWidth=.5;ctx.stroke();}
      path(bottom);ctx.strokeStyle=rgba(wood,.5,.6);ctx.lineWidth=.5;ctx.stroke();
    }
    function drawPost(post){
      const p=project(post,-poleHeight*.5);ctx.save();ctx.translate(p[0]+1,p[1]+1);ctx.scale(1,Math.max(.15,ct));const contact=ctx.createRadialGradient(0,0,0,0,0,radius*.07);contact.addColorStop(0,'rgba(20,18,30,.25)');contact.addColorStop(1,'rgba(20,18,30,0)');ctx.fillStyle=contact;ctx.fillRect(-radius*.08,-radius*.08,radius*.16,radius*.16);ctx.restore();
      cylinder(post,.034,-poleHeight*.5,poleHeight*.5-depth/2);
      cylinder(post,.057,poleHeight*.5-depth/2-2,poleHeight*.5-depth/2+.25);
    }
    function drawFigure(index){
      const activation=Math.max(0,Math.min(1,t-index));if(!activation)return;
      ctx.save();ctx.globalAlpha=activation*activation*(3-2*activation);
      const center=figurePositions[index],child=index%6===2,elder=index%6===4,h=poleHeight*4/9*(child?.82:elder?.96:1),ground=-poleHeight*.5;
      const facing=index*2.399963+.3,ux=Math.cos(facing),uy=Math.sin(facing),vx=-uy,vy=ux;
      function point(x,y,z){return project([center[0]+(ux*x+vx*y)*h/radius,center[1]+(uy*x+vy*y)*h/radius],ground+z*h);}
      function pixelRadius(p,r){return r*h*cameraDistance/(cameraDistance-p[2]/radius);}
      const contact=point(0,0,0);ctx.save();ctx.translate(contact[0]+2,contact[1]+2);ctx.scale(1,Math.max(.16,ct));const shade=ctx.createRadialGradient(0,0,0,0,0,h*.20);shade.addColorStop(0,'rgba(12,18,30,.24)');shade.addColorStop(1,'rgba(12,18,30,0)');ctx.fillStyle=shade;ctx.fillRect(-h*.22,-h*.22,h*.44,h*.44);ctx.restore();
      const parts=[];
      function ball(x,y,z,r){const p=point(x,y,z),rr=pixelRadius(p,r);parts.push({depth:p[2],draw:()=>{const fill=ctx.createRadialGradient(p[0]-rr*.35,p[1]-rr*.4,rr*.05,p[0]+rr*.1,p[1]+rr*.1,rr*1.15);fill.addColorStop(0,'#ffffff');fill.addColorStop(.55,'#eef1f3');fill.addColorStop(1,'#aebbc5');ctx.beginPath();ctx.arc(p[0],p[1],rr,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}});}
      function limb(a,b,r){const p=point(...a),q=point(...b),rr=(pixelRadius(p,r)+pixelRadius(q,r))*.5;parts.push({depth:(p[2]+q[2])*.5,draw:()=>{const dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,mx=(p[0]+q[0])*.5,my=(p[1]+q[1])*.5;const fill=ctx.createLinearGradient(mx-nx*rr,my-ny*rr,mx+nx*rr,my+ny*rr);fill.addColorStop(0,'#b4c0c9');fill.addColorStop(.38,'#ffffff');fill.addColorStop(.7,'#f0f3f4');fill.addColorStop(1,'#c1cbd3');ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle=fill;ctx.lineCap='round';ctx.lineWidth=rr*2;ctx.stroke();}});}
      const stride=index%3===1?.035:0,lean=elder?.065:0;
      for(const side of [-1,1]){
        const ankle=[side*.065,side*stride,.07],knee=[side*.064,side*stride*.5,.23],hip=[side*.06,0,.41];
        limb(ankle,knee,.031);limb(knee,hip,.037);limb([side*.065,side*stride-.015,.033],[side*.065,side*stride+.044,.033],.033);
        const shoulder=[side*.12,lean*.65,.73],elbow=[side*.17,lean+.01,.53],wrist=[side*.15,lean+.07,.37];
        if(child&&side===1){elbow[2]=.76;elbow[0]=.21;wrist[2]=.88;wrist[0]=.24;}
        limb(shoulder,elbow,.033);limb(elbow,wrist,.028);ball(...wrist,.033);
        if(elder&&side===1){limb(wrist,[.18,.14,.04],.012);limb([.18,.14,.035],[.18,.18,.035],.015);}
      }
      // A rounded torso with a real spatial outline, shaded like a small plaster model.
      const torso=[];
      for(const [z,rx,ry] of [[.39,.075,.060],[.43,.095,.070],[.66,.12,.075],[.73,.11,.065],[.76,.07,.05]])for(let k=0;k<16;k++){const a=k*Math.PI/8;torso.push(point(Math.cos(a)*rx,Math.sin(a)*ry+lean*(z-.39)/.37,z));}
      torso.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
      function cross(a,b,c){return(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
      const lower=[],upper=[];for(const p of torso){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of [...torso].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}const hull=lower.slice(0,-1).concat(upper.slice(0,-1));
      parts.push({depth:point(0,lean*.5,.57)[2],draw:()=>{path(hull);const c=point(-.05,lean*.5,.64),r=h*.36,fill=ctx.createRadialGradient(c[0],c[1],0,c[0]+r*.25,c[1]+r*.12,r);fill.addColorStop(0,'#ffffff');fill.addColorStop(.55,'#edf1f3');fill.addColorStop(1,'#aebcc7');ctx.fillStyle=fill;ctx.fill();}});
      limb([0,lean,.73],[0,lean*1.3,.82],.036);
      ball(0,lean*1.5,.88,child?.102:.085);
      parts.sort((a,b)=>a.depth-b.depth);for(const part of parts)part.draw();ctx.restore();
    }
    const groundObjects=[{position:[-.84,0],render:()=>drawPost([-.84,0])},{position:[.84,0],render:()=>drawPost([.84,0])}];
    const figureCount=Math.min(20,Math.ceil(Math.max(0,t)));
    for(let i=0;i<figureCount;i++)groundObjects.push({position:figurePositions[i],render:()=>drawFigure(i)});
    groundObjects.sort((a,b)=>project(a.position,-poleHeight*.5)[2]-project(b.position,-poleHeight*.5)[2]);
    for(const object of groundObjects)object.render();
    const cells=[];
    for(let i=0;i<Math.min(sites.length,Math.ceil(Math.max(0,t)));i++){
      let poly=cell(i,t);if(poly.length<3)continue;
      let area=0;for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length];area+=a[0]*b[1]-b[0]*a[1];}
      if(Math.abs(area)<.00002)continue;
      // Area centroid keeps long curved boundaries from pulling the tile inset off centre.
      let sx=0,sy=0;for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length],cross=a[0]*b[1]-b[0]*a[1];sx+=(a[0]+b[0])*cross;sy+=(a[1]+b[1])*cross;}
      const cent=[sx/(3*area),sy/(3*area)],inset=.986;
      poly=poly.map(p=>[cent[0]+(p[0]-cent[0])*inset,cent[1]+(p[1]-cent[1])*inset]);
      const points=[];
      // Resample long interior seams to give the top a gently convex surface.
      for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*15));for(let l=0;l<n;l++)points.push([mix(a[0],b[0],l/n),mix(a[1],b[1],l/n)]);}
      const lift=.6*Math.sin(i*2.1);
      const top=points.map(p=>project(p,poleHeight*.5+depth/2+1.8*Math.max(0,1-p[0]*p[0]-p[1]*p[1])+lift));
      const bottom=points.map(p=>project(p,poleHeight*.5-depth/2+lift));
      const color=illumination<=1?day[i].map((v,k)=>mix(v,dusk[i][k],illumination)):dusk[i].map((v,k)=>mix(v,night[i][k],illumination-1));
      const emergence=Math.min(1,Math.abs(area)/.04),first=Math.min(1,Math.max(0,t)),opacity=i===0?first*first*(3-2*first):emergence*emergence*(3-2*emergence);
      cells.push({i,top,bottom,color,cent,opacity,sort:project(cent)[2]});
    }
    // With nobody present, the supporting glass stays neutral and has no coloured pieces.
    if(t<1){
      const top=ring.map(p=>project(p,poleHeight*.5+depth/2)),bottom=ring.map(p=>project(p,poleHeight*.5-depth/2));
      cells.push({i:-1,top,bottom,color:[224,229,232],cent:[0,0],opacity:1,neutral:true,sort:-Infinity});
    }
    cells.sort((a,b)=>a.sort-b.sort);
    // Transmitted colour and a soft lower rim are visible through the frosted face.
    for(const c of cells){
      ctx.globalAlpha=c.opacity;
      path(c.bottom);ctx.fillStyle=rgba(c.color,.18,1.05);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.30)';ctx.lineWidth=1.1;ctx.stroke();
    }
    for(const c of cells){
      ctx.globalAlpha=c.opacity;
      ctx.beginPath();
      for(let k=0;k<c.top.length;k++){
        const j=(k+1)%c.top.length,a=c.top[k],b=c.top[j];
        if(b[0]-a[0]>0)continue;
        ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c.bottom[j][0],c.bottom[j][1]);ctx.lineTo(c.bottom[k][0],c.bottom[k][1]);ctx.closePath();
      }
      const wall=ctx.createLinearGradient(0,cy-radius*ct,0,cy+radius*ct+depth);
      wall.addColorStop(0,rgba(c.color,.60,1.18));wall.addColorStop(1,rgba(c.color,.64,.94));ctx.fillStyle=wall;ctx.fill();
    }
    for(const c of cells){
      ctx.globalAlpha=c.opacity;
      path(c.top);
      const lighting=ctx.createLinearGradient(cx-radius,cy-radius,cx+radius*.8,cy+radius);
      lighting.addColorStop(0,rgba(c.color,.71,1.23));lighting.addColorStop(.48,rgba(c.color,.80,1.07));lighting.addColorStop(1,rgba(c.color,.76,.98));
      ctx.save();ctx.shadowColor=rgba(c.color,nightAmount*.45);ctx.shadowBlur=nightAmount*12;ctx.fillStyle=lighting;ctx.fill();ctx.restore();
      ctx.save();ctx.clip();
      const sheen=ctx.createRadialGradient(cx-radius*.50,cy-radius*.54,0,cx-radius*.1,cy-radius*.15,radius*1.45);
      sheen.addColorStop(0,'rgba(255,255,255,.34)');sheen.addColorStop(.48,'rgba(255,255,255,.10)');sheen.addColorStop(1,'rgba(255,255,255,.025)');ctx.fillStyle=sheen;ctx.fillRect(0,0,width,height);
      const reflection=ctx.createLinearGradient(cx-radius,cy-radius*.45,cx+radius,cy+radius*.35);
      reflection.addColorStop(0,'rgba(255,255,255,0)');reflection.addColorStop(.34,'rgba(255,255,255,.01)');reflection.addColorStop(.51,'rgba(255,255,255,.17)');reflection.addColorStop(.7,'rgba(255,255,255,.015)');reflection.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=reflection;ctx.fillRect(0,0,width,height);
      ctx.fillStyle=frost;ctx.fillRect(0,0,width,height);
      // A broad milky bevel beneath a crisp white edge reads as ground glass.
      path(c.top);ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='rgba(255,255,255,.16)';ctx.stroke();ctx.restore();
      path(c.top);ctx.lineJoin='round';ctx.lineWidth=1.7;ctx.strokeStyle='rgba(255,255,255,.90)';ctx.stroke();
    }
    ctx.globalAlpha=1;
    canvas.dataset.cells=String(cells.filter(c=>!c.neutral).length);canvas.dataset.figures=String(figureCount);canvas.dataset.figureHeightRatio=String(4/9);canvas.dataset.people=String(people);canvas.dataset.progress=t.toFixed(3);canvas.dataset.illumination=illumination.toFixed(3);canvas.dataset.supports='2';canvas.dataset.supportMaterial='wood';canvas.dataset.supportSpacing='1.68';canvas.dataset.supportHeight=String(poleRatio);canvas.dataset.projection='perspective';canvas.dataset.radius=radius.toFixed(2);canvas.dataset.cameraDistance=String(cameraDistance);canvas.dataset.modelBounds=JSON.stringify({left:cx+minX*radius,right:cx+maxX*radius,top:originY+minY*radius,bottom:originY+maxY*radius});canvas.dataset.supportBase='none';canvas.dataset.yaw=view.yaw.toFixed(1);canvas.dataset.tilt=view.tilt.toFixed(1);canvas.dataset.thickness=String(options.depth);
  }
  function resize(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);draw(value);}
  function updateUI(){
    root.dataset.night=String(mode==='night');root.dataset.mode=mode;root.style.setProperty('--selected',String(Object.keys(modes).indexOf(mode)));document.documentElement.dataset.mode=mode;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    caption.textContent=modes[mode].caption;phase.textContent=modes[mode].phase;
    peopleInput.value=String(people);peopleOutput.textContent=`${people} ${people===1?'person':'people'}`;peopleInput.setAttribute('aria-valuetext',`${people} ${people===1?'person':'people'}, ${people} coloured ${people===1?'piece':'pieces'}`);
    canvas.setAttribute('aria-label',`${modes[mode].label}: ${people===0?'a neutral, unsegmented frosted glass disc':`${people} irregular coloured ${people===1?'piece':'pieces'} with white edges and ${people} white human ${people===1?'figure':'figures'} underneath`}, supported by two wooden columns. Drag to rotate or use the angle sliders.`);
  }
  function change(next,animate=true){
    mode=Object.hasOwn(modes,next)?next:'day';updateUI();
    if(reduced.matches||!animate){cancelAnimationFrame(frame);frame=0;value=people;illumination=modes[mode].light;geometryVelocity=lightVelocity=0;draw(value);return;}
    // A critically damped spring preserves both position and velocity on interruption.
    if(frame)return;
    lastTime=performance.now();frame=requestAnimationFrame(tick);
  }
  function spring(position,velocity,goal,dt){const omega=8500/options.duration,offset=position-goal,term=velocity+omega*offset,decay=Math.exp(-omega*dt);return [goal+(offset+term*dt)*decay,(velocity-omega*term*dt)*decay];}
  function tick(now){
    const dt=Math.max(0,Math.min(.05,(now-lastTime)/1000));lastTime=now;
    [value,geometryVelocity]=spring(value,geometryVelocity,people,dt);
    [illumination,lightVelocity]=spring(illumination,lightVelocity,modes[mode].light,dt);
    value=Math.max(0,Math.min(20,value));illumination=Math.max(0,Math.min(2,illumination));
    const settled=Math.abs(value-people)<.0005&&Math.abs(illumination-modes[mode].light)<.0005&&Math.abs(geometryVelocity)<.002&&Math.abs(lightVelocity)<.002;
    if(settled){value=people;illumination=modes[mode].light;geometryVelocity=lightVelocity=0;}
    draw(value);frame=settled?0:requestAnimationFrame(tick);
  }
  buttons.forEach(b=>b.addEventListener('click',()=>{
    if(mode===b.dataset.mode)return;change(b.dataset.mode);
    save();
  }));
  peopleInput.addEventListener('input',()=>{people=Math.max(0,Math.min(20,Math.round(Number(peopleInput.value)||0)));change(mode);});
  peopleInput.addEventListener('change',save);
  const storageKey='stockwell-light-study-v1';
  function save(){
    try{localStorage.setItem(storageKey,JSON.stringify({mode,people,view:{...view}}));}catch{}
  }
  function syncView(){
    angleInputs.forEach(input=>{const key=input.dataset.angle;input.value=String(Math.round(view[key]));root.querySelector(`[data-value="${key}"]`).textContent=`${Math.round(view[key])}°`;input.setAttribute('aria-valuetext',`${Math.round(view[key])} degrees`);});
  }
  angleInputs.forEach(input=>{
    input.addEventListener('input',()=>{view[input.dataset.angle]=Number(input.value);syncView();draw(value);});
    input.addEventListener('change',save);
  });
  let dragging=null,viewFrame=0;
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(dragging)return;
    dragging={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:view.yaw,tilt:view.tilt};canvas.setPointerCapture(e.pointerId);canvas.dataset.dragging='true';
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging||e.pointerId!==dragging.id)return;
    view.yaw=((dragging.yaw+(e.clientX-dragging.x)*.55+180)%360+360)%360-180;
    view.tilt=Math.max(0,Math.min(85,dragging.tilt-(e.clientY-dragging.y)*.38));
    syncView();if(!viewFrame)viewFrame=requestAnimationFrame(()=>{viewFrame=0;draw(value);});
  });
  function endDrag(e){if(!dragging||e.pointerId!==dragging.id)return;dragging=null;canvas.dataset.dragging='false';if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);save();}
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  function restoreView(s){
    const v=s?.privateContent?.view;if(!v||dragging)return;
    if(Number.isFinite(v.yaw))view.yaw=Math.max(-180,Math.min(180,v.yaw));
    if(Number.isFinite(v.tilt))view.tilt=Math.max(0,Math.min(85,v.tilt));
    syncView();draw(value);
  }
  new ResizeObserver(resize).observe(canvas);
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
  if(Number.isFinite(saved?.people))people=Math.max(0,Math.min(20,Math.round(saved.people)));
  restoreView({privateContent:saved});syncView();change(saved?.mode||'day',false);resize();
  reduced.addEventListener('change',()=>{if(reduced.matches)change(mode,false);});
})();

