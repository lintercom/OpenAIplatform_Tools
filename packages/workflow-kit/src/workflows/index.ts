import { WorkflowTemplate } from '../types';
import { routerWorkflow } from './router';
import { qualificationWorkflow } from './qualification';
import { bookingWorkflow } from './booking';

export const workflows: Record<string, WorkflowTemplate> = {
  router: routerWorkflow,
  qualification: qualificationWorkflow,
  booking: bookingWorkflow,
};

export function getWorkflow(id: string): WorkflowTemplate | undefined {
  return workflows[id];
}

export function listWorkflows(): WorkflowTemplate[] {
  return Object.values(workflows);
}

export * from './router';
export * from './qualification';
export * from './booking';
