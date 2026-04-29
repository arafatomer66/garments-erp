import { Module } from '@nestjs/common';
import { IamController } from './iam.controller';

@Module({
  controllers: [IamController],
})
export class IamModule {}
