### **SCAN Phase Architecture**  
**Objective:** *Aggregate and analyze user/competitor data to identify viral patterns, engagement leaks, and optimal timing.*  

---

### **1. Data Collection Module**  
#### **1.1 Platform API Integration**  
- **Tools:**  
  - **TikTok Business API** (`/insights`, `/user/activity`)  
  - **Instagram Graph API** (`/audience/activity`, `/media/insights`)  
  - **YouTube Analytics API** (`/videoAnalytics`)  
- **Key Technical Decisions:**  
  - **OAuth 2.0 with PKCE**: Securely authenticate users without storing platform credentials.  
  - **Rate-Limit Queuing**: Use Redis Sorted Sets to stagger API calls (e.g., 5 requests/sec per user).  
  - **Webhook Subscriptions**: Listen for `post.create` and `post.update` events to trigger real-time scans.  

```python
# Example: TikTok API call for post metrics
async def fetch_tiktok_insights(video_id: str, access_token: str):
    headers = {"Authorization": f"Bearer {access_token}"}
    response = await httpx.get(
        f"https://api.tiktok.com/v1/videos/{video_id}/insights",
        params={"fields": "views,likes,avg_watch_time"},
        headers=headers
    )
    return response.json()
```

---

#### **1.2 Competitor Intelligence**  
- **Tools:**  
  - **Bright Data** (ethical scraping of public competitor profiles)  
  - **PhantomBuster** (track hashtag/sound usage)  
- **Key Technical Decisions:**  
  - **Headless Browser Pool**: Rotate Puppeteer/Playwright instances to avoid IP blocks.  
  - **Data Normalization**: Convert scraped timestamps to UTC and engagement rates to percentages.  
  - **TOS Compliance Layer**: Auto-skip profiles with `robots.txt` blocks.  

```javascript
// Example: Scraping competitor posts with Puppeteer
const scrapeCompetitorPosts = async (profileUrl) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(profileUrl);
  const posts = await page.evaluate(() => 
    Array.from(document.querySelectorAll('.post')).map(post => ({
      likes: post.querySelector('.like-count').innerText,
      timestamp: post.querySelector('time').datetime
    }))
  );
  await browser.close();
  return posts;
};
```

---

### **2. Data Processing Module**  
#### **2.1 Time-Series Analysis**  
- **Libraries:**  
  - Python: `statsmodels` (seasonal decomposition)  
  - R: `forecast` (STL + ARIMA)  
- **Key Technical Decisions:**  
  - **Sliding Window Aggregation**: Calculate 7-day rolling averages for engagement.  
  - **Peak Detection**: Use `scipy.signal.find_peaks` to spot best posting hours.  

```python
from scipy.signal import find_peaks

def detect_peaks(engagement_series):
    peaks, _ = find_peaks(engagement_series, prominence=0.5)
    return engagement_series.iloc[peaks].index.tolist()
```

#### **2.2 Anomaly Detection**  
- **Algorithms:**  
  - **Isolation Forest**: Flag outlier posts with abnormal drop-off rates.  
  - **DBSCAN**: Cluster similar posts to find underperforming content.  
- **Key Technical Decisions:**  
  - **Dimensionality Reduction**: Apply UMAP before clustering for efficiency.  

```python
from sklearn.ensemble import IsolationForest

def detect_engagement_anomalies(X):
    clf = IsolationForest(contamination=0.05)
    anomalies = clf.fit_predict(X)
    return np.where(anomalies == -1)[0]
```

---

### **3. NLP & Caption Analysis**  
- **Libraries:**  
  - **spaCy** (POS tagging for hook templates)  
  - **VADER** (sentiment scoring)  
- **Key Technical Decisions:**  
  - **Hook Pattern Extraction**: Regex to identify structures like "X Ways to Y Without Z".  
  - **Emoji Impact Scoring**: Track emoji usage vs. engagement correlation.  

```python
import spacy

nlp = spacy.load("en_core_web_lg")

def extract_hook_pattern(caption):
    doc = nlp(caption)
    verbs = [token.lemma_ for token in doc if token.pos_ == "VERB"]
    return "VERB" in verbs  # E.g., "Get [VERB] Now!"
```

---

### **4. Storage & Caching**  
#### **4.1 Database Schema**  
```sql
CREATE TABLE scan_results (
    user_id UUID REFERENCES users(id),
    scan_time TIMESTAMPTZ,
    optimal_hours JSONB,  -- {"platform": "tiktok", "hours": [18, 20...]}
    content_weaknesses JSONB,  -- {"drop_off_sec": 8.2, "weak_hashtags": [...]}
    competitor_benchmarks JSONB,
    PRIMARY KEY (user_id, scan_time)
);

CREATE INDEX idx_scan_user_time ON scan_results (user_id, scan_time DESC);
```

#### **4.2 Cache Strategy**  
- **Redis Structure:**  
  - Key: `scan:{user_id}:latest`  
  - Value: JSON with TTL=24h  
- **Decision:** Cache scan results to avoid reprocessing identical datasets.  

---

### **5. Security & Compliance**  
- **GDPR Compliance:**  
  - **Pseudonymization**: Store user IDs separately from scan data.  
  - **Right to Erasure**: Cascade delete scan data on user deletion.  
- **Encryption**:  
  - AES-256 for raw competitor data at rest.  

---

### **6. API Design**  
#### **Endpoints:**  
- `POST /scan/initiate`  
  - Payload: `{platforms: ["tiktok", "instagram"], competitors: ["@competitor1"]}`  
- `GET /scan/results/{scan_id}`  
  - Returns: `{optimal_times: [...], hooks: [...]}`  

#### **Rate Limiting:**  
- **Bucket4J**: 10 scans/hour per user.  

---

### **Critical Technical Decisions**  
1. **Async Architecture**  
   - **Why?** Platform API calls are I/O-bound.  
   - **Tools:** Python’s `asyncio` + `httpx` for concurrent requests.  

2. **Columnar Storage for Time-Series**  
   - **Why?** Faster aggregation of engagement metrics.  
   - **Tool:** TimescaleDB (PostgreSQL extension).  

3. **Headless Browser Pooling**  
   - **Why?** Avoid IP bans during competitor scraping.  
   - **Tool:** Browserless.io managed service.  

4. **Anomaly Detection at Edge**  
   - **Why?** Reduce DB load; flag issues during upload.  
   - **Tool:** AWS Lambda@Edge.  

---

### **Testing Strategy**  
- **Unit Tests:**  
  - Mock platform APIs with `pytest-vcr`.  
- **Load Testing:**  
  - Simulate 1,000 concurrent scans with Locust.  
- **Accuracy Testing:**  
  - Compare predicted vs. actual engagement on historical data.  

```yaml
# Example load test config (Locust)
users: 1000  
spawn_rate: 100  
host: https://api.yourservice.com  
tasks:  
  - POST /scan/initiate  
  - GET /scan/results/{scan_id}
```

---

This modular design allows parallel development of components like the scraper or NLP engine while maintaining system resilience. Need **Kubernetes deployment specs** or **CI/CD pipelines** for this architecture? Let me know!