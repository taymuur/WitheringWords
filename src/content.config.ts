import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    born: z.number().optional(),
    died: z.number().optional(),
    /**
     * true  → full short poems may be published
     * false → excerpts only (max ~8 lines), with a "find the book" link
     */
    publicDomain: z.boolean(),
    bio: z.string().optional(),
  }),
});

const poems = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/poems' }),
  schema: z
    .object({
      title: z.string(),
      author: reference('authors'),
      year: z.number().optional(),
      translator: z.string().optional(),
      /** The book or collection the poem appears in. */
      source: z.string().optional(),
      /**
       * 'public-domain' → full text allowed
       * 'excerpt'       → in-copyright: max ~8 lines, must link to the book
       */
      rights: z.enum(['public-domain', 'excerpt']),
      /** Where readers can find the full book. Required for excerpts. */
      findTheBook: z.string().url().optional(),
      moods: z.array(z.string()).default([]),
    })
    .superRefine((poem, ctx) => {
      if (poem.rights === 'excerpt') {
        if (!poem.findTheBook) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `"${poem.title}" is an excerpt and must include a findTheBook link.`,
          });
        }
        if (!poem.source) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `"${poem.title}" is an excerpt and must credit its source collection.`,
          });
        }
      }
    }),
});

export const collections = { authors, poems };
