export class StandardScaler {
  private mean: number[] = [];
  private std: number[] = [];

  fit(X: number[][]): void {
    const nFeatures = X[0]?.length ?? 0;
    this.mean = Array(nFeatures).fill(0);
    this.std = Array(nFeatures).fill(1);

    for (let j = 0; j < nFeatures; j++) {
      const column = X.map(row => row[j] ?? 0);
      const m = column.reduce((a, b) => a + b, 0) / column.length;
      const variance = column.reduce((a, b) => a + (b - m) ** 2, 0) / column.length;
      this.mean[j] = m;
      this.std[j] = Math.sqrt(variance) || 1;
    }
  }

  transform(X: number[][]): number[][] {
    return X.map(row => row.map((val, idx) => (val - this.mean[idx]) / this.std[idx]));
  }

  fitTransform(X: number[][]): number[][] {
    this.fit(X);
    return this.transform(X);
  }

  inverseTransform(X: number[][]): number[][] {
    return X.map(row => row.map((val, idx) => val * this.std[idx] + this.mean[idx]));
  }
} 