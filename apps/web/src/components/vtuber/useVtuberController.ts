/**
 * VTuber Avatar Controller Hook
 *
 * This hook provides a clean interface for controlling the VTuber avatar
 * through events, without direct manipulation of three-vrm internals.
 *
 * Usage:
 *   const controller = useVtuberController();
 *   controller.dispatch({ type: 'USER_SENT' });
 *   controller.dispatch({ type: 'ASSISTANT_SPEAKING_START' });
 */

import { useCallback, useRef } from 'react';
import type { VRM, VRMExpressionManager } from '@pixiv/three-vrm';
import {
  detectExpressionCapabilities,
  setExpression,
  resetAllExpressions,
  type ExpressionCapabilities,
  type StandardExpression,
} from './vtuberExpressionMap';

// ============================================================================
// Types
// ============================================================================

export type VtuberState = 'idle' | 'thinking' | 'speaking' | 'error';

export type VtuberEvent =
  | { type: 'USER_SENT' }
  | { type: 'ASSISTANT_THINKING_START' }
  | { type: 'ASSISTANT_THINKING_END' }
  | { type: 'ASSISTANT_SPEAKING_START' }
  | { type: 'ASSISTANT_SPEAKING_END' }
  | { type: 'ASSISTANT_TOKEN'; token: string }  // For token-based lipsync
  | { type: 'ASSISTANT_ERROR' }
  | { type: 'RESET' };

export type VtuberControllerHandle = {
  // Event dispatch (main interface for chat UI)
  dispatch: (event: VtuberEvent) => void;
  // Current state (for UI display)
  state: VtuberState;
  // VRM initialization
  initVRM: (vrm: VRM) => void;
  // Animation update (call in useFrame)
  update: (delta: number, pointer?: { x: number; y: number }) => void;
  // Audio source for TTS-based lipsync (future)
  setSpeakingSource: (source: AudioBufferSourceNode | MediaStreamAudioSourceNode | null) => void;
  // Camera reset callback
  onResetView?: () => void;
  // Expression capabilities (for debugging)
  capabilities: ExpressionCapabilities | null;
};

// ============================================================================
// Animation Parameters
// ============================================================================

const ANIMATION_CONFIG = {
  // Breathing
  breathingSpeed: 1.5,
  breathingAmplitude: 0.02,

  // Head micro-movement
  headSwaySpeed: 0.8,
  headSwayAmplitude: 0.015,

  // Blinking
  blinkIntervalMin: 2.5,
  blinkIntervalMax: 5.0,
  blinkDuration: 0.15,

  // Speaking mouth animation
  speakingSpeed: 12,
  speakingAmplitude: 0.6,
  tokenPulseDuration: 0.12,  // Duration of mouth pulse per token

  // Thinking animation
  thinkingHeadTiltX: 0.05,
  thinkingHeadTiltZ: 0.03,

  // Error animation
  errorDuration: 1.5,

  // Expression transition speed
  expressionLerpSpeed: 8,

  // === Idle Animation (rich expressions) ===
  // Random mood changes
  moodChangeIntervalMin: 4.0,
  moodChangeIntervalMax: 8.0,
  moodTransitionDuration: 1.0,

  // Wink animation
  winkChance: 0.15,  // 15% chance to wink instead of normal blink
  winkDuration: 0.2,

  // Eye wandering
  eyeWanderIntervalMin: 3.0,
  eyeWanderIntervalMax: 6.0,
  eyeWanderDuration: 1.5,
  eyeWanderIntensity: 0.4,

  // Micro expressions (brief reactions)
  microExpressionIntervalMin: 8.0,
  microExpressionIntervalMax: 15.0,
  microExpressionDuration: 0.8,
};

// Mood types for idle animation
type IdleMood = 'neutral' | 'happy' | 'relaxed' | 'curious';

const IDLE_MOODS: IdleMood[] = ['neutral', 'happy', 'relaxed', 'curious'];

