// components/TaskToolbar.js
// Tasks list: search field + "Filter" button (badge = active filters), and a
// "Showing 3 of 9 · Clear all" line while anything narrows the list.
import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { activeFilterCount, isFiltering, SORTS } from '../lib/taskFilters';
import { useTaskFilters } from '../store/taskFilterStore';
import { fonts, MAX_FONT_SCALE, radius, size, type } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

// autoFocus: opened from the search icon. onDismiss: the field lost focus while empty,
// so a short list can hide the toolbar again.
export function TaskToolbar({ shown, total, autoFocus = false, onDismiss }) {
  const colors = useColors();
  const styles = useStyles();
  const filters = useTaskFilters();
  const { query, setQuery, sort, clearAll } = filters;
  const inputRef = useRef(null);
  const count = activeFilterCount(filters);
  const sorted = sort !== 'newest';
  const sortLabel = SORTS.find((s) => s.key === sort)?.label;

  const filterA11y =
    `Sort and filter` +
    (count ? `, ${count} ${count === 1 ? 'filter' : 'filters'} on` : '') +
    (sorted ? `, sorted by ${sortLabel}` : '');

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable style={styles.search} onPress={() => inputRef.current?.focus()} accessible={false}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            autoFocus={autoFocus}
            onBlur={() => {
              if (!query.trim()) onDismiss?.();
            }}
            placeholder="Search tasks"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accentText}
            keyboardAppearance={colors.mode}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="never"
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            accessibilityLabel="Search tasks"
            style={styles.input}
          />
          {!!query && (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              style={styles.clear}
            >
              <Icon name="close" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.push('/task/filters')}
          accessibilityRole="button"
          accessibilityLabel={filterA11y}
          style={({ pressed }) => [
            styles.filterBtn,
            (count > 0 || sorted) && styles.filterOn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="sliders" size={18} color={count > 0 || sorted ? colors.onAccent : colors.text} />
          <AppText
            variant="label"
            color={count > 0 || sorted ? colors.onAccent : colors.text}
            maxFontSizeMultiplier={1.3}
          >
            Filter
          </AppText>
          {count > 0 && (
            <View style={styles.badge}>
              <AppText variant="caption" color={colors.accent} style={styles.badgeText}>{count}</AppText>
            </View>
          )}
        </Pressable>
      </View>

      {(isFiltering(filters) || sorted) && (
        <View style={styles.summary}>
          <AppText
            variant="caption"
            color={colors.textMuted}
            style={styles.flex}
            accessibilityLiveRegion="polite"
          >
            {isFiltering(filters) ? `SHOWING ${shown} OF ${total}` : `SORTED · ${sortLabel.toUpperCase()}`}
            {isFiltering(filters) && sorted ? ` · ${sortLabel.toUpperCase()}` : ''}
          </AppText>
          <Pressable onPress={clearAll} accessibilityRole="button" accessibilityLabel="Clear search, filters and sort" style={styles.clearAll}>
            <AppText variant="label" color={colors.accentText}>Clear all</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  search: {
    flex: 1,
    minHeight: size.hit + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { ...type.body, flex: 1, color: colors.text, paddingVertical: 10 },
  clear: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  filterBtn: {
    minHeight: size.hit + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.onAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.monoMedium, letterSpacing: 0 },
  summary: { flexDirection: 'row', alignItems: 'center', minHeight: size.hit, paddingLeft: 4 },
  clearAll: { minHeight: size.hit, justifyContent: 'center', paddingHorizontal: 4 },
}));
