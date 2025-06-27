import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { AnalysisResult, SentimentAnalysisResult, SentimentLabelSchema, SentimentScoreSchema, AnalyzedTextSegmentSchema } from '../../data_analysis/types/analysis_types';
// Placeholder for potential external sentiment analysis library types
// import { SomeSentimentLibClient, SomeSentimentLibOptions } from 'some-sentiment-lib';

@Injectable()
export class SentimentAnalysisEngine {
  private openai: OpenAI;
  // private sentimentClient: SomeSentimentLibClient;

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for SentimentAnalysisEngine');
    }
    this.openai = new OpenAI({ apiKey: this.apiKey });
    console.log('SentimentAnalysisEngine initialized with API key.');
  }

  /**
   * Analyzes the sentiment of a given text.
   * @param text The input text to analyze.
   * @param correlationId Optional ID for tracing.
   * @returns A promise that resolves to an AnalysisResult containing the sentiment analysis.
   */
  async analyzeTextSentiment(
    text: string,
    correlationId?: string
  ): Promise<AnalysisResult<SentimentAnalysisResult>> {
    console.log(`SentimentAnalysisEngine: Analyzing text (length: ${text.length}), correlationId: ${correlationId}`);
    try {
      if (!text || text.trim() === '') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Input text cannot be empty.',
          },
          metadata: {
            generatedAt: new Date(),
            source: 'SentimentAnalysisEngine.analyzeTextSentiment',
            correlationId,
          },
        };
      }

      const prompt = `
Analyze the sentiment of the following text. Provide the output in JSON format with the following structure:
{
  "overallSentiment": "<positive|negative|neutral>",
  "overallScores": {
    "positive": <number_between_0_and_1>,
    "negative": <number_between_0_and_1>,
    "neutral": <number_between_0_and_1>
  },
  "segments": [
    {
      "text": "<original_text_segment>",
      "offset": <number>,
      "length": <number>,
      "sentiment": "<positive|negative|neutral>",
      "scores": {
        "positive": <number_between_0_and_1>,
        "negative": <number_between_0_and_1>,
        "neutral": <number_between_0_and_1>
      },
      "keyPhrases": ["<phrase1>", "<phrase2>"]
    }
  ],
  "dominantEmotion": "<joy|sadness|anger|fear|surprise|disgust|etc.>"
}

Text to analyze:
"${text}"

Return ONLY the JSON object.
`;

      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview', // Or your preferred model
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }, // Ensure JSON output
          temperature: 0.2, // Lower temperature for more deterministic output
        });

        if (!completion.choices || completion.choices.length === 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_RESPONSE_FORMAT',
              message: 'Failed to parse sentiment analysis response: No choices returned from API.',
            },
            metadata: {
              generatedAt: new Date(),
              source: 'SentimentAnalysisEngine.analyzeTextSentiment',
              correlationId,
            },
          };
        }
        const content = completion.choices[0]?.message?.content;
        if (content == null) {
          return {
            success: false,
            error: {
              code: 'INVALID_RESPONSE_FORMAT',
              message: 'Failed to parse sentiment analysis response: API response content is null or empty.',
            },
            metadata: {
              generatedAt: new Date(),
              source: 'SentimentAnalysisEngine.analyzeTextSentiment',
              correlationId,
            },
          };
        }

        let sentimentData: SentimentAnalysisResult;
        try {
          sentimentData = JSON.parse(content);
          if (!sentimentData.overallSentiment || !sentimentData.overallScores) {
            return {
              success: false,
              error: {
                code: 'INVALID_RESPONSE_FORMAT',
                message: 'Failed to parse sentiment analysis response: No overallSentiment or overallScores in API response.',
              },
              metadata: {
                generatedAt: new Date(),
                source: 'SentimentAnalysisEngine.analyzeTextSentiment',
                correlationId,
              },
            };
          }
        } catch (parseError) {
          return {
            success: false,
            error: {
              code: 'INVALID_RESPONSE_FORMAT',
              message: 'Failed to parse sentiment analysis response: ' + (parseError instanceof Error ? parseError.message : String(parseError)),
            },
            metadata: {
              generatedAt: new Date(),
              source: 'SentimentAnalysisEngine.analyzeTextSentiment',
              correlationId,
            },
          };
        }

        return {
          success: true,
          data: sentimentData,
          metadata: {
            generatedAt: new Date(),
            source: 'SentimentAnalysisEngine.analyzeTextSentiment',
            correlationId,
          },
        };
      } catch (error) {
        // API error
        return {
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'Failed to analyze sentiment due to API error: ' + (error instanceof Error ? error.message : String(error)),
          },
          metadata: {
            generatedAt: new Date(),
            source: 'SentimentAnalysisEngine.analyzeTextSentiment',
            correlationId,
          },
        };
      }
    } catch (error) {
      console.error('SentimentAnalysisEngine: Error analyzing sentiment', error);
      const err = error as Error;
      return {
        success: false,
        error: {
          code: 'SENTIMENT_ANALYSIS_FAILED',
          message: err.message || 'An unknown error occurred during sentiment analysis.',
          details: err.stack,
        },
        metadata: {
          generatedAt: new Date(),
          source: 'SentimentAnalysisEngine.analyzeTextSentiment',
          correlationId,
        },
      };
    }
  }
}
