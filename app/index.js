// app/index.js — redirect: onboarding until a profile exists, otherwise Tasks
import { Redirect } from 'expo-router';
import { getProfile } from '../db/operations/userProfile';

export default function Index() {
  return <Redirect href={getProfile() ? '/tasks' : '/onboarding'} />;
}
