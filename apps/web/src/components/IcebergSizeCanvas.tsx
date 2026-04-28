"use client";

import { Grid, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import * as THREE from "three";

import type { BergDimensions } from "@/lib/iceberg-3d";

export interface IcebergSizeCanvasProps {
  scales: { sx: number; sy: number; sz: number };
  icebergKey: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Stable numeric seed from the iceberg name so each berg gets a unique shape. */
function nameToSeed(name: string): number {
  let h = 0;
  for (const c of name) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/**
 * Waterline in model space.  The unit model spans y ∈ [−0.5, +0.5].
 * Setting WATERLINE_Y = 0.30 puts the waterline 80 % of the way up,
 * leaving ~20 % of the berg above the surface.
 */
const WATERLINE_Y = 0.30;

/**
 * With localClippingEnabled = true (set on the Canvas) Three.js transforms
 * material clipping planes through each mesh's worldMatrix before clipping,
 * so planes defined in local model space automatically scale with the group.
 *
 * aboveWaterPlane: shows geometry above the waterline  (y > WATERLINE_Y)
 * belowWaterPlane: shows geometry below the waterline  (y < WATERLINE_Y)
 */
const aboveWaterPlane = new THREE.Plane(new THREE.Vector3(0,  1, 0), -WATERLINE_Y);
const belowWaterPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0),  WATERLINE_Y);

// ─── geometry ─────────────────────────────────────────────────────────────────

/**
 * Procedural iceberg BufferGeometry:
 *  1. LatheGeometry from a hand-tuned profile (wider near waterline, tapered top/bottom).
 *  2. Layered sine-noise on every vertex → organic, irregular surface.
 *     Noise is stronger above the waterline (craggy peaks) and weaker below (erosion).
 */
function buildIcebergGeo(seed: number): THREE.BufferGeometry {
  const s = (seed % 997) * 0.00628; // map seed → trig offset 0 … 6.27

  const points: THREE.Vector2[] = [
    new THREE.Vector2(0.01, -0.50), // bottom tip
    new THREE.Vector2(0.08, -0.44),
    new THREE.Vector2(0.20, -0.34),
    new THREE.Vector2(0.32, -0.18),
    new THREE.Vector2(0.41,  0.02), // widest near waterline
    new THREE.Vector2(0.39,  0.18),
    new THREE.Vector2(0.34,  WATERLINE_Y - 0.01),
    new THREE.Vector2(0.29,  WATERLINE_Y),
    new THREE.Vector2(0.21,  WATERLINE_Y + 0.06),
    new THREE.Vector2(0.15,  0.41),
    new THREE.Vector2(0.08,  0.46),
    new THREE.Vector2(0.02,  0.50), // top peak
  ];

  const geo = new THREE.LatheGeometry(points, 20);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + z * z);
    if (r < 0.015) continue; // skip pole/tip vertices

    const angle = Math.atan2(z, x);

    // Noise magnitude grows toward the top; above-water section is extra craggy
    const heightFactor = y + 0.5;           // 0 at bottom → 1 at top
    const cragMultiplier = y > WATERLINE_Y ? 1.5 : 1.0;
    const noiseMag = 0.08 * heightFactor * cragMultiplier;

    const n =
      Math.sin(angle * 4.2 + y * 8.5 + s) * Math.cos(angle * 2.8 - y * 6.3 + s * 1.7) * 0.65 +
      Math.sin(angle * 7.1 + y * 13.1 + s * 2.9) * 0.25 +
      Math.cos(angle * 1.6 + y *  4.4 + s * 0.9) * 0.10;

    const newR = Math.max(0.01, r + n * noiseMag);
    pos.setXYZ(i, Math.cos(angle) * newR, y, Math.sin(angle) * newR);
  }

  geo.computeVertexNormals();
  return geo;
}

// ─── animated iceberg ─────────────────────────────────────────────────────────

function AnimatedIceberg({
  sx, sy, sz, icebergKey,
}: {
  sx: number; sy: number; sz: number; icebergKey: string;
}) {
  const groupRef = useRef<Group>(null);
  const target    = useMemo(() => new THREE.Vector3(sx, sy, sz), [sx, sy, sz]);
  const animated  = useRef(new THREE.Vector3(0.04, 0.04, 0.04));

  const seed = useMemo(() => nameToSeed(icebergKey), [icebergKey]);
  const geo  = useMemo(() => buildIcebergGeo(seed), [seed]);

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
      {/* ── Submerged hull: deep teal — clipped to show only y < WATERLINE_Y ── */}
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          color="#2e7fa5"
          roughness={0.55}
          metalness={0.14}
          clippingPlanes={[belowWaterPlane]}
        />
      </mesh>

      {/* ── Above-water cap: icy white-blue — clipped to show only y > WATERLINE_Y ── */}
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          color="#dceef5"
          roughness={0.34}
          metalness={0.06}
          clippingPlanes={[aboveWaterPlane]}
        />
      </mesh>

      {/*
       * Ocean surface disc at the waterline in LOCAL group space.
       * Because it is a child of the scaled group its Y tracks sy automatically,
       * and its XZ footprint stretches to match the iceberg's length/width.
       */}
      <mesh position={[0, WATERLINE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.0, 48]} />
        <meshStandardMaterial
          color="#1a6480"
          opacity={0.60}
          transparent
          roughness={0.20}
          metalness={0.30}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ─── scene ────────────────────────────────────────────────────────────────────

function SceneContent({ scales, icebergKey }: IcebergSizeCanvasProps) {
  return (
    <>
      <color attach="background" args={["#f0f7fa"]} />
      <ambientLight intensity={0.68} />
      {/* Main sunlight */}
      <directionalLight
        position={[8, 12, 8]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      {/* Opposite fill */}
      <directionalLight position={[-6, 4, -4]} intensity={0.36} />
      {/* Subtle underwater tint */}
      <pointLight position={[0, -1.5, 0]} intensity={0.22} color="#3ab4d4" />

      {/* Seabed shadow catcher */}
      <mesh position={[0, -0.51, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial color="#0d3d52" opacity={0.35} transparent roughness={1} metalness={0} />
      </mesh>

      <AnimatedIceberg sx={scales.sx} sy={scales.sy} sz={scales.sz} icebergKey={icebergKey} />

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
        target={[0, 0.15, 0]}
      />
    </>
  );
}

// ─── canvas wrapper ───────────────────────────────────────────────────────────

export function IcebergSizeCanvas(props: IcebergSizeCanvasProps) {
  return (
    <div className="h-[min(360px,55vh)] w-full overflow-hidden rounded-lg border border-border bg-[#f0f7fa]">
      <Canvas
        shadows
        camera={{ position: [2.8, 2.2, 2.8], fov: 42, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false, localClippingEnabled: true }}
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
