import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { colors } from '@/theme';
import { buildLookupScript, type LookupEvent, type LookupSource } from './sources';

export type HiddenLookupHandle = {
  submit: (code: string) => void;
  refresh: () => void;
  reload: () => void;
};

type Props = {
  source: LookupSource;
  value: string;
  /** Když web použije widget „Nejsem robot“, ukážeme ho klientovi v našem rámečku. */
  showWidget: boolean;
  onEvent: (event: LookupEvent) => void;
};

/** Oficiální stránka načtená neviditelně v telefonu klienta. */
export const HiddenLookup = forwardRef<HiddenLookupHandle, Props>(function HiddenLookup(
  { source, value, showWidget, onEvent },
  ref,
) {
  const web = useRef<WebView>(null);
  const [nonce, setNonce] = useState(0);

  useImperativeHandle(ref, () => ({
    submit: (code) =>
      web.current?.injectJavaScript(`window.__sivkSubmit && window.__sivkSubmit(${JSON.stringify(code)}); true;`),
    refresh: () => web.current?.injectJavaScript('window.__sivkRefresh && window.__sivkRefresh(); true;'),
    reload: () => setNonce((n) => n + 1),
  }));

  useEffect(() => {
    if (!showWidget) return;
    web.current?.injectJavaScript(
      "var w = document.querySelector('.g-recaptcha,.h-captcha,.cf-turnstile,iframe[src*=\"captcha\"]'); if (w) w.scrollIntoView({ block: 'center' }); true;",
    );
  }, [showWidget]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      onEvent(JSON.parse(e.nativeEvent.data) as LookupEvent);
    } catch {
      // Zprávy, které neposlal náš skript, ignorujeme.
    }
  };

  return (
    <View style={showWidget ? styles.widget : styles.hidden} pointerEvents={showWidget ? 'auto' : 'none'}>
      <WebView
        key={nonce}
        ref={web}
        source={{ uri: source.url }}
        injectedJavaScript={buildLookupScript(source, value)}
        onMessage={onMessage}
        onError={() => onEvent({ type: 'error', message: 'load-failed' })}
        onHttpError={() => onEvent({ type: 'error', message: 'http-error' })}
        javaScriptEnabled
        domStorageEnabled
        style={styles.web}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hidden: { position: 'absolute', top: 0, left: 0, width: 380, height: 700, opacity: 0 },
  widget: {
    height: 420,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  web: { flex: 1, backgroundColor: '#FFFFFF' },
});
