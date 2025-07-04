

# ClipsCommerce 7-Day "Grand Slam" Launch Sequence

This markdown file outlines a 7-day marketing sequence for the launch of ClipsCommerce, culminating next Tuesday. Each day has a theme based on "Grand Slam Offer" principles and includes a specific prompt for your Gemini AI to generate social media copy.

**Instructions:** Each day, copy the provided text for the `parts` array and use it in your n8n "Generate Copy (Gemini)" node.

---

### **Day 1: Wednesday - The "Intrigue" Teaser**
**Theme:** Build curiosity and hint that a solution to a major problem is coming, without revealing what it is.

**AI Prompt:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are a marketing copywriter for ClipsCommerce, an AI-powered tool that turns TikTok trends into shoppable videos. Today's theme is 'Intrigue'. Your goal is to hint at a major solution for e-commerce sellers who struggle to convert social trends into sales, without revealing the product. Create a sense of anticipation. Write one caption for Reddit (max 300 chars, no hashtags), one for X/LinkedIn (max 220 chars, include 2 hashtags like #Ecommerce #SocialCommerce), and one for Instagram Stories (max 150 chars, 1 hashtag). Return JSON: {\"reddit\":\"...\",\"social\":\"...\",\"instagram\":\"...\"}."
        }
      ]
    }
  ]
}
```

---

### **Day 2: Thursday - The "Problem & Agitation"**
**Theme:** Agitate the core pain point. Focus on the frustration of seeing viral trends on TikTok but being unable to capitalize on them for sales.

**AI Prompt:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are a marketing copywriter for ClipsCommerce. Today's theme is 'Problem & Agitation'. Focus on the frustration e-commerce brands face: seeing a product go viral in TikToks but having no way to capture that demand instantly. Emphasize the missed revenue and chaotic scramble. Write one caption for Reddit (max 300 chars, no hashtags), one for X/LinkedIn (max 220 chars, include 2 hashtags like #Marketing #EcommerceTips), and one for Instagram Stories (max 150 chars, 1 hashtag). Return JSON: {\"reddit\":\"...\",\"social\":\"...\",\"instagram\":\"...\"}."
        }
      ]
    }
  ]
}
```

---

### **Day 3: Friday - The "Big Reveal" of the Solution**
**Theme:** Introduce ClipsCommerce as the ultimate solution to the problem you agitated yesterday. Clearly state what it is and who it's for.

**AI Prompt:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are a marketing copywriter for ClipsCommerce. Today's theme is the 'Big Reveal'. Announce ClipsCommerce as the new, AI-powered solution that turns viral TikToks into shoppable video experiences automatically. State clearly that the wait for a real solution is over. Write one caption for Reddit (max 300 chars, no hashtags), one for X/LinkedIn (max 220 chars, include 2 hashtags like #SaaS #MarTech), and one for Instagram Stories (max 150 chars, 1 hashtag). Return JSON: {\"reddit\":\"...\",\"social\":\"...\",\"instagram\":\"...\"}."
        }
      ]
    }
]
}
```

---

### **Day 4: Saturday - "Social Proof & Use Case"**
**Theme:** Build credibility. Show a tangible example or a powerful testimonial (even a hypothetical one for pre-launch) of how it works.

**AI Prompt:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are a marketing copywriter for ClipsCommerce. Today's theme is 'Social Proof & Use Case'. Create a mini-case study. For example: 'A beauty brand saw a 300% spike in traffic after ClipsCommerce automatically linked a trending makeup tutorial to their product page.' Make it feel real and impactful. Write one caption for Reddit (max 300 chars, no hashtags), one for X/LinkedIn (max 220 chars, include 2 hashtags like #SocialProof #CaseStudy), and one for Instagram Stories (max 150 chars, 1 hashtag). Return JSON: {\"reddit\":\"...\",\"social\":\"...\",\"instagram\":\"...\"}."
        }
      ]
    }
  ]
}
```

---

### **Day 5: Sunday - The "Value & Benefits"**
**Theme:** Focus on the core benefits, not just features. What does the user *get*? More sales, more time back, less stress.

**AI Prompt:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are a marketing copywriter for ClipsCommerce. Today's theme is 'Value & Benefits'. Don't talk about AI or features; talk about outcomes. Focus on 'Stop guessing, start selling', 'Automate your trend-to-cash pipeline', and 'Never miss a viral opportunity again'. Write one caption for Reddit (max 300 chars, no hashtags), one for X/LinkedIn (max 220 chars, include 2 hashtags like #Revenue #Automation), and one for Instagram Stories (max 150 chars, 1 hashtag). Return JSON: {\"reddit\":\"...\",\"social\":\"...\",\"instagram\":\"...\"}."
        }
      ]
    }
  ]
}
```

---

### **Day 6: Monday - "Urgency & The Grand Slam Offer"**
**Theme:** Build urgency for launch day. Announce a powerful, limited-time launch offer for early adopters. This is the core of the Grand Slam.

**AI Prompt:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are a marketing copywriter for ClipsCommerce. Today's theme is 'Urgency & The Grand Slam Offer'. Announce that we launch TOMORROW. To celebrate, the first 50 users will get a lifetime deal at 50% off, plus a free 1-on-1 strategy session on viral marketing. Emphasize this offer is strictly limited and will never be repeated. Write one caption for Reddit (max 300 chars, no hashtags), one for X/LinkedIn (max 220 chars, include 2 hashtags like #Launch #SpecialOffer), and one for Instagram Stories (max 150 chars, 1 hashtag). Return JSON: {\"reddit\":\"...\",\"social\":\"...\",\"instagram\":\"...\"}."
        }
      ]
    }
  ]
}
```

---

### **Day 7: Tuesday - LAUNCH DAY!**
**Theme:** Announce that ClipsCommerce is live. Drive hard to the call-to-action with extreme urgency.

**AI Prompt:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are a marketing copywriter for ClipsCommerce. Today is LAUNCH DAY. Announce that we are LIVE. Drive immediate action to the website. Restate the 'Grand Slam Offer': 50% off for life for the first 50 users, plus a free strategy call. Create massive FOMO (Fear Of Missing Out). Use strong, direct call-to-actions. Write one caption for Reddit (max 300 chars, no hashtags), one for X/LinkedIn (max 220 chars, include 2 hashtags like #ProductLaunch #NowLive), and one for Instagram Stories (max 150 chars, 1 hashtag). Return JSON: {\"reddit\":\"...\",\"social\":\"...\",\"instagram\":\"...\"}."
        }
      ]
    }
  ]
}
```
