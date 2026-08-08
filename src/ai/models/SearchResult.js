// ================================================================
// SUPREMEX AI — Search Result Data Model & Normalizer
// Single source of truth for normalized search outputs
// ================================================================

export class SearchResult {
  constructor({
    title,
    url,
    source,
    description,
    timestamp = new Date().toISOString(),
    confidence = 0.85,
    providerName,
    language = 'en',
    type = 'Website' // Website, Repository, Article, Portfolio
  }) {
    this.id = 'sr_' + Math.random().toString(36).slice(2, 9);
    this.title = title || 'Untitled Result';
    this.url = url || '#';
    this.source = source || 'Web Search';
    this.description = description || '';
    this.timestamp = timestamp;
    this.confidence = Math.min(Math.max(confidence, 0), 1.0);
    this.providerName = providerName || 'Unknown Provider';
    this.language = language;
    this.type = type;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      source: this.source,
      description: this.description,
      timestamp: this.timestamp,
      confidence: this.confidence,
      providerName: this.providerName,
      language: this.language,
      type: this.type
    };
  }
}
