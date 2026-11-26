/**
 * โมเดลพืช 3 มิติแบบ Procedural (สร้างจาก geometry ในโค้ด 100%)
 *
 * แนวทางเดียวกับ img2threejs: อ่านรูปอ้างอิง → เขียน spec → ประกอบจาก primitive
 * ไม่โหลดไฟล์ .glb/.obj และไม่ใช้ texture รูปถ่าย จึงไม่มีพื้นหลังต้องลบ
 * และไม่ต้องโหลด asset จากภายนอกเลย (ทุกอย่างคำนวณในเบราว์เซอร์)
 *
 * หน่วยของฉาก: 1 unit = 1 เมตร (ข้าวสูง ~0.7 m, ยางพาราในแบบจำลอง ~2.2 m)
 */

import * as THREE from 'three';

export type PlantVariant = 'rice' | 'rubber' | 'flower';

export interface PlantModel {
  group: THREE.Group;
  /** โหนดของส่วนเหนือดิน — ใช้แกว่งเบา ๆ แทนลม */
  pivot: THREE.Object3D;
  /** ตำแหน่งกล้องที่จัดเฟรมให้เห็นทั้งต้น */
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  dispose: () => void;
}

interface Disposer {
  track: <T extends { dispose: () => void }>(item: T) => T;
  dispose: () => void;
}

function createDisposer(): Disposer {
  const items: Array<{ dispose: () => void }> = [];

  return {
    track: (item) => {
      items.push(item);
      return item;
    },
    dispose: () => {
      for (const item of items) item.dispose();
      items.length = 0;
    },
  };
}

/** สุ่มแบบมี seed → โมเดลหน้าตาเดิมทุกครั้งที่ mount ใหม่ */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BladeOptions {
  length: number;
  width: number;
  segments?: number;
  /** ปลายใบโค้งไปข้างหน้าแค่ไหน */
  droop?: number;
  /** ความสูงของสันกลางใบ (กันใบแบนเป็นกระดาษ) */
  fold?: number;
}

/**
 * ใบไม้แบบ ribbon: ต่อหนึ่งปล้องมี 3 จุด (ซ้าย · กลางที่ยกขึ้น · ขวา)
 * ปลายเรียวลงเป็น 0 พอดี เพื่อไม่ให้เห็นสี่เหลี่ยมตัด
 */
function bladeGeometry({
  length,
  width,
  segments = 6,
  droop = 0,
  fold = 0,
}: BladeOptions): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const y = length * t;
    const z = droop * t * t;
    const taper = Math.pow(1 - t, 0.7);
    const shape = 0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.7));
    const half = i === segments ? 0 : width * taper * shape;

    positions.push(-half, y, z, 0, y, z + fold * taper, half, y, z);
  }

  for (let i = 0; i < segments; i += 1) {
    const a = i * 3;
    const b = (i + 1) * 3;

    indices.push(a, b, b + 1, a, b + 1, a + 1);
    indices.push(a + 1, b + 1, b + 2, a + 1, b + 2, a + 2);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/** วางทรงกระบอกระหว่างสองจุด (ใช้ทำกิ่งและก้าน) */
function cylinderBetween(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radiusTop: number,
  radiusBottom: number,
  material: THREE.Material,
  disposer: Disposer
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 8, 1, false);

  disposer.track(geometry);

  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );

  return mesh;
}

/* =========================================================
 * 1) ข้าว กข43 — กอข้าว + ใบ + รวง
 * ========================================================= */

