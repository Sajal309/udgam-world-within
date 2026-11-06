import * as THREE from 'three';

const GOLD = '#e0c476', CORAL = '#d77770', MINT = '#8fc7b0';
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .38, metalness: .22, ...extra });
const gold = mat(GOLD), coral = mat(CORAL), mint = mat(MINT), dark = mat('#153f43');
const glow = (color) => mat(color, { emissive: color, emissiveIntensity: .65 });

function mesh(geometry, material, parent, position = [0, 0, 0], scale = [1, 1, 1]) {
  const item = new THREE.Mesh(geometry, material); item.position.set(...position); item.scale.set(...scale); parent.add(item); return item;
}
function ball(parent, position, radius, material, scale) { return mesh(new THREE.SphereGeometry(radius, 24, 16), material, parent, position, scale); }
function tube(parent, points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
  return mesh(new THREE.TubeGeometry(curve, Math.max(32, points.length * 6), radius, 7, closed), material, parent);
}
function rod(parent, a, b, radius, material) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
  const item = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 8), material, parent);
  item.position.copy(start.add(end).multiplyScalar(.5)); item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return item;
}
function ring(parent, radius, color = GOLD, width = .012) {
  return mesh(new THREE.TorusGeometry(radius, width, 8, 100), mat(color, { emissive: color, emissiveIntensity: .3 }), parent);
}
function clock(parent, radius = 1) {
  const group = new THREE.Group(); parent.add(group);
  const face = mesh(new THREE.CylinderGeometry(radius, radius, .12, 64), dark, group); face.rotation.x = Math.PI / 2;
  ring(group, radius, GOLD, .025);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const tick = mesh(new THREE.BoxGeometry(.025, i % 3 ? .08 : .15, .035), gold, group, [Math.sin(a) * radius * .86, Math.cos(a) * radius * .86, .09]); tick.rotation.z = -a;
  }
  const minute = new THREE.Group(), hour = new THREE.Group(); group.add(minute, hour);
  rod(minute, [0, 0, .12], [0, radius * .7, .12], .022, gold);
  rod(hour, [0, 0, .13], [0, radius * .43, .13], .03, mint);
  ball(group, [0, 0, .14], .055, glow(GOLD));
  group.userData.animate = t => { minute.rotation.z = -t * 1.6; hour.rotation.z = -t * .23; };
  return group;
}
function protein(parent, position, color = GOLD, size = .18) {
  const group = new THREE.Group(); parent.add(group); group.position.set(...position);
  const material = mat(color, { emissive: color, emissiveIntensity: .14 });
  const spots = [[0,0,0],[.8,.4,.1],[-.5,.7,.3],[.2,-.7,.3],[-.6,-.3,-.5],[.3,.4,-.7]];
  spots.forEach(p => ball(group, p.map(x => x * size), size * .75, material));
  return group;
}
function brain(parent, source) {
  const group = new THREE.Group(); parent.add(group);
  const lobes = [];
  [-1, 1].forEach(side => {
    const lobe = new THREE.Group(); group.add(lobe); lobes.push(lobe);
    const points = source.outline.map(([x, y]) => new THREE.Vector2(x * side * .0075, y * .0075));
    const outline = new THREE.SplineCurve([...points, points[0]]).getPoints(100);
    const shape = new THREE.Shape(outline);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: .7, bevelEnabled: true, bevelThickness: .26, bevelSize: .16, bevelSegments: 5, steps: 1 });
    geo.translate(0, 0, -.35); mesh(geo, coral, lobe);
    source.folds.forEach((line, j) => {
      const points = line.map(([x,y]) => [x * side * .0075, y * .0075, .64 + Math.sin(j) * .008]);
      tube(lobe, points, .018, mat(j % 2 ? '#e6a38b' : '#f1c3a3'));
      tube(lobe, points.map(([x,y,z]) => [x,y,-z]), .015, gold);
    });
  });
  const stem = ball(group, [0, -1.6, -.12], .24, coral, [.65, 1.5, .75]);
  group.userData.lobes = lobes; group.userData.stem = stem;
  return group;
}

