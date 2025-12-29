export interface SandboxConfig {
    image: string;
    jobRootDir: string;
    dockerCpuLimit: string;
    dockerMemoryLimit: string;
    dockerPidsLimit: number;
    dockerTmpfsSize: string;
    outputLimitBytes: number;
    dockerRunOverheadMs: number;
}
export declare function loadSandboxConfig(): SandboxConfig;
