import * as THREE from 'three';

// Your creative starting point. Add meshes, lights and interactions here.
export function createExperience(scene) {
  scene.add(new THREE.HemisphereLight('#cbd7ff', '#282039', 3));
  const key = new THREE.DirectionalLight('#ffffff', 5);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.PointLight('#8b72ff', 70);
  rim.position.set(-4, 2, -2);
  scene.add(rim);

  const shapes = {
    knot: () => new THREE.TorusKnotGeometry(1.15, 0.34, 180, 28),
    sphere: () => new THREE.IcosahedronGeometry(1.6, 1),
    cube: () => new THREE.BoxGeometry(2, 2, 2, 4, 4, 4),
  };
  const material = new THREE.MeshStandardMaterial({ color: '#b4a0ff', roughness: 0.24, metalness: 0.55 });
  const sculpture = new THREE.Mesh(shapes.knot(), material);
  sculpture.position.y = 0.5;
  scene.add(sculpture);

  const grid = new THREE.GridHelper(60, 60, '#41445b', '#242b3c');
  grid.position.y = -1.8;
  scene.add(grid);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.65, 0.008, 8, 160),
    new THREE.MeshBasicMaterial({ color: '#78699e' }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.78;
  scene.add(ring);

  let elapsed = 0;
  return {
    material,
    setShape(name) {
      if (!shapes[name]) return;
      sculpture.geometry.dispose();
      sculpture.geometry = shapes[name]();
    },
    update(delta) {
      elapsed += delta;
      sculpture.rotation.x += delta * 0.16;
      sculpture.rotation.y += delta * 0.35;
      sculpture.position.y = 0.5 + Math.sin(elapsed * 1.2) * 0.16;
    },
  };
}
