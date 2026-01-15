export interface CRMLead {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  stage?: string;
  score?: number;
  tags?: string[];
  data?: Record<string, any>;
}

export interface CRMAdapter {
  upsertLead(lead: Partial<CRMLead>): Promise<CRMLead>;
  createTask(leadId: string, task: { title: string; description?: string; dueDate?: Date }): Promise<{ id: string }>;
}

export interface EmailAdapter {
  sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ id: string; status: string }>;
}

export interface CalendarAdapter {
  createEvent(params: {
    title: string;
    startTime: Date;
    endTime: Date;
    attendees?: string[];
    description?: string;
  }): Promise<{ id: string }>;
  getAvailability(startTime: Date, endTime: Date): Promise<Array<{ start: Date; end: Date }>>;
}

export interface StorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
