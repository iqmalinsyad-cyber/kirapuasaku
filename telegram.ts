export interface TelegramConfig {
  botToken?: string;
  adminChatId?: string;
  enabled?: boolean;
}

/**
 * Check if Telegram Bot is configured
 */
export function isTelegramConfigured(config?: TelegramConfig): boolean {
  const token = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = config?.adminChatId || process.env.TELEGRAM_ADMIN_CHAT_ID;
  const enabled = config?.enabled !== undefined ? config.enabled : true;
  return Boolean(enabled && token && chatId && token.trim() && chatId.trim());
}

/**
 * Send a notification message via Telegram Bot API
 */
export async function sendTelegramMessage(
  message: string,
  config?: TelegramConfig
): Promise<{ success: boolean; error?: string; messageId?: number }> {
  const token = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = config?.adminChatId || process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    return {
      success: false,
      error: 'Token Bot Telegram atau Chat ID Pentadbir belum dikonfigurasi.',
    };
  }

  try {
    const cleanToken = token.trim();
    const cleanChatId = chatId.trim();
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      const errorMsg = data.description || 'Ralat tidak diketahui dari Telegram Bot API';
      console.warn('[Telegram Bot API Error]:', errorMsg);
      return { success: false, error: errorMsg };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    console.error('[Telegram Dispatch Error]:', err);
    return { success: false, error: err.message || 'Gagal menghubungi Telegram Server' };
  }
}

/**
 * Send new user registration notification to Admin's Telegram
 */
export async function sendNewUserRegistrationAlert(
  user: {
    name: string;
    username: string;
    email: string;
    role?: string;
    status?: string;
    created_at?: string;
  },
  config?: TelegramConfig
): Promise<{ success: boolean; error?: string }> {
  if (!isTelegramConfigured(config)) {
    return { success: false, error: 'Telegram bot tidak aktif atau belum diset.' };
  }

  const dateStr = new Date().toLocaleString('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const message = `
🌙 <b>KiraPuasaKu: Pendaftaran Pengguna Baharu</b> 🔔

👤 <b>Nama:</b> ${escapeHtml(user.name || user.username)}
🆔 <b>Username:</b> @${escapeHtml(user.username)}
📧 <b>Emel:</b> ${escapeHtml(user.email)}
📅 <b>Masa Daftar:</b> ${dateStr}
📌 <b>Status:</b> <i>Menunggu Pengesahan / Semakan Admin</i>

───────────────
💡 <b>Tindakan Pentadbir:</b>
Sila buka Panel Pengurusan Pengguna (Admin) di aplikasi KiraPuasaKu untuk menyemak dan mengesahkan akaun ini.
`.trim();

  return sendTelegramMessage(message, config);
}

/**
 * Test Telegram Bot connection
 */
export async function testTelegramBot(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; botName?: string; error?: string }> {
  try {
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();

    // 1. Verify Bot Token validity with getMe
    const getMeRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await getMeRes.json();

    if (!meData.ok) {
      return {
        success: false,
        error: `Bot Token tidak sah: ${meData.description || 'Sila semak token dari @BotFather'}`,
      };
    }

    const botName = meData.result?.first_name || meData.result?.username || 'Bot';

    // 2. Send a test message to the specified Chat ID
    const testMsg = `
✅ <b>Ujian Sambungan Bot Telegram Berjaya!</b>

Aplikasi <b>KiraPuasaKu</b> kini berjaya disambungkan ke bot <b>@${meData.result?.username || botName}</b>.
Notifikasi pendaftaran pengguna baharu akan dihantar ke ruang sembang ini secara automatik.

📅 <i>${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</i>
`.trim();

    const sendRes = await sendTelegramMessage(testMsg, {
      botToken: cleanToken,
      adminChatId: cleanChatId,
      enabled: true,
    });

    if (!sendRes.success) {
      return {
        success: false,
        botName,
        error: `Token sah (@${meData.result?.username}), tetapi gagal menghantar mesej ke Chat ID: ${sendRes.error}. (Pastikan anda telah menekan /start pada bot anda terlebih dahulu!)`,
      };
    }

    return { success: true, botName };
  } catch (e: any) {
    return { success: false, error: e.message || 'Ralat sambungan ke Telegram API' };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
