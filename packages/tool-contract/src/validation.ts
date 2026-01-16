import { z } from 'zod';
import { ToolContract, ToolRiskLevel, PIILevel, IdempotencyLevel } from './types';

/**
 * Validace Tool Contract
 */
export class ToolContractValidator {
  /**
   * Validuje tool contract
   */
  static validate(contract: ToolContract): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validace základních polí
    if (!contract.id || typeof contract.id !== 'string') {
      errors.push('Tool contract must have a valid id');
    }

    if (!contract.name || typeof contract.name !== 'string') {
      errors.push('Tool contract must have a valid name');
    }

    if (!contract.version || typeof contract.version !== 'string') {
      errors.push('Tool contract must have a valid version');
    }

    // Validace version formátu (semver)
    if (contract.version && !/^\d+\.\d+\.\d+/.test(contract.version)) {
      errors.push(`Version "${contract.version}" is not valid semver format`);
    }

    if (!contract.description || typeof contract.description !== 'string') {
      errors.push('Tool contract must have a valid description');
    }

    if (!contract.category || typeof contract.category !== 'string') {
      errors.push('Tool contract must have a valid category');
    }

    // Validace enums
    if (!Object.values(ToolRiskLevel).includes(contract.riskLevel)) {
      errors.push(`Invalid riskLevel: ${contract.riskLevel}`);
    }

    if (!Object.values(PIILevel).includes(contract.piiLevel)) {
      errors.push(`Invalid piiLevel: ${contract.piiLevel}`);
    }

    if (!Object.values(IdempotencyLevel).includes(contract.idempotency)) {
      errors.push(`Invalid idempotency: ${contract.idempotency}`);
    }

    // Validace schemas
    if (!contract.inputSchema || !(contract.inputSchema instanceof z.ZodType)) {
      errors.push('Tool contract must have a valid Zod inputSchema');
    }

    if (!contract.outputSchema || !(contract.outputSchema instanceof z.ZodType)) {
      errors.push('Tool contract must have a valid Zod outputSchema');
    }

    // Validace handleru
    if (!contract.handler || typeof contract.handler !== 'function') {
      errors.push('Tool contract must have a valid handler function');
    }

    // Validace rate limits
    if (contract.rateLimits) {
      if (contract.rateLimits.maxCalls <= 0) {
        errors.push('rateLimits.maxCalls must be greater than 0');
      }
      if (contract.rateLimits.windowMs <= 0) {
        errors.push('rateLimits.windowMs must be greater than 0');
      }
    }

    // Validace cost profile
    if (contract.costProfile) {
      if (
        contract.costProfile.estimatedCostPerCall !== undefined &&
        contract.costProfile.estimatedCostPerCall < 0
      ) {
        errors.push('costProfile.estimatedCostPerCall must be >= 0');
      }
      if (
        contract.costProfile.maxCostPerCall !== undefined &&
        contract.costProfile.maxCostPerCall < 0
      ) {
        errors.push('costProfile.maxCostPerCall must be >= 0');
      }
    }

    // Validace examples
    if (contract.examples) {
      contract.examples.forEach((example, index) => {
        if (!example.name) {
          errors.push(`Example ${index} must have a name`);
        }
        if (example.input === undefined) {
          errors.push(`Example ${index} must have an input`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validuje input podle schema
   */
  static validateInput<TInput>(
    contract: ToolContract<TInput>,
    input: unknown
  ): { valid: boolean; data?: TInput; error?: string } {
    try {
      const data = contract.inputSchema.parse(input);
      return { valid: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          error: `Validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
        };
      }
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  /**
   * Validuje output podle schema
   */
  static validateOutput<TOutput>(
    contract: ToolContract<TOutput>,
    output: unknown
  ): { valid: boolean; data?: TOutput; error?: string } {
    try {
      const data = contract.outputSchema.parse(output);
      return { valid: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          error: `Output validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
        };
      }
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }
}
