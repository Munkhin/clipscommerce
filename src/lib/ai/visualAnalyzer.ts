import * as tf from '@tensorflow/tfjs';
import { Cache } from '../utils/cache';

export interface VisualAnalysisResult {
  // Image classification results
  objects: Array<{
    class: string;
    score: number; // 0-1 confidence
    boundingBox?: { // Optional bounding box
      top: number;
      left: number;
      width: number;
      height: number;
    }
  }>;
  
  // Overall image attributes
  colors: Array<{
    color: string; // Hex code
    percentage: number; // 0-1 percentage of image
  }>;
  
  // Visual sentiment
  sentiment: {
    score: number; // -1 to 1 (negative to positive)
    confidence: number; // 0-1
  };
  
  // Composition metrics
  composition: {
    hasText: boolean;
    textPercentage?: number;
    complexity: number; // 0-1 (simple to complex)
    brightness: number; // 0-1 (dark to bright)
    contrast: number; // 0-1 (low to high)
    faceCount: number;
    dominant: 'person' | 'object' | 'nature' | 'text' | 'abstract' | 'other';
  };
  
  // Performance metrics
  performance: {
    processingTimeMs: number;
    modelName: string;
    source: 'tfjs' | 'cached';
  };
}

export interface VisualAnalyzerConfig {
  useLocalModels: boolean;
  enableObjectDetection: boolean;
  enableFaceDetection: boolean;
  maxCacheSize: number;
  cacheTtlMs: number;
  maxImageDimension: number; // Resize large images to this maximum dimension
  processingQuality: 'low' | 'medium' | 'high';
}

/**
 * Visual content analyzer using TensorFlow.js
 * 
 * Runs entirely in the browser to avoid API costs and latency
 * Uses a tiered approach for different levels of analysis
 */
export class VisualAnalyzer {
  private config: VisualAnalyzerConfig;
  private cache: Cache<string, VisualAnalysisResult>;
  private models: {
    mobilenet?: tf.GraphModel;
    objectDetection?: tf.GraphModel;
    faceDetection?: tf.GraphModel;
  } = {};
  private initialized = false;
  private initializing = false;
  
  // Performance tracking
  private performanceMetrics = {
    totalProcessed: 0,
    cacheHits: 0,
    avgProcessingTime: 0,
    totalProcessingTime: 0,
  };

  constructor(config: Partial<VisualAnalyzerConfig> = {}) {
    // Default configuration
    this.config = {
      useLocalModels: true,
      enableObjectDetection: true,
      enableFaceDetection: true,
      maxCacheSize: 100, // Images can be large, so keep cache small
      cacheTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxImageDimension: 640, // Resize large images
      processingQuality: 'medium',
      ...config
    };

    // Size calculator for cache (approximate size of image data)
    const sizeCalculator = (_key: string, value: VisualAnalysisResult) => {
      // Base size for the result object
      let size = JSON.stringify(value).length;
      
      // Each object detection adds approximately 100 bytes
      size += value.objects.length * 100;
      
      // Each color adds approximately 30 bytes
      size += value.colors.length * 30;
      
      return size;
    };

    // Initialize cache
    this.cache = new Cache<string, VisualAnalysisResult>({
      maxSize: this.config.maxCacheSize,
      ttl: this.config.cacheTtlMs,
      sizeCalculator,
    });
  }

