// ================================================================
// SUPREMEX AI — Entity Detector
// Phase 3: Automatic entity identification from extracted documents
// ================================================================

import { Entity, ENTITY_TYPES } from '../models/Entity.js';

// Known entity lookup tables
const KNOWN_LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'Solidity', 'R', 'Scala', 'HTML', 'CSS', 'SQL'];
const KNOWN_FRAMEWORKS = ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Express', 'FastAPI', 'Django', 'Spring', 'Laravel', 'Flutter', 'React Native', 'Vite', 'Nuxt'];
const KNOWN_LIBRARIES = ['Supabase', 'Firebase', 'TailwindCSS', 'shadcn', 'axios', 'lodash', 'moment', 'zod', 'prisma', 'drizzle', 'ethers.js', 'web3.js'];
const KNOWN_PLATFORMS = ['Vercel', 'Netlify', 'GitHub Pages', 'AWS', 'GCP', 'Azure', 'Heroku', 'Railway', 'Render', 'Cloudflare'];
const CURRENCY_PATTERNS = [/\$[\d,]+/, /₹[\d,]+/, /€[\d,]+/, /£[\d,]+/];

export class EntityDetector {

  detectFromDocument(extractedDoc) {
    const entities = [];
    const url = extractedDoc.sourceUrl || '';

    // Programming Languages
    const langs = extractedDoc.programmingLanguages?.value;
    if (Array.isArray(langs)) {
      langs.forEach(lang => {
        if (KNOWN_LANGUAGES.includes(lang)) {
          entities.push(new Entity({ name: lang, type: ENTITY_TYPES.PROGRAMMING_LANGUAGE, value: lang, confidence: 0.95, sourceUrl: url }));
        }
      });
    }

    // Frameworks
    const fw = extractedDoc.framework?.value;
    if (fw && KNOWN_FRAMEWORKS.includes(fw)) {
      entities.push(new Entity({ name: fw, type: ENTITY_TYPES.FRAMEWORK, value: fw, confidence: 0.92, sourceUrl: url }));
    }

    // Libraries
    const libs = extractedDoc.libraries?.value;
    if (Array.isArray(libs)) {
      libs.forEach(lib => {
        if (KNOWN_LIBRARIES.includes(lib)) {
          entities.push(new Entity({ name: lib, type: ENTITY_TYPES.LIBRARY, value: lib, confidence: 0.88, sourceUrl: url }));
        }
      });
    }

    // Technology Stack
    const stack = extractedDoc.technologyStack?.value;
    if (Array.isArray(stack)) {
      stack.forEach(tech => {
        if (KNOWN_FRAMEWORKS.includes(tech) || KNOWN_LIBRARIES.includes(tech)) {
          entities.push(new Entity({ name: tech, type: ENTITY_TYPES.TECHNOLOGY, value: tech, confidence: 0.85, sourceUrl: url }));
        }
      });
    }

    // Repository
    const repoName = extractedDoc.repositoryName?.value;
    if (repoName) {
      entities.push(new Entity({ name: repoName, type: ENTITY_TYPES.REPOSITORY, value: extractedDoc.repositoryUrl?.value || url, confidence: 0.96, sourceUrl: url }));
    }

    // Website
    const websiteUrl = extractedDoc.websiteUrl?.value;
    if (websiteUrl) {
      entities.push(new Entity({ name: extractedDoc.domain?.value || websiteUrl, type: ENTITY_TYPES.WEBSITE, value: websiteUrl, confidence: 0.92, sourceUrl: url }));
    }

    // Company / Owner
    const company = extractedDoc.company?.value || extractedDoc.owner?.value;
    if (company) {
      entities.push(new Entity({ name: company, type: ENTITY_TYPES.COMPANY, value: company, confidence: 0.8, sourceUrl: url }));
    }

    // Developer / Person
    const dev = extractedDoc.developer?.value;
    if (dev) {
      entities.push(new Entity({ name: dev, type: ENTITY_TYPES.PERSON, value: dev, confidence: 0.82, sourceUrl: url }));
    }

    // Hosting platform
    const hosting = extractedDoc.hostingPlatform?.value;
    if (hosting && KNOWN_PLATFORMS.includes(hosting)) {
      entities.push(new Entity({ name: hosting, type: ENTITY_TYPES.TECHNOLOGY, value: hosting, confidence: 0.87, sourceUrl: url }));
    }

    // Dates
    const lastUpdated = extractedDoc.lastUpdated?.value;
    if (lastUpdated) {
      entities.push(new Entity({ name: 'Last Updated', type: ENTITY_TYPES.DATE, value: lastUpdated, confidence: 0.9, sourceUrl: url }));
    }

    return entities;
  }

  deduplicateEntities(entities) {
    const seen = new Map();
    for (const entity of entities) {
      const key = `${entity.type}::${entity.name}`;
      if (!seen.has(key) || seen.get(key).confidence < entity.confidence) {
        seen.set(key, entity);
      }
    }
    return Array.from(seen.values());
  }
}
