// ================================================================
// SUPREMEX AI — Core AI Engine (Phase 3 Extended)
// Master orchestrator: Search → Router → Extraction Provider
// ================================================================

import { ProviderManager } from '../providers/ProviderManager.js';
import { SearchProviderA } from '../providers/SearchProviderA.js';
import { SearchProviderB } from '../providers/SearchProviderB.js';
import { ExtractionProvider } from '../providers/ExtractionProvider.js';
import { AIRouter } from '../router/AIRouter.js';

export class AIEngine {
  constructor() {
    this.providerManager = new ProviderManager();
    this.router = new AIRouter();
    this.extractionProvider = new ExtractionProvider();
    this.subscribers = new Set();

    // Register Default Parallel Search Providers
    this.providerManager.registerProvider(new SearchProviderA());
    this.providerManager.registerProvider(new SearchProviderB());
  }

  // Register additional custom AI providers (Phase 4+ ready)
  registerCustomProvider(providerInstance) {
    this.providerManager.registerProvider(providerInstance);
  }

  // Register additional source readers into extraction layer (Phase 4+ ready)
  registerSourceReader(readerInstance) {
    this.extractionProvider.registerSourceReader(readerInstance);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifyUI(event) {
    this.subscribers.forEach(cb => {
      try { cb(event); } catch (e) { console.error('[AIEngine] UI Notification Error:', e); }
    });
  }

  async runSearchWorkflow(deal, onProgress) {
    const startedAt = new Date().toISOString();
    const dealTitle = deal.title || 'Escrow Project';
    const dealId = deal.id || 'deal_demo';

    this.notifyUI({ type: 'WORKFLOW_STARTED', dealId, startedAt });
    if (onProgress) onProgress({ step: 'AI Workflow Started', progress: 5 });

    const activeProviders = this.providerManager.getActiveProviders();
    if (activeProviders.length === 0) throw new Error('No active AI search providers available.');

    this.notifyUI({ type: 'PARALLEL_SEARCH_STARTED', activeProviders: activeProviders.map(p => p.name) });

    // ── Phase 2: Parallel Search Execution via Promise.all() ──────
    const searchStartTime = Date.now();
    const providerPromises = activeProviders.map(provider => {
      this.notifyUI({ type: 'PROVIDER_STARTED', providerName: provider.name });
      return this.providerManager.executeWithRetry(
        provider,
        { dealId, dealTitle, proofUrl: deal.proofUrl },
        { maxRetries: 1 },
        (progressUpdate) => this.notifyUI({ type: 'PROVIDER_PROGRESS', ...progressUpdate })
      );
    });

    const providerOutputs = await Promise.all(providerPromises);
    const searchExecutionTimeMs = Date.now() - searchStartTime;

    providerOutputs.forEach(out => this.notifyUI({ type: 'PROVIDER_COMPLETED', ...out }));
    if (onProgress) onProgress({ step: 'Parallel Search Complete', progress: 60 });

    // ── Router ────────────────────────────────────────────────────
    this.notifyUI({ type: 'ROUTER_STARTED' });
    if (onProgress) onProgress({ step: 'Router Evaluating Results...', progress: 68 });

    const routerDecision = this.router.evaluateAndRoute(providerOutputs);
    this.notifyUI({ type: 'ROUTER_COMPLETED', routerDecision });
    if (onProgress) onProgress({ step: 'Router Decision Made', progress: 74 });

    // ── Phase 3: Extraction Provider (Document Intelligence) ──────
    this.notifyUI({ type: 'EXTRACTION_STARTED', providerName: this.extractionProvider.name });
    if (onProgress) onProgress({ step: 'Document Intelligence Engine Starting...', progress: 78 });

    let extractionResult = null;
    try {
      extractionResult = await this.extractionProvider.extract(
        routerDecision.mergedResults,
        (progressUpdate) => {
          this.notifyUI({ type: 'EXTRACTION_PROGRESS', ...progressUpdate });
        }
      );
      this.notifyUI({ type: 'EXTRACTION_COMPLETED', extractionResult });
      if (onProgress) onProgress({ step: 'Document Intelligence Complete', progress: 96 });
    } catch (err) {
      console.error('[AIEngine] Extraction Provider Error:', err.message);
      extractionResult = { status: 'FAILED', error: err.message, normalizedData: [], entities: [], summaries: {} };
      this.notifyUI({ type: 'EXTRACTION_FAILED', error: err.message });
    }

    const completedAt = new Date().toISOString();

    // ── Compiled Full Report (aiReports schema) ───────────────────
    const report = {
      dealId,
      dealTitle,
      status: 'COMPLETED',
      startedAt,
      completedAt,
      executionTimeMs: searchExecutionTimeMs,

      // Phase 2: Search
      providers: providerOutputs.map(o => ({
        name: o.providerName,
        status: o.status,
        executionTimeMs: o.executionTimeMs,
        count: o.results.length
      })),
      searchResults: routerDecision.mergedResults.map(r => r.toJSON ? r.toJSON() : r),
      mergedResults: routerDecision.mergedResults.map(r => r.toJSON ? r.toJSON() : r),
      routerDecision: {
        decision: routerDecision.decision,
        selectedProvider: routerDecision.selectedProvider,
        rationale: routerDecision.rationale,
        evaluations: routerDecision.evaluations
      },
      confidence: routerDecision.confidence,

      // Phase 3: Extraction
      extraction: {
        status: extractionResult.status,
        executionTimeMs: extractionResult.executionTimeMs,
        metadata: extractionResult.metadata,
        timeline: extractionResult.timeline,
        statistics: extractionResult.statistics
      },
      normalizedData: extractionResult.normalizedData || [],
      entities: extractionResult.entities || [],
      summaries: extractionResult.summaries || {},

      logs: this.providerManager.getLogs()
    };

    this.notifyUI({ type: 'WORKFLOW_COMPLETED', report });
    if (onProgress) onProgress({ step: 'AI Workflow Completed', progress: 100 });

    return report;
  }
}
