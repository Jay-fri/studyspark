import { Suspense, useMemo, useEffect, useRef, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { ModelKey } from "@/config/anatomyModels";
import { GLB_MODELS } from "@/config/anatomyModels";
import { resolveColor } from "@/config/anatomyColors";

const DRACO_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.6/";

interface SceneProps {
  modelKey: ModelKey;
  meshName: string;
  onZoomReady?: (fn: (factor: number) => void) => void;
}

function PartScene({ modelKey, meshName, onZoomReady }: SceneProps) {
  const { scene } = useGLTF(GLB_MODELS[modelKey], DRACO_PATH);
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<any>(null);

  const result = useMemo(() => {
    // Find the mesh by name in the cached GLTF scene
    let found: THREE.Mesh | null = null;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === meshName && !found) {
        found = child;
      }
    });

    // Fallback: partial name match (GLB names may differ from data names)
    if (!found) {
      const lower = meshName.toLowerCase();
      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || found) return;
        if (
          child.name.toLowerCase().includes(lower) ||
          lower.includes(child.name.toLowerCase())
        ) {
          found = child;
        }
      });
    }

    if (!found) return null;

    const f = found as THREE.Mesh;
    // Bake world transform into geometry so the part renders correctly isolated
    f.updateWorldMatrix(true, false);
    const geom = f.geometry.clone();
    geom.applyMatrix4(f.matrixWorld);
    geom.computeBoundingBox();

    const box = geom.boundingBox!;
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    // Center at origin
    geom.translate(-sphere.center.x, -sphere.center.y, -sphere.center.z);

    const mat = new THREE.MeshStandardMaterial({
      color: resolveColor(meshName, modelKey),
      roughness: 0.62,
      metalness: 0.06,
    });

    return {
      mesh: new THREE.Mesh(geom, mat),
      dist: Math.max(sphere.radius * 3.2, 0.05),
    };
  }, [scene, meshName, modelKey]);

  // Position camera to frame the part after it loads
  useEffect(() => {
    if (!result) return;
    const d = result.dist;
    camera.position.set(d * 0.85, d * 0.35, d);
    camera.lookAt(0, 0, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [result, camera]);

  // Register zoom function so the outer component can drive it
  useEffect(() => {
    if (!onZoomReady) return;
    onZoomReady((factor: number) => {
      if (!controlsRef.current) return;
      const target = (controlsRef.current.target as THREE.Vector3).clone();
      const dir = camera.position.clone().sub(target);
      const newDist = Math.max(0.001, Math.min(30, dir.length() * factor));
      camera.position.copy(target.add(dir.normalize().multiplyScalar(newDist)));
      controlsRef.current.update();
      invalidate();
    });
  }, [onZoomReady, camera, invalidate]);

  return (
    <>
      {result && <primitive object={result.mesh} />}
      <OrbitControls
        ref={controlsRef}
        autoRotate
        autoRotateSpeed={1.8}
        enableZoom
        enablePan={false}
        minDistance={0.001}
        maxDistance={30}
        dampingFactor={0.1}
        enableDamping
      />
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color="#38E0C3" wireframe />
    </mesh>
  );
}

interface Props {
  modelKey: ModelKey;
  meshName: string;
}

export function PartViewer({ modelKey, meshName }: Props) {
  const zoomFnRef = useRef<((factor: number) => void) | null>(null);
  const onZoomReady = useCallback((fn: (factor: number) => void) => {
    zoomFnRef.current = fn;
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "200px",
        borderRadius: "10px",
        overflow: "hidden",
        background: "rgba(0,0,0,0.35)",
        border: "0.5px solid rgba(56,224,195,0.2)",
        position: "relative",
      }}>
      {/* Label */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "10px",
          zIndex: 2,
          color: "rgba(56,224,195,0.7)",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          pointerEvents: "none",
        }}>
        3D Preview · Drag to rotate · pinch to zoom
      </div>

      {/* Zoom buttons */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}>
        {[
          ["＋", 0.75],
          ["−", 1.33],
        ].map(([label, factor]) => (
          <button
            key={label as string}
            onClick={() => zoomFnRef.current?.(factor as number)}
            style={{
              width: 26,
              height: 26,
              background: "rgba(10,22,40,0.85)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: 6,
              color: label === "＋" ? "#38E0C3" : "rgba(255,255,255,0.55)",
              fontSize: 13,
              fontWeight: 400,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
              transition: "all 150ms ease",
            }}>
            {label}
          </button>
        ))}
      </div>

      <Canvas
        style={{ width: "100%", height: "100%" }}
        dpr={[1, 2]}
        frameloop="demand"
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ fov: 50, near: 0.001, far: 100, position: [2, 0.8, 2] }}>
        <Environment preset="studio" background={false} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 4]} intensity={0.9} />
        <directionalLight position={[-3, 2, -3]} intensity={0.3} />
        <Suspense fallback={<LoadingFallback />}>
          <PartScene
            modelKey={modelKey}
            meshName={meshName}
            onZoomReady={onZoomReady}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
