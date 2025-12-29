'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';
import { Object3D } from 'three';

export type VrmAvatarHandle = {
  vrm: VRM | null;
  getLookAtTarget: () => Object3D;
};

type VrmAvatarProps = {
  url: string;
  position?: [number, number, number];
  scale?: number;
  onVRMLoaded?: (vrm: VRM) => void;
};

const VrmAvatar = forwardRef<VrmAvatarHandle, VrmAvatarProps>(
  ({ url, position = [0, -0.5, 0], scale = 1, onVRMLoaded }, ref) => {
    const vrmRef = useRef<VRM | null>(null);
    const lookAtTargetRef = useRef<Object3D>(new Object3D());

    const gltf = useLoader(GLTFLoader, url, (loader) => {
      loader.register((parser) => new VRMLoaderPlugin(parser));
    });

    useEffect(() => {
      const vrm = gltf.userData.vrm as VRM | undefined;
      if (!vrm) return;

      vrmRef.current = vrm;

      // VRM0 faces backward by default, rotate 180 degrees
      VRMUtils.rotateVRM0(vrm);

      // Prevent frustum culling issues (VTuber close to camera)
      vrm.scene.traverse((obj: Object3D) => {
        obj.frustumCulled = false;
      });

      // Performance optimizations
      VRMUtils.removeUnnecessaryVertices(vrm.scene);

      // Setup lookAt target - position in front of the face
      const lookAtTarget = lookAtTargetRef.current;
      lookAtTarget.position.set(0, 1.5, 1); // Default: look forward
      vrm.scene.add(lookAtTarget);

      if (vrm.lookAt) {
        vrm.lookAt.target = lookAtTarget;
      }

      // Notify parent that VRM is loaded
      onVRMLoaded?.(vrm);

      return () => {
        // Cleanup on unmount
        if (vrmRef.current) {
          VRMUtils.deepDispose(vrmRef.current.scene);
          vrmRef.current = null;
        }
      };
    }, [gltf, onVRMLoaded]);

    // Expose VRM and lookAt target to parent via ref
    useImperativeHandle(ref, () => ({
      vrm: vrmRef.current,
      getLookAtTarget: () => lookAtTargetRef.current,
    }));

    // Note: VRM update is now handled by the controller in parent

    const vrm = gltf.userData.vrm as VRM | undefined;
    if (!vrm) return null;

    return (
      <primitive
        object={vrm.scene}
        position={position}
        scale={[scale, scale, scale]}
      />
    );
  }
);

VrmAvatar.displayName = 'VrmAvatar';

export default VrmAvatar;
