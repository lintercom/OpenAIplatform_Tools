/**
 * Delivery Planner
 * 
 * Fáze 3: Z dependency graphu vygeneruje ImplementationPlan
 */

import { ImplementationPlan, Epic, Story, Task } from '../schemas/implementation-plan';
import { ProjectBrief } from '../schemas/project-brief';
import { ToolTopology } from '../schemas/tool-topology';
import { WorkflowCatalog } from '../schemas/workflow-catalog';
import { CapabilityPlan } from './capability-planner';

/**
 * Delivery Planner
 * 
 * Plánuje implementaci (epics/stories/tasks)
 */
export class DeliveryPlanner {
  /**
   * Vytvoří Implementation Plan
   */
  createImplementationPlan(
    brief: ProjectBrief,
    capabilityPlan: CapabilityPlan,
    topology: ToolTopology,
    workflows: WorkflowCatalog
  ): ImplementationPlan {
    const epics: Epic[] = [];

    // Epic 1: Core Infrastructure
    epics.push(this.createInfrastructureEpic(brief, capabilityPlan));

    // Epic 2: Tools Implementation
    epics.push(this.createToolsEpic(capabilityPlan, topology));

    // Epic 3: Workflows
    epics.push(this.createWorkflowsEpic(workflows));

    // Epic 4: Integrations
    if (brief.integrations && brief.integrations.length > 0) {
      epics.push(this.createIntegrationsEpic(brief));
    }

    // Risks
    const risks = this.identifyRisks(brief, capabilityPlan);

    return {
      id: `plan-${brief.id}`,
      name: `${brief.name} Implementation Plan`,
      description: `Implementation plan for ${brief.name}`,
      version: '1.0.0',
      epics,
      risks,
    };
  }

  private createInfrastructureEpic(
    brief: ProjectBrief,
    capabilityPlan: CapabilityPlan
  ): Epic {
    const stories: Story[] = [];

    stories.push({
      id: 'story-infra-1',
      name: 'Database Setup',
      description: 'Set up database schema and migrations',
      type: 'technical-debt',
      priority: 'critical',
      tasks: [
        {
          id: 'task-infra-1-1',
          name: 'Create Prisma schema',
          description: 'Define database schema',
          type: 'development',
          estimatedHours: 4,
          acceptanceCriteria: [
            {
              id: 'ac-1',
              description: 'Schema includes all required entities',
              testable: true,
            },
          ],
        },
      ],
      acceptanceCriteria: [
        {
          id: 'ac-infra-1',
          description: 'Database schema is defined and migrations run successfully',
          testable: true,
        },
      ],
      definitionOfDone: [
        'Schema defined',
        'Migrations created',
        'Migrations tested',
      ],
    });

    return {
      id: 'epic-infrastructure',
      name: 'Core Infrastructure',
      description: 'Set up core infrastructure and database',
      goal: 'Establish foundation for the system',
      priority: 'critical',
      stories,
      iteration: 'mvp',
    };
  }

  private createToolsEpic(
    capabilityPlan: CapabilityPlan,
    topology: ToolTopology
  ): Epic {
    const stories: Story[] = [];

    // Story pro každý nový tool
    for (const toolSpec of capabilityPlan.newToolSpecs) {
      stories.push({
        id: `story-tool-${toolSpec.id}`,
        name: `Implement ${toolSpec.name}`,
        description: toolSpec.description,
        type: 'feature',
        priority: 'high',
        tasks: [
          {
            id: `task-tool-${toolSpec.id}-1`,
            name: 'Create tool contract',
            description: 'Define tool contract with schema',
            type: 'development',
            estimatedHours: 2,
            acceptanceCriteria: [
              {
                id: `ac-tool-${toolSpec.id}-1`,
                description: 'Tool contract is valid',
                testable: true,
              },
            ],
          },
          {
            id: `task-tool-${toolSpec.id}-2`,
            name: 'Implement tool handler',
            description: 'Implement tool business logic',
            type: 'development',
            estimatedHours: toolSpec.estimatedComplexity === 'high' ? 8 : toolSpec.estimatedComplexity === 'medium' ? 4 : 2,
            dependsOn: [`task-tool-${toolSpec.id}-1`],
            acceptanceCriteria: [
              {
                id: `ac-tool-${toolSpec.id}-2`,
                description: 'Tool handler passes all tests',
                testable: true,
              },
            ],
          },
        ],
        acceptanceCriteria: [
          {
            id: `ac-tool-${toolSpec.id}`,
            description: `Tool ${toolSpec.name} is implemented and tested`,
            testable: true,
          },
        ],
        definitionOfDone: [
          'Tool contract defined',
          'Tool handler implemented',
          'Tests written',
          'Tests passing',
          'Documentation updated',
        ],
      });
    }

    return {
      id: 'epic-tools',
      name: 'Tools Implementation',
      description: 'Implement all required tools',
      goal: 'Have all tools available in registry',
      priority: 'high',
      stories,
      iteration: 'mvp',
    };
  }

