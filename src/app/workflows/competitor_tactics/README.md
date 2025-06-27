# Competitor Tactics Workflow

## Overview
Leverages competitor analysis to identify and implement successful content strategies and tactics from competitors. Provides extraction, mapping, and visualization of hooks, CTAs, and formats for use in content ideation and optimization.

## Features
- Integrates with competitor analysis and social platform APIs (TikTok, Instagram, YouTube)
- Extracts hooks, CTAs, and content formats from competitor posts
- Maps extracted tactics to a normalized taxonomy
- Generates a tactic map data structure for visualization
- Provides RESTful API endpoints for all core features
- Extensible React and HTML/JS tactic map UI components
- Integration-ready with Ideator workflow for cross-module synergy

## API Endpoints
- `POST /extract-tactics` — Extract hooks, CTAs, and formats from post metrics
- `POST /map-taxonomy` — Map extracted tactics to taxonomy
- `POST /generate-tactic-map` — Generate tactic map data structure for visualization

## Usage Instructions

### 1. Extract Tactics
```ts
import axios from 'axios';
const posts = [/* array of PostMetrics */];
const { data: tactics } = await axios.post('/extract-tactics', { posts });
```

### 2. Map to Taxonomy
```ts
const { data: taxonomy } = await axios.post('/map-taxonomy', { tactics });
```

### 3. Generate Tactic Map
```ts
const { data: tacticMap } = await axios.post('/generate-tactic-map', { taxonomy });
```

### 4. Visualize (React)
```tsx
import { TacticMapUI } from './functions/TacticMapUI';
<TacticMapUI tacticMap={tacticMap} />
```

### 5. Visualize (HTML/JS)
Open `TacticMapUI.html` in your browser and update the `tacticMap` variable with your data.

## Integration Points
- Outputs (hooks, CTAs, formats) can be fed into the Ideator workflow for enhanced content generation and comparative analysis.
- Tactic map data structure is compatible with dashboard and analytics modules.

## Environment/Config Requirements
- Node.js 18+
- Express (for API endpoints)
- TypeScript
- Social platform API credentials (TikTok, Instagram, YouTube) for data collection

## Tests
Run all tests:
```bash
npx jest --detectOpenHandles src/app/workflows/competitor_tactics
```

## Extensibility
- Add new tactic types or mapping rules in `TacticExtractor` and `TaxonomyMapper`
- Extend the UI components for interactive features or analytics
- Integrate with additional workflows via API endpoints

Phase 1: Data Integration & Mapping
- [ ] Integrate with competitor analysis and social platform APIs.

- [ ] Define and automate tactic extraction logic (e.g., hooks, CTAs, formats).

- [ ] Build interactive tactic map and segmentation features.

Phase 2: Adaptation & Prediction
- [ ] Implement AI-driven tactic adaptation and content generation modules.

- [ ] Develop engagement forecasting and risk/reward scoring models.

- [ ] Enable user-specific personalization for recommendations.