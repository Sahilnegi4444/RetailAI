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
      if (error.name === 'AbortError') {
        dispatch({ type: 'SET_ERROR', payload: 'Request timed out after 10 minutes' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
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

  // Smart budget filtering - prioritize by demand
  const budgetFilteredProducts = useMemo(() => {
    if (!state.budget || state.budget <= 0) {
      return { items: processedProducts, summary: null };
    }

    // Sort by demand (final_prediction) descending to prioritize high-demand items
    const sorted = [...processedProducts].sort((a, b) => 
      (b.final_prediction || 0) - (a.final_prediction || 0)
    );

    let totalCost = 0;
    const selected = [];
    const summary = {
      budget: state.budget,
      spent: 0,
      remaining: state.budget,
      itemsSelected: 0,
      itemsSkipped: 0,
      totalDemand: 0,
      totalRevenue: 0,
    };

    for (const item of sorted) {
      const itemCost = (item.final_prediction || 0) * (item.price || 0);
      
      if (totalCost + itemCost <= state.budget) {
        selected.push(item);
        totalCost += itemCost;
        summary.spent = totalCost;
        summary.remaining = state.budget - totalCost;
        summary.itemsSelected += 1;
        summary.totalDemand += item.final_prediction || 0;
        summary.totalRevenue += itemCost;
      } else {
        summary.itemsSkipped += 1;
      }
    }

    return { items: selected, summary };
  }, [processedProducts, state.budget]);

  // Handlers
  const handleFilterChange = useCallback((key, value) => {
    dispatch({ type: 'UPDATE_FILTER', payload: { key, value } });
  }, []);

  const handleBudgetChange = useCallback((budget) => {
    dispatch({ type: 'SET_BUDGET', payload: budget });
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
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Fetch ALL data with raw predictions (10 minute timeout)
      const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-paginated?page=1&page_size=10000`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction_date: state.predictionDate }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      const allData = result.predictions || [];
      const processed = allData.map(processPrediction);

      // Determine which data to export
      const dataToExport = state.budget && state.budget > 0 
        ? budgetFilteredProducts.items 
        : processed;

      // Create enhanced export with historical data
      const enhancedData = dataToExport.map(item => ({
        'Item Name': item.item_name,
        'Category': item.category,
        'Final Prediction': item.final_prediction,
        'Trend': item.trend,
        'Current Stock': item.current_stock,
        'Recommended Order': item.recommended_order,
        'Price': item.price,
        'Confidence': item.confidence,
        'Stock Status': item.stock_status,
        // Historical data
        '2024 Total': item.year_2024_total || 0,
        '2025 Total': item.year_2025_total || 0,
        'Last 3 Months': item.last_3_months?.map(m => `${m.month_name}: ${m.sales}`).join(' | ') || 'N/A',
        // Budget info
        'Unit Cost': item.price,
        'Total Cost': (item.final_prediction || 0) * (item.price || 0),
      }));

      // Add summary row
      const summaryRow = {
        'Item Name': '=== SUMMARY ===',
        'Category': '',
        'Final Prediction': enhancedData.reduce((sum, row) => sum + (row['Final Prediction'] || 0), 0),
        'Trend': '',
        'Current Stock': enhancedData.reduce((sum, row) => sum + (row['Current Stock'] || 0), 0),
        'Recommended Order': enhancedData.reduce((sum, row) => sum + (row['Recommended Order'] || 0), 0),
        'Price': '',
        'Confidence': '',
        'Stock Status': '',
        '2024 Total': enhancedData.reduce((sum, row) => sum + (row['2024 Total'] || 0), 0),
        '2025 Total': enhancedData.reduce((sum, row) => sum + (row['2025 Total'] || 0), 0),
        'Last 3 Months': '',
        'Unit Cost': '',
        'Total Cost': enhancedData.reduce((sum, row) => sum + (row['Total Cost'] || 0), 0),
      };

      // Add budget summary if applicable
      if (state.budget && state.budget > 0 && budgetFilteredProducts.summary) {
        const budgetSummary = budgetFilteredProducts.summary;
        const budgetRow = {
          'Item Name': '=== BUDGET SUMMARY ===',
          'Category': '',
          'Final Prediction': '',
          'Trend': '',
          'Current Stock': '',
          'Recommended Order': '',
          'Price': `Budget: ₹${budgetSummary.budget.toLocaleString()}`,
          'Confidence': `Spent: ₹${budgetSummary.spent.toLocaleString()}`,
          'Stock Status': `Remaining: ₹${budgetSummary.remaining.toLocaleString()}`,
          '2024 Total': `Items Selected: ${budgetSummary.itemsSelected}`,
          '2025 Total': `Items Skipped: ${budgetSummary.itemsSkipped}`,
          'Last 3 Months': `Total Demand: ${budgetSummary.totalDemand}`,
          'Unit Cost': '',
          'Total Cost': `Total Revenue: ₹${budgetSummary.totalRevenue.toLocaleString()}`,
        };
        enhancedData.push(budgetRow);
      }

      enhancedData.push(summaryRow);

      // Export to CSV
      predictionService.exportToCSV(
        enhancedData,
        `predictions_${state.predictionDate}${state.budget ? '_budget' : ''}.csv`
      );
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Export failed:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      if (error.name === 'AbortError') {
        alert('Export timed out. Please try with fewer items or contact support.');
      } else {
        alert('Export failed: ' + error.message);
      }
    }
  }, [state.predictionDate, state.budget, budgetFilteredProducts]);

  const handleRefresh = useCallback(() => {
    fetchPredictions(1);
  }, [fetchPredictions]);

  // Previous Years Prediction
  const abortControllerRef = React.useRef(null);

  const handlePredictPreviousYears = useCallback(async () => {
    // Prevent double-clicks
    if (state.predictionLoading) {
      console.log('[PREDICTION] Already loading, ignoring click');
      return;
    }
    
    dispatch({ type: 'SET_PREDICTION_LOADING', payload: true });
    
    // Create NEW abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    let timeoutId = null;
    
    try {
      // Fetch ALL items first if not all loaded
      let allItems = state.predictions.map(d => d.item_name);
      
      if (state.hasMore) {
        console.log('[PREDICTION] Fetching all items for prediction...');
        const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-paginated?page=1&page_size=10000`;
        
        const controller1 = new AbortController();
        const timeoutId1 = setTimeout(() => controller1.abort(), 600000); // 10 minutes
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prediction_date: state.predictionDate }),
          signal: controller1.signal
        });
        
        clearTimeout(timeoutId1);
        
        if (!response.ok) throw new Error(`Failed to fetch items: ${response.status}`);
        
        const result = await response.json();
        allItems = (result.predictions || []).map(p => p.item_name);
        console.log('[PREDICTION] Fetched all items:', allItems.length);
      }

      // Fetch predictions in pages of 50 items
      const pageSize = 50;
      const totalPages = Math.ceil(allItems.length / pageSize);
      let allPredictions = [];
      
      console.log(`[PREDICTION] Fetching ${totalPages} pages of predictions...`);
      
      for (let page = 1; page <= totalPages; page++) {
        if (controller.signal.aborted) {
          throw new DOMException('Request was cancelled', 'AbortError');
        }
        
        // Update progress
        dispatch({
          type: 'SET_PREDICTION_PROGRESS',
          payload: {
            current: (page - 1) * pageSize,
            total: allItems.length,
            percentage: Math.round(((page - 1) / totalPages) * 100)
          }
        });
        
        const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-previous-years?page=${page}&page_size=${pageSize}`;
        
        console.log(`[PREDICTION] Fetching page ${page}/${totalPages}...`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: allItems, target_date: state.selectedDate }),
          signal: controller.signal
        });

        if (!response.ok) throw new Error(`Prediction failed on page ${page}: ${response.status}`);
        
        const result = await response.json();
        allPredictions = allPredictions.concat(result.predictions || []);
        
        console.log(`[PREDICTION] Page ${page}/${totalPages} complete, total predictions: ${allPredictions.length}`);
      }
      
      if (timeoutId) clearTimeout(timeoutId);
      
      console.log('[PREDICTION] All pages fetched, total predictions:', allPredictions.length);
      
      if (allPredictions.length === 0) {
        throw new Error('No predictions returned from server');
      }
      
      console.log('[PREDICTION] Success! Dispatching results');
      dispatch({
        type: 'SET_PREDICTION_RESULTS',
        payload: { results: allPredictions, mode: 'previous_years' }
      });
      dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showPreviousYearsModal', value: false } });
    } catch (error) {
      console.error('[PREDICTION] Error caught:', error.name, error.message);
      if (timeoutId) clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.log('[PREDICTION] Request was aborted');
        alert('Prediction was cancelled.');
      } else {
        alert('Prediction failed: ' + error.message);
      }
    } finally {
      console.log('[PREDICTION] Cleaning up, setting loading to false');
      dispatch({ type: 'SET_PREDICTION_LOADING', payload: false });
      dispatch({ type: 'SET_PREDICTION_PROGRESS', payload: null });
      abortControllerRef.current = null;
    }
  }, [state.predictions, state.selectedDate, state.hasMore, state.predictionDate, state.predictionLoading]);

  // Last N Months Prediction
  const handlePredictLastNMonths = useCallback(async () => {
    // Prevent double-clicks
    if (state.predictionLoading) {
      console.log('[PREDICTION] Already loading, ignoring click');
      return;
    }
    
    dispatch({ type: 'SET_PREDICTION_LOADING', payload: true });
    
    // Create NEW abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    let timeoutId = null;
    
    try {
      // Fetch ALL items first if not all loaded
      let allItems = state.predictions.map(d => d.item_name);
      
      if (state.hasMore) {
        console.log('[PREDICTION] Fetching all items for prediction...');
        const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-paginated?page=1&page_size=10000`;
        
        const controller1 = new AbortController();
        const timeoutId1 = setTimeout(() => controller1.abort(), 600000); // 10 minutes
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prediction_date: state.predictionDate }),
          signal: controller1.signal
        });
        
        clearTimeout(timeoutId1);
        
        if (!response.ok) throw new Error(`Failed to fetch items: ${response.status}`);
        
        const result = await response.json();
        allItems = (result.predictions || []).map(p => p.item_name);
        console.log('[PREDICTION] Fetched all items:', allItems.length);
      }

      // Fetch predictions in pages of 50 items
      const pageSize = 50;
      const totalPages = Math.ceil(allItems.length / pageSize);
      let allPredictions = [];
      
      console.log(`[PREDICTION] Fetching ${totalPages} pages of predictions...`);
      
      for (let page = 1; page <= totalPages; page++) {
        if (controller.signal.aborted) {
          throw new DOMException('Request was cancelled', 'AbortError');
        }
        
        // Update progress
        dispatch({
          type: 'SET_PREDICTION_PROGRESS',
          payload: {
            current: (page - 1) * pageSize,
            total: allItems.length,
            percentage: Math.round(((page - 1) / totalPages) * 100)
          }
        });
        
        const url = `${window.location.port === '5016' ? '/api' : 'http://localhost:8001'}/predict-last-n-months?page=${page}&page_size=${pageSize}`;
        
        console.log(`[PREDICTION] Fetching page ${page}/${totalPages}...`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: allItems, n_months: state.selectedMonths }),
          signal: controller.signal
        });

        if (!response.ok) throw new Error(`Prediction failed on page ${page}: ${response.status}`);
        
        const result = await response.json();
        allPredictions = allPredictions.concat(result.predictions || []);
        
        console.log(`[PREDICTION] Page ${page}/${totalPages} complete, total predictions: ${allPredictions.length}`);
      }
      
      if (timeoutId) clearTimeout(timeoutId);
      
      console.log('[PREDICTION] All pages fetched, total predictions:', allPredictions.length);
      
      if (allPredictions.length === 0) {
        throw new Error('No predictions returned from server');
      }
      
      console.log('[PREDICTION] Success! Dispatching results');
      dispatch({
        type: 'SET_PREDICTION_RESULTS',
        payload: { results: allPredictions, mode: 'last_n_months' }
      });
      dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showLastNMonthsModal', value: false } });
    } catch (error) {
      console.error('[PREDICTION] Error caught:', error.name, error.message);
      if (timeoutId) clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.log('[PREDICTION] Request was aborted');
        alert('Prediction was cancelled.');
      } else {
        alert('Prediction failed: ' + error.message);
      }
    } finally {
      console.log('[PREDICTION] Cleaning up, setting loading to false');
      dispatch({ type: 'SET_PREDICTION_LOADING', payload: false });
      dispatch({ type: 'SET_PREDICTION_PROGRESS', payload: null });
      abortControllerRef.current = null;
    }
  }, [state.predictions, state.selectedMonths, state.hasMore, state.predictionDate, state.predictionLoading]);

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
        filteredItems={state.budget && state.budget > 0 ? budgetFilteredProducts.items.length : processedProducts.length}
        budget={state.budget}
        onBudgetChange={handleBudgetChange}
        budgetSummary={budgetFilteredProducts.summary}
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
                disabled={state.predictionLoading}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn-primary"
                onClick={handlePredictPreviousYears}
                disabled={state.predictionLoading}
              >
                {state.predictionLoading ? (
                  state.predictionProgress ? (
                    `⏳ Processing ${state.predictionProgress.current}/${state.predictionProgress.total} (${state.predictionProgress.percentage}%)`
                  ) : (
                    '⏳ Generating...'
                  )
                ) : (
                  '✨ Generate Prediction'
                )}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                  dispatch({ type: 'SET_PREDICTION_LOADING', payload: false });
                  dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showPreviousYearsModal', value: false } });
                }}
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
                  disabled={state.predictionLoading}
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
                  disabled={state.predictionLoading}
                />
                <button 
                  className="spinner-btn"
                  onClick={() => dispatch({ type: 'SET_SELECTED_MONTHS', payload: Math.min(24, state.selectedMonths + 1) })}
                  disabled={state.predictionLoading}
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
                {state.predictionLoading ? (
                  state.predictionProgress ? (
                    `⏳ Processing ${state.predictionProgress.current}/${state.predictionProgress.total} (${state.predictionProgress.percentage}%)`
                  ) : (
                    '⏳ Generating...'
                  )
                ) : (
                  '✨ Generate Prediction'
                )}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                  dispatch({ type: 'SET_PREDICTION_LOADING', payload: false });
                  dispatch({ type: 'TOGGLE_MODAL', payload: { key: 'showLastNMonthsModal', value: false } });
                }}
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
