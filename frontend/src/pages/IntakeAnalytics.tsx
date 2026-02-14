import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Filter,
  TrendingUp,
  BarChart3 as BarChartIcon,
  Download,
  RefreshCw,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Loader2,
  AlertCircle,
  Users,
  Percent,
  Trophy,
  Activity,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, Column } from '../components/ui';
import { 
  LineChart, 
  BarChart, 
  LineChartSeries, 
  BarChartSeries,
} from '../components/charts';
import { InstitutionKey, Sex, AnalysisMode } from '../types';
import {
  INSTITUTION_GROUPS,
  INSTITUTION_LABELS,
  getInstitutionLabel,
  generateYearRange,
  formatNumber,
} from '../utils';
import { intakeApi, JobResult, DataPoint, ChartSeries } from '../api';

/**
 * Holt's Double Exponential Smoothing for forecasting with trend.
 * Uses level + trend components to produce smoother, more accurate projections
 * than simple linear extrapolation from the last two points.
 */
function holtForecast(
  values: (number | null | undefined)[],
  periods: number,
  alpha: number = 0.3,
  beta: number = 0.1
): number[] {
  const data = values.filter((v): v is number => v != null && !isNaN(v));
  if (data.length < 2) return [];

  // Initialize level and trend from first two observations
  let level = data[0];
  let trend = data[1] - data[0];

  // Smooth over all historical data
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // Generate forecast values
  const forecasts: number[] = [];
  for (let h = 1; h <= periods; h++) {
    forecasts.push(level + h * trend);
  }
  return forecasts;
}

// Analysis mode configurations grouped by analytics category
type AnalysisModeConfig = { mode: AnalysisMode; label: string; description: string; icon: React.ReactNode };

const ANALYSIS_CATEGORIES: {
  category: string;
  description: string;
  icon: React.ReactNode;
  modes: AnalysisModeConfig[];
}[] = [
  {
    category: 'Descriptive Statistics',
    description: 'Averages, distributions, and summary metrics',
    icon: <Activity className="w-4 h-4" />,
    modes: [
      { mode: 'distribution', label: 'Distribution', description: 'Intake spread & variability per institution', icon: <Activity className="w-5 h-5" /> },
      { mode: 'gender_ratio', label: 'Gender Ratio', description: '% Female vs Male intake over time', icon: <Percent className="w-5 h-5" /> },
    ],
  },
  {
    category: 'Group-by Analysis',
    description: 'Analysis by institution or sector',
    icon: <BarChartIcon className="w-4 h-4" />,
    modes: [
      { mode: 'comparison', label: 'Institution Comparison', description: 'Compare total intake across institutions', icon: <BarChartIcon className="w-5 h-5" /> },
      { mode: 'ranking', label: 'Rankings', description: 'How institution rankings change each year', icon: <Trophy className="w-5 h-5" /> },
    ],
  },
  {
    category: 'Time-series Analysis',
    description: 'Trends and patterns over time',
    icon: <TrendingUp className="w-4 h-4" />,
    modes: [
      { mode: 'trend', label: 'Trend Over Time', description: 'Track intake trends by institution', icon: <TrendingUp className="w-5 h-5" /> },
      { mode: 'gender', label: 'Gender Analytics', description: 'Compare Male vs Female intake trends', icon: <Users className="w-5 h-5" /> },
    ],
  },
  {
    category: 'Comparative Analysis',
    description: 'Cross-year comparisons and growth',
    icon: <ArrowUpRight className="w-4 h-4" />,
    modes: [
      { mode: 'growth', label: 'Growth Analysis', description: 'Year-over-year growth rates', icon: <ArrowUpRight className="w-5 h-5" /> },
    ],
  },
];

// Flat list derived from categories (used for chart title lookups, etc.)
const ANALYSIS_MODES: AnalysisModeConfig[] = ANALYSIS_CATEGORIES.flatMap(c => c.modes);

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface InstitutionCheckboxGroupProps {
  selectedInstitutions: InstitutionKey[];
  onToggle: (institution: InstitutionKey) => void;
  onToggleGroup: (institutions: InstitutionKey[], selected: boolean) => void;
}

