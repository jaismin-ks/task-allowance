// components/HiddenPageScraper.js
// On-device scrape fallback. Loads the product page in an invisible WebView — a
// real browser engine on the user's own connection, so it gets past bot filters
// that reject server requests and runs the JavaScript that client-rendered stores
// need — then reads the product details from the finished page.
// Calls onDone(result | null) exactly once. Sandboxed: incognito, no cookies kept,
// no popups, and only http(s) navigation (no jumping into other apps).
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { PAGE_EXTRACT_JS } from '../lib/api/pageExtract';
import { currencyFromSymbol, parsePrice } from '../lib/api/parsePrice';

const TIMEOUT_MS = 15000;
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

function httpsUrl(maybeRelative, base) {
  if (!maybeRelative || typeof maybeRelative !== 'string') return null;
  try {
    const u = new URL(maybeRelative, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.protocol = 'https:'; // iOS blocks plain-http images in release builds
    return u.toString();
  } catch {
    return null;
  }
}

const cleanTitle = (t) =>
  t
    .replace(/^Amazon\.[a-z.]+\s*:\s*/i, '')
    .replace(/\s*[|–—]\s*[^|–—]{2,40}$/, '')
    .trim();

// Page data is untrusted — validate and clamp everything before it reaches the form
function normalise(data, pageUrl) {
  const title = typeof data?.title === 'string' ? cleanTitle(data.title).slice(0, 200) : null;
  if (!title) return null;
  const currency =
    (typeof data.currency === 'string' && /^[A-Za-z]{3}$/.test(data.currency.trim())
      ? data.currency.trim().toUpperCase()
      : null) ?? currencyFromSymbol(data.price);
  return {
    title,
    imageUrl: httpsUrl(data.image, pageUrl),
    price: parsePrice(typeof data.price === 'number' ? data.price : String(data.price ?? '').slice(0, 40)),
    currency,
  };
}

export function HiddenPageScraper({ url, onDone }) {
  const done = useRef(false);
  const finish = (result) => {
    if (done.current) return;
    done.current = true;
    onDone(result);
  };

  useEffect(() => {
    const t = setTimeout(() => finish(null), TIMEOUT_MS);
    return () => clearTimeout(t);
    // finish is stable for the lifetime of this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.offscreen} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <WebView
        source={{ uri: url }}
        userAgent={IPHONE_SAFARI}
        injectedJavaScript={PAGE_EXTRACT_JS}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg?.type === 'ta-scrape') finish(normalise(msg.data, msg.url ?? url));
          } catch {
            // Not ours (pages can postMessage too) — ignore
          }
        }}
        onShouldStartLoadWithRequest={(req) => /^https?:/i.test(req.url)}
        originWhitelist={['http://*', 'https://*']}
        incognito
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        mediaPlaybackRequiresUserAction
        allowsInlineMediaPlayback={false}
        allowsLinkPreview={false}
        cacheEnabled={false}
        onError={() => finish(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Laid out at phone size (some stores render nothing in a 0×0 view) but invisible
  offscreen: { position: 'absolute', top: 0, left: 0, width: 390, height: 844, opacity: 0, zIndex: -1 },
});
