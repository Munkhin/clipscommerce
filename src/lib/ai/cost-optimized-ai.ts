/**
 * Cost-optimized AI service that uses Gemini as primary and OpenAI as fallback
 * Gemini pricing: ~$0.00025 per 1K tokens (10x cheaper than OpenAI)
 * OpenAI pricing: ~$0.002 per 1K tokens
 */

interface AIProvider {
  name: 'gemini' | 'openai';
  cost: number; // Cost per 1K tokens
  available: boolean;
}

interface GenerationRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface GenerationResponse {
  content: string;
  provider: 'gemini' | 'openai' | 'fallback';
  tokensUsed: number;
  cost: number;
  success: boolean;
}

export class CostOptimizedAI {
  private providers: AIProvider[] = [
    { name: 'gemini', cost: 0.00025, available: !!process.env.GEMINI_API_KEY },
    { name: 'openai', cost: 0.002, available: !!process.env.OPENAI_API_KEY }
  ];

  private stats = {
    totalRequests: 0,
    geminiRequests: 0,
    openaiRequests: 0,
    fallbackRequests: 0,
    totalCost: 0,
    costSaved: 0
  };

  /**
   * Generate content using the most cost-effective available provider
   */
  async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
    this.stats.totalRequests++;

    // Try Gemini first (cheapest)
    if (this.providers[0].available) {
      try {
        const result = await this.generateWithGemini(request);
        this.stats.geminiRequests++;
        this.stats.totalCost += result.cost;
        
        // Calculate savings vs OpenAI
        const openAISavings = (this.providers[1].cost - this.providers[0].cost) * result.tokensUsed / 1000;
        this.stats.costSaved += openAISavings;
        
        return result;
      } catch (error) {
        console.warn('Gemini failed, falling back to OpenAI:', error);
      }
    }

    // Fallback to OpenAI
    if (this.providers[1].available) {
      try {
        const result = await this.generateWithOpenAI(request);
        this.stats.openaiRequests++;
        this.stats.totalCost += result.cost;
        return result;
      } catch (error) {
        console.warn('OpenAI failed, using template fallback:', error);
      }
    }

