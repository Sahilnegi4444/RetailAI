import React from 'react';
import { getShortMonthName } from '../../utils/predictionHelpers';
import './ExpandedDetails.css';

const ExpandedDetails = ({ product, predictionDate }) => {
  const monthName = new Date(predictionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const shortMonth = new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' });
  
  return (
    <div className="expanded-details">
      <div className="details-grid">
        {/* Forecast Section */}
        <div className="detail-section forecast-section">
          <h4>📊 {monthName} Forecast</h4>
          <p className="section-subtitle">Based on historical {shortMonth} sales across all years</p>
          
          <div className="forecast-values">
            <div className="forecast-item">
              <span className="forecast-label">Lowest {shortMonth}</span>
              <span className="forecast-value">{Math.round(product.historical_stats?.min || 0)}</span>
              <span className="forecast-sublabel">units (from all years)</span>
            </div>
            
            <div className="forecast-item highlight">
              <span className="forecast-label">Predicted</span>
              <span className="forecast-value main">{Math.round(product.final_prediction)}</span>
              <span className="forecast-sublabel">units</span>
            </div>
            
            <div className="forecast-item">
              <span className="forecast-label">Highest {shortMonth}</span>
              <span className="forecast-value">{Math.round(product.historical_stats?.max || 0)}</span>
              <span className="forecast-sublabel">units (from all years)</span>
            </div>
          </div>
          
          {product.historical_stats?.avg && (
            <div className="historical-context">
              <span>Historical {shortMonth} Average: <strong>{Math.round(product.historical_stats.avg)} units</strong></span>
              <span>• Based on {product.historical_stats.count} year(s) of data</span>
            </div>
          )}
        </div>

        {/* Yearly Statistics */}
        {product.yearly_stats && product.yearly_stats.average > 0 && (
          <div className="detail-section yearly-section">
            <h4>📅 Annual Sales Range</h4>
            <p className="section-subtitle">Absolute lowest and highest sales across all months</p>
            
            <div className="yearly-values">
              <div className="yearly-item">
                <span className="yearly-label">Absolute Lowest</span>
                <span className="yearly-value">
                  {Math.round(product.all_monthly_data?.reduce((min, d) => Math.min(min, d.sales), Infinity) || 0)}
                </span>
                <span className="yearly-sublabel">units (any month)</span>
              </div>
              
              <div className="yearly-item">
                <span className="yearly-label">Yearly Average</span>
                <span className="yearly-value">{Math.round(product.yearly_stats.average)}</span>
                <span className="yearly-sublabel">units/year</span>
              </div>
              
              <div className="yearly-item">
                <span className="yearly-label">Absolute Highest</span>
                <span className="yearly-value">
                  {Math.round(product.all_monthly_data?.reduce((max, d) => Math.max(max, d.sales), 0) || 0)}
                </span>
                <span className="yearly-sublabel">units (any month)</span>
              </div>
            </div>
          </div>
        )}

        {/* Key Insights */}
        <div className="detail-section insights-section">
          <h4>🎯 Key Insights</h4>
          <ul className="insights-list">
            <li>
              <strong>Trend:</strong> {product.trend || 'stable'} - {product.trend_reason || 'No trend data'}
            </li>
            <li>
              <strong>Growth Rate:</strong> {((product.growth_rate || 0) * 100).toFixed(1)}% year-over-year
            </li>
            <li>
              <strong>Historical Average:</strong> {Math.round(product.historical_stats?.avg || 0)} units per {shortMonth}
            </li>
            <li>
              <strong>Data Coverage:</strong> {product.historical_stats?.count || 0} year(s) of historical data
            </li>
            <li>
              <strong>Prediction Range:</strong> {Math.round(product.historical_stats?.min || 0)} - {Math.round(product.historical_stats?.max || 0)} units
            </li>
          </ul>
        </div>

        {/* Monthly Sales History */}
        {product.all_monthly_data && product.all_monthly_data.length > 0 && (
          <div className="detail-section history-section">
            <h4>📊 Monthly Sales History</h4>
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Units Sold</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {product.all_monthly_data.slice(0, 12).map((data, idx) => {
                    const isRecent = idx < 3;
                    const avgSales = product.historical_stats?.avg || 0;
                    
                    return (
                      <tr key={idx} className={isRecent ? 'recent-row' : ''}>
                        <td>{getShortMonthName(data.month)} {data.year}</td>
                        <td className="units-cell">{Math.round(data.sales)} units</td>
                        <td>
                          {isRecent && <span className="badge recent-badge">Recent</span>}
                          {data.sales > avgSales && <span className="badge above-badge">Above Avg</span>}
                          {data.sales < avgSales && <span className="badge below-badge">Below Avg</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandedDetails;
