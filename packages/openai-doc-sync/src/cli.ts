#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { DocSync } from './sync';
import { APIReferenceHelper } from './api-reference-helper';

const prisma = new PrismaClient();
const docSync = new DocSync(prisma);
const apiHelper = new APIReferenceHelper(prisma);

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
    } else if (command === 'api-endpoints') {
      console.log('📚 Available OpenAI API endpoints:\n');
      const endpoints = await apiHelper.listAvailableEndpoints();
      endpoints.forEach((endpoint) => console.log(`  - ${endpoint}`));
    } else if (command === 'api-docs') {
      const endpoint = args[0];
      if (!endpoint) {
        console.error('Usage: docs-api-docs <endpoint>');
        console.error('Example: docs-api-docs chat');
        process.exit(1);
      }
      console.log(`📖 Documentation for endpoint: ${endpoint}\n`);
      const docs = await apiHelper.getEndpointDocs(endpoint);
      if (docs.length === 0) {
        console.log('No documentation found for this endpoint.');
      } else {
        docs.forEach((doc, idx) => {
          console.log(`${idx + 1}. ${doc.title}`);
          console.log(`   URL: ${doc.url}`);
          console.log(`   ${doc.content.substring(0, 200)}...\n`);
        });
      }
    } else if (command === 'api-examples') {
      const endpoint = args[0];
      if (!endpoint) {
        console.error('Usage: docs-api-examples <endpoint>');
        process.exit(1);
      }
      console.log(`💡 Code examples for: ${endpoint}\n`);
      const examples = await apiHelper.getAPIExamples(endpoint);
      console.log(examples);
    } else if (command === 'api-tool-prompt') {
      const endpoint = args[0];
      const purpose = args.slice(1).join(' ') || 'Tool for OpenAI API integration';
      if (!endpoint) {
        console.error('Usage: docs-api-tool-prompt <endpoint> [purpose]');
        process.exit(1);
      }
      console.log(`🔧 Generating tool creation prompt for: ${endpoint}\n`);
      const prompt = await apiHelper.generateToolCreationPrompt(endpoint, purpose);
      console.log(prompt);
    } else {
      console.log('Usage:');
      console.log('  docs-sync                    - Sync all OpenAI documentation');
      console.log('  docs-search <query>          - Search documentation');
      console.log('  docs-prompt-pack <task>      - Generate prompt pack for task');
      console.log('  docs-api-endpoints          - List available API endpoints');
      console.log('  docs-api-docs <endpoint>     - Get docs for API endpoint');
      console.log('  docs-api-examples <endpoint> - Get code examples for endpoint');
      console.log('  docs-api-tool-prompt <endpoint> [purpose] - Generate tool creation prompt');
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
