import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CedulaController } from './cedula.controller';
import { CedulaService } from './cedula.service';

@Module({
  imports: [HttpModule],
  controllers: [CedulaController],
  providers: [CedulaService],
  exports: [CedulaService],
})
export class CedulaModule {}