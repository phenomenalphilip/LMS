import { useEffect, useRef } from 'react';

interface TelegramLoginWidgetProps {
  onAuth: (data: any) => void;
}

// Extend window to include the Telegram global callback
declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void;
  }
}

export function TelegramLoginWidget({ onAuth }: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Setup the global callback that the Telegram widget will call
    window.onTelegramAuth = (user) => {
      onAuth(user);
    };

    // If the widget is already loaded in the container, do not load again
    if (containerRef.current && containerRef.current.children.length === 0) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      // Use the provided bot username
      script.setAttribute('data-telegram-login', 'pdsacademy_bot');
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.async = true;

      containerRef.current.appendChild(script);
    }

    return () => {
      // Cleanup global function on unmount
      delete window.onTelegramAuth;
    };
  }, [onAuth]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* The Telegram script will automatically inject the standard blue button here */}
      <div ref={containerRef}></div>
    </div>
  );
}
