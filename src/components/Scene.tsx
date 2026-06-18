import { useRef, useCallback, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import BIMModel from "./BIMModel";
import ClashMarker from "./ClashMarker";
import { useProjectStore } from "@/store/useProjectStore";

function CameraController() {
  const { camera } = useThree();
  const geometries = useProjectStore((s) => s.geometries);
  const initialized = useRef(false);

  useEffect(() => {
    if (geometries.length > 0 && !initialized.current) {
      initialized.current = true;
      const box = new THREE.Box3();
      geometries.forEach((geom) => {
        const pos = geom.positions;
        for (let i = 0; i < pos.length; i += 3) {
          box.expandByPoint(new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]));
        }
      });
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 1.8;

      camera.position.set(
        center.x + distance * 0.7,
        center.y + distance * 0.5,
        center.z + distance * 0.7
      );
      camera.lookAt(center);
      camera.updateProjectionMatrix();
    }
  }, [geometries, camera]);

  return null;
}

function FpsCounter() {
  const { gl } = useThree();
  const frames = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsRef = useRef(0);

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - lastTime.current >= 1000) {
      fpsRef.current = frames.current;
      frames.current = 0;
      lastTime.current = now;
      const event = new CustomEvent("bim-fps", { detail: fpsRef.current });
      window.dispatchEvent(event);
    }
  });

  return null;
}

interface SceneProps {
  wireframe?: boolean;
  onViewChange?: (view: string) => void;
  onFitAll?: () => void;
  onScreenshot?: () => void;
}

function SceneInner({ wireframe }: { wireframe?: boolean }) {
  const clashPoints = useProjectStore((s) => s.clashPoints);
  const geometries = useProjectStore((s) => s.geometries);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight intensity={0.8} position={[10, 20, 10]} castShadow />
      <hemisphereLight
        args={["#b1e1ff", "#b97a20", 0.3]}
      />
      <CameraController />
      <FpsCounter />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={0.5}
        maxDistance={500}
      />
      {geometries.length > 0 && <BIMModel wireframe={wireframe} />}
      {clashPoints.map((point, i) => (
        <ClashMarker key={i} position={point} />
      ))}
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2a3042"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#3b4f6e"
        fadeDistance={100}
        fadeStrength={1}
        infiniteGrid
        position={[0, -0.01, 0]}
      />
    </>
  );
}

export default function Scene({ wireframe = false }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCreated = useCallback(
    (state: { gl: THREE.WebGLRenderer }) => {
      state.gl.setClearColor("#1a1f2e", 1);
      state.gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    },
    []
  );

  return (
    <Canvas
      ref={canvasRef}
      camera={{ fov: 50, near: 0.01, far: 10000, position: [20, 15, 20] }}
      onCreated={handleCreated}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <SceneInner wireframe={wireframe} />
    </Canvas>
  );
}

export function useSceneApi(canvasSelector: string) {
  const getCamera = useCallback(() => {
    const canvas = document.querySelector(canvasSelector);
    if (!canvas) return null;
    return null;
  }, [canvasSelector]);

  return { getCamera };
}
