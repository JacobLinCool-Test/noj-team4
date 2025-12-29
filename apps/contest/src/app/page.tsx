'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, type ApiError } from '@/lib/api';

const BASE_COOLDOWN_MS = 1000;
const EXPONENTIAL_THRESHOLD = 10;
const LOCALE_COOKIE = 'locale';
const FALLBACK_LOCALE = 'zh-TW';

type Locale = 'zh-TW' | 'en';

const MESSAGES: Record<Locale, Record<string, string>> = {
  'zh-TW': {
    title: 'NOJ Contest',
    subtitle: '請輸入登入代碼以開始',
    codeLabel: '登入代碼',
    codePlaceholder: 'A7K9X3',
    buttonEnter: '進入考試',
    buttonLoading: '登入中...',
    buttonCooldown: '請稍候 {seconds} 秒',
    errorInvalidLength: '請輸入 6 位代碼',
    errorUnknown: '登入失敗，請稍後再試',
    errorInvalidCode: '代碼無效',
    errorExamEnded: '考試已結束',
    errorIpNotAllowed: '您的 IP 不在允許範圍內',
    errorRateLimited: '嘗試過於頻繁，請稍後再試',
    cooldownRetry: '請稍候 {seconds} 秒再試',
    helpText: '如有問題，請聯繫監考人員',
  },
  en: {
    title: 'NOJ Contest',
    subtitle: 'Enter your access code to start',
    codeLabel: 'Access code',
    codePlaceholder: 'A7K9X3',
    buttonEnter: 'Enter exam',
    buttonLoading: 'Signing in...',
    buttonCooldown: 'Wait {seconds}s',
    errorInvalidLength: 'Please enter a 6-character code',
    errorUnknown: 'Login failed. Please try again later.',
    errorInvalidCode: 'Invalid access code',
    errorExamEnded: 'The exam has ended',
    errorIpNotAllowed: 'Your IP is not allowed',
    errorRateLimited: 'Too many attempts. Try again later.',
    cooldownRetry: 'Please wait {seconds}s to try again',
    helpText: 'Need help? Contact the proctor.',
  },
};

function normalizeLocale(value?: string): Locale {
  if (!value) return FALLBACK_LOCALE;
  const normalized = value.replace('_', '-').toLowerCase();
  if (normalized === 'en') return 'en';
  if (normalized === 'zh-tw') return 'zh-TW';
  return FALLBACK_LOCALE;
}

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return FALLBACK_LOCALE;
  const cookies = document.cookie.split(';').map((item) => item.trim());
  const localeCookie = cookies.find((item) => item.startsWith(`${LOCALE_COOKIE}=`));
  if (!localeCookie) return FALLBACK_LOCALE;
  const value = localeCookie.split('=').slice(1).join('=');
  return normalizeLocale(value);
}

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [locale, setLocale] = useState<Locale>(FALLBACK_LOCALE);

  useEffect(() => {
    setLocale(getLocaleFromCookie());
  }, []);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const remainingMs = cooldownUntil - Date.now();
      if (remainingMs <= 0) {
        setCooldownRemaining(0);
        setCooldownUntil(0);
        return;
      }
      setCooldownRemaining(Math.ceil(remainingMs / 1000));
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 200);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const t = useMemo(() => {
    const messages = MESSAGES[locale] || MESSAGES[FALLBACK_LOCALE];
    return (key: string, vars?: Record<string, string | number>) => {
      let value = messages[key] || key;
      if (vars) {
        Object.entries(vars).forEach(([token, replacement]) => {
          value = value.replace(`{${token}}`, String(replacement));
        });
      }
      return value;
    };
  }, [locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError(t('errorInvalidLength'));
      return;
    }

    const now = Date.now();
    if (cooldownUntil && now < cooldownUntil) {
      const remainingSeconds = Math.ceil((cooldownUntil - now) / 1000);
      setError(t('cooldownRetry', { seconds: remainingSeconds }));
      return;
    }

    setLoading(true);
    setError(null);

    const nextAttempt = attemptCount + 1;
    const exponent = Math.max(0, nextAttempt - EXPONENTIAL_THRESHOLD);
    const delayMs = BASE_COOLDOWN_MS * 2 ** exponent;
    setAttemptCount(nextAttempt);
    setCooldownUntil(now + delayMs);

    try {
      await login(code.toUpperCase());
      router.push('/problems');
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.message) {
        // 翻譯錯誤訊息
        const errorMessages: Record<string, string> = {
          'Invalid exam code': 'errorInvalidCode',
          'Exam has ended': 'errorExamEnded',
          'IP not allowed': 'errorIpNotAllowed',
          'Exam login rate limited': 'errorRateLimited',
        };
        if (apiError.retryAfter && apiError.retryAfter > 0) {
          const serverCooldownUntil = Date.now() + apiError.retryAfter * 1000;
          setCooldownUntil((current) =>
            Math.max(current, serverCooldownUntil),
          );
          setError(t('cooldownRetry', { seconds: apiError.retryAfter }));
        } else {
          const key = errorMessages[apiError.message];
          setError(key ? t(key) : t('errorUnknown'));
        }
      } else {
        setError(t('errorUnknown'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setCode(value);
    }
  };

  const isCooldownActive = cooldownRemaining > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eaf3fb] via-[#f6fbff] to-[#d9ecff] px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-[0_20px_60px_rgba(0,56,101,0.18)] border border-white/70 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-[#003865] mb-2">
              {t('title')}
            </h1>
            <p className="text-slate-600">{t('subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                {t('codeLabel')}
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder={t('codePlaceholder')}
                autoComplete="off"
                autoFocus
                className="w-full px-4 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] border border-[#cfe1f2] rounded-2xl focus:ring-2 focus:ring-[#1e5d8f]/40 focus:border-[#1e5d8f] uppercase text-[#0b2234] placeholder:text-slate-400 shadow-inner"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6 || isCooldownActive}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#003865] via-[#0b4f7c] to-[#1e5d8f] text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-[#003865]/20 focus:outline-none focus:ring-2 focus:ring-[#1e5d8f]/40 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('buttonLoading')}
                </span>
              ) : isCooldownActive ? (
                t('buttonCooldown', { seconds: cooldownRemaining })
              ) : (
                t('buttonEnter')
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            <p>{t('helpText')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
