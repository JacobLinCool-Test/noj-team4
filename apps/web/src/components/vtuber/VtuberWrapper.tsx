'use client';

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
import type { VtuberCanvasHandle, VtuberEvent, VtuberState } from './VtuberCanvas';

export type { VtuberCanvasHandle, VtuberEvent, VtuberState };

type CameraMode = 'portrait' | 'halfBody';

type VtuberWrapperProps = {
  vrmUrl: string;
  state?: VtuberState;
  cameraMode?: CameraMode;
  enableControls?: boolean;
  className?: string;
};

// Loading component for dynamic import (same style as VtuberLoading3D)
function DynamicLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2">
        {/* Animated spinner - same style as VtuberLoading */}
        <div className="relative h-10 w-10">
          <div
            className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#003865]/20"
            style={{ borderTopColor: '#003865' }}
          />
          <div className="absolute inset-2 rounded-full bg-[#003865]/10" />
        </div>
      </div>
    </div>
  );
}

// Dynamic import with SSR disabled to prevent WebGL errors during server build
const VtuberCanvas = dynamic(() => import('./VtuberCanvas'), {
  ssr: false,
  loading: DynamicLoading,
});

const VtuberWrapper = forwardRef<VtuberCanvasHandle, VtuberWrapperProps>(({
  vrmUrl,
  state = 'idle',
  cameraMode = 'portrait',
  enableControls = false,
  className,
}, ref) => {
  return (
    <VtuberCanvas
      ref={ref}
      vrmUrl={vrmUrl}
      state={state}
      cameraMode={cameraMode}
      enableControls={enableControls}
      className={className}
    />
  );
});

VtuberWrapper.displayName = 'VtuberWrapper';

export default VtuberWrapper;
