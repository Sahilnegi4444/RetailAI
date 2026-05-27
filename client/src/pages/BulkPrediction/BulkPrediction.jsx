import React, { useReducer, useEffect, useMemo, useCallback } from 'react';
import SummaryCards from '../../components/BulkPrediction/SummaryCards';
import FiltersBar from '../../components/BulkPrediction/FiltersBar';
import ProductsTable from '../../components/BulkPrediction/ProductsTable';
import { predictionService } from '../../services/predictionService';
import { modelEvents } from '../../services/modelEvents';
import {
  processPrediction,
  filterPredictions,
  sortPredictions,
  calculateSummary,
  allocateBudget,
} from '../../utils/predictionHelpers';
import './BulkPrediction.css';

const getApiBase = () => {
  const devPorts = ['5173', '5174', '3000'];
  const isLocalDev = window.location.hostname === 'localhost' && devPorts.includes(window.location.port);
  return isLocalDev ? 'http://localhost:8002' : '/api';
};

// Initial state
const initialState = {
  predictions: [],
  loading: false,
  error: null,
  totalSummary: null, // Stores backend catalog-wide calculations
  predictionDate: new Date().toISOString().split('T')[0],
  expandedId: null,
  filters: {
    search: '',
    category: 'all',
    stockStatus: 'all',
    trend: 'all',
    sortBy: 'priority',
    sortOrder: 'asc',
    budgetStrategy: 'greedy', // greedy | by_category | by_group
  },
  // Budget filtering
  budget: null, // in rupees
  budgetFiltered: [],
  budgetSummary: null,
  // Pagination states
  currentPage: 1,
  hasMore: true,
  totalRecords: 0,
  isLoadingMore: false,
  // Prediction states
  predictionMode: null,
  predictionResults: [],
  predictionLoading: false,
  predictionProgress: null, // { current: 0, total: 0, percentage: 0 }
  showFutureAggregateModal: false,
  selectedMonths: 3,
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
    
    case 'SET_PREDICTIONS': {
      const predictions = Array.isArray(action.payload) 
        ? action.payload 
        : (action.payload?.predictions || []);
      const summary = Array.isArray(action.payload)
        ? null
        : (action.payload?.summary || null);
      return { 
        ...state, 
        predictions, 
        totalSummary: summary,
        loading: false, 
        error: null 
      };
    }
    
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
    
    case 'SET_PREDICTION_PROGRESS':
      return { ...state, predictionProgress: action.payload };
    
    case 'TOGGLE_MODAL':
      return { ...state, [action.payload.key]: action.payload.value };
    
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    
    case 'SET_SELECTED_MONTHS':
      return { ...state, selectedMonths: action.payload };
    
    case 'CLEAR_PREDICTION_RESULTS':
      return { ...state, predictionResults: [], predictionMode: null, resultsPage: 1, expandedResultId: null, predictionProgress: null };
    
    case 'LOAD_MORE_RESULTS':
      return { ...state, resultsPage: state.resultsPage + 1 };
    
    case 'TOGGLE_RESULT_EXPAND':
      return { ...state, expandedResultId: state.expandedResultId === action.payload ? null : action.payload };
    
    case 'SET_BUDGET':
      return { ...state, budget: action.payload, budgetFiltered: [], budgetSummary: null };
    
    case 'SET_BUDGET_FILTERED':
      return { ...state, budgetFiltered: action.payload.items, budgetSummary: action.payload.summary };
    
    default:
      return state;
  }
};

