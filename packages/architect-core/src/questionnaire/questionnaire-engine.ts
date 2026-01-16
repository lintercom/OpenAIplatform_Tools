/**
 * Questionnaire Engine
 * 
 * Spravuje dotazování a shromažďování informací pro Project Brief
 */

import { ProjectBrief, ProjectBriefSchema } from '../schemas/project-brief';
import { z } from 'zod';

export type QuestionType = 'text' | 'choice' | 'multi-choice' | 'number' | 'boolean';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  choices?: string[];
  condition?: (brief: Partial<ProjectBrief>) => boolean; // Kdy se ptát
  field: string; // Kde uložit odpověď (dot notation, např. "goals.0")
  hint?: string;
}

/**
 * Questionnaire Engine
 * 
 * Spravuje dotazování
 */
export class QuestionnaireEngine {
  private questions: Question[] = [];

  constructor() {
    this.initializeQuestions();
  }

  /**
   * Získá další otázku na základě aktuálního briefu
   */
  getNextQuestion(brief: Partial<ProjectBrief>): Question | null {
    for (const question of this.questions) {
      // Zkontrolovat, zda je otázka již zodpovězená
      if (this.isAnswered(question, brief)) {
        continue;
      }

      // Zkontrolovat podmínku
      if (question.condition && !question.condition(brief)) {
        continue;
      }

      // Zkontrolovat, zda je required
      if (question.required) {
        return question;
      }
    }

    return null;
  }

  /**
   * Zkontroluje, zda je otázka zodpovězená
   */
  private isAnswered(question: Question, brief: Partial<ProjectBrief>): boolean {
    const fieldParts = question.field.split('.');
    let value: unknown = brief;

    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return false;
      }
    }

    if (value === undefined || value === null) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return true;
  }

  /**
   * Zkontroluje, zda je brief kompletní
   */
  isComplete(brief: Partial<ProjectBrief>): boolean {
    return this.getNextQuestion(brief) === null;
  }

  /**
   * Validuje brief
   */
  validate(brief: Partial<ProjectBrief>): {
    valid: boolean;
    errors: string[];
  } {
    try {
      ProjectBriefSchema.parse(brief);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Inicializuje seznam otázek
   */
  private initializeQuestions(): void {
    this.questions = [
      {
        id: 'name',
        text: 'Jaký je název projektu?',
        type: 'text',
        required: true,
        field: 'name',
      },
      {
        id: 'description',
        text: 'Popište, co chcete vytvořit.',
        type: 'text',
        required: true,
        field: 'description',
      },
      {
        id: 'goals',
        text: 'Jaké jsou hlavní cíle projektu? (můžete uvést více)',
        type: 'multi-choice',
        required: true,
        field: 'goals',
      },
      {
        id: 'domain',
        text: 'V jaké doméně projekt funguje? (např. e-commerce, CRM, ERP)',
        type: 'text',
        required: false,
        field: 'domain',
      },
      {
        id: 'integrations',
        text: 'Potřebujete integraci s externími systémy? (např. POHODA, CRM, platební brány)',
        type: 'boolean',
        required: false,
        field: 'integrations',
        condition: (brief) => brief.domain === 'e-commerce' || brief.domain === 'erp',
      },
      {
        id: 'realtime',
        text: 'Potřebujete real-time funkcionalitu? (např. live chat, notifikace)',
        type: 'boolean',
        required: false,
        field: 'realtime.required',
      },
      {
        id: 'budget',
        text: 'Jaký je maximální rozpočet na měsíc? (v USD)',
        type: 'number',
        required: false,
        field: 'constraints.budget.maxCostPerMonth',
      },
      {
        id: 'security',
        text: 'Jaký typ autentizace potřebujete?',
        type: 'choice',
        required: false,
        choices: ['none', 'api-key', 'oauth', 'sso'],
        field: 'security.authentication',
      },
      {
        id: 'pii',
        text: 'Jak budete zacházet s osobními údaji (PII)?',
        type: 'choice',
        required: false,
        choices: ['none', 'redact', 'encrypt', 'isolate'],
        field: 'security.piiHandling',
      },
      {
        id: 'personalization',
        text: 'Potřebujete personalizaci obsahu?',
        type: 'boolean',
        required: false,
        field: 'uxNeeds.personalization',
      },
      {
        id: 'recommendations',
        text: 'Potřebujete doporučovací systém?',
        type: 'boolean',
        required: false,
        field: 'uxNeeds.recommendations',
      },
      {
        id: 'natural-language',
        text: 'Potřebujete přirozený jazyk (chat, dotazy)?',
        type: 'boolean',
        required: false,
        field: 'uxNeeds.naturalLanguage',
      },
    ];
  }
}
