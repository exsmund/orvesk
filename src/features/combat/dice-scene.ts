import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { createBoneTextures } from "./dice-bone-texture";

// Opposite faces sum to seven. The same normals drive artwork and landing.
export const DIE_NORMALS = [
  [0, 1, 0],
  [1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
  [-1, 0, 0],
  [0, -1, 0],
] as const;
export function landingRotation(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 6)
    throw new Error("Invalid die value");
  return new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(...DIE_NORMALS[value - 1]),
    new THREE.Vector3(0, 1, 0),
  );
}
const PIPS = [
  [[0, 0]],
  [
    [-1, -1],
    [1, 1],
  ],
  [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ],
  [
    [-1, -1],
    [-1, 1],
    [0, 0],
    [1, -1],
    [1, 1],
  ],
  [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ],
];
/** Depress the face itself: pips are bowls in the bone, not overlay discs. */
export function createDieGeometry() {
  const source = new THREE.BoxGeometry(1.2, 1.2, 1.2, 80, 80, 80);
  const geometry = mergeVertices(source);
  source.dispose();
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const colors = new Float32Array(positions.count * 3);
  const point = new THREE.Vector3();
  const local = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const rotations = DIE_NORMALS.map((n) =>
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(...n),
      new THREE.Vector3(0, 0, 1),
    ),
  );
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    // Keep a uniformly subdivided face, rounding only the outer edge band.
    const inner = point.clone().clampScalar(-0.51, 0.51);
    point.sub(inner).normalize().multiplyScalar(0.09).add(inner);
    normal.fromBufferAttribute(normals, i);
    let cavityDepth = 0;
    for (let face = 0; face < 6; face++) {
      const direction = new THREE.Vector3(...DIE_NORMALS[face]);
      if (normal.dot(direction) < 0.999) continue;
      local.copy(point).applyQuaternion(rotations[face]);
      for (const [x, y] of PIPS[face]) {
        const radius = 0.115;
        const distance = Math.hypot(local.x - x * 0.27, local.y - y * 0.27);
        if (distance >= radius) continue;
        // Lower half of a sphere, with its equator flush with the die face.
        const depth = Math.sqrt(radius * radius - distance * distance);
        point.addScaledVector(direction, -depth);
        cavityDepth = depth;
      }
    }
    positions.setXYZ(i, point.x, point.y, point.z);
    // Neutral cavity shading preserves the bone hue without painted dots.
    const shade = 1 - 0.2 * THREE.MathUtils.smoothstep(cavityDepth, 0, 0.115);
    colors.set([shade, shade, shade], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
export function createDiceScene(
  host: HTMLElement,
  values: [number, number],
  reduced: boolean,
) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 10.35, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff6e7, 0x242a22, 2.1));
  const light = new THREE.DirectionalLight(0xfff4e3, 3);
  // Camera up is -Z: negative X / negative Z is the screen’s top-left.
  light.position.set(-3, 8, -4);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  scene.add(light);
  const floorGeometry = new THREE.PlaneGeometry(30, 30);
  const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.65;
  floor.receiveShadow = true;
  scene.add(floor);
  const geometry = createDieGeometry();
  const { colorMap, bumpMap } = createBoneTextures();
  const materials: THREE.Material[] = [floorMaterial];
  const dice = values.map((value, index) => {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: index ? 0xcfc3ad : 0xe8dfce,
      map: colorMap,
      bumpMap,
      bumpScale: 0.014,
      vertexColors: true,
      roughness: 0.76,
      metalness: 0,
    });
    materials.push(bodyMaterial);
    const body = new THREE.Mesh(geometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    scene.add(group);
    return { group, target: landingRotation(value), x: index ? 1.3 : -1.3 };
  });
  const resize = () => {
    const width = host.clientWidth,
      height = host.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = Math.max(width, 1) / Math.max(height, 1);
    // Fit the whole throwing trajectory, including the cube radius and bounce height.
    const distance =
      Math.max(3.2, 4.9 / camera.aspect) /
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) +
      2.5;
    camera.position.set(0, distance, 0);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const start = performance.now();
  const spin = new THREE.Quaternion();
  renderer.setAnimationLoop(() => {
    const t = reduced ? 1 : Math.min((performance.now() - start) / 2400, 1);
    const remaining = (1 - t) ** 2;
    dice.forEach(({ group, target, x }, i) => {
      group.position.set(
        x + (i ? 1 : -1) * remaining * 2,
        Math.abs(Math.sin(t * Math.PI * 4)) * remaining * 2.5,
        remaining * -2,
      );
      spin.setFromEuler(
        new THREE.Euler(
          remaining * Math.PI * 8,
          remaining * Math.PI * (i ? -6 : 6),
          remaining * Math.PI * 4,
        ),
      );
      group.quaternion.copy(target).multiply(spin);
    });
    renderer.render(scene, camera);
  });
  return () => {
    observer.disconnect();
    renderer.setAnimationLoop(null);
    geometry.dispose();
    colorMap.dispose();
    bumpMap.dispose();
    floorGeometry.dispose();
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  };
}
