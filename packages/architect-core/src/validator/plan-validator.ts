/**
 * Plan Validator
 * 
 * Validuje completeness, policy, budgets
 */

import {
  Blueprint,
  BlueprintSchema,
  ToolTopology,
  ToolTopologySchema,
  WorkflowCatalog,
  WorkflowCatalogSchema,
  ImplementationPlan,
  ImplementationPlanSchema,
  DecisionRecord,
  DecisionRecordSchema,
} from '../schemas';
import { RegistryClient } from '../registry-client';

export interface ValidationError {
  type: 'schema' | 'completeness' | 'policy' | 'budget';
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Plan Validator
 * 
 * Validuje všechny artefakty
 */
export class PlanValidator {
  constructor(private registryClient: RegistryClient) {}

  /**
   * Validuje blueprint
   */
  validateBlueprint(blueprint: Blueprint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Schema validation
    try {
      BlueprintSchema.parse(blueprint);
    } catch (error: any) {
      errors.push({
        type: 'schema',
        message: `Blueprint schema validation failed: ${error.message}`,
      });
      return { valid: false, errors, warnings };
    }

    // Completeness checks
    if (blueprint.modules.length === 0) {
      errors.push({
        type: 'completeness',
        message: 'Blueprint must have at least one module',
      });
    }

    // Check entity references
    for (const module of blueprint.modules) {
      for (const entityId of module.entities) {
        if (!blueprint.entities.find((e) => e.id === entityId)) {
          errors.push({
            type: 'completeness',
            message: `Module ${module.id} references non-existent entity ${entityId}`,
            path: `modules.${module.id}.entities`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validuje tool topology
   */
  validateToolTopology(topology: ToolTopology): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Schema validation
    try {
      ToolTopologySchema.parse(topology);
    } catch (error: any) {
      errors.push({
        type: 'schema',
        message: `Tool topology schema validation failed: ${error.message}`,
      });
      return { valid: false, errors, warnings };
    }

    // Check tool existence in registry
    for (const tool of topology.tools) {
      const registryTool = this.registryClient.getTool(tool.id);
      if (!registryTool) {
        warnings.push({
          type: 'completeness',
          message: `Tool ${tool.id} not found in registry`,
          path: `tools.${tool.id}`,
        });
      }
    }

    // Check dependencies
    for (const dep of topology.dependencies) {
      const fromExists = topology.tools.some((t) => t.id === dep.from);
      const toExists = topology.tools.some((t) => t.id === dep.to);

      if (!fromExists) {
        errors.push({
          type: 'completeness',
          message: `Dependency references non-existent tool: ${dep.from}`,
          path: `dependencies`,
        });
      }

      if (!toExists) {
        errors.push({
          type: 'completeness',
          message: `Dependency references non-existent tool: ${dep.to}`,
          path: `dependencies`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validuje workflow catalog
   */
  validateWorkflowCatalog(catalog: WorkflowCatalog): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Schema validation
    try {
      WorkflowCatalogSchema.parse(catalog);
    } catch (error: any) {
      errors.push({
        type: 'schema',
        message: `Workflow catalog schema validation failed: ${error.message}`,
      });
      return { valid: false, errors, warnings };
    }

    // Check tool references
    for (const workflow of catalog.workflows) {
      for (const step of workflow.steps) {
        const tool = this.registryClient.getTool(step.toolId);
        if (!tool) {
          warnings.push({
            type: 'completeness',
            message: `Workflow ${workflow.id} step ${step.id} references non-existent tool: ${step.toolId}`,
            path: `workflows.${workflow.id}.steps.${step.id}`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validuje implementation plan
   */
  validateImplementationPlan(plan: ImplementationPlan): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Schema validation
    try {
      ImplementationPlanSchema.parse(plan);
    } catch (error: any) {
      errors.push({
        type: 'schema',
        message: `Implementation plan schema validation failed: ${error.message}`,
      });
      return { valid: false, errors, warnings };
    }

    // Completeness checks
    if (plan.epics.length === 0) {
      errors.push({
        type: 'completeness',
        message: 'Implementation plan must have at least one epic',
      });
    }

    // Check story dependencies
    for (const epic of plan.epics) {
      for (const story of epic.stories) {
        if (story.dependsOn) {
          for (const depId of story.dependsOn) {
            const depExists = epic.stories.some((s) => s.id === depId) ||
              plan.epics.some((e) => e.stories.some((s) => s.id === depId));
            if (!depExists) {
              warnings.push({
                type: 'completeness',
                message: `Story ${story.id} depends on non-existent story: ${depId}`,
                path: `epics.${epic.id}.stories.${story.id}`,
              });
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validuje decision records
   */
  validateDecisionRecords(adrs: DecisionRecord[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    for (const adr of adrs) {
      try {
        DecisionRecordSchema.parse(adr);
      } catch (error: any) {
        errors.push({
          type: 'schema',
          message: `ADR ${adr.id} schema validation failed: ${error.message}`,
          path: `adrs.${adr.id}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
