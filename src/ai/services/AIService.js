// ================================================================
// SUPREMEX AI — AI Service Singleton
// Front-end Service Bridge & Storage Interface for aiReports
// ================================================================

import { WorkflowManager } from '../workflow/WorkflowManager.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://qhcxwwobfqsecwqsvwid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoY3h3d29iZnFzZWN3cXN2d2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODc0NzQsImV4cCI6MjA5NDc2MzQ3NH0.ZIcAU6PjSwEHeGZtD8B8NKJEd3YifgZa7S7hR9zbkMM';
const supabase = createClient(supabaseUrl, supabaseKey);

export class AIService {
  constructor() {
    this.workflowManager = new WorkflowManager(this);
  }

  async saveReport(report) {
    try {
      // LocalStorage Backup
      const existing = JSON.parse(localStorage.getItem('supremex_ai_reports') || '{}');
      existing[report.dealId] = report;
      localStorage.setItem('supremex_ai_reports', JSON.stringify(existing));

      // Database persistence in aiReports
      const { error } = await supabase.from('ai_reports').upsert({
        deal_id: report.dealId,
        status: report.status,
        started_at: report.startedAt,
        completed_at: report.completedAt,
        execution_time_ms: report.executionTimeMs,
        confidence: report.confidence,
        report_data: report
      });

      if (error) console.warn('Supabase ai_reports save note:', error.message);
    } catch (e) {
      console.warn('Local storage fallback used for aiReports');
    }
  }

  async getReportByDealId(dealId) {
    try {
      // Check local cache first
      const existing = JSON.parse(localStorage.getItem('supremex_ai_reports') || '{}');
      if (existing[dealId]) return existing[dealId];

      // Query database
      const { data } = await supabase
        .from('ai_reports')
        .select('report_data')
        .eq('deal_id', dealId)
        .single();

      return data?.report_data || null;
    } catch (e) {
      const existing = JSON.parse(localStorage.getItem('supremex_ai_reports') || '{}');
      return existing[dealId] || null;
    }
  }

  async triggerAIVerification(deal, onProgress) {
    return await this.workflowManager.handleProofUploaded(deal, onProgress);
  }

  subscribeToEngine(callback) {
    return this.workflowManager.getEngine().subscribe(callback);
  }
}

export const aiService = new AIService();
