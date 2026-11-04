// components/TaskForm.js
// S2 / S3 — one form, three modes: new task, edit a task (one-off or one repeat
// occurrence), and edit a repeating task's series. Fields and copy from spec §5.2;
// soft warning §6.3. Repeat edits ask "Just this one" / "This and future ones".
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createSeries, getSeries, stopSeries, updateSeries } from '../db/operations/recurring';
import { effortInfo } from '../lib/effort';
import { formatMoney, parseMoney, toMoneyInput } from '../lib/format';
import { describeRule, friendlyDate, nextOccurrence, ruleFromSeries, sameRule } from '../lib/recurrence';
import { validate } from '../lib/validation';
import { useVoiceAvailable } from '../lib/voiceInput';
import { usePoolStore } from '../store/poolStore';
import { useTaskStore } from '../store/taskStore';
import { showToast, useUiStore } from '../store/uiStore';
import { size } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { RepeatPicker } from './RepeatPicker';
import { Banner } from './ui/Banner';
import { Button } from './ui/Button';
import { EffortPicker } from './ui/EffortPicker';
import { SheetHeader } from './ui/Headers';
import { Icon } from './ui/Icon';
import { MoneyField } from './ui/MoneyField';
import { TextField } from './ui/TextField';

const defaultRule = () => {
  const today = new Date();
  return { frequency: 'never', weekdays: [today.getDay()], monthDay: today.getDate() };
};

