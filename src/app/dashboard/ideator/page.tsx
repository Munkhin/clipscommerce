"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Sparkles, Copy, Save, Share, Lightbulb, Brain, Zap, Image as ImageIcon, Video, Hash, Mic } from "lucide-react";
import GlassCard from '@/components/ui/GlassCard';

export default function IdeatorPage() {
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    hooks: string[];
    script: string;
    visuals: string[];
    audio: string[];
    hashtags: string[];
    guidelines: string;
  } | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      // Call AI content generation service
      // This would typically call OpenAI, Claude, or a custom AI service
      const generateContent = async () => {
        // Simulate API processing time
        await new Promise((res) => setTimeout(res, 2000));
        
        // In a real implementation, this would make an API call like:
        // const response = await fetch('/api/ai/generate/content', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ description, image })
        // });
        // return response.json();
        
        const productKeywords = description.split(' ').slice(0, 3).join(' ');
        const mainProduct = description.split(' ')[0] || 'product';
        
        return {
          hooks: [
            `Transform your ${productKeywords} into viral content!`,
            `The secret behind successful ${mainProduct} marketing`,
            "You won't believe what happens when you try this approach",
            `Why ${mainProduct} creators are switching to this strategy`
          ],
          script: `Hook (0-3s): Start with an attention-grabbing statement about ${mainProduct}. \n\nProblem (3-10s): Identify the pain point your audience faces with ${productKeywords}. \n\nSolution (10-20s): Present your ${productKeywords} as the perfect solution. \n\nProof (20-30s): Show results, testimonials, or demonstrations. \n\nCall-to-Action (30-45s): Tell viewers exactly what to do next.`,
          visuals: [
            `High-quality ${mainProduct} shots with dynamic lighting`,
            "Close-up details highlighting key features and benefits",
            "Before/after comparisons showing transformation",
            "User testimonials with authentic reactions",
            "Behind-the-scenes content creation process"
          ],
          audio: [
            "Upbeat, energetic music matching your brand (120-140 BPM)",
            "Clear, confident voiceover with strategic pauses",
            "Sound effects highlighting key moments and transitions",
            "Trending audio clips relevant to your niche"
          ],
          hashtags: [
            `#${mainProduct.replace(/[^a-zA-Z0-9]/g, '')}`,
            "#ContentCreator", "#MarketingTips", "#ViralContent", 
            "#SocialMediaStrategy", "#BusinessGrowth", "#EntrepreneurLife", 
            "#BrandBuilding", "#CreatorEconomy"
          ],
          guidelines: `For optimal engagement with ${productKeywords}, focus on authentic storytelling that resonates with your target audience. Post during peak hours (6-9 PM), use trending sounds, engage with comments within the first hour. Keep videos under 60 seconds for maximum retention, and always include a clear call-to-action. Test different hook styles to see what works best for your audience.`
        };
      };
      
      const generatedContent = await generateContent();
      setResults(generatedContent);
    } catch (err: unknown) {
      setError("Failed to generate content ideas. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const copyAllResults = () => {
    if (results) {
      const allContent = `\nHooks:\n${results.hooks.map((hook: string, i: number) => `${i + 1}. ${hook}`).join('\n')}\n\nSCRIPT STRUCTURE:\n${results.script}\n\nVISUAL GUIDELINES:\n${results.visuals.map((v: string, i: number) => `• ${v}`).join('\n')}\n\nAUDIO SUGGESTIONS:\n${results.audio.map((a: string, i: number) => `• ${a}`).join('\n')}\n\nHASHTAGS:\n${results.hashtags.join(' ')}\n\nGUIDELINES:\n${results.guidelines}\n      `;
      copyToClipboard(allContent);
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #0a0b0f 0%, #111318 50%, #1a1d25 100%)'
    }}>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Enhanced Header */}
        <div className="text-center space-y-4 animate-fadeIn">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight gradient-text">Ideator</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Transform your product description into viral-ready content ideas with AI-powered creativity
          </p>
        </div>

        {/* Enhanced Input Section */}
        <GlassCard className="animate-slideUp">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Brain className="h-6 w-6 text-violet-400" />
              Describe Your Product or Service
            </h2>
            <p className="text-gray-400 mt-1">The more details you provide, the better content ideas we can generate</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <Textarea
                placeholder="Describe your product or service in detail... Include features, benefits, target audience, and what makes it unique. Mention your industry, competitors, and any specific goals you have for your content marketing."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={12}
                disabled={loading}
                className="w-full text-base leading-relaxed p-6 rounded-xl border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:border-violet-500 resize-none transition-colors min-h-[300px]"
              />
              <div className="text-xs text-gray-500 text-right">
                {description.length}/2000 characters
              </div>
            </div>
            
            <div className="flex items-center gap-6 pt-4">
              <label className="flex items-center cursor-pointer hover-lift">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
                  <Upload className="h-5 w-5 text-violet-400" />
                  <span className="text-white">Attach image</span>
                </div>
                <Input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange} 
                  disabled={loading} 
                />
              </label>
              {image && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
                  <ImageIcon className="h-4 w-4" />
                  <span>{image.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleGenerate} 
                disabled={loading || !description.trim()} 
                className="btn-primary text-lg px-8 py-4 flex items-center gap-3"
              >
                {loading ? (
                  <>
                    <Sparkles className="h-5 w-5 animate-spin" />
                    Generating Ideas...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-5 w-5" />
                    Generate Ideas
                  </>
                )}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Error State */}
        {error && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
              {error}
            </div>
          </div>
        )}

        {/* Enhanced Results Section */}
        {results && (
          <div className="space-y-6 animate-slideUp">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Your Content Strategy</h2>
              <p className="text-gray-400">AI-generated ideas tailored to your product</p>
            </div>
            
            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Hooks Section */}
              <GlassCard className="p-6 hover-lift">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                      <Zap className="h-5 w-5 text-violet-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Hooks</h3>
                  </div>
                  <div className="space-y-3">
                    {results.hooks.map((hook: string, i: number) => (
                      <div key={i} className="group relative">
                        <div className="p-3 bg-gray-800/50 rounded-lg text-sm text-gray-300 border border-gray-700/50 group-hover:border-violet-500/30 transition-colors">
                          &quot;{hook}&quot;
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                          onClick={() => copyToClipboard(hook)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Script Section */}
              <GlassCard className="p-6 hover-lift">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Video className="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Script Structure</h3>
                  </div>
                  <div className="relative group">
                    <div className="p-4 bg-gray-800/50 rounded-lg text-sm text-gray-300 border border-gray-700/50 group-hover:border-blue-500/30 transition-colors leading-relaxed">
                      {results.script}
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                      onClick={() => copyToClipboard(results.script)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </GlassCard>

              {/* Visuals Section */}
              <GlassCard className="p-6 hover-lift">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <ImageIcon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Visual Guidelines</h3>
                  </div>
                  <div className="space-y-3">
                    {results.visuals.map((visual: string, i: number) => (
                      <div key={i} className="group relative">
                        <div className="p-3 bg-gray-800/50 rounded-lg text-sm text-gray-300 border border-gray-700/50 group-hover:border-emerald-500/30 transition-colors">
                          • {visual}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                          onClick={() => copyToClipboard(visual)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Audio Section */}
              <GlassCard className="p-6 hover-lift">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Mic className="h-5 w-5 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Audio Suggestions</h3>
                  </div>
                  <div className="space-y-3">
                    {results.audio.map((audio: string, i: number) => (
                      <div key={i} className="group relative">
                        <div className="p-3 bg-gray-800/50 rounded-lg text-sm text-gray-300 border border-gray-700/50 group-hover:border-orange-500/30 transition-colors">
                          • {audio}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                          onClick={() => copyToClipboard(audio)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Hashtags Section */}
            <GlassCard className="p-6 hover-lift">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Hash className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Recommended Hashtags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {results.hashtags.map((tag: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(tag)}
                      className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-sm border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* Guidelines Section */}
            <GlassCard className="p-6 hover-lift">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Brain className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Strategic Guidelines</h3>
                </div>
                <div className="relative group">
                  <div className="p-4 bg-gray-800/50 rounded-lg text-sm text-gray-300 border border-gray-700/50 group-hover:border-purple-500/30 transition-colors leading-relaxed">
                    {results.guidelines}
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                    onClick={() => copyToClipboard(results.guidelines)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              <Button 
                onClick={copyAllResults}
                className="btn-primary flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy All Content
              </Button>
              <Button 
                variant="outline" 
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save in Library
              </Button>
              <Button 
                variant="outline" 
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 flex items-center gap-2"
              >
                <Share className="h-4 w-4" />
                Share Strategy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}