import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ClashMarkerProps {
  position: [number, number, number];
  onClick?: () => void;
}

export default function ClashMarker({ position, onClick }: ClashMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.15);
    }
    if (outerRef.current) {
      const s = 1.5 + Math.sin(Date.now() * 0.002) * 0.5;
      outerRef.current.scale.setScalar(s);
      outerRef.current.material &&
        ((outerRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.15 + Math.sin(Date.now() * 0.003) * 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.2} transparent opacity={0.9} />
      </mesh>
      <mesh ref={outerRef} renderOrder={999}>
        <sphereGeometry args={[0.8, 24, 24]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh renderOrder={999}>
        <ringGeometry args={[0.6, 0.7, 32]} />
        <meshBasicMaterial color="#fca5a5" transparent opacity={0.8} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  );
}
