// components/TaskForm.js
// S2 / S3 — one form, three modes: new task, edit a task (one-off or one repeat
// occurrence), and edit a repeating task's series.
//
// Kept short on purpose: name, effort, value. The value fills itself in from your
// allowance (lib/valueSuggest.js) and follows the effort you pick until you change
// it yourself. Note, reminder and repeat sit behind "+" chips and only open when
// asked for (or when the task already has them). Soft warning per spec §6.3.
// Repeat edits ask "Just this one" / "This and future ones".
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createSeries, getSeries, stopSeries, updateSeries } from '../db/operations/recurring';
import { effortInfo } from '../lib/effort';
import { formatMoney, parseMoney, toMoneyInput } from '../lib/format';
import { describeRule, friendlyDate, nextOccurrence, parseDateKey, ruleFromSeries, sameRule } from '../lib/recurrence';
import { getReminderPermission, requestReminderPermission } from '../lib/reminders';
import {
  defaultReminderDate,
  parseRemindAt,
  parseRemindTime,
  toRemindAt,
  toRemindTime,
} from '../lib/taskReminder';
import { validate } from '../lib/validation';
import { isWellAboveSuggestion, suggestTaskValue } from '../lib/valueSuggest';
import { useVoiceAvailable } from '../lib/voiceInput';
import { usePoolStore } from '../store/poolStore';
import { useTaskStore } from '../store/taskStore';
import { showToast, useUiStore } from '../store/uiStore';
import { size } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { ReminderPicker } from './ReminderPicker';
import { RepeatPicker } from './RepeatPicker';
import { useKeyboardInset } from './useKeyboardInset';
import { Banner } from './ui/Banner';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { EffortPicker } from './ui/EffortPicker';
import { SheetHeader } from './ui/Headers';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';
import { MoneyField } from './ui/MoneyField';
import { TextField } from './ui/TextField';

const NOTE_MAX = 500;

const defaultRule = () => {
  const today = new Date();
  return { frequency: 'never', weekdays: [today.getDay()], monthDay: today.getDate() };
};

// The saved reminder as a Date for the picker: a one-off's date + time, or a
// repeating task's time (on today's date, which the picker ignores)
function initialReminder(source, ownSeries) {
  if (ownSeries?.remindTime && !source?.remindAt) {
    const t = parseRemindTime(ownSeries.remindTime);
    if (t) {
      const d = new Date();
      d.setHours(t.hour, t.minute, 0, 0);
      return d;
    }
  }
  return parseRemindAt(source?.remindAt);
}

