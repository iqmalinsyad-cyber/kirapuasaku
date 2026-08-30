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
    const { to, subject, html, username, verificationToken } = body as any;

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY tidak dijumpai dalam pembolehubah persekitaran Cloudflare Pages. Sila tetapkan di Settings > Variables and secrets.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Alamat emel penerima (to) diperlukan.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const appUrl = env.APP_URL || new URL(request.url).origin;
    const cleanAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
    const verificationLink = verificationToken 
      ? `${cleanAppUrl}/?verify_token=${verificationToken}&email=${encodeURIComponent(to)}`
      : cleanAppUrl;

    const finalHtml = html || `
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
          Salam Sejahtera, ${username || 'Pengguna'}!
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
    `;

    const fromEmail = env.RESEND_FROM_EMAIL || 'KiraPuasaKu <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to.trim()],
        subject: subject || '🌙 Pengesahan Pendaftaran Akaun KiraPuasaKu',
        html: finalHtml,
      }),
    });

    const resData = (await res.json().catch(() => ({}))) as any;

    if (!res.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: resData.message || `Ralat Resend API (${res.status}): ${res.statusText}`,
          resendDetails: resData
        }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: resData.id,
        message: `Emel berjaya dihantar ke ${to} melalui Resend API!` 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Ralat semasa menghantar emel.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