// Mood to expression mapping
const MOOD_EXPRESSIONS: Record<IdleMood, Partial<Record<StandardExpression, number>>> = {
  neutral: { neutral: 0.1, relaxed: 0.1 },
  happy: { happy: 0.4, relaxed: 0.2 },
  relaxed: { relaxed: 0.5, happy: 0.1 },
  curious: { surprised: 0.2, happy: 0.1 },  // Slight surprise = curious look
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVtuberController(): VtuberControllerHandle {
  // Use refs instead of state to avoid React re-renders during animation
  const stateRef = useRef<VtuberState>('idle');
  const capabilitiesRef = useRef<ExpressionCapabilities | null>(null);

  // Internal refs
  const vrmRef = useRef<VRM | null>(null);
  const errorTimerRef = useRef<number>(0);

  // Animation state refs
  const timeRef = useRef(0);
  const blinkTimerRef = useRef(0);
  const nextBlinkRef = useRef(getRandomBlinkInterval());
  const isBlinkingRef = useRef(false);
  const blinkProgressRef = useRef(0);

  // Speaking animation refs
  const speakingTimerRef = useRef(0);
  const tokenPulseRef = useRef(0);  // Remaining time for token pulse
  const mouthTargetRef = useRef(0);
  const mouthCurrentRef = useRef(0);

  // Expression targets for smooth transitions
  const expressionTargetsRef = useRef<Partial<Record<StandardExpression, number>>>({});
  const expressionCurrentRef = useRef<Partial<Record<StandardExpression, number>>>({});

  // Audio analysis for TTS (future)
  const audioSourceRef = useRef<AudioBufferSourceNode | MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // === Idle animation refs ===
  // Mood system
  const currentMoodRef = useRef<IdleMood>('neutral');
  const moodTimerRef = useRef(0);
  const nextMoodChangeRef = useRef(getRandomInterval(
    ANIMATION_CONFIG.moodChangeIntervalMin,
    ANIMATION_CONFIG.moodChangeIntervalMax
  ));

  // Wink animation
  const isWinkingRef = useRef(false);
  const winkSideRef = useRef<'left' | 'right'>('left');
  const winkProgressRef = useRef(0);

  // Eye wandering
  const eyeWanderTimerRef = useRef(0);
  const nextEyeWanderRef = useRef(getRandomInterval(
    ANIMATION_CONFIG.eyeWanderIntervalMin,
    ANIMATION_CONFIG.eyeWanderIntervalMax
  ));
  const eyeWanderTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const eyeWanderProgressRef = useRef(0);
  const isEyeWanderingRef = useRef(false);

  // Micro expressions
  const microExpressionTimerRef = useRef(0);
  const nextMicroExpressionRef = useRef(getRandomInterval(
    ANIMATION_CONFIG.microExpressionIntervalMin,
    ANIMATION_CONFIG.microExpressionIntervalMax
  ));
  const activeMicroExpressionRef = useRef<StandardExpression | null>(null);
  const microExpressionProgressRef = useRef(0);

  // Initialize VRM and detect capabilities
  const initVRM = useCallback((vrm: VRM) => {
    vrmRef.current = vrm;
    const caps = detectExpressionCapabilities(vrm);
    capabilitiesRef.current = caps;

    // Reset all expressions to start clean
    resetAllExpressions(vrm.expressionManager ?? null, caps);

    // Set default pose (fix T-pose)
    const humanoid = vrm.humanoid;
    if (humanoid) {
      // Lower the arms from T-pose to natural standing position
      const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');

      if (leftUpperArm) leftUpperArm.rotation.z = 1.1;    // ~63 degrees down
      if (rightUpperArm) rightUpperArm.rotation.z = -1.1;

      // Slightly bend elbows for more natural look
      const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
      const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');

      if (leftLowerArm) leftLowerArm.rotation.y = -0.2;
      if (rightLowerArm) rightLowerArm.rotation.y = 0.2;

      // Slightly rotate hands inward
      const leftHand = humanoid.getNormalizedBoneNode('leftHand');
      const rightHand = humanoid.getNormalizedBoneNode('rightHand');

      if (leftHand) leftHand.rotation.z = 0.1;
      if (rightHand) rightHand.rotation.z = -0.1;
    }
  }, []);

  // Event dispatch - state machine transitions (no React state, just refs)
  const dispatch = useCallback((event: VtuberEvent) => {
    const currentState = stateRef.current;

    switch (event.type) {
      case 'USER_SENT':
        // User sent a message, wait for assistant
        stateRef.current = 'thinking';
        break;

      case 'ASSISTANT_THINKING_START':
        stateRef.current = 'thinking';
        break;

      case 'ASSISTANT_THINKING_END':
        // Thinking ended, might transition to speaking or idle
        // Stay in thinking until speaking starts
        break;

      case 'ASSISTANT_SPEAKING_START':
        stateRef.current = 'speaking';
        speakingTimerRef.current = 0;
        break;

      case 'ASSISTANT_SPEAKING_END':
        stateRef.current = 'idle';
        break;

      case 'ASSISTANT_TOKEN':
        // Token received during streaming - trigger mouth pulse
        if (currentState === 'speaking' || currentState === 'thinking') {
          stateRef.current = 'speaking';
          tokenPulseRef.current = ANIMATION_CONFIG.tokenPulseDuration;
        }
        break;

      case 'ASSISTANT_ERROR':
        stateRef.current = 'error';
        errorTimerRef.current = ANIMATION_CONFIG.errorDuration;
        break;

      case 'RESET':
        stateRef.current = 'idle';
        if (vrmRef.current && capabilitiesRef.current) {
          resetAllExpressions(vrmRef.current.expressionManager ?? null, capabilitiesRef.current);
        }
        break;
    }
  }, []);

  // Set audio source for TTS lipsync
  const setSpeakingSource = useCallback((source: AudioBufferSourceNode | MediaStreamAudioSourceNode | null) => {
    audioSourceRef.current = source;

    if (source) {
      // Create analyser for audio-driven lipsync
      const audioContext = (source as AudioBufferSourceNode).context;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
    } else {
      analyserRef.current = null;
    }
  }, []);

  // Main update function (call in useFrame)
  const update = useCallback((delta: number, pointer?: { x: number; y: number }) => {
    const vrm = vrmRef.current;
    const caps = capabilitiesRef.current;
    if (!vrm || !caps) return;

    const manager = vrm.expressionManager;
    const currentState = stateRef.current;

    timeRef.current += delta;

    // ========================================
    // 1. Handle error state timer
    // ========================================
    if (currentState === 'error') {
      errorTimerRef.current -= delta;
      if (errorTimerRef.current <= 0) {
        stateRef.current = 'idle';
      }
    }

    // ========================================
    // 2. Update expression targets based on state
    // ========================================
    updateExpressionTargets(currentState, caps);

    // ========================================
    // 3. Blinking animation (all states)
    // ========================================
    updateBlinking(delta, caps);

    // ========================================
    // 4. Speaking/mouth animation
    // ========================================
    updateMouth(delta, currentState, caps);

    // ========================================
    // 5. Breathing animation (bone-based)
    // ========================================
    updateBreathing(vrm, delta);

    // ========================================
    // 6. Head micro-movement
    // ========================================
    updateHeadSway(vrm, delta, currentState);

    // ========================================
    // 7. Idle animations (rich expressions)
    // ========================================
    updateIdleMood(delta);
    updateWink(delta, caps);
    updateEyeWander(delta, caps);
    updateMicroExpression(delta, caps);

    // ========================================
    // 8. Look at pointer (only when not wandering)
    // ========================================
    if (pointer && vrm.lookAt && !isEyeWanderingRef.current) {
      const headY = 1.5;
      const lookX = pointer.x * 0.5;
      const lookY = headY + pointer.y * 0.3;
      vrm.lookAt.target?.position.set(lookX, lookY, 1);
    }

    // ========================================
    // 9. Apply expression lerping
    // ========================================
    applyExpressions(manager ?? null, caps, delta);

    // ========================================
    // 10. Update VRM (spring bones, etc.)
    // ========================================
    vrm.update(delta);
  }, []);

  // Helper: Update expression targets based on state
  function updateExpressionTargets(state: VtuberState, caps: ExpressionCapabilities) {
    const targets = expressionTargetsRef.current;

    // Reset all emotion targets
    targets.happy = 0;
    targets.angry = 0;
    targets.sad = 0;
    targets.surprised = 0;
    targets.neutral = 0;
    targets.relaxed = 0;

    switch (state) {
      case 'idle':
        // Use mood-based expressions
        const moodExprs = MOOD_EXPRESSIONS[currentMoodRef.current];
        for (const [expr, value] of Object.entries(moodExprs)) {
          targets[expr as StandardExpression] = value;
        }
        break;

      case 'thinking':
        targets.neutral = 0.2;
        // Thinking uses head animation, not expression
        break;

      case 'speaking':
        targets.happy = 0.2;  // Engaged expression
        break;

      case 'error':
        if (caps.hasEmotions) {
          targets.surprised = 0.5;
          targets.sad = 0.3;
        }
        break;
    }
  }

  // Helper: Update blinking
  function updateBlinking(delta: number, caps: ExpressionCapabilities) {
    if (!caps.hasBlink) return;

    // Skip normal blinking if winking
    if (isWinkingRef.current) return;

    if (isBlinkingRef.current) {
      // Currently blinking - animate blink
      blinkProgressRef.current += delta / ANIMATION_CONFIG.blinkDuration;

      if (blinkProgressRef.current >= 1) {
        // Blink complete
        isBlinkingRef.current = false;
        blinkProgressRef.current = 0;
        nextBlinkRef.current = getRandomBlinkInterval();
        blinkTimerRef.current = 0;
        expressionTargetsRef.current.blink = 0;
      } else {
        // Blink in progress - use smooth curve
        const t = blinkProgressRef.current;
        // Smooth curve: quick close, pause, quick open
        const blinkValue = t < 0.4 ? t / 0.4 : (1 - t) / 0.6;
        expressionTargetsRef.current.blink = Math.max(0, Math.min(1, blinkValue));
      }
    } else {
      // Not blinking - check timer
      blinkTimerRef.current += delta;

      // Reduce blink frequency when thinking
      const interval = stateRef.current === 'thinking'
        ? nextBlinkRef.current * 1.5
        : nextBlinkRef.current;

      if (blinkTimerRef.current >= interval) {
        // Chance to wink instead of blink (only in idle state)
        if (stateRef.current === 'idle' && Math.random() < ANIMATION_CONFIG.winkChance) {
          // Start wink
          isWinkingRef.current = true;
          winkProgressRef.current = 0;
          winkSideRef.current = Math.random() < 0.5 ? 'left' : 'right';
          // Reset blink timer
          blinkTimerRef.current = 0;
          nextBlinkRef.current = getRandomBlinkInterval();
        } else {
          // Normal blink
          isBlinkingRef.current = true;
          blinkProgressRef.current = 0;
        }
      }
    }
  }

  // Helper: Update mouth animation
  function updateMouth(delta: number, state: VtuberState, caps: ExpressionCapabilities) {
    if (!caps.hasLipSync) return;

    const targets = expressionTargetsRef.current;

    if (state === 'speaking') {
      // Check for audio-driven lipsync
      if (analyserRef.current) {
        // Audio-based lipsync
        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Get average volume (simple RMS approximation)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;
        mouthTargetRef.current = avg * ANIMATION_CONFIG.speakingAmplitude;
      } else if (tokenPulseRef.current > 0) {
        // Token-based lipsync
        tokenPulseRef.current -= delta;
        const pulseProgress = tokenPulseRef.current / ANIMATION_CONFIG.tokenPulseDuration;
        // Quick open, slower close
        mouthTargetRef.current = pulseProgress > 0.5
          ? (1 - pulseProgress) * 2 * ANIMATION_CONFIG.speakingAmplitude
          : pulseProgress * 2 * ANIMATION_CONFIG.speakingAmplitude * 0.7;
      } else {
        // Fallback: continuous sine wave
        speakingTimerRef.current += delta * ANIMATION_CONFIG.speakingSpeed;
        const sineValue = (Math.sin(speakingTimerRef.current) + 1) / 2;
        mouthTargetRef.current = sineValue * ANIMATION_CONFIG.speakingAmplitude * 0.5;
      }
    } else {
      mouthTargetRef.current = 0;
    }

    // Lerp mouth value
    mouthCurrentRef.current += (mouthTargetRef.current - mouthCurrentRef.current) *
      Math.min(1, delta * ANIMATION_CONFIG.expressionLerpSpeed * 2);

    // Apply to lip sync expressions
    targets.aa = mouthCurrentRef.current;
    // Could add variation with other vowels here
  }

  // Helper: Update breathing (bone-based)
  function updateBreathing(vrm: VRM, _delta: number) {
    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    const chest = humanoid.getNormalizedBoneNode('chest');
    const spine = humanoid.getNormalizedBoneNode('spine');

    const breathPhase = timeRef.current * ANIMATION_CONFIG.breathingSpeed;
    const breathValue = Math.sin(breathPhase) * ANIMATION_CONFIG.breathingAmplitude;

    if (chest) {
      chest.rotation.x = breathValue * 0.5;
    }
    if (spine) {
      spine.rotation.x = breathValue * 0.3;
    }
  }

  // Helper: Update head micro-movement
  function updateHeadSway(vrm: VRM, _delta: number, state: VtuberState) {
    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    const head = humanoid.getNormalizedBoneNode('head');
    const neck = humanoid.getNormalizedBoneNode('neck');

    if (!head) return;

    if (state === 'thinking') {
      // Thinking pose: slight head tilt
      head.rotation.z = ANIMATION_CONFIG.thinkingHeadTiltZ;
      head.rotation.x = ANIMATION_CONFIG.thinkingHeadTiltX;
      if (neck) {
        neck.rotation.z = ANIMATION_CONFIG.thinkingHeadTiltZ * 0.5;
      }
    } else if (state === 'speaking') {
      // Speaking: subtle nodding
      const nodPhase = timeRef.current * 3;
      const nodValue = Math.sin(nodPhase) * 0.02;
      head.rotation.x = nodValue;

      // Reset tilt
      head.rotation.z *= 0.95;
      if (neck) {
        neck.rotation.z *= 0.95;
      }
    } else {
      // Idle: very subtle sway
      const swayPhase = timeRef.current * ANIMATION_CONFIG.headSwaySpeed;
      const swayX = Math.sin(swayPhase) * ANIMATION_CONFIG.headSwayAmplitude;
      const swayZ = Math.sin(swayPhase * 0.7) * ANIMATION_CONFIG.headSwayAmplitude * 0.5;

      head.rotation.x = swayX * 0.5;
      head.rotation.z = swayZ;

      if (neck) {
        neck.rotation.x = swayX * 0.3;
        neck.rotation.z = swayZ * 0.3;
      }
    }
  }

  // Helper: Apply expressions with lerping
  function applyExpressions(
    manager: VRMExpressionManager | null,
    caps: ExpressionCapabilities,
    delta: number
  ) {
    if (!manager) return;

    const targets = expressionTargetsRef.current;
    const current = expressionCurrentRef.current;
    const lerpFactor = Math.min(1, delta * ANIMATION_CONFIG.expressionLerpSpeed);

    for (const [key, targetValue] of Object.entries(targets)) {
      const standard = key as StandardExpression;
      const currentValue = current[standard] ?? 0;
      const newValue = currentValue + (targetValue - currentValue) * lerpFactor;
      current[standard] = newValue;

      setExpression(manager, caps, standard, newValue);
    }
  }

  // Helper: Update idle mood (random mood changes when idle)
  function updateIdleMood(delta: number) {
    if (stateRef.current !== 'idle') {
      // Reset to neutral when not idle
      currentMoodRef.current = 'neutral';
      moodTimerRef.current = 0;
      return;
    }

    moodTimerRef.current += delta;

    if (moodTimerRef.current >= nextMoodChangeRef.current) {
      // Time to change mood
      const currentMood = currentMoodRef.current;
      const availableMoods = IDLE_MOODS.filter(m => m !== currentMood);
      const newMood = availableMoods[Math.floor(Math.random() * availableMoods.length)];

      currentMoodRef.current = newMood;
      moodTimerRef.current = 0;
      nextMoodChangeRef.current = getRandomInterval(
        ANIMATION_CONFIG.moodChangeIntervalMin,
        ANIMATION_CONFIG.moodChangeIntervalMax
      );
    }
  }

  // Helper: Update wink animation (single eye blink)
  function updateWink(delta: number, caps: ExpressionCapabilities) {
    if (!caps.hasBlink) return;

    const targets = expressionTargetsRef.current;

    if (isWinkingRef.current) {
      // Currently winking - animate
      winkProgressRef.current += delta / ANIMATION_CONFIG.winkDuration;

      if (winkProgressRef.current >= 1) {
        // Wink complete
        isWinkingRef.current = false;
        winkProgressRef.current = 0;
        targets.blinkLeft = 0;
        targets.blinkRight = 0;
      } else {
        // Wink in progress
        const t = winkProgressRef.current;
        // Smooth curve
        const winkValue = t < 0.4 ? t / 0.4 : (1 - t) / 0.6;
        const clampedValue = Math.max(0, Math.min(1, winkValue));

        if (winkSideRef.current === 'left') {
          targets.blinkLeft = clampedValue;
          targets.blinkRight = 0;
        } else {
          targets.blinkLeft = 0;
          targets.blinkRight = clampedValue;
        }
      }
    }
  }

  // Helper: Update eye wandering (random eye direction)
  function updateEyeWander(delta: number, caps: ExpressionCapabilities) {
    // Only in idle state
    if (stateRef.current !== 'idle') {
      isEyeWanderingRef.current = false;
      eyeWanderTimerRef.current = 0;
      return;
    }

    const targets = expressionTargetsRef.current;

    if (isEyeWanderingRef.current) {
      // Currently wandering
      eyeWanderProgressRef.current += delta / ANIMATION_CONFIG.eyeWanderDuration;

      if (eyeWanderProgressRef.current >= 1) {
        // Wandering complete - return to center
        isEyeWanderingRef.current = false;
        eyeWanderProgressRef.current = 0;
        nextEyeWanderRef.current = getRandomInterval(
          ANIMATION_CONFIG.eyeWanderIntervalMin,
          ANIMATION_CONFIG.eyeWanderIntervalMax
        );
        eyeWanderTimerRef.current = 0;

        // Reset look expressions
        targets.lookUp = 0;
        targets.lookDown = 0;
        targets.lookLeft = 0;
        targets.lookRight = 0;
      } else {
        // Apply eye wander with smooth ease-in-out
        const t = eyeWanderProgressRef.current;
        // Smooth: ease in at start, ease out at end
        const ease = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;

        const intensity = ease * (1 - Math.abs(t - 0.5) * 2) * ANIMATION_CONFIG.eyeWanderIntensity;
        const target = eyeWanderTargetRef.current;

        // Apply horizontal look
        if (target.x > 0) {
          targets.lookRight = target.x * intensity;
          targets.lookLeft = 0;
        } else {
          targets.lookLeft = -target.x * intensity;
          targets.lookRight = 0;
        }

        // Apply vertical look
        if (target.y > 0) {
          targets.lookUp = target.y * intensity;
          targets.lookDown = 0;
        } else {
          targets.lookDown = -target.y * intensity;
          targets.lookUp = 0;
        }
      }
    } else {
      // Not wandering - check timer
      eyeWanderTimerRef.current += delta;

      if (eyeWanderTimerRef.current >= nextEyeWanderRef.current) {
        // Start new wander
        isEyeWanderingRef.current = true;
        eyeWanderProgressRef.current = 0;

        // Random direction
        eyeWanderTargetRef.current = {
          x: (Math.random() - 0.5) * 2,  // -1 to 1
          y: (Math.random() - 0.5) * 2,
        };
      }
    }
  }

  // Helper: Update micro expressions (brief expression flashes)
  function updateMicroExpression(delta: number, caps: ExpressionCapabilities) {
    // Only in idle state
    if (stateRef.current !== 'idle') {
      activeMicroExpressionRef.current = null;
      microExpressionTimerRef.current = 0;
      return;
    }

    if (!caps.hasEmotions) return;

    const targets = expressionTargetsRef.current;

    if (activeMicroExpressionRef.current) {
      // Currently showing micro expression
      microExpressionProgressRef.current += delta / ANIMATION_CONFIG.microExpressionDuration;

      if (microExpressionProgressRef.current >= 1) {
        // Micro expression complete
        activeMicroExpressionRef.current = null;
        microExpressionProgressRef.current = 0;
        nextMicroExpressionRef.current = getRandomInterval(
          ANIMATION_CONFIG.microExpressionIntervalMin,
          ANIMATION_CONFIG.microExpressionIntervalMax
        );
        microExpressionTimerRef.current = 0;
      } else {
        // Apply micro expression with bell curve
        const t = microExpressionProgressRef.current;
        const intensity = Math.sin(t * Math.PI) * 0.3;  // Peak at 0.3 intensity

        const expr = activeMicroExpressionRef.current;
        // Add to existing target (mood might already have some value)
        const baseValue = MOOD_EXPRESSIONS[currentMoodRef.current][expr] ?? 0;
        targets[expr] = baseValue + intensity;
      }
    } else {
      // Not showing - check timer
      microExpressionTimerRef.current += delta;

      if (microExpressionTimerRef.current >= nextMicroExpressionRef.current) {
        // Start new micro expression
        const microExpressions: StandardExpression[] = ['happy', 'surprised', 'relaxed'];
        activeMicroExpressionRef.current = microExpressions[
          Math.floor(Math.random() * microExpressions.length)
        ];
        microExpressionProgressRef.current = 0;
      }
    }
  }

  return {
    dispatch,
    get state() {
      return stateRef.current;
    },
    initVRM,
    update,
    setSpeakingSource,
    get capabilities() {
      return capabilitiesRef.current;
    },
  };
}

// Helper functions
function getRandomBlinkInterval(): number {
  return ANIMATION_CONFIG.blinkIntervalMin +
    Math.random() * (ANIMATION_CONFIG.blinkIntervalMax - ANIMATION_CONFIG.blinkIntervalMin);
}

function getRandomInterval(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export default useVtuberController;
