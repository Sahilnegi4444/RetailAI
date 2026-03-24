import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import StatsCard from '../../components/StatsCard';
import YearWiseChart from '../../components/Dashboard/YearWiseChart';
import CategoryChart from '../../components/Dashboard/CategoryChart';
import TopItemsChart from '../../components/Dashboard/TopItemsChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Dashboard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedView, setSelectedView] = useState('overview'); // overview, yearwise, category, items
  const [selectedYear, setSelectedYear] = useState(null); // For month-wise view

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [statsData, itemsData] = await Promise.all([
        analyticsService.getDatabaseStats(),
        analyticsService.getAllItems(),
      ]);
      
      setStats(statsData);
      setItems(itemsData.items || []);
    } catch (err) {
      console.error('[DASHBOARD] Error loading data:', err);
      setError('Failed to load dashboard data. Please ensure the backend is running on port 8003.');
    } finally {
      setLoading(false);
    }
  };

  // Safe number conversion helper
  const safeNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Number(value) || 0;
  };

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!items || items.length === 0) {
      return {
        yearWiseStats: {},
        categoryStats: {},
        topItemsBySales: [],
        topItemsByRevenue: [],
        totalRevenue: 0,
        avgItemSales: 0,
        totalSales: 0,
      };
    }

    // Filter out items with invalid data
    const validItems = items.filter(item => {
      const sold = safeNumber(item.total_sold);
      const revenue = safeNumber(item.revenue);
      return sold > 0 || revenue > 0;
    });

    if (validItems.length === 0) {
      return {
        yearWiseStats: {},
        categoryStats: {},
        topItemsBySales: [],
        topItemsByRevenue: [],
        totalRevenue: 0,
        avgItemSales: 0,
        totalSales: 0,
      };
    }

    const yearWiseStats = analyticsService.calculateYearWiseStats(validItems);
    const categoryStats = analyticsService.calculateCategoryStats(validItems);
    const topItemsBySales = analyticsService.getTopItems(validItems, 10, 'total_sold');
    const topItemsByRevenue = analyticsService.getTopItems(validItems, 10, 'revenue');
    
    const totalRevenue = validItems.reduce((sum, item) => sum + safeNumber(item.revenue), 0);
    const totalSales = validItems.reduce((sum, item) => sum + safeNumber(item.total_sold), 0);
    const avgItemSales = validItems.length > 0 ? totalSales / validItems.length : 0;

    return {
      yearWiseStats,
      categoryStats,
      topItemsBySales,
      topItemsByRevenue,
      totalRevenue: safeNumber(totalRevenue),
      avgItemSales: safeNumber(avgItemSales),
      totalSales: safeNumber(totalSales),
    };
  }, [items]);

  // Calculate month-wise data for last 3 years
  const monthWiseData = useMemo(() => {
    if (!items || items.length === 0) {
      return { years: [], monthData: {}, selectedYear: null };
    }

    // Get all unique years from data
    const yearsSet = new Set();
    items.forEach(item => {
      if (item.year) {
        yearsSet.add(parseInt(item.year));
      }
    });

    const allYears = Array.from(yearsSet).sort((a, b) => b - a); // Descending order
    const last3Years = allYears.slice(0, 3).sort((a, b) => a - b); // Last 3 years, ascending

    // Initialize month data for last 3 years
    const monthData = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    last3Years.forEach(year => {
      monthData[year] = {};
      monthNames.forEach((_, idx) => {
        monthData[year][idx + 1] = 0;
      });
    });

    // Aggregate sales by year and month
    items.forEach(item => {
      const year = parseInt(item.year);
      const month = parseInt(item.month);

      if (last3Years.includes(year) && month >= 1 && month <= 12) {
        monthData[year][month] += safeNumber(item.total_sold || 0);
      }
    });

    // Set default selected year to most recent
    const defaultYear = last3Years.length > 0 ? last3Years[last3Years.length - 1] : null;

    return {
      years: last3Years,
      monthData,
      selectedYear: defaultYear,
      monthNames,
    };
  }, [items]);

  // Set initial selected year
  useEffect(() => {
    if (monthWiseData.selectedYear && !selectedYear) {
      setSelectedYear(monthWiseData.selectedYear);
    }
  }, [monthWiseData, selectedYear]);

  // Prepare chart data for selected year
  const chartData = useMemo(() => {
    if (!selectedYear || !monthWiseData.monthData[selectedYear]) {
      return [];
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = [];

    for (let month = 1; month <= 12; month++) {
      const sales = monthWiseData.monthData[selectedYear][month] || 0;
      data.push({
        month: monthNames[month - 1],
        sales: safeNumber(sales),
        monthNum: month,
      });
    }

    return data;
  }, [selectedYear, monthWiseData]);

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
    <div className="dashboard-new">
      <div className="dashboard-header">
        <div>
          <h1>📊 Analytics Dashboard</h1>
          <p className="subtitle">
            Comprehensive business intelligence with year-wise patterns, category analysis, and item performance
          </p>
        </div>
        <button onClick={loadDashboardData} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <StatsCard
          title="Total Items"
          value={stats?.unique_items?.toLocaleString() || '0'}
          icon="📦"
          trend={`${items.length} analyzed`}
          trendUp={true}
          tooltip="Total unique products in inventory"
        />
        <StatsCard
          title="Total Sales"
          value={analytics.totalSales?.toLocaleString() || '0'}
          icon="📊"
          trend="units"
          trendUp={true}
          tooltip="Total units sold across all items"
        />
        <StatsCard
          title="Total Revenue"
          value={`₹${Math.round(analytics.totalRevenue).toLocaleString()}`}
          icon="💰"
          trend="all time"
          trendUp={true}
          tooltip="Total revenue generated"
        />
        <StatsCard
          title="Avg Item Sales"
          value={Math.round(analytics.avgItemSales).toLocaleString()}
          icon="📈"
          trend="units/item"
          trendUp={true}
          tooltip="Average sales per item"
        />
      </div>

      {/* View Selector */}
      <div className="view-selector">
        <button
          className={`view-btn ${selectedView === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedView('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`view-btn ${selectedView === 'yearwise' ? 'active' : ''}`}
          onClick={() => setSelectedView('yearwise')}
        >
          📅 Year-Wise
        </button>
        <button
          className={`view-btn ${selectedView === 'category' ? 'active' : ''}`}
          onClick={() => setSelectedView('category')}
        >
          🏷️ Categories
        </button>
        <button
          className={`view-btn ${selectedView === 'items' ? 'active' : ''}`}
          onClick={() => setSelectedView('items')}
        >
          🎯 Top Items
        </button>
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="overview-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h2>📅 Year-Wise Sales Trend</h2>
              <span className="chart-badge">
                {Object.keys(analytics.yearWiseStats).length} years
              </span>
            </div>
            {Object.keys(analytics.yearWiseStats).length > 0 ? (
              <YearWiseChart data={analytics.yearWiseStats} />
            ) : (
              <div className="no-data">No year-wise data available</div>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h2>🏷️ Category Distribution</h2>
              <span className="chart-badge">
                {Object.keys(analytics.categoryStats).length} categories
              </span>
            </div>
            {Object.keys(analytics.categoryStats).length > 0 ? (
              <CategoryChart data={analytics.categoryStats} />
            ) : (
              <div className="no-data">No category data available</div>
            )}
          </div>

          <div className="chart-card full-width">
            <div className="chart-header">
              <h2>🎯 Top 10 Items by Sales</h2>
              <span className="chart-badge">Best performers</span>
            </div>
            {analytics.topItemsBySales.length > 0 ? (
              <TopItemsChart 
                items={analytics.topItemsBySales} 
                sortBy="total_sold"
              />
            ) : (
              <div className="no-data">No items data available</div>
            )}
          </div>

          {/* Month-Wise Sales Chart */}
          <div className="chart-card full-width">
            <div className="chart-header">
              <h2>📊 Month-Wise Sales (Last 3 Years)</h2>
              <span className="chart-badge">
                {monthWiseData.years.length} years available
              </span>
            </div>

            {monthWiseData.years.length > 0 ? (
              <>
                <div className="month-selector-container">
                  <label className="month-selector-label">Select Year:</label>
                  <select
                    value={selectedYear || ''}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="month-selector-select"
                  >
                    {monthWiseData.years.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {chartData.length > 0 && chartData.some(d => d.sales > 0) ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="month"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
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
                          color: '#fff',
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                        itemStyle={{ color: '#3b82f6' }}
                        formatter={(value) => [value.toLocaleString() + ' units', 'Sales']}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar
                        dataKey="sales"
                        fill="#3b82f6"
                        radius={[8, 8, 0, 0]}
                        name="Sales"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">No data available for {selectedYear}</div>
                )}
              </>
            ) : (
              <div className="no-data">No month-wise data available</div>
            )}
          </div>
        </div>
      )}

      {/* Year-Wise View */}
      {selectedView === 'yearwise' && (
        <div className="yearwise-view">
          <div className="chart-card full-width">
            <div className="chart-header">
              <h2>📅 Year-Wise Performance Analysis</h2>
              <span className="chart-badge">
                {Object.keys(analytics.yearWiseStats).length} years tracked
              </span>
            </div>
            {Object.keys(analytics.yearWiseStats).length > 0 ? (
              <>
                <YearWiseChart data={analytics.yearWiseStats} />
                
                <div className="year-insights">
                  <h3>📊 Year-Wise Insights</h3>
                  <div className="insights-grid">
                    {Object.keys(analytics.yearWiseStats).sort().map(year => {
                      const yearStats = analytics.yearWiseStats[year];
                      return (
                        <div key={year} className="insight-card">
                          <div className="insight-year">{year}</div>
                          <div className="insight-stats">
                            <div className="insight-stat">
                              <span className="stat-label">Sales:</span>
                              <span className="stat-value">{safeNumber(yearStats.totalSales).toLocaleString()} units</span>
                            </div>
                            <div className="insight-stat">
                              <span className="stat-label">Revenue:</span>
                              <span className="stat-value">₹{Math.round(safeNumber(yearStats.totalRevenue)).toLocaleString()}</span>
                            </div>
                            <div className="insight-stat">
                              <span className="stat-label">Items:</span>
                              <span className="stat-value">{yearStats.itemCount}</span>
                            </div>
                            <div className="insight-stat">
                              <span className="stat-label">Categories:</span>
                              <span className="stat-value">{yearStats.categories.join(', ')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="no-data">No year-wise data available</div>
            )}
          </div>
        </div>
      )}

      {/* Category View */}
      {selectedView === 'category' && (
        <div className="category-view">
          <div className="chart-card full-width">
            <div className="chart-header">
              <h2>🏷️ Category Performance Analysis</h2>
              <span className="chart-badge">
                {Object.keys(analytics.categoryStats).length} categories
              </span>
            </div>
            {Object.keys(analytics.categoryStats).length > 0 ? (
              <CategoryChart data={analytics.categoryStats} />
            ) : (
              <div className="no-data">No category data available</div>
            )}
          </div>
        </div>
      )}

      {/* Top Items View */}
      {selectedView === 'items' && (
        <div className="items-view">
          <div className="chart-card">
            <div className="chart-header">
              <h2>🎯 Top 10 Items by Sales Volume</h2>
              <span className="chart-badge">Best sellers</span>
            </div>
            {analytics.topItemsBySales.length > 0 ? (
              <TopItemsChart 
                items={analytics.topItemsBySales} 
                sortBy="total_sold"
              />
            ) : (
              <div className="no-data">No items data available</div>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h2>💰 Top 10 Items by Revenue</h2>
              <span className="chart-badge">Highest revenue</span>
            </div>
            {analytics.topItemsByRevenue.length > 0 ? (
              <TopItemsChart 
                items={analytics.topItemsByRevenue} 
                sortBy="revenue"
              />
            ) : (
              <div className="no-data">No revenue data available</div>
            )}
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div className="insights-section">
        <h2>💡 Key Business Insights</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <span className="insight-icon">📈</span>
            <div>
              <h3>Growth Trend</h3>
              <p>
                {Object.keys(analytics.yearWiseStats).length > 1
                  ? `Tracking ${Object.keys(analytics.yearWiseStats).length} years of sales data`
                  : 'Building historical data for trend analysis'}
              </p>
            </div>
          </div>
          <div className="insight-card">
            <span className="insight-icon">🏆</span>
            <div>
              <h3>Top Performer</h3>
              <p>
                {analytics.topItemsBySales[0]?.item_name || 'No data'} leads with{' '}
                {safeNumber(analytics.topItemsBySales[0]?.total_sold).toLocaleString()} units sold
              </p>
            </div>
          </div>
          <div className="insight-card">
            <span className="insight-icon">💰</span>
            <div>
              <h3>Revenue Leader</h3>
              <p>
                {analytics.topItemsByRevenue[0]?.item_name || 'No data'} generates{' '}
                ₹{Math.round(safeNumber(analytics.topItemsByRevenue[0]?.revenue)).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="insight-card">
            <span className="insight-icon">📊</span>
            <div>
              <h3>Category Mix</h3>
              <p>
                {Object.keys(analytics.categoryStats).length} categories with balanced distribution
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
