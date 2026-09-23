import * as THREE from "three";

/** Deterministic grain and wear; never consumes the game's random generator. */
export function createBoneTextures() {
  const size = 256;
  const color = new Uint8Array(size * size * 4);
  const relief = new Uint8Array(size * size * 4);
  let seed = 14793;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain = random();
      const cloud =
        (Math.sin(x * 0.043 + Math.sin(y * 0.029) * 2) +
          Math.cos(y * 0.071 - x * 0.023)) *
        0.5;
      const fibers = Math.sin(x * 0.68 + Math.sin(y * 0.035) * 3);
      const pore = grain > 0.975 ? 30 : 0;
      const wear = cloud * 13 + fibers * 3 + (grain - 0.5) * 12 - pore;
      color[i] = Math.min(255, 242 + wear);
      color[i + 1] = Math.min(255, 232 + wear);
      color[i + 2] = Math.min(255, 209 + wear);
      color[i + 3] = 255;
      const height = 150 + fibers * 9 + grain * 28 - pore * 2;
      relief[i] = relief[i + 1] = relief[i + 2] = height;
      relief[i + 3] = 255;
    }
  }
  // Hairline fractures: irregular tapered paths with shallow branching grooves.
  const cracks = new Float32Array(size * size);
  const segment = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    width: number,
  ) => {
    const dx = bx - ax,
      dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    for (
      let y = Math.max(0, Math.floor(Math.min(ay, by) - 2));
      y <= Math.min(size - 1, Math.ceil(Math.max(ay, by) + 2));
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(Math.min(ax, bx) - 2));
        x <= Math.min(size - 1, Math.ceil(Math.max(ax, bx) + 2));
        x++
      ) {
        const t = THREE.MathUtils.clamp(
          ((x - ax) * dx + (y - ay) * dy) / Math.max(lengthSquared, 0.001),
          0,
          1,
        );
        const distance = Math.hypot(x - ax - t * dx, y - ay - t * dy);
        const coverage =
          1 - THREE.MathUtils.smoothstep(distance, width * 0.3, width + 0.65);
        cracks[y * size + x] = Math.max(cracks[y * size + x], coverage);
      }
    }
  };
  const fracture = (
    x: number,
    y: number,
    angle: number,
    steps: number,
    width: number,
    branch: boolean,
  ) => {
    for (let step = 0; step < steps; step++) {
      angle += (random() - 0.5) * 0.9;
      const length = 4 + random() * 7;
      const nextX = x + Math.cos(angle) * length;
      const nextY = y + Math.sin(angle) * length;
      segment(x, y, nextX, nextY, width * (1 - (step / steps) * 0.8));
      if (branch && (step === 3 || step === 7)) {
        fracture(
          x,
          y,
          angle + (random() > 0.5 ? 0.8 : -0.8),
          4,
          width * 0.55,
          false,
        );
      }
      x = nextX;
      y = nextY;
    }
  };
  fracture(42, 0, 1.2, 13, 0.85, true);
  fracture(255, 90, 2.8, 11, 0.7, true);
  fracture(110, 255, -1.1, 9, 0.65, true);
  fracture(35, 175, 0.4, 5, 0.4, false);
  for (let pixel = 0; pixel < cracks.length; pixel++) {
    const strength = cracks[pixel];
    if (!strength) continue;
    const i = pixel * 4;
    for (let channel = 0; channel < 3; channel++) {
      color[i + channel] = Math.round(
        THREE.MathUtils.lerp(
          color[i + channel],
          [91, 69, 44][channel],
          strength * 0.75,
        ),
      );
      relief[i + channel] = Math.max(0, relief[i + channel] - strength * 160);
    }
  }
  const colorMap = new THREE.DataTexture(color, size, size);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.DataTexture(relief, size, size);
  for (const texture of [colorMap, bumpMap]) {
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
  }
  return { colorMap, bumpMap };
}
