import React from 'react';
import './FiltersBar.css';

const FiltersBar = ({ 
  filters, 
  onFilterChange, 
  onExport, 
  predictionDate, 
  onDateChange,
  totalItems,
  filteredItems,
  budget,
  onBudgetChange,
  budgetSummary,
  isBulkOrderForecast = false
}) => {
  const [budgetInput, setBudgetInput] = React.useState(budget ? (budget / 100000).toFixed(1) : '');

  const handleBudgetChange = (e) => {
    const value = e.target.value;
    setBudgetInput(value);
    
    if (value === '' || value === '0') {
      onBudgetChange(null);
    } else {
      const budgetInRupees = parseFloat(value) * 100000; // Convert lakhs to rupees
      onBudgetChange(budgetInRupees);
    }
  };

  return (
    <div className="filters-bar">
      <div className="filters-row">
        <div className="filter-group">
          <label htmlFor="prediction-date">Prediction Date</label>
          <input
            id="prediction-date"
            type="date"
            value={predictionDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="date-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="search">Search Items</label>
          <input
            id="search"
            type="text"
            placeholder="Search by name..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="Grocery I">Grocery I (Group I)</option>
            <option value="Grocery II">Grocery II (Group II)</option>
            <option value="Grocery III">Grocery III (Group III)</option>
            <option value="Grocery IV">Grocery IV (Group IV)</option>
            <option value="Grocery V">Grocery V (Group V)</option>
            <option value="Liquor">Liquor (Group VI)</option>
          </select>
        </div>

        {!isBulkOrderForecast && (
          <>
            <div className="filter-group">
              <label htmlFor="stock-status">Stock Status</label>
              <select
                id="stock-status"
                value={filters.stockStatus}
                onChange={(e) => onFilterChange('stockStatus', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="critical">🚨 Critical</option>
                <option value="low">⚠️ Low</option>
                <option value="adequate">✅ Adequate</option>
                <option value="excess">📦 Excess</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="trend">Trend</label>
              <select
                id="trend"
                value={filters.trend}
                onChange={(e) => onFilterChange('trend', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Trends</option>
                <option value="increasing">📈 Increasing</option>
                <option value="stable">➡️ Stable</option>
                <option value="decreasing">📉 Decreasing</option>
              </select>
            </div>
          </>
        )}

        <div className="filter-group">
          <label htmlFor="sort">Sort By</label>
          <select
            id="sort"
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
            className="filter-select"
          >
            <option value="priority">Priority</option>
            <option value="name">Name</option>
            <option value="demand">Demand</option>
            <option value="stock">Stock</option>
          </select>
        </div>

        {!isBulkOrderForecast && (
          <div className="filter-group">
            <label>Order</label>
            <button
              onClick={() => onFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
              title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}

        {!isBulkOrderForecast && (
          <div className="filter-group">
            <label>&nbsp;</label>
            <button onClick={onExport} className="export-btn">
              📥 Export All Data
            </button>
          </div>
        )}
      </div>

      <div className="results-info">
        Showing {filteredItems} of {totalItems} items
      </div>
    </div>
  );
};

export default FiltersBar;
