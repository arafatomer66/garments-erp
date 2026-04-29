import { Global, Module } from '@nestjs/common';
import { TenantRepository } from './tenant-repository';

@Global()
@Module({
  providers: [TenantRepository],
  exports: [TenantRepository],
})
export class DatabaseModule {}
