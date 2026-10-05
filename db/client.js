// db/client.js
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

export const sqlite = openDatabaseSync('taskallowance.db');
export const db = drizzle(sqlite, { schema });