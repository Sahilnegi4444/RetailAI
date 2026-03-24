import React from 'react';
import './CategoryChart.css';

const CategoryChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="no-data">
        <p>No category data available</p>
      </div>
    );
  }

  const categories = Object.keys(data);
  const totalSales = categories.reduce((sum, cat) => sum + data[cat].totalSales, 0);

  const colors = {
    'Grocery': '#10b981',
    'Liquor': '#a855f7',
    'Unknown': '#64748b',
  };

  return (
    <div className="category-chart">
      <div className="category-bars">
        {categories.map(category => {
          const stats = data[category];
          const percentage = totalSales > 0 ? (stats.totalSales / totalSales) * 100 : 0;
          const color = colors[category] || '#64748b';
          
          return (
            <div key={category} className="category-item">
              <div className="category-header">
                <div className="category-info">
                  <span className="category-icon" style={{ color }}>
                    {category === 'Grocery' ? '🛒' : category === 'Liquor' ? '🍷' : '📦'}
                  </span>
                  <span className="category-name">{category}</span>
                </div>
                <span className="category-percentage">{percentage.toFixed(1)}%</span>
              </div>
              
              <div className="category-bar-bg">
                <div 
                  className="category-bar-fill"
                  style={{ 
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`
                  }}
                />
              </div>
              
              <div className="category-stats">
                <div className="stat-item">
                  <span className="stat-label">Sales:</span>
                  <span className="stat-value">{stats.totalSales.toLocaleString()} units</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Revenue:</span>
                  <span className="stat-value">₹{Math.round(stats.totalRevenue).toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Items:</span>
                  <span className="stat-value">{stats.itemCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Price:</span>
                  <span className="stat-value">₹{stats.avgPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryChart;
