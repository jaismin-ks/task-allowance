// app/(tabs)/settings/about.js — S15 About & privacy. Opens scrolled to the tapped section.
import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomChrome } from '../../../components/layout';
import { AppText } from '../../../components/ui/AppText';
import { PushHeader } from '../../../components/ui/Headers';
import { makeStyles, useColors } from '../../../theme/theme';

const SECTIONS = [
  {
    key: 'how',
    title: 'How TaskAllowance works',
    body: [
      'Add tasks and give each one a value. When you mark a task done, its value is added to what you’ve earned.',
      'Pick one wishlist item as your goal. Everything you’ve earned and haven’t spent counts toward it, and that carries over from month to month.',
      'Repeating tasks show up on the days they’re due. If you miss one, it stays on your list until the next one is due, then it’s marked as missed — so a busy week never leaves you with a pile of old copies.',
      'Your monthly allowance is the most you want to earn in a month. The daily guide spreads what’s left across the remaining days. It’s a suggestion, never a limit — extra tasks always count.',
      'When you’ve earned enough, mark the item as bought and pick what’s next.',
    ],
  },
  {
    key: 'privacy',
    title: 'Privacy',
    body: [
      'Your tasks, wishlist and earnings are stored only on this phone. There’s no account and nothing is synced.',
      'When you use “Fetch details”, the product link is sent to our server so it can read the store page. Nothing else is sent with it.',
      'Voice input uses your phone’s speech recognition to turn speech into a task title. Audio isn’t saved by TaskAllowance.',
      'The daily reminder is scheduled on this phone. Nothing about your tasks is sent anywhere to make it work.',
      'Backups are files you create and keep yourself. They aren’t uploaded anywhere unless you choose a cloud folder in the share sheet, and they aren’t encrypted, so keep them somewhere private.',
      '“Reset all data” in Settings permanently erases everything on this phone.',
    ],
  },
  {
    key: 'limits',
    title: 'Known limitations',
    body: [
      'Currency only changes the symbol. Amounts are never converted, including prices from stores in other currencies.',
      'Some stores block automatic fetching. You can always add the details yourself.',
      'Your data lives on this phone only, so deleting the app or resetting erases it. Use “Back up data” in Settings to save a copy you can restore. Backups aren’t made automatically, and theme and other preferences aren’t included.',
      'Completed tasks can only be undone for a few seconds, and can’t be edited after that.',
    ],
  },
];

export default function AboutScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { section } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { tabContentPadding } = useBottomChrome();
  const scrollRef = useRef(null);
  const scrolled = useRef(false);

  return (
    <View style={styles.flex}>
      <View style={{ paddingTop: insets.top }}>
        <PushHeader title="About" onBack={() => router.back()} />
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: tabContentPadding }]}>
        {SECTIONS.map((s) => (
          <View
            key={s.key}
            style={styles.section}
            onLayout={(e) => {
              if (s.key === section && !scrolled.current && e.nativeEvent.layout.y > 0) {
                scrolled.current = true;
                scrollRef.current?.scrollTo({ y: e.nativeEvent.layout.y - 8, animated: false });
              }
            }}
          >
            <AppText variant="h2" accessibilityRole="header">{s.title}</AppText>
            {s.body.map((p) => (
              <AppText key={p} variant="body" color={colors.textMuted}>{p}</AppText>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 32 },
  section: { gap: 10 },
}));
