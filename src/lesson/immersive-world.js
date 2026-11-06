import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const GOLD = '#ffce83', CORAL = '#d77b91', CYAN = '#70d9d1';
const V = (x,y,z) => new THREE.Vector3(x,y,z);
const material = (color, extra={}) => new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.15,...extra});
const luminous = (color, strength=2) => material(color,{emissive:color,emissiveIntensity:strength,roughness:.4});
function addMesh(parent, geometry, mat, position=[0,0,0], scale=[1,1,1]) {
  const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;
}
function sphere(parent,p,r,mat,scale){return addMesh(parent,new THREE.SphereGeometry(r,24,16),mat,p,scale);}
function curveMesh(parent,points,mat,radius=.025,segments=70){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p));
  const mesh=addMesh(parent,new THREE.TubeGeometry(curve,segments,radius,6,false),mat);return {curve,mesh};
}
function connect(parent,a,b,mat,radius=.04){
  const direction=b.clone().sub(a),mesh=addMesh(parent,new THREE.CylinderGeometry(radius,radius,direction.length(),8),mat);
  mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),direction.normalize());return mesh;
}
function rng(initial){let seed=initial;return()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};}
function glowTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(255,255,255,.9)');g.addColorStop(.4,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
}
function rockTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const context=canvas.getContext('2d'),data=context.createImageData(256,256),noise=rng(8521);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const strata=Math.sin(y*.14+Math.sin(x*.035)*3)+Math.sin(y*.52+x*.025)*.3;
    const value=Math.max(0,Math.min(255,126+strata*28+(noise()-.5)*45)),i=(y*256+x)*4;
    data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=255;
  }
  context.putImageData(data,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,3);return texture;
}

