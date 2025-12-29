'use client';

import { Suspense, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { VRM } from '@pixiv/three-vrm';
import { Vector3 } from 'three';
import VrmAvatar, { type VrmAvatarHandle } from './VrmAvatar';
import { useVtuberController, type VtuberEvent, type VtuberState } from './useVtuberController';
import { VtuberLoading3D } from './VtuberLoading';

export type { VtuberEvent, VtuberState };

type CameraMode = 'portrait' | 'halfBody';

export type VtuberCanvasHandle = {
  dispatch: (event: VtuberEvent) => void;
  resetView: () => void;
  state: VtuberState;
};

type VtuberCanvasProps = {
  vrmUrl: string;
  cameraMode?: CameraMode;
  enableControls?: boolean;
  className?: string;
  // Legacy prop for backwards compatibility
  state?: VtuberState;
};

// Camera settings for different modes
const CAMERA_SETTINGS: Record<CameraMode, {
  position: [number, number, number];
  fov: number;
  avatarPosition: [number, number, number];
  target: [number, number, number];
}> = {
  portrait: {
    position: [0, 0.1, 0.8],
    fov: 35,
    avatarPosition: [0, -1.1, 0],
    target: [0, -0.2, 0],
  },
  halfBody: {
    position: [0, 0.2, 1.5],
    fov: 30,
    avatarPosition: [0, -1.2, 0],
    target: [0, 0, 0],
  },
};

// Inner component to handle animation updates (must be inside Canvas)
function VtuberUpdater({
  controller,
}: {
  controller: ReturnType<typeof useVtuberController>;
}) {
  const { pointer } = useThree();

  useFrame((_, delta) => {
    controller.update(delta, { x: pointer.x, y: pointer.y });
  });

  return null;
}

// Loading fallback component with progress
function LoadingFallback() {
  return <VtuberLoading3D />;
}

// Inner canvas content component
const VtuberCanvasContent = forwardRef<
  VtuberCanvasHandle,
  VtuberCanvasProps & {
    settings: typeof CAMERA_SETTINGS['portrait'];
    onResetViewRef: React.MutableRefObject<(() => void) | null>;
  }
>(({ vrmUrl, settings, enableControls, onResetViewRef }, ref) => {
  const avatarRef = useRef<VrmAvatarHandle | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const controller = useVtuberController();

  // Store controller in ref for stable access
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  // Handle VRM loaded - use ref to avoid dependency on controller
  const handleVRMLoaded = useCallback((vrm: VRM) => {
    controllerRef.current.initVRM(vrm);
    console.log('[VTuber] VRM loaded and controller initialized');
  }, []);

  // Reset view function
  const resetView = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      // Also reset to default camera position
      controlsRef.current.object.position.set(...settings.position);
      controlsRef.current.target.set(...settings.target);
      controlsRef.current.update();
    }
  }, [settings]);

  // Store resetView in parent ref
  onResetViewRef.current = resetView;

  // Expose handle to parent - use stable refs
  useImperativeHandle(ref, () => ({
    dispatch: (event: VtuberEvent) => controllerRef.current.dispatch(event),
    resetView,
    get state() {
      return controllerRef.current.state;
    },
  }), [resetView]);

  return (
    <>
      {/* Lighting setup for VTuber */}
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[0, 0.5, 1]}
        intensity={0.8}
        color="#ffffff"
      />
      <directionalLight
        position={[1, 1, 1]}
        intensity={0.55}
        color="#ffffff"
      />
      <directionalLight
        position={[-1, 0.5, 0.5]}
        intensity={0.35}
        color="#e0e8ff"
      />

      {/* OrbitControls for user interaction */}
      {enableControls && (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5}
          maxDistance={3}
          minPolarAngle={Math.PI / 4}      // Limit looking from above (45°)
          maxPolarAngle={Math.PI / 1.5}    // Limit looking from below (120°)
          target={new Vector3(...settings.target)}
          enableDamping={true}
          dampingFactor={0.05}
        />
      )}

      <Suspense fallback={<LoadingFallback />}>
        <VrmAvatar
          ref={avatarRef}
          url={vrmUrl}
          position={settings.avatarPosition}
          scale={1}
          onVRMLoaded={handleVRMLoaded}
        />
        <VtuberUpdater controller={controller} />
      </Suspense>
    </>
  );
});

VtuberCanvasContent.displayName = 'VtuberCanvasContent';

const VtuberCanvas = forwardRef<VtuberCanvasHandle, VtuberCanvasProps>(({
  vrmUrl,
  cameraMode = 'portrait',
  enableControls = false,
  className,
}, ref) => {
  const settings = CAMERA_SETTINGS[cameraMode];
  const onResetViewRef = useRef<(() => void) | null>(null);
  const innerRef = useRef<VtuberCanvasHandle | null>(null);

  // Forward ref to inner component
  useImperativeHandle(ref, () => ({
    dispatch: (event: VtuberEvent) => innerRef.current?.dispatch(event),
    resetView: () => onResetViewRef.current?.(),
    get state() {
      return innerRef.current?.state ?? 'idle';
    },
  }), []);

  return (
    <div className={className}>
      <Canvas
        camera={{
          position: settings.position,
          fov: settings.fov,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
        }}
        style={{ background: 'transparent' }}
      >
        <VtuberCanvasContent
          ref={innerRef}
          vrmUrl={vrmUrl}
          settings={settings}
          enableControls={enableControls}
          onResetViewRef={onResetViewRef}
        />
      </Canvas>
    </div>
  );
});

VtuberCanvas.displayName = 'VtuberCanvas';

export default VtuberCanvas;
