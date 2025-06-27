export interface LightGBMConfig {
  objective?: 'binary' | 'regression' | 'multiclass';
  numTrees?: number;
  learningRate?: number;
  maxDepth?: number;
  numLeaves?: number;
  featureFraction?: number;
  baggingFraction?: number;
  baggingFreq?: number;
  lambdaL1?: number;
  lambdaL2?: number;
  minDataInLeaf?: number;
  metric?: string[];
  earlyStoppingRounds?: number;
  verbosity?: number;
}

export interface LightGBMHyperparams {
  numTrees: [number, number];
  learningRate: [number, number];
  maxDepth: [number, number];
  numLeaves: [number, number];
  featureFraction: [number, number];
  lambdaL1: [number, number];
  lambdaL2: [number, number];
}

export interface ModelMetrics {
  trainLoss: number[];
  validLoss: number[];
  featureImportances: Record<string, number>;
  bestIteration: number;
  convergenceHistory: {
    iteration: number;
    trainLoss: number;
    validLoss?: number;
    learningRate: number;
  }[];
}

export interface LightGBMSaveData {
  config: LightGBMConfig;
  trees: DecisionTree[];
  featureNames: string[];
  numClasses?: number;
  metrics: ModelMetrics;
  modelVersion: string;
  trainedAt: string;
}

interface DecisionTree {
  rootNode: TreeNode;
  learningRate: number;
  weight: number;
}

interface TreeNode {
  isLeaf: boolean;
  value?: number;
  splitFeature?: number;
  splitValue?: number;
  splitGain?: number;
  leftChild?: TreeNode;
  rightChild?: TreeNode;
  numSamples?: number;
}

export class LightGBMModel {
  private config: Required<LightGBMConfig>;
  private trees: DecisionTree[] = [];
  private featureNames: string[] = [];
  private numClasses: number = 1;
  private metrics: ModelMetrics = {
    trainLoss: [],
    validLoss: [],
    featureImportances: {},
    bestIteration: 0,
    convergenceHistory: []
  };
  private bestIteration: number = 0;

  constructor(config: LightGBMConfig = {}) {
    this.config = {
      objective: config.objective || 'regression',
      numTrees: config.numTrees || 100,
      learningRate: config.learningRate || 0.1,
      maxDepth: config.maxDepth || 6,
      numLeaves: config.numLeaves || 31,
      featureFraction: config.featureFraction || 1.0,
      baggingFraction: config.baggingFraction || 1.0,
      baggingFreq: config.baggingFreq || 0,
      lambdaL1: config.lambdaL1 || 0.0,
      lambdaL2: config.lambdaL2 || 0.0,
      minDataInLeaf: config.minDataInLeaf || 20,
      metric: config.metric || ['rmse'],
      earlyStoppingRounds: config.earlyStoppingRounds || 10,
      verbosity: config.verbosity || -1
    };
  }

