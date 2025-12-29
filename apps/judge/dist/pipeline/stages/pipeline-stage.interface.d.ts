import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
export interface PipelineStage {
    readonly name: string;
    execute(context: StageContext): Promise<StageResult>;
    validateConfig?(config: Record<string, any>): string | null;
    cleanup?(context: StageContext): Promise<void>;
}
