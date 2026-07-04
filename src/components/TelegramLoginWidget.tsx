import { useEffect, useRef } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginWidgetProps {
  botName: string;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write';
  usePic?: boolean;
  onAuth: (user: TelegramUser) => void;
}

export function TelegramLoginWidget({
  botName,
  buttonSize = 'large',
  cornerRadius,
  requestAccess = 'write',
  usePic = true,
  onAuth,
}: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Prevent React 18 Strict Mode from mounting the script twice
    if (containerRef.current.hasChildNodes()) return;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    if (cornerRadius !== undefined) {
      script.setAttribute('data-radius', cornerRadius.toString());
    }
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-userpic', usePic.toString());
    script.async = true;

    // We use a global callback for the telegram widget
    const callbackName = 'TelegramLoginCallback_' + Math.round(Math.random() * 1000000);
    (window as any)[callbackName] = (user: TelegramUser) => {
      onAuth(user);
    };
    // Telegram's script specifically expects the literal string `(user)` to be present
    script.setAttribute('data-onauth', callbackName + '(user)');

    containerRef.current.appendChild(script);

    return () => {
      // cleanup
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, usePic, onAuth]);

  return <div ref={containerRef} />;
}
