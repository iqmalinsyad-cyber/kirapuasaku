import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Lock, Mail, ShieldAlert, 
  Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, 
  RefreshCw, Sparkles, KeyRound, Send
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
  onLoginSuccess,
  onShowToast,
}) => {
  const t = getTranslation(language);

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'verifyCode' | 'accessCode'>('login');
  
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

  // Akses dengan Kod fields
  const [accessCodeInput, setAccessCodeInput] = useState<string>('');
  const [isAccessCodeVerified, setIsAccessCodeVerified] = useState<boolean>(false);
  const [verifiedCodeData, setVerifiedCodeData] = useState<{ code: string; notes?: string } | null>(null);
  const [accUsername, setAccUsername] = useState<string>('');
  const [accEmail, setAccEmail] = useState<string>('');
  const [accPassword, setAccPassword] = useState<string>('');
  const [showAccPassword, setShowAccPassword] = useState<boolean>(false);

  // Special Code Verification fields (Pendaftaran Akaun Baharu step 2)
  const [codeIdentifier, setCodeIdentifier] = useState<string>('');
  const [verificationCodeInput, setVerificationCodeInput] = useState<string>('');
  const [registeredUserInfo, setRegisteredUserInfo] = useState<{
    username: string;
    email: string;
    registration_code?: string;
  } | null>(null);

  const [isVerifyingEmail, setIsVerifyingEmail] = useState<boolean>(false);
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
            setActiveTab('login');
            if (emailParam) {
              setLoginIdentifier(emailParam);
            }
            onShowToast(
              language === 'ms' 
                ? 'Alhamdulillah, akaun anda telah disahkan! Sila log masuk.' 
                : 'Alhamdulillah, account verified! Please sign in.',
              'success'
            );
          } else if (res.error) {
            setErrorMessage(res.error);
            onShowToast(res.error, 'error');
          }
        }).catch(() => {
          setErrorMessage(
            language === 'ms' 
              ? 'Pautan pengesahan tidak sah atau telah tamat tempoh.' 
              : 'Verification link is invalid or expired.'
          );
        }).finally(() => {
          setIsVerifyingEmail(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      }
    } catch (err) {
      console.warn('URL token check notice:', err);
    }
  }, [language, onShowToast]);

  // Switch tabs
  const handleTabSwitch = (tab: 'login' | 'register' | 'verifyCode' | 'accessCode') => {
    setActiveTab(tab);
    setErrorMessage('');
    setEmailVerifiedSuccess(false);
  };

  // Handle Verify Access Code (Step 1 of Akses dengan Kod)
  const handleVerifyAccessCodeStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanCode = accessCodeInput.trim().toUpperCase().replace(/\s+/g, '');

    if (!cleanCode) {
      setErrorMessage(
        language === 'ms'
          ? 'Sila masukkan Kod Akses yang sah.'
          : 'Please enter a valid Access Code.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.verifyAccessCode(cleanCode);
      if (res.error) {
        setErrorMessage(res.error);
        onShowToast(res.error, 'error');
      } else if (res.data?.valid) {
        setIsAccessCodeVerified(true);
        setVerifiedCodeData({
          code: cleanCode,
        });
        onShowToast(
          language === 'ms'
            ? 'Kod akses sah! Sila lengkapkan maklumat akaun anda.'
            : 'Access code verified! Please complete your account details.',
          'success'
        );
      }
    } catch (err: any) {
      const errText = language === 'ms'
        ? 'Kod akses tidak sah atau telah digunakan.'
        : 'Access code is invalid or already used.';
      setErrorMessage(errText);
      onShowToast(errText, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register with Access Code (Step 2 of Akses dengan Kod)
  const handleRegisterWithAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanUser = accUsername.trim().toLowerCase();
    const cleanMail = accEmail.trim().toLowerCase();
    const cleanCode = accessCodeInput.trim().toUpperCase().replace(/\s+/g, '');

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

    if (accPassword.length < 6) {
      setErrorMessage(
        language === 'ms' 
          ? 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' 
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.registerWithCode({
        code: cleanCode,
        name: cleanUser,
        username: cleanUser,
        email: cleanMail,
        password: accPassword,
        avatar: selectedAvatar,
      });

      if (res.error) {
        setErrorMessage(res.error);
        onShowToast(res.error, 'error');
      } else {
        onShowToast(
          language === 'ms'
            ? 'Pendaftaran berjaya! Akaun anda telah aktif. Sila log masuk.'
            : 'Registration successful! Your account is active. Please sign in.',
          'success'
        );
        setEmailVerifiedSuccess(true);
        setLoginIdentifier(cleanUser);
        setIsAccessCodeVerified(false);
        setAccessCodeInput('');
        setAccUsername('');
        setAccEmail('');
        setAccPassword('');
        setActiveTab('login');
      }
    } catch (err: any) {
      setErrorMessage(
        language === 'ms'
          ? 'Ralat pendaftaran dengan kod akses, sila cuba lagi.'
          : 'Registration error with access code, please try again.'
      );
    } finally {
      setIsLoading(false);
    }
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
        
        // If requires code verification, switch to code tab
        if (res.code === 'EMAIL_NOT_VERIFIED' || res.code === 'ACCOUNT_PENDING_VERIFICATION') {
          setCodeIdentifier(res.username || loginIdentifier.trim());
          setActiveTab('verifyCode');
          setErrorMessage(
            language === 'ms'
              ? 'Akaun anda belum diaktifkan. Sila masukkan Kod Khas Pengesahan yang diberikan oleh Admin.'
              : 'Your account is pending activation. Please enter the Special Code from Admin.'
          );
          onShowToast(
            language === 'ms'
              ? 'Sila masukkan Kod Khas Admin untuk mengaktifkan akaun.'
              : 'Please enter Admin Special Code to activate account.',
            'info'
          );
          return;
        }

        setErrorMessage(res.error);
        onShowToast(res.error, 'error');
      } else if (res.data?.user && res.data?.token) {
        onShowToast(
          language === 'ms' 
            ? `Selamat kembali, ${res.data.user.name || res.data.user.username}!` 
            : `Welcome back, ${res.data.user.name || res.data.user.username}!`, 
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
      } else if (res.data?.user && res.data?.token && (res.data.user as any).email_verified && (res.data.user as any).status === 'approved') {
        onShowToast(
          language === 'ms' 
            ? `Pendaftaran akaun berjaya! Selamat datang ke KiraPuasaKu.` 
            : `Registration successful! Welcome to KiraPuasaKu.`, 
          'success'
        );
        onLoginSuccess(res.data.user, res.data.token);
      } else {
        const generatedCode = (res.data as any)?.registration_code || (res.data?.user as any)?.registration_code;
        setRegisteredUserInfo({
          username: cleanUser,
          email: cleanMail,
          registration_code: generatedCode,
        });
        setCodeIdentifier(cleanUser);
        setActiveTab('verifyCode');
        onShowToast(
          language === 'ms'
            ? 'Pendaftaran direkodkan! Sila dapatkan Kod Khas daripada Admin untuk aktifkan akaun.'
            : 'Registration recorded! Please obtain Special Code from Admin to activate.',
          'info'
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

  // Handle Verify Special Code (flow: Masukkan kod > Verify & Activate Account > masuk page log masuk)
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanId = codeIdentifier.trim().toLowerCase();
    const cleanCode = verificationCodeInput.trim().toUpperCase().replace(/\s+/g, '');

    if (!cleanId || !cleanCode) {
      setErrorMessage(
        language === 'ms'
          ? 'Sila masukkan Username/Emel dan Kod Khas Pendaftaran.'
          : 'Please enter Username/Email and Special Registration Code.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.verifyCode(cleanId, cleanCode);
      if (res.error) {
        const errText = res.error || (language === 'ms' ? 'Kod yang dimasukkan tidak sah. Sila cuba lagi.' : 'The code entered is invalid. Please try again.');
        setErrorMessage(errText);
        onShowToast(errText, 'error');
      } else if (res.data?.success || res.data?.user) {
        onShowToast(
          language === 'ms'
            ? 'Alhamdulillah, akaun anda telah berjaya diaktifkan! Sila log masuk.'
            : 'Alhamdulillah, your account has been activated! Please sign in.',
          'success'
        );
        setEmailVerifiedSuccess(true);
        setLoginIdentifier(cleanId);
        setVerificationCodeInput('');
        setActiveTab('login');
      }
    } catch (err: any) {
      const errText = language === 'ms'
        ? 'Kod yang dimasukkan tidak sah atau ralat sambungan. Sila cuba lagi.'
        : 'The code is invalid or connection error. Please try again.';
      setErrorMessage(errText);
      onShowToast(errText, 'error');
    } finally {
      setIsLoading(false);
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
        
        {/* Segmented Tab Switcher - 2 Tabs (Log Masuk & Daftar Akaun). Special code / Access code verification is hidden and appears when user clicks "verify code here" */}
        <div className="p-2 sm:p-2.5 bg-stone-100/70 dark:bg-stone-950/60 border-b border-stone-200/70 dark:border-stone-800/80">
          {activeTab === 'verifyCode' || activeTab === 'accessCode' ? (
            <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 dark:bg-amber-950/40 rounded-2xl border border-amber-300/40 dark:border-amber-700/40">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-950 dark:text-amber-100">
                  {t.accessCodeTitle || (language === 'ms' ? 'Akses dengan Kod Khas' : 'Access with Special Code')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                ← {t.backToLogin || (language === 'ms' ? 'Log Masuk' : 'Sign In')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-200/60 dark:bg-stone-900/90 rounded-2xl">
              <button
                id="tab-login-btn"
                type="button"
                onClick={() => handleTabSwitch('login')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.01]'
                    : 'text-stone-600 hover:text-blue-600 dark:text-stone-400 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
                }`}
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span className="truncate">{t.tabLogin}</span>
              </button>

              <button
                id="tab-register-btn"
                type="button"
                onClick={() => handleTabSwitch('register')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.01]'
                    : 'text-stone-600 hover:text-emerald-600 dark:text-stone-400 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="truncate">{t.tabRegister}</span>
              </button>
            </div>
          )}
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
                      ? 'Akaun anda telah diaktifkan. Sila masukkan kata laluan untuk log masuk.' 
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
                {language === 'ms' ? 'Mengesahkan akaun anda...' : 'Verifying your account...'}
              </p>
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
                    id="login-identifier-input"
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={language === 'ms' ? 'cth: ahmad atau ahmad@email.com' : 'e.g. ahmad or ahmad@email.com'}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  {t.labelPassword} <span className="text-rose-500">*</span>
                </label>
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
                    className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-11 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
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

              {/* Submit Login Button (Blue Color) */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {language === 'ms' ? 'Sedang Log Masuk...' : 'Signing in...'}
                  </span>
                ) : (
                  <>
                    <span>{t.btnLogin}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Quick switch prompts */}
              <div className="flex flex-col items-center gap-1.5 pt-2 text-center">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {language === 'ms' ? 'Belum mempunyai akaun?' : 'Don’t have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('register')}
                    className="font-bold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer"
                  >
                    {language === 'ms' ? 'Daftar sekarang' : 'Register now'}
                  </button>
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {t.haveAdminCodePrompt || (language === 'ms' ? 'Ada Kod Khas daripada Admin?' : 'Have a special Admin code?')}{' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('accessCode')}
                    className="font-bold text-amber-600 hover:underline dark:text-amber-400 cursor-pointer"
                  >
                    {t.verifyCodeHereLink || (language === 'ms' ? 'Sahkan kod di sini' : 'Verify code here')}
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* FORM 2: PENDAFTARAN AKAUN BAHARU (Warna Hijau Moden) */}
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

          {/* FORM 3: PENGESAHAN KOD KHAS ADMIN (Warna Amber/Gold Moden) */}
          {activeTab === 'verifyCode' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              
              {/* Notice Banner */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-100">
                      {t.codeVerificationTitle || 'Pengesahan Kod Khas Admin'}
                    </p>
                    <p className="leading-relaxed text-stone-700 dark:text-stone-300 text-[11px]">
                      {t.codeVerificationDesc || 'Sila masukkan Kod Khas Pengesahan yang diberikan oleh pihak Admin untuk mengaktifkan akaun anda.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Username or Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  {language === 'ms' ? 'Username atau Emel Berdaftar' : 'Registered Username or Email'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="verify-code-identifier-input"
                    type="text"
                    required
                    value={codeIdentifier}
                    onChange={(e) => setCodeIdentifier(e.target.value)}
                    placeholder={language === 'ms' ? 'Masukkan username atau emel' : 'Enter username or email'}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:bg-white focus:ring-4 focus:ring-amber-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                  />
                </div>
              </div>

              {/* Special Code Input (No example code in placeholder) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  {t.labelRegistrationCode || 'Kod Khas Pendaftaran'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="verify-code-input"
                    type="text"
                    required
                    value={verificationCodeInput}
                    onChange={(e) => setVerificationCodeInput(e.target.value.toUpperCase())}
                    placeholder={t.placeholderRegistrationCode || 'Masukkan Kod Khas'}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-mono font-bold tracking-wider text-amber-900 placeholder:text-stone-400 focus:border-amber-600 focus:bg-white focus:ring-4 focus:ring-amber-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-amber-200 dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                  />
                </div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  {language === 'ms' ? '*Kod hanya sah digunakan untuk 1 kali pengesahan akaun.' : '*Code is valid for single-use account activation only.'}
                </p>
              </div>

              {/* Submit Verify Code Button */}
              <button
                id="verify-code-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-500 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-amber-600/30 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {language === 'ms' ? 'Mengesahkan Kod...' : 'Verifying Code...'}
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t.btnVerifyCode || 'Sahkan & Aktifkan Akaun'}</span>
                  </>
                )}
              </button>

              {/* Contact Admin Assistance Section (Email & Telegram buttons) */}
              <div className="mt-4 pt-4 border-t border-stone-200/80 dark:border-stone-800 space-y-2.5">
                <p className="text-[11px] font-semibold text-center text-stone-600 dark:text-stone-400">
                  {t.codeFailedContactHelp || 'Jika kod yang diberikan gagal disahkan atau belum menerima kod, hubungi Admin:'}
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    id="btn-email-admin"
                    href="mailto:iqmalinsyad@gmail.com?subject=Bantuan%20Pengesahan%20Kod%20KiraPuasaKu&body=Salam%20Admin%20Iqmal,%20saya%20memerlukan%20bantuan%20kod%20pengesahan%20akaun%20KiraPuasaKu."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700/80 py-2.5 px-3 text-xs font-bold text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                  >
                    <Mail className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                    <span>{t.adminEmailBtn || 'Emel'}</span>
                  </a>

                  <a
                    id="btn-telegram-admin"
                    href="https://t.me/iqmalinsyad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white py-2.5 px-3 text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Send className="h-4 w-4 shrink-0" />
                    <span>{t.adminTelegramBtn || 'Telegram'}</span>
                  </a>
                </div>
              </div>

              {/* Return to Login */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('login')}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white cursor-pointer"
                >
                  ← {language === 'ms' ? 'Kembali ke Log Masuk' : 'Back to Sign In'}
                </button>
              </div>

            </form>
          )}

          {/* FORM 4: AKSES DENGAN KOD (Step 1: Masukkan Kod -> Verify & Activate -> Step 2: Isi Maklumat User -> Masuk Page Log Masuk) */}
          {activeTab === 'accessCode' && (
            <div className="space-y-4">
              
              {!isAccessCodeVerified ? (
                /* STEP 1: Masukkan Kod Akses & Sahkan */
                <form onSubmit={handleVerifyAccessCodeStep} className="space-y-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
                    <div className="flex items-start gap-2.5">
                      <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-100">
                          {t.accessCodeTitle || (language === 'ms' ? 'Akses dengan Kod Khas' : 'Access with Special Code')}
                        </p>
                        <p className="leading-relaxed text-stone-700 dark:text-stone-300 text-[11px]">
                          {t.accessCodeDesc || (language === 'ms' ? 'Masukkan Kod Akses unik yang anda peroleh daripada Admin untuk mengaktifkan pendaftaran anda secara terus.' : 'Enter the unique Access Code provided by the Admin to directly activate and create your account.')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      {t.labelAdminAccessCode || (language === 'ms' ? 'Kod Akses Admin' : 'Admin Access Code')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        id="access-code-input-field"
                        type="text"
                        required
                        value={accessCodeInput}
                        onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                        placeholder={t.placeholderAccessCode || (language === 'ms' ? 'Masukkan kod yang diterima' : 'Enter received code')}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-mono font-bold tracking-wider text-amber-900 placeholder:text-stone-400 focus:border-amber-600 focus:bg-white focus:ring-4 focus:ring-amber-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-amber-200 dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                      />
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">
                      {t.accessCodeHint || (language === 'ms' ? '*Setiap kod akses adalah berbeza dan unik untuk setiap pengguna.' : '*Each access code is distinct and unique per user.')}
                    </p>
                  </div>

                  <button
                    id="verify-access-code-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-500 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-amber-600/30 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{t.btnVerifyingAccessCode || (language === 'ms' ? 'Mengesahkan Kod...' : 'Verifying Code...')}</span>
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t.btnVerifyAccessCodeStep || (language === 'ms' ? 'Sahkan & Aktifkan Akaun' : 'Verify & Activate Account')}</span>
                      </>
                    )}
                  </button>

                  {/* Hubungi Admin */}
                  <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 space-y-2.5">
                    <p className="text-[11px] font-semibold text-center text-stone-600 dark:text-stone-400">
                      {t.accessCodeHelpContact || (language === 'ms' ? 'Untuk bantuan mendapatkan kod akses, hubungi Admin:' : 'For assistance in obtaining an access code, contact Admin:')}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <a
                        id="btn-email-admin-access"
                        href="mailto:iqmalinsyad@gmail.com?subject=Permohonan%20Kod%20Akses%20KiraPuasaKu&body=Salam%20Admin%20Iqmal,%20saya%20ingin%20memohon%20kod%20akses%20bagi%20pendaftaran%20aplikasi%20KiraPuasaKu."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700/80 py-2.5 px-3 text-xs font-bold text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                      >
                        <Mail className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                        <span>{t.adminEmailBtn || (language === 'ms' ? 'Emel' : 'Email')}</span>
                      </a>
                      <a
                        id="btn-telegram-admin-access"
                        href="https://t.me/iqmalinsyad"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white py-2.5 px-3 text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <Send className="h-4 w-4 shrink-0" />
                        <span>{t.adminTelegramBtn || 'Telegram'}</span>
                      </a>
                    </div>
                  </div>
                </form>
              ) : (
                /* STEP 2: Isi Maklumat Pengguna (Username, Email, Password) */
                <form onSubmit={handleRegisterWithAccessCode} className="space-y-4">
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-bold text-xs">{t.codeVerifiedBadge || (language === 'ms' ? 'Kod Disahkan:' : 'Code Verified:')} <span className="font-mono">{accessCodeInput}</span></p>
                        <p className="text-[10px] text-emerald-800 dark:text-emerald-300">{t.fillAccountDetailsHint || (language === 'ms' ? 'Sila isi maklumat akaun anda di bawah:' : 'Please fill in your account details below:')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAccessCodeVerified(false)}
                      className="text-[11px] font-semibold underline text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 cursor-pointer"
                    >
                      {t.btnChangeAccessCode || (language === 'ms' ? 'Tukar' : 'Change')}
                    </button>
                  </div>

                  {/* 1. Username */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      1. {t.labelUsername} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                        <span className="text-xs font-bold font-mono">@</span>
                      </div>
                      <input
                        id="acc-username-input"
                        type="text"
                        required
                        value={accUsername}
                        onChange={(e) => setAccUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                        placeholder={language === 'ms' ? 'contoh: ahmad_ali' : 'e.g. ahmad_ali'}
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:bg-white focus:ring-4 focus:ring-amber-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                      />
                    </div>
                  </div>

                  {/* 2. Email Address */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      2. {t.labelEmail} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="acc-email-input"
                        type="email"
                        required
                        value={accEmail}
                        onChange={(e) => setAccEmail(e.target.value)}
                        placeholder={t.placeholderEmail || (language === 'ms' ? 'contoh@gmail.com' : 'user@example.com')}
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:bg-white focus:ring-4 focus:ring-amber-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                      />
                    </div>
                  </div>

                  {/* 3. Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      3. {t.labelPassword} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="acc-password-input"
                        type={showAccPassword ? 'text' : 'password'}
                        required
                        value={accPassword}
                        onChange={(e) => setAccPassword(e.target.value)}
                        placeholder={t.placeholderPassword || (language === 'ms' ? 'Min. 6 aksara' : 'Min 6 characters')}
                        className="block w-full rounded-2xl border border-stone-200 bg-stone-50/80 pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:bg-white focus:ring-4 focus:ring-amber-500/15 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccPassword(!showAccPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                      >
                        {showAccPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="acc-register-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>{t.btnRegisteringWithAccessCode || (language === 'ms' ? 'Mendaftar Akaun...' : 'Registering Account...')}</span>
                      </span>
                    ) : (
                      <>
                        <span>{t.btnRegisterWithAccessCode || (language === 'ms' ? 'Daftar & Aktifkan Akaun' : 'Register & Activate Account')}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Return to Login */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('login')}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white cursor-pointer"
                >
                  ← {t.backToLogin || (language === 'ms' ? 'Kembali ke Log Masuk' : 'Back to Sign In')}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
