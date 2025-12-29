'use client';

import { useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: TurnstileRenderOptions
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
      isExpired: (widgetId: string) => boolean;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (error: unknown) => void;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  action?: string;
  cData?: string;
  'response-field'?: boolean;
  'response-field-name'?: string;
  size?: 'normal' | 'compact';
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  execution?: 'render' | 'execute';
  appearance?: 'always' | 'execute' | 'interaction-only';
}

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: unknown) => void;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  size?: 'normal' | 'compact';
  className?: string;
}

export function Turnstile({
  siteKey,
  onVerify,
  onExpire,
  onError,
  action,
  theme = 'light',
  language = 'auto',
  size = 'normal',
  className,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) {
      return;
    }

    // Clear container before rendering
    containerRef.current.innerHTML = '';

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onError,
      theme,
      language,
      action,
      size,
      'response-field': false, // We handle token manually
      retry: 'auto',
      'refresh-expired': 'auto',
    });
  }, [siteKey, onVerify, onExpire, onError, theme, language, action, size]);

  // Handle script load
  const handleScriptLoad = useCallback(() => {
    scriptLoadedRef.current = true;
    renderWidget();
  }, [renderWidget]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  // Re-render if siteKey changes
  useEffect(() => {
    if (scriptLoadedRef.current && window.turnstile) {
      // Remove existing widget
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      renderWidget();
    }
  }, [siteKey, renderWidget]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}

// Hook for easier integration with forms
export function useTurnstile() {
  const tokenRef = useRef<string | null>(null);

  const setToken = useCallback((token: string) => {
    tokenRef.current = token;
  }, []);

  const clearToken = useCallback(() => {
    tokenRef.current = null;
  }, []);

  const getToken = useCallback(() => {
    return tokenRef.current;
  }, []);

  const resetWidget = useCallback((widgetId?: string) => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
    tokenRef.current = null;
  }, []);

  return {
    token: tokenRef,
    setToken,
    clearToken,
    getToken,
    resetWidget,
  };
}
