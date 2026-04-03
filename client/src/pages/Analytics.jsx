import React, { useState, useEffect, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Analytics.css";

const Analytics = () => {
  const [selectedItem, setSelectedItem] = useState("");
  const [items, setItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [itemHistory, setItemHistory] = useState(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const baseURL = window.location.port === '5016' 
        ? '/api'  // Docker - use nginx proxy
        : 'http://localhost:8001';  // Local dev - direct to backend
      
      const response = await fetch(`${baseURL}/analytics/database/items`);
      const data = await response.json();
      setItems(data.items || []);
      if (data.items && data.items.length > 0) {
        setSelectedItem(data.items[0].item_name);
      }
    } catch (error) {
      console.error("Failed to load items:", error);
      setError("Failed to load items list");
    }
  };

  const loadAnalytics = async () => {
    if (!selectedItem) return;

    setLoading(true);
    setError(null);
    try {
      const baseURL = window.location.port === '5016' 
        ? '/api'  // Docker - use nginx proxy
        : 'http://localhost:8001';  // Local dev - direct to backend
      
      const [analyticsRes, historyRes] = await Promise.all([
        fetch(`${baseURL}/analytics/item/${encodeURIComponent(selectedItem)}`),
        fetch(`${baseURL}/analytics/database/item/${encodeURIComponent(selectedItem)}`)
      ]);
      
      if (!analyticsRes.ok) throw new Error("Failed to load analytics");
      
      const analyticsData = await analyticsRes.json();
      const historyData = historyRes.ok ? await historyRes.json() : null;
      
      setAnalytics(analyticsData);
      setItemHistory(historyData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setError("Failed to load analytics for this item");
      setAnalytics(null);
      setItemHistory(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItem) {
      loadAnalytics();
    }
  }, [selectedItem]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Prepare yearly trend data
  const yearlyTrendData = useMemo(() => {
    if (!analytics?.yearly_trends) return [];
    return Object.entries(analytics.yearly_trends)
      .map(([year, sales]) => ({
        year: parseInt(year),
        sales: sales
      }))
      .sort((a, b) => a.year - b.year);
  }, [analytics]);

  // Prepare monthly pattern data for selected month
  const monthPatternData = useMemo(() => {
    if (!analytics?.monthly_patterns?.[selectedMonth]) return [];
    return analytics.monthly_patterns[selectedMonth]
      .sort((a, b) => a.year - b.year)
      .map(d => ({
        year: d.year,
        sales: d.sales
      }));
  }, [analytics, selectedMonth]);

  // Prepare seasonal factors data
  const seasonalData = useMemo(() => {
    if (!analytics?.seasonal_factors) return [];
    return Object.entries(analytics.seasonal_factors).map(([month, factor]) => ({
      month: monthNames[parseInt(month) - 1],
      factor: parseFloat(factor.toFixed(2))
    }));
  }, [analytics]);

  // Calculate year-wise statistics from history
  const yearWiseStats = useMemo(() => {
    if (!itemHistory?.history) return {};
    
    const stats = {};
    itemHistory.history.forEach(record => {
      const year = record.year;
      if (!stats[year]) {
        stats[year] = {
          totalSales: 0,
          totalRevenue: 0,
          avgPrice: 0,
          months: new Set(),
        };
      }
      stats[year].totalSales += record.quantity_sold || 0;
      stats[year].totalRevenue += (record.quantity_sold || 0) * (record.price || 0);
      stats[year].months.add(record.month);
    });
    
    // Calculate average price
    Object.keys(stats).forEach(year => {
      const s = stats[year];
      s.avgPrice = s.totalSales > 0 ? s.totalRevenue / s.totalSales : 0;
      s.monthCount = s.months.size;
      delete s.months;
    });
    
    return stats;
  }, [itemHistory]);

  // Get available years dynamically
  const availableYears = useMemo(() => {
    return Object.keys(yearWiseStats).sort();
  }, [yearWiseStats]);

  const getTrendColor = (trend) => {
    switch (trend) {
      case "increasing":
        return "#10b981";
      case "decreasing":
        return "#ef4444";
      default:
        return "#6366f1";
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "increasing":
        return "📈";
      case "decreasing":
        return "📉";
      default:
        return "➡️";
    }
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>📊 Analytics & Trend Analysis</h1>
          <p className="subtitle">
            Deep dive into sales patterns, trends, and seasonal factors with dynamic year-wise insights
          </p>
        </div>
        <button onClick={loadAnalytics} className="refresh-btn" disabled={!selectedItem}>
          🔄 Refresh
        </button>
      </div>

      {/* Item Selection */}
      <div className="item-selector-card">
        <div className="selector-content">
          <label>Select Item:</label>
          <select
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            className="item-select"
          >
            {items.map((item) => (
              <option key={item.item_name} value={item.item_name}>
                {item.item_name} ({item.category})
              </option>
            ))}
          </select>
          <div className="item-info">
            {analytics && (
              <span className="info-badge">
                {availableYears.length} years • {Object.keys(analytics.monthly_patterns || {}).length} months
              </span>
            )}
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner message="Loading analytics..." />}

      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
        </div>
      )}

      {analytics && !loading && (
        <>
          {/* Summary Cards */}
          <div className="analytics-summary">
            <div className="summary-card">
              <div className="card-icon">📈</div>
              <div className="card-content">
                <div className="card-label">Trend Direction</div>
                <div className="card-value" style={{ color: getTrendColor(analytics.trend_direction) }}>
                  {getTrendIcon(analytics.trend_direction)} {analytics.trend_direction.toUpperCase()}
                </div>
                <div className="card-detail">
                  {(analytics.growth_rate * 100).toFixed(1)}% YoY growth
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <div className="card-label">Average Sales</div>
                <div className="card-value">{Math.round(analytics.statistics.avg_sales).toLocaleString()}</div>
                <div className="card-detail">
                  ±{Math.round(analytics.statistics.std_sales).toLocaleString()} std dev
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">📉</div>
              <div className="card-content">
                <div className="card-label">Sales Range</div>
                <div className="card-value">
                  {Math.round(analytics.statistics.min_sales).toLocaleString()} - {Math.round(analytics.statistics.max_sales).toLocaleString()}
                </div>
                <div className="card-detail">
                  CV: {(analytics.statistics.cv * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">🎯</div>
              <div className="card-content">
                <div className="card-label">Data Coverage</div>
                <div className="card-value">{availableYears.length} years</div>
                <div className="card-detail">
                  {Object.values(analytics.monthly_patterns).reduce((sum, arr) => sum + arr.length, 0)} data points
                </div>
              </div>
            </div>
          </div>

          {/* Year-Wise Analysis Section */}
          {availableYears.length > 0 && (
            <div className="chart-card">
              <div className="chart-header">
                <h2>📅 Year-Wise Sales Analysis</h2>
                <span className="chart-badge">{availableYears.length} years tracked</span>
              </div>
              <p className="chart-description">
                Dynamic year-wise breakdown showing sales, revenue, and patterns across all available years
              </p>
              
              <div className="yearwise-bars">
                {availableYears.map(year => {
                  const stats = yearWiseStats[year];
                  const maxSales = Math.max(...Object.values(yearWiseStats).map(s => s.totalSales));
                  const heightPercent = (stats.totalSales / maxSales) * 100;
                  
                  return (
                    <div key={year} className="year-bar-container">
                      <div className="year-bar-wrapper">
                        <div 
                          className="year-bar"
                          style={{ height: `${heightPercent}%` }}
                          title={`${stats.totalSales.toLocaleString()} units`}
                        >
                          <span className="bar-value">{stats.totalSales.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="year-label">{year}</div>
                      <div className="year-details">
                        <div className="detail-row">
                          <span className="detail-label">Revenue:</span>
                          <span className="detail-value">₹{Math.round(stats.totalRevenue).toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Avg Price:</span>
                          <span className="detail-value">₹{stats.avgPrice.toFixed(2)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Months:</span>
                          <span className="detail-value">{stats.monthCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Yearly Trend Chart */}
          <div className="chart-card">
            <h2>📈 Yearly Sales Trend</h2>
            <p className="chart-description">Total sales per year showing growth or decline</p>
            {yearlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={yearlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="year" 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid #3b82f6',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#94a3b8' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", r: 6 }}
                    activeDot={{ r: 8, fill: "#60a5fa" }}
                    name="Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No yearly data available</div>
            )}
          </div>

          {/* Monthly Pattern for Selected Month */}
          <div className="chart-card">
            <h2>📅 Monthly Pattern - {monthNames[selectedMonth - 1]}</h2>
            <div className="month-selector">
              <label>Select Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="month-select"
              >
                {monthNames.map((month, idx) => (
                  <option key={idx} value={idx + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <p className="chart-description">
              Sales for {monthNames[selectedMonth - 1]} across all years
            </p>
            {monthPatternData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthPatternData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="year" 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid #10b981',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="sales" fill="#10b981" radius={[8, 8, 0, 0]} name="Sales" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No data for {monthNames[selectedMonth - 1]}</div>
            )}
          </div>

          {/* Seasonal Factors */}
          <div className="chart-card">
            <h2>🌍 Seasonal Factors</h2>
            <p className="chart-description">
              Seasonal adjustment factors for each month (1.0 = average)
            </p>
            {seasonalData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={seasonalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid #f59e0b',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#f59e0b' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="factor" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Factor" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No seasonal data available</div>
            )}
          </div>

          {/* Insights */}
          <div className="insights-card">
            <h2>💡 Key Insights</h2>
            <div className="insights-grid">
              <div className="insight-item">
                <span className="insight-icon">📊</span>
                <div>
                  <h4>Trend Analysis</h4>
                  <p>
                    Sales are <strong>{analytics.trend_direction}</strong> with an average growth rate of{" "}
                    <strong>{(analytics.growth_rate * 100).toFixed(1)}%</strong> per year.
                  </p>
                </div>
              </div>

              <div className="insight-item">
                <span className="insight-icon">📈</span>
                <div>
                  <h4>Volatility</h4>
                  <p>
                    Coefficient of Variation is <strong>{(analytics.statistics.cv * 100).toFixed(1)}%</strong>.
                    {analytics.statistics.cv < 0.3
                      ? " Sales are relatively stable."
                      : analytics.statistics.cv < 0.6
                      ? " Sales show moderate variation."
                      : " Sales are highly volatile."}
                  </p>
                </div>
              </div>

              <div className="insight-item">
                <span className="insight-icon">🎯</span>
                <div>
                  <h4>Seasonal Pattern</h4>
                  <p>
                    Peak season factor: <strong>{Math.max(...Object.values(analytics.seasonal_factors || {})).toFixed(2)}</strong>
                    {" "}
                    Low season factor: <strong>{Math.min(...Object.values(analytics.seasonal_factors || {})).toFixed(2)}</strong>
                  </p>
                </div>
              </div>

              <div className="insight-item">
                <span className="insight-icon">📉</span>
                <div>
                  <h4>Sales Range</h4>
                  <p>
                    Sales range from <strong>{Math.round(analytics.statistics.min_sales)}</strong> to{" "}
                    <strong>{Math.round(analytics.statistics.max_sales)}</strong> units.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