function buildRice(disposer: Disposer): PlantModel {
  const random = createRandom(20261120);
  const group = new THREE.Group();
  const pivot = new THREE.Group();

  pivot.position.y = 0.062;
  group.add(pivot);

  // ถาดเพาะ + ผิวนา
  const trayGeometry = new THREE.CylinderGeometry(0.19, 0.17, 0.062, 26);
  const trayMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.94 });

  disposer.track(trayGeometry);
  disposer.track(trayMaterial);

  const tray = new THREE.Mesh(trayGeometry, trayMaterial);

  tray.position.y = 0.031;
  group.add(tray);

  const waterGeometry = new THREE.CylinderGeometry(0.177, 0.177, 0.004, 26);
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x8fc3b1,
    roughness: 0.12,
    metalness: 0.05,
    transparent: true,
    opacity: 0.72,
  });

  disposer.track(waterGeometry);
  disposer.track(waterMaterial);

  const water = new THREE.Mesh(waterGeometry, waterMaterial);

  water.position.y = 0.063;
  group.add(water);

  // วัสดุของต้นข้าว
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x66963c, roughness: 0.72 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x77b243,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  const grainMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c25c, roughness: 0.52 });

  const leafGeometry = disposer.track(
    bladeGeometry({ length: 0.34, width: 0.017, droop: 0.17, fold: 0.006, segments: 7 })
  );
  const grainGeometry = disposer.track(new THREE.SphereGeometry(1, 6, 4));

  const tillers = 9;

  for (let index = 0; index < tillers; index += 1) {
    const angle = (index / tillers) * Math.PI * 2 + random() * 0.5;
    const radius = 0.012 + random() * 0.072;
    const height = 0.54 + random() * 0.24;
    const lean = 0.04 + random() * 0.1;

    const base = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    const curve = new THREE.CatmullRomCurve3([
      base,
      new THREE.Vector3(
        base.x + Math.cos(angle) * lean * 0.35,
        height * 0.55,
        base.z + Math.sin(angle) * lean * 0.35
      ),
      new THREE.Vector3(
        base.x + Math.cos(angle) * lean,
        height,
        base.z + Math.sin(angle) * lean
      ),
    ]);

    const stemGeometry = new THREE.TubeGeometry(curve, 9, 0.0048, 5, false);

    disposer.track(stemGeometry);
    pivot.add(new THREE.Mesh(stemGeometry, stemMaterial));

    // ใบ 4 ใบต่อกอ ไล่ระดับความสูงขึ้นไป
    for (let leaf = 0; leaf < 4; leaf += 1) {
      const point = curve.getPoint(0.24 + leaf * 0.19);
      const blade = new THREE.Mesh(leafGeometry, leafMaterial);

      blade.position.copy(point);
      blade.rotation.y = angle + (leaf - 1.5) * 0.85 + random() * 0.4;
      blade.rotation.x = 0.6 + random() * 0.35;
      blade.scale.setScalar(0.85 + random() * 0.4);
      pivot.add(blade);
    }

    // รวงข้าว: เม็ดข้าวเรียงตามเส้นโค้งที่โน้มลง (InstancedMesh ตัวเดียวต่อรวง)
    if (index % 2 === 0) {
      const tip = curve.getPoint(1);
      const head = new THREE.CatmullRomCurve3([
        tip,
        new THREE.Vector3(
          tip.x + Math.cos(angle) * 0.05,
          tip.y - 0.03,
          tip.z + Math.sin(angle) * 0.05
        ),
        new THREE.Vector3(
          tip.x + Math.cos(angle) * 0.14,
          tip.y - 0.14,
          tip.z + Math.sin(angle) * 0.14
        ),
      ]);

      const grains = new THREE.InstancedMesh(grainGeometry, grainMaterial, 30);
      const dummy = new THREE.Object3D();

      for (let grain = 0; grain < 30; grain += 1) {
        const point = head.getPoint(grain / 29);

        dummy.position.set(
          point.x + (random() - 0.5) * 0.028,
          point.y + (random() - 0.5) * 0.018,
          point.z + (random() - 0.5) * 0.028
        );
        dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
        dummy.scale.set(0.0075, 0.019, 0.0075);
        dummy.updateMatrix();
        grains.setMatrixAt(grain, dummy.matrix);
      }

      grains.instanceMatrix.needsUpdate = true;
      disposer.track(grains);
      pivot.add(grains);
    }
  }

  return {
    group,
    pivot,
    camera: { position: [0.95, 0.62, 1.15], target: [0, 0.4, 0] },
    dispose: disposer.dispose,
  };
}

/* =========================================================
 * 2) ไม้ยืนต้น (แบบยางพารา) — ลำต้น + กิ่ง + เรือนยอด
 * ========================================================= */

