interface Env {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  APP_URL?: string;
  [key: string]: any;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const hasResend = Boolean(env.RESEND_API_KEY);
    const hasSmtp = Boolean(env.SMTP_USER && env.SMTP_PASS);

    const configured = hasResend || hasSmtp;
    let provider = 'none';
    let sender = null;

    if (hasResend) {
      provider = 'resend';
      sender = env.RESEND_FROM_EMAIL || 'Resend API (Cloudflare Pages)';
    } else if (hasSmtp) {
      provider = 'smtp';
      sender = env.SMTP_USER?.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') || 'SMTP Gmail';
    }

    const appUrl = env.APP_URL || new URL(request.url).origin;

    return new Response(
      JSON.stringify({
        configured,
        provider,
        sender,
        host: hasResend ? 'api.resend.com (REST API)' : (env.SMTP_HOST || 'smtp.gmail.com'),
        port: hasResend ? 443 : 465,
        appUrl,
        isCloudflarePages: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ configured: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
