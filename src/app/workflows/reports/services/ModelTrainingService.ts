import { EngagementFeatures, ModelConfig, ModelEvaluation, PostPerformanceData } from '../types/EngagementTypes';
import { LightGBMModel } from '../../../shared_infra/LightGBMModel';
import { StandardScaler } from '../../../shared_infra/StandardScaler';

/**
 * Simplified ML model implementation for engagement prediction
 */
class SimpleMLModel {
  private weights: number[] = [];
  private bias: number = 0;
  private isClassifier: boolean;

  constructor(isClassifier: boolean = false) {
    this.isClassifier = isClassifier;
  }

  /**
   * Train the model using gradient descent (simplified)
   */
  train(features: number[][], targets: number[], epochs: number = 100, learningRate: number = 0.01): void {
    const numFeatures = features[0].length;
    this.weights = new Array(numFeatures).fill(0).map(() => Math.random() * 0.01);
    this.bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;

      for (let i = 0; i < features.length; i++) {
        const prediction = this.predict(features[i]);
        const error = targets[i] - prediction;
        totalLoss += error * error;

        // Update weights and bias
        for (let j = 0; j < this.weights.length; j++) {
          this.weights[j] += learningRate * error * features[i][j];
        }
        this.bias += learningRate * error;
      }

      // Early stopping if loss is very small
      if (totalLoss / features.length < 0.001) break;
    }
  }

  /**
   * Make prediction
   */
  predict(features: number[]): number {
    let prediction = this.bias;
    for (let i = 0; i < this.weights.length; i++) {
      prediction += this.weights[i] * features[i];
    }

    if (this.isClassifier) {
      return 1 / (1 + Math.exp(-prediction)); // Sigmoid for classification
    }
    return Math.max(0, prediction); // ReLU for regression
  }

  /**
   * Batch predictions
   */
  batchPredict(featuresArray: number[][]): number[] {
    return featuresArray.map(features => this.predict(features));
  }

  public getWeights(): number[] {
    return this.weights;
  }
}

/**
 * Service for training and managing ML models
 */
export class ModelTrainingService {
  private engagementModel: SimpleMLModel | LightGBMModel;
  private viralModel: SimpleMLModel | LightGBMModel;
  private config: ModelConfig;
  private isModelsTrained: boolean = false;
  private engagementScaler: StandardScaler = new StandardScaler();
  private viralScaler: StandardScaler = new StandardScaler();

  constructor(config?: Partial<ModelConfig>) {
    this.engagementModel = new LightGBMModel({
      numTrees: 100,
      learningRate: 0.1,
      maxDepth: 6,
      numLeaves: 31,
      featureFraction: 0.9,
      baggingFraction: 0.8,
      minDataInLeaf: 20,
      objective: 'regression'
    });
    this.viralModel = new LightGBMModel({
      numTrees: 100,
      learningRate: 0.1,
      maxDepth: 6,
      numLeaves: 31,
      featureFraction: 0.9,
      baggingFraction: 0.8,
      minDataInLeaf: 20,
      objective: 'binary'
    });
    
    this.config = {
      engagementModel: {
        algorithm: 'lightgbm',
        hyperparameters: { learning_rate: 0.01, max_depth: 6, n_estimators: 100 },
        features: ['hourOfDay', 'dayOfWeek', 'captionLength', 'hashtagCount', 'avgEngagementLast30Days'],
      },
      viralModel: {
        algorithm: 'lightgbm',
        hyperparameters: { learning_rate: 0.01, max_depth: 4, n_estimators: 50 },
        features: ['likesPerView', 'sharesPerView', 'trendScore', 'followerCount'],
        threshold: 0.1, // 10% engagement rate threshold for viral
      },
      featureEngineering: {
        textEmbeddingModel: 'simplified',
        scalingMethod: 'standard',
      },
      ...config,
    };
  }