export function createImmersiveWorld(scene, brainModel){
  const rand=rng(24091),updates=[],disposables=[];
  const state={stage:0,dark:0,network:0,proteins:0,feedback:0,motion:true};
  const hemi=new THREE.HemisphereLight('#a8c9df','#071421',.65);scene.add(hemi);
  const sunLight=new THREE.PointLight('#ffcc85',180,75,1.7);sunLight.position.set(7,10,-15);scene.add(sunLight);
  const brainLight=new THREE.PointLight('#e47d91',80,30,1.7);brainLight.position.set(-3,5,-5);scene.add(brainLight);
  const blueLight=new THREE.PointLight('#4ab5cd',110,55,1.7);blueLight.position.set(-6,4,-20);scene.add(blueLight);
  const neuralLight=new THREE.PointLight('#68ddd0',110,45,1.7);neuralLight.position.set(2,5,-43);scene.add(neuralLight);
  const geneLight=new THREE.PointLight('#ef98a3',140,45,1.7);geneLight.position.set(4,5,-80);scene.add(geneLight);

  // A volumetric cave surrounds the camera, with eroded walls and a rippled floor.
  const cave=new THREE.Group();scene.add(cave);
  const rockGeometry=mergeVertices(new THREE.IcosahedronGeometry(1,4));
  const rp=rockGeometry.attributes.position;
  for(let i=0;i<rp.count;i++){
    const p=V(rp.getX(i),rp.getY(i),rp.getZ(i));const n=1+.12*Math.sin(p.x*8+p.y*4)*Math.cos(p.z*7)+.06*Math.sin(p.y*19+p.z*5);p.multiplyScalar(n);rp.setXYZ(i,p.x,p.y,p.z);
  }rockGeometry.computeVertexNormals();
  const stoneBump=rockTexture();disposables.push(stoneBump);
  const rockMaterials=[material('#1d3037',{roughness:.94,bumpMap:stoneBump,bumpScale:.22}),material('#26393b',{roughness:.9,bumpMap:stoneBump,bumpScale:.18}),material('#2d3436',{roughness:.97,bumpMap:stoneBump,bumpScale:.2})];
  for(let i=0;i<55;i++){
    const side=i%2?1:-1,z=19-Math.floor(i/2)*5.2;
    const rock=addMesh(cave,rockGeometry,rockMaterials[i%3],[side*(11+rand()*2),rand()*5-1,z],[3+rand()*2,5+rand()*7,4+rand()*4]);rock.rotation.set(rand(),rand()*4,rand()*.4);
  }
  for(let i=0;i<23;i++){
    const rock=addMesh(cave,rockGeometry,rockMaterials[i%3],[(rand()-.5)*19,12+rand()*3,18-i*6],[4+rand()*3,2+rand()*3,5]);rock.rotation.z=rand();
  }
  const floorGeo=new THREE.PlaneGeometry(42,190,65,180);floorGeo.rotateX(-Math.PI/2);floorGeo.translate(0,-5,-57);
  const fp=floorGeo.attributes.position;for(let i=0;i<fp.count;i++){const x=fp.getX(i),z=fp.getZ(i);fp.setY(i,-5+Math.sin(x*.35+Math.sin(z*.12))*.4+Math.sin(z*.31+x*.2)*.16);}floorGeo.computeVertexNormals();
  addMesh(cave,floorGeo,material('#102631',{roughness:.65,metalness:.3}));
  const floorThread=luminous('#a99a64',.45);
  for(let j=0;j<7;j++){
    const pts=[];for(let i=0;i<=65;i++)pts.push([Math.sin(i*.15+j)*2+(j-3)*2.1,-4.8+Math.sin(i*.4)*.08,14-i*1.8]);
    curveMesh(cave,pts,floorThread,.012,160);
  }
  // Fine particles give a scale reference and catch light inside the environment.
  const particleGeo=new THREE.BufferGeometry(),particlePositions=new Float32Array(2300*3),particleColors=new Float32Array(2300*3);
  for(let i=0;i<2300;i++){
    particlePositions[i*3]=(rand()-.5)*35;particlePositions[i*3+1]=rand()*23-5;particlePositions[i*3+2]=20-rand()*135;
    const c=new THREE.Color(i%4?CYAN:GOLD);particleColors[i*3]=c.r;particleColors[i*3+1]=c.g;particleColors[i*3+2]=c.b;
  }
  particleGeo.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));particleGeo.setAttribute('color',new THREE.BufferAttribute(particleColors,3));
  const glowMap=glowTexture();disposables.push(glowMap);
  const dust=new THREE.Points(particleGeo,new THREE.PointsMaterial({map:glowMap,size:.13,transparent:true,opacity:.6,vertexColors:true,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(dust);

  // The sun is a glowing volume above the cave, not a painted image plane.
  const sun=new THREE.Group();sun.position.set(6.2,8.6,-15);scene.add(sun);
  const sunMat=luminous('#ffd38a',2.8);const sunOrb=sphere(sun,[0,0,0],1.25,sunMat);
  const rayMat=luminous('#ffc26d',1.8);
  for(let i=0;i<36;i++){
    const a=i/36*Math.PI*2,r=1.7+(i%4)*.13;
    curveMesh(sun,[[Math.cos(a)*1.4,Math.sin(a)*1.4,0],[Math.cos(a+.025)*r,Math.sin(a+.025)*r,.05],[Math.cos(a+.04)*(r+.3),Math.sin(a+.04)*(r+.3),0]],rayMat,.012,12);
  }
  // Shafts of light are translucent volumes whose brightness follows the sun.
  const beamMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{strength:{value:.035}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv; uniform float strength; void main(){float edge=pow(sin(vUv.x*3.14159),3.0);float fade=sin(vUv.y*3.14159);gl_FragColor=vec4(1.0,.68,.27,edge*fade*strength);}' });
  const beam=addMesh(scene,new THREE.ConeGeometry(5,28,40,1,true),beamMaterial,[3.2,1,-3]);beam.rotation.set(.1,0,-.2);beam.visible=false;

  // Imported CC0 anatomical asset: actual sculpted gyri, cerebellum and brainstem.
  const brain=new THREE.Group();brain.position.set(0,3,-10);brain.scale.setScalar(1.55);scene.add(brain);
  const cortexMaterials=[];
  brainModel.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(brainModel),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const factor=4.1/size.y;
  brainModel.scale.setScalar(factor);brainModel.position.copy(center).multiplyScalar(-factor);
  brainModel.traverse(object=>{
    if(!object.isMesh)return;
    const sources=Array.isArray(object.material)?object.material:[object.material];
    const mapped=sources.map(original=>{
      const m=original.clone();m.color.set('#d5b0b4');m.roughness=.57;m.metalness=.12;m.transparent=true;
      m.emissive.set('#613348');m.emissiveIntensity=.1;cortexMaterials.push(m);return m;
    });object.material=Array.isArray(object.material)?mapped:mapped[0];
  });
  brain.add(brainModel);
  const brainPulseMat=luminous(GOLD,4),brainPulse=sphere(brain,[.02,-.46,1.6],.13,brainPulseMat);
  const lightEye=sphere(brain,[.02,-.46,1.6],.3,new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:.08,depthWrite:false}));

  // A neural forest lies further inside the same continuous space.
  const neural=new THREE.Group();neural.position.set(0,3,-46);scene.add(neural);
  const core=new THREE.Group();neural.add(core);
  const coreMat=luminous('#ffd690',2.6),coreOrb=sphere(core,[0,0,0],.58,coreMat);
  const coreMembrane=sphere(core,[0,0,0],1.15,material('#edc47e',{wireframe:true,transparent:true,opacity:.11,emissive:'#e3bb76',emissiveIntensity:.8}));
  const fibers=[],signalDots=[],neuronMaterial=material('#43878d',{emissive:'#327277',emissiveIntensity:.6});
  const fiberMaterial=material('#3d737e',{emissive:'#4b9a9f',emissiveIntensity:.4,transparent:true,opacity:.75});
  for(let i=0;i<32;i++){
    const a=i*2.39996,y=(i/31-.5)*17,r=6+rand()*4;
    const point=V(Math.cos(a)*r,y,Math.sin(a)*r),cell=sphere(neural,point.toArray(),.18+rand()*.16,neuronMaterial,[1.3,.8,1]);
    const path=curveMesh(neural,[V(0,0,0),point.clone().multiplyScalar(.3).add(V(Math.sin(i)*2,1,1)),point.clone().multiplyScalar(.65).add(V(0,-1,2)),point],fiberMaterial,.024,70);fibers.push(path);
    for(let branch=0;branch<3;branch++){
      const end=point.clone().add(V((rand()-.5)*4,(rand()-.5)*5,(rand()-.5)*4));
      curveMesh(neural,[point,point.clone().lerp(end,.5).add(V(.4,.4,0)),end],fiberMaterial,.014,26);
    }
    const signal=sphere(neural,[0,0,0],.075,luminous(i%3?CYAN:GOLD,3));signalDots.push({mesh:signal,curve:path.curve,offset:rand(),rate:.12+rand()*.08});
    updates.push(t=>{cell.rotation.y=t*.1+i;});
  }
  // A long curved axon carries the camera toward the cellular world.
  const axonPoints=[V(0,3,-46),V(4,5,-55),V(-4,1,-64),V(1,4,-75),V(0,3,-86)];
  const axonMaterial=luminous('#4d9c9c',.5);axonMaterial.transparent=true;
  const axon=curveMesh(scene,axonPoints,axonMaterial,.045,160);
  const travelingPulse=sphere(scene,[0,3,-46],.16,luminous(GOLD,4));

  // Cell membrane: a translucent Fresnel rim, with actual depth on every side.
  const cell=new THREE.Group();cell.position.set(0,3,-86);scene.add(cell);
  const membraneMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},vertexShader:'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=-mv.xyz;vP=position;gl_Position=projectionMatrix*mv;}',fragmentShader:'varying vec3 vN;varying vec3 vV;varying vec3 vP;uniform float time;void main(){float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.8);float n=.5+.5*sin(vP.y*3.+sin(vP.x*2.+time*.15));gl_FragColor=vec4(vec3(.17,.6,.66)*(rim*2.6+.05),rim*(.22+n*.08));}'});
  sphere(cell,[0,0,0],11.7,membraneMat,[1.1,1,1]);
  const dna=new THREE.Group();dna.rotation.z=-.24;cell.add(dna);
  const dnaGold=material('#ddb98a',{emissive:'#b88046',emissiveIntensity:.45,roughness:.3,metalness:.3});
  const dnaCoral=material('#bd728d',{emissive:'#9f425d',emissiveIntensity:.4,roughness:.38});
  const rungMats=[material('#7ec9c3',{emissive:'#2c686f',emissiveIntensity:.3}),material('#dec6a0',{emissive:'#7d5c3a',emissiveIntensity:.3})];
  for(let strand=0;strand<2;strand++){
    const points=[];for(let i=0;i<=140;i++){const y=i/140*12-6,a=i/140*Math.PI*4+strand*Math.PI;points.push([Math.cos(a)*1.85,y,Math.sin(a)*1.85]);}
    curveMesh(dna,points,strand?dnaCoral:dnaGold,.12,240);
  }
  for(let i=0;i<34;i++){
    const y=i/33*12-6,a=i/33*Math.PI*4,p=V(Math.cos(a)*1.85,y,Math.sin(a)*1.85),q=V(-p.x,y,-p.z);
    connect(dna,p,V(0,y,0),rungMats[i%2],.065);connect(dna,V(0,y,0),q,rungMats[(i+1)%2],.065);
    sphere(dna,p.toArray(),.18,dnaGold);sphere(dna,q.toArray(),.18,dnaCoral);
  }
  const geneHit=sphere(dna,[0,0,0],2.3,new THREE.MeshBasicMaterial({visible:false}));

  // Proteins are irregular molecular clusters made from smooth, shaded volumes.
  function protein(position,bright=false){
    const group=new THREE.Group();cell.add(group);group.position.copy(position);
    const pMat=material(bright?'#e795a1':'#5b8292',{emissive:bright?'#a45374':'#224f62',emissiveIntensity:bright?.65:.12,roughness:.45});
    for(let j=0;j<9;j++){
      const a=j*2.3999,r=.26+rand()*.12;sphere(group,[Math.cos(a)*r,(j/8-.5)*.85,Math.sin(a)*r],.2+rand()*.1,pMat);
    }return group;
  }
  const freeProteins=[];
  for(let i=0;i<34;i++){
    const a=rand()*Math.PI*2,r=5+rand()*5,p=V(Math.cos(a)*r,(rand()-.5)*15,Math.sin(a)*r);
    const molecule=protein(p);molecule.scale.setScalar(.5+rand()*.6);freeProteins.push({mesh:molecule,origin:p,phase:rand()*8});
  }
  const madeProteins=[];for(let i=0;i<3;i++){const p=protein(V(0,0,0),true);p.visible=false;madeProteins.push(p);}
  const feedbackPoints=[];for(let i=0;i<=100;i++){
    const a=i/100*Math.PI*2;feedbackPoints.push([Math.cos(a)*5.4,Math.sin(a)*5.4,Math.sin(a*2)*2.5]);
  }
  const feedbackMaterial=luminous('#d7a477',.7);feedbackMaterial.transparent=true;feedbackMaterial.opacity=0;
  const feedbackPath=curveMesh(cell,feedbackPoints,feedbackMaterial,.035,180);
  const feedbackPulse=sphere(cell,[5.4,0,0],.2,luminous('#ffcf8f',4));feedbackPulse.visible=false;
  const feedbackHit=sphere(cell,[5.4,0,0],.7,new THREE.MeshBasicMaterial({visible:false}));

  const targets=[sunOrb,brainPulse,coreOrb,geneHit,feedbackHit];
  const anchors=[sun,brainPulse,coreOrb,geneHit,feedbackPulse];
  const labels=[brain,brainPulse,coreOrb,dna,feedbackPulse];
  const temp=new THREE.Vector3();
  let visualDark=0,visualNetwork=0,visualFeedback=0;
  function update(t,dt,camera){
    visualDark=THREE.MathUtils.damp(visualDark,state.dark,2.5,dt);
    visualNetwork=THREE.MathUtils.damp(visualNetwork,state.network,2,dt);
    visualFeedback=THREE.MathUtils.damp(visualFeedback,state.feedback,2,dt);
    sunLight.intensity=110*(1-visualDark)+.2;sun.scale.setScalar(Math.max(.001,1-visualDark));beamMaterial.uniforms.strength.value=.035*(1-visualDark);
    hemi.intensity=.65-visualDark*.38;brainLight.intensity=70+visualDark*45;
    sun.rotation.z=t*.025;
    const pulse=.5+.5*Math.sin(t*2.1);
    brainPulseMat.emissiveIntensity=2+pulse*3;brainPulse.scale.setScalar(1+pulse*.3);lightEye.scale.setScalar(1+pulse);
    brain.rotation.set(.1,Math.sin(t*.14)*.1-.42,Math.sin(t*.12)*.02);
    const cortexAlpha=THREE.MathUtils.smoothstep(camera.position.z,-23,-5);
    cortexMaterials.forEach(m=>{m.opacity=cortexAlpha;m.depthWrite=cortexAlpha>.95;});
    brainPulse.material.opacity=cortexAlpha;brainPulse.material.transparent=true;lightEye.material.opacity=.08*cortexAlpha;
    brain.visible=cortexAlpha>.005;
    coreMat.emissiveIntensity=2+pulse*1.3+visualNetwork*2;coreMembrane.rotation.set(t*.06,t*.09,t*.03);coreMembrane.scale.setScalar(1+pulse*.06);
    fiberMaterial.emissiveIntensity=.22+visualNetwork*1.3;
    signalDots.forEach(({mesh,curve,offset,rate})=>{mesh.position.copy(curve.getPointAt((t*rate+offset)%1));mesh.scale.setScalar(.55+visualNetwork*.8);});
    travelingPulse.position.copy(axon.curve.getPointAt((t*.07)%1));travelingPulse.visible=state.stage===2;axonMaterial.opacity=THREE.MathUtils.smoothstep(camera.position.z,-62,-48);axon.mesh.visible=axonMaterial.opacity>.01;
    dna.rotation.y=t*.07;
    freeProteins.forEach(({mesh,origin,phase})=>{mesh.rotation.set(t*.12+phase,t*.14+phase,phase);mesh.position.y=origin.y+Math.sin(t*.25+phase)*.4;});
    madeProteins.forEach((p,i)=>{
      p.visible=i<state.proteins;
      const a=t*.24+i*2.1;p.position.set(Math.cos(a)*(3.5+i*.5),Math.sin(a)*3.3,Math.sin(a)*3.5);p.rotation.set(t*.2+i,t*.3,i);
    });
    feedbackMaterial.opacity=visualFeedback*.75;feedbackPulse.visible=visualFeedback>.01;feedbackPulse.position.copy(feedbackPath.curve.getPointAt((t*.13)%1));feedbackHit.position.copy(feedbackPulse.position);
    membraneMat.uniforms.time.value=t;dust.rotation.z=Math.sin(t*.025)*.015;
    updates.forEach(fn=>fn(t));
  }
  return {state,targets,anchors,labels,update,positionOf(object){object.getWorldPosition(temp);return temp.clone();},dispose(){disposables.forEach(t=>t.dispose());}};
}
