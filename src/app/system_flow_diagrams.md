# System Flow Diagrams

## 1. Data Collection Pipeline
┌─────────────────────────────────────────────────────────────┐
│  [Data Collection]                                          │
│  ┌─────────────────┐     ┌───────────────────────┐          │
│  │                 │     │                       │          │
│  │   Start Scan    │────▶│  Initialize Platform  │         │
│  │                 │     │       Clients         │          │
│  └─────────────────┘     └──────────┬────────────┘          │
│                                    │                        │
│                                    ▼                        │
│  ┌─────────────────┐     ┌───────────────────────┐          │
│  │                 │     │                       │          │
│  │  Fetch User    │◀────┤  Platform Clients     │          │
│  │     Posts      │      │  (TikTok, Instagram,  │          │
│  └───────┬────────┘      │       YouTube)        │          │
│          │               └──────────┬────────────┘          │
│          │                          │                       │
│          ▼                          ▼                       │
│  ┌─────────────────┐     ┌───────────────────────┐          │
│  │                 │     │                       │          │
│  │  Store Raw Data │     │   Trigger Analysis    │          │
│  │   in Database   │────▶│   (Core Pipeline)    │          │
│  └─────────────────┘     └───────────────────────┘          │
└─────────────────────────────────────────────────────────────┘

data request -> data

## 2. Enhanced Core Analysis Pipeline
┌───────────────────────────────────────────────────────────────────────┐
│  [Enhanced Core Analysis]                                             │
│  ┌─────────────────┐     ┌───────────────────────┐   ┌──────────────┐│
│  │                 │     │                       │   │              ││
│  │   Post          │     │   Sentiment &        │   │  Content     ││
│  │   Analysis      │◀───▶│    Intent Analysis   │◀─▶│  Summarization││
│  │  (Enhanced)     │     │   (OpenAI v4+)       │   │  (Local/AI)  ││
│  └────────┬────────┘     └───────────┬───────────┘   └──────┬───────┘│
│           │                           │                      │        │
│           ▼                           ▼                      ▼        │
│  ┌─────────────────┐     ┌───────────────────────┐   ┌──────────────┐│
│  │  Engagement     │     │   Temporal Analysis   │   │  Hashtag &   ││
│  │  Prediction     │     │   & Pattern           │   │  Content     ││
│  │  (ML Model)     │     │   Recognition        │   │  Optimization││
│  └────────┬────────┘     └───────────┬───────────┘   └──────┬───────┘│
│           │                           │                      │        │
│           └───────────┬───────────────┴──────────────────────┘        │
│                       │                                              │
│                       ▼                                              │
│             ┌─────────────────┐     ┌───────────────────────┐        │
│             │  Error Handling │     │  Result Aggregation   │        │
│             │  & Fallback     │────▶│  & Caching            │        │
│             │  (Resilience)   │     │  (Redis)              │        │
│             └─────────────────┘     └───────────────────────┘        │
└───────────────────────────────────────────────────────────────────────┘


Data Flow:
data + analysis request → [Enhanced Analysis] → {sentiment, intent, summary, engagement_score, optimal_times, content_optimization}

Key Improvements:
- Added robust error handling with automatic fallback to local models
- Implemented Redis-based caching for analysis results
- Enhanced sentiment analysis with OpenAI v4+ integration
- Added content summarization with local/AI hybrid approach
- Improved resilience with circuit breakers and retries

## 3. Deliverables Generation Pipeline

┌─────────────────────────────────────────────────────────────┐
│  [Deliverables Generation]                                  │
│  ┌───────────────────────┐    ┌───────────────────────┐     │
│  │                       │    │                       │     │
│  │   Analysis Results    │───▶│   Generate Reports    │    │
│  │   (JSON/CSV)          │    │   & Deliverables      │     │
│  └───────────────────────┘    └──────────┬────────────┘     │
│                                          │                  │
│                                          ▼                  │
│  ┌───────────────────────┐    ┌───────────────────────┐     │
│  │                       │    │                       │     │
│  │  Optimized Posting    │    │  Video Optimization   │     │
│  │      Schedule         │    │   Recommendations     │     │
│  └───────────────────────┘    └───────────────────────┘     │
└─────────────────────────────────────────────────────────────┘

analysis results -> optimized posting schedule, video optimization recommendations

## 4. System Monitoring Pipeline

┌─────────────────────────────────────────────────────────────┐
│  [System Monitoring]                                        │
│  ┌──────────────────────┐     ┌───────────────────────┐     │
│  │                      │     │                       │     │
│  │   Error Tracking     │◀───│    System Health      │     │
│  │     & Alerts         │     │      Monitoring       │     │
│  └──────────┬───────────┘     └──────────┬────────────┘     │
│             │                            │                  │
│             ▼                            ▼                  │
│  ┌───────────────────────┐    ┌───────────────────────┐     │
│  │                       │    │                       │     │
│  │  Performance Metrics  │    │  Usage Analytics      │     │
│  │    & Dashboards       │    │    & Reporting        │     │
│  └───────────────────────┘    └───────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