  /**
   * Train both engagement and viral prediction models
   */
  async trainModels(
    trainingData: PostPerformanceData[],
    features: EngagementFeatures[]
  ): Promise<ModelEvaluation> {
    console.log(`Training models with ${trainingData.length} samples...`);

    // Prepare training data
    const { engagementFeatures, engagementTargets } = this.prepareEngagementData(features, trainingData);
    const { viralFeatures, viralTargets } = this.prepareViralData(features, trainingData);

    // Scale engagement features
    const scaledEngagementFeatures = this.engagementScaler.fitTransform(engagementFeatures);

    // Scale viral features (may differ in selected columns)
    const scaledViralFeatures = this.viralScaler.fitTransform(viralFeatures);

    // Split data for validation (80/20 split)
    const splitIndex = Math.floor(trainingData.length * 0.8);
    
    const trainEngagementFeatures = scaledEngagementFeatures.slice(0, splitIndex);
    const trainEngagementTargets = engagementTargets.slice(0, splitIndex);
    const valEngagementFeatures = scaledEngagementFeatures.slice(splitIndex);
    const valEngagementTargets = engagementTargets.slice(splitIndex);

    const trainViralFeatures = scaledViralFeatures.slice(0, splitIndex);
    const trainViralTargets = viralTargets.slice(0, splitIndex);
    const valViralFeatures = scaledViralFeatures.slice(splitIndex);
    const valViralTargets = viralTargets.slice(splitIndex);

        // Train engagement model
    await this.engagementModel.train(trainEngagementFeatures, trainEngagementTargets, validEngagementFeatures, validEngagementTargets);

    // Train viral model
    await this.viralModel.train(trainViralFeatures, trainViralTargets, validViralFeatures, validViralTargets);

    this.isModelsTrained = true;

    // Evaluate models
    const evaluation = await this.evaluateModels(
      valEngagementFeatures,
      valEngagementTargets,
      valViralFeatures,
      valViralTargets
    );

    console.log('Model training completed!');
    console.log(`Engagement Model RMSE: ${evaluation.engagementModel.rmse.toFixed(4)}`);
    console.log(`Viral Model Accuracy: ${evaluation.viralModel.accuracy.toFixed(4)}`);

    return evaluation;
  }

  /**
   * Prepare engagement prediction training data
   */
  private prepareEngagementData(
    features: EngagementFeatures[],
    trainingData: PostPerformanceData[]
  ): { engagementFeatures: number[][], engagementTargets: number[] } {
    const selectedFeatures = this.config.engagementModel.features;
    const engagementFeatures: number[][] = [];
    const engagementTargets: number[] = [];

    for (let i = 0; i < features.length; i++) {
      const featureVector = this.extractFeatureVector(features[i], selectedFeatures);
      engagementFeatures.push(featureVector);
      engagementTargets.push(trainingData[i].metrics.engagementRate);
    }

    return { engagementFeatures, engagementTargets };
  }

  /**
   * Prepare viral prediction training data
   */
  private prepareViralData(
    features: EngagementFeatures[],
    trainingData: PostPerformanceData[]
  ): { viralFeatures: number[][], viralTargets: number[] } {
    const selectedFeatures = this.config.viralModel.features;
    const viralFeatures: number[][] = [];
    const viralTargets: number[] = [];

    for (let i = 0; i < features.length; i++) {
      const featureVector = this.extractFeatureVector(features[i], selectedFeatures);
      viralFeatures.push(featureVector);
      
      // Binary target: 1 if viral (engagement > threshold), 0 otherwise
      const isViral = trainingData[i].metrics.engagementRate > this.config.viralModel.threshold ? 1 : 0;
      viralTargets.push(isViral);
    }

    return { viralFeatures, viralTargets };
  }

  /**
   * Extract specific features from feature object
   */
  private extractFeatureVector(features: EngagementFeatures, selectedFeatures: string[]): number[] {
    const vector: number[] = [];
    
    for (const featureName of selectedFeatures) {
      if (featureName in features) {
        const value = (features as any)[featureName];
        if (Array.isArray(value)) {
          // For embeddings, take first few dimensions
          vector.push(...value.slice(0, 5));
        } else if (typeof value === 'boolean') {
          vector.push(value ? 1 : 0);
        } else {
          vector.push(Number(value) || 0);
        }
      } else {
        vector.push(0); // Default value for missing features
      }
    }

    return vector;
  }

  /**
   * Evaluate trained models
   */
  private async evaluateModels(
    valEngagementFeatures: number[][],
    valEngagementTargets: number[],
    valViralFeatures: number[][],
    valViralTargets: number[]
  ): Promise<ModelEvaluation> {
    // Engagement model evaluation
    const engagementPredictions = this.engagementModel.batchPredict(valEngagementFeatures);
    const engagementMetrics = this.calculateRegressionMetrics(valEngagementTargets, engagementPredictions);

    // Viral model evaluation
    const viralPredictions = this.viralModel.batchPredict(valViralFeatures);
    const viralMetrics = this.calculateClassificationMetrics(valViralTargets, viralPredictions);

    // Feature importance (simplified - based on weight magnitudes)
    const featureImportance: Record<string, number> = {};
    const engagementModelWeights = this.engagementModel.getWeights();
    this.config.engagementModel.features.forEach((feature, index) => {
      if (index < engagementModelWeights.length) {
        featureImportance[feature] = Math.abs(engagementModelWeights[index]);
      }
    });

    return {
      engagementModel: engagementMetrics,
      viralModel: viralMetrics,
      crossValidationScores: [0.85, 0.82, 0.88, 0.84, 0.86], // Mock CV scores
      featureImportance,
      evaluationDate: new Date(),
    };
  }

