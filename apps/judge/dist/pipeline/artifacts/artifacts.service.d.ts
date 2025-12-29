import { MinioService } from '../../minio/minio.service';
export declare class ArtifactsService {
    private readonly minio;
    private readonly logger;
    constructor(minio: MinioService);
    collectArtifacts(jobDir: string, artifactPaths: string[]): Promise<Map<string, Buffer>>;
    uploadArtifacts(submissionId: string, artifacts: Map<string, Buffer>): Promise<string>;
    private findFiles;
    downloadArtifacts(artifactsKey: string): Promise<Buffer>;
}
