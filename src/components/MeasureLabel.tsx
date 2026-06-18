import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { MeasureLine } from "@/types";

interface MeasureLabelProps {
  line: MeasureLine;
  onDelete?: () => void;
}

export function MeasureLabel({ line }: MeasureLabelProps) {
  const { camera } = useThree();
  const spriteRef = useRef<THREE.Sprite>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const midPoint: [number, number, number] = useMemo(() => {
    return [
      (line.start.position[0] + line.end.position[0]) / 2,
      (line.start.position[1] + line.end.position[1]) / 2,
      (line.start.position[2] + line.end.position[2]) / 2,
    ];
  }, [line.start.position, line.end.position]);

  const distanceMm = useMemo(() => (line.distance * 1000).toFixed(0), [line.distance]);
  const horizontalMm = useMemo(() => (line.horizontalDistance * 1000).toFixed(0), [line.horizontalDistance]);
  const verticalMm = useMemo(() => (line.verticalDistance * 1000).toFixed(0), [line.verticalDistance]);

  useMemo(() => {
    const canvas = document.createElement("canvas");
    const padding = 14;
    const lineHeight = 22;
    canvas.width = 360;
    canvas.height = lineHeight * 3 + padding * 2;
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "rgba(20, 25, 40, 0.92)";
    const radius = 8;
    const w = canvas.width;
    const h = canvas.height;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(w - radius, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    ctx.lineTo(w, h - radius);
    ctx.quadraticCurveTo(w, h, w - radius, h);
    ctx.lineTo(radius, h);
    ctx.quadraticCurveTo(0, h, 0, h - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "top";

    ctx.fillStyle = "#e2e8f0";
    ctx.fillText("空间距离:", padding, padding);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`${distanceMm} mm`, padding + 100, padding);

    ctx.fillStyle = "#e2e8f0";
    ctx.fillText("水平距离:", padding, padding + lineHeight);
    ctx.fillStyle = "#60a5fa";
    ctx.fillText(`${horizontalMm} mm`, padding + 100, padding + lineHeight);

    ctx.fillStyle = "#e2e8f0";
    ctx.fillText("净空高度:", padding, padding + lineHeight * 2);
    ctx.fillStyle = "#34d399";
    ctx.fillText(`${verticalMm} mm`, padding + 100, padding + lineHeight * 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    textureRef.current = texture;
  }, [distanceMm, horizontalMm, verticalMm]);

  useFrame(() => {
    if (!spriteRef.current || !textureRef.current) return;
    const dist = camera.position.distanceTo(
      new THREE.Vector3(midPoint[0], midPoint[1], midPoint[2])
    );
    const scale = Math.max(dist * 0.08, 0.4);
    spriteRef.current.scale.set(scale * 1.4, scale * 0.7, 1);
  });

  return (
    <sprite
      ref={spriteRef}
      position={midPoint}
      renderOrder={1000}
    >
      {textureRef.current && (
        <spriteMaterial
          map={textureRef.current}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      )}
    </sprite>
  );
}
