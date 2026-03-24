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
    
    case 'SET_PREDICTION_DATE':
      return { ...state, predictionDate: action.payload };
    
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
    
    default:
      return state;
  }
};

const BulkPrediction = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Fetch predictions
  const fetchPredictions = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const result = await predictionService.getBulkPredictions(state.predictionDate);
      
      if (result && result.predictions) {
        // Process each prediction
        const processed = result.predictions.map(processPrediction);
        dispatch({ type: 'SET_PREDICTIONS', payload: processed });
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
    fetchPredictions();
  }, [fetchPredictions]);

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

  const handleExport = useCallback(() => {
    predictionService.exportToCSV(
      processedProducts,
      `predictions_${state.predictionDate}.csv`
    );
  }, [processedProducts, state.predictionDate]);

  const handleRefresh = useCallback(() => {
    fetchPredictions();
  }, [fetchPredictions]);

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
        totalItems={state.predictions.length}
        filteredItems={processedProducts.length}
      />

      {state.loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading predictions...</p>
        </div>
      ) : (
        <ProductsTable
          products={processedProducts}
          expandedId={state.expandedId}
          onToggleExpand={handleToggleExpand}
          predictionDate={state.predictionDate}
        />
      )}
    </div>
  );
};

export default BulkPrediction;
