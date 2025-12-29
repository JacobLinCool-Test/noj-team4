/**
 * VRM Expression Mapping and Capability Detection
 *
 * This module handles the detection of available expressions in VRM models
 * and provides standardized mappings for different expression types.
 */

import type { VRM, VRMExpressionManager } from '@pixiv/three-vrm';

// Standard expression names we want to use
export type StandardExpression =
  // Emotions
  | 'happy' | 'angry' | 'sad' | 'relaxed' | 'surprised' | 'neutral'
  // Lip sync (VRM1 style)
  | 'aa' | 'ih' | 'ou' | 'ee' | 'oh'
  // Blink
  | 'blink' | 'blinkLeft' | 'blinkRight'
  // Look
  | 'lookUp' | 'lookDown' | 'lookLeft' | 'lookRight';

// Fallback name mappings for different VRM formats
const EXPRESSION_FALLBACKS: Record<StandardExpression, string[]> = {
  // Emotions
  happy: ['happy', 'Happy', 'joy', 'Joy', 'smile', 'Smile', 'fun', 'Fun'],
  angry: ['angry', 'Angry', 'anger', 'Anger'],
  sad: ['sad', 'Sad', 'sorrow', 'Sorrow'],
  relaxed: ['relaxed', 'Relaxed', 'calm', 'Calm'],
  surprised: ['surprised', 'Surprised', 'surprise', 'Surprise'],
  neutral: ['neutral', 'Neutral', 'default', 'Default'],

  // Lip sync - VRM1 style, VRChat style, and common alternatives
  aa: ['aa', 'Aa', 'AA', 'A', 'a', 'vrc.v_aa', 'mouth_a', 'Mouth_A', 'あ'],
  ih: ['ih', 'Ih', 'IH', 'I', 'i', 'vrc.v_ih', 'mouth_i', 'Mouth_I', 'い'],
  ou: ['ou', 'Ou', 'OU', 'U', 'u', 'vrc.v_ou', 'mouth_u', 'Mouth_U', 'う'],
  ee: ['ee', 'Ee', 'EE', 'E', 'e', 'vrc.v_ee', 'mouth_e', 'Mouth_E', 'え'],
  oh: ['oh', 'Oh', 'OH', 'O', 'o', 'vrc.v_oh', 'mouth_o', 'Mouth_O', 'お'],

  // Blink
  blink: ['blink', 'Blink', 'BLINK', 'blinkBoth', 'BlinkBoth', 'close', 'Close'],
  blinkLeft: ['blinkLeft', 'BlinkLeft', 'blink_l', 'Blink_L', 'winkLeft', 'WinkLeft'],
  blinkRight: ['blinkRight', 'BlinkRight', 'blink_r', 'Blink_R', 'winkRight', 'WinkRight'],

  // Look direction (via expressions, not bone-based lookAt)
  lookUp: ['lookUp', 'LookUp', 'look_up', 'Look_Up'],
  lookDown: ['lookDown', 'LookDown', 'look_down', 'Look_Down'],
  lookLeft: ['lookLeft', 'LookLeft', 'look_left', 'Look_Left'],
  lookRight: ['lookRight', 'LookRight', 'look_right', 'Look_Right'],
};

export type ExpressionCapabilities = {
  // Resolved mappings: standard name -> actual VRM expression name
  expressionMap: Partial<Record<StandardExpression, string>>;
  // All available expressions in the model
  allExpressions: string[];
  // Capability flags
  hasLipSync: boolean;
  hasBlink: boolean;
  hasEmotions: boolean;
  hasLookExpressions: boolean;
};

/**
 * Detect all available expressions in a VRM model and create mappings
 */
export function detectExpressionCapabilities(vrm: VRM): ExpressionCapabilities {
  const manager = vrm.expressionManager;
  if (!manager) {
    console.warn('[VTuber] No expression manager found in VRM');
    return {
      expressionMap: {},
      allExpressions: [],
      hasLipSync: false,
      hasBlink: false,
      hasEmotions: false,
      hasLookExpressions: false,
    };
  }

  // Get ALL available expressions from the manager
  const allExpressions = getAllExpressionNames(manager);
  console.log('[VTuber] Available expressions:', allExpressions);

  // Build the expression map
  const expressionMap: Partial<Record<StandardExpression, string>> = {};

  for (const [standard, fallbacks] of Object.entries(EXPRESSION_FALLBACKS)) {
    const found = fallbacks.find(name =>
      allExpressions.some(e => e.toLowerCase() === name.toLowerCase())
    );
    if (found) {
      // Find the exact case-matched name from allExpressions
      const exactName = allExpressions.find(e => e.toLowerCase() === found.toLowerCase());
      if (exactName) {
        expressionMap[standard as StandardExpression] = exactName;
      }
    }
  }

  // Check capabilities
  const hasLipSync = ['aa', 'ih', 'ou', 'ee', 'oh'].some(e => e in expressionMap);
  const hasBlink = 'blink' in expressionMap || 'blinkLeft' in expressionMap;
  const hasEmotions = ['happy', 'angry', 'sad', 'surprised'].some(e => e in expressionMap);
  const hasLookExpressions = ['lookUp', 'lookDown', 'lookLeft', 'lookRight'].some(e => e in expressionMap);

  console.log('[VTuber] Expression capabilities:', {
    expressionMap,
    hasLipSync,
    hasBlink,
    hasEmotions,
    hasLookExpressions,
  });

  return {
    expressionMap,
    allExpressions,
    hasLipSync,
    hasBlink,
    hasEmotions,
    hasLookExpressions,
  };
}

/**
 * Get all expression names from the expression manager
 * This uses internal access to get the full list
 */
function getAllExpressionNames(manager: VRMExpressionManager): string[] {
  const names: string[] = [];

  // VRM1 stores expressions in _expressionMap (Map)
  // VRM0 may store them differently
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expressionMap = (manager as any)._expressionMap as Map<string, unknown> | undefined;

  if (expressionMap && expressionMap instanceof Map) {
    for (const key of expressionMap.keys()) {
      names.push(key);
    }
  }

  // Also try common expressions as fallback detection
  const commonNames = [
    // VRM1 preset expressions
    'happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral',
    'aa', 'ih', 'ou', 'ee', 'oh',
    'blink', 'blinkLeft', 'blinkRight',
    'lookUp', 'lookDown', 'lookLeft', 'lookRight',
    // VRM0 / VRChat style
    'A', 'I', 'U', 'E', 'O',
    'Joy', 'Angry', 'Sorrow', 'Fun', 'Surprised',
    'Blink', 'Blink_L', 'Blink_R',
  ];

  for (const name of commonNames) {
    if (!names.includes(name) && manager.getExpression(name)) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Helper to set expression with fallback handling
 */
export function setExpression(
  manager: VRMExpressionManager | null,
  capabilities: ExpressionCapabilities,
  standard: StandardExpression,
  value: number
): boolean {
  if (!manager) return false;

  const actualName = capabilities.expressionMap[standard];
  if (actualName) {
    manager.setValue(actualName, value);
    return true;
  }
  return false;
}

/**
 * Reset all expressions to neutral state
 */
export function resetAllExpressions(
  manager: VRMExpressionManager | null,
  capabilities: ExpressionCapabilities
): void {
  if (!manager) return;

  for (const name of capabilities.allExpressions) {
    manager.setValue(name, 0);
  }
}
