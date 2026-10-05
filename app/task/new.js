// app/task/new.js — S2 Add task (sheet). Voice capture hands its transcript in as params.
import { useLocalSearchParams } from 'expo-router';
import { TaskForm } from '../../components/TaskForm';

export default function NewTaskScreen() {
  const { title, source } = useLocalSearchParams();
  return <TaskForm initialTitle={title ?? ''} initialSource={source === 'voice' ? 'voice' : 'manual'} />;
}
