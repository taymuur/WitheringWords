import rss from '@astrojs/rss';
import { getCollection, getEntry } from 'astro:content';

export async function GET(context) {
  const poems = (await getCollection('poems')).sort((a, b) =>
    a.data.title.localeCompare(b.data.title)
  );
  const items = await Promise.all(
    poems.map(async (poem) => {
      const author = await getEntry(poem.data.author);
      return {
        title: poem.data.title,
        link: `/poems/${poem.id}/`,
        description: `${author?.data.name ?? 'Unknown'}${poem.data.year ? `, ${poem.data.year}` : ''} — ${poem.body.trim().split('\n')[0]}`,
      };
    })
  );
  return rss({
    title: 'Withering Words',
    description: 'A quiet place to read poems.',
    site: context.site,
    items,
  });
}
