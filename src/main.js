import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGL from 'three/addons/capabilities/WebGL.js';
import './style.css';

// Change the geometry, materials and animation in experience.js to make this yours.
import { createExperience } from './experience.js';

const canvas = document.querySelector('#scene');
const error = document.querySelector('#error');

function showError(message) {
  error.textContent = message;
  error.hidden = false;
}

if (!WebGL.isWebGL2Available()) {
  showError('This scene needs WebGL 2. Enable hardware acceleration in your browser and reload.');
} else {
  try { start(); } catch (cause) {
    console.error(cause);
    showError('The 3D scene could not start. Check the browser console for details.');
  }
}

function start() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10141d');
  scene.fog = new THREE.FogExp2('#10141d', 0.035);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(5, 3, 8);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.target.set(0, 0.25, 0);
  controls.update();
  controls.saveState();

  const experience = createExperience(scene);
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let speed = 0.6;
  const pauseButton = document.querySelector('#pause');
  const updatePauseButton = () => {
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    pauseButton.setAttribute('aria-pressed', String(paused));
  };
  updatePauseButton();
  pauseButton.addEventListener('click', () => { paused = !paused; updatePauseButton(); });
  document.querySelector('#reset').addEventListener('click', () => controls.reset());
  document.querySelector('#shape').addEventListener('change', (event) => experience.setShape(event.target.value));
  document.querySelector('#color').addEventListener('input', (event) => experience.material.color.set(event.target.value));
  document.querySelector('#wireframe').addEventListener('change', (event) => { experience.material.wireframe = event.target.checked; });
  document.querySelector('#speed').addEventListener('input', (event) => {
    speed = Number(event.target.value);
    document.querySelector('#speed-value').textContent = `${speed.toFixed(1)}×`;
  });

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', resize);
  let previous = performance.now();
  renderer.setAnimationLoop((now) => {
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    if (!paused && !document.hidden) experience.update(delta * speed);
    controls.update();
    renderer.render(scene, camera);
  });

  // Release GPU resources when Vite replaces this module during development.
  if (import.meta.hot) import.meta.hot.dispose(() => {
    renderer.setAnimationLoop(null);
    removeEventListener('resize', resize);
    controls.dispose();
    scene.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material?.dispose());
    });
    renderer.dispose();
  });
}
