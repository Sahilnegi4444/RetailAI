import React, { useReducer, useEffect, useMemo, useCallback } from 'react';
import SummaryCards from '../../components/BulkPrediction/SummaryCards';
import FiltersBar from '../../components/BulkPrediction/FiltersBar';
import ProductsTable from '../../components/BulkPrediction/ProductsTable';
import { predictionService } from '../../services/predictionService';
import {
  processPrediction,
  filterPredictions,
  sortPredictions,
  calculateSummary,
} from '../../utils/predictionHelpers';
import './BulkPrediction.css';

// Initial state
const initialState = {
  predictions: [],
  loading: false,
  error: null,
  predictionDate: new Date().toISOString().split('T')[0],
  expandedId: null,
  filters: {
    search: '',
    category: 'all',
    stockStatus: 'all',
    trend: 'all',
    sortBy: 'priority',
    sortOrder: 'asc',
  },
  // Pagination states
  currentPage: 1,
  hasMore: true,
  totalRecords: 0,
  isLoadingMore: false,
  // Prediction states
  predictionMode: null,
  predictionResults: [],
  predictionLoading: false,
  showPreviousYearsModal: false,
  showLastNMonthsModal: false,
  selectedDate: new Date().toISOString().split('T')[0],
  selectedMonths: 4,
  // Prediction results pagination
  resultsPage: 1,
  resultsPageSize: 50,
  expandedResultId: null,
};

// Reducer function
const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_PREDICTIONS':
      return { ...state, predictions: action.payload, loading: false, error: null };
    
    case 'APPEND_PREDICTIONS':
      return { ...state, predictions: [...state.predictions, ...action.payload], isLoadingMore: false };
    
    case 'SET_PREDICTION_DATE':
      return { ...state, predictionDate: action.payload, currentPage: 1, predictions: [] };
    
    case 'SET_EXPANDED_ID':
      return { ...state, expandedId: action.payload };
    
    case 'UPDATE_FILTER':
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value,
        },
      };
    
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: initialState.filters,
      };
    
    case 'SET_PAGINATION':
      return {
        ...state,
        currentPage: action.payload.page,
        hasMore: action.payload.hasMore,
        totalRecords: action.payload.total,
      };
    
    case 'SET_LOADING_MORE':
      return { ...state, isLoadingMore: action.payload };
    
    case 'SET_PREDICTION_RESULTS':
      return {
        ...state,
        predictionResults: action.payload.results,
        predictionMode: action.payload.mode,
        predictionLoading: false,
      };
    
    case 'SET_PREDICTION_LOADING':
      return { ...state, predictionLoading: action.payload };
    
    case 'TOGGLE_MODAL':
      return { ...state, [action.payload.key]: action.payload.value };
    
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    
    case 'SET_SELECTED_MONTHS':
      return { ...state, selectedMonths: action.payload };
    
    case 'CLEAR_PREDICTION_RESULTS':
      return { ...state, predictionResults: [], predictionMode: null, resultsPage: 1, expandedResultId: null };
    
    case 'LOAD_MORE_RESULTS':
      return { ...state, resultsPage: state.resultsPage + 1 };
    
    case 'TOGGLE_RESULT_EXPAND':
      return { ...state, expandedResultId: state.expandedResultId === action.payload ? null : action.payload };
    
    default:
      return state;
  }
};

