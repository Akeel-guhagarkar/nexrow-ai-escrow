// ================================================================
// SUPREMEX AI — Entity Model
// Phase 3: Detected entity container for document intelligence
// ================================================================

export const ENTITY_TYPES = {
  PERSON: 'Person',
  COMPANY: 'Company',
  TECHNOLOGY: 'Technology',
  PROGRAMMING_LANGUAGE: 'ProgrammingLanguage',
  FRAMEWORK: 'Framework',
  LIBRARY: 'Library',
  COUNTRY: 'Country',
  CURRENCY: 'Currency',
  DATE: 'Date',
  REPOSITORY: 'Repository',
  DOCUMENT: 'Document',
  WEBSITE: 'Website'
};

export class Entity {
  constructor({ name, type, value, confidence, sourceUrl, providerName }) {
    this.id = 'ent_' + Math.random().toString(36).slice(2, 10);
    this.name = name;
    this.type = type;
    this.value = value || name;
    this.confidence = confidence || 0.8;
    this.sourceUrl = sourceUrl;
    this.providerName = providerName || 'ExtractionProvider';
    this.detectedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      value: this.value,
      confidence: this.confidence,
      sourceUrl: this.sourceUrl,
      providerName: this.providerName,
      detectedAt: this.detectedAt
    };
  }
}
