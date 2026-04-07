import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CedulaService {
  constructor(private readonly httpService: HttpService) {}

  async validate(cedula: string): Promise<{ name: string; firstLastName: string; secondLastName: string }> {
    // Solo cédulas físicas: 9 dígitos
    if (!/^\d{9}$/.test(cedula)) {
      throw new BadRequestException('La cédula debe tener exactamente 9 dígitos');
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`https://apis.datos.cr/v1/cedulas/${cedula}`)
      );

      if (!data || !data.nombre) {
        throw new BadRequestException('Cédula no encontrada en el padrón');
      }

      return {
        name: data.nombre,
        firstLastName: data.apellido1,
        secondLastName: data.apellido2,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Cédula no encontrada en el padrón electoral');
    }
  }
}