const InstitutionCheckboxGroup: React.FC<InstitutionCheckboxGroupProps> = ({
  selectedInstitutions,
  onToggle,
  onToggleGroup,
}) => {
  return (
    <div className="space-y-4">
      {INSTITUTION_GROUPS.map((group) => {
        const allSelected = group.institutions.every((i) =>
          selectedInstitutions.includes(i)
        );
        const someSelected = group.institutions.some((i) =>
          selectedInstitutions.includes(i)
        );

        return (
          <div key={group.name} className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={() => onToggleGroup(group.institutions, !allSelected)}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <span className="font-medium text-gray-900">{group.name}</span>
            </label>
            <div className="ml-6 grid grid-cols-2 gap-2">
              {group.institutions.map((institution) => (
                <label
                  key={institution}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedInstitutions.includes(institution)}
                    onChange={() => onToggle(institution)}
                    className="w-3.5 h-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-gray-700">
                    {INSTITUTION_LABELS[institution]}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Growth indicator component
const GrowthIndicator: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null || isNaN(value)) return <span className="text-gray-400">—</span>;
  
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${
      isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600'
    }`}>
      {isNeutral ? (
        <Minus className="w-3 h-3" />
      ) : isPositive ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const IntakeAnalytics: React.FC = () => {
  // API Data State
  const [timeSeriesResult, setTimeSeriesResult] = useState<JobResult | null>(null);
  const [groupByResult, setGroupByResult] = useState<JobResult | null>(null);
  const [comparativeResult, setComparativeResult] = useState<JobResult | null>(null);
  const [genderComparisonResult, setGenderComparisonResult] = useState<JobResult | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Year range derived from time series data
  const minYear = useMemo(() => {
    if (!timeSeriesResult?.visualization?.series?.[0]?.points) return 1982;
    const years = timeSeriesResult.visualization.series[0].points.map((p: DataPoint) => p.x as number);
    return Math.min(...years);
  }, [timeSeriesResult]);
  
  const maxYear = useMemo(() => {
    if (!timeSeriesResult?.visualization?.series?.[0]?.points) return 2024;
    const years = timeSeriesResult.visualization.series[0].points.map((p: DataPoint) => p.x as number);
    return Math.max(...years);
  }, [timeSeriesResult]);

  // Filter State
  const [selectedInstitutions, setSelectedInstitutions] = useState<InstitutionKey[]>([
    'nus',
    'ntu',
    'smu',
    'sit',
  ]);
  const [yearFrom, setYearFrom] = useState(2015);
  const [yearTo, setYearTo] = useState(2024);
  const [sex, setSex] = useState<Sex>('MF');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('trend');
  const [showForecast, setShowForecast] = useState(true);
  const [comparisonChartType, setComparisonChartType] = useState<'bar' | 'horizontal' | 'grouped'>('bar');
  const FORECAST_YEARS = 5; // 5-year projection

  // Initial data load
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch core data in parallel
      const [timeSeries, groupBy] = await Promise.all([
        intakeApi.getTimeSeries('MF'),
        intakeApi.getGroupByInstitution('MF'),
      ]);
      
      setTimeSeriesResult(timeSeries);
      setGroupByResult(groupBy);
      
      // Update yearTo based on data
      const years = timeSeries.visualization.series[0].points.map((p: DataPoint) => p.x as number);
      const latestYear = Math.max(...years);
      setYearTo(latestYear);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data from the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch comparative data when institutions change (for trend mode)
  useEffect(() => {
    if (!isLoading && selectedInstitutions.length >= 2) {
      intakeApi.getComparative(selectedInstitutions, sex)
        .then(setComparativeResult)
        .catch(console.error);
    }
  }, [selectedInstitutions, sex, isLoading]);

  // Fetch gender comparison data when institutions change (for gender mode)
  useEffect(() => {
    if (!isLoading && selectedInstitutions.length > 0) {
      intakeApi.getGenderComparison(selectedInstitutions)
        .then(setGenderComparisonResult)
        .catch(console.error);
    }
  }, [selectedInstitutions, isLoading]);

  // Refetch data when sex filter changes
  const handleSexChange = useCallback(async (newSex: Sex) => {
    setSex(newSex);
    setIsRefreshing(true);
    try {
      // Refetch sex-dependent data sources independently so one failure doesn't block others
      const [timeSeriesSettled, groupBySettled, comparativeSettled] = await Promise.allSettled([
        intakeApi.getTimeSeries(newSex),
        intakeApi.getGroupByInstitution(newSex),
        selectedInstitutions.length >= 2
          ? intakeApi.getComparative(selectedInstitutions, newSex)
          : Promise.resolve(null),
      ]);
      
      if (timeSeriesSettled.status === 'fulfilled' && timeSeriesSettled.value) {
        setTimeSeriesResult(timeSeriesSettled.value);
      }
      if (groupBySettled.status === 'fulfilled' && groupBySettled.value) {
        setGroupByResult(groupBySettled.value);
      }
      if (comparativeSettled.status === 'fulfilled' && comparativeSettled.value) {
        setComparativeResult(comparativeSettled.value);
      }
      // Gender comparison is NOT refetched here — it always shows both M and F
      // and does not depend on the sex filter
    } catch (err) {
      console.error('Failed to refetch data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedInstitutions]);

  // Handlers
  const handleToggleInstitution = (institution: InstitutionKey) => {
    setSelectedInstitutions((prev) =>
      prev.includes(institution)
        ? prev.filter((i) => i !== institution)
        : [...prev, institution]
    );
  };

  const handleToggleGroup = (institutions: InstitutionKey[], selected: boolean) => {
    if (selected) {
      setSelectedInstitutions((prev) => [
        ...new Set([...prev, ...institutions]),
      ]);
    } else {
      setSelectedInstitutions((prev) =>
        prev.filter((i) => !institutions.includes(i))
      );
    }
  };

  const handleReset = () => {
    setSelectedInstitutions(['nus', 'ntu', 'smu', 'sit']);
    setYearFrom(2015);
    setYearTo(maxYear);
    setSex('MF');
    setAnalysisMode('trend');
    setShowForecast(true);
    setComparisonChartType('bar');
  };

  // Check if the analysis mode needs certain filters
  const needsGenderFilter = true; // All modes support gender filter
  // All modes now support institution filtering
  const needsInstitutionFilter = true;
  const needsForecastOption = (analysisMode === 'trend' || analysisMode === 'growth' || analysisMode === 'gender') && yearTo === maxYear;

  // Auto-disable forecast when yearTo is not the latest year
  useEffect(() => {
    if (yearTo !== maxYear) {
      setShowForecast(false);
    }
  }, [yearTo, maxYear]);

  // ============================================================================
  // DATA TRANSFORMATIONS FROM API RESULTS
  // ============================================================================
  
  // TREND MODE DATA - From comparative API for multiple institution lines
  const trendChartData = useMemo(() => {
    if (analysisMode !== 'trend') return [];
    
    // Use comparative result when we have selected institutions
    if (comparativeResult && comparativeResult.visualization.series.length > 0) {
      const yearData: Record<number, any> = {};
      
      comparativeResult.visualization.series.forEach((series: ChartSeries) => {
        const instKey = series.name as InstitutionKey;
        // Only include selected institutions
        if (selectedInstitutions.includes(instKey)) {
          series.points.forEach((p: DataPoint) => {
            const year = p.x as number;
            if (year >= yearFrom && year <= yearTo) {
              if (!yearData[year]) {
                yearData[year] = { year, isForecast: false };
              }
              const label = getInstitutionLabel(instKey);
              yearData[year][label] = p.y > 0 ? p.y : null;
            }
          });
        }
      });
      
      const historicalData = Object.values(yearData).sort((a: any, b: any) => a.year - b.year);
      
      // Add forecast data if enabled (Holt's exponential smoothing)
      if (showForecast && yearTo === maxYear && historicalData.length >= 2) {
        const institutions = selectedInstitutions.map(i => getInstitutionLabel(i));
        
        // Compute forecasts using exponential smoothing for each institution
        const forecastsByInst: Record<string, number[]> = {};
        institutions.forEach(inst => {
          const histValues = historicalData.map((d: any) => d[inst] as number | null);
          forecastsByInst[inst] = holtForecast(histValues, FORECAST_YEARS);
        });
        
        // Connect forecast to last historical point
        const lastHistorical = historicalData[historicalData.length - 1] as any;
        institutions.forEach(inst => {
          if (lastHistorical[inst] != null) {
            lastHistorical[`${inst}_forecast`] = lastHistorical[inst];
          }
        });
        
        // Project forward for each institution
        for (let i = 1; i <= FORECAST_YEARS; i++) {
          const forecastYear = maxYear + i;
          const forecastPoint: any = { year: forecastYear, isForecast: true };
          
          institutions.forEach(inst => {
            if (forecastsByInst[inst]?.length >= i) {
              forecastPoint[`${inst}_forecast`] = Math.round(forecastsByInst[inst][i - 1]);
              forecastPoint[inst] = null;
            }
          });
          
          historicalData.push(forecastPoint);
        }
      }
      
      return historicalData;
    }
    
    // Fallback to total time series if no comparative data
    if (!timeSeriesResult) return [];
    
    const points = timeSeriesResult.visualization.series[0]?.points || [];
    return points
      .filter((p: DataPoint) => {
        const year = p.x as number;
        return year >= yearFrom && year <= yearTo;
      })
      .map((p: DataPoint) => ({
        year: p.x as number,
        Total: p.y,
        isForecast: false,
      }));
  }, [comparativeResult, timeSeriesResult, analysisMode, yearFrom, yearTo, maxYear, showForecast, selectedInstitutions, FORECAST_YEARS]);

  // COMPARISON MODE DATA - From API Group By
  const comparisonChartData = useMemo(() => {
    if (analysisMode !== 'comparison' || !groupByResult) return [];
    
    const points = groupByResult.visualization.series[0]?.points || [];
    
    return points
      .filter((p: DataPoint) => selectedInstitutions.includes(p.x as InstitutionKey))
      .map((p: DataPoint) => ({
        institution: getInstitutionLabel(p.x as InstitutionKey),
        institutionKey: p.x as string,
        intake: p.y,
      }))
      .sort((a, b) => b.intake - a.intake);
  }, [groupByResult, analysisMode, selectedInstitutions]);

  // GROWTH ANALYSIS DATA - Per institution from comparative API
  const growthChartData = useMemo(() => {
    if (analysisMode !== 'growth') return [];
    
    // Use comparative result for per-institution growth
    if (comparativeResult && comparativeResult.visualization.series.length > 0) {
      const yearData: Record<number, any> = {};
      
      comparativeResult.visualization.series.forEach((series: ChartSeries) => {
        const instKey = series.name as InstitutionKey;
        if (!selectedInstitutions.includes(instKey)) return;
        
        const label = getInstitutionLabel(instKey);
        // Sort points by year
        const sortedPoints = [...series.points].sort((a, b) => (a.x as number) - (b.x as number));
        
        for (let i = 1; i < sortedPoints.length; i++) {
          const curr = sortedPoints[i];
          const prev = sortedPoints[i - 1];
          const year = curr.x as number;
          const prevYear = prev.x as number;
          
          if (year >= yearFrom && year <= yearTo && prevYear === year - 1) {
            if (!yearData[year]) {
              yearData[year] = { year, isForecast: false };
            }
            const growth = prev.y !== 0 ? ((curr.y - prev.y) / prev.y) * 100 : null;
            yearData[year][label] = growth;
          } else if (year >= yearFrom && year <= yearTo && !yearData[year]) {
            yearData[year] = { year, isForecast: false };
          }
        }
      });
      
      const historicalData = Object.values(yearData).sort((a: any, b: any) => a.year - b.year);
      
      // Add forecast data if enabled (Holt's exponential smoothing)
      if (showForecast && yearTo === maxYear && historicalData.length >= 2) {
        const institutions = selectedInstitutions.map(i => getInstitutionLabel(i));
        
        // Compute forecasts using exponential smoothing for each institution
        const forecastsByInst: Record<string, number[]> = {};
        institutions.forEach(inst => {
          const histValues = historicalData.map((d: any) => d[inst] as number | null);
          forecastsByInst[inst] = holtForecast(histValues, FORECAST_YEARS);
        });
        
        // Connect forecast to last historical point
        const lastHistorical = historicalData[historicalData.length - 1] as any;
        institutions.forEach(inst => {
          if (lastHistorical[inst] !== undefined && lastHistorical[inst] !== null) {
            lastHistorical[`${inst}_forecast`] = lastHistorical[inst];
          }
        });
        
        // Project forward
        for (let i = 1; i <= FORECAST_YEARS; i++) {
          const forecastYear = maxYear + i;
          const forecastPoint: any = { year: forecastYear, isForecast: true };
          
          institutions.forEach(inst => {
            if (forecastsByInst[inst]?.length >= i) {
              forecastPoint[`${inst}_forecast`] = parseFloat(forecastsByInst[inst][i - 1].toFixed(1));
              forecastPoint[inst] = null;
            }
          });
          
          historicalData.push(forecastPoint);
        }
      }
      
      return historicalData;
    }
    
    return [];
  }, [comparativeResult, analysisMode, yearFrom, yearTo, maxYear, showForecast, selectedInstitutions, FORECAST_YEARS]);

  // GENDER ANALYTICS DATA - From gender comparison API
  const genderChartData = useMemo(() => {
    if (analysisMode !== 'gender') return [];
    
    if (genderComparisonResult && genderComparisonResult.visualization.series.length > 0) {
      const yearData: Record<number, any> = {};
      
      genderComparisonResult.visualization.series.forEach((series: ChartSeries) => {
        const sexKey = series.name; // 'M', 'F', or 'MF'
        if (sexKey !== 'M' && sexKey !== 'F') return; // Only Male and Female
        
        series.points.forEach((p: DataPoint) => {
          const year = p.x as number;
          if (year >= yearFrom && year <= yearTo) {
            if (!yearData[year]) {
              yearData[year] = { year, isForecast: false };
            }
            const label = sexKey === 'M' ? 'Male' : 'Female';
            yearData[year][label] = p.y > 0 ? p.y : null;
          }
        });
      });
      
      const historicalData = Object.values(yearData).sort((a: any, b: any) => a.year - b.year);
      
      // Add forecast data if enabled (Holt's exponential smoothing)
      if (showForecast && yearTo === maxYear && historicalData.length >= 2) {
        const genderKeys = ['Male', 'Female'];
        
        // Compute forecasts using exponential smoothing for each gender
        const forecastsByGender: Record<string, number[]> = {};
        genderKeys.forEach(key => {
          const histValues = historicalData.map((d: any) => d[key] as number | null);
          forecastsByGender[key] = holtForecast(histValues, FORECAST_YEARS);
        });
        
        // Connect forecast to last historical point
        const lastHistorical = historicalData[historicalData.length - 1] as any;
        genderKeys.forEach(key => {
          if (lastHistorical[key] != null) {
            lastHistorical[`${key}_forecast`] = lastHistorical[key];
          }
        });
        
        // Project forward
        for (let i = 1; i <= FORECAST_YEARS; i++) {
          const forecastYear = maxYear + i;
          const forecastPoint: any = { year: forecastYear, isForecast: true };
          
          genderKeys.forEach(key => {
            if (forecastsByGender[key]?.length >= i) {
              forecastPoint[`${key}_forecast`] = Math.round(forecastsByGender[key][i - 1]);
              forecastPoint[key] = null;
            }
          });
          
          historicalData.push(forecastPoint);
        }
      }
      
      return historicalData;
    }
    
    return [];
  }, [genderComparisonResult, analysisMode, yearFrom, yearTo, maxYear, showForecast, FORECAST_YEARS]);

  // GENDER RATIO DATA - % Female per institution from gender comparison API
  const genderRatioChartData = useMemo(() => {
    if (analysisMode !== 'gender_ratio') return [];
    
    // We need both M and F data per institution — use comparative with sex=F and sex=MF
    // But we have genderComparisonResult which is aggregated across institutions.
    // For per-institution gender ratio, we need raw data from comparative calls.
    // Use comparativeResult to get per-institution totals (sex=MF), and compute ratio
    // from the raw data. Since we only have aggregated gender data, we'll compute
    // from individual institution data if available.
    
    // For now, use the genderComparisonResult to show overall % Female over time
    if (genderComparisonResult && genderComparisonResult.visualization.series.length > 0) {
      const maleByYear: Record<number, number> = {};
      const femaleByYear: Record<number, number> = {};
      
      genderComparisonResult.visualization.series.forEach((series: ChartSeries) => {
        const sexKey = series.name;
        series.points.forEach((p: DataPoint) => {
          const year = p.x as number;
          if (year >= yearFrom && year <= yearTo) {
            if (sexKey === 'M') maleByYear[year] = (maleByYear[year] || 0) + p.y;
            if (sexKey === 'F') femaleByYear[year] = (femaleByYear[year] || 0) + p.y;
          }
        });
      });
      
      const years = [...new Set([...Object.keys(maleByYear), ...Object.keys(femaleByYear)])]
        .map(Number).sort((a, b) => a - b);
      
      return years.map(year => {
        const male = maleByYear[year] || 0;
        const female = femaleByYear[year] || 0;
        const total = male + female;
        return {
          year,
          'Female %': total > 0 ? parseFloat(((female / total) * 100).toFixed(1)) : null,
          'Male %': total > 0 ? parseFloat(((male / total) * 100).toFixed(1)) : null,
        };
      });
    }
    
    return [];
  }, [genderComparisonResult, analysisMode, yearFrom, yearTo]);

  // RANKING DATA - Institution rank by intake each year
  const rankingChartData = useMemo(() => {
    if (analysisMode !== 'ranking') return [];
    
    if (comparativeResult && comparativeResult.visualization.series.length > 0) {
      // Collect intake per institution per year
      const yearInstData: Record<number, Record<string, number>> = {};
      
      comparativeResult.visualization.series.forEach((series: ChartSeries) => {
        const instKey = series.name as InstitutionKey;
        if (!selectedInstitutions.includes(instKey)) return;
        
        series.points.forEach((p: DataPoint) => {
          const year = p.x as number;
          if (year >= yearFrom && year <= yearTo && p.y > 0) {
            if (!yearInstData[year]) yearInstData[year] = {};
            yearInstData[year][instKey] = p.y;
          }
        });
      });
      
      // Compute rankings per year
      const years = Object.keys(yearInstData).map(Number).sort((a, b) => a - b);
      
      return years.map(year => {
        const entries = Object.entries(yearInstData[year] || {});
        // Sort by intake descending to assign ranks
        entries.sort((a, b) => b[1] - a[1]);
        
        const row: Record<string, any> = { year };
        entries.forEach(([instKey], index) => {
          const label = getInstitutionLabel(instKey as InstitutionKey);
          row[label] = index + 1; // rank 1 = highest intake
        });
        
        return row;
      });
    }
    
    return [];
  }, [comparativeResult, analysisMode, yearFrom, yearTo, selectedInstitutions]);

  // DISTRIBUTION DATA - Box plot stats per institution
  const distributionChartData = useMemo(() => {
    if (analysisMode !== 'distribution') return [];
    
    if (comparativeResult && comparativeResult.visualization.series.length > 0) {
      return comparativeResult.visualization.series
        .filter((series: ChartSeries) => selectedInstitutions.includes(series.name as InstitutionKey))
        .map((series: ChartSeries) => {
          const values = series.points
            .map((p: DataPoint) => p.y)
            .filter((v: number) => v > 0)
            .sort((a: number, b: number) => a - b);
          
          if (values.length === 0) return null;
          
          const q1Idx = Math.floor(values.length * 0.25);
          const medIdx = Math.floor(values.length * 0.5);
          const q3Idx = Math.floor(values.length * 0.75);
          const mean = values.reduce((s: number, v: number) => s + v, 0) / values.length;
          const variance = values.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / values.length;
          const stdDev = Math.sqrt(variance);
          
          return {
            institution: getInstitutionLabel(series.name as InstitutionKey),
            institutionKey: series.name,
            min: values[0],
            q1: values[q1Idx],
            median: values[medIdx],
            q3: values[q3Idx],
            max: values[values.length - 1],
            mean: Math.round(mean),
            stdDev: Math.round(stdDev),
            range: values[values.length - 1] - values[0],
            count: values.length,
          };
        })
        .filter((d): d is NonNullable<typeof d> => d != null);
    }
    
    return [];
  }, [comparativeResult, analysisMode, selectedInstitutions]);

  // ============================================================================
  // CHART SERIES CONFIGURATIONS
  // ============================================================================
  const SERIES_COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];

  // Dynamic trend series based on selected institutions
  const trendSeries: LineChartSeries[] = useMemo(() => {
    return selectedInstitutions.map((inst, index) => ({
      dataKey: getInstitutionLabel(inst),
      name: getInstitutionLabel(inst),
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      dot: true,
    }));
  }, [selectedInstitutions]);

  // Forecast series for trend (dashed lines)
  const trendForecastSeries: LineChartSeries[] = useMemo(() => {
    return selectedInstitutions.map((inst, index) => ({
      dataKey: `${getInstitutionLabel(inst)}_forecast`,
      name: `${getInstitutionLabel(inst)} (Forecast)`,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      strokeDasharray: '5 5',
      dot: false,
    }));
  }, [selectedInstitutions]);

  // Growth series - dynamic per institution
  const growthSeries: LineChartSeries[] = useMemo(() => {
    return selectedInstitutions.map((inst, index) => ({
      dataKey: getInstitutionLabel(inst),
      name: getInstitutionLabel(inst),
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      dot: true,
    }));
  }, [selectedInstitutions]);

  // Growth forecast series (dashed lines)
  const growthForecastSeries: LineChartSeries[] = useMemo(() => {
    return selectedInstitutions.map((inst, index) => ({
      dataKey: `${getInstitutionLabel(inst)}_forecast`,
      name: `${getInstitutionLabel(inst)} (Forecast)`,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      strokeDasharray: '5 5',
      dot: false,
    }));
  }, [selectedInstitutions]);

  // Gender series (Male vs Female)
  const genderSeries: LineChartSeries[] = [
    { dataKey: 'Male', name: 'Male', color: '#3b82f6', dot: true },
    { dataKey: 'Female', name: 'Female', color: '#ec4899', dot: true },
  ];

  // Gender forecast series (dashed lines)
  const genderForecastSeries: LineChartSeries[] = [
    { dataKey: 'Male_forecast', name: 'Male (Forecast)', color: '#3b82f6', strokeDasharray: '5 5', dot: false },
    { dataKey: 'Female_forecast', name: 'Female (Forecast)', color: '#ec4899', strokeDasharray: '5 5', dot: false },
  ];

  // Bar series for comparison
  const barSeries: BarChartSeries[] = [
    { dataKey: 'intake', name: 'Total Intake (All Years)', color: '#3b82f6' },
  ];

  // Gender ratio series
  const genderRatioSeries: LineChartSeries[] = [
    { dataKey: 'Female %', name: 'Female %', color: '#ec4899', dot: true },
    { dataKey: 'Male %', name: 'Male %', color: '#3b82f6', dot: true },
  ];

  // Ranking series - dynamic per institution (lower = better)
  const rankingSeries: LineChartSeries[] = useMemo(() => {
    return selectedInstitutions.map((inst, index) => ({
      dataKey: getInstitutionLabel(inst),
      name: getInstitutionLabel(inst),
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      dot: true,
    }));
  }, [selectedInstitutions]);

  // Distribution bar series
  const distributionBarSeries: BarChartSeries[] = [
    { dataKey: 'median', name: 'Median', color: '#3b82f6' },
    { dataKey: 'mean', name: 'Mean', color: '#10b981' },
  ];

  // ============================================================================
  // TABLE CONFIGURATIONS
  // ============================================================================
  const tableColumns: Column<Record<string, any>>[] = useMemo(() => {
    switch (analysisMode) {
      case 'trend':
        const trendCols: Column<Record<string, any>>[] = [
          { key: 'year', header: 'Year', sortable: true },
        ];
        selectedInstitutions.forEach(inst => {
          const label = getInstitutionLabel(inst);
          trendCols.push({
            key: label,
            header: label,
            render: (v: number) => formatNumber(v),
          });
        });
        return trendCols;
      case 'comparison':
        return [
          { key: 'institution', header: 'Institution' },
          { key: 'intake', header: 'Total Intake (All Years)', render: (v: number) => formatNumber(v) },
        ];
      case 'growth':
        const growthCols: Column<Record<string, any>>[] = [
          { key: 'year', header: 'Year', sortable: true },
        ];
        selectedInstitutions.forEach(inst => {
          const label = getInstitutionLabel(inst);
          growthCols.push({
            key: label,
            header: label,
            render: (v: number | null) => <GrowthIndicator value={v} />,
          });
        });
        return growthCols;
      case 'gender':
        return [
          { key: 'year', header: 'Year', sortable: true },
          { key: 'Male', header: 'Male', render: (v: number) => formatNumber(v) },
          { key: 'Female', header: 'Female', render: (v: number) => formatNumber(v) },
        ];
      case 'gender_ratio':
        return [
          { key: 'year', header: 'Year', sortable: true },
          { key: 'Female %', header: 'Female %', render: (v: number) => v != null ? `${v.toFixed(1)}%` : '—' },
          { key: 'Male %', header: 'Male %', render: (v: number) => v != null ? `${v.toFixed(1)}%` : '—' },
        ];
      case 'ranking':
        const rankCols: Column<Record<string, any>>[] = [
          { key: 'year', header: 'Year', sortable: true },
        ];
        selectedInstitutions.forEach(inst => {
          const label = getInstitutionLabel(inst);
          rankCols.push({
            key: label,
            header: label,
            render: (v: number) => v != null ? `#${v}` : '—',
          });
        });
        return rankCols;
      case 'distribution':
        return [
          { key: 'institution', header: 'Institution' },
          { key: 'min', header: 'Min', render: (v: number) => formatNumber(v) },
          { key: 'q1', header: 'Q1', render: (v: number) => formatNumber(v) },
          { key: 'median', header: 'Median', render: (v: number) => formatNumber(v) },
          { key: 'q3', header: 'Q3', render: (v: number) => formatNumber(v) },
          { key: 'max', header: 'Max', render: (v: number) => formatNumber(v) },
          { key: 'mean', header: 'Mean', render: (v: number) => formatNumber(v) },
          { key: 'stdDev', header: 'Std Dev', render: (v: number) => formatNumber(v) },
        ];
      default:
        return [];
    }
  }, [analysisMode, selectedInstitutions]);

  // Table Data (filter out forecast rows)
  const tableData = useMemo(() => {
    switch (analysisMode) {
      case 'trend':
        return trendChartData.filter(d => !d.isForecast);
      case 'comparison':
        return comparisonChartData;
      case 'growth':
        return growthChartData.filter(d => !d.isForecast);
      case 'gender':
        return genderChartData;
      case 'gender_ratio':
        return genderRatioChartData;
      case 'ranking':
        return rankingChartData;
      case 'distribution':
        return distributionChartData;
      default:
        return [];
    }
  }, [analysisMode, trendChartData, comparisonChartData, growthChartData, genderChartData, genderRatioChartData, rankingChartData, distributionChartData]);

  // ============================================================================
  // SUMMARY STATISTICS
  // ============================================================================
  const summaryStats = useMemo(() => {
    switch (analysisMode) {
      case 'trend':
        if (trendChartData.length === 0) return null;
        const historicalTrend = trendChartData.filter(d => !d.isForecast);
        return { 
          institutions: selectedInstitutions.length, 
          years: historicalTrend.length,
          forecast: showForecast ? 'Enabled' : 'Disabled'
        };
        
      case 'comparison':
        const compTotal = comparisonChartData.reduce((a, d) => a + d.intake, 0);
        return { total: compTotal, institutions: comparisonChartData.length };
        
      case 'growth':
        if (growthChartData.length === 0) return null;
        const historicalGrowth = growthChartData.filter(d => !d.isForecast);
        return { institutions: selectedInstitutions.length, years: historicalGrowth.length };

      case 'gender':
        if (genderChartData.length === 0) return null;
        const totalMale = genderChartData.reduce((sum, d) => sum + (d.Male || 0), 0);
        const totalFemale = genderChartData.reduce((sum, d) => sum + (d.Female || 0), 0);
        return { totalMale, totalFemale, years: genderChartData.length };

      case 'gender_ratio':
        if (genderRatioChartData.length === 0) return null;
        const latestRatio = genderRatioChartData[genderRatioChartData.length - 1];
        const earliestRatio = genderRatioChartData[0];
        return {
          latestFemale: latestRatio?.['Female %'] ?? 0,
          earliestFemale: earliestRatio?.['Female %'] ?? 0,
          years: genderRatioChartData.length,
        };

      case 'ranking':
        if (rankingChartData.length === 0) return null;
        return {
          institutions: selectedInstitutions.length,
          years: rankingChartData.length,
        };

      case 'distribution':
        if (distributionChartData.length === 0) return null;
        const avgMedian = distributionChartData.reduce((s: number, d: any) => s + (d.median || 0), 0) / distributionChartData.length;
        return {
          institutions: distributionChartData.length,
          avgMedian: Math.round(avgMedian),
        };
        
      default:
        return null;
    }
  }, [analysisMode, trendChartData, comparisonChartData, growthChartData, genderChartData, genderRatioChartData, rankingChartData, distributionChartData, selectedInstitutions, showForecast]);

  // ============================================================================
  // RENDER CHART
  // ============================================================================
  const renderChart = () => {
    if (isRefreshing) {
      return (
        <div className="flex flex-col items-center justify-center h-80 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <p>Updating data...</p>
        </div>
      );
    }

    switch (analysisMode) {
      case 'trend':
        if (selectedInstitutions.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <Info className="w-12 h-12 mb-4" />
              <p>Select at least one institution to view the chart</p>
            </div>
          );
        }
        const allTrendSeries = showForecast ? [...trendSeries, ...trendForecastSeries] : trendSeries;
        return (
          <div className="space-y-4">
            {showForecast && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <Sparkles className="w-4 h-4" />
                <span>Dashed lines show {FORECAST_YEARS}-year forecast (exponential smoothing)</span>
              </div>
            )}
            <LineChart
              data={trendChartData}
              xAxisKey="year"
              series={allTrendSeries}
              xAxisLabel="Year"
              yAxisLabel="Student Intake"
              height={400}
              areaFill
              showBrush
              formatTooltip={(v) => formatNumber(v)}
            />
          </div>
        );

      case 'comparison':
        if (selectedInstitutions.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <Info className="w-12 h-12 mb-4" />
              <p>Select at least one institution to view the chart</p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Chart Type:</span>
              <select
                value={comparisonChartType}
                onChange={(e) => setComparisonChartType(e.target.value as 'bar' | 'horizontal' | 'grouped')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="bar">Vertical Bar</option>
                <option value="horizontal">Horizontal Bar</option>
                <option value="grouped">Grouped by Sector</option>
              </select>
            </div>
            {comparisonChartType === 'grouped' ? (
              <BarChart
                data={(() => {
                  const groups = INSTITUTION_GROUPS.map(group => {
                    const total = group.institutions
                      .filter(inst => selectedInstitutions.includes(inst))
                      .reduce((sum, inst) => {
                        const row = comparisonChartData.find(d => d.institutionKey === inst);
                        return sum + (row?.intake ?? 0);
                      }, 0);
                    return { sector: group.name, intake: total };
                  }).filter(g => g.intake > 0);
                  return groups;
                })()}
                xAxisKey="sector"
                series={barSeries}
                xAxisLabel="Sector"
                yAxisLabel="Total Intake"
                height={400}
                useColorPerBar
                showLabels
                formatTooltip={(v) => formatNumber(v)}
              />
            ) : (
              <BarChart
                data={comparisonChartData}
                xAxisKey="institution"
                series={barSeries}
                xAxisLabel="Institution"
                yAxisLabel="Total Intake"
                height={400}
                useColorPerBar
                showLabels
                formatTooltip={(v) => formatNumber(v)}
                layout={comparisonChartType === 'horizontal' ? 'vertical' : 'horizontal'}
              />
            )}
          </div>
        );

      case 'growth':
        if (selectedInstitutions.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <Info className="w-12 h-12 mb-4" />
              <p>Select at least one institution to view growth rates</p>
            </div>
          );
        }
        const allGrowthSeries = showForecast ? [...growthSeries, ...growthForecastSeries] : growthSeries;
        return (
          <div className="space-y-4">
            {showForecast && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <Sparkles className="w-4 h-4" />
                <span>Dashed lines show {FORECAST_YEARS}-year forecast (exponential smoothing)</span>
              </div>
            )}
            <LineChart
              data={growthChartData}
              xAxisKey="year"
              series={allGrowthSeries}
              xAxisLabel="Year"
              yAxisLabel="Growth Rate (%)"
              height={400}
              showBrush
              referenceLines={[{ y: 0, label: 'No Growth', color: '#94a3b8' }]}
              formatTooltip={(v) => v != null ? `${v.toFixed(1)}%` : 'N/A'}
            />
          </div>
        );

      case 'gender':
        if (genderChartData.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-80 text-gray-500">
              <Info className="w-12 h-12 mb-4" />
              <p>No gender data available for the selected filters</p>
            </div>
          );
        }
        const allGenderSeries = showForecast ? [...genderSeries, ...genderForecastSeries] : genderSeries;
        return (
          <div className="space-y-4">
            {showForecast && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <Sparkles className="w-4 h-4" />
                <span>Dashed lines show {FORECAST_YEARS}-year forecast (exponential smoothing)</span>
              </div>
            )}
            <LineChart
              data={genderChartData}
              xAxisKey="year"
              series={allGenderSeries}
              xAxisLabel="Year"
              yAxisLabel="Student Intake"
              height={400}
              areaFill
              showBrush
              formatTooltip={(v) => formatNumber(v)}
            />
          </div>
        );

      default:
        return renderNewCharts();
    }
  };

  // Helper: render empty state for institution-dependent charts
  const renderEmptyInstitutions = (message: string = 'Select at least one institution to view the chart') => (
    <div className="flex flex-col items-center justify-center h-80 text-gray-500">
      <Info className="w-12 h-12 mb-4" />
      <p>{message}</p>
    </div>
  );

  // Render new chart modes
  const renderNewCharts = () => {
    switch (analysisMode) {
      case 'gender_ratio':
        if (genderRatioChartData.length === 0) {
          return renderEmptyInstitutions('No gender ratio data available for the selected filters');
        }
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <Percent className="w-4 h-4" />
              <span>Showing percentage of Female vs Male intake across selected institutions</span>
            </div>
            <LineChart
              data={genderRatioChartData}
              xAxisKey="year"
              series={genderRatioSeries}
              xAxisLabel="Year"
              yAxisLabel="Percentage (%)"
              height={400}
              areaFill
              referenceLines={[{ y: 50, label: '50% Parity', color: '#94a3b8', strokeDasharray: '6 3' }]}
              formatTooltip={(v) => v != null ? `${v.toFixed(1)}%` : 'N/A'}
            />
          </div>
        );

      case 'ranking':
        if (selectedInstitutions.length === 0) {
          return renderEmptyInstitutions();
        }
        if (rankingChartData.length === 0) {
          return renderEmptyInstitutions('No ranking data available');
        }
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              <Trophy className="w-4 h-4" />
              <span>Rank #1 = highest intake. Lower position on chart = better rank.</span>
            </div>
            <LineChart
              data={rankingChartData}
              xAxisKey="year"
              series={rankingSeries}
              xAxisLabel="Year"
              yAxisLabel="Rank"
              height={400}
              formatTooltip={(v) => v != null ? `#${v}` : 'N/A'}
              formatYAxis={(v) => `#${v}`}
            />
          </div>
        );

      case 'distribution':
        if (selectedInstitutions.length === 0) {
          return renderEmptyInstitutions();
        }
        if (distributionChartData.length === 0) {
          return renderEmptyInstitutions('No distribution data available');
        }
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
              <Activity className="w-4 h-4" />
              <span>Showing median and mean intake per institution across all years in range</span>
            </div>
            <BarChart
              data={distributionChartData}
              xAxisKey="institution"
              series={distributionBarSeries}
              xAxisLabel="Institution"
              yAxisLabel="Intake"
              height={400}
              showLabels
              formatTooltip={(v) => formatNumber(v)}
            />
            {/* Range & variability sub-chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {distributionChartData.map((d: any) => (
                <div key={d.institutionKey} className="border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {d.institution}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Range</span>
                      <span className="font-medium">{formatNumber(d.min)} – {formatNumber(d.max)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">IQR (Q1–Q3)</span>
                      <span className="font-medium">{formatNumber(d.q1)} – {formatNumber(d.q3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Std Dev</span>
                      <span className="font-medium">{formatNumber(d.stdDev)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Years of Data</span>
                      <span className="font-medium">{d.count}</span>
                    </div>
                    {/* Visual range bar */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="absolute h-full bg-blue-100 rounded-full transition-all duration-500"
                          style={{
                            left: `${((d.q1 - d.min) / (d.max - d.min)) * 100}%`,
                            width: `${((d.q3 - d.q1) / (d.max - d.min)) * 100}%`,
                          }}
                        />
                        <div
                          className="absolute h-full w-0.5 bg-blue-600 z-10"
                          style={{ left: `${((d.median - d.min) / (d.max - d.min)) * 100}%` }}
                          title={`Median: ${formatNumber(d.median)}`}
                        />
                        <div
                          className="absolute h-full w-0.5 bg-green-600 z-10"
                          style={{ left: `${((d.mean - d.min) / (d.max - d.min)) * 100}%` }}
                          title={`Mean: ${formatNumber(d.mean)}`}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-400">{formatNumber(d.min)}</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <span className="w-2 h-0.5 bg-blue-600 inline-block" /> Median
                          </span>
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <span className="w-2 h-0.5 bg-green-600 inline-block" /> Mean
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{formatNumber(d.max)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER SUMMARY CARDS
  // ============================================================================
  const renderSummaryCards = () => {
    const cards: { label: string; value: string | number }[] = [];

    switch (analysisMode) {
      case 'trend':
        cards.push(
          { label: 'Years Analyzed', value: `${yearFrom}-${yearTo}` },
          { label: 'Institutions', value: (summaryStats as any)?.institutions || 0 },
          { label: 'Data Points', value: (summaryStats as any)?.years || 0 },
          { label: 'Forecast', value: showForecast ? `${FORECAST_YEARS} years` : 'Disabled' },
        );
        break;
      case 'comparison':
        cards.push(
          { label: 'Institutions', value: (summaryStats as any)?.institutions || 0 },
          { label: 'Total Intake', value: formatNumber((summaryStats as any)?.total) },
          { label: 'Gender Filter', value: sex === 'MF' ? 'All' : sex },
          { label: 'Chart Type', value: comparisonChartType },
        );
        break;
      case 'growth':
        cards.push(
          { label: 'Years Analyzed', value: `${yearFrom}-${yearTo}` },
          { label: 'Institutions', value: (summaryStats as any)?.institutions || 0 },
          { label: 'Data Points', value: (summaryStats as any)?.years || 0 },
          { label: 'Forecast', value: showForecast ? `${FORECAST_YEARS} years` : 'Disabled' },
        );
        break;
      case 'gender':
        cards.push(
          { label: 'Years Analyzed', value: `${yearFrom}-${yearTo}` },
          { label: 'Total Male', value: formatNumber((summaryStats as any)?.totalMale) },
          { label: 'Total Female', value: formatNumber((summaryStats as any)?.totalFemale) },
          { label: 'Forecast', value: showForecast ? `${FORECAST_YEARS} years` : 'Disabled' },
        );
        break;
      case 'gender_ratio':
        cards.push(
          { label: 'Years Analyzed', value: `${yearFrom}-${yearTo}` },
          { label: 'Latest Female %', value: `${(summaryStats as any)?.latestFemale?.toFixed(1) ?? 0}%` },
          { label: 'Earliest Female %', value: `${(summaryStats as any)?.earliestFemale?.toFixed(1) ?? 0}%` },
          { label: 'Data Points', value: (summaryStats as any)?.years || 0 },
        );
        break;
      case 'ranking':
        cards.push(
          { label: 'Years Analyzed', value: `${yearFrom}-${yearTo}` },
          { label: 'Institutions', value: (summaryStats as any)?.institutions || 0 },
          { label: 'Data Points', value: (summaryStats as any)?.years || 0 },
          { label: 'Gender Filter', value: sex === 'MF' ? 'All' : sex },
        );
        break;
      case 'distribution':
        cards.push(
          { label: 'Years Analyzed', value: `${yearFrom}-${yearTo}` },
          { label: 'Institutions', value: (summaryStats as any)?.institutions || 0 },
          { label: 'Avg Median Intake', value: formatNumber((summaryStats as any)?.avgMedian) },
          { label: 'Gender Filter', value: sex === 'MF' ? 'All' : sex },
        );
        break;
    }

    return cards.map((card, index) => {
      const ACCENT_COLORS = [
        'from-blue-500 to-blue-400',
        'from-emerald-500 to-emerald-400',
        'from-amber-500 to-amber-400',
        'from-violet-500 to-violet-400',
      ];
      return (
        <Card key={index} variant="bordered" padding="sm" className="relative overflow-hidden group hover:shadow-md transition-all duration-200">
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${ACCENT_COLORS[index % ACCENT_COLORS.length]}`} />
          <div className="text-center pt-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        </Card>
      );
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
        <p className="text-gray-600">Loading intake data from API...</p>
        <p className="text-sm text-gray-400">Submitting analysis jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-900 font-medium">Error Loading Data</p>
        <p className="text-gray-600 text-center max-w-md">{error}</p>
        <Button
          variant="primary"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={fetchInitialData}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Intake by Institutions Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Analyze student intake trends across Singapore's educational institutions
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Data powered by DAaaS API
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={fetchInitialData}
            disabled={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Analysis Mode — grouped by analytics category */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Analysis Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {ANALYSIS_CATEGORIES.map((cat) => (
                  <div key={cat.category}>
                    {/* Category header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-400">{cat.icon}</span>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cat.category}</h3>
                    </div>
                    {/* Modes within category */}
                    <div className="flex flex-col gap-1.5 ml-1 border-l-2 border-gray-100 pl-3">
                      {cat.modes.map((mode) => (
                        <label 
                          key={mode.mode}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            analysisMode === mode.mode 
                              ? 'border-primary-500 bg-primary-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="analysisMode"
                            checked={analysisMode === mode.mode}
                            onChange={() => setAnalysisMode(mode.mode)}
                            className="w-4 h-4 text-primary-600"
                          />
                          <div className={`${analysisMode === mode.mode ? 'text-primary-600' : 'text-gray-500'}`}>
                            {mode.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm block">{mode.label}</span>
                            <span className="text-xs text-gray-500 truncate block">{mode.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Year Range */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Year Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">From</label>
                  <select
                    value={yearFrom}
                    onChange={(e) => setYearFrom(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {generateYearRange(minYear, yearTo).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">To</label>
                  <select
                    value={yearTo}
                    onChange={(e) => setYearTo(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {generateYearRange(yearFrom, maxYear).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistical Projections — Forecast / Trend Extrapolation */}
          {needsForecastOption && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Statistical Projections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">
                  Trend extrapolation using Holt's Double Exponential Smoothing
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showForecast}
                    onChange={(e) => setShowForecast(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 block">Enable {FORECAST_YEARS}-Year Forecast</span>
                    <span className="text-xs text-gray-500">
                      Projects future values as dashed lines on chart
                    </span>
                  </div>
                </label>
              </CardContent>
            </Card>
          )}

          {/* Sex Filter */}
          {needsGenderFilter && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Gender Filter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {(['MF', 'F', 'M'] as Sex[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSexChange(option)}
                      disabled={isRefreshing}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sex === option
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {option === 'MF' ? 'All' : option === 'F' ? 'Female' : 'Male'}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Institution Selector */}
          {needsInstitutionFilter && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Institutions</CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                <InstitutionCheckboxGroup
                  selectedInstitutions={selectedInstitutions}
                  onToggle={handleToggleInstitution}
                  onToggleGroup={handleToggleGroup}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Visualization Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Summary Stats */}
          {summaryStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {renderSummaryCards()}
            </div>
          )}

          {/* Chart */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {ANALYSIS_MODES.find(m => m.mode === analysisMode)?.icon}
                {ANALYSIS_MODES.find(m => m.mode === analysisMode)?.label}
                {analysisMode === 'trend' && showForecast
                  ? ` (${yearFrom} - ${maxYear + FORECAST_YEARS})`
                  : ` (${yearFrom} - ${yearTo})`
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart()}
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card variant="bordered" padding="none">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Raw Data</h2>
              <span className="text-sm text-gray-500">
                {tableData.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table
                columns={tableColumns}
                data={tableData}
                keyExtractor={(row, index) => {
                  if ('year' in row) return `${row.year}-${index}`;
                  if ('institutionKey' in row) return row.institutionKey;
                  return String(index);
                }}
                compact
                emptyMessage="No data available for the selected filters"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IntakeAnalytics;
