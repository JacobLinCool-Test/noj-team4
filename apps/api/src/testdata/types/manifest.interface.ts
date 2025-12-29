/**
 * Testdata Manifest Interface
 *
 * This file defines the structure of manifest.json that must be included
 * in every testdata zip file uploaded by teachers/admins.
 *
 * Example manifest.json:
 * {
 *   "version": "1.0",
 *   "cases": [
 *     {
 *       "name": "Sample 1",
 *       "inputFile": "input/01.in",
 *       "outputFile": "output/01.out",
 *       "points": 10,
 *       "isSample": true,
 *       "timeLimitMs": 1000,
 *       "memoryLimitKb": 262144
 *     },
 *     {
 *       "name": "Hidden Test 1",
 *       "inputFile": "input/02.in",
 *       "outputFile": "output/02.out",
 *       "points": 15,
 *       "isSample": false,
 *       "timeLimitMs": 1000,
 *       "memoryLimitKb": 262144
 *     }
 *   ],
 *   "defaultTimeLimitMs": 1000,
 *   "defaultMemoryLimitKb": 262144
 * }
 */

export interface TestdataCase {
  /**
   * Display name for this test case (e.g., "Sample 1", "Hidden Test 5")
   */
  name: string;

  /**
   * Relative path to input file within the zip (e.g., "input/01.in")
   */
  inputFile: string;

  /**
   * Relative path to expected output file within the zip (e.g., "output/01.out")
   */
  outputFile: string;

  /**
   * Points awarded for passing this test case
   */
  points: number;

  /**
   * Whether this is a sample test case (visible to students)
   */
  isSample: boolean;

  /**
   * Time limit in milliseconds for this specific case (optional, falls back to default)
   */
  timeLimitMs?: number;

  /**
   * Memory limit in kilobytes for this specific case (optional, falls back to default)
   */
  memoryLimitKb?: number;
}

export interface TestdataManifest {
  /**
   * Manifest format version (currently "1.0")
   */
  version: string;

  /**
   * List of test cases in execution order
   */
  cases: TestdataCase[];

  /**
   * Default time limit in milliseconds (used if case doesn't specify)
   */
  defaultTimeLimitMs: number;

  /**
   * Default memory limit in kilobytes (used if case doesn't specify)
   */
  defaultMemoryLimitKb: number;
}
