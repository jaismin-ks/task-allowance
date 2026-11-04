// app/wishlist/new/index.js — S8 Add item: link step
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardInset } from '../../../components/useKeyboardInset';
import { HiddenPageScraper } from '../../../components/HiddenPageScraper';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { FlowHeader } from '../../../components/ui/Headers';
import { Icon } from '../../../components/ui/Icon';
import { TextField } from '../../../components/ui/TextField';
import { INLINE_URL_ERROR_COPY, INLINE_URL_ERRORS } from '../../../lib/api/scrapeMessages';
import { scrapeProduct } from '../../../lib/api/scrapeProduct';
import { validate } from '../../../lib/validation';
import { durations } from '../../../theme/motion';
import { size } from '../../../theme/tokens';
import { makeStyles, useColors } from '../../../theme/theme';

export default function AddItemLinkScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [slow, setSlow] = useState(false);
  // URL being read by the on-device fallback (a hidden in-app browser), if any
  const [deviceUrl, setDeviceUrl] = useState(null);
  const deviceResolve = useRef(null);
  // Bumped on unmount or "Enter details manually" so a late result is ignored
  const runId = useRef(0);

  useEffect(
    () => () => {
      runId.current += 1;
    },
    []
  );

  // Resolves with { title, imageUrl, price, currency } or null (blocked / timed out)
  const scrapeOnDevice = (link) =>
    new Promise((resolve) => {
      deviceResolve.current = resolve;
      setDeviceUrl(link);
    });

  useEffect(() => {
    if (!fetching) return undefined;
    const t = setTimeout(() => setSlow(true), durations.FETCH_SLOW_HINT_MS);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [fetching]);

  const paste = async () => {
    const text = (await Clipboard.getStringAsync())?.trim();
    if (text) {
      setUrl(text);
      setError(null);
    }
  };

  const fetchDetails = async () => {
    const err = validate.productUrl(url, { required: true });
    setError(err);
    if (err || fetching) return;

    const link = url.trim();
    const run = ++runId.current;
    setFetching(true);
    let result = await scrapeProduct(link);
    if (run !== runId.current) return;

    if (!result.success && INLINE_URL_ERRORS.has(result.reason)) {
      setFetching(false);
      setError(INLINE_URL_ERROR_COPY);
      return;
    }

    // Server got nothing, or no price: many stores block server requests or only
    // render the price with JavaScript. Retry in a hidden browser on this phone.
    // Skipped when offline — it would fail the same way.
    if ((!result.success || result.price == null) && result.reason !== 'network_error') {
      const device = await scrapeOnDevice(link);
      if (run !== runId.current) return;
      result = mergeScrapes(result, device);
    }
    setFetching(false);

    router.push({
      pathname: '/wishlist/new/details',
      params: result.success
        ? {
            url: link,
            status: 'success',
            title: result.title ?? '',
            price: result.price != null ? String(result.price) : '',
            imageUrl: result.imageUrl ?? '',
            currency: result.currency ?? '',
          }
        : { url: link, status: 'failed', reason: result.reason ?? 'blocked' },
    });
  };

  return (
    <View style={[styles.flex, { paddingBottom: keyboardInset }]} collapsable={false}>
      <View style={{ paddingTop: Platform.OS === 'android' ? insets.top : 8 }}>
        <FlowHeader title="Add an item" step="STEP 1 OF 2" onClose={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="h1" accessibilityRole="header">Add an item</AppText>
        <TextField
          label="Product link"
          placeholder="https://"
          helper="Paste a link and we’ll try to fill in the details."
          value={url}
          onChangeText={(v) => {
            setUrl(v);
            if (error && !validate.productUrl(v, { required: true })) setError(null);
          }}
          onBlur={() => url && setError(validate.productUrl(url, { required: true }))}
          error={error}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={fetchDetails}
          right={
            <Pressable
              onPress={paste}
              accessibilityRole="button"
              accessibilityLabel="Paste link from clipboard"
              style={styles.paste}
            >
              <Icon name="paste" size={16} color={colors.accentText} />
              <AppText variant="label" color={colors.accentText}>Paste</AppText>
            </Pressable>
          }
        />
        {slow && (
          <AppText variant="small" color={colors.textMuted} accessibilityLiveRegion="polite">
            {deviceUrl
              ? 'Still looking — opening the store page on your phone. This can take up to 15 seconds.'
              : 'Some stores take a few seconds.'}
          </AppText>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: keyboardInset ? 12 : Math.max(insets.bottom, 16) }]}>
        <Button label="Fetch details" loading={fetching} loadingLabel="Fetching…" arrow onPress={fetchDetails} />
        <Button
          label="Enter details manually"
          variant="ghost"
          onPress={() => {
            // Abandon any fetch in progress
            runId.current += 1;
            setFetching(false);
            setDeviceUrl(null);
            router.push({ pathname: '/wishlist/new/details', params: { url: url.trim() } });
          }}
        />
      </View>
      {deviceUrl && (
        <HiddenPageScraper
          key={deviceUrl}
          url={deviceUrl}
          onDone={(r) => {
            setDeviceUrl(null);
            deviceResolve.current?.(r);
            deviceResolve.current = null;
          }}
        />
      )}
    </View>
  );
}

// Combine the server result with the on-device one, field by field. The price and
// its currency always come from the same source.
function mergeScrapes(server, device) {
  if (!device) return server;
  const s = server.success ? server : {};
  const priceFrom = s.price != null ? s : device.price != null ? device : null;
  return {
    success: true,
    title: s.title || device.title,
    imageUrl: s.imageUrl || device.imageUrl,
    price: priceFrom?.price ?? null,
    currency: priceFrom?.currency ?? null,
  };
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 24 },
  paste: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: size.hit,
    paddingHorizontal: 8,
    marginRight: -8,
  },
  footer: { paddingHorizontal: 20, gap: 4 },
}));
