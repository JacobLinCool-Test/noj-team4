import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
export declare class ExecuteStage implements PipelineStage {
    private readonly sandbox;
    private readonly logger;
    readonly name = "Execute";
    constructor(sandbox: SandboxRunner);
    execute(context: StageContext): Promise<StageResult>;
    private prepareTestCases;
    private injectChaosFiles;
    private loadTestdataCases;
    private determineOverallStatus;
    private sanitizeStderr;
    validateConfig(config: Record<string, any>): string | null;
}
