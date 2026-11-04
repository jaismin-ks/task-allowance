// app/task/new.js — S2 Add task (sheet). Voice capture hands its transcript in as
// params; the Calendar hands in the day it was opened from.
import { useLocalSearchParams } from 'expo-router';
import { TaskForm } from '../../components/TaskForm';

export default function NewTaskScreen() {
  const { title, source, day } = useLocalSearchParams();
  return (
    <TaskForm
      initialTitle={title ?? ''}
      initialSource={source === 'voice' ? 'voice' : 'manual'}
      initialDay={typeof day === 'string' ? day : null}
    />
  );
}
