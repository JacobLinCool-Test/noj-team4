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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ArtifactsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactsService = void 0;
const common_1 = require("@nestjs/common");
const minio_service_1 = require("../../minio/minio.service");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const glob_1 = require("glob");
let ArtifactsService = ArtifactsService_1 = class ArtifactsService {
    constructor(minio) {
        this.minio = minio;
        this.logger = new common_1.Logger(ArtifactsService_1.name);
    }
    async collectArtifacts(jobDir, artifactPaths) {
        this.logger.debug(`收集產物: ${artifactPaths.length} 個路徑`);
        const artifacts = new Map();
        for (const pattern of artifactPaths) {
            const files = await this.findFiles(jobDir, pattern);
            for (const file of files) {
                try {
                    const content = await fs.readFile(file);
                    const relativePath = path.relative(jobDir, file);
                    artifacts.set(relativePath, content);
                    this.logger.debug(`收集產物: ${relativePath}`);
                }
                catch (error) {
                    this.logger.warn(`無法讀取產物 ${file}: ${error.message}`);
                }
            }
        }
        return artifacts;
    }
    async uploadArtifacts(submissionId, artifacts) {
        if (artifacts.size === 0) {
            this.logger.debug('沒有產物需要上傳');
            return null;
        }
        this.logger.debug(`打包 ${artifacts.size} 個產物`);
        const zip = new adm_zip_1.default();
        for (const [relativePath, content] of artifacts.entries()) {
            zip.addFile(relativePath, content);
        }
        const zipBuffer = zip.toBuffer();
        const key = `submissions/${submissionId}/artifacts.zip`;
        await this.minio.putObject('noj-artifacts', key, zipBuffer, {
            'Content-Type': 'application/zip',
        });
        this.logger.log(`產物已上傳: ${key} (${zipBuffer.length} bytes)`);
        return key;
    }
    async findFiles(baseDir, pattern) {
        const fullPattern = path.join(baseDir, pattern);
        try {
            const files = await (0, glob_1.glob)(fullPattern, {
                nodir: true,
                absolute: true,
            });
            return files;
        }
        catch (error) {
            this.logger.warn(`尋找檔案失敗 ${pattern}: ${error.message}`);
            return [];
        }
    }
    async downloadArtifacts(artifactsKey) {
        try {
            return await this.minio.getObject('noj-artifacts', artifactsKey);
        }
        catch (error) {
            this.logger.error(`下載產物失敗: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.ArtifactsService = ArtifactsService;
exports.ArtifactsService = ArtifactsService = ArtifactsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [minio_service_1.MinioService])
], ArtifactsService);
//# sourceMappingURL=artifacts.service.js.map