"use client";

export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Download, Save, Copy, User, Bot, Video, Hash, Clock, Eye, Volume2, Target, TrendingUp } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "@/components/ui/accordion";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  videoIdeas?: VideoIdea[];
}

interface VideoIdea {
  title: string;
  hook: string;
  script: string;
  visuals: string;
  audio: string;
  hashtags: string;
  tips: string;
}

export default function IdeatorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTypingIndex, setCurrentTypingIndex] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateVideoIdeas = async (description: string): Promise<VideoIdea[]> => {
    try {
      // Use the new cost-optimized AI endpoint for batch generation
      const response = await fetch('/api/ai/ideator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      
      // Log cost savings information
      if (data.stats) {
        console.log('💰 Cost Optimization Stats:', {
          provider: data.stats.provider,
          totalCost: `$${data.stats.totalCost.toFixed(4)}`,
          costSaved: `$${data.stats.costSaved.toFixed(4)}`,
          geminiUsage: `${data.stats.geminiUsagePercent.toFixed(1)}%`,
          monthlySavings: `$${data.stats.estimatedMonthlySavings.toFixed(2)}`
        });
      }

      return data.videoIdeas || generateFallbackVideoIdeas(description);
    } catch (error) {
      console.error('Error generating AI responses:', error);
      // Fallback to template responses
      return generateFallbackVideoIdeas(description);
    }
  };

  const generateFallbackVideoIdeas = (description: string): VideoIdea[] => {
    const product = description.split(' ')[0] || 'product';
    
    return [
      {
        title: `${description} - Problem Solution Story`,
        hook: `• You won't believe what ${product} can do in 60 seconds\n• The ${description} secret everyone's talking about\n• This ${product} hack will change your life`,
        script: `• 0-3s: Hook viewers with compelling opener\n• 3-8s: Present the core problem\n• 8-15s: Introduce your solution\n• 15-25s: Show proof or demonstration\n• 25-30s: Clear call-to-action`,
        visuals: `• High-quality product close-ups\n• Dynamic lighting and angles\n• Before/after comparisons\n• Authentic user reactions`,
        audio: `• Upbeat music (120-140 BPM)\n• Clear, confident voiceover\n• Strategic sound effects`,
        hashtags: `• #${product.toLowerCase()}\n• #viral\n• #fyp\n• #trending\n• #musthave\n• #gamechanging`,
        tips: `• Post during peak hours (6-9 PM)\n• Engage with comments immediately\n• Use trending audio clips`
      },
      {
        title: `Behind the Scenes: ${description}`,
        hook: `• Ever wondered how ${product} actually works?\n• The secret process nobody talks about\n• What happens behind closed doors`,
        script: `• 0-3s: Hook viewers with intriguing question\n• 3-10s: Show behind-the-scenes process\n• 10-20s: Reveal surprising insights\n• 20-25s: Connect to viewer benefits\n• 25-30s: Strong call-to-action`,
        visuals: `• Behind-the-scenes footage\n• Process documentation\n• Team interactions\n• Raw, authentic moments`,
        audio: `• Casual, conversational tone\n• Natural ambient sounds\n• Minimal background music`,
        hashtags: `• #behindthescenes\n• #${product.toLowerCase()}\n• #authentic\n• #process\n• #insider\n• #transparency`,
        tips: `• Keep it authentic and unpolished\n• Show genuine personality\n• Answer common questions`
      },
      {
        title: `Customer Success Story: ${description}`,
        hook: `• This ${product} changed everything for me\n• From skeptic to believer in 30 days\n• The transformation nobody expected`,
        script: `• 0-3s: Bold transformation claim\n• 3-8s: Show before state/problem\n• 8-18s: Demonstrate solution in action\n• 18-25s: Reveal amazing results\n• 25-30s: Encourage viewers to try`,
        visuals: `• Customer testimonial footage\n• Before/after comparisons\n• Product in use\n• Emotional reactions`,
        audio: `• Emotional, inspiring music\n• Clear customer voice\n• Success sound effects`,
        hashtags: `• #success\n• #transformation\n• #${product.toLowerCase()}\n• #testimonial\n• #results\n• #satisfied`,
        tips: `• Use real customer stories\n• Show genuine emotions\n• Include specific results`
      }
    ];
  };


  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Generate video ideas
      const videoIdeas = await generateVideoIdeas(userMessage.content);
      
      // Add AI response with video ideas
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const assistantMessage: Message = {
        id: `${Date.now()}-response`,
        type: 'assistant',
        content: `Generated ${videoIdeas.length} video ideas for: ${userMessage.content}`,
        timestamp: new Date(),
        videoIdeas: videoIdeas
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating responses:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I apologize, but I'm having trouble generating ideas right now. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentTypingIndex(-1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadContent = () => {
    const content = messages
      .filter(m => m.type === 'assistant' && m.videoIdeas)
      .map(m => {
        let output = `Content Ideas for: ${m.content}\n\n`;
        m.videoIdeas?.forEach((idea, index) => {
          output += `VIDEO IDEA ${index + 1}: ${idea.title}\n`;
          output += `Hook: ${idea.hook.replace(/•/g, '-')}\n`;
          output += `Script: ${idea.script.replace(/•/g, '-')}\n`;
          output += `Visuals: ${idea.visuals.replace(/•/g, '-')}\n`;
          output += `Audio: ${idea.audio.replace(/•/g, '-')}\n`;
          output += `Hashtags: ${idea.hashtags.replace(/•/g, '-')}\n`;
          output += `Tips: ${idea.tips.replace(/•/g, '-')}\n\n`;
        });
        return output;
      })
      .join('\n---\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video-content-ideas.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderBulletPoints = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.trim().startsWith('•')) {
        return (
          <li key={index} className="text-sm text-gray-300 mb-1 leading-relaxed">
            {line.replace('•', '').trim()}
          </li>
        );
      }
      return null;
    }).filter(Boolean);
  };

  const getSectionIcon = (section: string) => {
    switch (section.toLowerCase()) {
      case 'hook': return <Target className="h-4 w-4 text-red-400" />;
      case 'script': return <Clock className="h-4 w-4 text-blue-400" />;
      case 'visuals': return <Eye className="h-4 w-4 text-green-400" />;
      case 'audio': return <Volume2 className="h-4 w-4 text-purple-400" />;
      case 'hashtags': return <Hash className="h-4 w-4 text-yellow-400" />;
      case 'tips': return <TrendingUp className="h-4 w-4 text-orange-400" />;
      default: return <Video className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="max-w-6xl mx-auto px-4 py-6 h-screen flex flex-col">
        {/* Header */}
        <div className="text-center py-6 border-b border-gray-800">
          <h1 className="text-4xl font-bold text-white mb-2">Ideator</h1>
          <p className="text-gray-400">Transform your ideas into viral content strategies with AI</p>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                Describe your product or service to get started with AI-powered content ideas
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            message.type === 'user' ? (
              <div key={message.id} className="flex gap-3 justify-end">
                <div className="max-w-[70%] bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="max-w-[90%] w-full">
                  {message.videoIdeas ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        💡 Content Ideas for: {message.content.replace('Generated ', '').replace(' video ideas for: ', '')}
                      </h3>
                      
                      <Accordion type="multiple" className="space-y-3">
                        {message.videoIdeas.map((idea, ideaIndex) => (
                          <AccordionItem 
                            key={`idea-${ideaIndex}`} 
                            value={`idea-${ideaIndex}`}
                            className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden"
                          >
                            <AccordionTrigger className="px-4 py-3 text-left hover:bg-gray-800">
                              <div className="flex items-center gap-3">
                                <Video className="h-5 w-5 text-blue-400" />
                                <span className="text-white font-medium">{idea.title}</span>
                              </div>
                            </AccordionTrigger>
                            
                            <AccordionContent className="px-4 pb-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Hook Section */}
                                <div className="bg-gray-800 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getSectionIcon('hook')}
                                    <h4 className="font-medium text-white">Hook Lines</h4>
                                  </div>
                                  <ul className="space-y-1">
                                    {renderBulletPoints(idea.hook)}
                                  </ul>
                                </div>

                                {/* Script Section */}
                                <div className="bg-gray-800 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getSectionIcon('script')}
                                    <h4 className="font-medium text-white">Script Flow</h4>
                                  </div>
                                  <ul className="space-y-1">
                                    {renderBulletPoints(idea.script)}
                                  </ul>
                                </div>

                                {/* Visuals Section */}
                                <div className="bg-gray-800 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getSectionIcon('visuals')}
                                    <h4 className="font-medium text-white">Visual Elements</h4>
                                  </div>
                                  <ul className="space-y-1">
                                    {renderBulletPoints(idea.visuals)}
                                  </ul>
                                </div>

                                {/* Audio Section */}
                                <div className="bg-gray-800 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getSectionIcon('audio')}
                                    <h4 className="font-medium text-white">Audio Guide</h4>
                                  </div>
                                  <ul className="space-y-1">
                                    {renderBulletPoints(idea.audio)}
                                  </ul>
                                </div>

                                {/* Hashtags Section */}
                                <div className="bg-gray-800 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getSectionIcon('hashtags')}
                                    <h4 className="font-medium text-white">Hashtags</h4>
                                  </div>
                                  <ul className="space-y-1">
                                    {renderBulletPoints(idea.hashtags)}
                                  </ul>
                                </div>

                                {/* Tips Section */}
                                <div className="bg-gray-800 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getSectionIcon('tips')}
                                    <h4 className="font-medium text-white">Optimization Tips</h4>
                                  </div>
                                  <ul className="space-y-1">
                                    {renderBulletPoints(idea.tips)}
                                  </ul>
                                </div>
                              </div>

                              {/* Copy Button for Individual Idea */}
                              <div className="mt-4 pt-3 border-t border-gray-700">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(`${idea.title}\n\nHook:\n${idea.hook}\n\nScript:\n${idea.script}\n\nVisuals:\n${idea.visuals}\n\nAudio:\n${idea.audio}\n\nHashtags:\n${idea.hashtags}\n\nTips:\n${idea.tips}`)}
                                  className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                >
                                  <Copy className="h-3 w-3 mr-2" />
                                  Copy This Idea
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  ) : (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white">
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            )
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-300">Generating video ideas...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 pt-4">
          {messages.some(m => m.type === 'assistant' && m.videoIdeas) && (
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadContent}
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Ideas
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save to Library
              </Button>
            </div>
          )}
          
          <div className="flex gap-3">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your product or service in detail..."
              className="flex-1 min-h-[60px] max-h-[120px] bg-gray-900 border-gray-700 text-white placeholder-gray-400 resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading}
              className="self-end bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}