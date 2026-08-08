// ================================================================
// SUPREMEX AI — Workflow Manager (Phase 3 Extended)
// Orchestrates full pipeline: Search → Router → Extraction → Store
// ================================================================

import { AIEngine } from '../engine/AIEngine.js';

export class WorkflowManager {
  constructor(storageService) {
    this.aiEngine = new AIEngine();
    this.storageService = storageService;
  }

  getEngine() {
    return this.aiEngine;
  }

  async handleProofUploaded(deal, onProgress) {
    const timelineEvents = [];
    const addTimeline = (event, desc) =>
      timelineEvents.push({ event, description: desc, timestamp: new Date().toISOString() });

    try {
      addTimeline('AI Started', `AI Verification Engine initialized for Deal ID: ${deal.id}`);

      const report = await this.aiEngine.runSearchWorkflow(deal, onProgress);

      // ── Search Phase Timeline ──────────────────────────────────
      addTimeline('Search Provider A Started', 'Provider A: GitHub, LinkedIn & Web search launched');
      addTimeline('Search Provider B Started', 'Provider B: Google Index & Portfolio search launched');
      addTimeline('Provider A Completed', `Provider A finished in ${report.providers[0]?.executionTimeMs || 0}ms — ${report.providers[0]?.count || 0} sources`);
      addTimeline('Provider B Completed', `Provider B finished in ${report.providers[1]?.executionTimeMs || 0}ms — ${report.providers[1]?.count || 0} sources`);
      addTimeline('Router Completed', `Router selected "${report.routerDecision.selectedProvider}" (Confidence: ${(report.confidence * 100).toFixed(0)}%)`);
      addTimeline('Search Finished', `${report.mergedResults.length} unique sources merged from parallel providers`);

      // ── Extraction Phase Timeline ──────────────────────────────
      if (report.extraction) {
        const ext = report.extraction;
        const stats = ext.statistics;
        addTimeline('Extraction Started', 'Document Intelligence Engine activated');
        addTimeline('Reading Sources', `Reading ${stats?.totalSources || 0} source documents`);
        addTimeline('Extracting Metadata', 'Parsing repositories, websites, portfolios & profiles');
        addTimeline('Normalizing', 'Transforming all sources into canonical JSON schema');
        addTimeline('Removing Duplicates', `${stats?.duplicatesRemoved || 0} duplicate source(s) removed`);
        addTimeline('Generating Summary', 'Building Short, Medium, Technical & Business summaries');
        addTimeline('Extraction Complete', `${stats?.uniqueSources || 0} normalized documents · ${report.entities?.length || 0} entities detected · ${ext.executionTimeMs}ms`);
      }

      report.timeline = timelineEvents;

      // ── Persist Report ─────────────────────────────────────────
      if (this.storageService && typeof this.storageService.saveReport === 'function') {
        await this.storageService.saveReport(report);
      }

      return { success: true, report, timelineEvents };

    } catch (err) {
      console.error('[WorkflowManager] Execution failure:', err);
      addTimeline('AI Failed', `Error: ${err.message}`);
      return { success: false, error: err.message, timelineEvents };
    }
  }
}
