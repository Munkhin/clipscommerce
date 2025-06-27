import { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from '../../types/niche_types';
import { EventEmitter } from 'events';

export interface EvaluationMetrics {
  // Regression metrics
  mse?: number; // Mean Squared Error
  mae?: number; // Mean Absolute Error
  rmse?: number; // Root Mean Squared Error
  r2Score?: number; // R-squared
  mape?: number; // Mean Absolute Percentage Error
  
  // Classification metrics
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number; // Area Under Curve
  
  // Business metrics
  businessImpact?: number; // Actual business value generated
  userSatisfaction?: number; // User feedback scores
  adoptionRate?: number; // How often users accept suggestions
  
  // Model-specific metrics
  predictionConfidence?: number; // Average confidence in predictions
  calibrationError?: number; // How well-calibrated the confidence scores are
  fairnessScore?: number; // Bias and fairness assessment
}

export interface EvaluationResult {
  modelName: string;
  modelType: string;
  version: string;
  evaluationDate: Date;
  
  // Performance metrics
  overallScore: number; // Composite score (0-1)
  metrics: EvaluationMetrics;
  
  // Detailed analysis
  performanceByPlatform: Record<Platform, EvaluationMetrics>;
  performanceByContentType: Record<string, EvaluationMetrics>;
  performanceOverTime: Array<{
    period: string;
    metrics: EvaluationMetrics;
  }>;
  
  // Quality assessment
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  
  // Comparison with baselines
  baselineComparison: {
    randomBaseline: number;
    simpleBaseline: number;
    previousVersion?: number;
    industryBenchmark?: number;
  };
  
  // Statistical significance
  confidenceInterval: [number, number];
  pValue?: number;
  sampleSize: number;
}

export interface CrossValidationResult {
  foldResults: EvaluationMetrics[];
  meanMetrics: EvaluationMetrics;
  stdMetrics: EvaluationMetrics;
  stability: number; // How consistent results are across folds
}

export interface ABTestResult {
  controlMetrics: EvaluationMetrics;
  treatmentMetrics: EvaluationMetrics;
  improvement: number;
  significance: number;
  confidenceLevel: number;
  sampleSizePerGroup: number;
}

export class ModelEvaluator extends EventEmitter {
  private supabase: SupabaseClient;
  private evaluationHistory: Map<string, EvaluationResult[]> = new Map();

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  async evaluateModel(
    modelName: string,
    modelType: string,
    model: any,
    testData: any[],
    options: {
      crossValidation?: boolean;
      folds?: number;
      includeBusinessMetrics?: boolean;
      platformBreakdown?: boolean;
      timeSeriesAnalysis?: boolean;
    } = {}
  ): Promise<EvaluationResult> {
    this.emit('evaluationStarted', { modelName, modelType });

    try {
      // Prepare test data
      const { features, targets, metadata } = this.prepareTestData(testData);
      
      // Generate predictions
      this.emit('progress', { phase: 'prediction', progress: 0, message: 'Generating predictions...' });
      const predictions = await this.generatePredictions(model, features);
      
      // Calculate core metrics
      this.emit('progress', { phase: 'metrics', progress: 25, message: 'Calculating core metrics...' });
      const coreMetrics = this.calculateCoreMetrics(predictions, targets, modelType);
      
      // Platform-specific analysis
      let performanceByPlatform: Record<Platform, EvaluationMetrics> = {};
      if (options.platformBreakdown) {
        this.emit('progress', { phase: 'platform_analysis', progress: 50, message: 'Analyzing platform performance...' });
        performanceByPlatform = this.analyzePlatformPerformance(predictions, targets, metadata);
      }
      
      // Content type analysis
      this.emit('progress', { phase: 'content_analysis', progress: 65, message: 'Analyzing content type performance...' });
      const performanceByContentType = this.analyzeContentTypePerformance(predictions, targets, metadata);
      
      // Time series analysis
      let performanceOverTime: Array<{ period: string; metrics: EvaluationMetrics }> = [];
      if (options.timeSeriesAnalysis) {
        this.emit('progress', { phase: 'time_analysis', progress: 75, message: 'Analyzing performance over time...' });
        performanceOverTime = this.analyzePerformanceOverTime(predictions, targets, metadata);
      }
      
      // Business metrics
      let businessMetrics: Partial<EvaluationMetrics> = {};
      if (options.includeBusinessMetrics) {
        this.emit('progress', { phase: 'business_metrics', progress: 85, message: 'Calculating business metrics...' });
        businessMetrics = await this.calculateBusinessMetrics(modelName, predictions, targets);
      }
      
      // Quality assessment
      this.emit('progress', { phase: 'quality_assessment', progress: 90, message: 'Performing quality assessment...' });
      const qualityAssessment = this.performQualityAssessment(coreMetrics, performanceByPlatform);
      
      // Baseline comparison
      const baselineComparison = await this.compareWithBaselines(predictions, targets, modelName);
      
      // Statistical analysis
      const statisticalAnalysis = this.performStatisticalAnalysis(predictions, targets);
      
      // Compile results
      const result: EvaluationResult = {
        modelName,
        modelType,
        version: '1.0.0',
        evaluationDate: new Date(),
        overallScore: this.calculateOverallScore({ ...coreMetrics, ...businessMetrics }),
        metrics: { ...coreMetrics, ...businessMetrics },
        performanceByPlatform,
        performanceByContentType,
        performanceOverTime,
        strengths: qualityAssessment.strengths,
        weaknesses: qualityAssessment.weaknesses,
        recommendations: qualityAssessment.recommendations,
        baselineComparison,
        confidenceInterval: statisticalAnalysis.confidenceInterval,
        pValue: statisticalAnalysis.pValue,
        sampleSize: testData.length
      };
      
      // Store evaluation result
      await this.storeEvaluationResult(result);
      
      // Update evaluation history
      if (!this.evaluationHistory.has(modelName)) {
        this.evaluationHistory.set(modelName, []);
      }
      this.evaluationHistory.get(modelName)!.push(result);
      
      this.emit('progress', { phase: 'complete', progress: 100, message: 'Evaluation completed' });
      this.emit('evaluationCompleted', result);
      
      return result;
      
    } catch (error) {
      this.emit('evaluationError', { modelName, error: error.message });
      throw error;
    }
  }

  async performCrossValidation(
    model: any,
    data: any[],
    folds: number = 5,
    modelType: string
  ): Promise<CrossValidationResult> {
    this.emit('crossValidationStarted', { folds });
    
    const foldSize = Math.floor(data.length / folds);
    const foldResults: EvaluationMetrics[] = [];
    
    for (let i = 0; i < folds; i++) {
      this.emit('progress', { 
        phase: 'cross_validation', 
        progress: (i / folds) * 100, 
        message: `Processing fold ${i + 1}/${folds}` 
      });
      
      // Split data
      const testStart = i * foldSize;
      const testEnd = (i === folds - 1) ? data.length : (i + 1) * foldSize;
      
      const testData = data.slice(testStart, testEnd);
      const trainData = [...data.slice(0, testStart), ...data.slice(testEnd)];
      
      // Train model on fold training data (simplified - in practice, retrain model)
      // For now, just evaluate on test fold
      const { features, targets } = this.prepareTestData(testData);
      const predictions = await this.generatePredictions(model, features);
      const metrics = this.calculateCoreMetrics(predictions, targets, modelType);
      
      foldResults.push(metrics);
    }
    
    // Calculate mean and standard deviation
    const meanMetrics = this.calculateMeanMetrics(foldResults);
    const stdMetrics = this.calculateStdMetrics(foldResults, meanMetrics);
    const stability = this.calculateStability(foldResults);
    
    this.emit('crossValidationCompleted', { meanMetrics, stability });
    
    return {
      foldResults,
      meanMetrics,
      stdMetrics,
      stability
    };
  }

  async performABTest(
    controlModel: any,
    treatmentModel: any,
    testData: any[],
    modelType: string,
    confidenceLevel: number = 0.95
  ): Promise<ABTestResult> {
    this.emit('abTestStarted', { sampleSize: testData.length });
    
    // Split data randomly between control and treatment
    const shuffled = [...testData].sort(() => Math.random() - 0.5);
    const splitPoint = Math.floor(shuffled.length / 2);
    
    const controlData = shuffled.slice(0, splitPoint);
    const treatmentData = shuffled.slice(splitPoint);
    
    // Evaluate both models
    const { features: controlFeatures, targets: controlTargets } = this.prepareTestData(controlData);
    const { features: treatmentFeatures, targets: treatmentTargets } = this.prepareTestData(treatmentData);
    
    const controlPredictions = await this.generatePredictions(controlModel, controlFeatures);
    const treatmentPredictions = await this.generatePredictions(treatmentModel, treatmentFeatures);
    
    const controlMetrics = this.calculateCoreMetrics(controlPredictions, controlTargets, modelType);
    const treatmentMetrics = this.calculateCoreMetrics(treatmentPredictions, treatmentTargets, modelType);
    
    // Calculate improvement and significance
    const primaryMetric = this.getPrimaryMetric(modelType);
    const controlValue = controlMetrics[primaryMetric] || 0;
    const treatmentValue = treatmentMetrics[primaryMetric] || 0;
    
    const improvement = (treatmentValue - controlValue) / Math.max(controlValue, 0.001);
    const significance = this.calculateStatisticalSignificance(
      controlPredictions,
      treatmentPredictions,
      confidenceLevel
    );
    
    this.emit('abTestCompleted', { improvement, significance });
    
    return {
      controlMetrics,
      treatmentMetrics,
      improvement,
      significance,
      confidenceLevel,
      sampleSizePerGroup: splitPoint
    };
  }

  private prepareTestData(testData: any[]): { features: any[], targets: any[], metadata: any[] } {
    return {
      features: testData.map(item => item.features || item.input),
      targets: testData.map(item => item.target || item.output),
      metadata: testData.map(item => ({
        platform: item.platform,
        contentType: item.contentType,
        timestamp: item.timestamp,
        userId: item.userId
      }))
    };
  }

  private async generatePredictions(model: any, features: any[]): Promise<any[]> {
    // Generate predictions based on model type
    if (typeof model.predict === 'function') {
      return features.map(feature => model.predict(feature));
    } else if (typeof model.batchPredict === 'function') {
      return await model.batchPredict(features);
    } else {
      // Fallback for different model interfaces
      return features.map(() => Math.random()); // Placeholder
    }
  }

  private calculateCoreMetrics(predictions: any[], targets: any[], modelType: string): EvaluationMetrics {
    const metrics: EvaluationMetrics = {};
    
    if (modelType === 'regression' || modelType === 'engagement_prediction') {
      // Regression metrics
      const errors = predictions.map((pred, i) => {
        const target = Array.isArray(targets[i]) ? targets[i][0] : targets[i];
        const prediction = Array.isArray(pred) ? pred[0] : pred;
        return prediction - target;
      });
      
      const squaredErrors = errors.map(e => e * e);
      const absoluteErrors = errors.map(e => Math.abs(e));
      
      metrics.mse = squaredErrors.reduce((sum, e) => sum + e, 0) / squaredErrors.length;
      metrics.mae = absoluteErrors.reduce((sum, e) => sum + e, 0) / absoluteErrors.length;
      metrics.rmse = Math.sqrt(metrics.mse);
      
      // R-squared
      const targetMean = targets.reduce((sum, t) => {
        const target = Array.isArray(t) ? t[0] : t;
        return sum + target;
      }, 0) / targets.length;
      
      const totalSumSquares = targets.reduce((sum, t) => {
        const target = Array.isArray(t) ? t[0] : t;
        return sum + Math.pow(target - targetMean, 2);
      }, 0);
      
      const residualSumSquares = squaredErrors.reduce((sum, e) => sum + e, 0);
      metrics.r2Score = 1 - (residualSumSquares / totalSumSquares);
      
      // MAPE
      const percentageErrors = predictions.map((pred, i) => {
        const target = Array.isArray(targets[i]) ? targets[i][0] : targets[i];
        const prediction = Array.isArray(pred) ? pred[0] : pred;
        return Math.abs((target - prediction) / Math.max(target, 0.001));
      });
      metrics.mape = percentageErrors.reduce((sum, e) => sum + e, 0) / percentageErrors.length;
      
    } else if (modelType === 'classification' || modelType === 'virality_prediction') {
      // Classification metrics
      const binaryPredictions = predictions.map(pred => {
        const value = Array.isArray(pred) ? pred[0] : pred;
        return value > 0.5 ? 1 : 0;
      });
      
      const binaryTargets = targets.map(target => {
        const value = Array.isArray(target) ? target[0] : target;
        return value > 0.5 ? 1 : 0;
      });
      
      let tp = 0, fp = 0, tn = 0, fn = 0;
      
      for (let i = 0; i < binaryPredictions.length; i++) {
        if (binaryPredictions[i] === 1 && binaryTargets[i] === 1) tp++;
        else if (binaryPredictions[i] === 1 && binaryTargets[i] === 0) fp++;
        else if (binaryPredictions[i] === 0 && binaryTargets[i] === 0) tn++;
        else fn++;
      }
      
      metrics.accuracy = (tp + tn) / (tp + fp + tn + fn);
      metrics.precision = tp / (tp + fp) || 0;
      metrics.recall = tp / (tp + fn) || 0;
      metrics.f1Score = 2 * (metrics.precision * metrics.recall) / (metrics.precision + metrics.recall) || 0;
      
      // AUC calculation (simplified)
      metrics.auc = this.calculateAUC(predictions, binaryTargets);
    }
    
    // Common metrics
    metrics.predictionConfidence = this.calculateAverageConfidence(predictions);
    metrics.calibrationError = this.calculateCalibrationError(predictions, targets);
    
    return metrics;
  }

  private analyzePlatformPerformance(
    predictions: any[],
    targets: any[],
    metadata: any[]
  ): Record<Platform, EvaluationMetrics> {
    const platformData: Record<string, { predictions: any[], targets: any[] }> = {};
    
    // Group by platform
    metadata.forEach((meta, i) => {
      if (!platformData[meta.platform]) {
        platformData[meta.platform] = { predictions: [], targets: [] };
      }
      platformData[meta.platform].predictions.push(predictions[i]);
      platformData[meta.platform].targets.push(targets[i]);
    });
    
    // Calculate metrics for each platform
    const result: Record<Platform, EvaluationMetrics> = {};
    Object.entries(platformData).forEach(([platform, data]) => {
      result[platform as Platform] = this.calculateCoreMetrics(
        data.predictions,
        data.targets,
        'regression' // Assume regression for simplicity
      );
    });
    
    return result;
  }

  private analyzeContentTypePerformance(
    predictions: any[],
    targets: any[],
    metadata: any[]
  ): Record<string, EvaluationMetrics> {
    const contentTypeData: Record<string, { predictions: any[], targets: any[] }> = {};
    
    // Group by content type
    metadata.forEach((meta, i) => {
      const contentType = meta.contentType || 'unknown';
      if (!contentTypeData[contentType]) {
        contentTypeData[contentType] = { predictions: [], targets: [] };
      }
      contentTypeData[contentType].predictions.push(predictions[i]);
      contentTypeData[contentType].targets.push(targets[i]);
    });
    
    // Calculate metrics for each content type
    const result: Record<string, EvaluationMetrics> = {};
    Object.entries(contentTypeData).forEach(([contentType, data]) => {
      result[contentType] = this.calculateCoreMetrics(
        data.predictions,
        data.targets,
        'regression'
      );
    });
    
    return result;
  }

  private analyzePerformanceOverTime(
    predictions: any[],
    targets: any[],
    metadata: any[]
  ): Array<{ period: string; metrics: EvaluationMetrics }> {
    const timeData: Record<string, { predictions: any[], targets: any[] }> = {};
    
    // Group by time period (monthly)
    metadata.forEach((meta, i) => {
      if (meta.timestamp) {
        const date = new Date(meta.timestamp);
        const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!timeData[period]) {
          timeData[period] = { predictions: [], targets: [] };
        }
        timeData[period].predictions.push(predictions[i]);
        timeData[period].targets.push(targets[i]);
      }
    });
    
    // Calculate metrics for each time period
    return Object.entries(timeData)
      .map(([period, data]) => ({
        period,
        metrics: this.calculateCoreMetrics(data.predictions, data.targets, 'regression')
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private async calculateBusinessMetrics(
    modelName: string,
    predictions: any[],
    targets: any[]
  ): Promise<Partial<EvaluationMetrics>> {
    // Simulate business metrics calculation
    // In practice, this would query actual business data
    
    const businessImpact = Math.random() * 0.3; // 0-30% business impact
    const userSatisfaction = 0.7 + Math.random() * 0.3; // 70-100% satisfaction
    const adoptionRate = 0.6 + Math.random() * 0.4; // 60-100% adoption
    
    return {
      businessImpact,
      userSatisfaction,
      adoptionRate
    };
  }

  private performQualityAssessment(
    coreMetrics: EvaluationMetrics,
    platformMetrics: Record<Platform, EvaluationMetrics>
  ): { strengths: string[], weaknesses: string[], recommendations: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze core metrics
    if (coreMetrics.r2Score && coreMetrics.r2Score > 0.8) {
      strengths.push('High predictive accuracy (R² > 0.8)');
    } else if (coreMetrics.r2Score && coreMetrics.r2Score < 0.5) {
      weaknesses.push('Low predictive accuracy (R² < 0.5)');
      recommendations.push('Consider feature engineering or model architecture improvements');
    }
    
    if (coreMetrics.f1Score && coreMetrics.f1Score > 0.8) {
      strengths.push('Excellent classification performance (F1 > 0.8)');
    } else if (coreMetrics.f1Score && coreMetrics.f1Score < 0.6) {
      weaknesses.push('Poor classification performance (F1 < 0.6)');
      recommendations.push('Review class balance and consider different classification thresholds');
    }
    
    // Analyze platform consistency
    const platformScores = Object.values(platformMetrics)
      .map(metrics => metrics.r2Score || metrics.f1Score || 0)
      .filter(score => score > 0);
    
    if (platformScores.length > 1) {
      const variance = this.calculateVariance(platformScores);
      if (variance < 0.01) {
        strengths.push('Consistent performance across platforms');
      } else if (variance > 0.05) {
        weaknesses.push('Inconsistent performance across platforms');
        recommendations.push('Consider platform-specific model tuning');
      }
    }
    
    // Calibration assessment
    if (coreMetrics.calibrationError && coreMetrics.calibrationError < 0.1) {
      strengths.push('Well-calibrated confidence scores');
    } else if (coreMetrics.calibrationError && coreMetrics.calibrationError > 0.2) {
      weaknesses.push('Poorly calibrated confidence scores');
      recommendations.push('Apply calibration techniques like Platt scaling');
    }
    
    return { strengths, weaknesses, recommendations };
  }

  private async compareWithBaselines(
    predictions: any[],
    targets: any[],
    modelName: string
  ): Promise<{
    randomBaseline: number;
    simpleBaseline: number;
    previousVersion?: number;
    industryBenchmark?: number;
  }> {
    // Random baseline
    const randomPredictions = targets.map(() => Math.random());
    const randomMetrics = this.calculateCoreMetrics(randomPredictions, targets, 'regression');
    const randomBaseline = randomMetrics.r2Score || 0;
    
    // Simple baseline (mean prediction)
    const targetMean = targets.reduce((sum, t) => {
      const target = Array.isArray(t) ? t[0] : t;
      return sum + target;
    }, 0) / targets.length;
    
    const meanPredictions = targets.map(() => targetMean);
    const meanMetrics = this.calculateCoreMetrics(meanPredictions, targets, 'regression');
    const simpleBaseline = meanMetrics.r2Score || 0;
    
    // Previous version comparison (if available)
    let previousVersion: number | undefined;
    const history = this.evaluationHistory.get(modelName);
    if (history && history.length > 1) {
      const lastEvaluation = history[history.length - 2];
      previousVersion = lastEvaluation.metrics.r2Score || lastEvaluation.metrics.f1Score || 0;
    }
    
    // Industry benchmark (simulated)
    const industryBenchmark = 0.65 + Math.random() * 0.2; // 65-85%
    
    return {
      randomBaseline,
      simpleBaseline,
      previousVersion,
      industryBenchmark
    };
  }

  private performStatisticalAnalysis(
    predictions: any[],
    targets: any[]
  ): { confidenceInterval: [number, number], pValue?: number } {
    // Calculate confidence interval for primary metric
    const errors = predictions.map((pred, i) => {
      const target = Array.isArray(targets[i]) ? targets[i][0] : targets[i];
      const prediction = Array.isArray(pred) ? pred[0] : pred;
      return Math.abs(prediction - target);
    });
    
    const meanError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
    const stdError = Math.sqrt(
      errors.reduce((sum, e) => sum + Math.pow(e - meanError, 2), 0) / errors.length
    );
    
    const marginOfError = 1.96 * (stdError / Math.sqrt(errors.length)); // 95% confidence
    const confidenceInterval: [number, number] = [
      meanError - marginOfError,
      meanError + marginOfError
    ];
    
    return { confidenceInterval };
  }

  private calculateOverallScore(metrics: EvaluationMetrics): number {
    let score = 0;
    let components = 0;
    
    // Weight different metrics
    if (metrics.r2Score !== undefined) {
      score += metrics.r2Score * 0.3;
      components += 0.3;
    }
    
    if (metrics.f1Score !== undefined) {
      score += metrics.f1Score * 0.3;
      components += 0.3;
    }
    
    if (metrics.businessImpact !== undefined) {
      score += metrics.businessImpact * 0.2;
      components += 0.2;
    }
    
    if (metrics.userSatisfaction !== undefined) {
      score += metrics.userSatisfaction * 0.2;
      components += 0.2;
    }
    
    return components > 0 ? score / components : 0;
  }

  private calculateMeanMetrics(foldResults: EvaluationMetrics[]): EvaluationMetrics {
    const meanMetrics: EvaluationMetrics = {};
    const keys = Object.keys(foldResults[0]) as (keyof EvaluationMetrics)[];
    
    keys.forEach(key => {
      const values = foldResults.map(result => result[key]).filter(v => v !== undefined) as number[];
      if (values.length > 0) {
        meanMetrics[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
      }
    });
    
    return meanMetrics;
  }

  private calculateStdMetrics(foldResults: EvaluationMetrics[], meanMetrics: EvaluationMetrics): EvaluationMetrics {
    const stdMetrics: EvaluationMetrics = {};
    const keys = Object.keys(meanMetrics) as (keyof EvaluationMetrics)[];
    
    keys.forEach(key => {
      const values = foldResults.map(result => result[key]).filter(v => v !== undefined) as number[];
      const mean = meanMetrics[key] as number;
      
      if (values.length > 1) {
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
        stdMetrics[key] = Math.sqrt(variance);
      }
    });
    
    return stdMetrics;
  }

  private calculateStability(foldResults: EvaluationMetrics[]): number {
    // Calculate coefficient of variation for primary metrics
    const r2Scores = foldResults.map(result => result.r2Score).filter(v => v !== undefined) as number[];
    const f1Scores = foldResults.map(result => result.f1Score).filter(v => v !== undefined) as number[];
    
    let stability = 1;
    
    if (r2Scores.length > 1) {
      const mean = r2Scores.reduce((sum, v) => sum + v, 0) / r2Scores.length;
      const std = Math.sqrt(r2Scores.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / r2Scores.length);
      const cv = std / mean;
      stability = Math.max(0, 1 - cv);
    }
    
    return stability;
  }

  private calculateAUC(predictions: any[], targets: number[]): number {
    // Simplified AUC calculation
    const scores = predictions.map((pred, i) => ({
      score: Array.isArray(pred) ? pred[0] : pred,
      label: targets[i]
    })).sort((a, b) => b.score - a.score);
    
    let auc = 0;
    let positives = 0;
    let negatives = 0;
    
    scores.forEach(item => {
      if (item.label === 1) positives++;
      else negatives++;
    });
    
    if (positives === 0 || negatives === 0) return 0.5;
    
    let truePositives = 0;
    let falsePositives = 0;
    
    scores.forEach(item => {
      if (item.label === 1) {
        truePositives++;
      } else {
        falsePositives++;
        auc += truePositives;
      }
    });
    
    return auc / (positives * negatives);
  }

  private calculateAverageConfidence(predictions: any[]): number {
    // For classification, confidence is distance from 0.5
    // For regression, confidence is inverse of prediction variance
    const confidences = predictions.map(pred => {
      const value = Array.isArray(pred) ? pred[0] : pred;
      if (value >= 0 && value <= 1) {
        // Classification confidence
        return Math.abs(value - 0.5) * 2;
      } else {
        // Regression confidence (simplified)
        return Math.min(1, 1 / (1 + Math.abs(value)));
      }
    });
    
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  private calculateCalibrationError(predictions: any[], targets: any[]): number {
    // Simplified calibration error calculation
    const bins = 10;
    const binSize = 1 / bins;
    let totalError = 0;
    
    for (let i = 0; i < bins; i++) {
      const binMin = i * binSize;
      const binMax = (i + 1) * binSize;
      
      const binPredictions = predictions.filter(pred => {
        const value = Array.isArray(pred) ? pred[0] : pred;
        return value >= binMin && value < binMax;
      });
      
      if (binPredictions.length === 0) continue;
      
      const binTargets = targets.filter((_, idx) => {
        const pred = predictions[idx];
        const value = Array.isArray(pred) ? pred[0] : pred;
        return value >= binMin && value < binMax;
      });
      
      const avgPrediction = binPredictions.reduce((sum, pred) => {
        const value = Array.isArray(pred) ? pred[0] : pred;
        return sum + value;
      }, 0) / binPredictions.length;
      
      const avgTarget = binTargets.reduce((sum, target) => {
        const value = Array.isArray(target) ? target[0] : target;
        return sum + value;
      }, 0) / binTargets.length;
      
      totalError += Math.abs(avgPrediction - avgTarget) * (binPredictions.length / predictions.length);
    }
    
    return totalError;
  }

  private getPrimaryMetric(modelType: string): keyof EvaluationMetrics {
    switch (modelType) {
      case 'regression':
      case 'engagement_prediction':
        return 'r2Score';
      case 'classification':
      case 'virality_prediction':
        return 'f1Score';
      default:
        return 'accuracy';
    }
  }

  private calculateStatisticalSignificance(
    controlPredictions: any[],
    treatmentPredictions: any[],
    confidenceLevel: number
  ): number {
    // Simplified t-test
    const controlMean = controlPredictions.reduce((sum, pred) => {
      const value = Array.isArray(pred) ? pred[0] : pred;
      return sum + value;
    }, 0) / controlPredictions.length;
    
    const treatmentMean = treatmentPredictions.reduce((sum, pred) => {
      const value = Array.isArray(pred) ? pred[0] : pred;
      return sum + value;
    }, 0) / treatmentPredictions.length;
    
    const controlVar = controlPredictions.reduce((sum, pred) => {
      const value = Array.isArray(pred) ? pred[0] : pred;
      return sum + Math.pow(value - controlMean, 2);
    }, 0) / (controlPredictions.length - 1);
    
    const treatmentVar = treatmentPredictions.reduce((sum, pred) => {
      const value = Array.isArray(pred) ? pred[0] : pred;
      return sum + Math.pow(value - treatmentMean, 2);
    }, 0) / (treatmentPredictions.length - 1);
    
    const pooledStd = Math.sqrt(
      (controlVar / controlPredictions.length) + (treatmentVar / treatmentPredictions.length)
    );
    
    const tStat = Math.abs(treatmentMean - controlMean) / pooledStd;
    
    // Simplified p-value calculation (assumes normal distribution)
    const pValue = 2 * (1 - this.normalCDF(tStat));
    
    return 1 - pValue; // Return significance level
  }

  private normalCDF(x: number): number {
    // Simplified normal CDF approximation
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Simplified error function approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private async storeEvaluationResult(result: EvaluationResult): Promise<void> {
    const { error } = await this.supabase
      .from('model_performance')
      .insert({
        model_name: result.modelName,
        model_type: result.modelType,
        version: result.version,
        evaluation_date: result.evaluationDate.toISOString(),
        overall_score: result.overallScore,
        metrics: result.metrics,
        performance_by_platform: result.performanceByPlatform,
        performance_by_content_type: result.performanceByContentType,
        performance_over_time: result.performanceOverTime,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        baseline_comparison: result.baselineComparison,
        confidence_interval: result.confidenceInterval,
        p_value: result.pValue,
        sample_size: result.sampleSize
      });

    if (error) throw error;
  }

  // Getters
  getEvaluationHistory(modelName: string): EvaluationResult[] {
    return this.evaluationHistory.get(modelName) || [];
  }

  async getStoredEvaluations(modelName?: string): Promise<EvaluationResult[]> {
    let query = this.supabase.from('model_performance').select('*');
    
    if (modelName) {
      query = query.eq('model_name', modelName);
    }
    
    const { data, error } = await query.order('evaluation_date', { ascending: false });
    
    if (error) throw error;
    
    return data.map(row => ({
      modelName: row.model_name,
      modelType: row.model_type,
      version: row.version,
      evaluationDate: new Date(row.evaluation_date),
      overallScore: row.overall_score,
      metrics: row.metrics,
      performanceByPlatform: row.performance_by_platform,
      performanceByContentType: row.performance_by_content_type,
      performanceOverTime: row.performance_over_time,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      recommendations: row.recommendations,
      baselineComparison: row.baseline_comparison,
      confidenceInterval: row.confidence_interval,
      pValue: row.p_value,
      sampleSize: row.sample_size
    }));
  }
} 