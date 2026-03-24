import React from 'react';
import './YearWiseChart.css';

const YearWiseChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="no-data">
        <p>No year-wise data available</p>
      </div>
    );
  }

  const years = Object.keys(data).sort();
  const maxSales = Math.max(...years.map(year => data[year].totalSales));

  return (
    <div className="year-wise-chart">
      <div className="chart-bars">
        {years.map(year => {
          const stats = data[year];
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
                <div className="detail-item">
                  <span className="detail-label">Revenue:</span>
                  <span className="detail-value">₹{Math.round(stats.totalRevenue).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Items:</span>
                  <span className="detail-value">{stats.itemCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YearWiseChart;