function buildRubber(disposer: Disposer): PlantModel {
  const random = createRandom(830921);
  const group = new THREE.Group();
  const pivot = new THREE.Group();

  pivot.position.y = 0.048;
  group.add(pivot);

  // แปลงปลูก + ดิน
  const soilGeometry = new THREE.CylinderGeometry(0.3, 0.27, 0.07, 28);
  const soilMaterial = new THREE.MeshStandardMaterial({ color: 0x4c4136, roughness: 0.95 });

  disposer.track(soilGeometry);
  disposer.track(soilMaterial);

  const soil = new THREE.Mesh(soilGeometry, soilMaterial);

  soil.position.y = 0.035;
  group.add(soil);

  const barkMaterial = new THREE.MeshStandardMaterial({ color: 0x7d6b58, roughness: 0.88 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f6b3c,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: 0x24532f,
    roughness: 0.8,
    flatShading: true,
  });

  // ลำต้นเรียวสอบขึ้นบน
  const trunkGeometry = new THREE.CylinderGeometry(0.036, 0.072, 1.14, 14, 1);
  const trunk = new THREE.Mesh(trunkGeometry, barkMaterial);

  disposer.track(trunkGeometry);
  trunk.position.y = 0.57;
  pivot.add(trunk);

  // รากที่โผล่พ้นดิน
  const rootGeometry = disposer.track(new THREE.ConeGeometry(0.03, 0.14, 6));

  for (let root = 0; root < 5; root += 1) {
    const angle = (root / 5) * Math.PI * 2 + 0.4;
    const cone = new THREE.Mesh(rootGeometry, barkMaterial);

    cone.position.set(Math.cos(angle) * 0.055, 0.03, Math.sin(angle) * 0.055);
    cone.rotation.set(Math.cos(angle) * 1.9, 0, -Math.sin(angle) * 1.9);
    pivot.add(cone);
  }

  // กิ่ง 4 กิ่ง — ปลายกิ่งใช้เป็นจุดศูนย์กลางของกลุ่มใบ
  const clusterCenters: THREE.Vector3[] = [new THREE.Vector3(0, 1.3, 0)];
  const branchTips = 4;

  for (let branch = 0; branch < branchTips; branch += 1) {
    const angle = (branch / branchTips) * Math.PI * 2 + random() * 0.35;
    const start = new THREE.Vector3(
      Math.cos(angle) * 0.02,
      0.86 + random() * 0.2,
      Math.sin(angle) * 0.02
    );
    const end = new THREE.Vector3(
      Math.cos(angle) * (0.33 + random() * 0.14),
      start.y + 0.36 + random() * 0.16,
      Math.sin(angle) * (0.33 + random() * 0.14)
    );

    pivot.add(cylinderBetween(start, end, 0.012, 0.026, barkMaterial, disposer));
    clusterCenters.push(end);
  }

  // เรือนยอด: ใบแบบ instanced + ก้อนใบด้านในกันมองทะลุ
  const leafGeometry = disposer.track(
    bladeGeometry({ length: 0.17, width: 0.058, droop: 0.035, fold: 0.004, segments: 5 })
  );
  const shellGeometry = disposer.track(new THREE.IcosahedronGeometry(0.16, 0));
  const dummy = new THREE.Object3D();

  for (const center of clusterCenters) {
    const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, 84);

    for (let leaf = 0; leaf < 84; leaf += 1) {
      // กระจายบนเปลือกทรงรีรอบจุดศูนย์กลาง
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * random());
      const radius = 0.14 + random() * 0.15;

      dummy.position.set(
        center.x + Math.sin(phi) * Math.cos(theta) * radius,
        center.y + Math.cos(phi) * radius * 0.62,
        center.z + Math.sin(phi) * Math.sin(theta) * radius
      );
      dummy.rotation.set(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2);
      dummy.scale.setScalar(0.8 + random() * 0.55);
      dummy.updateMatrix();
      leaves.setMatrixAt(leaf, dummy.matrix);
    }

    leaves.instanceMatrix.needsUpdate = true;
    disposer.track(leaves);
    pivot.add(leaves);

    const shell = new THREE.Mesh(shellGeometry, shadeMaterial);

    shell.position.copy(center);
    shell.scale.set(1, 0.72, 1);
    shell.rotation.set(random() * 3, random() * 3, random() * 3);
    pivot.add(shell);
  }

  return {
    group,
    pivot,
    camera: { position: [2.05, 1.5, 2.45], target: [0, 1.05, 0] },
    dispose: disposer.dispose,
  };
}

/* =========================================================
 * 3) ไม้ดอกเหลือง — ใบกว้าง + ก้านชู + ดอกจาน
 * ========================================================= */

