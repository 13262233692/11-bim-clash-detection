import { useRef, useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { useProjectStore } from "@/store/useProjectStore";
import type { MeasurePoint, MeasureLine } from "@/types";
import { MeasureLabel } from "./MeasureLabel";
import { v4 as uuidv4 } from "uuid";

function computeLineStats(
  start: [number, number, number],
  end: [number, number, number]
): {
  distance: number;
  delta: [number, number, number];
  horizontalDistance: number;
  verticalDistance: number;
} {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  const verticalDistance = Math.abs(dy);
  return {
    distance,
    delta: [dx, dy, dz],
    horizontalDistance,
    verticalDistance,
  };
}

function MeasurePointMarker({
  position,
  normal,
  highlighted = false,
}: {
  position: [number, number, number];
  normal: [number, number, number];
  highlighted?: boolean;
}) {
  const normalLength = 0.5;
  const endPos: [number, number, number] = [
    position[0] + normal[0] * normalLength,
    position[1] + normal[1] * normalLength,
    position[2] + normal[2] * normalLength,
  ];

  const color = highlighted ? "#fbbf24" : "#22d3ee";
  const sphereColor = highlighted ? "#fbbf24" : "#f43f5e";

  return (
    <group position={position}>
      <mesh renderOrder={999}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={sphereColor} depthTest={false} />
      </mesh>
      <group renderOrder={999}>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={
                new Float32Array([
                  0, 0, 0,
                  endPos[0] - position[0],
                  endPos[1] - position[1],
                  endPos[2] - position[2],
                ])
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} depthTest={false} linewidth={2} />
        </line>
      </group>
      <mesh position={[
        endPos[0] - position[0],
        endPos[1] - position[1],
        endPos[2] - position[2],
      ]} renderOrder={999}>
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
    </group>
  );
}

function MeasureRuler({
  start,
  end,
  inProgress = false,
}: {
  start: [number, number, number];
  end: [number, number, number];
  inProgress?: boolean;
}) {
  const { distance, horizontalDistance, verticalDistance } = useMemo(
    () => computeLineStats(start, end),
    [start, end]
  );

  const midPoint: [number, number, number] = useMemo(
    () => [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2,
    ],
    [start, end]
  );

  const lineColor = inProgress ? "#fbbf24" : "#22d3ee";

  const horizontalEnd: [number, number, number] = [end[0], start[1], end[2]];
  const verticalEnd: [number, number, number] = [end[0], end[1], end[2]];

  const distanceMm = (distance * 1000).toFixed(0);
  const scale = Math.max(distance * 0.04, 0.3);

  return (
    <group>
      <group renderOrder={998}>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...start, ...end])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={lineColor} depthTest={false} linewidth={3} />
        </line>
      </group>

      {!inProgress && (
        <>
          <group renderOrder={997}>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([...start, ...horizontalEnd])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineDashedMaterial
                color="#60a5fa"
                depthTest={false}
                dashSize={0.15}
                gapSize={0.1}
              />
            </line>
          </group>

          <group renderOrder={997}>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([...horizontalEnd, ...verticalEnd])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineDashedMaterial
                color="#34d399"
                depthTest={false}
                dashSize={0.15}
                gapSize={0.1}
              />
            </line>
          </group>
        </>
      )}

      <mesh position={start} renderOrder={999}>
        <cylinderGeometry args={[0.02, 0.02, scale * 2, 8]} />
        <meshBasicMaterial color={lineColor} depthTest={false} />
      </mesh>
      <mesh position={end} renderOrder={999}>
        <cylinderGeometry args={[0.02, 0.02, scale * 2, 8]} />
        <meshBasicMaterial color={lineColor} depthTest={false} />
      </mesh>

      {inProgress && (
        <sprite position={midPoint} scale={[scale * 2, scale * 0.8, 1]} renderOrder={1000}>
          <spriteMaterial transparent depthTest={false} depthWrite={false}>
            <canvasTexture
              attach="map"
              image={(function createPreviewCanvas() {
                const c = document.createElement("canvas");
                c.width = 256;
                c.height = 64;
                const ctx = c.getContext("2d")!;
                ctx.fillStyle = "rgba(251, 191, 36, 0.92)";
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.fillStyle = "#1a1f2e";
                ctx.font = "bold 28px system-ui, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(`${distanceMm} mm`, c.width / 2, c.height / 2);
                const tex = new THREE.CanvasTexture(c);
                tex.needsUpdate = true;
                return tex;
              })()}
            />
          </spriteMaterial>
        </sprite>
      )}
    </group>
  );
}