// `task`: edit an existing task (a one-off, or one occurrence of a repeating task)
// `series`: edit a repeating task itself (from the Tasks "Repeating" section)
export function TaskForm({ task, series, initialTitle = '', initialSource = 'manual' }) {
  const colors = useColors();
  const styles = useStyles();
  const editing = !!task || !!series;
  const insets = useSafeAreaInsets();
  const { addTask, updateTask, deleteTask, load } = useTaskStore();
  const { tierRanges, budget } = usePoolStore();
  const voiceAvailable = useVoiceAvailable();
  const currency = budget.currencyCode;

  // The series this form is attached to, if any (inactive series behave like one-offs)
  const [ownSeries] = useState(() => {
    if (series) return series;
    if (task?.seriesId && task.seriesActive) return getSeries(task.seriesId);
    return null;
  });
  const isOccurrence = !!task && !!ownSeries;

  const initial = useMemo(() => {
    const source = series ?? task;
    return {
      title: source?.title ?? initialTitle,
      effort: source?.effortRating ?? 2,
      value: source ? toMoneyInput(source.monetaryValue) : '',
      rule: ownSeries ? ruleFromSeries(ownSeries) : defaultRule(),
    };
  }, [series, task, ownSeries, initialTitle]);

  const [title, setTitle] = useState(initial.title);
  const [effort, setEffort] = useState(initial.effort);
  const [value, setValue] = useState(initial.value);
  const [rule, setRule] = useState(initial.rule);
  const [source, setSource] = useState(task?.source ?? series?.source ?? initialSource);
  const [errors, setErrors] = useState({});
  const [warningDismissed, setWarningDismissed] = useState(false);
  const titleRef = useRef(null);
  const valueRef = useRef(null);
  const navigation = useNavigation();
  // Set when saving/deleting; closing happens after the re-render that lifts the discard guard
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (closing) router.back();
  }, [closing]);

  // Transcript coming back from Voice capture opened by the "Dictate task" mic
  useFocusEffect(
    useCallback(() => {
      const draft = useUiStore.getState().voiceDraft;
      if (draft) {
        setTitle(draft);
        setSource('voice');
        setErrors((e) => ({ ...e, title: null }));
        useUiStore.getState().setVoiceDraft(null);
      }
    }, [])
  );

  const range = tierRanges[effort - 1];
  const level = effortInfo(effort);
  const parsed = parseMoney(value);
  const money = (n) => formatMoney(n, currency);

  // Soft warning: above range only — under-paying yourself is never flagged
  const showWarning =
    !warningDismissed && range && Number.isFinite(parsed) && parsed > range[1] + 0.005;

  const ruleChanged = !sameRule(rule, initial.rule);
  const fieldsChanged = title !== initial.title || effort !== initial.effort || value !== initial.value;
  const dirty = fieldsChanged || ruleChanged;

  usePreventRemove(dirty && !closing, ({ data }) => {
    Alert.alert('Discard this task?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const ruleError = (r) =>
    r.frequency === 'weekly' && r.weekdays.length === 0 ? 'Pick at least one day.' : null;

  const blurValidate = (field) => {
    const err = field === 'title' ? validate.taskTitle(title) : validate.taskValue(value);
    setErrors((e) => ({ ...e, [field]: err }));
  };

  const finish = () => {
    load();
    usePoolStore.getState().refresh();
    setClosing(true);
  };

  // A new repeating task whose first date isn't today doesn't appear in the list
  // yet — say when it will, so it doesn't look lost
  const announceFirst = (r) => {
    const next = nextOccurrence(r);
    if (next && next.toDateString() !== new Date().toDateString()) {
      showToast(`${describeRule(r)}. First one: ${friendlyDate(next)}.`);
    } else {
      AccessibilityInfo.announceForAccessibility('Task added.');
    }
  };

  const submit = () => {
    const next = {
      title: validate.taskTitle(title),
      value: validate.taskValue(value),
      rule: ruleError(rule),
    };
    setErrors(next);
    // Button stays enabled; tapping it with errors moves focus to the first invalid field
    if (next.title) return titleRef.current?.focus();
    if (next.value) return valueRef.current?.focus();
    if (next.rule) return AccessibilityInfo.announceForAccessibility(next.rule);

    const fields = { title: title.trim(), monetaryValue: parsed, effortRating: effort };
    const repeating = rule.frequency !== 'never';

    // Editing the repeating task itself: always "this and future ones" from today
    if (series) {
      if (repeating) updateSeries(series.id, fields, rule);
      else stopSeries(series.id);
      return finish();
    }

    // New task
    if (!task) {
      if (repeating) {
        createSeries({ ...fields, source }, rule);
        announceFirst(rule);
      } else {
        addTask({ ...fields, source });
        AccessibilityInfo.announceForAccessibility('Task added.');
      }
      return finish();
    }

    // One occurrence of a repeating task
    if (isOccurrence) {
      // A schedule change can only apply going forward — no need to ask
      if (ruleChanged) {
        if (repeating) {
          updateSeries(ownSeries.id, fields, rule, { fromKey: task.dueDate });
        } else {
          stopSeries(ownSeries.id);
          updateTask(task.id, fields);
        }
        return finish();
      }
      if (!fieldsChanged) return finish();
      Alert.alert('Change repeating task?', 'Choose what this edit applies to.', [
        {
          text: 'Just this one',
          onPress: () => {
            updateTask(task.id, fields);
            finish();
          },
        },
        {
          text: 'This and future ones',
          onPress: () => {
            updateSeries(ownSeries.id, fields, rule, { fromKey: task.dueDate });
            finish();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return undefined;
    }

    // A one-off task, possibly being turned into a repeating one
    updateTask(task.id, fields);
    if (repeating) {
      createSeries({ ...fields, source: task.source }, rule, { attachTaskId: task.id });
      announceFirst(rule);
    }
    return finish();
  };

  const confirmDelete = () => {
    if (series) {
      Alert.alert('Stop repeating this task?', 'Tasks already on your list stay.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop repeating',
          style: 'destructive',
          onPress: () => {
            stopSeries(series.id);
            finish();
          },
        },
      ]);
      return;
    }
    if (isOccurrence) {
      Alert.alert('Delete this task?', 'This is a repeating task.', [
        {
          text: 'Just this one',
          style: 'destructive',
          onPress: () => {
            deleteTask(task.id);
            finish();
          },
        },
        {
          text: 'This and future ones',
          style: 'destructive',
          onPress: () => {
            stopSeries(ownSeries.id, { deleteFromKey: task.dueDate });
            finish();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert('Delete this task?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTask(task.id);
          finish();
        },
      },
    ]);
  };

  const mic = voiceAvailable ? (
    <Pressable
      onPress={() => router.push({ pathname: '/voice', params: { from: 'sheet' } })}
      accessibilityRole="button"
      accessibilityLabel="Dictate task"
      style={styles.mic}
    >
      <Icon name="mic" size={20} color={colors.accentText} />
    </Pressable>
  ) : null;

  const primaryLabel = editing
    ? 'Save changes'
    : `Add task${Number.isFinite(parsed) && parsed >= 0 ? ` · ${money(parsed)}` : ''}`;

  const sheetTitle = series ? 'Edit repeating task' : task ? 'Edit task' : 'New task';
  const repeatNote = isOccurrence || series ? 'Schedule changes apply from today on.' : undefined;

  return (
    // collapsable={false}: see SHEET_ROOT note in components/ui/Headers.js
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      collapsable={false}
    >
      <SheetHeader title={sheetTitle} onClose={() => router.back()} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          ref={titleRef}
          label="Task"
          placeholder="e.g. Fold laundry"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (errors.title && !validate.taskTitle(t)) setErrors((e) => ({ ...e, title: null }));
          }}
          onBlur={() => blurValidate('title')}
          error={errors.title}
          autoFocus={!editing && !initialTitle}
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={() => valueRef.current?.focus()}
          submitBehavior="submit"
          right={mic}
        />

        <EffortPicker
          value={effort}
          onChange={(lvl) => {
            setEffort(lvl);
            setWarningDismissed(false);
          }}
        />

        <MoneyField
          ref={valueRef}
          label="Value"
          currencyCode={currency}
          step={0.25}
          max={999.99}
          placeholder={range ? ((range[0] + range[1]) / 2).toFixed(2) : '1.00'}
          helper={range ? `Suggested for ${level.name} tasks today: ${money(range[0])}–${money(range[1])}` : undefined}
          value={value}
          onChangeText={(v) => {
            setValue(v);
            setWarningDismissed(false);
            if (errors.value && !validate.taskValue(v)) setErrors((e) => ({ ...e, value: null }));
          }}
          onBlur={() => blurValidate('value')}
          error={errors.value}
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        {showWarning && (
          <Banner
            tone="warning"
            body={`Higher than usual for a ${level.name} task. Totally fine — just checking.`}
            onDismiss={() => setWarningDismissed(true)}
            actions={[
              { label: `Keep ${money(parsed)}`, onPress: () => setWarningDismissed(true) },
              {
                label: `Use ${money(range[1])}`,
                primary: true,
                onPress: () => setValue(toMoneyInput(Math.floor(range[1] * 100) / 100)),
              },
            ]}
          />
        )}

        <RepeatPicker
          rule={rule}
          onChange={(r) => {
            setRule(r);
            if (errors.rule && !ruleError(r)) setErrors((e) => ({ ...e, rule: null }));
          }}
          error={errors.rule}
          note={repeatNote}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label={primaryLabel} onPress={submit} />
        {editing && (
          <Button
            label={series ? 'Stop repeating' : 'Delete task'}
            variant="danger"
            icon="trash"
            onPress={confirmDelete}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  form: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 24 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 4, backgroundColor: colors.surface },
  mic: {
    width: size.hit,
    height: size.hit,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
}));