  async train(
    trainFeatures: number[][],
    trainTargets: number[],
    validFeatures?: number[][],
    validTargets?: number[],
    featureNames?: string[]
  ): Promise<void> {
    if (trainFeatures.length === 0 || trainTargets.length === 0) {
      throw new Error('Training data cannot be empty');
    }

    if (trainFeatures.length !== trainTargets.length) {
      throw new Error('Features and targets must have the same length');
    }

    this.featureNames = featureNames || trainFeatures[0].map((_, i) => `feature_${i}`);
    
    // Initialize for multiclass
    if (this.config.objective === 'multiclass') {
      this.numClasses = Math.max(...trainTargets) + 1;
    }

    // Initialize predictions
    let trainPredictions = this.initializePredictions(trainTargets);
    let validPredictions = validFeatures && validTargets ? 
      this.initializePredictions(validTargets) : undefined;

    let noImprovementCount = 0;
    let bestValidLoss = Infinity;

    for (let iteration = 0; iteration < this.config.numTrees; iteration++) {
      const currentLR = this.adaptiveLearningRate(iteration);
      
      // Train tree for current iteration
      const tree = this.trainTree(
        trainFeatures,
        trainTargets,
        trainPredictions,
        currentLR,
        iteration
      );
      
      this.trees.push(tree);

      // Update predictions
      trainPredictions = this.updatePredictions(trainFeatures, trainPredictions, tree);
      if (validFeatures && validTargets && validPredictions) {
        validPredictions = this.updatePredictions(validFeatures, validPredictions, tree);
      }

      // Calculate losses
      const trainLoss = this.calculateLoss(trainTargets, trainPredictions);
      const validLoss = validTargets && validPredictions ? 
        this.calculateLoss(validTargets, validPredictions) : undefined;

      this.metrics.trainLoss.push(trainLoss);
      if (validLoss !== undefined) {
        this.metrics.validLoss.push(validLoss);
      }

      // Update convergence history
      this.metrics.convergenceHistory.push({
        iteration,
        trainLoss,
        validLoss,
        learningRate: currentLR
      });

      // Early stopping check
      if (validLoss !== undefined) {
        if (validLoss < bestValidLoss) {
          bestValidLoss = validLoss;
          this.bestIteration = iteration;
          noImprovementCount = 0;
        } else {
          noImprovementCount++;
        }

        if (noImprovementCount >= this.config.earlyStoppingRounds) {
          if (this.config.verbosity >= 0) {
            console.log(`Early stopping at iteration ${iteration}`);
          }
          break;
        }
      }

      // Verbose logging
      if (this.config.verbosity >= 0 && iteration % 10 === 0) {
        const validMsg = validLoss !== undefined ? `, valid: ${validLoss.toFixed(6)}` : '';
        console.log(`Iteration ${iteration}: train: ${trainLoss.toFixed(6)}${validMsg}`);
      }
    }

    // Calculate feature importances
    this.calculateFeatureImportances();
    this.metrics.bestIteration = this.bestIteration;
  }

  private trainTree(
    features: number[][],
    targets: number[],
    predictions: number[],
    learningRate: number,
    iteration: number
  ): DecisionTree {
    // Calculate gradients and hessians
    const { gradients, hessians } = this.calculateGradientsHessians(targets, predictions);
    
    // Sample features and data
    const { sampledFeatures, sampledIndices } = this.sampleFeaturesAndData(features, iteration);
    
    // Build tree
    const rootNode = this.buildTree(
      sampledFeatures,
      gradients.filter((_, i) => sampledIndices.includes(i)),
      hessians.filter((_, i) => sampledIndices.includes(i)),
      sampledIndices,
      0
    );

    return {
      rootNode,
      learningRate,
      weight: 1.0
    };
  }

  private buildTree(
    features: number[][],
    gradients: number[],
    hessians: number[],
    indices: number[],
    depth: number
  ): TreeNode {
    // Check stopping conditions
    if (depth >= this.config.maxDepth || 
        features.length < this.config.minDataInLeaf ||
        this.shouldStopSplitting(gradients, hessians)) {
      return {
        isLeaf: true,
        value: this.calculateLeafValue(gradients, hessians),
        numSamples: features.length
      };
    }

    // Find best split
    const bestSplit = this.findBestSplit(features, gradients, hessians);
    
    if (!bestSplit || bestSplit.gain <= 0) {
      return {
        isLeaf: true,
        value: this.calculateLeafValue(gradients, hessians),
        numSamples: features.length
      };
    }

    // Split data
    const { leftFeatures, leftGradients, leftHessians, leftIndices,
            rightFeatures, rightGradients, rightHessians, rightIndices } = 
      this.splitData(features, gradients, hessians, indices, bestSplit);

    // Recursively build children
    const leftChild = this.buildTree(leftFeatures, leftGradients, leftHessians, leftIndices, depth + 1);
    const rightChild = this.buildTree(rightFeatures, rightGradients, rightHessians, rightIndices, depth + 1);

    return {
      isLeaf: false,
      splitFeature: bestSplit.feature,
      splitValue: bestSplit.threshold,
      splitGain: bestSplit.gain,
      leftChild,
      rightChild,
      numSamples: features.length
    };
  }