export default function MeasureTool({
  meshGroupRef,
}: {
  meshGroupRef: React.RefObject<THREE.Group | null>;
}) {
  const { camera, gl, raycaster } = useThree();
  const measureEnabled = useProjectStore((s) => s.measureEnabled);
  const measureMode = useProjectStore((s) => s.measureMode);
  const measureStart = useProjectStore((s) => s.measureStart);
  const measureEnd = useProjectStore((s) => s.measureEnd);
  const measureLines = useProjectStore((s) => s.measureLines);
  const setMeasureMode = useProjectStore((s) => s.setMeasureMode);
  const setMeasureStart = useProjectStore((s) => s.setMeasureStart);
  const setMeasureEnd = useProjectStore((s) => s.setMeasureEnd);
  const addMeasureLine = useProjectStore((s) => s.addMeasureLine);
  const resetMeasure = useProjectStore((s) => s.resetMeasure);

  const [hoverPoint, setHoverPoint] = useState<MeasurePoint | null>(null);
  const isDragging = useRef(false);
  const pointerDownPos = useRef({ x: 0, y: 0 });

  const domElement = gl.domElement;

  const pickPoint = (clientX: number, clientY: number): MeasurePoint | null => {
    if (!meshGroupRef.current) return null;

    const rect = domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(ndc, camera);
    const intersects = raycaster.intersectObject(meshGroupRef.current, true);

    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const pos = hit.point;
    let normal: THREE.Vector3;

    if (hit.face) {
      normal = hit.face.normal.clone();
      if (hit.object.matrixWorld) {
        normal.transformDirection(hit.object.matrixWorld).normalize();
      }
    } else {
      normal = new THREE.Vector3(0, 1, 0);
    }

    return {
      position: [pos.x, pos.y, pos.z],
      normal: [normal.x, normal.y, normal.z],
      componentId: (hit.object as any).userData?.componentId,
    };
  };

  useEffect(() => {
    if (!measureEnabled) return;

    const originalStyle = domElement.style.cursor;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      pointerDownPos.current = { x: e.clientX, y: e.clientY };

      const point = pickPoint(e.clientX, e.clientY);
      if (!point) return;

      if (measureMode === "idle" || measureMode === "completed") {
        setMeasureStart(point);
        setMeasureEnd(point);
        setMeasureMode("point1");
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      domElement.style.cursor = "crosshair";

      const point = pickPoint(e.clientX, e.clientY);
      setHoverPoint(point);

      if (!isDragging.current) return;

      if (measureMode === "point1" && point) {
        const start = measureStart;
        if (start) {
          const dist = Math.sqrt(
            Math.pow(point.position[0] - start.position[0], 2) +
            Math.pow(point.position[1] - start.position[1], 2) +
            Math.pow(point.position[2] - start.position[2], 2)
          );
          if (dist > 0.005) {
            setMeasureEnd(point);
            setMeasureMode("dragging");
          }
        }
      } else if (measureMode === "dragging" && point) {
        setMeasureEnd(point);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging.current = false;

      if (measureMode === "dragging" && measureStart && measureEnd) {
        const stats = computeLineStats(measureStart.position, measureEnd.position);
        const newLine: MeasureLine = {
          id: uuidv4(),
          start: measureStart,
          end: measureEnd,
          distance: stats.distance,
          delta: stats.delta,
          horizontalDistance: stats.horizontalDistance,
          verticalDistance: stats.verticalDistance,
        };
        addMeasureLine(newLine);
        setMeasureMode("completed");
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resetMeasure();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (measureEnabled && (measureMode !== "idle")) {
        e.preventDefault();
        resetMeasure();
      }
    };

    domElement.addEventListener("pointerdown", onPointerDown);
    domElement.addEventListener("pointermove", onPointerMove);
    domElement.addEventListener("pointerup", onPointerUp);
    domElement.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      domElement.removeEventListener("pointerdown", onPointerDown);
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerup", onPointerUp);
      domElement.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      domElement.style.cursor = originalStyle;
    };
  }, [
    measureEnabled,
    measureMode,
    measureStart,
    measureEnd,
    camera,
    domElement,
    raycaster,
    meshGroupRef,
    setMeasureMode,
    setMeasureStart,
    setMeasureEnd,
    addMeasureLine,
    resetMeasure,
  ]);

  if (!measureEnabled) return null;

  return (
    <group>
      {hoverPoint && measureMode === "idle" && (
        <MeasurePointMarker
          position={hoverPoint.position}
          normal={hoverPoint.normal}
        />
      )}

      {measureStart && (
        <MeasurePointMarker
          position={measureStart.position}
          normal={measureStart.normal}
          highlighted
        />
      )}

      {measureEnd && measureMode === "dragging" && (
        <MeasurePointMarker
          position={measureEnd.position}
          normal={measureEnd.normal}
        />
      )}

      {measureStart && measureEnd && (measureMode === "dragging") && (
        <MeasureRuler
          start={measureStart.position}
          end={measureEnd.position}
          inProgress
        />
      )}

      {measureLines.map((line) => (
        <group key={line.id}>
          <MeasureRuler start={line.start.position} end={line.end.position} />
          <MeasureLabel line={line} />
        </group>
      ))}
    </group>
  );
}
