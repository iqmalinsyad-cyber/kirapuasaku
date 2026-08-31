import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Lock, Mail, ShieldAlert, 
  Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, 
  RefreshCw, Sparkles, Globe, Sun, Moon, ShieldCheck,
  Send, Inbox, ExternalLink, Info, MessageCircle, HelpCircle
} from 'lucide-react';
import { Language, ThemeMode, User } from '../types';
import { getTranslation } from '../translations';
import { authApi } from '../utils/api';
import { MUSLIM_AVATARS, MuslimAvatar } from '../utils/avatars';

interface AuthViewProps {
  language: Language;
  theme: ThemeMode;
  onSetLanguage?: (lang: Language) => void;
  onSetTheme?: (theme: ThemeMode) => void;
  onLoginSuccess: (user: User, token: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  language,
  theme,
  onSetLanguage,
  onSetTheme,
  onLoginSuccess,
  onShowToast,
}) => {
  const t = getTranslation(language);

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login form fields (allows username OR email)
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  
  // Register form fields: username, email, password
  const [regUsername, setRegUsername] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regFullName, setRegFullName] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(MUSLIM_AVATARS[0].dataUrl);

  // Email verification state (Formal flow - strictly via email link)
  const [verificationNotice, setVerificationNotice] = useState<{
    email: string;
    username: string;
    name?: string;
  } | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [emailVerifiedSuccess, setEmailVerifiedSuccess] = useState<boolean>(false);

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lockoutMinutes, setLockoutMinutes] = useState<number | null>(null);

  // 1. Automatic Verification via Email Link Query Parameter (?verify_token=...&email=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const verifyToken = params.get('verify_token');
      const emailParam = params.get('email');

      if (verifyToken) {
        setIsVerifyingEmail(true);
        setErrorMessage('');
        authApi.verifyEmail(verifyToken, emailParam || undefined).then((res) => {
          if (res.data?.success) {
            setEmailVerifiedSuccess(true);
            setVerificationNotice(null);
            setActiveTab('login');
            if (emailParam) {
              setLoginIdentifier(emailParam);
            }
            onShowToast(
              language === 'ms' 
                ? 'Alhamdulillah, pengesahan emel anda telah berjaya! Sila log masuk ke akaun anda.' 
                : 'Alhamdulillah, email verification successful! Please sign in to your account.',
              'success'
            );
          } else if (res.error) {
            setErrorMessage(res.error);
            onShowToast(res.error, 'error');
          }
        }).catch(() => {
          setErrorMessage(
            language === 'ms' 
              ? 'Pautan pengesahan emel tidak sah atau telah tamat tempoh.' 
              : 'Email verification link is invalid or expired.'
          );
        }).finally(() => {
          setIsVerifyingEmail(false);
          // Clean the query parameters from the browser address bar cleanly
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      }
    } catch (err) {
      console.warn('URL token check notice:', err);
    }
  }, [language, onShowToast]);

  // Switch tabs
  const handleTabSwitch = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setErrorMessage('');
    setEmailVerifiedSuccess(false);
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setEmailVerifiedSuccess(false);

    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMessage(
        language === 'ms' 
          ? 'Sila lengkapkan nama pengguna/emel dan kata laluan.' 
          : 'Please enter username/email and password.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.login(loginIdentifier.trim(), loginPassword);

      if (res.error) {
        if (res.locked && res.remainingMinutes) {
          setLockoutMinutes(res.remainingMinutes);
        }

        if (res.code === 'EMAIL_NOT_VERIFIED' || res.error.toLowerCase().includes('belum disahkan')) {
          setVerificationNotice({
            email: res.email || loginIdentifier.trim(),
            username: res.username || loginIdentifier.trim(),
          });
          setErrorMessage(
            language === 'ms'
              ? `Akaun anda (${res.email || loginIdentifier}) belum disahkan. Sila semak peti masuk emel anda dan klik pautan pengesahan rasmi.`
              : `Your account (${res.email || loginIdentifier}) is not verified yet. Please check your email inbox and click the verification link.`
          );
          onShowToast(
            language === 'ms' 
              ? 'Sila sahkan emel anda melalui pautan yang dihantar.' 
              : 'Please verify your email via the link sent.', 
            'info'
          );
        } else {
          setErrorMessage(res.error);
          onShowToast(res.error, 'error');
        }
      } else if (res.data?.user && res.data?.token) {
        onShowToast(
          language === 'ms' 
            ? `Selamat kembali, ${res.data.user.name}!` 
            : `Welcome back, ${res.data.user.name}!`, 
          'success'
        );
        onLoginSuccess(res.data.user, res.data.token);
      }
    } catch (err: any) {
      setErrorMessage(
        language === 'ms' 
          ? 'Ralat rangkaian, sila cuba sebentar lagi.' 
          : 'Network error, please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setEmailVerifiedSuccess(false);

    const cleanUser = regUsername.trim().toLowerCase();
    const cleanMail = regEmail.trim().toLowerCase();

    if (!cleanUser || cleanUser.length < 3) {
      setErrorMessage(
        language === 'ms' 
          ? 'Username mestilah sekurang-kurangnya 3 aksara.' 
          : 'Username must be at least 3 characters.'
      );
      return;
    }

    if (!cleanMail || !cleanMail.includes('@') || !cleanMail.includes('.')) {
      setErrorMessage(
        language === 'ms' 
          ? 'Sila masukkan alamat emel yang sah.' 
          : 'Please enter a valid email address.'
      );
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage(
        language === 'ms' 
          ? 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' 
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.register(
        cleanUser,
        cleanMail,
        regPassword,
        selectedAvatar,
        regFullName.trim() || cleanUser
      );

      if (res.error) {
        setErrorMessage(res.error);
        onShowToast(res.error, 'error');
      } else if (res.data) {
        // Set formal verification notice screen
        setVerificationNotice({
          email: cleanMail,
          username: cleanUser,
          name: regFullName.trim() || cleanUser,
        });

        // Reset form fields
        setRegPassword('');
        setRegFullName('');

        onShowToast(
          language === 'ms' 
            ? 'Pendaftaran akaun berjaya! Sila semak emel anda untuk pautan pengesahan.' 
            : 'Registration successful! Please check your email for the verification link.', 
          'success'
        );
      }
    } catch (err: any) {
      setErrorMessage(
        language === 'ms' 
          ? 'Ralat pendaftaran, sila cuba lagi.' 
          : 'Registration error, please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Verification Email
  const handleResendVerification = async () => {
    const targetEmail = verificationNotice?.email || loginIdentifier;
    const targetUser = verificationNotice?.username || loginIdentifier;
    if (!targetEmail) return;

    setIsResending(true);
    try {
      const res = await authApi.resendVerification(targetEmail, targetUser);
      if (res.data?.success || !res.error) {
        onShowToast(
          language === 'ms'
            ? `Pautan pengesahan baharu telah berjaya dihantar ke ${targetEmail}. Sila semak peti masuk anda.`
            : `A fresh verification link has been sent to ${targetEmail}. Please check your inbox.`,
          'success'
        );
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast(
        language === 'ms' 
          ? 'Gagal menghantar semula emel pengesahan. Sila cuba sebentar lagi.' 
          : 'Failed to resend verification email. Please try again later.',
        'error'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-1 py-4 sm:py-8 transition-all duration-300">
      
      {/* Modern Centered Brand Header */}
      <div className="flex flex-col items-center justify-center text-center mb-6">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-500/20 via-amber-400/20 to-blue-600/20 blur-md opacity-70 group-hover:opacity-100 transition duration-500"></div>
          <img
            src="https://lh3.googleusercontent.com/d/1OcU-TrY5DyVXutbYbqzwiZzX7Za2artn"
            alt="KiraPuasaKu Logo"
            className="relative h-24 w-24 sm:h-28 sm:w-28 object-contain transition-transform duration-300 hover:scale-105 select-none drop-shadow-md"
            referrerPolicy="no-referrer"
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-logo mt-3 select-none">
          <span className="brand-title-kira">Kira</span>
          <span className="brand-title-puasa">Puasa</span>
          <span className="brand-title-ku">Ku</span>
        </h1>
      </div>

      {/* Main Authentication Card */}
      <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white/95 backdrop-blur-md shadow-xl shadow-stone-200/50 dark:border-stone-800/90 dark:bg-stone-900/95 dark:shadow-black/40 transition-colors">
        
        {/* Modern Segmented Tab Switcher - Blue for Login, Green for Register */}
        <div className="p-2 sm:p-2.5 bg-stone-100/70 dark:bg-stone-950/60 border-b border-stone-200/70 dark:border-stone-800/80">
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-200/60 dark:bg-stone-900/90 rounded-2xl">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                handleTabSwitch('login');
                setVerificationNotice(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'login' && !verificationNotice
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.01]'
                  : 'text-stone-600 hover:text-blue-600 dark:text-stone-400 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>{t.tabLogin}</span>
            </button>

            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                handleTabSwitch('register');
                setVerificationNotice(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'register' || verificationNotice
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.01]'
                  : 'text-stone-600 hover:text-emerald-600 dark:text-stone-400 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t.tabRegister}</span>
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          
          {/* Email Verified Success Banner */}
          {emailVerifiedSuccess && (
            <div className="mb-5 rounded-2xl bg-emerald-50/90 p-4 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-sm mb-0.5 text-emerald-900 dark:text-emerald-100">{t.emailVerifiedSuccessTitle}</p>
                  <p className="leading-relaxed text-emerald-800 dark:text-emerald-300 text-xs">
                    {language === 'ms' 
                      ? 'Alamat emel anda telah disahkan sepenuhnya. Sila masukkan kata laluan untuk log masuk.' 
                      : t.emailVerifiedSuccessMsg}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rate Limit Lockout Banner */}
          {lockoutMinutes !== null && (
            <div className="mb-5 rounded-2xl bg-rose-50/90 p-4 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200 animate-in fade-in">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-sm mb-0.5">{t.lockoutWarning}</p>
                  <p className="leading-relaxed text-xs">{t.lockoutRemaining.replace('{minutes}', lockoutMinutes.toString())}</p>
                </div>
              </div>
            </div>
          )}

          {/* Generic Error Alert */}
          {errorMessage && !lockoutMinutes && (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Loading Verification State */}
          {isVerifyingEmail && (
            <div className="mb-5 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mb-2" />
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                {language === 'ms' ? 'Mengesahkan pautan emel anda...' : 'Verifying email link...'}
              </p>
            </div>
          )}

          {/* FORMAL NOTICE SCREEN: PENGESAHAN EMEL DIPERLUKAN */}
          {verificationNotice ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="rounded-2xl bg-gradient-to-b from-emerald-50/90 to-stone-50 p-5 border border-emerald-200/80 dark:from-stone-900 dark:to-stone-850 dark:border-emerald-900/60 text-stone-900 dark:text-stone-100 shadow-sm">
                
                {/* Formal Header */}
                <div className="flex items-center gap-3 mb-3.5 pb-3 border-b border-emerald-100 dark:border-stone-800">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-emerald-900 dark:text-emerald-200">
                      {language === 'ms' ? 'Pengesahan Alamat Emel Rasmi' : 'Official Email Verification'}
                    </h3>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      {language === 'ms' ? 'Pendaftaran Akaun Berjaya' : 'Account Registered Successfully'}
                    </p>
                  </div>
                </div>

                {/* Formal Message Body */}
                <div className="space-y-3 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                  <p>
                    {language === 'ms' ? (
                      <>
                        Salam sejahtera, akaun bagi pengguna <strong className="text-stone-900 dark:text-white">@{verificationNotice.username}</strong> telah berjaya didaftarkan.
                      </>
                    ) : (
                      <>
                        Welcome, account for user <strong className="text-stone-900 dark:text-white">@{verificationNotice.username}</strong> has been registered.
                      </>
                    )}
                  </p>

                  <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-emerald-200 dark:border-stone-700 flex items-center gap-2.5 shadow-2xs">
                    <Inbox className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                        {language === 'ms' ? 'Pautan pengesahan telah dihantar ke:' : 'Verification link sent to:'}
                      </p>
                      <p className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300 truncate">
                        {verificationNotice.email}
                      </p>
                    </div>
                  </div>

                  <p className="text-stone-600 dark:text-stone-300">
                    {language === 'ms' ? (
                      <>
                        Demi keselamatan akaun, sila buka peti masuk emel anda dan tekan butang <strong className="text-emerald-700 dark:text-emerald-400">"Sahkan Akaun Saya"</strong> di dalam emel tersebut untuk mengaktifkan akaun sebelum log masuk.
                      </>
                    ) : (
                      <>
                        For security purposes, please open your email inbox and click <strong className="text-emerald-700 dark:text-emerald-400">"Verify My Account"</strong> in the email to activate your access before signing in.
                      </>
                    )}
                  </p>

                  <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/70 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      {language === 'ms' 
                        ? 'Sekiranya emel tidak kelihatan di peti masuk utama (Inbox), sila periksa folder Spam atau Junk Mail anda.' 
                        : 'If you do not see the email in your main inbox, please check your Spam or Junk folder.'}
                    </span>
                  </div>

                  {/* Hubungi Admin Card if email is not received */}
                  <div className="p-3 bg-stone-100/90 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 text-xs space-y-2.5">
                    <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold text-[11px] sm:text-xs">
                      <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{language === 'ms' ? 'Masih belum terima emel pengesahan?' : 'Still haven’t received the email?'}</span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                      {language === 'ms'
                        ? 'Sila hubungi Admin untuk bantuan pengaktifan segera atau pengesahan akaun manual:'
                        : 'Please contact the Admin for instant account activation or manual verification assistance:'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <a
                        href={`https://wa.me/601159820737?text=${encodeURIComponent(`Salam Admin KiraPuasaKu, saya baru mendaftar akaun (${verificationNotice.username} / ${verificationNotice.email}) tetapi belum menerima emel pengesahan. Mohon bantuan pengaktifan akaun.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>WhatsApp Admin</span>
                      </a>
                      <a
                        href={`mailto:iqmalinsyad@gmail.com?subject=${encodeURIComponent(`Bantuan Pengesahan Akaun KiraPuasaKu - ${verificationNotice.username}`)}&body=${encodeURIComponent(`Salam Admin,\n\nSaya telah mendaftar akaun:\nUsername: ${verificationNotice.username}\nEmel: ${verificationNotice.email}\n\nMohon semakan dan pengesahan akaun. Terima kasih.`)}`}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition shadow-xs"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Emel Admin</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-emerald-100 dark:border-stone-800 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={handleResendVerification}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {isResending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>{isResending ? (language === 'ms' ? 'Menghantar Emel...' : 'Sending...') : (language === 'ms' ? 'Hantar Semula Pautan Pengesahan' : 'Resend Verification Link')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVerificationNotice(null);
                      setActiveTab('login');
                      setLoginIdentifier(verificationNotice.email);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 hover:underline cursor-pointer"
                  >
                    <span>{language === 'ms' ? 'Kembali ke Paparan Log Masuk' : 'Back to Sign In'}</span>
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <>
              {/* FORM 1: LOG MASUK (Warna Biru Moden) */}
              {activeTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Username or Email Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      {language === 'ms' ? 'Username atau Emel' : 'Username or Email'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <input
                        id="login-username-input"
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder={language === 'ms' ? 'Masukkan username atau emel' : 'Enter username or email'}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-4 py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                        {t.labelPassword} <span className="text-rose-500">*</span>
                      </label>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="login-password-input"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder={t.placeholderPassword}
                        autoComplete="current-password"
                        className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-11 py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
                        aria-label={showLoginPassword ? 'Sembunyi kata laluan' : 'Papar kata laluan'}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Login Button (Blue Full Color) */}
                  <button
                    id="login-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {t.btnLoggingIn}
                      </span>
                    ) : (
                      <>
                        <span>{t.btnLogin}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* Quick switch to register prompt on mobile */}
                  <div className="text-center pt-2">
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {language === 'ms' ? 'Belum mempunyai akaun?' : "Don't have an account?"}{' '}
                      <button
                        type="button"
                        onClick={() => handleTabSwitch('register')}
                        className="font-bold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer"
                      >
                        {language === 'ms' ? 'Daftar akaun baharu' : 'Sign up here'}
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* FORM 2: DAFTAR AKAUN BAHARU (Warna Hijau Moden) */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  
                  {/* 1. Username */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      1. {t.labelUsername} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <input
                        id="register-username-input"
                        type="text"
                        required
                        minLength={3}
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder={t.placeholderUsername}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                      />
                    </div>
                  </div>

                  {/* 2. Email Address */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      2. {t.labelEmail} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="register-email-input"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder={t.placeholderEmail}
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        inputMode="email"
                        className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {language === 'ms' ? 'Pautan pengesahan rasmi akan dihantar ke emel ini.' : 'Official verification link will be sent to this email.'}
                    </p>
                  </div>

                  {/* 3. Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      3. {t.labelPassword} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="register-password-input"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder={t.placeholderPassword}
                        autoComplete="new-password"
                        className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-11 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
                        aria-label={showRegPassword ? 'Sembunyi kata laluan' : 'Papar kata laluan'}
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Choose Cute Muslim Avatar */}
                  <div className="pt-1.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                        {t.labelProfilePicture}
                      </label>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {language === 'ms' ? 'Pilih satu avatar' : 'Pick an avatar'}
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-2 sm:gap-2.5 p-2 bg-stone-50/80 dark:bg-stone-800/40 rounded-2xl border border-stone-200/70 dark:border-stone-800">
                      {MUSLIM_AVATARS.map((av: MuslimAvatar) => {
                        const isSelected = selectedAvatar === av.dataUrl;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedAvatar(av.dataUrl)}
                            className={`group relative flex items-center justify-center rounded-xl p-1 transition-all cursor-pointer border ${
                              isSelected
                                ? 'border-emerald-600 bg-white shadow-xs dark:bg-stone-800 dark:border-emerald-500 ring-2 ring-emerald-500/40 scale-105'
                                : 'border-transparent bg-transparent hover:bg-stone-200/50 dark:hover:bg-stone-700/40 opacity-75 hover:opacity-100'
                            }`}
                            title={av.name}
                          >
                            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-lg overflow-hidden shadow-2xs">
                              <img src={av.dataUrl} alt={av.name} className="h-full w-full object-cover" />
                            </div>
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-bold shadow-2xs">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Register Button (Emerald Green Full Color) */}
                  <button
                    id="register-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-3"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {t.btnRegistering}
                      </span>
                    ) : (
                      <>
                        <span>{t.btnRegister}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* Quick switch to login prompt on mobile */}
                  <div className="text-center pt-1.5">
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {language === 'ms' ? 'Sudah mempunyai akaun?' : 'Already have an account?'}{' '}
                      <button
                        type="button"
                        onClick={() => handleTabSwitch('login')}
                        className="font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                      >
                        {language === 'ms' ? 'Log masuk di sini' : 'Log in here'}
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </>
          )}

        </div>

      </div>

    </div>
  );
};
