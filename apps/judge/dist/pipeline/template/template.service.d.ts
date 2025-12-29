import { MinioService } from '../../minio/minio.service';
export declare class TemplateService {
    private readonly minio;
    private readonly logger;
    private readonly STUDENT_CODE_MARKER;
    private readonly STUDENT_CODE_START;
    private readonly STUDENT_CODE_END;
    constructor(minio: MinioService);
    mergeTemplate(templateKey: string, studentCode: string): Promise<string>;
    validateTemplate(templateKey: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
}
