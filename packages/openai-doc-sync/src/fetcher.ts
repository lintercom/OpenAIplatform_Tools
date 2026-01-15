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
    // Pro openai.github.io použijeme specifické selektory
    let mainContent = $('main, article, .content, #content').first();
    
    // Pro OpenAI Agents SDK dokumentaci (openai.github.io)
    if (url.includes('openai.github.io')) {
      mainContent = $('main, [role="main"], .main-content, article').first();
      if (mainContent.length === 0) {
        // Fallback na body bez navigace
        mainContent = $('body');
        mainContent.find('script, style, nav, header, footer, aside, .sidebar').remove();
      }
    }
    
    if (mainContent.length === 0) {
      // Fallback na body
      const body = $('body');
      body.find('script, style, nav, header, footer, aside, .sidebar').remove();
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
  // Platform documentation - Guides
  'https://platform.openai.com/docs/guides/agents',
  'https://platform.openai.com/docs/guides/agent-builder',
  'https://platform.openai.com/docs/guides/tools',
  'https://platform.openai.com/docs/guides/function-calling',
  'https://platform.openai.com/docs/guides/structured-outputs',
  // Platform documentation - API Reference
  'https://platform.openai.com/docs/api-reference/introduction',
  'https://platform.openai.com/docs/api-reference/authentication',
  'https://platform.openai.com/docs/api-reference/chat',
  'https://platform.openai.com/docs/api-reference/completions',
  'https://platform.openai.com/docs/api-reference/embeddings',
  'https://platform.openai.com/docs/api-reference/images',
  'https://platform.openai.com/docs/api-reference/audio',
  'https://platform.openai.com/docs/api-reference/batch',
  'https://platform.openai.com/docs/api-reference/files',
  'https://platform.openai.com/docs/api-reference/fine-tuning',
  'https://platform.openai.com/docs/api-reference/models',
  'https://platform.openai.com/docs/api-reference/moderations',
  'https://platform.openai.com/docs/api-reference/assistants',
  'https://platform.openai.com/docs/api-reference/threads',
  'https://platform.openai.com/docs/api-reference/messages',
  'https://platform.openai.com/docs/api-reference/runs',
  'https://platform.openai.com/docs/api-reference/vector-stores',
  'https://platform.openai.com/docs/api-reference/responses',
  // OpenAI Agents SDK documentation
  'https://openai.github.io/openai-agents-js/',
  'https://openai.github.io/openai-agents-js/quickstart',
  'https://openai.github.io/openai-agents-js/guides/agents',
  'https://openai.github.io/openai-agents-js/guides/running-agents',
  'https://openai.github.io/openai-agents-js/guides/results',
  'https://openai.github.io/openai-agents-js/guides/tools',
  'https://openai.github.io/openai-agents-js/guides/orchestrating-multiple-agents',
  'https://openai.github.io/openai-agents-js/guides/handoffs',
  'https://openai.github.io/openai-agents-js/guides/context-management',
  'https://openai.github.io/openai-agents-js/guides/sessions',
  'https://openai.github.io/openai-agents-js/guides/models',
  'https://openai.github.io/openai-agents-js/guides/guardrails',
  'https://openai.github.io/openai-agents-js/guides/streaming',
  'https://openai.github.io/openai-agents-js/guides/human-in-the-loop',
  'https://openai.github.io/openai-agents-js/guides/model-context-protocol-mcp',
  'https://openai.github.io/openai-agents-js/guides/tracing',
  'https://openai.github.io/openai-agents-js/guides/configuring-the-sdk',
  'https://openai.github.io/openai-agents-js/guides/troubleshooting',
];
