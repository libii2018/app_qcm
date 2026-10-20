import { useState, useMemo } from 'react';
import { useStats } from '../../hooks/useStats';
import { QuizStats } from '@qcm/shared';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Label 
} from 'recharts';
import { cn } from '../../utils/cn';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#A4DE6C', '#D0ED57', '#FF6B6B'];

const difficultyLabels: Record<number, string> = {
  1: 'Facile',
  2: 'Moyen',
  3: 'Difficile',
  4: 'Expert',
  5: 'Maître'
};

export function Stats() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Calculate dates
  const now = new Date();
  const fromMap = {
    '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    'all': new Date(0)
  };
  const toMap = {
    '7d': now,
    '30d': now,
    '90d': now,
    'all': now
  };

  const { data, isLoading, error } = useStats({
    from: fromMap[period].toISOString(),
    to: toMap[period].toISOString(),
    subject: subjectFilter || undefined,
    tag: tagFilter || undefined
  });

  // Calculate derived stats
  const stats = useMemo(() => {
    if (!data) return null;

    return {
      totalAnswers: data.totalAnswers,
      correctAnswers: data.correctAnswers,
      successRate: data.successRate,
      bySubject: data.bySubject || {},
      byTag: data.byTag || {},
      byDifficulty: data.byDifficulty || {},
      dailyStats: data.dailyStats || [],
      mostFailed: data.mostFailedQuestions || [],
      reviewDistribution: data.reviewDistribution || { new: 0, learning: 0, mastered: 0 },
      streak: data.streak || 0,
      forecast: data.forecast || []
    };
  }, [data]);

  // Prepare chart data
  const successRateData = useMemo(() => {
    if (!stats?.dailyStats) return [];
    return stats.dailyStats.map((day) => ({
      date: new Date(day.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      'Taux de réussite': Math.round(day.successRate * 100),
      'Réponses': day.totalAnswers
    }));
  }, [stats]);

  const subjectData = useMemo(() => {
    if (!stats?.bySubject) return [];
    return Object.entries(stats.bySubject).map(([subject, data]) => ({
      subject,
      'Taux de réussite': Math.round(data.successRate * 100),
      'Total': data.totalAnswers
    }));
  }, [stats]);

  const tagData = useMemo(() => {
    if (!stats?.byTag) return [];
    return Object.entries(stats.byTag).map(([tag, data]) => ({
      tag,
      'Taux de réussite': Math.round(data.successRate * 100),
      'Total': data.totalAnswers
    }));
  }, [stats]);

  const difficultyData = useMemo(() => {
    if (!stats?.byDifficulty) return [];
    return Object.entries(stats.byDifficulty).map(([difficulty, data]) => ({
      difficulty: difficultyLabels[parseInt(difficulty)] || difficulty,
      'Taux de réussite': Math.round(data.successRate * 100),
      'Total': data.totalAnswers
    }));
  }, [stats]);

  const reviewDistributionData = useMemo(() => {
    if (!stats?.reviewDistribution) return [];
    return [
      { name: 'Nouveaux', value: stats.reviewDistribution.new, color: COLORS[4] },
      { name: 'Apprentissage', value: stats.reviewDistribution.learning, color: COLORS[2] },
      { name: 'Maîtrisés', value: stats.reviewDistribution.mastered, color: COLORS[1] }
    ];
  }, [stats]);

  const forecastData = useMemo(() => {
    if (!stats?.forecast) return [];
    return stats.forecast.map((day) => ({
      date: new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' }),
      'Questions à réviser': day.count
    }));
  }, [stats]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Erreur: {error.message}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!stats || stats.totalAnswers === 0) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Aucune statistique disponible
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Commencez par faire un quiz pour voir vos statistiques
          </p>
          <Button onClick={() => (window.location.href = '/today')}>
            Commencer une session
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Statistiques</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {stats.totalAnswers} réponses enregistrées
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => (window.location.href = '/today')}>
              Session du jour
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Période"
              value={period}
              onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d' | 'all')}
              options={[
                { value: '7d', label: '7 derniers jours' },
                { value: '30d', label: '30 derniers jours' },
                { value: '90d', label: '90 derniers jours' },
                { value: 'all', label: 'Tout' }
              ]}
            />
            <Select
              label="Matière"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              options={[...new Set(Object.keys(stats.bySubject || {}))].map(s => ({ value: s, label: s }))}
              placeholder="Toutes les matières"
            />
            <Select
              label="Tag"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              options={[...new Set(Object.keys(stats.byTag || {}))].map(t => ({ value: t, label: t }))}
              placeholder="Tous les tags"
            />
            <Button variant="outline" onClick={() => {
              setSubjectFilter('');
              setTagFilter('');
            }}>
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Taux de réussite</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Math.round(stats.successRate * 100)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Temps moyen</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatTime(stats.totalAnswers > 0 ? (stats.dailyStats?.reduce((a, b) => a + b.averageTime, 0) || 0) / stats.dailyStats?.length : 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Streak</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.streak} jours
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Success Rate Over Time */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Évolution du taux de réussite</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={successRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                <Tooltip 
                  labelStyle={{ color: '#374151' }} 
                  itemStyle={{ color: '#111827' }}
                  formatter={(value) => [`${value}%`, 'Taux de réussite']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Taux de réussite" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                  activeDot={{ r: 8, fill: '#3b82f6' }}
                />
                <ReferenceLine y={70} stroke="#8884d8" strokeDasharray="5 5" label={{ value: '70%', fill: '#8884d8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Review Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Répartition des questions</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={reviewDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${Math.round(percent * 100)}%`}
                >
                  {reviewDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* By Subject */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Par matière</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                <YAxis dataKey="subject" type="category" width={120} tick={{ fill: '#9ca3af' }} />
                <Tooltip />
                <Bar dataKey="Taux de réussite" fill="#10b981" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Prévision des révisions</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} />
                <YAxis tick={{ fill: '#9ca3af' }} />
                <Tooltip />
                <Bar dataKey="Questions à réviser" fill="#8b5cf6" barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Failed Questions */}
        {stats.mostFailed.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Questions les plus ratées</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Question</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Quiz</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Taux d'erreur</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tentatives</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.mostFailed.map((q, index) => (
                    <tr key={q.questionId} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {q.questionText.length > 50 ? q.questionText.substring(0, 50) + '...' : q.questionText}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {q.quizTitle}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {Math.round(q.failureRate * 100)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {q.totalAttempts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