  private createWorkflowsEpic(workflows: WorkflowCatalog): Epic {
    const stories: Story[] = [];

    for (const workflow of workflows.workflows) {
      stories.push({
        id: `story-workflow-${workflow.id}`,
        name: `Implement ${workflow.name}`,
        description: workflow.description,
        type: 'feature',
        priority: 'high',
        tasks: [
          {
            id: `task-workflow-${workflow.id}-1`,
            name: 'Create workflow definition',
            description: 'Define workflow steps and triggers',
            type: 'development',
            estimatedHours: 2,
            acceptanceCriteria: [
              {
                id: `ac-workflow-${workflow.id}-1`,
                description: 'Workflow definition is valid',
                testable: true,
              },
            ],
          },
        ],
        acceptanceCriteria: [
          {
            id: `ac-workflow-${workflow.id}`,
            description: `Workflow ${workflow.name} is implemented`,
            testable: true,
          },
        ],
        definitionOfDone: [
          'Workflow defined',
          'Workflow tested',
          'Documentation updated',
        ],
      });
    }

    return {
      id: 'epic-workflows',
      name: 'Workflows Implementation',
      description: 'Implement all workflows',
      goal: 'Have all workflows functional',
      priority: 'high',
      stories,
      iteration: 'mvp',
    };
  }

  private createIntegrationsEpic(brief: ProjectBrief): Epic {
    const stories: Story[] = [];

    for (const integration of brief.integrations || []) {
      stories.push({
        id: `story-integration-${integration.name.toLowerCase()}`,
        name: `Integrate with ${integration.name}`,
        description: integration.description,
        type: 'feature',
        priority: integration.required ? 'high' : 'medium',
        tasks: [
          {
            id: `task-integration-${integration.name.toLowerCase()}-1`,
            name: 'Create integration adapter',
            description: `Create adapter for ${integration.name}`,
            type: 'integration',
            estimatedHours: 8,
            acceptanceCriteria: [
              {
                id: `ac-integration-${integration.name.toLowerCase()}-1`,
                description: 'Integration adapter is functional',
                testable: true,
              },
            ],
          },
        ],
        acceptanceCriteria: [
          {
            id: `ac-integration-${integration.name.toLowerCase()}`,
            description: `Integration with ${integration.name} is working`,
            testable: true,
          },
        ],
        definitionOfDone: [
          'Adapter created',
          'Integration tested',
          'Documentation updated',
        ],
      });
    }

    return {
      id: 'epic-integrations',
      name: 'External Integrations',
      description: 'Integrate with external systems',
      goal: 'All integrations functional',
      priority: 'medium',
      stories,
      iteration: 'v2',
    };
  }

  private identifyRisks(
    brief: ProjectBrief,
    capabilityPlan: CapabilityPlan
  ): any[] {
    const risks: any[] = [];

    if (capabilityPlan.missingCapabilities.length > 0) {
      risks.push({
        id: 'risk-missing-tools',
        description: `Missing tools for: ${capabilityPlan.missingCapabilities.join(', ')}`,
        level: 'high',
        impact: 'Delayed delivery',
        probability: 'high',
        mitigation: 'Prioritize tool development in MVP',
      });
    }

    if (brief.constraints?.budget?.maxCostPerMonth && brief.constraints.budget.maxCostPerMonth < 100) {
      risks.push({
        id: 'risk-budget',
        description: 'Low budget may limit AI usage',
        level: 'medium',
        impact: 'Reduced functionality',
        probability: 'medium',
        mitigation: 'Use deterministic alternatives where possible',
      });
    }

    return risks;
  }
}
