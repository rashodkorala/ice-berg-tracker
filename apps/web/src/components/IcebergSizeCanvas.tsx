"use client";

import { Grid, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import * as THREE from "three";

import type { BergDimensions } from "@/lib/iceberg-3d";

export interface IcebergSizeCanvasProps {
  scales: { sx: number; sy: number; sz: number };
  icebergKey: string;
}

function AnimatedIceBlock({
  sx,
  sy,
  sz,
  icebergKey,
}: {
  sx: number;
  sy: number;
  sz: number;
  icebergKey: string;
}) {
  const groupRef = useRef<Group>(null);
  const target = useMemo(() => new THREE.Vector3(sx, sy, sz), [sx, sy, sz]);
  const animated = useRef(new THREE.Vector3(0.04, 0.04, 0.04));

  useEffect(() => {
    animated.current.set(0.04, 0.04, 0.04);
  }, [icebergKey, sx, sy, sz]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    animated.current.lerp(target, 1 - Math.exp(-8 * delta));
    groupRef.current.scale.copy(animated.current);
  });

  return (
    <group ref={groupRef}>
      <RoundedBox args={[1, 1, 1]} radius={0.06} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial
          color="#cfe8ef"
          roughness={0.42}
          metalness={0.06}
          envMapIntensity={0.85}
        />
      </RoundedBox>
    </group>
  );
}

function SceneContent({ scales, icebergKey }: IcebergSizeCanvasProps) {
  return (
    <>
      <color attach="background" args={["#f5f9fb"]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[8, 12, 8]} intensity={1.35} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 4, -4]} intensity={0.38} />

      <mesh position={[0, -0.51, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial color="#94bcca" opacity={0.5} transparent roughness={1} metalness={0} />
      </mesh>

      <AnimatedIceBlock sx={scales.sx} sy={scales.sy} sz={scales.sz} icebergKey={icebergKey} />

      <Grid
        position={[0, -0.62, 0]}
        args={[20, 20]}
        cellSize={0.35}
        cellThickness={0.6}
        cellColor="#c5d6de"
        sectionSize={3.15}
        sectionThickness={1}
        sectionColor="#9fb7c4"
        fadeDistance={22}
        infiniteGrid
      />

      <OrbitControls
        enablePan
        minDistance={1.4}
        maxDistance={9}
        maxPolarAngle={Math.PI / 2 - 0.08}
        target={[0, 0.12, 0]}
      />
    </>
  );
}

export function IcebergSizeCanvas(props: IcebergSizeCanvasProps) {
  return (
    <div className="h-[min(360px,55vh)] w-full overflow-hidden rounded-lg border border-border bg-[#f5f9fb]">
      <Canvas
        shadows
        camera={{ position: [2.8, 2.2, 2.8], fov: 42, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export function formatDimensionSummary(dim: BergDimensions): string {
  const fmt = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m).toLocaleString()} m`;
  return `≈ ${fmt(dim.lengthM)} × ${fmt(dim.widthM)} footprint · ${fmt(dim.thicknessM)} thick (inferred)`;
}
