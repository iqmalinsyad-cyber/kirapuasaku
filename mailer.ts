import nodemailer from 'nodemailer';

export interface SMTPOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromName?: string;
}

/**
 * Gets configured transporter or creates one from env/parameters
 */
export function getMailTransporter(options?: SMTPOptions) {
  const host = options?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = options?.port || Number(process.env.SMTP_PORT) || 465;
  const secure = options?.secure !== undefined ? options.secure : (process.env.SMTP_SECURE === 'true' || port === 465);
  const user = options?.user || process.env.SMTP_USER;
  const pass = options?.pass || process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ''), // strip spaces from Google 16-digit App Password
    },
  });
}

/**
 * Check if SMTP is configured
 */
export function isSMTPConfigured(options?: SMTPOptions): boolean {
  const user = options?.user || process.env.SMTP_USER;
  const pass = options?.pass || process.env.SMTP_PASS;
  return Boolean(user && pass);
}

/**
 * Sends Email Verification using Nodemailer
 */
export async function sendVerificationEmail(
  toEmail: string,
  username: string,
  verificationToken: string,
  options?: SMTPOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getMailTransporter(options);
    if (!transporter) {
      return {
        success: false,
        error: 'SMTP_USER atau SMTP_PASS belum dikonfigurasi dalam persekitaran pelayan (.env).',
      };
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const cleanAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
    const verificationLink = `${cleanAppUrl}/?verify_token=${verificationToken}&email=${encodeURIComponent(toEmail)}`;

    const fromSender = options?.user || process.env.SMTP_USER;
    const fromName = options?.fromName || 'KiraPuasaKu';

    const mailOptions = {
      from: `"${fromName}" <${fromSender}>`,
      to: toEmail,
      subject: '🌙 Pengesahan Pendaftaran Akaun KiraPuasaKu',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h1 style="color: #047857; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
              Kira<span style="color: #d97706;">Puasa</span>Ku
            </h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 6px; font-weight: 500;">
              Sistem Pengurusan & Pengiraan Qada Puasa
            </p>
          </div>

          <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px;">
            Salam Sejahtera, ${username}!
          </p>

          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
            Terima kasih kerana mendaftar akaun di <strong>KiraPuasaKu</strong>. Untuk memastikan keselamatan akaun dan mengaktifkan akses anda, sila tekan butang pengesahan di bawah:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationLink}" 
               style="background-color: #047857; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(4, 120, 87, 0.25);">
              Sahkan Akaun Saya
            </a>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-top: 24px;">
            <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0; font-weight: 600;">
              Pautan Alternatif:
            </p>
            <p style="font-size: 12px; color: #047857; word-break: break-all; margin: 0;">
              <a href="${verificationLink}" style="color: #047857; text-decoration: underline;">${verificationLink}</a>
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0 16px 0;" />

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.4;">
            Jika anda tidak pernah membuat pendaftaran ini, sila abaikan emel ini.<br/>
            &copy; ${new Date().getFullYear()} KiraPuasaKu. Hak Cipta Terpelihara.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('Nodemailer Send Error:', err);
    return { success: false, error: err.message || 'Gagal menghantar emel melalui SMTP.' };
  }
}

/**
 * Test SMTP connection
 */
export async function testSMTPConnection(options?: SMTPOptions): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = getMailTransporter(options);
    if (!transporter) {
      return {
        success: false,
        message: 'Maklumat SMTP_USER dan SMTP_PASS tidak lengkap.',
      };
    }

    await transporter.verify();
    return {
      success: true,
      message: 'Sambungan SMTP Gmail berjaya disahkan!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal menyambung ke pelayan SMTP Gmail. Pastikan App Password 16-digit betul.',
    };
  }
}
