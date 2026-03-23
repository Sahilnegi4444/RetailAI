import React, { useState, useEffect } from "react";
import "./ItemDetails.css";

const ItemDetails = ({ itemName, onClose }) => {
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("all");
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadItemDetails();
  }, [itemName]);

  const loadItemDetails = async () => {
    try {
      setLoading(true);
      // Fetch item history from API
      const response = await fetch(`http://localhost:8001/history/MY_STORE/${encodeURIComponent(itemName)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load item details: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setItemData(data);
      processChartData(data);
    } catch (error) {
      console.error("Failed to load item details:", error);
      setItemData({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (data) => {
    try {
      if (!data || !data.history || !Array.isArray(data.history)) {
        setChartData([]);
        return;
      }

      // Group by month - convert weekly data back to monthly
      const monthlyData = {};
      data.history.forEach(record => {
        if (!record || !record.date) return;
        
        const date = new Date(record.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            sales: 0,
            revenue: 0,
            count: 0
          };
        }
        
        // Convert weekly back to monthly (multiply by 4)
        monthlyData[monthKey].sales += (record.units_sold_7d || 0) * 4;
        monthlyData[monthKey].revenue += record.revenue || 0;
        monthlyData[monthKey].count += 1;
      });

      const processed = Object.values(monthlyData).map(m => ({
        ...m,
        sales: m.sales / Math.max(m.count, 1), // Average if multiple entries
        revenue: m.revenue / Math.max(m.count, 1)
      })).sort((a, b) => a.month.localeCompare(b.month));

      setChartData(Array.isArray(processed) ? processed : []);
    } catch (error) {
      console.error("Error processing chart data:", error);
      setChartData([]);
    }
  };

  if (loading) {
    return (
      <div className="item-details-modal">
        <div className="modal-content">
          <div className="loading">Loading item details...</div>
        </div>
      </div>
    );
  }

  if (!itemData) {
    return (
      <div className="item-details-modal">
        <div className="modal-overlay" onClick={onClose}></div>
        <div className="modal-content">
          <div className="modal-header">
            <h2>Item Details</h2>
            <button onClick={onClose} className="btn-close">✕</button>
          </div>
          <div className="error">Failed to load item details</div>
        </div>
      </div>
    );
  }

  if (itemData.error) {
    return (
      <div className="item-details-modal">
        <div className="modal-overlay" onClick={onClose}></div>
        <div className="modal-content">
          <div className="modal-header">
            <h2>Item Details</h2>
            <button onClick={onClose} className="btn-close">✕</button>
          </div>
          <div className="error">{itemData.error}</div>
          <div style={{padding: '20px', textAlign: 'center'}}>
            <button onClick={onClose} className="btn-close" style={{background: '#6366f1', color: 'white', width: 'auto', padding: '8px 16px'}}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const getFilteredChartData = () => {
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) return [];
    if (selectedYear === "all") return chartData;
    return chartData.filter(d => d.month && d.month.startsWith(selectedYear));
  };

  const filteredData = getFilteredChartData();
  const maxSales = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.sales || 0), 1) : 1;
  const maxRevenue = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.revenue || 0), 1) : 1;

  // Calculate statistics
  const totalSales = filteredData.length > 0 ? filteredData.reduce((sum, d) => sum + (d.sales || 0), 0) : 0;
  const totalRevenue = filteredData.length > 0 ? filteredData.reduce((sum, d) => sum + (d.revenue || 0), 0) : 0;
  const avgSales = filteredData.length > 0 ? (totalSales / filteredData.length).toFixed(2) : 0;
  const avgRevenue = filteredData.length > 0 ? (totalRevenue / filteredData.length).toFixed(2) : 0;

  return (
    <div className="item-details-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{itemName}</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        {/* Year Filter */}
        <div className="year-filter">
          <button
            className={`year-btn ${selectedYear === "all" ? "active" : ""}`}
            onClick={() => setSelectedYear("all")}
          >
            All Years
          </button>
          <button
            className={`year-btn ${selectedYear === "2024" ? "active" : ""}`}
            onClick={() => setSelectedYear("2024")}
          >
            2024
          </button>
          <button
            className={`year-btn ${selectedYear === "2025" ? "active" : ""}`}
            onClick={() => setSelectedYear("2025")}
          >
            2025
          </button>
        </div>

        {/* Statistics */}
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Total Sales</div>
            <div className="stat-value">{totalSales.toLocaleString()} units</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Average Monthly</div>
            <div className="stat-value">{avgSales} units</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">₹{totalRevenue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Avg Monthly Revenue</div>
            <div className="stat-value">₹{avgRevenue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
          </div>
        </div>

        {/* Sales Chart */}
        <div className="chart-section">
          <h3>📊 Monthly Sales Trend</h3>
          <div className="chart-container">
            {filteredData.length > 0 ? (
              <div className="chart-bars">
                {filteredData.map((data, idx) => (
                  <div key={idx} className="bar-group">
                    <div className="bar-wrapper">
                      <div
                        className="bar"
                        style={{
                          height: `${(data.sales / maxSales) * 200}px`,
                          backgroundColor: '#6366f1'
                        }}
                        title={`${data.sales.toFixed(0)} units`}
                      ></div>
                    </div>
                    <div className="bar-label">{data.month}</div>
                    <div className="bar-value">{data.sales.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{padding: '40px', textAlign: 'center', color: '#999'}}>No data available</div>
            )}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="chart-section">
          <h3>💰 Monthly Revenue Trend</h3>
          <div className="chart-container">
            {filteredData.length > 0 ? (
              <div className="chart-bars">
                {filteredData.map((data, idx) => (
                  <div key={idx} className="bar-group">
                    <div className="bar-wrapper">
                      <div
                        className="bar"
                        style={{
                          height: `${(data.revenue / maxRevenue) * 200}px`,
                          backgroundColor: '#10b981'
                        }}
                        title={`₹${data.revenue.toFixed(0)}`}
                      ></div>
                    </div>
                    <div className="bar-label">{data.month}</div>
                    <div className="bar-value">₹{(data.revenue / 1000).toFixed(0)}k</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{padding: '40px', textAlign: 'center', color: '#999'}}>No data available</div>
            )}
          </div>
        </div>

        {/* Detailed Table */}
        <div className="table-section">
          <h3>📋 Monthly Breakdown</h3>
          {filteredData.length > 0 ? (
            <div className="table-wrapper">
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                    <th>Avg Price</th>
                    <th>Growth %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((data, idx) => {
                    const prevData = idx > 0 ? filteredData[idx - 1] : null;
                    const growth = prevData && prevData.sales > 0 ? (((data.sales - prevData.sales) / prevData.sales) * 100).toFixed(1) : 0;
                    const avgPrice = data.sales > 0 ? (data.revenue / data.sales).toFixed(2) : 0;

                    return (
                      <tr key={idx}>
                        <td className="month">{data.month}</td>
                        <td className="units">{data.sales.toFixed(0)}</td>
                        <td className="revenue">₹{data.revenue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                        <td className="price">₹{avgPrice}</td>
                        <td className={`growth ${growth >= 0 ? 'positive' : 'negative'}`}>
                          {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{padding: '40px', textAlign: 'center', color: '#999'}}>No data available</div>
          )}
        </div>

        {/* Insights */}
        <div className="insights-section">
          <h3>💡 Insights</h3>
          {filteredData.length > 0 ? (
            <div className="insights-grid">
              <div className="insight-card">
                <span className="insight-icon">📈</span>
                <div>
                  <h4>Peak Month</h4>
                  <p>
                    {filteredData.length > 0
                      ? `${filteredData.reduce((max, d) => (d.sales || 0) > (max.sales || 0) ? d : max).month} with ${filteredData.reduce((max, d) => (d.sales || 0) > (max.sales || 0) ? d : max).sales.toFixed(0)} units`
                      : "No data"}
                  </p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">📉</span>
                <div>
                  <h4>Lowest Month</h4>
                  <p>
                    {filteredData.length > 0
                      ? `${filteredData.reduce((min, d) => (d.sales || 0) < (min.sales || 0) ? d : min).month} with ${filteredData.reduce((min, d) => (d.sales || 0) < (min.sales || 0) ? d : min).sales.toFixed(0)} units`
                      : "No data"}
                  </p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">💵</span>
                <div>
                  <h4>Highest Revenue</h4>
                  <p>
                    {filteredData.length > 0
                      ? `${filteredData.reduce((max, d) => (d.revenue || 0) > (max.revenue || 0) ? d : max).month} with ₹${filteredData.reduce((max, d) => (d.revenue || 0) > (max.revenue || 0) ? d : max).revenue.toLocaleString('en-IN', {maximumFractionDigits: 0})}`
                      : "No data"}
                  </p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">📊</span>
                <div>
                  <h4>Trend</h4>
                  <p>
                    {filteredData.length > 1
                      ? (filteredData[filteredData.length - 1].sales || 0) > (filteredData[0].sales || 0)
                        ? "📈 Increasing trend"
                        : "📉 Decreasing trend"
                      : "Insufficient data"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{padding: '40px', textAlign: 'center', color: '#999'}}>No data available for insights</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;
