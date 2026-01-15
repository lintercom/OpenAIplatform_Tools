#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { DocSync } from './sync';

const prisma = new PrismaClient();
const docSync = new DocSync(prisma);

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    if (command === 'sync') {
      console.log('🔄 Synchronizing OpenAI documentation...\n');
      const result = await docSync.syncAll();
      console.log(`\n✅ Synced: ${result.synced}, Errors: ${result.errors}`);
    } else if (command === 'search') {
      const query = args[0];
      if (!query) {
        console.error('Usage: docs-search <query>');
        process.exit(1);
      }
      console.log(`🔍 Searching for: "${query}"\n`);
      const results = await docSync.search(query, 10);
      if (results.length === 0) {
        console.log('No results found.');
      } else {
        results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title}`);
          console.log(`   URL: ${result.url}`);
          if (result.section) {
            console.log(`   Section: ${result.section}`);
          }
          console.log(`   ${result.text.substring(0, 200)}...\n`);
        });
      }
    } else if (command === 'prompt-pack') {
      const task = args.join(' ');
      if (!task) {
        console.error('Usage: docs-prompt-pack <task description>');
        process.exit(1);
      }
      console.log(`📦 Generating prompt pack for: "${task}"\n`);
      const prompt = await docSync.generatePromptPack(task);
      console.log(prompt);
    } else {
      console.log('Usage:');
      console.log('  docs-sync              - Sync all OpenAI documentation');
      console.log('  docs-search <query>    - Search documentation');
      console.log('  docs-prompt-pack <task> - Generate prompt pack for task');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
