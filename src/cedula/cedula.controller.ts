import { Controller, Get, Param } from '@nestjs/common';
import { CedulaService } from './cedula.service';

@Controller('cedula')
export class CedulaController {
  constructor(private cedulaService: CedulaService) {}

  // GET /api/cedula/:cedula
  @Get(':cedula')
  validate(@Param('cedula') cedula: string) {
    return this.cedulaService.validate(cedula);
  }
}