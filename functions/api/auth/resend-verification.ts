interface Env {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  APP_URL?: string;
  [key: string]: any;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => ({}));
    const { email, username, verificationToken: inputToken } = body as any;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Sila berikan alamat emel.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const displayName = username || cleanEmail;
    const verificationToken = inputToken || ('ver_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10));

    const appUrl = env.APP_URL || new URL(request.url).origin;
    const cleanAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
    const verificationLink = `${cleanAppUrl}/?verify_token=${verificationToken}&email=${encodeURIComponent(cleanEmail)}`;

    let emailSent = false;
    let emailError: string | null = null;

    if (env.RESEND_API_KEY) {
      try {
        const fromEmail = env.RESEND_FROM_EMAIL || 'KiraPuasaKu <onboarding@resend.dev>';
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [cleanEmail],
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
                  Salam Sejahtera, ${displayName}!
                </p>

                <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
                  Berikut adalah pautan pengesahan emel anda untuk akaun <strong>KiraPuasaKu</strong>. Sila tekan butang pengesahan di bawah:
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
                  Jika anda tidak pernah membuat permintaan ini, sila abaikan emel ini.<br/>
                  &copy; ${new Date().getFullYear()} KiraPuasaKu. Hak Cipta Terpelihara.
                </p>
              </div>
            `,
          }),
        });

        const emailData = (await emailRes.json().catch(() => ({}))) as any;
        if (emailRes.ok) {
          emailSent = true;
        } else {
          emailError = emailData.message || `Ralat Resend (${emailRes.status})`;
        }
      } catch (err: any) {
        emailError = err.message || 'Gagal menghantar melalui Resend API.';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent
          ? `Pautan pengesahan baharu telah dihantar ke alamat emel ${cleanEmail}.`
          : (emailError ? `Gagal menghantar emel: ${emailError}` : `Pautan pengesahan telah dijana.`),
        email: cleanEmail,
        username: displayName,
        verificationToken,
        emailSent,
        emailError,
        smtpConfigured: Boolean(env.RESEND_API_KEY),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Ralat semasa menghantar pautan.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
