export interface CorrelationResult {
  metric1: string;
  metric2: string;
  correlation: number;
  pValue: number;
  sampleSize: number;
}

export interface DataPoint {
  date: string;
  [key: string]: any;
}

// Calculate Pearson correlation coefficient
export function calculateCorrelation(x: number[], y: number[]): { r: number; pValue: number } {
  if (x.length !== y.length || x.length < 3) {
    return { r: 0, pValue: 1 };
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return { r: 0, pValue: 1 };

  const r = numerator / denominator;

  // Calculate p-value using t-distribution approximation
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;
  const pValue = approximatePValue(Math.abs(t), df);

  return { r, pValue };
}

// Approximate p-value using t-distribution
function approximatePValue(t: number, df: number): number {
  // This is a simplified approximation
  // For production, consider using a proper statistics library
  
  // Beta function approximation
  let beta = Math.sqrt(Math.PI * df) * Math.pow(1 + t * t / df, -(df + 1) / 2);
  beta = beta / Math.sqrt(df);
  
  return Math.min(1, Math.max(0, 2 * beta));
}

// Calculate time-lagged correlation
export function calculateLaggedCorrelation(
  x: number[],
  y: number[],
  dates: string[],
  lagDays: number
): { r: number; pValue: number } {
  const laggedPairs: { x: number; y: number }[] = [];

  for (let i = lagDays; i < dates.length; i++) {
    if (x[i - lagDays] !== undefined && y[i] !== undefined) {
      laggedPairs.push({ x: x[i - lagDays], y: y[i] });
    }
  }

  if (laggedPairs.length < 3) {
    return { r: 0, pValue: 1 };
  }

  const xValues = laggedPairs.map(p => p.x);
  const yValues = laggedPairs.map(p => p.y);

  return calculateCorrelation(xValues, yValues);
}

// Extract aligned data for correlation analysis
export function alignDataForCorrelation(
  data1: DataPoint[],
  data2: DataPoint[],
  metric1Key: string,
  metric2Key: string
): { x: number[]; y: number[]; dates: string[] } {
  const dateMap = new Map<string, { value1?: number; value2?: number }>();

  // Build date map with values from both datasets
  data1.forEach(d => {
    const date = d.date;
    const value = d[metric1Key];
    if (value !== undefined && value !== null) {
      if (!dateMap.has(date)) dateMap.set(date, {});
      dateMap.get(date)!.value1 = Number(value);
    }
  });

  data2.forEach(d => {
    const date = d.date;
    const value = d[metric2Key];
    if (value !== undefined && value !== null) {
      if (!dateMap.has(date)) dateMap.set(date, {});
      dateMap.get(date)!.value2 = Number(value);
    }
  });

  // Extract aligned pairs
  const x: number[] = [];
  const y: number[] = [];
  const dates: string[] = [];

  Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, values]) => {
      if (values.value1 !== undefined && values.value2 !== undefined) {
        x.push(values.value1);
        y.push(values.value2);
        dates.push(date);
      }
    });

  return { x, y, dates };
}

// Find strongest correlations in the data
export function findStrongestCorrelations(
  correlations: CorrelationResult[],
  threshold: number = 0.3,
  pValueThreshold: number = 0.05
): CorrelationResult[] {
  return correlations
    .filter(c => Math.abs(c.correlation) >= threshold && c.pValue <= pValueThreshold)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}