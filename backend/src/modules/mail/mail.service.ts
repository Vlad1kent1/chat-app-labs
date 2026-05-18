import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { VerificationType } from '@prisma/client';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST ?? 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAILTRAP_PORT ?? '2525', 10),
      secure: false,
      auth: {
        user: process.env.MAILTRAP_USER ?? 'b769ae1afea8fc',
        pass: process.env.MAILTRAP_PASS ?? '6618339748c04f',
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }

  async sendVerificationCode(email: string, code: string, type: VerificationType): Promise<void> {
    const subject =
      type === VerificationType.REGISTER
        ? 'Verify your account'
        : 'Password reset code';

    const html = `
      <div style="font-family: system-ui, sans-serif; color: #111; background: #fff; padding: 20px;">
        <h1 style="margin-bottom: 10px; font-size: 20px; color: #000;">${subject}</h1>
        <p style="color: #111; margin-bottom: 10px;">Your ${
          type === VerificationType.REGISTER ? 'verification' : 'password reset'
        } code is:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 0.2em; color: #000;">${code}</p>
        <p style="color: #111; margin-top: 18px;">This code expires in 10 minutes.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: 'noreply@yourapp.com',
        to: email,
        subject,
        html,
      });
    } catch (error) {
      console.error('MailService sendVerificationCode error', error);
      throw new InternalServerErrorException('Unable to send verification email');
    }
  }
}
