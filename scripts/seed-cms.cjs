// One-time migration from the checked-in CMS snapshots to Supabase.
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const snapshots = {
  menus: require(path.join(root, 'data/menus.json')),
  hero_slides: require(path.join(root, 'data/hero-slides.json')),
  content_blocks: require(path.join(root, 'data/content-blocks.json')),
  journal_articles: require(path.join(root, 'data/journal.json')),
  media_library: require(path.join(root, 'data/media-library.json')),
};
const fields = {
  menus: ['id', 'title', 'url', 'parent_id', 'sort_order', 'is_active', 'position', 'image_url', 'badge'],
  hero_slides: ['media_type', 'media_url', 'poster_url', 'title', 'subtitle', 'cta_label', 'cta_url', 'sort_order', 'is_active'],
  content_blocks: ['section_key', 'page', 'title', 'subtitle', 'description', 'media_url', 'media_type', 'badge'],
  journal_articles: ['title', 'slug', 'category', 'excerpt', 'content', 'cover_image', 'is_published', 'published_date'],
  media_library: ['name', 'url', 'type', 'size'],
};

async function run() {
  for (const [table, items] of Object.entries(snapshots)) {
    const { count, error: countError } = await client.from(table).select('id', { count: 'exact', head: true });
    if (countError) throw countError;
    if (count !== 0) {
      console.log(`${table}: skipped (${count} existing)`);
      continue;
    }
    const ids = new Map(items.map((item) => [item.id, randomUUID()]));
    const rows = items.map((item) => Object.fromEntries(fields[table]
      .filter((field) => field in item)
      .map((field) => [field, field === 'id' ? ids.get(item.id) : field === 'parent_id' ? (ids.get(item.parent_id) || null) : item[field]])));
    if (table === 'media_library') rows.forEach((row, index) => { row.type = items[index].type || items[index].file_type || 'image'; });
    if (table === 'menus') {
      const roots = rows.filter((row) => !row.parent_id);
      const children = rows.filter((row) => row.parent_id);
      for (const batch of [roots, children]) {
        const { error } = await client.from(table).insert(batch);
        if (error) throw error;
      }
    } else {
      const { error } = await client.from(table).insert(rows);
      if (error) throw error;
    }
    console.log(`${table}: inserted ${rows.length}`);
  }
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; });