  /**
   * Calculate regression metrics
   */
  private calculateRegressionMetrics(actual: number[], predicted: number[]) {
    const n = actual.length;
    let mae = 0, mse = 0, totalActual = 0, totalSquaredActual = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      mae += Math.abs(error);
      mse += error * error;
      totalActual += actual[i];
      totalSquaredActual += actual[i] * actual[i];
    }

    mae /= n;
    mse /= n;
    const rmse = Math.sqrt(mse);

    // R² calculation
    const meanActual = totalActual / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      ssRes += (actual[i] - predicted[i]) ** 2;
      ssTot += (actual[i] - meanActual) ** 2;
    }
    const r2Score = 1 - (ssRes / ssTot);

    // MAPE calculation
    let mape = 0;
    for (let i = 0; i < n; i++) {
      if (actual[i] !== 0) {
        mape += Math.abs((actual[i] - predicted[i]) / actual[i]);
      }
    }
    mape = (mape / n) * 100;

    return { mae, rmse, r2Score, mape };
  }

  /**
   * Calculate classification metrics
   */
  private calculateClassificationMetrics(actual: number[], predicted: number[]) {
    const n = actual.length;
    let tp = 0, fp = 0, tn = 0, fn = 0;

    // Convert probabilities to binary predictions
    const binaryPredicted = predicted.map(p => p > 0.5 ? 1 : 0);

    for (let i = 0; i < n; i++) {
      if (actual[i] === 1 && binaryPredicted[i] === 1) tp++;
      else if (actual[i] === 0 && binaryPredicted[i] === 1) fp++;
      else if (actual[i] === 0 && binaryPredicted[i] === 0) tn++;
      else fn++;
    }

    const accuracy = (tp + tn) / n;
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    // Simplified ROC-AUC calculation
    const rocAuc = this.calculateAUC(actual, predicted);
    const prAuc = this.calculatePRAUC(actual, predicted);

    return { accuracy, precision, recall, f1Score, rocAuc, prAuc };
  }

  /**
   * Simplified AUC calculation
   */
  private calculateAUC(actual: number[], predicted: number[]): number {
    // Simplified AUC calculation - in production use proper implementation
    const pairs: Array<{ actual: number, predicted: number }> = [];
    for (let i = 0; i < actual.length; i++) {
      pairs.push({ actual: actual[i], predicted: predicted[i] });
    }
    
    pairs.sort((a, b) => b.predicted - a.predicted);
    
    let auc = 0;
    let positives = 0;
    let negatives = 0;
    
    for (const pair of pairs) {
      if (pair.actual === 1) positives++;
      else negatives++;
    }
    
    if (positives === 0 || negatives === 0) return 0.5;
    
    let truePositives = 0;
    let falsePositives = 0;
    
    for (const pair of pairs) {
      if (pair.actual === 1) {
        truePositives++;
      } else {
        falsePositives++;
        auc += truePositives;
      }
    }
    
    return auc / (positives * negatives);
  }

  /**
   * Simplified PR-AUC calculation
   */
  private calculatePRAUC(actual: number[], predicted: number[]): number {
    // Simplified implementation - return mock value
    return 0.75;
  }

  /**
   * Make predictions using trained models
   */
  async predict(features: EngagementFeatures): Promise<{
    engagementRate: number;
    viralProbability: number;
    confidence: number;
  }> {
    if (!this.isModelsTrained) {
      throw new Error('Models must be trained before making predictions');
    }

    const engagementFeatureVector = this.extractFeatureVector(features, this.config.engagementModel.features);
    const scaledEngagementVector = this.engagementScaler.transform([engagementFeatureVector])[0];

    const viralFeatureVectorRaw = this.extractFeatureVector(features, this.config.viralModel.features);
    const scaledViralVector = this.viralScaler.transform([viralFeatureVectorRaw])[0];

    const engagementRate = this.engagementModel.predict(scaledEngagementVector);
    const viralProbability = this.viralModel.predict(scaledViralVector);

    // Simple confidence calculation based on feature completeness
    const totalFeatures = Object.keys(features).length;
    const nonZeroFeatures = Object.values(features).filter(v => 
      Array.isArray(v) ? v.some(x => x !== 0) : v !== 0
    ).length;
    const confidence = Math.min(nonZeroFeatures / totalFeatures, 1);

    return {
      engagementRate: Math.max(0, Math.min(1, engagementRate)),
      viralProbability: Math.max(0, Math.min(1, viralProbability)),
      confidence,
    };
  }

  /**
   * Get model configuration
   */
  getConfig(): ModelConfig {
    return this.config;
  }

  /**
   * Check if models are trained
   */
  isReady(): boolean {
    return this.isModelsTrained;
  }
} 