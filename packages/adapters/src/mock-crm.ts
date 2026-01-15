import { CRMAdapter, CRMLead } from './types';

export class MockCRMAdapter implements CRMAdapter {
  private leads = new Map<string, CRMLead>();

  async upsertLead(lead: Partial<CRMLead>): Promise<CRMLead> {
    const id = lead.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const existing = this.leads.get(id);

    const updated: CRMLead = {
      id,
      email: lead.email || existing?.email,
      phone: lead.phone || existing?.phone,
      name: lead.name || existing?.name,
      stage: lead.stage || existing?.stage || 'new',
      score: lead.score ?? existing?.score ?? 0,
      tags: lead.tags || existing?.tags || [],
      data: { ...existing?.data, ...lead.data },
    };

    this.leads.set(id, updated);
    return updated;
  }

  async createTask(leadId: string, task: { title: string; description?: string; dueDate?: Date }): Promise<{ id: string }> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[MockCRM] Created task ${taskId} for lead ${leadId}: ${task.title}`);
    return { id: taskId };
  }
}
