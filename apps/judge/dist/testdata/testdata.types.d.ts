export interface TestdataCase {
    name: string;
    inputFile: string;
    outputFile: string;
    points: number;
    isSample: boolean;
    timeLimitMs?: number;
    memoryLimitKb?: number;
}
export interface ChaosConfig {
    enabled: boolean;
    files?: string[];
    injectBeforeCase?: number;
}
export interface TestdataManifest {
    version: string;
    cases: TestdataCase[];
    defaultTimeLimitMs: number;
    defaultMemoryLimitKb: number;
    chaos?: ChaosConfig;
}
