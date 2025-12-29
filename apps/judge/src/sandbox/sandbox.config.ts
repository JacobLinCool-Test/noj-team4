import * as os from 'os';
import * as path from 'path';

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

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

export function loadSandboxConfig(): SandboxConfig {
  return {
    image: process.env.NOJ_SANDBOX_IMAGE || 'noj4-sandbox:0.1',
    jobRootDir:
      process.env.NOJ_JUDGE_JOB_ROOT_DIR || path.join(os.tmpdir(), 'noj-judge-jobs'),
    dockerCpuLimit: process.env.NOJ_SANDBOX_DOCKER_CPUS || '1',
    dockerMemoryLimit: process.env.NOJ_SANDBOX_DOCKER_MEMORY || '512m',
    dockerPidsLimit: parseIntEnv('NOJ_SANDBOX_DOCKER_PIDS_LIMIT', 256),
    dockerTmpfsSize: process.env.NOJ_SANDBOX_DOCKER_TMPFS_SIZE || '128m',
    outputLimitBytes: parseIntEnv('NOJ_SANDBOX_OUTPUT_LIMIT_BYTES', 256 * 1024),
    dockerRunOverheadMs: parseIntEnv('NOJ_SANDBOX_DOCKER_RUN_OVERHEAD_MS', 2000),
  };
}

