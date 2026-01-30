import React, { useState, useMemo } from 'react';
import {
  Filter,
  TrendingUp,
  BarChart3 as BarChartIcon,
  Download,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, Column } from '../components/ui';
import { LineChart, BarChart, LineChartSeries, BarChartSeries } from '../components/charts';
import { IntakeDataRow, InstitutionKey, Sex, AnalysisMode } from '../types';
import {
  INSTITUTION_GROUPS,
  INSTITUTION_LABELS,
  getInstitutionLabel,
  isValidNumber,
  generateYearRange,
  formatNumber,
} from '../utils';

// ============================================================================
// MOCK DATA - Matches the IntakebyInstitutions dataset structure
// ============================================================================
const MOCK_DATA: IntakeDataRow[] = [
  // Sample data from 1982-2023 with MF (combined) data
  { year: 1982, sex: 'MF', nus: 3127, ntu: null, smu: null, sit: null, sutd: null, suss: null, singapore_polytechnic: 3637, ngee_ann_polytechnic: null, temasek_polytechnic: null, nanyang_polytechnic: null, republic_polytechnic: null, nie: 392, ite: null, lasalle_diploma: null, lasalle_degree: null, nafa_diploma: null, nafa_degree: null },
  { year: 1985, sex: 'MF', nus: 3608, ntu: 1020, smu: null, sit: null, sutd: null, suss: null, singapore_polytechnic: 4108, ngee_ann_polytechnic: 2150, temasek_polytechnic: null, nanyang_polytechnic: null, republic_polytechnic: null, nie: 470, ite: null, lasalle_diploma: null, lasalle_degree: null, nafa_diploma: null, nafa_degree: null },
  { year: 1990, sex: 'MF', nus: 4805, ntu: 2410, smu: null, sit: null, sutd: null, suss: null, singapore_polytechnic: 4782, ngee_ann_polytechnic: 3650, temasek_polytechnic: 1850, nanyang_polytechnic: null, republic_polytechnic: null, nie: 558, ite: 8500, lasalle_diploma: null, lasalle_degree: null, nafa_diploma: null, nafa_degree: null },
  { year: 1995, sex: 'MF', nus: 5896, ntu: 3890, smu: null, sit: null, sutd: null, suss: null, singapore_polytechnic: 5420, ngee_ann_polytechnic: 4850, temasek_polytechnic: 3250, nanyang_polytechnic: 2850, republic_polytechnic: null, nie: 685, ite: 12500, lasalle_diploma: 420, lasalle_degree: null, nafa_diploma: 380, nafa_degree: null },
  { year: 2000, sex: 'MF', nus: 6542, ntu: 5120, smu: 320, sit: null, sutd: null, suss: null, singapore_polytechnic: 6120, ngee_ann_polytechnic: 5680, temasek_polytechnic: 4850, nanyang_polytechnic: 4250, republic_polytechnic: 1850, nie: 752, ite: 16800, lasalle_diploma: 680, lasalle_degree: null, nafa_diploma: 520, nafa_degree: null },
  { year: 2005, sex: 'MF', nus: 7125, ntu: 5890, smu: 1250, sit: null, sutd: null, suss: 850, singapore_polytechnic: 7250, ngee_ann_polytechnic: 6820, temasek_polytechnic: 5980, nanyang_polytechnic: 5450, republic_polytechnic: 3850, nie: 825, ite: 21500, lasalle_diploma: 920, lasalle_degree: 180, nafa_diploma: 680, nafa_degree: 120 },
  { year: 2010, sex: 'MF', nus: 7856, ntu: 6520, smu: 2150, sit: 1850, sutd: 340, suss: 1250, singapore_polytechnic: 8150, ngee_ann_polytechnic: 7580, temasek_polytechnic: 6850, nanyang_polytechnic: 6250, republic_polytechnic: 5120, nie: 892, ite: 24800, lasalle_diploma: 1150, lasalle_degree: 380, nafa_diploma: 850, nafa_degree: 280 },
  { year: 2015, sex: 'MF', nus: 8420, ntu: 7150, smu: 2680, sit: 3250, sutd: 520, suss: 1850, singapore_polytechnic: 8520, ngee_ann_polytechnic: 7920, temasek_polytechnic: 7250, nanyang_polytechnic: 6850, republic_polytechnic: 5850, nie: 945, ite: 26500, lasalle_diploma: 1380, lasalle_degree: 520, nafa_diploma: 980, nafa_degree: 420 },
  { year: 2018, sex: 'MF', nus: 8850, ntu: 7580, smu: 2950, sit: 4120, sutd: 620, suss: 2250, singapore_polytechnic: 8720, ngee_ann_polytechnic: 8150, temasek_polytechnic: 7450, nanyang_polytechnic: 7050, republic_polytechnic: 6120, nie: 985, ite: 27200, lasalle_diploma: 1520, lasalle_degree: 680, nafa_diploma: 1080, nafa_degree: 520 },
  { year: 2019, sex: 'MF', nus: 9050, ntu: 7820, smu: 3050, sit: 4580, sutd: 680, suss: 2450, singapore_polytechnic: 8850, ngee_ann_polytechnic: 8280, temasek_polytechnic: 7580, nanyang_polytechnic: 7180, republic_polytechnic: 6280, nie: 1020, ite: 27500, lasalle_diploma: 1580, lasalle_degree: 720, nafa_diploma: 1120, nafa_degree: 580 },
  { year: 2020, sex: 'MF', nus: 9250, ntu: 8050, smu: 3150, sit: 5020, sutd: 720, suss: 2680, singapore_polytechnic: 8920, ngee_ann_polytechnic: 8350, temasek_polytechnic: 7680, nanyang_polytechnic: 7280, republic_polytechnic: 6380, nie: 1050, ite: 27800, lasalle_diploma: 1620, lasalle_degree: 780, nafa_diploma: 1150, nafa_degree: 620 },
  { year: 2021, sex: 'MF', nus: 9480, ntu: 8280, smu: 3280, sit: 5450, sutd: 780, suss: 2920, singapore_polytechnic: 9050, ngee_ann_polytechnic: 8450, temasek_polytechnic: 7780, nanyang_polytechnic: 7380, republic_polytechnic: 6480, nie: 1080, ite: 28100, lasalle_diploma: 1680, lasalle_degree: 850, nafa_diploma: 1180, nafa_degree: 680 },
  { year: 2022, sex: 'MF', nus: 9720, ntu: 8520, smu: 3420, sit: 5920, sutd: 850, suss: 3180, singapore_polytechnic: 9180, ngee_ann_polytechnic: 8550, temasek_polytechnic: 7880, nanyang_polytechnic: 7480, republic_polytechnic: 6580, nie: 1120, ite: 28400, lasalle_diploma: 1750, lasalle_degree: 920, nafa_diploma: 1220, nafa_degree: 750 },
  { year: 2023, sex: 'MF', nus: 9980, ntu: 8780, smu: 3580, sit: 6420, sutd: 920, suss: 3450, singapore_polytechnic: 9320, ngee_ann_polytechnic: 8680, temasek_polytechnic: 7980, nanyang_polytechnic: 7580, republic_polytechnic: 6680, nie: 1150, ite: 28700, lasalle_diploma: 1820, lasalle_degree: 980, nafa_diploma: 1280, nafa_degree: 820 },
  // Female data samples
  { year: 2020, sex: 'F', nus: 4850, ntu: 4120, smu: 1680, sit: 2450, sutd: 280, suss: 1450, singapore_polytechnic: 4280, ngee_ann_polytechnic: 4180, temasek_polytechnic: 3920, nanyang_polytechnic: 3650, republic_polytechnic: 3180, nie: 680, ite: 11200, lasalle_diploma: 1020, lasalle_degree: 520, nafa_diploma: 780, nafa_degree: 420 },
  { year: 2021, sex: 'F', nus: 4980, ntu: 4250, smu: 1750, sit: 2680, sutd: 310, suss: 1580, singapore_polytechnic: 4350, ngee_ann_polytechnic: 4250, temasek_polytechnic: 3980, nanyang_polytechnic: 3720, republic_polytechnic: 3250, nie: 710, ite: 11400, lasalle_diploma: 1080, lasalle_degree: 580, nafa_diploma: 820, nafa_degree: 480 },
  { year: 2022, sex: 'F', nus: 5120, ntu: 4380, smu: 1820, sit: 2920, sutd: 340, suss: 1720, singapore_polytechnic: 4420, ngee_ann_polytechnic: 4320, temasek_polytechnic: 4050, nanyang_polytechnic: 3780, republic_polytechnic: 3320, nie: 740, ite: 11600, lasalle_diploma: 1150, lasalle_degree: 650, nafa_diploma: 870, nafa_degree: 550 },
  { year: 2023, sex: 'F', nus: 5280, ntu: 4520, smu: 1920, sit: 3180, sutd: 380, suss: 1880, singapore_polytechnic: 4520, ngee_ann_polytechnic: 4420, temasek_polytechnic: 4120, nanyang_polytechnic: 3850, republic_polytechnic: 3420, nie: 780, ite: 11800, lasalle_diploma: 1220, lasalle_degree: 720, nafa_diploma: 920, nafa_degree: 620 },
  // Male data samples
  { year: 2020, sex: 'M', nus: 4400, ntu: 3930, smu: 1470, sit: 2570, sutd: 440, suss: 1230, singapore_polytechnic: 4640, ngee_ann_polytechnic: 4170, temasek_polytechnic: 3760, nanyang_polytechnic: 3630, republic_polytechnic: 3200, nie: 370, ite: 16600, lasalle_diploma: 600, lasalle_degree: 260, nafa_diploma: 370, nafa_degree: 200 },
  { year: 2021, sex: 'M', nus: 4500, ntu: 4030, smu: 1530, sit: 2770, sutd: 470, suss: 1340, singapore_polytechnic: 4700, ngee_ann_polytechnic: 4200, temasek_polytechnic: 3800, nanyang_polytechnic: 3660, republic_polytechnic: 3230, nie: 370, ite: 16700, lasalle_diploma: 600, lasalle_degree: 270, nafa_diploma: 360, nafa_degree: 200 },
  { year: 2022, sex: 'M', nus: 4600, ntu: 4140, smu: 1600, sit: 3000, sutd: 510, suss: 1460, singapore_polytechnic: 4760, ngee_ann_polytechnic: 4230, temasek_polytechnic: 3830, nanyang_polytechnic: 3700, republic_polytechnic: 3260, nie: 380, ite: 16800, lasalle_diploma: 600, lasalle_degree: 270, nafa_diploma: 350, nafa_degree: 200 },
  { year: 2023, sex: 'M', nus: 4700, ntu: 4260, smu: 1660, sit: 3240, sutd: 540, suss: 1570, singapore_polytechnic: 4800, ngee_ann_polytechnic: 4260, temasek_polytechnic: 3860, nanyang_polytechnic: 3730, republic_polytechnic: 3260, nie: 370, ite: 16900, lasalle_diploma: 600, lasalle_degree: 260, nafa_diploma: 360, nafa_degree: 200 },
];

