"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
const common_1 = require("@nestjs/common");
const minio_service_1 = require("../../minio/minio.service");
let TemplateService = TemplateService_1 = class TemplateService {
    constructor(minio) {
        this.minio = minio;
        this.logger = new common_1.Logger(TemplateService_1.name);
        this.STUDENT_CODE_MARKER = '// STUDENT_CODE_HERE';
        this.STUDENT_CODE_START = '// === 學生實作區域開始 ===';
        this.STUDENT_CODE_END = '// === 學生實作區域結束 ===';
    }
    async mergeTemplate(templateKey, studentCode) {
        this.logger.debug(`合併模板: ${templateKey}`);
        try {
            const template = await this.minio.getObjectAsString('noj-templates', templateKey);
            if (template.includes(this.STUDENT_CODE_MARKER)) {
                return template.replace(this.STUDENT_CODE_MARKER, studentCode);
            }
            if (template.includes(this.STUDENT_CODE_START) &&
                template.includes(this.STUDENT_CODE_END)) {
                const startIndex = template.indexOf(this.STUDENT_CODE_START);
                const endIndex = template.indexOf(this.STUDENT_CODE_END);
                if (startIndex < endIndex) {
                    const before = template.substring(0, startIndex + this.STUDENT_CODE_START.length);
                    const after = template.substring(endIndex);
                    return `${before}\n${studentCode}\n${after}`;
                }
            }
            throw new Error('模板中找不到學生程式碼標記');
        }
        catch (error) {
            this.logger.error(`合併模板失敗: ${error.message}`, error.stack);
            throw error;
        }
    }
    async validateTemplate(templateKey) {
        try {
            const template = await this.minio.getObjectAsString('noj-templates', templateKey);
            const hasSingleMarker = template.includes(this.STUDENT_CODE_MARKER);
            const hasRegionMarkers = template.includes(this.STUDENT_CODE_START) &&
                template.includes(this.STUDENT_CODE_END);
            if (!hasSingleMarker && !hasRegionMarkers) {
                return {
                    valid: false,
                    error: '模板中必須包含 // STUDENT_CODE_HERE 或區域標記',
                };
            }
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: error.message,
            };
        }
    }
};
exports.TemplateService = TemplateService;
exports.TemplateService = TemplateService = TemplateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [minio_service_1.MinioService])
], TemplateService);
//# sourceMappingURL=template.service.js.map