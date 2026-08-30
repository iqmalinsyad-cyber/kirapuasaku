# GEMINI_API_KEY: Required for Gemini AI API calls.
# AI Studio automatically injects this at runtime from user secrets.
# Users configure this via the Secrets panel in the AI Studio UI.
GEMINI_API_KEY="MY_GEMINI_API_KEY"

# APP_URL: The URL where this applet is hosted.
# AI Studio automatically injects this at runtime with the Cloud Run service URL.
# Used for self-referential links, OAuth callbacks, and API endpoints.
APP_URL="https://kirapuasaku.pages.dev/"

# ==============================================================================
# SMTP GMAIL CONFIGURATION (Nodemailer Email Verification)
# ==============================================================================
# 1. Pastikan akaun Gmail mempunyai 2-Step Verification diaktifkan.
# 2. Jana 16-digit App Password di: https://myaccount.google.com/apppasswords
# 3. Masukkan SMTP_USER (alamat Gmail) dan SMTP_PASS (App Password 16-digit).
# ==============================================================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="iqmalinsyad@gmail.com"
SMTP_PASS="valphebzzcyagbnu"

