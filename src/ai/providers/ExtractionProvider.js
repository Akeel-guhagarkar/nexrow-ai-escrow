// ================================================================
// SUPREMEX AI — Extraction Provider
// Phase 3: Document Intelligence Layer
// Receives router-merged search results → structured normalized data
// ================================================================

import { SourceReaderRegistry } from './SourceReaderRegistry.js';
import { EntityDetector } from './EntityDetector.js';
import { DeduplicationEngine } from './DeduplicationEngine.js';
import { SummaryGenerator } from './SummaryGenerator.js';

export class ExtractionProvider {
  constructor() {
    this.name = 'Extraction Provider (Document Intelligence)';
    this.registry = new SourceReaderRegistry();
    this.entityDetector = new EntityDetector();
    this.deduplicationEngine = new DeduplicationEngine();
    this.summaryGenerator = new SummaryGenerator();
  }

  // Allow new source readers to be plugged in externally (Phase 4+ ready)
  registerSourceReader(readerInstance) {
    this.registry.register(readerInstance);
  }

  async extract(mergedSearchResults, onProgress) {
    const startTime = Date.now();
    const timeline = [];
    const addEvent = (event) => timeline.push({ event, timestamp: new Date().toISOString() });

    addEvent('Extraction Started');
    if (onProgress) onProgress({ provider: this.name, step: 'Extraction Started', progress: 5 });

    // ── Step 1: Read each source with matching reader ─────────────
    addEvent('Reading Sources');
    if (onProgress) onProgress({ provider: this.name, step: 'Reading All Sources...', progress: 20 });

    const readPromises = mergedSearchResults.map(async (sr) => {
      try {
        const reader = this.registry.getReaderFor(sr);
        const doc = await reader.read(sr);
        return doc;
      } catch (err) {
        console.warn(`[ExtractionProvider] Failed to read source ${sr.url}: ${err.message}`);
        return null;
      }
    });

    const rawDocs = (await Promise.all(readPromises)).filter(Boolean);
    addEvent('Extracting Metadata');
    if (onProgress) onProgress({ provider: this.name, step: `Extracted metadata from ${rawDocs.length} sources`, progress: 45 });

    // ── Step 2: Deduplication ─────────────────────────────────────
    addEvent('Normalizing');
    if (onProgress) onProgress({ provider: this.name, step: 'Normalizing & Deduplicating...', progress: 62 });

    const { uniqueDocs, duplicatesRemoved } = this.deduplicationEngine.deduplicate(rawDocs);

    addEvent('Removing Duplicates');
    if (onProgress) onProgress({ provider: this.name, step: `${duplicatesRemoved} duplicate(s) removed`, progress: 75 });

    // ── Step 3: Entity Detection ──────────────────────────────────
    const allEntities = [];
    for (const doc of uniqueDocs) {
      const docEntities = this.entityDetector.detectFromDocument(doc);
      allEntities.push(...docEntities);
    }
    const deduplicatedEntities = this.entityDetector.deduplicateEntities(allEntities);

    // ── Step 4: Statistics Computation ───────────────────────────
    const statistics = this._computeStatistics(rawDocs, uniqueDocs, duplicatesRemoved, deduplicatedEntities);

    // ── Step 5: Summary Generation ────────────────────────────────
    addEvent('Generating Summary');
    if (onProgress) onProgress({ provider: this.name, step: 'Generating Intelligence Summaries...', progress: 88 });

    const summaries = this.summaryGenerator.generate(uniqueDocs, deduplicatedEntities, statistics);

    const executionTimeMs = Date.now() - startTime;
    addEvent('Extraction Complete');
    if (onProgress) onProgress({ provider: this.name, step: 'Extraction Complete', progress: 100 });

    return {
      providerName: this.name,
      status: 'COMPLETED',
      executionTimeMs,
      normalizedData: uniqueDocs.map(d => d.toJSON()),
      entities: deduplicatedEntities.map(e => e.toJSON()),
      summaries,
      statistics,
      timeline,
      metadata: {
        totalSourcesProcessed: rawDocs.length,
        uniqueSourcesAfterDedup: uniqueDocs.length,
        duplicatesRemoved,
        entitiesDetected: deduplicatedEntities.length
      }
    };
  }

  _computeStatistics(rawDocs, uniqueDocs, duplicatesRemoved, entities) {
    const confidences = rawDocs.map(d => d.extractionConfidence).filter(c => c > 0);
    const avgConfidence = confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    const typeGroups = {};
    rawDocs.forEach(d => {
      const t = d.sourceType || 'Unknown';
      typeGroups[t] = (typeGroups[t] || 0) + 1;
    });

    const langEntities = entities.filter(e => e.type === 'ProgrammingLanguage');
    const uniqueDomains = new Set(
      uniqueDocs.map(d => d.domain?.value || d.websiteUrl?.value).filter(Boolean)
    ).size;

    return {
      totalSources: rawDocs.length,
      uniqueSources: uniqueDocs.length,
      duplicatesRemoved,
      typeDistribution: typeGroups,
      avgConfidence: Number(avgConfidence.toFixed(3)),
      languagesDetected: langEntities.map(e => e.name),
      uniqueDomains,
      entitiesTotal: entities.length
    };
  }
}
