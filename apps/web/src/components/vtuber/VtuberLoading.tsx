'use client';

import { useProgress, Html } from '@react-three/drei';

/**
 * Unified loading spinner style (used in both stages)
 */
function LoadingSpinner({ progress }: { progress?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {/* Animated spinner */}
      <div className="relative h-10 w-10">
        <div
          className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#003865]/20"
          style={{ borderTopColor: '#003865' }}
        />
        <div className="absolute inset-2 rounded-full bg-[#003865]/10" />
      </div>
      {/* Progress text */}
      {progress !== undefined && (
        <p className="text-xs text-gray-500">{Math.round(progress)}%</p>
      )}
    </div>
  );
}

/**
 * Loading component for inside Canvas (Suspense fallback)
 * Uses Html from drei to render 2D content for visual consistency
 */
export function VtuberLoading3D() {
  const { progress } = useProgress();

  return (
    <Html center>
      <LoadingSpinner progress={progress} />
    </Html>
  );
}

/**
 * 2D Loading overlay component (used outside Canvas)
 */
export function VtuberLoadingOverlay() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      {/* Animated spinner */}
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#003865]/20 border-t-[#003865]" />
        <div className="absolute inset-2 rounded-full bg-[#003865]/10" />
      </div>
      {/* Loading text */}
      <p className="text-sm text-gray-500">Loading VTuber...</p>
    </div>
  );
}

/**
 * Shimmer placeholder for compact avatar display
 */
export function VtuberShimmer() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-16 w-16 animate-pulse rounded-full bg-gradient-to-br from-[#003865]/20 to-[#003865]/5" />
    </div>
  );
}

export default VtuberLoading3D;
