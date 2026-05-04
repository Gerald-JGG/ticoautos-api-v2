import { Injectable, InternalServerErrorException } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  SENDGRID_API_KEY not set — emails will not be sent');
      return;
    }
    sgMail.setApiKey(apiKey);
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.warn(
        `[DEV] Verification link for ${to}: ${this.buildVerificationUrl(token)}`,
      );
      return;
    }

    const verificationUrl = this.buildVerificationUrl(token);
    const fromEmail =
      process.env.SENDGRID_FROM_EMAIL || 'noreply@ticonautos.com';

    const msg = {
      to,
      from: {
        email: fromEmail,
        name: 'TicoAutos',
      },
      subject: '¡Verificá tu cuenta en TicoAutos!',
      text: `Hola ${name}, hacé click en este enlace para activar tu cuenta: ${verificationUrl}`,
      html: this.buildEmailHtml(name, verificationUrl),
    };

    try {
      await sgMail.send(msg as any);
      console.log(`✅ Verification email sent to ${to}`);
    } catch (error: any) {
      console.error('SendGrid error:', error?.response?.body || error.message);
      throw new InternalServerErrorException(
        'No se pudo enviar el correo de verificación. Intentá de nuevo.',
      );
    }
  }

  private buildVerificationUrl(token: string): string {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return `${backendUrl}/api/auth/verify-email/${token}`;
  }

  private buildEmailHtml(name: string, verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verificá tu cuenta</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:#111111;padding:32px 40px 0;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="background:#f59e0b;border-radius:8px;width:40px;height:40px;display:inline-block;line-height:40px;text-align:center;">
                  <span style="font-size:20px;">🚗</span>
                </div>
                <span style="font-size:22px;font-weight:800;color:#f0f0f0;letter-spacing:-0.03em;">
                  Tico<span style="color:#f59e0b;">Autos</span>
                </span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="color:#f0f0f0;font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">
                ¡Bienvenido/a, ${name}! 👋
              </h1>
              <p style="color:#a0a0a0;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Ya casi estás listo/a. Solo necesitamos verificar tu correo electrónico para activar tu cuenta en TicoAutos.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <a href="${verificationUrl}"
                       style="display:inline-block;background:#f59e0b;color:#000000;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:-0.01em;">
                      ✓ Activar mi cuenta
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#666666;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:
              </p>
              <p style="margin:0;">
                <a href="${verificationUrl}" style="color:#f59e0b;font-size:13px;word-break:break-all;">
                  ${verificationUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding:0 40px 12px;">
              <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px;">
                <p style="color:#666666;font-size:12px;margin:0;line-height:1.6;">
                  ⏰ Este enlace expira en <strong style="color:#a0a0a0;">24 horas</strong>.<br/>
                  Si no creaste esta cuenta, podés ignorar este correo.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;border-top:1px solid #1a1a1a;margin-top:12px;">
              <p style="color:#444444;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} TicoAutos · Costa Rica<br/>
                Este correo fue enviado porque alguien se registró con esta dirección.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
