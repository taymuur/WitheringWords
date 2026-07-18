import { readFileSync } from 'node:fs';
import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

/**
 * Build-time OpenGraph card per poem: the opening lines on sepia paper.
 * Rendered with the same EB Garamond the site reads in.
 */

const font = (file: string) =>
  readFileSync(`node_modules/@fontsource/eb-garamond/files/${file}`);

const regular = font('eb-garamond-latin-400-normal.woff');
const italic = font('eb-garamond-latin-400-italic.woff');
const medium = font('eb-garamond-latin-500-normal.woff');

export async function getStaticPaths() {
  const poems = await getCollection('poems');
  return poems.map((poem) => ({ params: { id: poem.id }, props: { poem } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { poem } = props;
  const author = await getEntry(poem.data.author);
  const lines = poem.body
    .trim()
    .split('\n')
    .filter((l: string) => l.trim())
    .slice(0, 3);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 84px',
          backgroundColor: '#faf6ef',
          color: '#3d3529',
          fontFamily: 'EB Garamond',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 54,
                      fontWeight: 500,
                      marginBottom: 40,
                      color: '#3d3529',
                    },
                    children: poem.data.title,
                  },
                },
                ...lines.map((line: string) => ({
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 38,
                      lineHeight: 1.5,
                      color: '#6f6353',
                      fontStyle: 'italic',
                    },
                    children: line,
                  },
                })),
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 38, color: '#6f6353' },
                    children: '…',
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '1px solid #e0d6c3',
                paddingTop: 28,
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 34, color: '#9c6644' },
                    children: `${author?.data.name ?? ''}${poem.data.year ? ` · ${poem.data.year}` : ''}`,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 28,
                      color: '#6f6353',
                      letterSpacing: 3,
                    },
                    children: 'WITHERING WORDS',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'EB Garamond', data: regular, weight: 400, style: 'normal' },
        { name: 'EB Garamond', data: italic, weight: 400, style: 'italic' },
        { name: 'EB Garamond', data: medium, weight: 500, style: 'normal' },
      ],
    }
  );

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  }).render();
  return new Response(new Uint8Array(png.asPng()), {
    headers: { 'Content-Type': 'image/png' },
  });
};
