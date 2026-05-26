import React from 'react';
import './SummaryCards.css';

const SummaryCards = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="summary-cards">
        <div className="summary-card skeleton">
          <div className="skeleton-text"></div>
        </div>
        <div className="summary-card skeleton">
          <div className="skeleton-text"></div>
        </div>
        <div className="summary-card skeleton">
          <div className="skeleton-text"></div>
        </div>
        <div className="summary-card skeleton">
          <div className="skeleton-text"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <div className="card-icon">📦</div>
        <div className="card-content">
          <div className="card-label">Total Items</div>
          <div className="card-value">{summary.totalItems.toLocaleString('en-IN')}</div>
          <div className="card-detail">
            <span className="critical-badge">{summary.criticalItems.toLocaleString('en-IN')} Critical</span>
            <span className="low-badge">{summary.lowStockItems.toLocaleString('en-IN')} Low</span>
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">📊</div>
        <div className="card-content">
          <div className="card-label">Total Demand</div>
          <div className="card-value">{summary.totalDemand.toLocaleString('en-IN')}</div>
          <div className="card-detail">
            Current Stock: {summary.totalStock.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">📈</div>
        <div className="card-content">
          <div className="card-label">Trends</div>
          <div className="card-value">{(summary.increasingTrend + summary.stableTrend + summary.decreasingTrend).toLocaleString('en-IN')}</div>
          <div className="card-detail">
            <span>↗️ {summary.increasingTrend.toLocaleString('en-IN')}</span>
            <span>➡️ {summary.stableTrend.toLocaleString('en-IN')}</span>
            <span>↘️ {summary.decreasingTrend.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">💰</div>
        <div className="card-content">
          <div className="card-label">Total Order Value</div>
          <div className="card-value">₹{summary.totalOrderValue.toLocaleString('en-IN')}</div>
          <div className="card-detail">
            Recommended procurement budget
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
