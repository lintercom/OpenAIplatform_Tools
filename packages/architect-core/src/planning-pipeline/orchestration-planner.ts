/**
 * Orchestration Planner
 * 
 * Fáze 2: Generuje WorkflowCatalog + ToolTopology
 */

import { ToolTopology, ToolNode, ToolDependency } from '../schemas/tool-topology';
import { WorkflowCatalog, WorkflowDefinition } from '../schemas/workflow-catalog';
import { ToolContract } from '@ai-toolkit/tool-contract';
import { ProjectBrief } from '../schemas/project-brief';
import { CapabilityPlan } from './capability-planner';

/**
 * Orchestration Planner
 * 
 * Plánuje orchestrace workflows a tool topology
 */
export class OrchestrationPlanner {
  /**
   * Vytvoří Tool Topology
   */
  createToolTopology(
    tools: ToolContract[],
    brief: ProjectBrief
  ): ToolTopology {
    const nodes: ToolNode[] = tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category || 'general',
      metadata: {
        riskLevel: tool.riskLevel,
        piiLevel: tool.piiLevel,
        idempotency: tool.idempotency,
        policyTags: tool.tags || [],
      },
      inputs: tool.inputSchema as Record<string, unknown>,
      outputs: tool.outputSchema as Record<string, unknown>,
    }));

    const dependencies = this.inferDependencies(tools);

    return {
      id: `topology-${brief.id}`,
      name: `${brief.name} Tool Topology`,
      description: `Tool topology for ${brief.name}`,
      tools: nodes,
      dependencies,
    };
  }

  /**
   * Vytvoří Workflow Catalog
   */
  createWorkflowCatalog(
    capabilityPlan: CapabilityPlan,
    brief: ProjectBrief
  ): WorkflowCatalog {
    const workflows: WorkflowDefinition[] = [];

    // Hlavní workflow podle goals
    for (const goal of brief.goals) {
      const workflow = this.createWorkflowForGoal(goal, capabilityPlan, brief);
      if (workflow) {
        workflows.push(workflow);
      }
    }

    return {
      id: `workflows-${brief.id}`,
      name: `${brief.name} Workflows`,
      description: `Workflow catalog for ${brief.name}`,
      workflows,
    };
  }

  private createWorkflowForGoal(
    goal: string,
    capabilityPlan: CapabilityPlan,
    brief: ProjectBrief
  ): WorkflowDefinition | null {
    const goalLower = goal.toLowerCase();
    let workflowId = '';
    let workflowName = '';
    const steps: any[] = [];

    if (goalLower.includes('lead')) {
      workflowId = 'lead-qualification';
      workflowName = 'Lead Qualification';
      steps.push(
        { id: 'step1', toolId: 'session.create', name: 'Create Session' },
        { id: 'step2', toolId: 'lead.create', name: 'Create Lead', dependsOn: ['step1'] },
        { id: 'step3', toolId: 'intent.detect', name: 'Detect Intent', dependsOn: ['step2'] }
      );
    } else if (goalLower.includes('order')) {
      workflowId = 'order-processing';
      workflowName = 'Order Processing';
      steps.push(
        { id: 'step1', toolId: 'cart.get', name: 'Get Cart' },
        { id: 'step2', toolId: 'cart.validate', name: 'Validate Cart', dependsOn: ['step1'] },
        { id: 'step3', toolId: 'order.create', name: 'Create Order', dependsOn: ['step2'] }
      );
    } else {
      return null; // Neznámý goal
    }

    return {
      id: workflowId,
      name: workflowName,
      description: `Workflow for ${goal}`,
      type: 'dag',
      triggers: [
        {
          type: 'ui',
          source: `trigger-${workflowId}`,
        },
      ],
      steps,
    };
  }

  private inferDependencies(tools: ToolContract[]): ToolDependency[] {
    const dependencies: ToolDependency[] = [];

    // Jednoduchá heuristika: session tools jsou závislé na session.create
    const sessionTools = tools.filter((t) => t.id.includes('session.') && t.id !== 'session.create');
    for (const tool of sessionTools) {
      dependencies.push({
        from: tool.id,
        to: 'session.create',
        type: 'required',
      });
    }

    // Cart tools závisí na cart.create
    const cartTools = tools.filter((t) => t.id.includes('cart.') && t.id !== 'cart.create');
    for (const tool of cartTools) {
      dependencies.push({
        from: tool.id,
        to: 'cart.create',
        type: 'required',
      });
    }

    return dependencies;
  }
}
