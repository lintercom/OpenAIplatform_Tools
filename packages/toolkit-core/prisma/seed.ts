import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tool definitions to seed
const tools = [
  { id: 'session.start', category: 'session', description: 'Vytvoří novou session' },
  { id: 'session.get', category: 'session', description: 'Získá informace o session' },
  { id: 'session.set_consent', category: 'session', description: 'Nastaví consent flags' },
  { id: 'lead.get_or_create', category: 'lead', description: 'Získá nebo vytvoří lead' },
  { id: 'lead.update', category: 'lead', description: 'Aktualizuje lead data' },
  { id: 'lead.set_stage', category: 'lead', description: 'Nastaví stage leadu' },
  { id: 'lead.add_tags', category: 'lead', description: 'Přidá tagy k leadu' },
  { id: 'lead.score', category: 'lead', description: 'Nastaví score leadu' },
  { id: 'event.track', category: 'event', description: 'Trackuje event' },
  { id: 'event.timeline', category: 'event', description: 'Získá timeline eventů' },
  { id: 'catalog.get_services', category: 'catalog', description: 'Získá seznam služeb' },
  { id: 'catalog.get_service', category: 'catalog', description: 'Získá detail služby' },
  { id: 'catalog.get_faq', category: 'catalog', description: 'Získá FAQ' },
  { id: 'template.render', category: 'template', description: 'Renderuje template' },
  { id: 'message.send_template', category: 'message', description: 'Odešle zprávu' },
  { id: 'message.send_for_review', category: 'message', description: 'Odešle ke schválení' },
  { id: 'crm.upsert_lead', category: 'crm', description: 'Synchronizuje lead do CRM' },
  { id: 'crm.create_task', category: 'crm', description: 'Vytvoří task v CRM' },
  { id: 'pricing.get_rules', category: 'pricing', description: 'Získá pricing rules' },
  { id: 'pricing.get_allowed_offer', category: 'pricing', description: 'Získá povolenou nabídku' },
  { id: 'verify.search', category: 'verify', description: 'Vyhledá informace' },
  { id: 'verify.fetch', category: 'verify', description: 'Načte obsah z URL' },
  { id: 'verify.extract', category: 'verify', description: 'Extrahuje data z URL' },
  { id: 'verify.compare', category: 'verify', description: 'Porovná data' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed tools
  console.log('📦 Seeding tools...');
  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { id: tool.id },
      update: { category: tool.category, description: tool.description },
      create: {
        id: tool.id,
        category: tool.category,
        description: tool.description,
        inputSchema: {},
        outputSchema: {},
      },
    });
  }

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
