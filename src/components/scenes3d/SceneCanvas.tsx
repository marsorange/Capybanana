"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { Suspense } from "react";

interface SceneCanvasProps {
  children: ReactNode;
  controls?: "orbit" | "spin" | "none";
  cameraPosition?: [number, number, number];
  target?: [number, number, number];
  className?: string;
}

export default function SceneCanvas({
  children,
  controls = "none",
  cameraPosition = [0, 1.7, 3.7],
  target = [0, 0.7, 0],
  className,
}: SceneCanvasProps) {
  return (
    <Canvas
      className={className}
      shadows={false}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: cameraPosition, fov: 38, near: 0.1, far: 100 }}
    >
      <hemisphereLight args={["#fff4e0", "#d9c3a3", 0.9]} />
      <ambientLight intensity={0.5} color="#fff1da" />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.5}
        color="#fff0d4"
      />
      <directionalLight position={[-4, 3, -2]} intensity={0.4} color="#d7c6f0" />

      <Suspense fallback={null}>{children}</Suspense>

      <ContactShadows
        position={[0, 0.01, 0.3]}
        opacity={0.38}
        scale={7}
        blur={2.6}
        far={4}
        color="#5a4636"
      />

      {controls === "orbit" && (
        <OrbitControls
          makeDefault
          target={target}
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={1.05}
          maxPolarAngle={1.5}
          minAzimuthAngle={-0.55}
          maxAzimuthAngle={0.55}
        />
      )}
      {controls === "spin" && (
        <OrbitControls
          makeDefault
          target={target}
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.3}
          minPolarAngle={1.1}
          maxPolarAngle={1.45}
        />
      )}
    </Canvas>
  );
}