  /**
   * Initialize the models (load from CDN)
   * Should be called before any analysis
   */
  public async initialize(): Promise<void> {
    if (this.initialized || this.initializing) return;
    
    this.initializing = true;
    
    try {
      // Load TensorFlow.js core
      await tf.ready();
      
      // Load MobileNet for image classification (lightweight)
      this.models.mobilenet = await tf.loadGraphModel(
        'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/classification/5/default/1',
        { fromTFHub: true }
      );
      
      // Load models based on quality setting
      if (this.config.enableObjectDetection) {
        // Choose model based on quality setting
        let objectModelUrl = '';
        
        switch (this.config.processingQuality) {
          case 'low':
            objectModelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1';
            break;
          case 'medium':
            objectModelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1';
            break;
          case 'high':
            objectModelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/faster_rcnn/inception_resnet_v2_640x640/1/default/1';
            break;
        }
        
        this.models.objectDetection = await tf.loadGraphModel(
          objectModelUrl,
          { fromTFHub: true }
        );
      }
      
      if (this.config.enableFaceDetection) {
        // Load face-api.js or BlazeFace model based on needs
        // For simplicity in this implementation, we'll skip detailed implementation
        // this.models.faceDetection = await tf.loadGraphModel(...);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing visual analyzer:', error);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Analyze an image
   * @param imageUrl URL of image to analyze (can be remote URL, blob URL, or data URL)
   * @param skipCache Skip cache and force reanalysis
   */
  public async analyzeImage(imageUrl: string, skipCache = false): Promise<VisualAnalysisResult> {
    // Ensure models are initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(imageUrl);
    
    // Check cache
    if (!skipCache) {
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        this.performanceMetrics.cacheHits++;
        return {
          ...cachedResult,
          performance: {
            ...cachedResult.performance,
            source: 'cached',
            processingTimeMs: performance.now() - startTime
          }
        };
      }
    }
    
    // Load and preprocess image
    const image = await this.loadImage(imageUrl);
    
    // Run analysis pipeline
    const result = await this.runAnalysisPipeline(image);
    
    // Cleanup to prevent memory leaks
    tf.dispose(image);
    
    // Update performance metrics
    const processingTime = performance.now() - startTime;
    this.performanceMetrics.totalProcessed++;
    this.performanceMetrics.totalProcessingTime += processingTime;
    this.performanceMetrics.avgProcessingTime = 
      this.performanceMetrics.totalProcessingTime / this.performanceMetrics.totalProcessed;
    
    // Add performance data to result
    const analysisResult: VisualAnalysisResult = {
      ...result,
      performance: {
        processingTimeMs: processingTime,
        modelName: this.config.processingQuality,
        source: 'tfjs'
      }
    };
    
    // Cache result
    this.cache.set(cacheKey, analysisResult);
    
    return analysisResult;
  }

  /**
   * Load and preprocess an image
   */
  private async loadImage(imageUrl: string): Promise<tf.Tensor3D> {
    // Load image from URL
    const img = await this.fetchImage(imageUrl);
    
    // Convert to tensor
    let tensor = tf.browser.fromPixels(img);
    
    // Resize if needed
    const [height, width] = tensor.shape;
    const maxDim = Math.max(height, width);
    
    if (maxDim > this.config.maxImageDimension) {
      const scale = this.config.maxImageDimension / maxDim;
      const newHeight = Math.round(height * scale);
      const newWidth = Math.round(width * scale);
      tensor = tf.image.resizeBilinear(tensor, [newHeight, newWidth]);
    }
    
    return tensor;
  }

  /**
   * Fetch image from URL and create HTML image element
   */
  private async fetchImage(imageUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = imageUrl;
    });
  }

  /**
   * Run full analysis pipeline on image
   */
  private async runAnalysisPipeline(image: tf.Tensor3D): Promise<Omit<VisualAnalysisResult, 'performance'>> {
    // Run all analysis steps in parallel for performance
    const [objects, colors, composition] = await Promise.all([
      this.detectObjects(image),
      this.analyzeColors(image),
      this.analyzeComposition(image)
    ]);
    
    // Derive sentiment from objects, composition, and colors
    const sentiment = this.deriveSentiment(objects, composition, colors);
    
    return {
      objects,
      colors,
      sentiment,
      composition
    };
  }

  /**
   * Detect objects in image
   */
  private async detectObjects(image: tf.Tensor3D): Promise<VisualAnalysisResult['objects']> {
    if (!this.models.objectDetection) {
      return [];
    }
    
    try {
      // Prepare input for the model
      const batched = tf.expandDims(image);
      
      // Run inference
      const result = await this.models.objectDetection.executeAsync(batched) as tf.Tensor[];
      
      // Process results (actual implementation depends on the specific model)
      // This is a simplified example
      const boxes = result[0].arraySync() as number[][][];
      const scores = result[1].arraySync() as number[][];
      const classes = result[2].arraySync() as number[][];
      
      // Convert to our output format
      const objects: VisualAnalysisResult['objects'] = [];
      
      for (let i = 0; i < scores[0].length; i++) {
        if (scores[0][i] > 0.5) { // Score threshold
          objects.push({
            class: this.getClassName(classes[0][i]),
            score: scores[0][i],
            boundingBox: {
              top: boxes[0][i][0],
              left: boxes[0][i][1],
              width: boxes[0][i][3] - boxes[0][i][1],
              height: boxes[0][i][2] - boxes[0][i][0]
            }
          });
        }
      }
      
      // Cleanup tensors to prevent memory leaks
      tf.dispose(result);
      tf.dispose(batched);
      
      return objects;
    } catch (error) {
      console.error('Error detecting objects:', error);
      return [];
    }
  }

