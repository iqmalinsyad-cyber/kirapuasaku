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
    const { testEmail } = body as any;

    if (!testEmail) {
      return new Response(
        JSON.stringify({ error: 'Sila masukkan alamat emel penerima untuk ujian.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const recipient = String(testEmail).trim();
    const apiKey = env.RESEND_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'RESEND_API_KEY belum dikonfigurasi di Cloudflare Pages (Settings > Variables and secrets).',
          configured: false,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const appUrl = env.APP_URL || new URL(request.url).origin;
    const cleanAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
    const testToken = 'test_' + Date.now();
    const verificationLink = `${cleanAppUrl}/?verify_token=${testToken}&email=${encodeURIComponent(recipient)}`;
    const fromEmail = env.RESEND_FROM_EMAIL || 'KiraPuasaKu <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient],
        subject: '🌙 Ujian Emel Pengesahan KiraPuasaKu (Cloudflare + Resend)',
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

            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
              <p style="font-size: 14px; font-weight: 700; color: #065f46; margin: 0 0 4px 0;">
                🎉 Sambungan Resend API Berjaya!
              </p>
              <p style="font-size: 12px; color: #047857; margin: 0;">
                Emel ujian ini dihantar terus melalui Cloudflare Pages Functions menggunakan Resend REST API.
              </p>
            </div>

            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
              Ini adalah contoh template emel pengesahan yang akan diterima oleh pengguna baru selepas mendaftar akaun di KiraPuasaKu.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #047857; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(4, 120, 87, 0.25);">
                Sahkan Akaun Saya (Contoh)
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0 16px 0;" />

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
              &copy; ${new Date().getFullYear()} KiraPuasaKu. Hak Cipta Terpelihara.
            </p>
          </div>
        `,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as any;

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: data.message || `Ralat Resend API (${res.status}): ${res.statusText}`,
          configured: true,
          details: data,
        }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emel ujian Resend API telah berjaya dihantar ke ${recipient}!`,
        messageId: data.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Ralat semasa menghantar emel ujian.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
