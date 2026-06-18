import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useProjectStore } from "@/store/useProjectStore";

interface BIMModelProps {
  wireframe?: boolean;
}

export default function BIMModel({ wireframe = false }: BIMModelProps) {
  const geometries = useProjectStore((s) => s.geometries);
  const visibleCategories = useProjectStore((s) => s.visibleCategories);
  const materials = useProjectStore((s) => s.materials);
  const selectComponent = useProjectStore((s) => s.selectComponent);
  const selectedComponent = useProjectStore((s) => s.selectedComponent);

  const meshesRef = useRef<THREE.Group>(null);

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

      return {
        geometry,
        material,
        componentId: geom.componentId,
        visible,
        id: geom.id,
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
    const findComponent = useProjectStore.getState().modelTree;
    if (!findComponent) return;
    const find = (node: typeof findComponent): typeof node | null => {
      if (node.expressId === componentId) return node;
      for (const child of node.children) {
        const found = find(child);
        if (found) return found;
      }
      return null;
    };
    const comp = find(findComponent);
    if (comp) selectComponent(comp);
  };

  if (geometryMeshes.length === 0) return null;

  return (
    <group ref={meshesRef}>
      {geometryMeshes.map((mesh) => (
        <mesh
          key={mesh.id}
          geometry={mesh.geometry}
          material={mesh.material}
          visible={mesh.visible}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(mesh.componentId);
          }}
          frustumCulled
        />
      ))}
    </group>
  );
}
