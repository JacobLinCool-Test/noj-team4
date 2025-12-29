export declare class MinioService {
    private client;
    constructor();
    getObject(bucket: string, key: string): Promise<Buffer>;
    putObject(bucket: string, key: string, data: Buffer | string, metadata?: Record<string, string>): Promise<void>;
    getObjectAsString(bucket: string, key: string): Promise<string>;
}
