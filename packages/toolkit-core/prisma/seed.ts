import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Sample catalog services
  await prisma.catalogService.createMany({
    data: [
      {
        id: 'service-1',
        name: 'Konzultace',
        description: 'Hodinová konzultace s expertem',
        category: 'consulting',
        price: 2000,
      },
      {
        id: 'service-2',
        name: 'Implementace',
        description: 'Kompletní implementace řešení',
        category: 'implementation',
        price: 50000,
      },
      {
        id: 'service-3',
        name: 'Podpora',
        description: 'Měsíční podpora a údržba',
        category: 'support',
        price: 10000,
      },
    ],
    skipDuplicates: true,
  });

  // Sample FAQs
  await prisma.catalogFAQ.createMany({
    data: [
      {
        id: 'faq-1',
        question: 'Jak dlouho trvá implementace?',
        answer: 'Implementace obvykle trvá 2-4 týdny v závislosti na složitosti projektu.',
        category: 'general',
      },
      {
        id: 'faq-2',
        question: 'Jaká je cena?',
        answer: 'Cena závisí na konkrétních požadavcích. Kontaktujte nás pro cenovou nabídku.',
        category: 'pricing',
      },
      {
        id: 'faq-3',
        question: 'Poskytujete podporu?',
        answer: 'Ano, poskytujeme různé úrovně podpory podle vašich potřeb.',
        category: 'support',
      },
    ],
    skipDuplicates: true,
  });

  // Sample templates
  await prisma.template.createMany({
    data: [
      {
        id: 'template-welcome',
        name: 'welcome',
        type: 'email',
        content: 'Vítejte, {{leadName}}! Děkujeme za váš zájem o naše služby.',
        variables: { leadName: 'string' },
      },
      {
        id: 'template-followup',
        name: 'followup',
        type: 'email',
        content: 'Dobrý den {{leadName}}, rádi bychom vám připomněli naši nabídku pro {{serviceName}}.',
        variables: { leadName: 'string', serviceName: 'string' },
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
