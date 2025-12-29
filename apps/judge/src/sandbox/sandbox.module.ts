import { Module } from '@nestjs/common';
import { DockerSandboxRunner } from './docker-sandbox.runner';
import { loadSandboxConfig } from './sandbox.config';

@Module({
  providers: [
    {
      provide: 'SANDBOX_CONFIG',
      useFactory: loadSandboxConfig,
    },
    {
      provide: DockerSandboxRunner,
      useFactory: (config: ReturnType<typeof loadSandboxConfig>) => new DockerSandboxRunner(config),
      inject: ['SANDBOX_CONFIG'],
    },
    {
      provide: 'SANDBOX_RUNNER',
      useExisting: DockerSandboxRunner,
    },
  ],
  exports: ['SANDBOX_RUNNER'],
})
export class SandboxModule {}

