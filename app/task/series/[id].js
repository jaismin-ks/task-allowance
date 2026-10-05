// app/task/series/[id].js — edit a repeating task itself (opened from Tasks → Repeating)
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TaskForm } from '../../../components/TaskForm';
import { AppText } from '../../../components/ui/AppText';
import { SheetHeader } from '../../../components/ui/Headers';
import { getSeries } from '../../../db/operations/recurring';
import { useColors } from '../../../theme/theme';

export default function EditSeriesScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams();
  const [series] = useState(() => getSeries(id));

  if (!series?.active) {
    return (
      <View>
        <SheetHeader title="Edit repeating task" onClose={() => router.back()} />
        <AppText variant="body" color={colors.textMuted} style={styles.note}>
          This task doesn’t repeat anymore.
        </AppText>
      </View>
    );
  }

  return <TaskForm series={series} />;
}

const styles = StyleSheet.create({ note: { paddingHorizontal: 20, paddingBottom: 32 } });
