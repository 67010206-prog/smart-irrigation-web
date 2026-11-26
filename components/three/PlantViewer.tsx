'use client';

/**
 * PlantViewer — แคนวาส Three.js หนึ่งต้น
 *
 * หลักการประหยัดทรัพยากร:
 * - pixel ratio ไม่เกิน 1.5
 * - หยุด render เมื่อการ์ดอยู่นอกจอ (IntersectionObserver) หรือแท็บถูกซ่อน
 * - คืน geometry/material/WebGL context ทั้งหมดเมื่อ unmount
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { createPlant, type PlantVariant } from '../../lib/three/plants';

interface PlantViewerProps {
  variant: PlantVariant;
  /** คำอธิบายสำหรับ screen reader */
  label: string;
}

export default function PlantViewer({ variant, label }: PlantViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) return;

    let plant: ReturnType<typeof createPlant>;

    try {
      plant = createPlant(variant);
    } catch (error) {
      console.error('สร้างโมเดล 3 มิติไม่สำเร็จ:', error);
      setFailed(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch (error) {
      console.error('WebGL ไม่พร้อมใช้งาน:', error);
      plant.dispose();
      setFailed(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.className = 'plant-canvas';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    scene.add(plant.group);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
    const target = new THREE.Vector3(...plant.camera.target);

    camera.position.set(...plant.camera.position);
    camera.lookAt(target);

    scene.add(new THREE.HemisphereLight(0xe6f4ea, 0x6a6f5c, 1.35));

    const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);

    sun.position.set(2.4, 3.6, 2.2);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xcfe8dc, 0.65);

    fill.position.set(-2.2, 1.4, -2.4);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    const distance = camera.position.distanceTo(target);

    controls.target.copy(target);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = distance * 0.62;
    controls.maxDistance = distance * 1.55;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = 1.62;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.update();

    const resize = () => {
      const { clientWidth, clientHeight } = host;

      if (!clientWidth || !clientHeight) return;

      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);

    resizeObserver.observe(host);

    let onScreen = true;

    const intersection = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
      },
      { threshold: 0.02 }
    );

    intersection.observe(host);

    const clock = new THREE.Clock();
    let frame = 0;

    const animate = () => {
      frame = window.requestAnimationFrame(animate);

      if (!onScreen || document.hidden) return;

      const time = clock.getElapsedTime();

      // แกว่งเบา ๆ เหมือนลม — เกิดที่โคนต้น ไม่ใช่กระดิกทั้งกระถาง
      plant.pivot.rotation.z = Math.sin(time * 0.9) * 0.02;
      plant.pivot.rotation.x = Math.cos(time * 0.68) * 0.012;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      intersection.disconnect();
      resizeObserver.disconnect();
      controls.dispose();
      plant.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [variant]);

  return (
    <div className="plant-viewer">
      <div ref={hostRef} className="plant-viewer-host" role="img" aria-label={label} />

      {failed && (
        <div className="plant-viewer-fallback">เบราว์เซอร์นี้แสดงภาพ 3 มิติไม่ได้</div>
      )}

      <span className="plant-viewer-hint">ลากเพื่อหมุน</span>
    </div>
  );
}
