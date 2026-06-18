import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useProjectStore } from "@/store/useProjectStore";

interface BIMModelProps {
  wireframe?: boolean;
  meshesRef?: React.MutableRefObject<THREE.Group | null>;
}

export default function BIMModel({ wireframe = false, meshesRef }: BIMModelProps) {
  const geometries = useProjectStore((s) => s.geometries);
  const visibleCategories = useProjectStore((s) => s.visibleCategories);
  const materials = useProjectStore((s) => s.materials);
  const selectComponent = useProjectStore((s) => s.selectComponent);
  const selectedComponent = useProjectStore((s) => s.selectedComponent);

  const localRef = useRef<THREE.Group>(null);
  const meshesGroupRef = meshesRef ?? localRef;

  const geometryMeshes = useMemo(() => {
    return geometries.map((geom) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(geom.positions);
      const normals = new Float32Array(geom.normals);
      const indices = new Uint32Array(geom.indices);

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeBoundingSphere();

      const matInfo = materials.find((m) => m.id === geom.materialId);
      const color = geom.color || matInfo?.color || "#888888";
      const category = matInfo?.category || "other";
      const visible = visibleCategories[category] !== false;

      const isSelected =
        selectedComponent?.expressId === geom.componentId;

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        wireframe,
        transparent: isSelected,
        opacity: isSelected ? 0.85 : 1,
        emissive: isSelected ? new THREE.Color("#fbbf24") : new THREE.Color("#000000"),
        emissiveIntensity: isSelected ? 0.4 : 0,
        side: THREE.DoubleSide,
      });

      let matrix: THREE.Matrix4 | null = null;
      if (geom.transform && geom.transform.length === 16) {
        const isIdentity = geom.transform[0] === 1 && geom.transform[5] === 1 && geom.transform[10] === 1 &&
          geom.transform[12] === 0 && geom.transform[13] === 0 && geom.transform[14] === 0 &&
          geom.transform[1] === 0 && geom.transform[2] === 0 && geom.transform[3] === 0 &&
          geom.transform[4] === 0 && geom.transform[6] === 0 && geom.transform[7] === 0 &&
          geom.transform[8] === 0 && geom.transform[9] === 0 && geom.transform[11] === 0 &&
          geom.transform[15] === 1;
        if (!isIdentity) {
          matrix = new THREE.Matrix4();
          matrix.fromArray(geom.transform);
        }
      }

      return {
        geometry,
        material,
        componentId: geom.componentId,
        visible,
        id: geom.id,
        matrix,
      };
    });
  }, [geometries, materials, visibleCategories, wireframe, selectedComponent]);

  useEffect(() => {
    return () => {
      geometryMeshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
    };
  }, [geometryMeshes]);

  const handleClick = (componentId: number) => {
    const modelTree = useProjectStore.getState().modelTree;
    if (!modelTree || modelTree.length === 0) return;

    const find = (nodes: typeof modelTree): typeof modelTree[0] | null => {
      for (const node of nodes) {
        if (node.expressId === componentId) return node;
        if (node.children && node.children.length > 0) {
          const found = find(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    const comp = find(modelTree);
    if (comp) selectComponent(comp);
  };

  if (geometryMeshes.length === 0) return null;

  return (
    <group ref={meshesGroupRef}>
      {geometryMeshes.map((mesh) => (
        <mesh
          key={mesh.id}
          geometry={mesh.geometry}
          material={mesh.material}
          visible={mesh.visible}
          matrix={mesh.matrix || undefined}
          matrixAutoUpdate={!mesh.matrix}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(mesh.componentId);
          }}
          onPointerMissed={() => {}}
          frustumCulled
          userData={{ componentId: mesh.componentId }}
        />
      ))}
    </group>
  );
}
