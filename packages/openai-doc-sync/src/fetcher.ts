import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface DocPage {
  url: string;
  title: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  metadata?: {
    publishedAt?: string;
    updatedAt?: string;
    tags?: string[];
  };
}

/**
 * Fetche a parsuje HTML stránku z OpenAI dokumentace
 */
export async function fetchDocPage(url: string): Promise<DocPage> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extrakce title
    const title = $('title').text() || $('h1').first().text() || 'Untitled';

    // Extrakce hlavního obsahu
    const mainContent = $('main, article, .content, #content').first();
    if (mainContent.length === 0) {
      // Fallback na body
      const body = $('body');
      body.find('script, style, nav, header, footer').remove();
      return {
        url,
        title,
        sections: [
          {
            id: 'main',
            title: title,
            content: body.text().trim(),
          },
        ],
      };
    }

    // Extrakce sekcí
    const sections: Array<{ id: string; title: string; content: string }> = [];

    // Hlavní sekce (h1, h2, h3)
    mainContent.find('h1, h2, h3').each((_, el) => {
      const $el = $(el);
      const sectionId = $el.attr('id') || `section-${sections.length}`;
      const sectionTitle = $el.text().trim();
      
      // Najdi obsah sekce (až do dalšího nadpisu)
      let content = '';
      let current = $el.next();
      while (current.length > 0 && !current.is('h1, h2, h3')) {
        content += current.text().trim() + ' ';
        current = current.next();
      }

      if (sectionTitle && content.trim()) {
        sections.push({
          id: sectionId,
          title: sectionTitle,
          content: content.trim(),
        });
      }
    });

    // Pokud nejsou sekce, použij celý obsah
    if (sections.length === 0) {
      mainContent.find('script, style').remove();
      sections.push({
        id: 'main',
        title: title,
        content: mainContent.text().trim(),
      });
    }

    // Extrakce metadat
    const metadata: DocPage['metadata'] = {};
    const metaPublished = $('meta[property="article:published_time"]').attr('content');
    const metaUpdated = $('meta[property="article:modified_time"]').attr('content');
    if (metaPublished) metadata.publishedAt = metaPublished;
    if (metaUpdated) metadata.updatedAt = metaUpdated;

    return {
      url,
      title,
      sections,
      metadata,
    };
  } catch (error) {
    throw new Error(`Error fetching ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Seznam URL OpenAI dokumentace k synchronizaci
 */
export const OPENAI_DOC_URLS = [
  'https://platform.openai.com/docs/guides/agents',
  'https://platform.openai.com/docs/guides/agent-builder',
  'https://platform.openai.com/docs/guides/tools',
  'https://platform.openai.com/docs/guides/function-calling',
  'https://platform.openai.com/docs/guides/structured-outputs',
  'https://platform.openai.com/docs/api-reference/responses',
  'https://platform.openai.com/docs/api-reference/authentication',
];