  private findBestSplit(features: number[][], gradients: number[], hessians: number[]) {
    let bestGain = 0;
    let bestSplit: { feature: number; threshold: number; gain: number } | null = null;
    
    const numFeatures = features[0]?.length || 0;
    const featuresToCheck = Math.floor(numFeatures * this.config.featureFraction);
    const randomFeatures = this.shuffleArray([...Array(numFeatures).keys()]).slice(0, featuresToCheck);

    for (const featureIdx of randomFeatures) {
      const values = features.map(row => row[featureIdx]).filter(v => v !== undefined);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
      
      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const gain = this.calculateSplitGain(features, gradients, hessians, featureIdx, threshold);
        
        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = { feature: featureIdx, threshold, gain };
        }
      }
    }

    return bestSplit;
  }

  private calculateSplitGain(
    features: number[][],
    gradients: number[],
    hessians: number[],
    featureIdx: number,
    threshold: number
  ): number {
    let leftGradSum = 0, leftHessSum = 0, rightGradSum = 0, rightHessSum = 0;
    let leftCount = 0, rightCount = 0;

    for (let i = 0; i < features.length; i++) {
      const featureValue = features[i][featureIdx];
      if (featureValue !== undefined) {
        if (featureValue <= threshold) {
          leftGradSum += gradients[i];
          leftHessSum += hessians[i];
          leftCount++;
        } else {
          rightGradSum += gradients[i];
          rightHessSum += hessians[i];
          rightCount++;
        }
      }
    }

    if (leftCount < this.config.minDataInLeaf || rightCount < this.config.minDataInLeaf) {
      return 0;
    }

    const totalGradSum = leftGradSum + rightGradSum;
    const totalHessSum = leftHessSum + rightHessSum;

    const leftScore = (leftGradSum * leftGradSum) / (leftHessSum + this.config.lambdaL2);
    const rightScore = (rightGradSum * rightGradSum) / (rightHessSum + this.config.lambdaL2);
    const totalScore = (totalGradSum * totalGradSum) / (totalHessSum + this.config.lambdaL2);

    return (leftScore + rightScore - totalScore) / 2 - this.config.lambdaL1;
  }

  private calculateGradientsHessians(targets: number[], predictions: number[]) {
    const gradients: number[] = [];
    const hessians: number[] = [];

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const pred = predictions[i];

      switch (this.config.objective) {
        case 'regression':
          gradients.push(pred - target);
          hessians.push(1.0);
          break;
        case 'binary':
          const sigmoid = 1 / (1 + Math.exp(-pred));
          gradients.push(sigmoid - target);
          hessians.push(sigmoid * (1 - sigmoid));
          break;
        case 'multiclass':
          // Simplified multiclass - would need full softmax implementation
          gradients.push(pred - target);
          hessians.push(1.0);
          break;
      }
    }

    return { gradients, hessians };
  }

  private calculateLeafValue(gradients: number[], hessians: number[]): number {
    const gradSum = gradients.reduce((sum, g) => sum + g, 0);
    const hessSum = hessians.reduce((sum, h) => sum + h, 0);
    return -gradSum / (hessSum + this.config.lambdaL2);
  }

  private sampleFeaturesAndData(features: number[][], iteration: number) {
    const sampledIndices = [...Array(features.length).keys()];
    
    // Bagging
    if (this.config.baggingFraction < 1.0 && iteration % this.config.baggingFreq === 0) {
      const sampleSize = Math.floor(features.length * this.config.baggingFraction);
      this.shuffleArray(sampledIndices);
      sampledIndices.splice(sampleSize);
    }

    const sampledFeatures = sampledIndices.map(i => features[i]);
    return { sampledFeatures, sampledIndices };
  }

  private splitData(
    features: number[][],
    gradients: number[],
    hessians: number[],
    indices: number[],
    split: { feature: number; threshold: number; gain: number }
  ) {
    const leftFeatures: number[][] = [];
    const leftGradients: number[] = [];
    const leftHessians: number[] = [];
    const leftIndices: number[] = [];
    
    const rightFeatures: number[][] = [];
    const rightGradients: number[] = [];
    const rightHessians: number[] = [];
    const rightIndices: number[] = [];

    for (let i = 0; i < features.length; i++) {
      const featureValue = features[i][split.feature];
      if (featureValue !== undefined) {
        if (featureValue <= split.threshold) {
          leftFeatures.push(features[i]);
          leftGradients.push(gradients[i]);
          leftHessians.push(hessians[i]);
          leftIndices.push(indices[i]);
        } else {
          rightFeatures.push(features[i]);
          rightGradients.push(gradients[i]);
          rightHessians.push(hessians[i]);
          rightIndices.push(indices[i]);
        }
      }
    }

    return {
      leftFeatures, leftGradients, leftHessians, leftIndices,
      rightFeatures, rightGradients, rightHessians, rightIndices
    };
  }

  private initializePredictions(targets: number[]): number[] {
    switch (this.config.objective) {
      case 'regression':
        const mean = targets.reduce((sum, t) => sum + t, 0) / targets.length;
        return new Array(targets.length).fill(mean);
      case 'binary':
        const posRate = targets.reduce((sum, t) => sum + t, 0) / targets.length;
        const logOdds = Math.log(posRate / (1 - posRate));
        return new Array(targets.length).fill(logOdds);
      case 'multiclass':
        return new Array(targets.length).fill(0);
      default:
        return new Array(targets.length).fill(0);
    }
  }

  private updatePredictions(features: number[][], predictions: number[], tree: DecisionTree): number[] {
    return predictions.map((pred, i) => {
      const treePredict = this.predictTree(features[i], tree.rootNode);
      return pred + tree.learningRate * treePredict;
    });
  }

  private predictTree(features: number[], node: TreeNode): number {
    if (node.isLeaf) {
      return node.value || 0;
    }

    const featureValue = features[node.splitFeature!];
    if (featureValue === undefined) {
      return 0;
    }

    if (featureValue <= node.splitValue!) {
      return this.predictTree(features, node.leftChild!);
    } else {
      return this.predictTree(features, node.rightChild!);
    }
  }

  private calculateLoss(targets: number[], predictions: number[]): number {
    let loss = 0;
    for (let i = 0; i < targets.length; i++) {
      switch (this.config.objective) {
        case 'regression':
          loss += Math.pow(targets[i] - predictions[i], 2);
          break;
        case 'binary':
          const sigmoid = 1 / (1 + Math.exp(-predictions[i]));
          loss += -(targets[i] * Math.log(sigmoid + 1e-15) + (1 - targets[i]) * Math.log(1 - sigmoid + 1e-15));
          break;
        case 'multiclass':
          loss += Math.pow(targets[i] - predictions[i], 2);
          break;
      }
    }
    return loss / targets.length;
  }

  private adaptiveLearningRate(iteration: number): number {
    // Decay learning rate over time
    return this.config.learningRate * Math.pow(0.99, iteration / 100);
  }

  private shouldStopSplitting(gradients: number[], hessians: number[]): boolean {
    const gradSum = Math.abs(gradients.reduce((sum, g) => sum + g, 0));
    const hessSum = hessians.reduce((sum, h) => sum + h, 0);
    return gradSum < 1e-6 || hessSum < 1e-6;
  }

  private calculateFeatureImportances(): void {
    const importances: Record<string, number> = {};
    
    // Initialize all features to 0
    this.featureNames.forEach(name => {
      importances[name] = 0;
    });

    // Calculate importances from all trees
    this.trees.forEach(tree => {
      this.traverseTreeForImportances(tree.rootNode, importances);
    });

    // Normalize importances
    const total = Object.values(importances).reduce((sum, imp) => sum + imp, 0);
    if (total > 0) {
      Object.keys(importances).forEach(key => {
        importances[key] = importances[key] / total;
      });
    }

    this.metrics.featureImportances = importances;
  }

  private traverseTreeForImportances(node: TreeNode, importances: Record<string, number>): void {
    if (!node.isLeaf && node.splitFeature !== undefined && node.splitGain !== undefined) {
      const featureName = this.featureNames[node.splitFeature];
      if (featureName) {
        importances[featureName] += node.splitGain;
      }
      
      if (node.leftChild) {
        this.traverseTreeForImportances(node.leftChild, importances);
      }
      if (node.rightChild) {
        this.traverseTreeForImportances(node.rightChild, importances);
      }
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  predict(features: number[][]): number[] {
    if (this.trees.length === 0) {
      throw new Error('Model has not been trained yet');
    }

    return features.map(featureRow => {
      let prediction = 0;
      const useIteration = this.bestIteration > 0 ? this.bestIteration : this.trees.length - 1;
      
      for (let i = 0; i <= useIteration; i++) {
        const tree = this.trees[i];
        if (tree) {
          const treePred = this.predictTree(featureRow, tree.rootNode);
          prediction += tree.learningRate * treePred;
        }
      }

      // Apply final transformation based on objective
      switch (this.config.objective) {
        case 'binary':
          return 1 / (1 + Math.exp(-prediction));
        case 'regression':
          return prediction;
        case 'multiclass':
          return prediction; // Would need softmax for true multiclass
        default:
          return prediction;
      }
    });
  }

  async hyperparameterSearch(
    trainFeatures: number[][],
    trainTargets: number[],
    validFeatures: number[][],
    validTargets: number[],
    searchSpace: Partial<LightGBMHyperparams>,
    trials: number = 50
  ): Promise<Required<LightGBMConfig>> {
    let bestConfig = { ...this.config };
    let bestScore = Infinity;
    
    for (let trial = 0; trial < trials; trial++) {
      const config = this.sampleHyperparameters(searchSpace);
      const model = new LightGBMModel(config);
      
      try {
        await model.train(trainFeatures, trainTargets, validFeatures, validTargets);
        const predictions = model.predict(validFeatures);
        const score = this.calculateLoss(validTargets, predictions);
        
        if (score < bestScore) {
          bestScore = score;
          bestConfig = config;
        }
      } catch (error) {
        // Skip invalid configurations
        continue;
      }
    }

    return bestConfig;
  }

  private sampleHyperparameters(searchSpace: Partial<LightGBMHyperparams>): Required<LightGBMConfig> {
    const config = { ...this.config };
    
    if (searchSpace.numTrees) {
      config.numTrees = Math.floor(Math.random() * (searchSpace.numTrees[1] - searchSpace.numTrees[0]) + searchSpace.numTrees[0]);
    }
    
    if (searchSpace.learningRate) {
      config.learningRate = Math.random() * (searchSpace.learningRate[1] - searchSpace.learningRate[0]) + searchSpace.learningRate[0];
    }
    
    if (searchSpace.maxDepth) {
      config.maxDepth = Math.floor(Math.random() * (searchSpace.maxDepth[1] - searchSpace.maxDepth[0]) + searchSpace.maxDepth[0]);
    }
    
    if (searchSpace.numLeaves) {
      config.numLeaves = Math.floor(Math.random() * (searchSpace.numLeaves[1] - searchSpace.numLeaves[0]) + searchSpace.numLeaves[0]);
    }
    
    if (searchSpace.featureFraction) {
      config.featureFraction = Math.random() * (searchSpace.featureFraction[1] - searchSpace.featureFraction[0]) + searchSpace.featureFraction[0];
    }
    
    if (searchSpace.lambdaL1) {
      config.lambdaL1 = Math.random() * (searchSpace.lambdaL1[1] - searchSpace.lambdaL1[0]) + searchSpace.lambdaL1[0];
    }
    
    if (searchSpace.lambdaL2) {
      config.lambdaL2 = Math.random() * (searchSpace.lambdaL2[1] - searchSpace.lambdaL2[0]) + searchSpace.lambdaL2[0];
    }
    
    return config;
  }

  saveModel(): LightGBMSaveData {
    return {
      config: this.config,
      trees: this.trees,
      featureNames: this.featureNames,
      numClasses: this.numClasses,
      metrics: this.metrics,
      modelVersion: '1.0.0',
      trainedAt: new Date().toISOString()
    };
  }

  loadModel(saveData: LightGBMSaveData): void {
    this.config = saveData.config as Required<LightGBMConfig>;
    this.trees = saveData.trees;
    this.featureNames = saveData.featureNames;
    this.numClasses = saveData.numClasses || 1;
    this.metrics = saveData.metrics;
    this.bestIteration = saveData.metrics.bestIteration;
  }

  getMetrics(): ModelMetrics {
    return { ...this.metrics };
  }

  getFeatureImportances(): Record<string, number> {
    return { ...this.metrics.featureImportances };
  }

  getConfig(): Required<LightGBMConfig> {
    return { ...this.config };
  }
}