const BulkPrediction = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const observerTarget = React.useRef(null);
  const requestLockRef = React.useRef(false);

  // Fetch predictions with pagination
  const fetchPredictions = useCallback(async (page = 1) => {
    if (page === 1) {
      dispatch({ type: 'SET_LOADING', payload: true });
    } else {
      dispatch({ type: 'SET_LOADING_MORE', payload: true });
    }
    
    try {
      const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-paginated?page=${page}&page_size=50`;
      const body = { prediction_date: state.predictionDate };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result && result.predictions) {
        const processed = result.predictions.map(processPrediction);
        
        if (page === 1) {
          dispatch({ type: 'SET_PREDICTIONS', payload: processed });
        } else {
          dispatch({ type: 'APPEND_PREDICTIONS', payload: processed });
        }
        
        dispatch({
          type: 'SET_PAGINATION',
          payload: {
            page: result.pagination?.page || page,
            hasMore: result.pagination?.has_next || false,
            total: result.pagination?.total_items || 0,
          },
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'No predictions returned from API' });
      }
    } catch (error) {
      console.error('[BULK PREDICTION] Error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [state.predictionDate]);

  // Load predictions on mount and when date changes
  useEffect(() => {
    fetchPredictions(1);
  }, [fetchPredictions]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current) {
      console.log('[INFINITE SCROLL] Observer target not ready');
      return;
    }

    console.log('[INFINITE SCROLL] Setting up observer');

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        console.log('[INFINITE SCROLL] Observer triggered:', {
          isIntersecting: entry.isIntersecting,
          hasMore: state.hasMore,
          isLoadingMore: state.isLoadingMore,
          currentPage: state.currentPage,
          locked: requestLockRef.current
        });

        if (entry.isIntersecting && state.hasMore && !state.isLoadingMore && !state.loading && !requestLockRef.current) {
          console.log('[INFINITE SCROLL] Loading next page:', state.currentPage + 1);
          requestLockRef.current = true;
          fetchPredictions(state.currentPage + 1);
          setTimeout(() => { requestLockRef.current = false; }, 500);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(observerTarget.current);
    console.log('[INFINITE SCROLL] Observer attached to target');

    return () => {
      console.log('[INFINITE SCROLL] Cleaning up observer');
      observer.disconnect();
    };
  }, [state.hasMore, state.currentPage, state.isLoadingMore, state.loading, fetchPredictions]);

  // Process predictions with filters and sorting
  const processedProducts = useMemo(() => {
    let filtered = filterPredictions(state.predictions, state.filters);
    let sorted = sortPredictions(filtered, state.filters.sortBy, state.filters.sortOrder);
    return sorted;
  }, [state.predictions, state.filters]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return calculateSummary(processedProducts);
  }, [processedProducts]);

  // Handlers
  const handleFilterChange = useCallback((key, value) => {
    dispatch({ type: 'UPDATE_FILTER', payload: { key, value } });
  }, []);

  const handleDateChange = useCallback((date) => {
    dispatch({ type: 'SET_PREDICTION_DATE', payload: date });
  }, []);

  const handleToggleExpand = useCallback((itemName) => {
    dispatch({
      type: 'SET_EXPANDED_ID',
      payload: state.expandedId === itemName ? null : itemName,
    });
  }, [state.expandedId]);

  const handleExport = useCallback(async () => {
    try {
      // Fetch ALL data with raw predictions
      const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-paginated?page=1&page_size=10000`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction_date: state.predictionDate })
      });

      const result = await response.json();
      const allData = result.predictions || [];

      // Export raw backend data
      predictionService.exportToCSV(
        allData.map(processPrediction),
        `predictions_${state.predictionDate}.csv`
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    }
  }, [state.predictionDate]);

  const handleRefresh = useCallback(() => {
    fetchPredictions(1);
  }, [fetchPredictions]);

  // Previous Years Prediction
  const handlePredictPreviousYears = useCallback(async () => {
    dispatch({ type: 'SET_PREDICTION_LOADING', payload: true });
    try {
      // Fetch ALL items first if not all loaded
      let allItems = state.predictions.map(d => d.item_name);
      
      if (state.hasMore) {
        console.log('[PREDICTION] Fetching all items for prediction...');
        const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-paginated?page=1&page_size=10000`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prediction_date: state.predictionDate })
        });
        const result = await response.json();
        allItems = (result.predictions || []).map(p => p.item_name);
        console.log('[PREDICTION] Fetched all items:', allItems.length);
      }

      const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-previous-years`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: allItems, target_date: state.selectedDate })
      });

      if (!response.ok) throw new Error('Prediction failed');
      
      const result = await response.json();
      dispatch({
        type: 'SET_PREDICTION_RESULTS',
        payload: { results: result.predictions || [], mode: 'previous_years' }
      });
      dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showPreviousYearsModal', value: false } });
    } catch (error) {
      console.error('Prediction failed:', error);
      alert('Prediction failed: ' + error.message);
      dispatch({ type: 'SET_PREDICTION_LOADING', payload: false });
    }
  }, [state.predictions, state.selectedDate, state.hasMore, state.predictionDate]);

  // Last N Months Prediction
  const handlePredictLastNMonths = useCallback(async () => {
    dispatch({ type: 'SET_PREDICTION_LOADING', payload: true });
    try {
      // Fetch ALL items first if not all loaded
      let allItems = state.predictions.map(d => d.item_name);
      
      if (state.hasMore) {
        console.log('[PREDICTION] Fetching all items for prediction...');
        const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-paginated?page=1&page_size=10000`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prediction_date: state.predictionDate })
        });
        const result = await response.json();
        allItems = (result.predictions || []).map(p => p.item_name);
        console.log('[PREDICTION] Fetched all items:', allItems.length);
      }

      const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-last-n-months`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: allItems, n_months: state.selectedMonths })
      });

      if (!response.ok) throw new Error('Prediction failed');
      
      const result = await response.json();
      dispatch({
        type: 'SET_PREDICTION_RESULTS',
        payload: { results: result.predictions || [], mode: 'last_n_months' }
      });
      dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showLastNMonthsModal', value: false } });
    } catch (error) {
      console.error('Prediction failed:', error);
      alert('Prediction failed: ' + error.message);
      dispatch({ type: 'SET_PREDICTION_LOADING', payload: false });
    }
  }, [state.predictions, state.selectedMonths, state.hasMore, state.predictionDate]);

  // Export prediction results
  const exportPredictionResults = useCallback(() => {
    if (state.predictionResults.length === 0) {
      alert('No prediction results to export');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const rows = [];

    rows.push(['Prediction Report', state.predictionMode === 'previous_years' ? 'Previous Years Analysis' : `Last ${state.selectedMonths} Months Analysis`]);
    rows.push(['Generated', new Date().toLocaleString()]);
    rows.push([]);

    if (state.predictionMode === 'previous_years') {
      rows.push(['Item Name', 'Year', 'Month', 'Units', 'Sales', 'Low', 'High', 'Average', 'Trend', 'Prediction', 'Confidence']);
      
      state.predictionResults.forEach(pred => {
        rows.push([
          pred.item_name, '', '', '', '', 
          pred.statistics?.low_sales || 0,
          pred.statistics?.high_sales || 0,
          pred.statistics?.average_sales || 0,
          pred.statistics?.trend || 'N/A',
          pred.prediction || 0,
          `${(pred.confidence * 100).toFixed(1)}%`
        ]);

        if (pred.yearly_data) {
          pred.yearly_data.forEach(year => {
            rows.push(['', year.year, year.month, year.units, year.sales, '', '', '', '', '', '']);
          });
        }
        rows.push([]);
      });
    } else {
      rows.push(['Item Name', 'Date', 'Year', 'Month', 'Units', 'Sales', 'Low', 'High', 'Average', 'Trend', 'Prediction', 'Confidence']);
      
      state.predictionResults.forEach(pred => {
        rows.push([
          pred.item_name, '', '', '', '', '', 
          pred.statistics?.low_sales || 0,
          pred.statistics?.high_sales || 0,
          pred.statistics?.average_sales || 0,
          pred.statistics?.trend || 'N/A',
          pred.prediction || 0,
          `${(pred.confidence * 100).toFixed(1)}%`
        ]);

        if (pred.monthly_data) {
          pred.monthly_data.forEach(month => {
            rows.push(['', month.date, month.year, month.month, month.units, month.sales, '', '', '', '', '', '']);
          });
        }
        rows.push([]);
      });
    }

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prediction-report-${state.predictionMode}-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [state.predictionResults, state.predictionMode, state.selectedMonths]);

  // Paginated prediction results
  const paginatedResults = useMemo(() => {
    const endIndex = state.resultsPage * state.resultsPageSize;
    return state.predictionResults.slice(0, endIndex);
  }, [state.predictionResults, state.resultsPage, state.resultsPageSize]);

  const hasMoreResults = useMemo(() => {
    return paginatedResults.length < state.predictionResults.length;
  }, [paginatedResults.length, state.predictionResults.length]);

  const handleLoadMoreResults = useCallback(() => {
    dispatch({ type: 'LOAD_MORE_RESULTS' });
  }, []);

  return (
    <div className="bulk-prediction-page">
      <div className="page-header">
        <div>
          <h1>📊 Bulk Predictions</h1>
          <p className="page-subtitle">
            AI-powered demand forecasting with historical pattern analysis
          </p>
        </div>
        <button onClick={handleRefresh} className="refresh-btn" disabled={state.loading}>
          {state.loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {state.error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{state.error}</span>
          <button onClick={handleRefresh} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      <SummaryCards summary={summary} loading={state.loading} />

      <FiltersBar
        filters={state.filters}
        onFilterChange={handleFilterChange}
        onExport={handleExport}
        predictionDate={state.predictionDate}
        onDateChange={handleDateChange}
        totalItems={state.totalRecords || state.predictions.length}
        filteredItems={processedProducts.length}
      />

      {/* Prediction Buttons */}
      {!state.predictionMode && (
        <div className="prediction-actions">
          <button 
            className="prediction-btn previous-years-btn"
            onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showPreviousYearsModal', value: true } })}
            disabled={state.predictions.length === 0}
          >
            📅 Predict Previous Years
          </button>
          <button 
            className="prediction-btn last-n-months-btn"
            onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showLastNMonthsModal', value: true } })}
            disabled={state.predictions.length === 0}
          >
            📊 Predict Last N Months
          </button>
        </div>
      )}

      {/* Previous Years Modal */}
      {state.showPreviousYearsModal && (
        <div className="modal-overlay" onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showPreviousYearsModal', value: false } })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📅 Predict Based on Previous Years</h2>
            <p>Select a target date to analyze the same month across all available years</p>
            <div className="modal-input-group">
              <label htmlFor="target-date">Target Date:</label>
              <input
                id="target-date"
                type="date"
                value={state.selectedDate}
                onChange={(e) => dispatch({ type: 'SET_SELECTED_DATE', payload: e.target.value })}
                className="date-input"
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn-primary"
                onClick={handlePredictPreviousYears}
                disabled={state.predictionLoading}
              >
                {state.predictionLoading ? '⏳ Generating...' : '✨ Generate Prediction'}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showPreviousYearsModal', value: false } })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last N Months Modal */}
      {state.showLastNMonthsModal && (
        <div className="modal-overlay" onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showLastNMonthsModal', value: false } })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📊 Predict Based on Last N Months</h2>
            <p>Select how many recent months to analyze for trend prediction</p>
            <div className="modal-input-group">
              <label htmlFor="months-count">Number of Months:</label>
              <div className="month-spinner">
                <button 
                  className="spinner-btn"
                  onClick={() => dispatch({ type: 'SET_SELECTED_MONTHS', payload: Math.max(1, state.selectedMonths - 1) })}
                >
                  −
                </button>
                <input
                  id="months-count"
                  type="number"
                  min="1"
                  max="24"
                  value={state.selectedMonths}
                  onChange={(e) => dispatch({ type: 'SET_SELECTED_MONTHS', payload: Math.min(24, Math.max(1, parseInt(e.target.value) || 1)) })}
                  className="month-input"
                />
                <button 
                  className="spinner-btn"
                  onClick={() => dispatch({ type: 'SET_SELECTED_MONTHS', payload: Math.min(24, state.selectedMonths + 1) })}
                >
                  +
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-primary"
                onClick={handlePredictLastNMonths}
                disabled={state.predictionLoading}
              >
                {state.predictionLoading ? '⏳ Generating...' : '✨ Generate Prediction'}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showLastNMonthsModal', value: false } })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Results Display */}
      {state.predictionMode && state.predictionResults.length > 0 && (
        <div className="prediction-results-section">
          <div className="results-header">
            <h2>
              {state.predictionMode === 'previous_years' 
                ? `📅 Previous Years Analysis (${state.selectedDate})` 
                : `📊 Last ${state.selectedMonths} Months Analysis`}
            </h2>
            <div className="results-actions">
              <button className="btn-export" onClick={exportPredictionResults}>
                📥 Export Results
              </button>
              <button className="btn-back" onClick={() => dispatch({ type: 'CLEAR_PREDICTION_RESULTS' })}>
                ← Back to Data
              </button>
            </div>
          </div>

          <div className="results-info-banner">
            Showing {paginatedResults.length} of {state.predictionResults.length} predictions
          </div>

          <div className="prediction-results-table-container">
            <table className="prediction-results-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Product Name</th>
                  <th>Low Sales</th>
                  <th>High Sales</th>
                  <th>Average Sales</th>
                  <th>Trend</th>
                  <th>Prediction</th>
                  <th>Confidence</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((pred, idx) => (
                  <React.Fragment key={idx}>
                    <tr className={state.expandedResultId === pred.item_name ? 'expanded' : ''}>
                      <td>
                        <button
                          className="expand-btn"
                          onClick={() => dispatch({ type: 'TOGGLE_RESULT_EXPAND', payload: pred.item_name })}
                        >
                          {state.expandedResultId === pred.item_name ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="item-name-cell">{pred.item_name}</td>
                      <td>{pred.statistics?.low_sales?.toFixed(2) || 'N/A'}</td>
                      <td>{pred.statistics?.high_sales?.toFixed(2) || 'N/A'}</td>
                      <td>{pred.statistics?.average_sales?.toFixed(2) || 'N/A'}</td>
                      <td>
                        <span className={`trend-badge ${pred.statistics?.trend || 'stable'}`}>
                          {pred.statistics?.trend || 'N/A'}
                        </span>
                      </td>
                      <td className="prediction-cell">{pred.prediction?.toFixed(2) || 'N/A'}</td>
                      <td>
                        <span className="confidence-badge">
                          {((pred.confidence || 0) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <button 
                          className="view-details-btn"
                          onClick={() => dispatch({ type: 'TOGGLE_RESULT_EXPAND', payload: pred.item_name })}
                        >
                          {state.expandedResultId === pred.item_name ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {state.expandedResultId === pred.item_name && (
                      <tr className="expanded-row">
                        <td colSpan="9">
                          <div className="prediction-details-panel">
                            <h3>📊 {pred.item_name} - Detailed Analysis</h3>
                            
                            {/* Statistics Summary */}
                            <div className="stats-summary">
                              <div className="stat-card">
                                <div className="stat-label">Low Sales</div>
                                <div className="stat-value">{pred.statistics?.low_sales?.toFixed(2) || 'N/A'}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">High Sales</div>
                                <div className="stat-value">{pred.statistics?.high_sales?.toFixed(2) || 'N/A'}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Average Sales</div>
                                <div className="stat-value">{pred.statistics?.average_sales?.toFixed(2) || 'N/A'}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Median Sales</div>
                                <div className="stat-value">{pred.statistics?.median_sales?.toFixed(2) || 'N/A'}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Std Deviation</div>
                                <div className="stat-value">{pred.statistics?.std_dev?.toFixed(2) || 'N/A'}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Trend</div>
                                <div className="stat-value">
                                  <span className={`trend-badge ${pred.statistics?.trend || 'stable'}`}>
                                    {pred.statistics?.trend || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Total Units</div>
                                <div className="stat-value">
                                  {state.predictionMode === 'previous_years' 
                                    ? (pred.yearly_data?.reduce((sum, y) => sum + (y.units || 0), 0) || 'N/A')
                                    : (pred.monthly_data?.reduce((sum, m) => sum + (m.units || 0), 0) || 'N/A')}
                                </div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Avg Units/Period</div>
                                <div className="stat-value">
                                  {state.predictionMode === 'previous_years' 
                                    ? (pred.yearly_data?.length > 0 
                                        ? Math.round(pred.yearly_data.reduce((sum, y) => sum + (y.units || 0), 0) / pred.yearly_data.length)
                                        : 'N/A')
                                    : (pred.monthly_data?.length > 0 
                                        ? Math.round(pred.monthly_data.reduce((sum, m) => sum + (m.units || 0), 0) / pred.monthly_data.length)
                                        : 'N/A')}
                                </div>
                              </div>
                            </div>

                            {/* Confidence Analysis */}
                            <div className="confidence-analysis">
                              <h4>🎯 Confidence Analysis</h4>
                              <div className="confidence-details">
                                <div className="confidence-score">
                                  <span className="confidence-label">Confidence Score:</span>
                                  <span className={`confidence-value ${pred.confidence > 0.8 ? 'high' : pred.confidence > 0.6 ? 'medium' : 'low'}`}>
                                    {((pred.confidence || 0) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="confidence-explanation">
                                  {pred.confidence > 0.8 ? (
                                    <p>✅ <strong>High Confidence:</strong> Data is consistent with low variation. Predictions are reliable.</p>
                                  ) : pred.confidence > 0.6 ? (
                                    <p>⚠️ <strong>Medium Confidence:</strong> Moderate variation in historical data. Predictions should be used with caution.</p>
                                  ) : (
                                    <p>❌ <strong>Low Confidence:</strong> High variation in historical data (CV: {pred.statistics?.std_dev && pred.statistics?.average_sales 
                                      ? ((pred.statistics.std_dev / pred.statistics.average_sales) * 100).toFixed(1) 
                                      : 'N/A'}%). Predictions may be unreliable.</p>
                                  )}
                                  <p className="confidence-note">
                                    <strong>Why?</strong> Confidence = 1 - (Std Dev / Average). 
                                    {pred.statistics?.std_dev && pred.statistics?.average_sales ? (
                                      ` Current: 1 - (${pred.statistics.std_dev.toFixed(2)} / ${pred.statistics.average_sales.toFixed(2)}) = ${pred.confidence.toFixed(3)}`
                                    ) : ' Insufficient data for calculation.'}
                                  </p>
                                  {pred.confidence < 0.7 && (
                                    <p className="confidence-recommendation">
                                      💡 <strong>Recommendation:</strong> Consider collecting more data or investigating factors causing high variation (seasonality, promotions, supply issues).
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Data Table */}
                            {state.predictionMode === 'previous_years' && pred.yearly_data && (
                              <div className="data-breakdown">
                                <h4>📅 Yearly Breakdown</h4>
                                <div className="breakdown-table-container">
                                  <table className="breakdown-table">
                                    <thead>
                                      <tr>
                                        <th>Year</th>
                                        <th>Month</th>
                                        <th>Units Sold</th>
                                        <th>Sales Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pred.yearly_data.map((year, i) => (
                                        <tr key={i}>
                                          <td>{year.year}</td>
                                          <td>{year.month}</td>
                                          <td>{year.units}</td>
                                          <td>{year.sales?.toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Simple Bar Chart */}
                                <div className="simple-chart">
                                  <h4>Sales by Year</h4>
                                  <div className="chart-bars">
                                    {pred.yearly_data.map((year, i) => {
                                      const maxSales = Math.max(...pred.yearly_data.map(y => y.sales));
                                      const percentage = (year.sales / maxSales) * 100;
                                      return (
                                        <div key={i} className="chart-bar-item">
                                          <div className="chart-bar-label">{year.year}</div>
                                          <div className="chart-bar-container">
                                            <div 
                                              className="chart-bar-fill" 
                                              style={{ width: `${percentage}%` }}
                                            >
                                              <span className="chart-bar-value">{year.sales?.toFixed(0)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            {state.predictionMode === 'last_n_months' && pred.monthly_data && (
                              <div className="data-breakdown">
                                <h4>📊 Monthly Breakdown (Last {state.selectedMonths} Months)</h4>
                                <div className="breakdown-table-container">
                                  <table className="breakdown-table">
                                    <thead>
                                      <tr>
                                        <th>Date</th>
                                        <th>Year</th>
                                        <th>Month</th>
                                        <th>Units Sold</th>
                                        <th>Sales Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pred.monthly_data.map((month, i) => (
                                        <tr key={i}>
                                          <td>{month.date}</td>
                                          <td>{month.year}</td>
                                          <td>{month.month}</td>
                                          <td>{month.units}</td>
                                          <td>{month.sales?.toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Simple Line Chart */}
                                <div className="simple-chart">
                                  <h4>Sales Trend</h4>
                                  <div className="chart-bars">
                                    {pred.monthly_data.map((month, i) => {
                                      const maxSales = Math.max(...pred.monthly_data.map(m => m.sales));
                                      const percentage = (month.sales / maxSales) * 100;
                                      return (
                                        <div key={i} className="chart-bar-item">
                                          <div className="chart-bar-label">{month.month}/{month.year}</div>
                                          <div className="chart-bar-container">
                                            <div 
                                              className="chart-bar-fill" 
                                              style={{ width: `${percentage}%` }}
                                            >
                                              <span className="chart-bar-value">{month.sales?.toFixed(0)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More Button for Results */}
          {hasMoreResults && (
            <div className="load-more-results">
              <button className="btn-load-more" onClick={handleLoadMoreResults}>
                 Load More Results ({paginatedResults.length} of {state.predictionResults.length})
              </button>
            </div>
          )}

          {!hasMoreResults && state.predictionResults.length > 50 && (
            <div className="all-loaded-message">
              ✅ All {state.predictionResults.length} predictions displayed
            </div>
          )}
        </div>
      )}

      {/* Data Table View */}
      {!state.predictionMode && (
        <>
          {state.loading && state.currentPage === 1 ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading predictions...</p>
            </div>
          ) : (
            <>
              <ProductsTable
                products={processedProducts}
                expandedId={state.expandedId}
                onToggleExpand={handleToggleExpand}
                predictionDate={state.predictionDate}
              />
              
              {/* Infinite Scroll Indicator */}
              {state.hasMore && !state.loading && (
                <div ref={observerTarget} className="infinite-scroll-trigger">
                  {state.isLoadingMore ? (
                    <div className="loading-more">
                      <div className="loading-spinner-small"></div>
                      <p>Loading more records...</p>
                    </div>
                  ) : (
                    <div className="scroll-sentinel">
                      <p style={{ color: '#475569', fontSize: '0.75rem' }}>
                        Scroll down to load more • {state.predictions.length} of {state.totalRecords} loaded
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* All Loaded Message */}
              {!state.hasMore && state.predictions.length > 0 && (
                <div className="all-loaded-message">
                  ✅ All {state.totalRecords} records loaded
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default BulkPrediction;
