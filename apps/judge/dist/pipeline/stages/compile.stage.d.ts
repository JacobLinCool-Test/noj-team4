import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
import { TemplateService } from '../template/template.service';
import { MinioService } from '../../minio/minio.service';
export declare class CompileStage implements PipelineStage {
    private readonly sandbox;
    private readonly templateService;
    private readonly minio;
    private readonly logger;
    readonly name = "Compile";
    constructor(sandbox: SandboxRunner, templateService: TemplateService, minio: MinioService);
    execute(context: StageContext): Promise<StageResult>;
    private prepareSource;
    private shouldUseMakefile;
    private downloadTeacherMakefile;
    private writeSingleFile;
    private mergeFunctionTemplate;
    private getSourceFilename;
    private getExecutablePath;
    validateConfig(config: Record<string, any>): string | null;
}