    // Ultimate fallback to templates
    this.stats.fallbackRequests++;
    return this.generateFallbackContent(request);
  }

  /**
   * Generate content using Google Gemini API
   */
  private async generateWithGemini(request: GenerationRequest): Promise<GenerationResponse> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Fastest, cheapest model

    const prompt = request.systemPrompt 
      ? `${request.systemPrompt}\n\nUser: ${request.prompt}`
      : request.prompt;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: request.maxTokens || 300,
        temperature: request.temperature || 0.8,
      },
    });

    const response = await result.response;
    const content = response.text();
    
    // Estimate tokens (Gemini doesn't provide exact count)
    const tokensUsed = Math.ceil(content.length / 4);
    const cost = (tokensUsed / 1000) * this.providers[0].cost;

    return {
      content,
      provider: 'gemini',
      tokensUsed,
      cost,
      success: true
    };
  }

  /**
   * Generate content using OpenAI API (fallback)
   */
  private async generateWithOpenAI(request: GenerationRequest): Promise<GenerationResponse> {
    const { OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const messages: any[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    messages.push({ role: 'user', content: request.prompt });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: request.maxTokens || 300,
      temperature: request.temperature || 0.8,
    });

    const content = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || Math.ceil(content.length / 4);
    const cost = (tokensUsed / 1000) * this.providers[1].cost;

    return {
      content,
      provider: 'openai',
      tokensUsed,
      cost,
      success: true
    };
  }

  /**
   * Template-based fallback when both APIs fail
   */
  private generateFallbackContent(request: GenerationRequest): GenerationResponse {
    const prompt = request.prompt.toLowerCase();
    let content = '';

    if (prompt.includes('hook') || prompt.includes('attention')) {
      content = `• "You won't believe what happened when I tried this..."
• "The secret that changed everything about my business"
• "This one trick completely transformed my results"
• "Everyone's doing this wrong - here's the right way"
• "I tested this for 30 days and here's what happened"`;
    } else if (prompt.includes('script') || prompt.includes('structure')) {
      content = `0-3s: Hook - Start with your strongest, most attention-grabbing claim
3-8s: Problem - Identify the specific pain point your audience faces
8-15s: Solution - Present your product/service as the perfect answer
15-25s: Proof - Show results, testimonials, or demonstrations
25-30s: Call to Action - Tell viewers exactly what to do next`;
    } else if (prompt.includes('visual') || prompt.includes('audio')) {
      content = `Visual Suggestions:
• High-quality close-up shots with dynamic lighting
• Authentic behind-the-scenes content
• Before/after transformation sequences
• User testimonials with genuine reactions

Audio Suggestions:
• Upbeat background music (120-140 BPM)
• Clear, confident voiceover with strategic pauses
• Sound effects to highlight key moments
• Trending audio clips relevant to your niche`;
    } else if (prompt.includes('guideline') || prompt.includes('strategy')) {
      content = `Strategic Guidelines for Maximum Engagement:

📊 Posting Strategy:
• Post during peak hours (6-9 PM) for maximum visibility
• Use trending sounds and hashtags relevant to your niche
• Keep content under 60 seconds for better retention

🎯 Engagement Optimization:
• Respond to comments within the first hour
• Use interactive elements (polls, questions, challenges)
• Cross-promote across multiple platforms`;
    } else {
      content = `Based on your request, here are strategic recommendations:

• Focus on creating authentic, value-driven content
• Use compelling hooks to capture attention in the first 3 seconds
• Include clear calls-to-action to drive engagement
• Optimize for your specific platform and audience
• Test different approaches and measure results`;
    }

    return {
      content,
      provider: 'fallback',
      tokensUsed: Math.ceil(content.length / 4),
      cost: 0,
      success: true
    };
  }

  /**
   * Get cost optimization statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageCostPerRequest: this.stats.totalRequests > 0 
        ? this.stats.totalCost / this.stats.totalRequests 
        : 0,
      geminiUsagePercent: this.stats.totalRequests > 0 
        ? (this.stats.geminiRequests / this.stats.totalRequests) * 100 
        : 0,
      estimatedMonthlySavings: this.stats.costSaved * 30 // Rough estimate
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      geminiRequests: 0,
      openaiRequests: 0,
      fallbackRequests: 0,
      totalCost: 0,
      costSaved: 0
    };
  }

  /**
   * Batch generate multiple pieces of content efficiently
   */
  async batchGenerate(requests: GenerationRequest[]): Promise<GenerationResponse[]> {
    // Process in parallel for better performance
    const promises = requests.map(request => this.generateContent(request));
    return Promise.all(promises);
  }

  /**
   * Generate optimized content specifically for the ideator
   */
  async generateIdeatorContent(description: string): Promise<{
    videoIdeas: Array<{
      title: string;
      hook: string;
      script: string;
      visuals: string;
      audio: string;
      hashtags: string;
      tips: string;
    }>;
    totalCost: number;
    provider: string;
  }> {
    const systemPrompt = `You are an expert social media content creator and marketing strategist. 
    
IMPORTANT FORMATTING RULES:
- Use clear, concise bullet points (• symbol)
- Keep each point under 15 words
- Focus on actionable, specific advice
- Use power words and emotional triggers
- Structure responses for maximum readability`;

    const requests: GenerationRequest[] = [
      {
        prompt: `Based on this product/service: "${description}"

Generate 3 distinct video content ideas. For each idea, provide:

VIDEO IDEA 1:
Title: [Compelling video title]
Hook: [3 bullet points with attention-grabbing opening lines]
Script: [5 bullet points outlining the video flow with timing]
Visuals: [4 bullet points for camera work and visual elements]
Audio: [3 bullet points for music and sound design]
Hashtags: [6-8 relevant hashtags as bullet points]
Tips: [3 bullet points for optimization]

VIDEO IDEA 2:
[Same structure]

VIDEO IDEA 3:
[Same structure]

Focus on different angles: problem-solution, behind-scenes, testimonial.`,
        systemPrompt,
        maxTokens: 800,
        temperature: 0.8
      }
    ];

    const results = await this.batchGenerate(requests);
    const totalCost = results.reduce((sum, result) => sum + result.cost, 0);
    const primaryProvider = results[0]?.provider || 'fallback';

    // Parse the response to extract video ideas
    const content = results[0]?.content || '';
    const videoIdeas = this.parseVideoIdeas(content, description);

    return {
      videoIdeas,
      totalCost,
      provider: primaryProvider
    };
  }

  /**
   * Parse the AI response into structured video ideas
   */
  private parseVideoIdeas(content: string, description: string): Array<{
    title: string;
    hook: string;
    script: string;
    visuals: string;
    audio: string;
    hashtags: string;
    tips: string;
  }> {
    const videoIdeas = [];
    
    // Split content by video ideas
    const videoSections = content.split(/VIDEO IDEA \d+:/g).filter(section => section.trim());
    
    for (const section of videoSections.slice(0, 3)) { // Limit to 3 ideas
      const idea = {
        title: this.extractSection(section, 'Title:', 'Hook:') || `${description} Content Strategy`,
        hook: this.extractSection(section, 'Hook:', 'Script:') || this.getFallbackHooks(description),
        script: this.extractSection(section, 'Script:', 'Visuals:') || this.getFallbackScript(),
        visuals: this.extractSection(section, 'Visuals:', 'Audio:') || this.getFallbackVisuals(),
        audio: this.extractSection(section, 'Audio:', 'Hashtags:') || this.getFallbackAudio(),
        hashtags: this.extractSection(section, 'Hashtags:', 'Tips:') || this.getFallbackHashtags(description),
        tips: this.extractSection(section, 'Tips:', '') || this.getFallbackTips()
      };
      videoIdeas.push(idea);
    }

    // If parsing failed, provide fallback video ideas
    if (videoIdeas.length === 0) {
      return this.getFallbackVideoIdeas(description);
    }

    return videoIdeas;
  }

  private extractSection(content: string, startMarker: string, endMarker: string): string {
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';
    
    const afterStart = content.substring(startIndex + startMarker.length);
    const endIndex = endMarker ? afterStart.indexOf(endMarker) : afterStart.length;
    
    return afterStart.substring(0, endIndex > -1 ? endIndex : afterStart.length).trim();
  }

  private getFallbackVideoIdeas(description: string): Array<{
    title: string;
    hook: string;
    script: string;
    visuals: string;
    audio: string;
    hashtags: string;
    tips: string;
  }> {
    return [
      {
        title: `${description} - Problem Solution Story`,
        hook: this.getFallbackHooks(description),
        script: this.getFallbackScript(),
        visuals: this.getFallbackVisuals(),
        audio: this.getFallbackAudio(),
        hashtags: this.getFallbackHashtags(description),
        tips: this.getFallbackTips()
      },
      {
        title: `Behind the Scenes: ${description}`,
        hook: `• Ever wondered how ${description} actually works?\n• The secret process nobody talks about\n• What happens behind closed doors`,
        script: `• 0-3s: Hook viewers with intriguing question\n• 3-10s: Show behind-the-scenes process\n• 10-20s: Reveal surprising insights\n• 20-25s: Connect to viewer benefits\n• 25-30s: Strong call-to-action`,
        visuals: this.getFallbackVisuals(),
        audio: this.getFallbackAudio(),
        hashtags: this.getFallbackHashtags(description),
        tips: this.getFallbackTips()
      },
      {
        title: `Customer Success Story: ${description}`,
        hook: `• This ${description} changed everything for me\n• From skeptic to believer in 30 days\n• The transformation nobody expected`,
        script: `• 0-3s: Bold transformation claim\n• 3-8s: Show before state/problem\n• 8-18s: Demonstrate solution in action\n• 18-25s: Reveal amazing results\n• 25-30s: Encourage viewers to try`,
        visuals: this.getFallbackVisuals(),
        audio: this.getFallbackAudio(),
        hashtags: this.getFallbackHashtags(description),
        tips: this.getFallbackTips()
      }
    ];
  }

  private getFallbackHooks(description: string): string {
    return `• You won't believe what ${description} can do in 60 seconds
• The ${description} secret everyone's talking about
• This ${description} hack will change your life`;
  }

  private getFallbackScript(): string {
    return `• 0-3s: Hook viewers with compelling opener
• 3-8s: Present the core problem
• 8-15s: Introduce your solution
• 15-25s: Show proof or demonstration
• 25-30s: Clear call-to-action`;
  }

  private getFallbackVisuals(): string {
    return `• High-quality product close-ups
• Dynamic lighting and angles
• Before/after comparisons
• Authentic user reactions`;
  }

  private getFallbackAudio(): string {
    return `• Upbeat music (120-140 BPM)
• Clear, confident voiceover
• Strategic sound effects`;
  }

  private getFallbackHashtags(description: string): string {
    const product = description.split(' ')[0].toLowerCase();
    return `• #${product}
• #viral
• #fyp
• #trending
• #musthave
• #gamechanging`;
  }

  private getFallbackTips(): string {
    return `• Post during peak hours (6-9 PM)
• Engage with comments immediately
• Use trending audio clips`;
  }
}

// Export singleton instance
export const costOptimizedAI = new CostOptimizedAI();