import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createImmersiveWorld } from './immersive-world.js';
import './style.css';

const $=id=>document.getElementById(id);
const stops=[
  {name:'THE OUTSIDE WORLD',eyebrow:'A SMALL EXPERIMENT. A BIG QUESTION.',title:'What if the sun<br>never came up?',text:'Step into the dark. Discover the extraordinary world that keeps time inside you.',action:'Take away the sunlight',hotspot:'Touch the sun',label:'YOUR INNER CLOCK',travel:'STEPPING INTO THE DARK'},
  {name:'THE CAVE',eyebrow:'DISCOVERY 01 · THE RHYTHM REMAINS',title:'No sunlight.<br>Still a rhythm.',text:'The outside world has gone dark. But something inside you is still keeping time. Find the golden pulse.',action:'Follow the pulse inside',hotspot:'Follow this pulse',label:'THE RHYTHM CONTINUES',travel:'FOLLOWING THE PULSE'},
  {name:'THE NEURAL FOREST',eyebrow:'DISCOVERY 02 · A SIGNAL WORTH FOLLOWING',title:'A tiny clock.<br>A body-wide message.',text:'Meet the SCN: a small group of nerve cells that helps keep the body’s clocks in step. Wake the network and watch its message travel.',action:'Wake the network',hotspot:'Wake the network',label:'SCN · MASTER CLOCK',travel:'RIDING A NEURAL SIGNAL'},
  {name:'INSIDE A CELL',eyebrow:'DISCOVERY 03 · SMALL THINGS, EXTRAORDINARY WORK',title:'A message written<br>in living code.',text:'Here, genes and proteins help build a repeating rhythm. Touch the helix to release three protein-like messengers and watch where they go.',action:'Release a protein',hotspot:'Touch the helix',label:'DNA · GENE ACTIVITY',travel:'ENTERING THE FEEDBACK LOOP'},
  {name:'THE FEEDBACK LOOP',eyebrow:'DISCOVERY 04 · THE END IS A NEW BEGINNING',title:'Small loops.<br>A whole day.',text:'These messengers feed back on the process that made them. Complete the loop and see how a rhythm can repeat.',action:'Complete the loop',hotspot:'Complete the loop',label:'FEEDBACK → A NEW CYCLE',travel:'RETURNING TO THE OUTSIDE WORLD'},
];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let scene,camera,renderer,composer,controls,world,stage=0,maxVisited=0,travel=null,ready=false,busy=false,sound=false,motionPaused=reduced,time=0,completed=false,quizReady=false,revision=0;
let audioContext,discoveryTimer;const timers=new Set();
const ambience=$('ambience');ambience.volume=.32;
const later=(fn,ms)=>{const rev=revision;const id=setTimeout(()=>{timers.delete(id);if(rev===revision)fn();},ms);timers.add(id);return id;};
const notify=message=>$('notice').textContent=message;
const actionText=text=>{$('action').replaceChildren(document.createTextNode(text));const arrow=document.createElement('span');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');$('action').append(arrow);};
function announce(message){clearTimeout(discoveryTimer);$('discovery').textContent=message;$('discovery').classList.add('visible');discoveryTimer=setTimeout(()=>$('discovery').classList.remove('visible'),4200);}
function chime(kind=0){
  if(!sound)return;
  try{
    audioContext??=new AudioContext();audioContext.resume();const now=audioContext.currentTime;
    [0,7,12].forEach((note,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=(kind?294:220)*2**(note/12);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.035,now+.03+i*.08);g.gain.exponentialRampToValueAtTime(.0001,now+1.8+i*.08);o.connect(g).connect(audioContext.destination);o.start(now);o.stop(now+2.1);});
  }catch{/* The original audio remains available when Web Audio is unavailable. */}
}
function updateSound(){ $('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound)); }
async function toggleSound(){
  sound=!sound;updateSound();if(sound){try{await ambience.play();chime();}catch{sound=false;updateSound();notify('Sound could not start. Try Sound on again, or use the original animation in the field guide.');}}else{ambience.pause();audioContext?.suspend();}
}
$('sound').addEventListener('click',toggleSound);
$('motion').textContent=motionPaused?'Resume motion':'Pause motion';$('motion').setAttribute('aria-pressed',String(motionPaused));
$('motion').addEventListener('click',()=>{motionPaused=!motionPaused;$('motion').textContent=motionPaused?'Resume motion':'Pause motion';$('motion').setAttribute('aria-pressed',String(motionPaused));if(travel&&motionPaused)finishTravel();});
$('notes-open').addEventListener('click',()=>$('notes').showModal());
$('notes-close').addEventListener('click',()=>$('notes').close());
$('notes').addEventListener('close',()=>{$('original').pause();});
$('original').addEventListener('play',()=>ambience.pause());
$('original').addEventListener('pause',()=>{if(sound)ambience.play().catch(()=>{});});
$('ambience').addEventListener('error',()=>{sound=false;updateSound();notify('The soundtrack is unavailable. The interactive journey still works.');});

stops.forEach((stop,i)=>{
  const dot=document.createElement('button');dot.title=stop.name;dot.setAttribute('aria-label',`Return to ${stop.name.toLowerCase()}`);dot.disabled=i>0;dot.addEventListener('click',()=>enter(i));$('trail').append(dot);
  const jump=document.createElement('button');const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');jump.append(n,document.createTextNode(' '+stop.name.toLowerCase()));jump.addEventListener('click',()=>{$('notes').close();enter(i);});$('guide-stops').append(jump);
});
function refreshUI(){
  const stop=stops[stage];$('chapter-number').textContent=String(stage+1).padStart(2,'0');$('chapter-name').textContent=stop.name;$('story-eyebrow').textContent=stop.eyebrow;$('story-title').innerHTML=stop.title;$('story-text').textContent=stop.text;
  actionText(stop.action);$('action').disabled=busy;$('back').hidden=stage===0;$('back').disabled=busy;$('hotspot-label').textContent=stop.hotspot;$('hotspot').setAttribute('aria-label',stop.action);$('label-text').textContent=stop.label;
  $('result').hidden=true;$('quiz').hidden=true;$('action').hidden=false;
  [...$('trail').children].forEach((b,i)=>{b.classList.toggle('active',i===stage);b.classList.toggle('visited',i<stage);b.disabled=i>maxVisited;if(i===stage)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
}
function viewFor(i){
  const mobile=innerWidth<650;
  const views=[
    {position:[0,3.8,mobile?16:13],target:[0,3,-10]},
    {position:[0,3,mobile?8:5],target:[0,2.7,-10]},
    {position:[0,3,mobile?-26:-31],target:[0,3,-46]},
    {position:[0,3,mobile?-64:-68],target:[0,3,-86]},
    {position:[mobile?6:10,6,mobile?-65:-70],target:[0,3,-86]},
  ];
  return {position:new THREE.Vector3(...views[i].position),target:new THREE.Vector3(...views[i].target)};
}
function finishTravel(){
  if(!travel)return;camera.position.copy(travel.destination);controls.target.copy(travel.target);controls.update();travel=null;busy=false;document.body.classList.remove('traveling');$('transition-label').textContent='';$('action').disabled=false;$('back').disabled=false;controls.enabled=true;
}
function moveTo(i,instant=false){
  const view=viewFor(i);const from=camera.position.clone(),targetFrom=controls.target.clone();
  if(instant||reduced||motionPaused){camera.position.copy(view.position);controls.target.copy(view.target);controls.update();busy=false;$('action').disabled=false;$('back').disabled=false;return;}
  let middle=from.clone().lerp(view.position,.5);middle.x+=i===3?-2.8:i===2?1:2;middle.y+=i===3?1:.3;
  travel={curve:new THREE.CatmullRomCurve3([from,from.clone().lerp(middle,.5),middle,view.position]),fromTarget:targetFrom,destination:view.position,target:view.target,start:performance.now(),duration:i===2||i===3?3800:2200};
  controls.enabled=false;busy=true;$('action').disabled=true;$('back').disabled=true;document.body.classList.add('traveling');$('transition-label').textContent=stops[Math.max(0,i-1)].travel;
}
function enter(i,instant=false){
  if(!ready)return;
  revision++;timers.forEach(clearTimeout);timers.clear();travel=null;document.body.classList.remove('traveling');controls.enabled=true;busy=false;stage=i;maxVisited=Math.max(maxVisited,i);completed=false;quizReady=false;
  world.state.stage=i;world.state.dark=i>0?1:0;world.state.network=i>2?1:0;world.state.proteins=i>3?3:0;world.state.feedback=0;
  $('quiz').querySelectorAll('button').forEach(b=>{b.className='';b.disabled=false;});refreshUI();moveTo(i,instant);
}
function runAction(){
  if(!ready||busy||$('notes').open)return;
  if(completed){restart();return;}
  chime(stage);
  if(stage===0){enter(1);announce('No sunlight. Your inner pulse keeps going.');return;}
  if(stage===1){enter(2);return;}
  if(stage===2){
    world.state.network=1;busy=true;$('action').disabled=true;$('back').disabled=true;actionText('The network is waking…');announce('One pulse. A whole network comes alive.');
    later(()=>enter(3),2400);return;
  }
  if(stage===3){
    world.state.proteins=Math.min(3,world.state.proteins+1);const count=world.state.proteins;
    announce(`${count} of 3 messengers released. Watch them move around the helix.`);
    actionText(count<3?`Release another protein · ${count}/3`:'Follow the messengers');
    if(count===3){busy=true;$('action').disabled=true;$('back').disabled=true;later(()=>enter(4),1800);}return;
  }
  if(stage===4&&!quizReady){
    world.state.feedback=1;busy=true;$('action').disabled=true;actionText('The message returns…');announce('The output becomes an input. The loop closes.');
    later(()=>{busy=false;quizReady=true;$('action').hidden=true;$('story-title').innerHTML='So, what happens<br>without sunlight?';$('story-text').textContent='Think back to the pulse in the cave. Does your inner clock stop when the light disappears?';$('quiz').hidden=false;$('quiz').querySelector('button').focus({preventScroll:true});},2100);
  }
}
$('action').addEventListener('click',runAction);$('hotspot').addEventListener('click',runAction);$('back').addEventListener('click',()=>{if(!busy)enter(Math.max(0,stage-1));});
$('quiz').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
  if(button.dataset.answer==='continues'){
    button.classList.add('correct');completed=true;$('result').hidden=false;$('result').textContent='Exactly. The inner rhythm continues. Daily light helps keep it synchronized with the world outside.';$('story-eyebrow').textContent='DISCOVERY COMPLETE · YOU FOLLOWED THE WHOLE LOOP';$('action').hidden=false;$('action').disabled=false;actionText('Explore the world again');$('quiz').querySelectorAll('button').forEach(b=>b.disabled=true);chime(1);announce('You found the clock within.');
  }else{button.classList.add('incorrect');$('result').hidden=false;$('result').textContent='Look back at the cave: its light went out, but the golden pulse kept going. Try the other answer.';}
}));
function restart(){$('notes').close();enter(0);announce('A new journey begins with a little curiosity.');}
$('restart').addEventListener('click',restart);
addEventListener('keydown',e=>{if(e.code==='Space'&&!e.target.closest('button,input,video,summary,dialog')&&!$('notes').open){e.preventDefault();runAction();}});

async function start(){
  notify('Opening a world within…');
  if(!WebGL.isWebGL2Available())throw new Error('This experience needs WebGL 2. Enable hardware acceleration or try another browser.');
  const brainAsset=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}lesson/brain.glb`);
  scene=new THREE.Scene();scene.background=new THREE.Color('#060e17');scene.fog=new THREE.FogExp2('#07121e',.026);
  camera=new THREE.PerspectiveCamera(innerWidth<650?52:44,innerWidth/innerHeight,.1,180);const initial=viewFor(0);camera.position.copy(initial.position);
  renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  controls=new OrbitControls(camera,$('world'));controls.target.copy(initial.target);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.minDistance=5;controls.maxDistance=36;controls.minPolarAngle=.65;controls.maxPolarAngle=1.8;controls.minAzimuthAngle=-.9;controls.maxAzimuthAngle=.9;controls.update();
  world=createImmersiveWorld(scene,brainAsset.scene);
  composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.65,.65,1);composer.addPass(bloom);composer.addPass(new OutputPass());
  const resize=()=>{const w=innerWidth,h=innerHeight;camera.fov=w<650?52:44;camera.aspect=w/h;camera.clearViewOffset();camera.setViewOffset(w,h,w<650?0:-w*.1,h*(w<650?.12:.05),w,h);camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(w,h);composer.setSize(w,h);};
  addEventListener('resize',resize);resize();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerDown;
  $('world').addEventListener('pointerdown',e=>{pointerDown=[e.clientX,e.clientY];});
  $('world').addEventListener('pointerup',e=>{
    if(!pointerDown||busy||Math.hypot(e.clientX-pointerDown[0],e.clientY-pointerDown[1])>6)return;
    pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);if(raycaster.intersectObject(world.targets[stage],false).length)runAction();
  });
  controls.addEventListener('start',()=>{$('navigation-hint').textContent='EXPLORE THE DEPTH · THE STORY WILL WAIT FOR YOU';});
  ready=true;refreshUI();notify('');
  let previous=performance.now();
  renderer.setAnimationLoop(now=>{
    const dt=Math.max(0,Math.min((now-previous)/1000,.045));previous=now;
    if(!motionPaused&&!document.hidden&&!$('notes').open)time+=dt;
    world.update(time,dt,camera);
    if(travel){
      const p=Math.min(1,(now-travel.start)/travel.duration),ease=p*p*(3-2*p);camera.position.copy(travel.curve.getPointAt(ease));controls.target.lerpVectors(travel.fromTarget,travel.target,ease);if(p===1)finishTravel();
    }
    controls.update();scene.updateMatrixWorld(true);
    const targetPosition=world.positionOf(world.anchors[stage]).project(camera);
    const x=(targetPosition.x*.5+.5)*innerWidth,y=(-targetPosition.y*.5+.5)*innerHeight;
    const inView=targetPosition.z<1&&targetPosition.z>-1&&x>35&&x<innerWidth-35&&y>115&&y<innerHeight-180;
    $('hotspot').hidden=!!travel||busy||quizReady||completed||!inView;
    $('hotspot').style.left=`${x}px`;$('hotspot').style.top=`${y}px`;
    const labelPosition=world.positionOf(world.labels[stage]).project(camera);$('scene-label').hidden=!!travel||labelPosition.z>1;
    $('scene-label').style.left=`${Math.max(25,Math.min(innerWidth-150,(labelPosition.x*.5+.5)*innerWidth+70))}px`;
    $('scene-label').style.top=`${Math.max(140,Math.min(innerHeight-220,(-labelPosition.y*.5+.5)*innerHeight-65))}px`;
    composer.render();
  });
  if(import.meta.hot)import.meta.hot.dispose(()=>{revision++;timers.forEach(clearTimeout);clearTimeout(discoveryTimer);ambience.pause();audioContext?.close();renderer.setAnimationLoop(null);removeEventListener('resize',resize);controls.dispose();world.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});composer.dispose();bloom.dispose();renderer.dispose();});
}
start().catch(error=>{console.error(error);notify(error.message);$('action').disabled=true;});
