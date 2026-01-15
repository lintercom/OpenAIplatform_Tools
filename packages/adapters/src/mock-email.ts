import { EmailAdapter } from './types';

export class MockEmailAdapter implements EmailAdapter {
  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    from?: string;
  }): Promise<{ id: string; status: string }> {
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[MockEmail] Sending email ${emailId} to ${params.to}: ${params.subject}`);
    return { id: emailId, status: 'sent' };
  }
}
