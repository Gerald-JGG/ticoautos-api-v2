import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class CedulaService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async validate(cedula: string): Promise<{
    name: string;
    firstLastName: string;
    secondLastName: string;
    sexo?: string;
    vencimiento?: string;
  }> {
    // Solo cédulas físicas: 9 dígitos
    if (!/^\d{9}$/.test(cedula)) {
      throw new BadRequestException('La cédula debe tener exactamente 9 dígitos');
    }

    // Consultar directamente la colección "padron" en la DB "padron"
    const padronDb = this.connection.useDb('padron');
    const collection = padronDb.collection('padron');

    // El mongoimport desde CSV guarda CEDULA como string.
    // El import desde BSON la guarda como number.
    // Buscamos ambos para cubrir los dos casos.
    const info = await collection.findOne({
      $or: [
        { CEDULA: cedula },
        { CEDULA: parseInt(cedula, 10) },
      ],
    });

    if (!info) {
      throw new BadRequestException('Cédula no encontrada en el padrón electoral');
    }

    const sexo = info['SEXO'];

    return {
      name:           (info['NOMBRE']    ?? '').trim(),
      firstLastName:  (info['PAPELLIDO'] ?? '').trim(),
      secondLastName: (info['SAPELLIDO'] ?? '').trim(),
      sexo:           sexo === 1 || sexo === '1' ? 'Masculino' : 'Femenino',
      vencimiento:    (info['FECHACADUC'] ?? '').toString(),
    };
  }
}