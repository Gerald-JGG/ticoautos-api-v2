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
    fechaNacimiento?: string;
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
    const info = await collection.findOne({
      $or: [
        { CEDULA: cedula },
        { CEDULA: parseInt(cedula, 10) },
      ],
    });

    if (!info) {
      throw new BadRequestException('Cédula no encontrada en el padrón electoral');
    }

    // ── Validación de mayoría de edad ─────────────────────────────────────────
    // El padrón almacena la fecha de nacimiento en el campo FECHA_NACIMIENTO
    // en formato YYYYMMDD o YYYY-MM-DD según el import.
    const rawFecha =
      info['FECHA_NACIMIENTO'] ??
      info['FECHANACIMIENTO'] ??
      info['FNACIMIENTO'] ??
      null;

    if (rawFecha) {
      const fechaStr = rawFecha.toString().replace(/-/g, '');
      if (/^\d{8}$/.test(fechaStr)) {
        const year  = parseInt(fechaStr.substring(0, 4), 10);
        const month = parseInt(fechaStr.substring(4, 6), 10) - 1; // 0-based
        const day   = parseInt(fechaStr.substring(6, 8), 10);
        const birthDate = new Date(year, month, day);
        const today = new Date();

        // Calcular edad exacta
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        if (age < 18) {
          throw new BadRequestException(
            'Debes ser mayor de 18 años para registrarte en TicoAutos',
          );
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const sexo = info['SEXO'];

    return {
      name:             (info['NOMBRE']    ?? '').trim(),
      firstLastName:    (info['PAPELLIDO'] ?? '').trim(),
      secondLastName:   (info['SAPELLIDO'] ?? '').trim(),
      sexo:             sexo === 1 || sexo === '1' ? 'Masculino' : 'Femenino',
      vencimiento:      (info['FECHACADUC'] ?? '').toString(),
      fechaNacimiento:  rawFecha ? rawFecha.toString() : undefined,
    };
  }
}