export function createWorld(scene, source) {
  const stations = [], animators = [], interactives = [], state = { day: .65, lightCue: true, speed: 1, separate: false, reveal: 1 };
  scene.add(new THREE.HemisphereLight('#f4ecc9', '#07383c', 2.4));
  const key = new THREE.DirectionalLight('#ffe8bf', 4); key.position.set(4, 8, 7); scene.add(key);
  const fill = new THREE.DirectionalLight('#6ee4d2', 2.4); fill.position.set(-4, 1, -5); scene.add(fill);
  // Deterministic dust field, so the learning space feels consistent on reload.
  const positions = new Float32Array(1600 * 3);
  let seed = 482;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < positions.length; i += 3) { positions[i] = rand() * 130 - 16; positions[i + 1] = rand() * 28 - 8; positions[i + 2] = rand() * 50 - 35; }
  const dots = new THREE.BufferGeometry(); dots.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(dots, new THREE.PointsMaterial({ color: '#b4cab3', size: .025, transparent: true, opacity: .5, sizeAttenuation: true })));

  for (let i = 0; i < 9; i++) {
    const group = new THREE.Group(); group.position.set(i * 13, 0, Math.sin(i * .8) * 7); scene.add(group);
    const art = new THREE.Group(); art.position.y = .4; group.add(art);
    const base = mesh(new THREE.CylinderGeometry(3.1, 3.35, .14, 80), mat('#10383d', { metalness: .55 }), group, [0, -2.1, 0]);
    const halo = ring(group, 3.1, '#719386', .012); halo.rotation.x = -Math.PI / 2; halo.position.y = -2.02;
    const outer = ring(group, 3.6, '#2d6261', .007); outer.rotation.x = -Math.PI / 2; outer.position.y = -2.03;
    group.userData.chapter = i; base.userData.chapter = i;
    stations.push({ group, art, target: group.position.clone().add(new THREE.Vector3(0, .4, 0)) });
  }
  // A continuous path ties the separate ideas into one explorable lesson.
  tube(scene, stations.map(s => [s.group.position.x, -2, s.group.position.z]), .016, mat('#3e7a70', { emissive: '#3e7a70', emissiveIntensity: .4 }));

  // 01: source-derived brain and dimensional day/night orbit.
  const cover = brain(stations[0].art, source); cover.rotation.set(.08, -.3, -.06);
  const dayOrbit = new THREE.Group(); stations[0].art.add(dayOrbit); dayOrbit.rotation.z = -.35;
  const orbitRing = ring(dayOrbit, 2.5, '#a48c58'); orbitRing.rotation.y = .4;
  const sun = ball(dayOrbit, [2.5, 0, 0], .34, glow('#f1ce6c'));
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; rod(sun, [Math.cos(a)*.42,Math.sin(a)*.42,0],[Math.cos(a)*.56,Math.sin(a)*.56,0], .012, gold); }
  const moon = ball(dayOrbit, [-2.5, 0, 0], .28, mat('#b4d2c7')); ball(moon, [.07,.05,.24], .1, mat('#6c9a96'));
  animators.push(t => { dayOrbit.rotation.z = state.day * Math.PI * 2 + t * .035; cover.rotation.y = -.25 + Math.sin(t * .25) * .15; });

  // 02: an open, genuinely volumetric cave, with a clock in its interior.
  const cave = stations[1].art;
  for(let i = 0; i < 19; i++) {
    const a = i / 18 * Math.PI;
    const rock = mesh(new THREE.DodecahedronGeometry(.62, 0), mat(i%3 ? '#315453' : '#4a6660', {roughness: .95}), cave, [Math.cos(a)*2.15,Math.sin(a)*2.3-.9, -.2 + (i%2)*.2], [1.05,1.2,1.65]); rock.rotation.set(i*.5,i*.3,i*.2);
  }
  const caveClock = clock(cave, .65); caveClock.position.set(0,-.2,-.65);
  const caveLamp = new THREE.PointLight('#efd48a', 15, 8); caveLamp.position.set(0,1,1); cave.add(caveLamp);
  const lampBall = ball(cave,[0,1.65,0],.12,glow(GOLD));
  animators.push(t => { caveClock.userData.animate(t); caveLamp.intensity = state.lightCue ? 18 : .2; lampBall.visible = state.lightCue; });

  // 03: three activities around a central clock.
  const rhythms = stations[2].art, mainClock = clock(rhythms, 1.05);
  [-1, 0, 1].forEach((n,i) => {
    const a = i / 3 * Math.PI * 2 + .5, p = [Math.cos(a)*2,Math.sin(a)*1.8, .2];
    rod(rhythms,[0,0,-.15],p,.018,mint);
    if(i===0) { const m=ball(rhythms,p,.4,mint); ball(m,[.12,.06,.32],.2,dark); }
    if(i===1) { const s=ball(rhythms,p,.32,glow(GOLD)); for(let j=0;j<8;j++){let a=j*Math.PI/4;rod(s,[Math.cos(a)*.42,Math.sin(a)*.42,0],[Math.cos(a)*.56,Math.sin(a)*.56,0],.018,gold);} }
    if(i===2) { const dish=mesh(new THREE.TorusGeometry(.36,.06,8,36),coral,rhythms,p); ball(dish,[0,0,0],.28,coral,[1,1,.25]); }
  });
  animators.push(t => mainClock.userData.animate(t));

  // 04: the source's brain-clock motif rebuilt in depth.
  const brainClock = brain(stations[3].art,source); brainClock.scale.setScalar(.83);
  const dial = clock(stations[3].art,2.25); dial.position.z = -.8;
  animators.push(t => { dial.userData.animate(t*.55); brainClock.rotation.y = Math.sin(t*.3)*.2; });

  // 05: three repeating paths, each moving through real depth.
  const interval = stations[4].art;
  for(let i = 0; i<3;i++) {
    const path = ring(interval,2.1,i===1?GOLD:MINT,.018); path.rotation.x=1.03;path.rotation.z=.22;path.position.y=(i-1)*1.1;
    const marker=ball(interval,[0,0,0],.12,i===1?gold:coral);
    animators.push(t => { const a=t*.7*state.speed+i*2;marker.position.set(Math.cos(a)*2.1, (i-1)*1.1+Math.sin(a)*1.05,Math.sin(a)*1.8); });
  }

  // 06: SCN focus. The emphasis is conceptual, not an anatomical localization model.
  const scnBrain = brain(stations[5].art,source); scnBrain.rotation.y=-.18;
  const scnFocus = new THREE.Group(); stations[5].art.add(scnFocus);scnFocus.position.set(0,-.9,.95);
  const focusClock=clock(scnFocus,.35); const focusGlow=ring(scnFocus,.56,GOLD,.012);
  animators.push(t=> { focusClock.userData.animate(t);focusGlow.scale.setScalar(1+Math.sin(t*2)*.06);scnBrain.userData.lobes.forEach((l,j)=>{ l.position.x=THREE.MathUtils.damp(l.position.x,state.separate?(j? -.8:.8):0,5,.016); }); });

  // 07: proteins occupy a transparent 3D cell rather than a video plane.
  const cell=stations[6].art;
  ball(cell,[0,0,0],1.9,mat('#64a69d',{transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}),[1,1.08,1]);
  const cellRing=ring(cell,1.9,MINT,.02);cellRing.rotation.y=.45;
  for(let i=0;i<15;i++){
    const a=i*2.4,r=.6+(i%4)*.28,p=protein(cell,[Math.cos(a)*r,Math.sin(a)*r,Math.sin(i*1.8)*1.1],GOLD,.12);
    animators.push(t=>{p.rotation.set(t*.18+i,t*.23+i,t*.08);p.position.y=Math.sin(a)*r+Math.sin(t*.7+i)*.08;});
  }

  // 08: 3D double helix with progressive reveal and outgoing protein motifs.
  const dna=stations[7].art;dna.rotation.set(.05,0,-.32);
  const dnaParts=[];
  for(let side=0;side<2;side++){
    const pts=[];for(let j=0;j<=100;j++){let y=j/100*4.3-2.15,a=j/100*Math.PI*4+side*Math.PI;pts.push([Math.cos(a)*.66,y,Math.sin(a)*.66]);}
    tube(dna,pts,.055,side?coral:gold);
  }
  for(let i=0;i<24;i++){
    const a=i/23*Math.PI*4,y=i/23*4.3-2.15;
    const rung=rod(dna,[Math.cos(a)*.66,y,Math.sin(a)*.66],[-Math.cos(a)*.66,y,-Math.sin(a)*.66],.035,mint);dnaParts.push(rung);
  }
  for(let i=0;i<6;i++){const p=protein(stations[7].art,[1.4+i*.14,-1+i*.4,.4],CORAL,.12);animators.push(t=>{p.position.x=1.4+(t*.2+i*.22)%1.4;p.rotation.y=t*.5;});}
  animators.push(t=>{dna.rotation.y=t*.18;dnaParts.forEach((r,i)=>{r.visible=i/24<=state.reveal;});});

  // 09: loop back from protein accumulation to gene activity.
  const feedback=stations[8].art;
  const feedbackRing=ring(feedback,1.9,GOLD,.025);feedbackRing.rotation.y=.35;
  ball(feedback,[0,0,0],.9,mat('#5d9c96',{transparent:true,opacity:.18,depthWrite:false}));
  const inner=clock(feedback,.62);inner.rotation.y=.1;
  for(let i=0;i<9;i++){const p=protein(feedback,[0,0,0],i%2?CORAL:GOLD,.14);animators.push(t=>{const a=i/9*Math.PI*2+t*.35;p.position.set(Math.cos(a)*1.9,Math.sin(a)*1.9,Math.sin(a)*.6);p.rotation.y=t*.3;});}
  animators.push(t=>inner.userData.animate(t*.2));

  stations.forEach((s,i)=>s.art.traverse(o=>{if(o.isMesh){o.userData.chapter=i;interactives.push(o);}}));
  return {stations,state,interactives,update(t){animators.forEach(fn=>fn(t));}};
}
