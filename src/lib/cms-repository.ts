import { isSupabaseConfigured, supabaseAdmin } from './supabase';

type Table = 'menus' | 'hero_slides' | 'content_blocks' | 'journal_articles' | 'media_library';

function client() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase CMS is not configured');
  return supabaseAdmin;
}

export async function listCms<T>(table: Table, snapshot: T[]): Promise<T[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return snapshot;
  try {
    const { data, error } = await client().from(table).select('*');
    if (error) throw error;
    return data as T[];
  } catch (error) {
    console.error(`[cms] ${table} read failed`, error);
    throw error;
  }
}

export async function insertCms<T>(table: Table, value: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().from(table).insert(value).select('*').single();
  if (error) throw error;
  return data as T;
}

export async function updateCms<T>(table: Table, id: string, value: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await client().from(table).update(value).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data as T | null;
}

export async function deleteCms(table: Table, id: string): Promise<boolean> {
  const { data, error } = await client().from(table).delete().eq('id', id).select('id');
  if (error) throw error;
  return Boolean(data?.length);
}
