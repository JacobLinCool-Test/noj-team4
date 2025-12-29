import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('judge-submission')
    private readonly judgeQueue: Queue,
    @InjectQueue('judge-run')
    private readonly runQueue: Queue,
  ) {}

  async enqueueJudgeSubmission(submissionId: string): Promise<void> {
    await this.judgeQueue.add(
      'judge',
      { submissionId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async enqueueRunTest(data: {
    userId: number;
    problemId: string;
    language: string;
    sourceKey: string;
    stdinKey?: string;
  }): Promise<void> {
    await this.runQueue.add('run', data, {
      attempts: 1,
      removeOnComplete: 10,
      removeOnFail: 50,
    });
  }
}
