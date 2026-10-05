// app/task/[id].js — S3 Edit task (sheet). Completed tasks are read-only: their value
// has already been credited, so editing it would desync the pool.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TaskForm } from '../../components/TaskForm';
import { AppText } from '../../components/ui/AppText';
import { SheetHeader } from '../../components/ui/Headers';
import { getTask } from '../../store/taskStore';
import { useColors } from '../../theme/theme';

export default function EditTaskScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams();
  // Snapshot on open — the form owns edits from here
  const [task] = useState(() => getTask(id));

  if (!task || task.completionStatus !== 'pending') {
    return (
      <View>
        <SheetHeader title="Edit task" onClose={() => router.back()} />
        <AppText variant="body" color={colors.textMuted} style={styles.note}>
          {task ? 'Completed tasks can’t be edited.' : 'This task no longer exists.'}
        </AppText>
      </View>
    );
  }

  return <TaskForm task={task} />;
}

const styles = StyleSheet.create({ note: { paddingHorizontal: 20, paddingBottom: 32 } });