// `task`: edit an existing task (a one-off, or one occurrence of a repeating task)
// `series`: edit a repeating task itself (from Tasks → Coming up)
export function TaskForm({ task, series, initialTitle = '', initialSource = 'manual' }) {
  const colors = useColors();
  const styles = useStyles();
  const editing = !!task || !!series;
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const { addTask, updateTask, updateCompletedTask, deleteTask, load } = useTaskStore();
  // A done task (from today): its value is already counted, so value and effort are
  // locked. You can still rename it, add a note, or make it repeat.
  const locked = task?.completionStatus === 'completed';
  const { dailyCap, pointsPerDay, budget } = usePoolStore();
  const voiceAvailable = useVoiceAvailable();
  const currency = budget.currencyCode;
  const suggestFor = useCallback(
    (lvl) => suggestTaskValue({ dailyGuide: dailyCap, pointsPerDay, effort: lvl }),
    [dailyCap, pointsPerDay]
  );

  // The series this form is attached to, if any (inactive series behave like one-offs)
  const [ownSeries] = useState(() => {
    if (series) return series;
    if (task?.seriesId && task.seriesActive) return getSeries(task.seriesId);
    return null;
  });
  const isOccurrence = !!task && !!ownSeries;

  const initial = useMemo(() => {
    const source = series ?? task;
    const effort = source?.effortRating ?? 2;
    return {
      title: source?.title ?? initialTitle,
      effort,
      // New tasks start with the suggested value, so typing a name is enough
      value: toMoneyInput(source ? source.monetaryValue : suggestFor(effort)),
      rule: ownSeries ? ruleFromSeries(ownSeries) : defaultRule(),
      notes: (series ? series.notes : task?.notes) ?? '',
      reminder: initialReminder(series ? null : task, series ?? (isOccurrence ? ownSeries : null)),
    };
    // Initial values only: later changes to the suggestion mustn't reset the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [title, setTitle] = useState(initial.title);
  const [effort, setEffort] = useState(initial.effort);
  const [value, setValue] = useState(initial.value);
  // Until the user types a value or uses the steppers, it follows the effort level
  const [valueTouched, setValueTouched] = useState(editing);
  const [rule, setRule] = useState(initial.rule);
  const [notes, setNotes] = useState(initial.notes);
  const [reminder, setReminder] = useState(initial.reminder);
  const [reminderBlocked, setReminderBlocked] = useState(false);
  // Which optional sections are open: anything the task already has, plus what was tapped
  const [open, setOpen] = useState(() => ({
    note: !!initial.notes,
    reminder: !!initial.reminder,
    repeat: initial.rule.frequency !== 'never',
  }));
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

  const level = effortInfo(effort);
  const suggested = suggestFor(effort);
  const parsed = parseMoney(value);
  const money = (n, opts) => formatMoney(n, currency, opts);
  const repeating = rule.frequency !== 'never';
  // Occurrences and series remind at a time on each due day; one-offs at a date + time
  const reminderTimeOnly = repeating || isOccurrence;

  const pickEffort = (lvl) => {
    setEffort(lvl);
    setWarningDismissed(false);
    if (!valueTouched) {
      setValue(toMoneyInput(suggestFor(lvl)));
      setErrors((e) => ({ ...e, value: null }));
    }
  };

  const changeValue = (v) => {
    // Blur reformats ("1.5" → "1.50"); only a real change stops the auto value
    if (parseMoney(v) !== parseMoney(value)) setValueTouched(true);
    setValue(v);
    setWarningDismissed(false);
    if (errors.value && !validate.taskValue(v)) setErrors((e) => ({ ...e, value: null }));
  };

  // Soft warning: well above the suggestion only — under-paying yourself is never flagged
  const showWarning = !warningDismissed && Number.isFinite(parsed) && isWellAboveSuggestion(parsed, suggested);

  const ruleChanged = !sameRule(rule, initial.rule);
  const reminderChanged = (reminder?.getTime() ?? null) !== (initial.reminder?.getTime() ?? null);
  const fieldsChanged =
    title !== initial.title ||
    effort !== initial.effort ||
    value !== initial.value ||
    notes !== initial.notes ||
    reminderChanged;
  // A new task with no name yet has nothing worth a "Discard?" prompt
  const dirty = editing ? fieldsChanged || ruleChanged : !!title.trim() || !!notes.trim() || ruleChanged;

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

  const openReminder = async () => {
    setOpen((o) => ({ ...o, reminder: true }));
    if (!reminder) setReminder(defaultReminderDate());
    // Ask at the moment it matters; if the answer is no, say so under the picker
    const granted = (await getReminderPermission()) === 'granted' || (await requestReminderPermission());
    setReminderBlocked(!granted);
  };

  const removeReminder = () => {
    setReminder(null);
    setReminderBlocked(false);
    setOpen((o) => ({ ...o, reminder: false }));
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

  // A one-off's remindAt; for one occurrence, its own due day at the picked time
  const remindAtFor = (dueKey) => {
    if (!reminder) return null;
    if (!dueKey) return toRemindAt(reminder);
    const d = parseDateKey(dueKey);
    d.setHours(reminder.getHours(), reminder.getMinutes(), 0, 0);
    return toRemindAt(d);
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

    const fields = {
      title: title.trim(),
      monetaryValue: parsed,
      effortRating: effort,
      notes: notes.trim() || null,
    };
    const seriesFields = { ...fields, remindTime: reminder ? toRemindTime(reminder) : null };

    // A done task: name + note, and optionally start repeating from today (the done
    // task becomes today's copy, so it isn't duplicated)
    if (locked) {
      updateCompletedTask(task.id, { title: fields.title, notes: fields.notes });
      if (repeating && !isOccurrence) {
        createSeries(
          { ...seriesFields, monetaryValue: task.monetaryValue, effortRating: task.effortRating, source: task.source },
          rule,
          { attachTaskId: task.id }
        );
        announceFirst(rule);
      }
      return finish();
    }

    // Editing the repeating task itself: always "this and future ones" from today
    if (series) {
      if (repeating) updateSeries(series.id, seriesFields, rule);
      else stopSeries(series.id);
      return finish();
    }

    // New task
    if (!task) {
      if (repeating) {
        createSeries({ ...seriesFields, source }, rule);
        announceFirst(rule);
      } else {
        addTask({ ...fields, source, remindAt: remindAtFor(null) });
        AccessibilityInfo.announceForAccessibility('Task added.');
      }
      return finish();
    }

    // One occurrence of a repeating task
    if (isOccurrence) {
      const justThisOne = () => updateTask(task.id, { ...fields, remindAt: remindAtFor(task.dueDate) });
      // A schedule change can only apply going forward — no need to ask
      if (ruleChanged) {
        if (repeating) {
          updateSeries(ownSeries.id, seriesFields, rule, { fromKey: task.dueDate });
        } else {
          stopSeries(ownSeries.id);
          justThisOne();
        }
        return finish();
      }
      if (!fieldsChanged) return finish();
      Alert.alert('Change repeating task?', 'Choose what this edit applies to.', [
        {
          text: 'Just this one',
          onPress: () => {
            justThisOne();
            finish();
          },
        },
        {
          text: 'This and future ones',
          onPress: () => {
            updateSeries(ownSeries.id, seriesFields, rule, { fromKey: task.dueDate });
            finish();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return undefined;
    }

    // A one-off task, possibly being turned into a repeating one
    if (repeating) {
      updateTask(task.id, fields);
      createSeries({ ...seriesFields, source: task.source }, rule, { attachTaskId: task.id });
      announceFirst(rule);
    } else {
      updateTask(task.id, { ...fields, remindAt: remindAtFor(null) });
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

  const valueHelper = valueTouched
    ? `Suggested for a ${level.name} task: ${money(suggested)}.`
    : `Suggested for a ${level.name} task. Keeps you on track to earn your ${money(budget.monthlyAllowanceCap, { trim: true })} this month.`;

  const extras = [
    !open.note && { key: 'note', label: 'Note', onPress: () => setOpen((o) => ({ ...o, note: true })) },
    !open.reminder && !locked && { key: 'reminder', label: 'Reminder', onPress: openReminder },
    !open.repeat && !(locked && isOccurrence) && {
      key: 'repeat',
      label: 'Repeat',
      onPress: () => {
        setOpen((o) => ({ ...o, repeat: true }));
        setRule((r) => ({ ...r, frequency: 'daily' }));
      },
    },
  ].filter(Boolean);

  return (
    // collapsable={false}: see SHEET_ROOT note in components/ui/Headers.js.
    // Bottom padding = the keyboard (iOS sheets), so the button stays above it.
    <View style={[styles.flex, { paddingBottom: keyboardInset }]} collapsable={false}>
      <SheetHeader title={sheetTitle} onClose={() => router.back()} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
          returnKeyType="done"
          onSubmitEditing={submit}
          submitBehavior="blurAndSubmit"
          right={mic}
        />

        {locked ? (
          <View
            style={styles.locked}
            accessible
            accessibilityLabel={`Earned ${money(task.monetaryValue)}, ${level.name} task. Already counted. Undo the task to change its value or effort.`}
          >
            <AppText variant="label">Value</AppText>
            <AppText variant="numeric" color={colors.accentText}>
              {money(task.monetaryValue, { signed: true })} · {level.name}
            </AppText>
            <AppText variant="small" color={colors.textMuted}>
              Already counted. Undo the task to change its value or effort.
            </AppText>
          </View>
        ) : (
          <>
            <EffortPicker value={effort} onChange={pickEffort} />

            <MoneyField
              ref={valueRef}
              label="Value"
              currencyCode={currency}
              step={0.25}
              max={999.99}
              placeholder={toMoneyInput(suggested)}
              helper={valueHelper}
              value={value}
              onChangeText={changeValue}
              onBlur={() => blurValidate('value')}
              error={errors.value}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </>
        )}

        {showWarning && !locked && (
          <Banner
            tone="warning"
            body={`Higher than usual for a ${level.name} task. Totally fine — just checking.`}
            onDismiss={() => setWarningDismissed(true)}
            actions={[
              { label: `Keep ${money(parsed)}`, onPress: () => setWarningDismissed(true) },
              {
                label: `Use ${money(suggested)}`,
                primary: true,
                onPress: () => {
                  setValue(toMoneyInput(suggested));
                  setValueTouched(false);
                },
              },
            ]}
          />
        )}

        {open.note && (
          <TextField
            label="Note"
            optional
            placeholder="Anything to remember about it"
            value={notes}
            onChangeText={(t) => setNotes(t.slice(0, NOTE_MAX))}
            multiline
            maxLength={NOTE_MAX}
            autoCapitalize="sentences"
            autoFocus={!initial.notes}
          />
        )}

        {open.reminder && reminder && (
          <ReminderPicker
            value={reminder}
            onChange={setReminder}
            onRemove={removeReminder}
            timeOnly={reminderTimeOnly}
            blocked={reminderBlocked}
          />
        )}

        {open.repeat && (
          <RepeatPicker
            rule={rule}
            onChange={(r) => {
              setRule(r);
              if (errors.rule && !ruleError(r)) setErrors((e) => ({ ...e, rule: null }));
            }}
            error={errors.rule}
            note={repeatNote}
          />
        )}

        {extras.length > 0 && (
          <View style={styles.extras} accessibilityRole="toolbar" accessibilityLabel="Add more">
            {extras.map((x) => (
              <Chip
                key={x.key}
                label={x.label}
                selected={false}
                onPress={x.onPress}
                accessibilityRole="button"
                accessibilityLabel={`Add ${x.label.toLowerCase()}`}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: keyboardInset ? 12 : Math.max(insets.bottom, 16) }]}>
        <Button label={primaryLabel} onPress={submit} />
        {editing && !locked && (
          <Button
            label={series ? 'Stop repeating' : 'Delete task'}
            variant="danger"
            icon="trash"
            onPress={confirmDelete}
          />
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  form: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 24 },
  extras: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  locked: { gap: 6 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 4, backgroundColor: colors.surface },
  mic: {
    width: size.hit,
    height: size.hit,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
}));
