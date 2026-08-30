import React, { useState } from 'react';
import { 
  User as UserIcon, Lock, Mail, ShieldAlert, 
  Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, 
  RefreshCw, Sparkles, Globe, Sun, Moon, ShieldCheck
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

  // Email verification simulation state
  const [pendingVerification, setPendingVerification] = useState<{
    email: string;
    username: string;
    token: string;
  } | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [emailVerifiedSuccess, setEmailVerifiedSuccess] = useState<boolean>(false);

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lockoutMinutes, setLockoutMinutes] = useState<number | null>(null);

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

        if (res.code === 'EMAIL_NOT_VERIFIED' && res.email && res.verificationToken) {
          setPendingVerification({
            email: res.email,
            username: res.username || loginIdentifier.trim(),
            token: res.verificationToken,
          });
          onShowToast(res.error, 'info');
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
        onShowToast(
          language === 'ms' 
            ? 'Alhamdulillah! Pendaftaran berjaya. Selamat datang ke KiraPuasaKu.' 
            : 'Registration successful! Welcome to KiraPuasaKu.', 
          'success'
        );

        if (res.data.user && res.data.token) {
          onLoginSuccess(res.data.user, res.data.token);
          return;
        }

        // Fallback login
        try {
          const loginRes = await authApi.login(cleanUser, regPassword);
          if (loginRes.data?.user && loginRes.data?.token) {
            onLoginSuccess(loginRes.data.user, loginRes.data.token);
            return;
          }
        } catch (loginErr) {
          console.warn('Auto login fallback:', loginErr);
        }

        setActiveTab('login');
        setLoginIdentifier(cleanUser);
        setLoginPassword(regPassword);
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

  // Simulate Email Verification Link Click
  const handleVerifyEmail = async (tokenToVerify?: string) => {
    const token = tokenToVerify || pendingVerification?.token;
    if (!token) return;

    setIsVerifyingEmail(true);
    try {
      const res = await authApi.verifyEmail(token, pendingVerification?.email);
      if (res.data?.success) {
        setPendingVerification(null);
        setEmailVerifiedSuccess(true);
        setActiveTab('login');
        onShowToast(t.emailVerifiedSuccessTitle, 'success');
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Ralat pengesahan emel.', 'error');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Resend Verification Email
  const handleResendVerification = async () => {
    if (!pendingVerification?.email && !loginIdentifier) return;

    setIsResending(true);
    try {
      const res = await authApi.resendVerification(
        pendingVerification?.email,
        pendingVerification?.username || loginIdentifier
      );
      if (res.data?.verificationToken) {
        setPendingVerification((prev) => 
          prev ? { ...prev, token: res.data!.verificationToken! } : null
        );
        onShowToast(res.data.message || t.resendSuccessToast, 'success');
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Gagal menghantar semula emel pengesahan.', 'error');
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
              onClick={() => handleTabSwitch('login')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'login'
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
              onClick={() => handleTabSwitch('register')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'register'
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
                  <p className="leading-relaxed text-emerald-800 dark:text-emerald-300 text-xs">{t.emailVerifiedSuccessMsg}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pending Email Verification Box */}
          {pendingVerification && (
            <div className="mb-5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-stone-50 p-4 border border-amber-200/80 dark:from-stone-900 dark:to-stone-850 dark:border-stone-700 text-stone-900 dark:text-stone-100 animate-in fade-in slide-in-from-top-2 duration-300 shadow-2xs">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-stone-900 dark:bg-stone-800 text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                    {t.emailVerificationTitle}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                    {language === 'ms'
                      ? `Satu emel pengesahan telah dihantar ke ${pendingVerification.email}. Sila klik butang di bawah untuk mengesahkan akaun anda.`
                      : `A verification link was sent to ${pendingVerification.email}. Please verify below to activate your account.`}
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isVerifyingEmail}
                  onClick={() => handleVerifyEmail()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingEmail ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>{t.btnVerifyNowSimulate}</span>
                </button>

                <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                  <span className="truncate max-w-[170px] text-stone-700 dark:text-stone-300 font-mono text-[11px]">
                    ✉️ {pendingVerification.email}
                  </span>
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={handleResendVerification}
                    className="font-bold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer text-xs"
                  >
                    {isResending ? 'Menghantar...' : t.btnResendVerification}
                  </button>
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
                    className="block w-full rounded-2xl border border-stone-200 bg-stone-50/70 pl-10 pr-4 py-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:focus:bg-stone-900 transition"
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
                    className="block w-full rounded-2xl border border-stone-200 bg-stone-50/70 pl-10 pr-11 py-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:focus:bg-stone-900 transition"
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

              {/* Submit Button (Blue Full Color) */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-3"
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

              {/* Quick Admin Demo Autofill Helper */}
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3 dark:border-stone-800 dark:bg-stone-800/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Akaun Pentadbir (Admin):</span>
                    <span className="font-mono bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white">admin</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginIdentifier('admin');
                      setLoginPassword('admin123');
                      setErrorMessage('');
                    }}
                    className="rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 px-2 py-1 text-[10px] font-bold transition cursor-pointer border border-blue-200 dark:border-blue-800/60"
                  >
                    Isi Pentadbir
                  </button>
                </div>
              </div>

              {/* Quick switch to register prompt on mobile */}
              <div className="text-center pt-1">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {language === 'ms' ? 'Belum mempunyai akaun?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('register')}
                    className="font-bold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer"
                  >
                    {language === 'ms' ? 'Daftar akaun baharu' : 'Register new account'}
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
                    className="block w-full rounded-2xl border border-stone-200 bg-stone-50/70 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:focus:bg-stone-900 transition"
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
                    className="block w-full rounded-2xl border border-stone-200 bg-stone-50/70 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:focus:bg-stone-900 transition"
                  />
                </div>
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
                    className="block w-full rounded-2xl border border-stone-200 bg-stone-50/70 pl-10 pr-11 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:focus:bg-stone-900 transition"
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

        </div>

      </div>

    </div>
  );
};
