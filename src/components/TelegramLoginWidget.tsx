import { useEffect, useRef, useState } from 'react';

interface TelegramLoginWidgetProps {
  onAuth: (idToken: string) => void;
}

// Extend window to include the Telegram global
declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (
          options: { bot_id: string | number; scope?: string[]; nonce?: string; lang?: string },
          callback: (result: { id_token?: string; error?: string } | false) => void
        ) => void;
      };
    };
  }
}

export function TelegramLoginWidget({ onAuth }: TelegramLoginWidgetProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // VITE_TELEGRAM_BOT_ID is the numeric part of the bot token (public info, safe to embed)
  const botId = import.meta.env.VITE_TELEGRAM_BOT_ID || '8875441203';

  useEffect(() => {
    if (scriptRef.current) return; // prevent double-loading in Strict Mode

    const script = document.createElement('script');
    script.src = 'https://oauth.telegram.org/js/telegram-login.js?5';
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => setError('Failed to load Telegram SDK');
    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      // Do not remove the script – it registers global state that other instances may need
    };
  }, []);

  const handleLogin = () => {
    if (!isScriptLoaded || !window.Telegram?.Login) {
      setError('Telegram SDK not ready. Please refresh and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    window.Telegram.Login.auth(
      {
        bot_id: Number(botId),
        scope: ['profile', 'phone'],
        lang: 'en',
      },
      (result) => {
        setIsLoading(false);
        if (!result || result.error) {
          setError(result ? result.error || 'Login failed.' : 'Login was cancelled.');
          return;
        }
        if (result.id_token) {
          onAuth(result.id_token);
        }
      }
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleLogin}
        disabled={!isScriptLoaded || isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'linear-gradient(135deg, #2AABEE, #229ED9)',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          padding: '14px 28px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: isScriptLoaded && !isLoading ? 'pointer' : 'not-allowed',
          opacity: isScriptLoaded && !isLoading ? 1 : 0.7,
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 15px rgba(42, 171, 238, 0.3)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tg-btn-grad" x1="120" y1="0" x2="120" y2="240" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2AABEE"/>
              <stop offset="1" stopColor="#229ED9"/>
            </linearGradient>
          </defs>
          <circle cx="120" cy="120" r="120" fill="url(#tg-btn-grad)"/>
          <path d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687c1.906 0 30.046-29.295 30.046-29.295l31.318-60.584L81.229 128.772z" fill="#c8daea"/>
          <path d="M100.106 138.878l-2.733 29.046s-1.144 8.9 7.754 0c8.9-8.9 17.415-15.497 17.415-15.497" fill="#a9c6d4"/>
          <path d="M81.486 130.178l-40.304-13.32s-4.824-1.955-3.27-6.396c.32-.911 1.67-1.85 5.46-3.37 16.917-7.003 115.28-44.05 115.28-44.05s4.44-1.494 7.085-.503c1.36.503 2.23 1.483 2.23 3.827-.067 1.175-.503 4.44-.503 4.44l-75.7 214.16s-4.3 7.588-8.6 7.588c-4.3 0-6.84-4.3-6.84-4.3L81.486 130.178z" fill="white"/>
        </svg>
        {isLoading ? 'Opening Telegram...' : !isScriptLoaded ? 'Loading...' : 'Log in with Telegram'}
      </button>
      {error && (
        <p style={{ color: '#f87171', fontSize: '14px', margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
