import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CedulaController } from './cedula.controller';
import { CedulaService } from './cedula.service';

@Module({
  imports: [MongooseModule],   // provee InjectConnection
  controllers: [CedulaController],
  providers: [CedulaService],
  exports: [CedulaService],
})
export class CedulaModule {}