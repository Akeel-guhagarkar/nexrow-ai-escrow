// ================================================================
// SUPREMEX AI — Extracted Data Model
// Phase 3: Document Intelligence Normalized Schema
// Single canonical schema for all source types
// ================================================================

export class ExtractedDocument {
  constructor(sourceResult) {
    this.id = 'ext_' + Math.random().toString(36).slice(2, 10);
    this.sourceId = sourceResult.id || null;
    this.sourceType = sourceResult.type || 'Website'; // GitHub, Website, Portfolio, LinkedIn, PDF, etc.
    this.sourceUrl = sourceResult.url || null;
    this.providerName = sourceResult.providerName || 'ExtractionProvider';
    this.extractedAt = new Date().toISOString();

    // ── Project Identity ──────────────────────────────────────────
    this.projectName = this._field(null, 0);
    this.owner = this._field(null, 0);
    this.company = this._field(null, 0);
    this.developer = this._field(null, 0);

    // ── Repository Fields ────────────────────────────────────────
    this.repositoryName = this._field(null, 0);
    this.repositoryUrl = this._field(null, 0);
    this.repositoryVisibility = this._field(null, 0);
    this.stars = this._field(null, 0);
    this.forks = this._field(null, 0);
    this.commits = this._field(null, 0);
    this.readmeSummary = this._field(null, 0);

    // ── Web & Deployment ─────────────────────────────────────────
    this.websiteUrl = this._field(null, 0);
    this.domain = this._field(null, 0);
    this.hostingPlatform = this._field(null, 0);
    this.deploymentStatus = this._field(null, 0);

    // ── Technology Stack ─────────────────────────────────────────
    this.framework = this._field(null, 0);
    this.programmingLanguages = this._field([], 0);
    this.libraries = this._field([], 0);
    this.technologyStack = this._field([], 0);
    this.version = this._field(null, 0);
    this.lastUpdated = this._field(null, 0);

    // ── Contact Information ──────────────────────────────────────
    this.email = this._field(null, 0);
    this.phone = this._field(null, 0);
    this.socialLinks = this._field({}, 0);

    // ── Content Intelligence ─────────────────────────────────────
    this.description = this._field(sourceResult.description || null, 0.5);
    this.keywords = this._field([], 0);
    this.language = this._field(sourceResult.language || 'en', 0.9);
    this.detectedFileTypes = this._field([], 0);

    // ── Document Metadata ────────────────────────────────────────
    this.documentTitle = this._field(sourceResult.title || null, 0.8);
    this.documentAuthor = this._field(null, 0);
    this.creationDate = this._field(null, 0);
    this.modifiedDate = this._field(null, 0);
    this.fileSize = this._field(null, 0);
    this.mediaType = this._field(null, 0);
    this.ocrText = this._field(null, 0); // Phase 4+ placeholder

    // ── Overall Extraction Confidence ────────────────────────────
    this.extractionConfidence = sourceResult.confidence || 0;
  }

  // ── Typed Field Wrapper ──────────────────────────────────────────
  _field(value, confidence) {
    return { value, confidence, source: this.sourceUrl, extractedAt: this.extractedAt };
  }

  setField(fieldName, value, confidence, source) {
    if (this[fieldName] !== undefined) {
      this[fieldName] = { value, confidence, source: source || this.sourceUrl, extractedAt: new Date().toISOString() };
    }
  }

  computeOverallConfidence() {
    const scores = Object.values(this)
      .filter(v => v && typeof v === 'object' && 'confidence' in v && v.value !== null && v.value !== undefined && v.value !== 0)
      .map(v => v.confidence);
    if (scores.length === 0) return 0;
    return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3));
  }

  toJSON() {
    const obj = {};
    for (const [key, val] of Object.entries(this)) {
      obj[key] = val;
    }
    obj.overallConfidence = this.computeOverallConfidence();
    return obj;
  }
}
