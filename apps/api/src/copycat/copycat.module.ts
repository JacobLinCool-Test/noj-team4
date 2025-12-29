import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CopycatController } from './copycat.controller';
import { CopycatService } from './copycat.service';
import { CopycatProcessor } from './copycat.processor';
import { DolosRunnerService } from './dolos-runner.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'copycat',
    }),
  ],
  controllers: [CopycatController],
  providers: [CopycatService, CopycatProcessor, DolosRunnerService],
  exports: [CopycatService],
})
export class CopycatModule {}
