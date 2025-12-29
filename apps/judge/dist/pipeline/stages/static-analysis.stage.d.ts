import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
export declare class StaticAnalysisStage implements PipelineStage {
    private readonly sandbox;
    private readonly logger;
    readonly name = "StaticAnalysis";
    constructor(sandbox: SandboxRunner);
    execute(context: StageContext): Promise<StageResult>;
    private checkRule;
    private checkForbiddenFunction;
    private checkForbiddenLibrary;
    private checkForbiddenSyntax;
    private checkForbiddenKeyword;
    private removeStringsAndComments;
    private runLinter;
    private parsePylintOutput;
    private parseClangTidyOutput;
    private formatViolations;
    private getLineNumber;
    private escapeRegex;
    validateConfig(config: Record<string, any>): string | null;
}