// Available years in the dataset
const MIN_YEAR = 1982;
const MAX_YEAR = 2023;

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const IntakeAnalytics: React.FC = () => {
  // Filter State
  const [selectedInstitutions, setSelectedInstitutions] = useState<InstitutionKey[]>([
    'nus',
    'ntu',
    'smu',
    'sit',
  ]);
  const [yearFrom, setYearFrom] = useState(2015);
  const [yearTo, setYearTo] = useState(2023);
  const [sex, setSex] = useState<Sex>('MF');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('trend');
  const [comparisonYear, setComparisonYear] = useState(2023);

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
    setYearTo(2023);
    setSex('MF');
    setAnalysisMode('trend');
    setComparisonYear(2023);
  };

  // Filtered Data
  const filteredData = useMemo(() => {
    return MOCK_DATA.filter((row) => {
      if (row.sex !== sex) return false;
      if (analysisMode === 'trend') {
        return row.year >= yearFrom && row.year <= yearTo;
      } else {
        return row.year === comparisonYear;
      }
    }).sort((a, b) => a.year - b.year);
  }, [sex, yearFrom, yearTo, analysisMode, comparisonYear]);

  // Chart Data for Trend Mode
  const trendChartData = useMemo(() => {
    if (analysisMode !== 'trend') return [];
    return filteredData.map((row) => {
      const dataPoint: Record<string, any> = { year: row.year };
      selectedInstitutions.forEach((inst) => {
        const value = row[inst];
        dataPoint[inst] = isValidNumber(value) ? value : null;
      });
      return dataPoint;
    });
  }, [filteredData, selectedInstitutions, analysisMode]);

  // Chart Data for Comparison Mode
  const comparisonChartData = useMemo(() => {
    if (analysisMode !== 'comparison' || filteredData.length === 0) return [];
    const row = filteredData[0];
    return selectedInstitutions
      .map((inst) => ({
        institution: getInstitutionLabel(inst),
        institutionKey: inst,
        intake: isValidNumber(row[inst]) ? row[inst] : 0,
      }))
      .filter((d) => d.intake > 0)
      .sort((a, b) => (b.intake ?? 0) - (a.intake ?? 0));
  }, [filteredData, selectedInstitutions, analysisMode]);

  // Line Chart Series
  const lineSeries: LineChartSeries[] = useMemo(() => {
    return selectedInstitutions.map((inst) => ({
      dataKey: inst,
      name: getInstitutionLabel(inst),
    }));
  }, [selectedInstitutions]);

  // Bar Chart Series
  const barSeries: BarChartSeries[] = [
    { dataKey: 'intake', name: 'Intake' },
  ];

  // Table Columns
  const tableColumns: Column<Record<string, any>>[] = useMemo(() => {
    if (analysisMode === 'trend') {
      return [
        { key: 'year', header: 'Year', sortable: true },
        ...selectedInstitutions.map((inst) => ({
          key: inst,
          header: getInstitutionLabel(inst),
          render: (value: number | null) => formatNumber(value),
        })),
      ];
    } else {
      return [
        { key: 'institution', header: 'Institution' },
        {
          key: 'intake',
          header: 'Intake',
          render: (value: number) => formatNumber(value),
        },
      ];
    }
  }, [analysisMode, selectedInstitutions]);

  // Table Data
  const tableData = analysisMode === 'trend' ? trendChartData : comparisonChartData;

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (analysisMode === 'trend' && trendChartData.length > 0) {
      const totals = selectedInstitutions.map((inst) => {
        const values = trendChartData
          .map((d) => d[inst])
          .filter(isValidNumber);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = values.length > 0 ? sum / values.length : 0;
        return { inst, sum, avg, count: values.length };
      });
      const grandTotal = totals.reduce((a, t) => a + t.sum, 0);
      return { totals, grandTotal };
    }
    if (analysisMode === 'comparison' && comparisonChartData.length > 0) {
      const total = comparisonChartData.reduce((a, d) => a + (d.intake ?? 0), 0);
      return { total };
    }
    return null;
  }, [analysisMode, trendChartData, comparisonChartData, selectedInstitutions]);

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
        </div>
        <div className="flex items-center gap-3">
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
          {/* Analysis Mode */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Analysis Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="analysisMode"
                    checked={analysisMode === 'trend'}
                    onChange={() => setAnalysisMode('trend')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                  <span className="font-medium">Trend over Time</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="analysisMode"
                    checked={analysisMode === 'comparison'}
                    onChange={() => setAnalysisMode('comparison')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <BarChartIcon className="w-5 h-5 text-gray-500" />
                  <span className="font-medium">Institution Comparison</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Year Range / Year Selection */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>
                {analysisMode === 'trend' ? 'Year Range' : 'Comparison Year'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysisMode === 'trend' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">From</label>
                    <select
                      value={yearFrom}
                      onChange={(e) => setYearFrom(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {generateYearRange(MIN_YEAR, yearTo).map((year) => (
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
                      {generateYearRange(yearFrom, MAX_YEAR).map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <select
                    value={comparisonYear}
                    onChange={(e) => setComparisonYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {generateYearRange(MIN_YEAR, MAX_YEAR).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sex Filter */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Gender Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {(['MF', 'F', 'M'] as Sex[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSex(option)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sex === option
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option === 'MF' ? 'All' : option === 'F' ? 'Female' : 'Male'}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Institution Selector */}
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
        </div>

        {/* Visualization Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Summary Stats */}
          {summaryStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card variant="bordered" padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Selected Institutions</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {selectedInstitutions.length}
                  </p>
                </div>
              </Card>
              <Card variant="bordered" padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    {analysisMode === 'trend' ? 'Years Analyzed' : 'Year'}
                  </p>
                  <p className="text-2xl font-bold text-primary-600">
                    {analysisMode === 'trend'
                      ? `${yearFrom}-${yearTo}`
                      : comparisonYear}
                  </p>
                </div>
              </Card>
              <Card variant="bordered" padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Data Points</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {tableData.length}
                  </p>
                </div>
              </Card>
              <Card variant="bordered" padding="sm">
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    {analysisMode === 'trend' ? 'Grand Total' : 'Total Intake'}
                  </p>
                  <p className="text-2xl font-bold text-primary-600">
                    {formatNumber(
                      analysisMode === 'trend'
                        ? (summaryStats as any).grandTotal
                        : (summaryStats as any).total
                    )}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Chart */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {analysisMode === 'trend' ? (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Intake Trends ({yearFrom} - {yearTo})
                  </>
                ) : (
                  <>
                    <BarChartIcon className="w-5 h-5" />
                    Institution Comparison ({comparisonYear})
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedInstitutions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                  <Info className="w-12 h-12 mb-4" />
                  <p>Select at least one institution to view the chart</p>
                </div>
              ) : analysisMode === 'trend' ? (
                <LineChart
                  data={trendChartData}
                  xAxisKey="year"
                  series={lineSeries}
                  xAxisLabel="Year"
                  yAxisLabel="Student Intake"
                  height={400}
                  formatTooltip={(v) => formatNumber(v)}
                />
              ) : (
                <BarChart
                  data={comparisonChartData}
                  xAxisKey="institution"
                  series={barSeries}
                  xAxisLabel="Institution"
                  yAxisLabel="Student Intake"
                  height={400}
                  useColorPerBar
                  formatTooltip={(v) => formatNumber(v)}
                  layout="vertical"
                />
              )}
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
                keyExtractor={(row, index) =>
                  analysisMode === 'trend'
                    ? `${row.year}-${index}`
                    : row.institutionKey || index
                }
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
