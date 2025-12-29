import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { CheckerService } from '../checker/checker.service';
export declare class CheckStage implements PipelineStage {
    private readonly checkerService;
    private readonly logger;
    readonly name = "Check";
    constructor(checkerService: CheckerService);
    execute(context: StageContext): Promise<StageResult>;
    private diffCheck;
    private runCustomChecker;
    private normalizeWhitespace;
    private truncate;
    validateConfig(config: Record<string, any>): string | null;
}
