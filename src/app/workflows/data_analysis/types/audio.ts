// Types for Audio Trend Service
import { z } from 'zod';
export interface Sound {
  sound_id: string;
  url: string;
  velocity: number;
  bpm?: number | null;
  mood?: string | null;
  isCopyrightSafe?: boolean;
  [key: string]: any; // For additional properties
}

export const PlatformSchema = z.string().min(1, { message: 'Platform cannot be empty' });

export const SoundSchema = z.object({
  sound_id: z.string().min(1, { message: 'Sound ID cannot be empty' }),
  url: z.string().url({ message: 'Invalid URL format for sound' }),
  velocity: z.number().nonnegative({ message: 'Velocity must be a non-negative number' }),
  bpm: z.number().nullable().optional(),
  mood: z.string().nullable().optional(),
  isCopyrightSafe: z.boolean().optional(),
}).catchall(z.any());

export const AudioClientTrendingSoundsResponseSchema = z.array(SoundSchema);

export interface AudioAnalysisResult {
  bpm: number | null;
  mood: string | null;
  isCopyrightSafe: boolean;
}

export interface AudioClient {
  getTrendingSounds(platform: string): Promise<Sound[]>;
}

export interface LibrosaClient {
  load(audioPath: string): Promise<Float32Array>;
  beatsBpm(audioData: Float32Array, sampleRate: number): Promise<number>;
}

export interface MoodPrediction {
  mood: string;
  confidence: number;
}

export interface CNNModel {
  predict(audioData: Float32Array): Promise<MoodPrediction>;
}

export interface ShazamClient {
  recognize(audioUrl: string): Promise<{ isCopyrighted: boolean }>;
}
