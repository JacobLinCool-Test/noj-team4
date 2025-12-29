"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSandboxConfig = loadSandboxConfig;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
function parseIntEnv(name, fallback) {
    const raw = process.env[name];
    if (!raw)
        return fallback;
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value) || value <= 0)
        return fallback;
    return value;
}
function loadSandboxConfig() {
    return {
        image: process.env.NOJ_SANDBOX_IMAGE || 'noj4-sandbox:0.1',
        jobRootDir: process.env.NOJ_JUDGE_JOB_ROOT_DIR || path.join(os.tmpdir(), 'noj-judge-jobs'),
        dockerCpuLimit: process.env.NOJ_SANDBOX_DOCKER_CPUS || '1',
        dockerMemoryLimit: process.env.NOJ_SANDBOX_DOCKER_MEMORY || '512m',
        dockerPidsLimit: parseIntEnv('NOJ_SANDBOX_DOCKER_PIDS_LIMIT', 256),
        dockerTmpfsSize: process.env.NOJ_SANDBOX_DOCKER_TMPFS_SIZE || '128m',
        outputLimitBytes: parseIntEnv('NOJ_SANDBOX_OUTPUT_LIMIT_BYTES', 256 * 1024),
        dockerRunOverheadMs: parseIntEnv('NOJ_SANDBOX_DOCKER_RUN_OVERHEAD_MS', 2000),
    };
}
//# sourceMappingURL=sandbox.config.js.map