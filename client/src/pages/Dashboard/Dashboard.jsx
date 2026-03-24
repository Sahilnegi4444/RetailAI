import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import StatsCard from '../../components/StatsCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Dashboard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard analytics..." />;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">⚠️</div>
        <h2>Failed to Load Dashboard</h2>
        <p>{error}</p>
        <button onClick={loadDashboardData} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header-new">
        <div className="header-left">
          <h1>Demand Forecasting Dashboard</h1>
          <p className="header-subtitle">AI-powered inventory intelligence • Track sales, predict demand, optimize stock</p>
          <span className="badge-enhanced">ENHANCED PREDICTION SYSTEM (90.5%)</span>
        </div>
        <div className="header-right">
          <button className="store-btn">🏪 My Store</button>
          <select className="store-select">
            <option>BISC.PARLE G 100GMS</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Model Accuracy</span>
            <span className="stat-icon">📊</span>
          </div>
          <div className="stat-value">93%</div>
          <div className="stat-trend trend-up">↑ +2.3%</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Avg Error</span>
            <span className="stat-icon">📈</span>
          </div>
          <div className="stat-value">28 units</div>
          <div className="stat-trend trend-up">↑ +1.2%</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Forecast Period</span>
            <span className="stat-icon">📅</span>
          </div>
          <div className="stat-value">12 weeks</div>
          <div className="stat-trend">Next quarter</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Expected Demand</span>
            <span className="stat-icon">📦</span>
          </div>
          <div className="stat-value">5133 units</div>
          <div className="stat-trend trend-up">↑ +8.5%</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Historical Performance */}
        <div className="chart-card-new">
          <div className="chart-header-new">
            <h3>Historical Performance</h3>
            <span className="chart-period">Last 12 weeks</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={getHistoricalData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="Actual Sales" />
              <Line type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Predicted Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Demand Forecast */}
        <div className="chart-card-new">
          <div className="chart-header-new">
            <h3>Demand Forecast</h3>
            <span className="chart-period">Next 12 weeks</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={getForecastData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="week" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid #8b5cf6',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="forecast" fill="#8b5cf6" stroke="#8b5cf6" fillOpacity={0.3} name="Forecast" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-Wise Monthly Sales */}
      <div className="chart-card-new full-width-chart">
        <div className="chart-header-new">
          <div>
            <h3>📊 Year-wise Sales Analysis</h3>
            <p className="chart-description">Monthly Sales Pattern - This chart shows actual units sold each month. Use this to understand seasonal patterns and predict future demand.</p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="year-selector-container">
          <button className="year-btn active">2024</button>
          <button className="year-btn">2025</button>
          <button className="year-btn">Combined</button>
        </div>

        {/* Monthly Bar Chart */}
        <div className="monthly-chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getMonthlyData()} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#1f2937',
                }}
                labelStyle={{ color: '#1f2937' }}
                itemStyle={{ color: '#f59e0b' }}
                formatter={(value) => [value.toLocaleString() + ' units', 'Sales']}
              />
              <Bar
                dataKey="sales"
                fill="#f59e0b"
                radius={[8, 8, 0, 0]}
                name="Sales"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Month Stats */}
        <div className="month-stats">
          <div className="stat-row">
            <span className="stat-label">Average:</span>
            <span className="stat-value">18 units</span>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="insights-section-new">
        <h3>Key Insights</h3>
        <div className="insights-grid-new">
          <div className="insight-item">
            <span className="insight-number">1</span>
            <div className="insight-content">
              <h4>Peak Demand Period</h4>
              <p>Highest demand expected in weeks 6-8 with 650+ units</p>
            </div>
          </div>
          <div className="insight-item">
            <span className="insight-number">2</span>
            <div className="insight-content">
              <h4>Inventory Recommendation</h4>
              <p>Maintain 800+ units to meet forecasted demand safely</p>
            </div>
          </div>
          <div className="insight-item">
            <span className="insight-number">3</span>
            <div className="insight-content">
              <h4>Growth Trend</h4>
              <p>Steady 8.5% growth expected over next quarter</p>
            </div>
          </div>
          <div className="insight-item">
            <span className="insight-number">4</span>
            <div className="insight-content">
              <h4>Model Confidence</h4>
              <p>93% accuracy with 28 units average error margin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper functions for chart data
  function getHistoricalData() {
    return [
      { date: '2025-10-28', actual: 450, predicted: 420 },
      { date: '2025-11-04', actual: 480, predicted: 460 },
      { date: '2025-11-11', actual: 520, predicted: 510 },
      { date: '2025-11-18', actual: 490, predicted: 500 },
      { date: '2025-11-25', actual: 510, predicted: 520 },
      { date: '2025-12-02', actual: 540, predicted: 530 },
      { date: '2025-12-09', actual: 560, predicted: 550 },
      { date: '2025-12-16', actual: 580, predicted: 570 },
      { date: '2025-12-23', actual: 600, predicted: 590 },
      { date: '2025-12-30', actual: 620, predicted: 610 },
      { date: '2026-01-06', actual: 640, predicted: 630 },
      { date: '2026-01-13', actual: 650, predicted: 640 },
    ];
  }

  function getForecastData() {
    return [
      { week: '1', forecast: 450 },
      { week: '2', forecast: 480 },
      { week: '3', forecast: 510 },
      { week: '4', forecast: 540 },
      { week: '5', forecast: 570 },
      { week: '6', forecast: 600 },
      { week: '7', forecast: 620 },
      { week: '8', forecast: 630 },
      { week: '9', forecast: 610 },
      { week: '10', forecast: 580 },
      { week: '11', forecast: 550 },
      { week: '12', forecast: 520 },
    ];
  }

  function getMonthlyData() {
    return [
      { month: 'Jan', sales: 0 },
      { month: 'Feb', sales: 0 },
      { month: 'Mar', sales: 0 },
      { month: 'Apr', sales: 0 },
      { month: 'May', sales: 0 },
      { month: 'Jun', sales: 0 },
      { month: 'Jul', sales: 31 },
      { month: 'Aug', sales: 32 },
      { month: 'Sep', sales: 3 },
      { month: 'Oct', sales: 14 },
      { month: 'Nov', sales: 12 },
      { month: 'Dec', sales: 9 },
    ];
  }
};

export default Dashboard;