function buildFlower(disposer: Disposer): PlantModel {
  const random = createRandom(4711);
  const group = new THREE.Group();
  const pivot = new THREE.Group();

  pivot.position.y = 0.058;
  group.add(pivot);

  const potGeometry = new THREE.CylinderGeometry(0.16, 0.135, 0.058, 24);
  const potMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4136, roughness: 0.94 });

  disposer.track(potGeometry);
  disposer.track(potMaterial);

  const pot = new THREE.Mesh(potGeometry, potMaterial);

  pot.position.y = 0.029;
  group.add(pot);

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f7d34,
    roughness: 0.62,
    side: THREE.DoubleSide,
  });
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x4f8a37, roughness: 0.7 });
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2c02c,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });
  const discMaterial = new THREE.MeshStandardMaterial({ color: 0x8a5a15, roughness: 0.8 });

  // ใบกว้างกางออกจากโคน
  const leafGeometry = disposer.track(
    bladeGeometry({ length: 0.24, width: 0.085, droop: 0.1, fold: 0.012, segments: 7 })
  );

  for (let leaf = 0; leaf < 15; leaf += 1) {
    const blade = new THREE.Mesh(leafGeometry, leafMaterial);

    blade.rotation.y = random() * Math.PI * 2;
    blade.rotation.x = 0.95 + random() * 0.55;
    blade.scale.setScalar(0.7 + random() * 0.55);
    pivot.add(blade);
  }

  // ดอก: จานกลาง + กลีบโดยรอบ (instanced)
  const petalGeometry = disposer.track(
    bladeGeometry({ length: 0.066, width: 0.026, droop: 0.008, fold: 0.003, segments: 4 })
  );
  const discGeometry = disposer.track(new THREE.CylinderGeometry(0.028, 0.032, 0.015, 16));
  const domeGeometry = disposer.track(new THREE.SphereGeometry(0.024, 12, 8));

  const stems = 7;

  for (let index = 0; index < stems; index += 1) {
    const angle = (index / stems) * Math.PI * 2 + random() * 0.6;
    const height = 0.2 + random() * 0.16;
    const lean = 0.05 + random() * 0.08;

    const tip = new THREE.Vector3(Math.cos(angle) * lean, height, Math.sin(angle) * lean);

    pivot.add(
      cylinderBetween(new THREE.Vector3(0, 0, 0), tip, 0.0035, 0.005, stemMaterial, disposer)
    );

    const head = new THREE.Group();

    head.position.copy(tip);
    head.rotation.set((random() - 0.5) * 0.7, random() * Math.PI * 2, (random() - 0.5) * 0.7);

    const disc = new THREE.Mesh(discGeometry, discMaterial);

    disc.position.y = 0.012;
    head.add(disc);

    const dome = new THREE.Mesh(domeGeometry, discMaterial);

    dome.position.y = 0.022;
    dome.scale.set(1, 0.55, 1);
    head.add(dome);

    const petals = new THREE.InstancedMesh(petalGeometry, petalMaterial, 13);
    const dummy = new THREE.Object3D();

    for (let petal = 0; petal < 13; petal += 1) {
      const petalAngle = (petal / 13) * Math.PI * 2;
      const outward = new THREE.Vector3(
        Math.cos(petalAngle),
        0.16,
        Math.sin(petalAngle)
      ).normalize();

      dummy.position.set(Math.cos(petalAngle) * 0.03, 0.014, Math.sin(petalAngle) * 0.03);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);
      dummy.scale.setScalar(0.92 + random() * 0.2);
      dummy.updateMatrix();
      petals.setMatrixAt(petal, dummy.matrix);
    }

    petals.instanceMatrix.needsUpdate = true;
    disposer.track(petals);
    head.add(petals);
    pivot.add(head);
  }

  // ตาดอกที่ยังไม่บาน
  const budGeometry = disposer.track(new THREE.SphereGeometry(0.02, 10, 8));

  for (let bud = 0; bud < 3; bud += 1) {
    const angle = random() * Math.PI * 2;
    const height = 0.12 + random() * 0.1;

    pivot.add(
      cylinderBetween(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(angle) * 0.06, height, Math.sin(angle) * 0.06),
        0.003,
        0.004,
        stemMaterial,
        disposer
      )
    );

    const mesh = new THREE.Mesh(budGeometry, leafMaterial);

    mesh.position.set(Math.cos(angle) * 0.06, height + 0.015, Math.sin(angle) * 0.06);
    mesh.scale.set(1, 1.5, 1);
    pivot.add(mesh);
  }

  return {
    group,
    pivot,
    camera: { position: [0.72, 0.46, 0.88], target: [0, 0.2, 0] },
    dispose: disposer.dispose,
  };
}

/** สร้างโมเดลตามชนิดพืช — คืน group พร้อม disposer สำหรับคืนหน่วยความจำ */
export function createPlant(variant: PlantVariant): PlantModel {
  const disposer = createDisposer();

  if (variant === 'rice') return buildRice(disposer);
  if (variant === 'rubber') return buildRubber(disposer);

  return buildFlower(disposer);
}