const BulkPrediction = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const observerTarget = React.useRef(null);
  const requestLockRef = React.useRef(false);

  // Auto-refresh when model is retrained
  useEffect(() => {
    const unsub = modelEvents.onModelRetrained(() => {
      console.log('[BULK PREDICTION] 🔔 Model retrained — reloading predictions');
      dispatch({ type: 'SET_PREDICTIONS', payload: [] });
      fetchPredictions(1);
    });
    return unsub;
  }, []);

  // Fetch predictions with pagination
  const fetchPredictions = useCallback(async (page = 1, categoryOverride = null) => {
    if (page === 1) {
      dispatch({ type: 'SET_LOADING', payload: true });
    } else {
      dispatch({ type: 'SET_LOADING_MORE', payload: true });
    }
    
    try {
      const categoryToUse = categoryOverride !== null ? categoryOverride : state.filters.category;
      // Use /api proxy when running behind nginx (Docker), direct localhost for local dev
      const apiBase = getApiBase();
      const url = `${apiBase}/predict-paginated?page=${page}&page_size=50`;
      const body = { 
        prediction_date: state.predictionDate,
        category: categoryToUse,
        search: state.filters.search || null,
        stock_status: state.filters.stockStatus || null,
        trend: state.filters.trend || null,
        sort_by: state.filters.sortBy || null,
        sort_order: state.filters.sortOrder || null
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
 
      clearTimeout(timeoutId);
 
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
 
      const result = await response.json();
      
      if (result && Array.isArray(result.predictions)) {
        const targetMonthVal = state.predictionDate ? new Date(state.predictionDate).getMonth() + 1 : null;
        const processed = result.predictions
          .map(p => processPrediction(p, targetMonthVal))
          .filter(p => p !== null);
        
        if (page === 1) {
          dispatch({ 
            type: 'SET_PREDICTIONS', 
            payload: { 
              predictions: processed, 
              summary: result.summary 
            } 
          });
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
      if (error.name === 'AbortError') {
        dispatch({ type: 'SET_ERROR', payload: 'Request timed out after 10 minutes' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    }
  }, [state.predictionDate, state.filters]);

  // Load predictions on mount and when date or filters change
  useEffect(() => {
    dispatch({ type: 'SET_PREDICTIONS', payload: [] });
    // Reset page pagination
    dispatch({
      type: 'SET_PAGINATION',
      payload: { page: 1, hasMore: true, total: 0 }
    });
    fetchPredictions(1);
  }, [
    state.predictionDate, 
    state.filters.search, 
    state.filters.category, 
    state.filters.stockStatus, 
    state.filters.trend, 
    state.filters.sortBy, 
    state.filters.sortOrder,
    fetchPredictions
  ]);

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

  // Shifting infinite scroll filtering/sorting to the backend
  const processedProducts = useMemo(() => {
    return state.predictions;
  }, [state.predictions]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (state.totalSummary) {
      return state.totalSummary;
    }
    try {
      if (!processedProducts || !Array.isArray(processedProducts)) {
        return calculateSummary([]);
      }
      return calculateSummary(processedProducts);
    } catch (err) {
      console.error('Summary calculation failed:', err);
      return calculateSummary([]);
    }
  }, [processedProducts, state.totalSummary]);

  // Smart budget filtering - prioritize by demand
  const budgetFilteredProducts = useMemo(() => {
    if (!state.budget || state.budget <= 0) return { items: processedProducts, summary: null };
    return allocateBudget(processedProducts, state.budget, state.filters.budgetStrategy);
  }, [processedProducts, state.budget, state.filters.budgetStrategy]);

  // Handlers
  const handleFilterChange = useCallback((key, value) => {
    dispatch({ type: 'UPDATE_FILTER', payload: { key, value } });
    // Reset predictions and pagination, which reactive useEffect will pick up to load page 1
    dispatch({ type: 'SET_PREDICTIONS', payload: [] });
  }, []);

  const handleBudgetChange = useCallback((budget) => {
    dispatch({ type: 'SET_BUDGET', payload: budget });
  }, []);

  const handleDateChange = useCallback((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    
    const diffMonths = (selectedDate.getFullYear() - today.getFullYear()) * 12 + (selectedDate.getMonth() - today.getMonth());
    
    if (diffMonths > 10) {
      alert("only 10 monehts of prediction can be predicted.");
      return;
    }
    
    if (diffMonths < 0) {
      const confirmProceed = window.confirm("you are viewing the old results form the database");
      if (!confirmProceed) {
        return;
      }
    }
    
    dispatch({ type: 'SET_PREDICTION_DATE', payload: date });
  }, []);

  const handleToggleExpand = useCallback((itemName) => {
    dispatch({
      type: 'SET_EXPANDED_ID',
      payload: state.expandedId === itemName ? null : itemName,
    });
  }, [state.expandedId]);

  const handleExport = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 1. BULK EXPORT from backend for all products (now includes budget support)
      // This ensures all model features are included as requested by the user
      predictionService.exportFullAnalysisCSV(
        state.predictionDate, 
        state.filters,
        state.budget,
        state.filters.budgetStrategy
      );
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Export failed:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      alert('Export failed: ' + error.message);
    }
  }, [state.predictionDate, state.budget, state.filters]);

  const handleRefresh = useCallback(() => {
    fetchPredictions(1);
  }, [fetchPredictions]);

  // Previous Years Prediction
  const abortControllerRef = React.useRef(null);

  const handlePredictFutureAggregate = useCallback(async () => {
    if (state.predictionLoading) return;
    dispatch({ type: 'SET_PREDICTION_LOADING', payload: true });
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      let allItems = state.predictions.map(d => d.item_name).filter(Boolean);
      
      if (state.hasMore) {
        const result = await predictionService.getBulkPredictions(state.predictionDate);
        allItems = (result.predictions || []).map(p => p.item_name).filter(Boolean);
      }

      const result = await predictionService.getFutureAggregatePredictions(
        state.predictionDate, 
        state.selectedMonths,
        allItems
      );
      
      dispatch({
        type: 'SET_PREDICTION_RESULTS',
        payload: { results: result.predictions, mode: 'bulk_order' }
      });
      dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showFutureAggregateModal', value: false } });
    } catch (error) {
      if (error.name !== 'AbortError') alert('Prediction failed: ' + error.message);
    } finally {
      dispatch({ type: 'SET_PREDICTION_LOADING', payload: false });
      abortControllerRef.current = null;
    }
  }, [state.predictions, state.selectedMonths, state.hasMore, state.predictionDate]);

  // Paginated prediction results with frontend filtering
  const filteredPredictionResults = useMemo(() => {
    let results = state.predictionResults;

    // Apply search filter
    if (state.filters.search) {
      const searchLower = state.filters.search.toLowerCase();
      results = results.filter(item => 
        item.item_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (state.filters.category !== 'all') {
      const catFilter = state.filters.category;
      if (catFilter === 'Grocery I') {
        results = results.filter(item => item.category === 'Grocery' && item.group === 'I');
      } else if (catFilter === 'Grocery II') {
        results = results.filter(item => item.category === 'Grocery' && item.group === 'II');
      } else if (catFilter === 'Grocery III') {
        results = results.filter(item => item.category === 'Grocery' && item.group === 'III');
      } else if (catFilter === 'Grocery IV') {
        results = results.filter(item => item.category === 'Grocery' && item.group === 'IV');
      } else if (catFilter === 'Grocery V') {
        results = results.filter(item => item.category === 'Grocery' && item.group === 'V');
      } else if (catFilter === 'Liquor') {
        results = results.filter(item => item.category === 'Liquor' || item.group === 'VI');
      } else {
        results = results.filter(item => item.category === catFilter);
      }
    }

    // Apply budget filter for prediction results
    if (state.budget && state.budget > 0) {
      // Sort by demand (final_prediction or units)
      results = [...results].sort((a, b) => {
        const demandA = a.units || a.final_prediction || 0;
        const demandB = b.units || b.final_prediction || 0;
        return demandB - demandA;
      });

      // Select items within budget
      let totalCost = 0;
      const selected = [];
      for (const item of results) {
        const itemCost = (item.units || item.final_prediction || 0) * (item.price || 0);
        if (totalCost + itemCost <= state.budget) {
          selected.push(item);
          totalCost += itemCost;
        }
      }
      results = selected;
    }

    // Apply sorting
    if (state.filters.sortBy === 'name') {
      results = [...results].sort((a, b) => 
        a.item_name.localeCompare(b.item_name)
      );
    } else if (state.filters.sortBy === 'demand') {
      results = [...results].sort((a, b) => 
        (b.units || b.final_prediction || 0) - (a.units || a.final_prediction || 0)
      );
    }

    // Apply sort order
    if (state.filters.sortOrder === 'desc') {
      results = [...results].reverse();
    }

    return results;
  }, [state.predictionResults, state.filters, state.budget]);

  const paginatedResults = useMemo(() => {
    const endIndex = state.resultsPage * state.resultsPageSize;
    return filteredPredictionResults.slice(0, endIndex);
  }, [filteredPredictionResults, state.resultsPage, state.resultsPageSize]);

  const hasMoreResults = useMemo(() => {
    return paginatedResults.length < filteredPredictionResults.length;
  }, [paginatedResults.length, filteredPredictionResults.length]);

  // Export prediction results
  const exportPredictionResults = useCallback(() => {
    if (filteredPredictionResults.length === 0) {
      alert('No prediction results to export');
      return;
    }

    const rows = [];
    rows.push(['--- Product Details ---']);
    
    const isBulkOrder = state.predictionMode === 'bulk_order';

    // Define headers to match predictions data exactly
    const headers = [
      'Group',
      'Product Name', 
      'Predicted Demand', 
      'Avg Price (₹)',
      'Item ID',
      'Category',
      'Current Stock', 
      'Purchase Price (₹)', 
      'Demand Cost (₹)',
      'Predicted Demand Value (₹)',
      'Order Qty',
      'Order Cost (₹)',
      'Potential Profit (₹)'
    ];
    if (!isBulkOrder) {
      headers.push('Trend');
      headers.push('Growth Rate');
    }
    rows.push(headers);
    
    let totalSoldSum = 0;
    let totalCostSum = 0;
    let totalRevenueSum = 0;
    let totalProfitSum = 0;
    let totalOrderQtySum = 0;
    let totalOrderCostSum = 0;

    filteredPredictionResults.forEach(pred => {
      const demand = Math.round(pred.final_prediction || pred.prediction || 0);
      const salesPrice = pred.price || 0;
      const purchasePrice = pred.purchase_price || 0;
      const expectedRevenue = demand * salesPrice;
      const expectedCost = demand * purchasePrice;
      const expectedProfit = expectedRevenue - expectedCost;
      
      const recommendedOrder = pred.recommended_order || 0;
      const orderCostValue = recommendedOrder * purchasePrice;

      totalSoldSum += demand;
      totalCostSum += expectedCost;
      totalRevenueSum += expectedRevenue;
      totalProfitSum += expectedProfit;
      totalOrderQtySum += recommendedOrder;
      totalOrderCostSum += orderCostValue;

      const row = [
        pred.group || 'II',
        pred.item_name,
        demand,
        salesPrice.toFixed(2),
        pred.item_id || 'N/A',
        pred.category || 'N/A',
        pred.current_stock || 0,
        purchasePrice.toFixed(2),
        expectedCost.toFixed(2),
        expectedRevenue.toFixed(2),
        recommendedOrder,
        orderCostValue.toFixed(2),
        expectedProfit.toFixed(2)
      ];
      if (!isBulkOrder) {
        row.push(pred.trend || 'stable');
        row.push(`${((pred.growth_rate || 0) * 100).toFixed(1)}%`);
      }
      rows.push(row);
    });

    const totalRow = [
      'TOTAL',
      'All Products Summary',
      totalSoldSum,
      '',
      '',
      '',
      '',
      '',
      totalCostSum.toFixed(2),
      totalRevenueSum.toFixed(2),
      totalOrderQtySum,
      totalOrderCostSum.toFixed(2),
      totalProfitSum.toFixed(2)
    ];
    if (!isBulkOrder) {
      totalRow.push('');
      totalRow.push('');
    }
    rows.push(totalRow);

    const csv = rows.map(row => 
      row.map(cell => {
        const str = String(cell).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    ).join('\n');

    // Add UTF-8 BOM for Excel Rupee symbol support
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bulk_order_forecast_${state.selectedMonths}m_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredPredictionResults, state.selectedMonths, state.predictionDate]);

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

      {summary && <SummaryCards summary={summary} loading={state.loading} />}

      <FiltersBar
        filters={state.filters}
        onFilterChange={handleFilterChange}
        onExport={handleExport}
        predictionDate={state.predictionDate}
        onDateChange={handleDateChange}
        totalItems={state.totalRecords || state.predictions.length}
        filteredItems={state.budget && state.budget > 0 ? budgetFilteredProducts.items.length : processedProducts.length}
        budget={state.budget}
        onBudgetChange={handleBudgetChange}
        budgetSummary={budgetFilteredProducts.summary}
      />

      {/* Prediction Buttons */}
      {!state.predictionMode && (
        <div className="prediction-actions">
          <button 
            className="prediction-btn aggregate-btn"
            style={{ 
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              padding: '1.25rem 2rem',
              fontSize: '1.25rem',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
            }}
            onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showFutureAggregateModal', value: true } })}
            disabled={state.predictions.length === 0}
          >
            🚀 Bulk Order Forecast (Next {state.selectedMonths} Months)
          </button>
        </div>
      )}

      {state.showFutureAggregateModal && (
        <div className="modal-overlay" onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showFutureAggregateModal', value: false } })}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🚀 Bulk Order Planning</h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Generate aggregate demand for multiple future months to streamline bulk procurement.</p>
            
            <div className="modal-input-group">
              <label htmlFor="months-count">Aggregate Period (Months):</label>
              <div className="month-spinner">
                <button 
                  className="spinner-btn"
                  onClick={() => dispatch({ type: 'SET_SELECTED_MONTHS', payload: Math.max(1, state.selectedMonths - 1) })}
                  disabled={state.predictionLoading}
                >−
                </button>
                <input
                  id="months-count"
                  type="number"
                  min="1"
                  max="10"
                  value={state.selectedMonths}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    if (val > 10) {
                      alert("only 10 monehts of prediction can be predicted.");
                      dispatch({ type: 'SET_SELECTED_MONTHS', payload: 10 });
                    } else {
                      dispatch({ type: 'SET_SELECTED_MONTHS', payload: Math.max(1, val) });
                    }
                  }}
                  className="month-input"
                  disabled={state.predictionLoading}
                />
                <button 
                  className="spinner-btn"
                  onClick={() => {
                    const nextVal = state.selectedMonths + 1;
                    if (nextVal > 10) {
                      alert("only 10 monehts of prediction can be predicted.");
                      dispatch({ type: 'SET_SELECTED_MONTHS', payload: 10 });
                    } else {
                      dispatch({ type: 'SET_SELECTED_MONTHS', payload: nextVal });
                    }
                  }}
                  disabled={state.predictionLoading}
                >+
                </button>
              </div>
            </div>
            
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button 
                className="btn-primary"
                onClick={handlePredictFutureAggregate}
                disabled={state.predictionLoading}
                style={{ flex: 2 }}
              >
                {state.predictionLoading ? '⏳ Generating Bulk Plan...' : '✨ Generate Forecast'}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showFutureAggregateModal', value: false } })}
                style={{ flex: 1 }}
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
              🚀 Bulk Order Forecast (Next {state.selectedMonths} Months)
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
            Showing {paginatedResults.length} of {filteredPredictionResults.length} predictions {state.budget && state.budget > 0 ? `(Budget: ₹${state.budget.toLocaleString()})` : ''}
          </div>

          <div className="prediction-results-table-container">
            <table className="prediction-results-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Aggregate Demand</th>
                  <th>Unit Price (₹)</th>
                  <th>Total Cost (₹)</th>
                  <th>Order Qty</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((pred, idx) => {
                  const demand = Math.round(pred.final_prediction || pred.prediction || 0);
                  const salesPrice = pred.price || 0;
                  const purchasePrice = pred.purchase_price || 0;
                  const orderCost = demand * purchasePrice;
                  const expectedRevenue = demand * salesPrice;
                  const expectedProfit = expectedRevenue - orderCost;
                  const profitMargin = purchasePrice > 0 ? ((salesPrice - purchasePrice) / purchasePrice) * 100 : 0;
                  return (
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
                      <td><span className="category-badge">{pred.category || 'N/A'}</span></td>
                      <td className="prediction-cell" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{demand.toLocaleString('en-IN')} units</td>
                      <td>₹{salesPrice.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#10b981' }}>₹{Math.round(orderCost).toLocaleString('en-IN')}</td>
                      <td>{(pred.recommended_order || demand).toLocaleString('en-IN')}</td>
                    </tr>
                    {state.expandedResultId === pred.item_name && (
                      <tr className="expanded-row">
                        <td colSpan="7">
                          <div className="prediction-details-panel">
                            <h3>📊 {pred.item_name} - Bulk Order Summary</h3>
                            
                            <div className="stats-summary">
                              <div className="stat-card">
                                <div className="stat-label">Months Covered</div>
                                <div className="stat-value">{pred.n_months || state.selectedMonths}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Total Demand</div>
                                <div className="stat-value">{demand.toLocaleString('en-IN')} units</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Avg/Month</div>
                                <div className="stat-value">{Math.round(demand / (pred.n_months || state.selectedMonths)).toLocaleString('en-IN')} units</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Total Order Cost</div>
                                <div className="stat-value">₹{Math.round(orderCost).toLocaleString('en-IN')}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Total Revenue</div>
                                <div className="stat-value" style={{ color: '#3b82f6' }}>₹{Math.round(expectedRevenue).toLocaleString('en-IN')}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Expected Profit</div>
                                <div className="stat-value" style={{ color: '#10b981' }}>₹{Math.round(expectedProfit).toLocaleString('en-IN')}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Profit Margin</div>
                                <div className="stat-value">{profitMargin.toFixed(1)}%</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Sales Price</div>
                                <div className="stat-value">₹{salesPrice.toFixed(2)}</div>
                              </div>
                              <div className="stat-card">
                                <div className="stat-label">Purchase Price</div>
                                <div className="stat-value">₹{purchasePrice.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
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

          {!hasMoreResults && filteredPredictionResults.length > 50 && (
            <div className="all-loaded-message">
              ✅ All {filteredPredictionResults.length} predictions displayed
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
                products={state.budget && state.budget > 0 ? budgetFilteredProducts.items : processedProducts}
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
