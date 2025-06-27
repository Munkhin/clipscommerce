# Ideator Workflow

## Overview
The Ideator is a fine-tuned LLM wrapper that generates short-form content templates for social media. It creates engaging content structures including hooks, scripts, and visual/audio recommendations based on product or service descriptions.

## Features
- GPT-4-Turbo LLM wrapper with streaming support
- Generates 5 distinct content templates per request
- Batch processing for multiple products
- Validates generated content for structure and platform guidelines
- RESTful API endpoints for all core features
- Cross-module sync with Competitor Tactics for enhanced prompt context
- TypeScript types and JSDoc for all public APIs

## API Endpoints
- `POST /generate-templates` — Generate content templates for a product and platform
- `POST /process-batch` — Batch generate templates for multiple products
- `POST /validate-templates` — Validate template batches for structure and platform rules
- `POST /cross-module-sync` — Feed competitor hooks into prompt context and compare outputs

## Usage Instructions

### 1. Generate Templates
```ts
import axios from 'axios';
const { data: batch } = await axios.post('/generate-templates', { description: 'My product', platform: 'tiktok' });
```

### 2. Batch Processing
```ts
const { data: batches } = await axios.post('/process-batch', { descriptions: ['A', 'B'], platform: 'instagram' });
```

### 3. Validate Templates
```ts
const { data: errors } = await axios.post('/validate-templates', { batches });
```

### 4. Cross-Module Sync
```ts
const { data } = await axios.post('/cross-module-sync', { hooks: ['Try this now'], templates: [{ hook: 'Try this now!' }] });
console.log(data.promptContext, data.comparison);
```

## Integration Points
- Accepts hooks and tactics from Competitor Tactics for prompt context
- Validation middleware ensures all generated content is platform-compliant
- Outputs are compatible with dashboard and analytics modules

## Environment/Config Requirements
- Node.js 18+
- Express (for API endpoints)
- TypeScript
- OpenAI API key for LLM wrapper (if using real LLM)

## Tests
Run all tests:
```bash
npx jest --detectOpenHandles src/app/workflows/content_template_generator
```

## Extensibility
- Add new platform rules in `validateTemplates`
- Extend prompt engineering in `LlmWrapper`
- Integrate with additional workflows via API endpoints

## Core Components

### 1. Content Generation
- **Input Processing**: Accepts product/service descriptions and target platform specifications, may include pictures or links
- **Template Generation**: Produces 5 distinct content templates per request
- **Structured Output**: Each template includes:
  - Hook: Attention-grabbing opening
  - Script: Structured content flow with good storytelling
  - Visual Recommendations: Scene descriptions and framing
  - Audio Suggestions: Music style, tone, and sound effects

### 2. Integration Points
- **LLM Service**: Interface with fine-tuned LLM for content generation
- **Content Validation**: Ensure generated content meets platform guidelines
- **Output Formatting**: Standardized JSON structure for downstream processing

### 3. Performance Considerations
- Response time < 5 seconds per generation
- Support for batch processing multiple products
- Caching of common content patterns

## Implementation Plan

### Phase 1: Core Generation
- [ ] Set up LLM wrapper service
- [ ] Define content template schema
- [ ] Implement basic prompt engineering

### Phase 2: Platform Optimization
- [ ] Add platform-specific content rules
- [ ] Implement content validation
- [ ] Add performance monitoring

## Dependencies
- LLM service endpoint
- Content moderation API
- Platform guidelines database