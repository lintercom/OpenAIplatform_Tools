import { PrismaClient } from '@prisma/client';
import { fetchDocPage, OPENAI_DOC_URLS } from './fetcher';

export class DocSync {
  constructor(private prisma: PrismaClient) {}

  /**
   * Synchronizuje všechny OpenAI dokumentační stránky
   */
  async syncAll(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    for (const url of OPENAI_DOC_URLS) {
      try {
        await this.syncUrl(url);
        synced++;
        console.log(`✓ Synced: ${url}`);
      } catch (error) {
        errors++;
        console.error(`✗ Error syncing ${url}:`, error instanceof Error ? error.message : error);
      }
    }

    return { synced, errors };
  }

  /**
   * Synchronizuje jednu URL
   */
  async syncUrl(url: string): Promise<void> {
    const docPage = await fetchDocPage(url);

    // Uložení každé sekce jako samostatný záznam
    for (const section of docPage.sections) {
      const existing = await this.prisma.openAIDoc.findFirst({
        where: {
          url: docPage.url,
          section: section.id,
        },
      });

      if (existing) {
        await this.prisma.openAIDoc.update({
          where: { id: existing.id },
          data: {
            title: docPage.title,
            text: section.content,
            metadata: docPage.metadata as any,
            updatedAt: new Date(),
          },
        });
      } else {
        await this.prisma.openAIDoc.create({
          data: {
            url: docPage.url,
            title: docPage.title,
            section: section.id,
            text: section.content,
            metadata: docPage.metadata as any,
          },
        });
      }
    }
  }

  /**
   * Vyhledá v dokumentaci
   */
  async search(query: string, limit: number = 10): Promise<Array<{
    url: string;
    title: string;
    section: string | null;
    text: string;
    relevance?: number;
  }>> {
    // Použití PostgreSQL full-text search
    const results = await this.prisma.$queryRaw<Array<{
      url: string;
      title: string;
      section: string | null;
      text: string;
      rank: number;
    }>>`
      SELECT 
        url,
        title,
        section,
        text,
        ts_rank(to_tsvector('english', title || ' ' || text), plainto_tsquery('english', ${query})) as rank
      FROM "OpenAIDoc"
      WHERE 
        to_tsvector('english', title || ' ' || text) @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      url: r.url,
      title: r.title,
      section: r.section,
      text: r.text,
      relevance: r.rank,
    }));
  }

  /**
   * Generuje prompt pack pro daný task
   */
  async generatePromptPack(task: string): Promise<string> {
    const searchResults = await this.search(task, 5);

    let prompt = `# OpenAI Platform Documentation Context\n\n`;
    prompt += `Task: ${task}\n\n`;
    prompt += `Relevant documentation:\n\n`;

    for (const result of searchResults) {
      prompt += `## ${result.title}\n`;
      prompt += `URL: ${result.url}\n`;
      if (result.section) {
        prompt += `Section: ${result.section}\n`;
      }
      prompt += `\n${result.text.substring(0, 500)}...\n\n`;
      prompt += `---\n\n`;
    }

    return prompt;
  }
}