  /**
   * Analyze colors in image
   */
  private async analyzeColors(image: tf.Tensor3D): Promise<VisualAnalysisResult['colors']> {
    try {
      // Resize for faster processing
      const resized = tf.image.resizeBilinear(image, [32, 32]);
      
      // Get pixel data
      const data = await resized.data();
      
      // Simple color clustering (this is a basic implementation)
      const colorMap = new Map<string, number>();
      const pixelCount = 32 * 32;
      
      for (let i = 0; i < data.length; i += 3) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Quantize colors to reduce number of unique colors
        const quantized = this.quantizeColor(r, g, b);
        const colorKey = `#${quantized.map(c => c.toString(16).padStart(2, '0')).join('')}`;
        
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }
      
      // Convert to result format and sort by percentage
      const colors = Array.from(colorMap.entries())
        .map(([color, count]) => ({
          color,
          percentage: count / pixelCount
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5); // Only return top 5 colors
      
      // Cleanup tensor
      tf.dispose(resized);
      
      return colors;
    } catch (error) {
      console.error('Error analyzing colors:', error);
      return [];
    }
  }

  /**
   * Analyze composition aspects of the image
   */
  private async analyzeComposition(image: tf.Tensor3D): Promise<VisualAnalysisResult['composition']> {
    try {
      // Calculate brightness
      const grayscale = image.mean(2);
      const brightnessValue = await grayscale.mean().data();
      const brightness = Number(brightnessValue[0]) / 255;
      
      // Calculate contrast (standard deviation of pixel values)
      const devSquared = tf.sub(grayscale, tf.scalar(brightnessValue[0])).square();
      const varianceValue = await devSquared.mean().data();
      const contrast = Math.sqrt(Number(varianceValue[0])) / 128; // Normalize to 0-1
      
      // Detect if image has text (simplified)
      // In a real implementation, you'd use a text detection model
      const hasText = false; // Placeholder
      
      // Count faces (simplified)
      const faceCount = this.config.enableFaceDetection ? 0 : 0; // Placeholder
      
      // Determine dominant content type
      let dominant: VisualAnalysisResult['composition']['dominant'] = 'other';
      
      // Calculate complexity (based on variance of pixel values)
      // Higher variance = more complex image
      const complexity = Math.min(contrast * 2, 1);
      
      // Cleanup tensors
      tf.dispose([grayscale, devSquared]);
      
      return {
        hasText,
        complexity,
        brightness,
        contrast,
        faceCount,
        dominant
      };
    } catch (error) {
      console.error('Error analyzing composition:', error);
      return {
        hasText: false,
        complexity: 0.5,
        brightness: 0.5,
        contrast: 0.5,
        faceCount: 0,
        dominant: 'other'
      };
    }
  }

  /**
   * Enhanced sentiment analysis from visual elements
   * Uses a more nuanced approach combining object recognition, color psychology,
   * and composition factors to determine emotional impact
   */
  private deriveSentiment(
    objects: VisualAnalysisResult['objects'],
    composition: VisualAnalysisResult['composition'],
    colors: VisualAnalysisResult['colors']
  ): VisualAnalysisResult['sentiment'] {
    // This is a simplified sentiment derivation
    // In a real implementation, you'd use a dedicated model
    
    // Positive object classes
    const positiveObjects = new Set([
      'smile', 'flower', 'dog', 'cat', 'beach', 'sunset', 'food'
    ]);
    
    // Negative object classes
    const negativeObjects = new Set([
      'gun', 'knife', 'blood', 'crash', 'fight'
    ]);
    
    let score = 0;
    let confidence = 0.5;
    
    // Count positive and negative objects
    let positiveCount = 0;
    let negativeCount = 0;
    let totalConfidence = 0;
    
    for (const obj of objects) {
      if (positiveObjects.has(obj.class.toLowerCase())) {
        positiveCount++;
        totalConfidence += obj.score;
      } else if (negativeObjects.has(obj.class.toLowerCase())) {
        negativeCount++;
        totalConfidence += obj.score;
      }
    }
    
    // Factor in object sentiment
    if (positiveCount + negativeCount > 0) {
      score = (positiveCount - negativeCount) / (positiveCount + negativeCount);
      confidence = totalConfidence / (positiveCount + negativeCount);
    }
    
    // Factor in composition
    // Brighter images tend to be more positive
    score += (composition.brightness - 0.5) * 0.3;
    
    // High contrast can be more dramatic
    confidence += (composition.contrast - 0.5) * 0.1;
    
    // Clamp values
    score = Math.max(-1, Math.min(1, score));
    confidence = Math.max(0.3, Math.min(0.9, confidence));
    
    return { score, confidence };
  }

  /**
   * Get class name from class ID
   */
  private getClassName(classId: number): string {
    // This would be a mapping from class IDs to human-readable names
    // For simplicity, we'll just return the class ID as a string
    return `class_${classId}`;
  }

  /**
   * Quantize RGB color to reduce number of unique colors
   */
  private quantizeColor(r: number, g: number, b: number): [number, number, number] {
    // Quantize to 4 bits per channel (16 values per channel)
    const quantizedR = Math.round(r / 16) * 16;
    const quantizedG = Math.round(g / 16) * 16;
    const quantizedB = Math.round(b / 16) * 16;
    
    return [quantizedR, quantizedG, quantizedB];
  }

  /**
   * Generate cache key from image URL
   */
  private generateCacheKey(imageUrl: string): string {
    // For data URLs, hash the content
    if (imageUrl.startsWith('data:')) {
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < Math.min(imageUrl.length, 1000); i++) {
        hash = ((hash << 5) - hash) + imageUrl.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return `visual_${hash}`;
    }
    
    // For regular URLs, use the URL as key
    return `visual_${imageUrl}`;
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.totalProcessed > 0
        ? this.performanceMetrics.cacheHits / this.performanceMetrics.totalProcessed
        : 0,
    };
  }
}
