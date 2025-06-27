// difficult
/**
 * Simple peaks finder utility
 * Finds local maxima in a 1D array of numbers
 * @param values - Array of numeric values to find peaks in
 * @param options - Configuration options
 * @returns Array of peak indices and values
 */
export function findPeaks(
  values: number[],
  options: {
    /** Minimum peak height (as a ratio of max value) */
    threshold?: number;
    /** Minimum distance between peaks */
    minDistance?: number;
  } = {}
): Array<{ index: number; value: number }> {
  const { threshold = 0.5, minDistance = 1 } = options;
  
  if (!values || values.length === 0) {
    return [];
  }

  const maxValue = Math.max(...values);
  const minPeakHeight = maxValue * threshold;
  const peaks: Array<{ index: number; value: number }> = [];

  for (let i = 1; i < values.length - 1; i++) {
    const current = values[i];
    const prev = values[i - 1];
    const next = values[i + 1];

    // Check if current point is a peak
    if (current > prev && current > next && current >= minPeakHeight) {
      // Check minimum distance from previous peak
      if (
        peaks.length === 0 ||
        i - peaks[peaks.length - 1].index >= minDistance
      ) {
        peaks.push({ index: i, value: current });
      } else if (current > peaks[peaks.length - 1].value) {
        // Replace previous peak if current is higher and within min distance
        peaks[peaks.length - 1] = { index: i, value: current };
      }
    }
  }

  return peaks;
}
