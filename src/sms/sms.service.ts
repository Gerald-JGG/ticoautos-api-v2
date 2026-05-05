import { Injectable } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: ReturnType<typeof twilio> | null = null;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber  = process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken) {
      console.warn('⚠️  Twilio credentials not set — SMS will be logged to console only');
      return;
    }
    this.client = twilio(accountSid, authToken);
  }

  async sendTwoFactorCode(phone: string, code: string): Promise<void> {
    // Normalizar número: asegurar formato internacional
    const normalizedPhone = this.normalizePhone(phone);

    if (!this.client) {
      // Modo desarrollo: imprimir en consola
      console.log(`\n📱 [DEV] 2FA code for ${normalizedPhone}: ${code}\n`);
      return;
    }

    await this.client.messages.create({
      body: `Tu código de verificación de TicoAutos es: ${code}. Expira en 10 minutos.`,
      from: this.fromNumber,
      to: normalizedPhone,
    });

    console.log(`✅ 2FA SMS sent to ${normalizedPhone}`);
  }

  /**
   * Normaliza el número al formato E.164 (+506XXXXXXXX para Costa Rica)
   * Si el número ya tiene +, lo deja tal cual.
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // Si ya tiene código de país (más de 8 dígitos) devolvemos con +
    if (digits.length > 8) return `+${digits}`;
    // Asumir Costa Rica (+506)
    return `+506${digits}`;
  }
}