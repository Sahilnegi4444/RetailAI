import React, { useState, useEffect } from "react";
import { getBulkPrediction, getBulkPredictionPaginated, getStores } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import "./BulkPrediction.css";

// Export utility functions
const exportToCSV = (data, filename) => {
  const csv = convertToCSV(data);
  downloadCSV(csv, filename);
};

const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = ('' + value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper function to calculate status based on stock vs demand
const calculateStatus = (currentStock, finalPrediction) => {
  if (currentStock < finalPrediction * 0.5) {
    return "CRITICAL";
  } else if (currentStock < finalPrediction) {
    return "LOW";
  } else if (currentStock < finalPrediction * 1.5) {
    return "ADEQUATE";
  } else {
    return "EXCESS";
  }
};

// Helper function to safely format numbers and handle NaN
const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return defaultValue;
  }
  return Number(value);
};

// Helper function to calculate consistent predictions
const calculateMonthlyPrediction = (product, predictionDate) => {
  const predictionMonth = new Date(predictionDate).getMonth();
  const baseMonthly = product.business_metrics?.avg_monthly_sales || product.final_prediction || 50;
  const trendFactor = product.business_metrics?.sales_trend === 'increasing' ? 1.05 : 
                     product.business_metrics?.sales_trend === 'decreasing' ? 0.95 : 1.0;
  
  let monthlySeasonalFactor = 1;
  let hasHistoricalData = false;
  
  if (product.last_4_weeks && product.last_4_weeks.length > 0) {
    const historicalMonth = product.last_4_weeks.find(h => {
      const hDate = new Date(h.date);
      return hDate.getMonth() === predictionMonth;
    });
    
    if (historicalMonth && historicalMonth.actual > 0) {
      hasHistoricalData = true;
      monthlySeasonalFactor = historicalMonth.actual / baseMonthly;
      monthlySeasonalFactor = Math.max(0.1, Math.min(2.0, monthlySeasonalFactor));
    }
  }
  
  if (!hasHistoricalData) {
    const hasAnySales = product.last_4_weeks && product.last_4_weeks.some(h => h.actual > 0);
    if (hasAnySales) {
      monthlySeasonalFactor = 0;
    } else {
      if ([9, 10, 11].includes(predictionMonth)) monthlySeasonalFactor = 1.2;
      else if ([5, 6, 7].includes(predictionMonth)) monthlySeasonalFactor = 0.8;
    }
  }
  
  let predictedSales;
  if (monthlySeasonalFactor === 0) {
    predictedSales = 0;
  } else {
    predictedSales = Math.round(baseMonthly * monthlySeasonalFactor * trendFactor);
  }
  
  return Math.max(0, predictedSales);
};

const BulkPrediction = () => {
  // Export filter states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    status: 'all',
    minPrice: '',
    maxPrice: '',
    minStock: '',
    maxStock: '',
    minDemand: '',
    maxDemand: '',
    category: 'all'
  });
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [predictionDate, setPredictionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [selectedYear, setSelectedYear] = useState('combined'); // Add state for year selection
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isSingleStore, setIsSingleStore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // Add search state
  const [categoryFilter, setCategoryFilter] = useState("all"); // Add category filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalPages, setTotalPages] = useState(0);
  const [allPredictions, setAllPredictions] = useState([]);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const data = await getStores();
      if (data.stores && data.stores.length > 0) {
        setStores(data.stores);
        setSelectedStore(data.stores[0]);
        
        // Check if single store and load categories for Model 2
        if (data.stores.length === 1) {
          setIsSingleStore(true);
          
          // Load categories for Model 2
          const selectedModel = localStorage.getItem("selectedModel");
          if (selectedModel === "secondary") {
            try {
              // Use Production API data-preview endpoint
              const baseURL = window.location.port === '5016' 
                ? '/api'  // Docker - use nginx proxy
                : 'http://localhost:8001';  // Local dev - direct to backend
              
              const response = await fetch(`${baseURL}/data-preview?limit=100`);
              const previewData = await response.json();
              
              if (previewData.records) {
                const uniqueItems = [...new Set(previewData.records.map(r => r.item_name))];
                setAvailableCategories([
                  { value: "all", label: "All Categories", count: uniqueItems.length },
                  { value: "grocery", label: "Grocery", count: Math.ceil(uniqueItems.length / 2) },
                  { value: "liquor", label: "Liquor", count: Math.floor(uniqueItems.length / 2) }
                ]);
              }
            } catch (error) {
              console.error("Failed to load categories:", error);
              setAvailableCategories([
                { value: "all", label: "All Categories", count: 0 },
                { value: "grocery", label: "Grocery", count: 0 },
                { value: "liquor", label: "Liquor", count: 0 }
              ]);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load stores:", error);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setExpandedProduct(null);
    setCurrentPage(1);
    try {
      const requestData = {
        store_id: selectedStore,
        prediction_date: predictionDate
      };
      
      // Add category filter for Model 2
      if (selectedCategory && selectedCategory !== "all") {
        requestData.category_filter = selectedCategory;
      }
      
      // Use paginated endpoint for better performance
      const data = await getBulkPredictionPaginated(selectedStore, predictionDate, 1, pageSize, requestData);
      
      console.log("📊 [BULK] Raw response:", data);
      console.log("📊 [BULK] Predictions count:", data.predictions?.length);
      console.log("📊 [BULK] Pagination:", data.pagination);
      
      // Check if there's an error in the response
      if (data.error) {
        setError(data.error);
        setResult(null);
        return;
      }
      
      // Ensure predictions array exists
      if (!data.predictions || !Array.isArray(data.predictions)) {
        setError("No predictions returned from API");
        setResult(null);
        return;
      }
      
      // Filter results by category if selected
      let predictions = data.predictions;
      if (selectedCategory && selectedCategory !== "all") {
        predictions = predictions.filter(p => 
          p.category && p.category.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
      
      // Store all predictions and pagination info
      setAllPredictions(predictions);
      setTotalPages(data.pagination?.total_pages || 1);
      
      // Build summary from predictions
      const summary = {
        total_products: predictions.length,
        critical_stock: predictions.filter(p => {
          const stock = p.current_stock || 0;
          const order = p.recommended_order || 0;
          return stock < order * 0.5;
        }).length,
        low_stock: predictions.filter(p => {
          const stock = p.current_stock || 0;
          const order = p.recommended_order || 0;
          return stock >= order * 0.5 && stock < order;
        }).length,
        adequate_stock: predictions.filter(p => {
          const stock = p.current_stock || 0;
          const order = p.recommended_order || 0;
          return stock >= order && stock < order * 1.5;
        }).length,
        excess_stock: predictions.filter(p => {
          const stock = p.current_stock || 0;
          const order = p.recommended_order || 0;
          return stock >= order * 1.5;
        }).length,
        total_order_value: predictions.reduce((sum, p) => {
          const price = p.price || 0;
          const order = p.recommended_order || 0;
          return sum + (price * order);
        }, 0),
        total_revenue_at_risk: predictions.reduce((sum, p) => {
          const price = p.price || 0;
          const stock = p.current_stock || 0;
          return sum + (price * stock);
        }, 0),
        currency: "₹"
      };
      
      setResult({
        prediction_date: data.prediction_date,
        summary: summary,
        predictions: predictions
      });
      
      console.log("📊 [BULK] Processed result:", { summary, predictions: predictions.length });
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Failed to generate predictions. Please check if the API is running.";
      setError(errorMsg);
      console.error("❌ [BULK] Bulk prediction error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "CRITICAL":
        return "#ef4444";
      case "LOW":
        return "#f59e0b";
      case "ADEQUATE":
        return "#10b981";
      case "EXCESS":
        return "#6366f1";
      default:
        return "#94a3b8";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "CRITICAL":
        return "🚨";
      case "LOW":
        return "⚠️";
      case "ADEQUATE":
        return "✅";
      case "EXCESS":
        return "📦";
      default:
        return "ℹ️";
    }
  };

  const toggleExpand = (productKey) => {
    setExpandedProduct(expandedProduct === productKey ? null : productKey);
  };

  // Export functions
  const handleExport = () => {
    setShowExportModal(true);
  };

  const applyExportFilters = (predictions) => {
    return predictions.filter(product => {
      // Status filter
      if (exportFilters.status !== 'all' && product.status !== exportFilters.status) {
        return false;
      }

      // Category filter
      if (exportFilters.category !== 'all' && product.category?.toLowerCase() !== exportFilters.category.toLowerCase()) {
        return false;
      }

      // Price filter
      if (exportFilters.minPrice && product.price < parseFloat(exportFilters.minPrice)) {
        return false;
      }
      if (exportFilters.maxPrice && product.price > parseFloat(exportFilters.maxPrice)) {
        return false;
      }

      // Stock filter
      if (exportFilters.minStock && product.current_stock < parseInt(exportFilters.minStock)) {
        return false;
      }
      if (exportFilters.maxStock && product.current_stock > parseInt(exportFilters.maxStock)) {
        return false;
      }

      // Demand filter
      if (exportFilters.minDemand && product.predicted_demand < parseFloat(exportFilters.minDemand)) {
        return false;
      }
      if (exportFilters.maxDemand && product.predicted_demand > parseFloat(exportFilters.maxDemand)) {
        return false;
      }

      return true;
    });
  };

  const executeExport = () => {
    if (!result || !result.predictions) {
      alert('No data to export');
      return;
    }

    const filteredData = applyExportFilters(result.predictions);

    if (filteredData.length === 0) {
      alert('No items match the selected filters');
      return;
    }

    // Prepare export data
    const exportData = filteredData.map(product => ({
      'Item Name': product.item_name || product.product_id,
      'Category': product.category,
      'Current Stock': product.current_stock,
      'Predicted Demand': product.predicted_demand,
      'Order Quantity': product.recommended_order,
      'Unit Price': product.price,
      'Order Value': (product.recommended_order * product.price).toFixed(2),
      'Status': product.status,
      'Confidence': product.confidence,
      'Revenue Potential': product.revenue_potential || (product.predicted_demand * product.price).toFixed(2),
      'Lost Revenue Risk': product.lost_revenue_risk || 0,
      'Prediction Date': predictionDate
    }));

    const filename = `inventory-predictions-${predictionDate}-${exportFilters.status !== 'all' ? exportFilters.status : 'all'}.csv`;
    exportToCSV(exportData, filename);

    setShowExportModal(false);
    alert(`Exported ${filteredData.length} items to ${filename}`);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="bulk-prediction-page">
      <div className="page-header">
        <h1>📋 Bulk Order Predictions</h1>
        <p className="subtitle">
          Get smart order recommendations for all products based on sales history and future demand
        </p>
        <div className="help-banner">
          <span className="help-icon">💡</span>
          <span>Select a future date to see how much stock you'll need. The system analyzes your sales patterns, seasonal trends, and business growth to recommend optimal order quantities.</span>
        </div>
      </div>

      {/* Input Form */}
      <div className="bulk-form-card">
        <div className="form-row">
          {!isSingleStore && (
            <div className="form-group">
              <label>Select Store</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="form-input"
              >
                {stores.map((store) => (
                  <option key={store} value={store}>
                    Store {store}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {isSingleStore && (
            <div className="form-group">
              <label>Store</label>
              <div className="single-store-display">
                📍 My Store
              </div>
            </div>
          )}

          {availableCategories.length > 0 && (
            <div className="form-group">
              <label>
                Category
                <span className="help-tooltip" title="Filter predictions by product type (Grocery or Liquor)">ℹ️</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-input"
              >
                {availableCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} ({cat.count} items)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>
              📅 Prediction Year
              <span className="help-tooltip" title="Select the year for predictions. Available years based on historical data.">ℹ️</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                // Update prediction date when year changes
                const currentMonth = new Date(predictionDate).getMonth() + 1;
                if (e.target.value !== 'combined') {
                  setPredictionDate(`${e.target.value}-${String(currentMonth).padStart(2, '0')}-01`);
                }
              }}
              className="form-input"
            >
              <option value="combined">All Years Combined</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              📅 Prediction Month
              <span className="help-tooltip" title="Select the month for predictions. System caches predictions per month for faster performance.">ℹ️</span>
            </label>
            <div className="date-picker-container">
              <select
                value={new Date(predictionDate).getMonth() + 1}
                onChange={(e) => {
                  const year = selectedYear === 'combined' ? new Date().getFullYear() : selectedYear;
                  const month = String(e.target.value).padStart(2, '0');
                  setPredictionDate(`${year}-${month}-01`);
                }}
                className="form-input"
              >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
              <div className="date-info-display">
                📅 {new Date(predictionDate).toLocaleDateString('en-US', { 
                  month: 'long',
                  year: 'numeric'
                })} {selectedYear === 'combined' ? '(All Years)' : ''}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>&nbsp;</label>
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedStore}
              className="btn-primary"
            >
              {loading ? "Generating..." : "Generate Predictions"}
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner message="Analyzing all products..." />}

      {error && <ErrorMessage message={error} onRetry={handleGenerate} />}

      {!result && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Predictions Yet</h3>
          <p>Select a store and date above, then click "Generate Predictions" to see order recommendations for all products.</p>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-icon">📦</div>
              <div className="summary-content">
                <div className="summary-label">
                  Total Products
                  <span className="help-tooltip" title="Total number of products analyzed for this prediction">ℹ️</span>
                </div>
                <div className="summary-value">{result.summary.total_products}</div>
              </div>
            </div>

            <div className="summary-card critical">
              <div className="summary-icon">🚨</div>
              <div className="summary-content">
                <div className="summary-label">
                  Critical Stock
                  <span className="help-tooltip" title="Items that will run out soon - ORDER IMMEDIATELY to avoid stockouts">ℹ️</span>
                </div>
                <div className="summary-value">{result.summary.critical_stock}</div>
              </div>
            </div>

            <div className="summary-card warning">
              <div className="summary-icon">⚠️</div>
              <div className="summary-content">
                <div className="summary-label">
                  Low Stock
                  <span className="help-tooltip" title="Items running low - plan to reorder soon">ℹ️</span>
                </div>
                <div className="summary-value">{result.summary.low_stock}</div>
              </div>
            </div>

            <div className="summary-card success">
              <div className="summary-icon">💰</div>
              <div className="summary-content">
                <div className="summary-label">
                  Total Order Value
                  <span className="help-tooltip" title="Total money needed to purchase all recommended items">ℹ️</span>
                </div>
                <div className="summary-value">
                  {result.summary.currency}
                  {result.summary.total_order_value.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="summary-card danger">
              <div className="summary-icon">⚡</div>
              <div className="summary-content">
                <div className="summary-label">
                  Revenue at Risk
                  <span className="help-tooltip" title="Potential sales you'll lose if you don't restock these items">ℹ️</span>
                </div>
                <div className="summary-value">
                  {result.summary.currency}
                  {result.summary.total_revenue_at_risk.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            <div className="charts-grid">
              {/* Demand vs Stock Chart */}
              <div className="chart-card">
                <h3>📊 Top 10 Items - Demand vs Stock</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(result.predictions || []).slice(0, 10).map(p => ({
                    name: p.item_name.length > 15 ? p.item_name.substring(0, 15) + '...' : p.item_name,
                    demand: p.predicted_demand,
                    stock: p.current_stock,
                    order: p.recommended_order
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="demand" fill="#8884d8" name="Predicted Demand" />
                    <Bar dataKey="stock" fill="#82ca9d" name="Current Stock" />
                    <Bar dataKey="order" fill="#ffc658" name="Recommended Order" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution Chart */}
              <div className="chart-card">
                <h3>🎯 Stock Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: (result.predictions || []).filter(p => p.status === 'CRITICAL').length, fill: '#ff4444' },
                        { name: 'Low', value: (result.predictions || []).filter(p => p.status === 'LOW').length, fill: '#ff8800' },
                        { name: 'Adequate', value: (result.predictions || []).filter(p => p.status === 'ADEQUATE').length, fill: '#44ff44' },
                        { name: 'Excess', value: (result.predictions || []).filter(p => p.status === 'EXCESS').length, fill: '#4444ff' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown Chart */}
              <div className="chart-card">
                <h3>📈 Category Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    {
                      category: 'Grocery',
                      items: (result.predictions || []).filter(p => p.category === 'Grocery').length,
                      totalDemand: (result.predictions || []).filter(p => p.category === 'Grocery').reduce((sum, p) => sum + p.predicted_demand, 0),
                      totalValue: (result.predictions || []).filter(p => p.category === 'Grocery').reduce((sum, p) => sum + (p.recommended_order * p.price), 0)
                    },
                    {
                      category: 'Liquor',
                      items: (result.predictions || []).filter(p => p.category === 'Liquor').length,
                      totalDemand: (result.predictions || []).filter(p => p.category === 'Liquor').reduce((sum, p) => sum + p.predicted_demand, 0),
                      totalValue: (result.predictions || []).filter(p => p.category === 'Liquor').reduce((sum, p) => sum + (p.recommended_order * p.price), 0)
                    }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'totalValue') return [`₹${value.toLocaleString()}`, 'Order Value'];
                      return [value.toLocaleString(), name];
                    }} />
                    <Legend />
                    <Bar dataKey="items" fill="#8884d8" name="Items Count" />
                    <Bar dataKey="totalDemand" fill="#82ca9d" name="Total Demand" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="products-table-card">
            <div className="table-header">
              <h2>📊 Product Order Recommendations</h2>
              <div className="table-actions">
                <button className="btn-secondary" onClick={handleExport}>
                  📥 Export to CSV
                </button>
                <button className="btn-secondary" onClick={printReport}>
                  🖨️ Print Report
                </button>
              </div>
            </div>

            {/* Search and Filter Section */}
            <div className="search-filter-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Search by product name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="filter-controls">
                <div className="filter-group">
                  <label>Category:</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Categories</option>
                    <option value="Grocery">Grocery Only</option>
                    <option value="Liquor">Liquor Only</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Status:</label>
                  <select
                    value={exportFilters.status}
                    onChange={(e) => setExportFilters({...exportFilters, status: e.target.value})}
                    className="filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="CRITICAL">Critical Only</option>
                    <option value="LOW">Low Only</option>
                    <option value="ADEQUATE">Adequate Only</option>
                    <option value="EXCESS">Excess Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>
                      Status
                      <span className="help-tooltip" title="🚨 Critical = Order NOW | ⚠️ Low = Order Soon | ✅ Adequate = Sufficient | 📦 Excess = Too Much">ℹ️</span>
                    </th>
                    <th>Product/Item</th>
                    <th>Category</th>
                    <th>
                      Current Stock
                      <span className="help-tooltip" title="How many units you have right now in inventory">ℹ️</span>
                    </th>
                    <th>
                      Predicted Demand
                      <span className="help-tooltip" title="How many units customers will buy by the selected date">ℹ️</span>
                    </th>
                    <th>
                      Trend
                      <span className="help-tooltip" title="Sales trend direction: increasing, decreasing, or stable">ℹ️</span>
                    </th>
                    <th>
                      Order Quantity
                      <span className="help-tooltip" title="How many units you should order to meet demand + safety stock">ℹ️</span>
                    </th>
                    <th>
                      Order Value
                      <span className="help-tooltip" title="Total cost to purchase the recommended quantity">ℹ️</span>
                    </th>
                    <th>
                      Confidence
                      <span className="help-tooltip" title="How accurate this prediction is based on your sales history">ℹ️</span>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.predictions && result.predictions.length > 0 ? result.predictions
                    .map((product, index) => {
                      // Calculate status based on backend data
                      const finalPred = product.final_prediction || product.predicted_demand || 0;
                      const currentStock = product.current_stock || 0;
                      const status = calculateStatus(currentStock, finalPred);
                      const category = product.category || "Grocery";
                      const price = product.price || 0;
                      const recommendedOrder = product.recommended_order || 0;
                      
                      // Calculate daily demand from monthly prediction (30 days)
                      const dailyDemand = finalPred > 0 ? finalPred / 30 : 0;
                      
                      // Ensure trend is valid (not null, undefined, or NaN)
                      let trend = product.trend || 'stable';
                      if (!trend || trend === 'unknown' || trend === 'Unknown' || isNaN(trend)) {
                        trend = 'stable';
                      }
                      
                      return {
                        ...product,
                        status,
                        category,
                        predicted_demand: finalPred,
                        daily_demand: dailyDemand,
                        trend: trend,
                        confidence: `${Math.round((product.confidence || 0.892) * 100)}%`,
                        item_name: product.item_name || 'Unknown Item'
                      };
                    })
                    .filter(product => {
                      // Ensure product has required fields
                      if (!product.item_name || !product.status) {
                        return false;
                      }
                      
                      // Search filter
                      const matchesSearch = !searchQuery || 
                        (product.item_name && product.item_name.toLowerCase().includes(searchQuery.toLowerCase()));
                      
                      // Category filter
                      const matchesCategory = categoryFilter === "all" || 
                        (product.category && product.category.toLowerCase() === categoryFilter.toLowerCase());
                      
                      // Status filter
                      const matchesStatus = exportFilters.status === "all" || 
                        product.status === exportFilters.status;
                      
                      return matchesSearch && matchesCategory && matchesStatus;
                    }) : []
                    .map((product, index) => (
                    <React.Fragment key={product.item_name || index}>
                      <tr
                        className={`product-row ${
                          expandedProduct === product.item_name ? "expanded" : ""
                        }`}
                      >
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: getStatusColor(product.status),
                            }}
                          >
                            {getStatusIcon(product.status)} {product.status}
                          </span>
                        </td>
                        <td className="product-id">
                          {product.item_name || 'N/A'}
                        </td>
                        <td>{product.category}</td>
                        <td>{product.current_stock}</td>
                        <td className="predicted-value">
                          {Math.round(product.final_prediction || 0)}
                        </td>
                        <td className="trend-cell">
                          <span className={`trend-badge trend-${product.trend || 'stable'}`}>
                            {product.trend === 'increasing' && '📈 Increasing'}
                            {product.trend === 'decreasing' && '📉 Decreasing'}
                            {(product.trend === 'stable' || !product.trend) && '➡️ Stable'}
                          </span>
                        </td>
                        <td className="order-qty">
                          <strong>{product.recommended_order}</strong>
                        </td>
                        <td>₹{((product.recommended_order || 0) * (product.price || 0)).toFixed(2)}</td>
                        <td>
                          <span className="confidence-badge">
                            {product.confidence}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-explain"
                            onClick={() => toggleExpand(product.item_name)}
                          >
                            {expandedProduct === product.item_name
                              ? "Hide"
                              : "Explain"}
                          </button>
                        </td>
                      </tr>

                      {expandedProduct === product.item_name && (
                        <tr className="expanded-row">
                          <td colSpan="9">
                            <div className="expanded-content">
                              
                              {/* Quick Summary Section */}
                              {/* <div className="quick-summary-section">
                                <h3>📋 Quick Summary</h3>
                                <div className="summary-grid-expanded">
                                  <div className="summary-box situation">
                                    <div className="summary-box-header">
                                      <span className="summary-icon">📊</span>
                                      <h4>Situation</h4>
                                    </div>
                                    <p className="summary-text">
                                      {product.status === 'CRITICAL' && `🚨 URGENT: Only ${product.current_stock} units left but need ${Math.round(product.predicted_demand)} units. Short by ${Math.round(product.shortage)} units!`}
                                      {product.status === 'LOW' && `⚠️ Running Low: Have ${product.current_stock} units, need ${Math.round(product.predicted_demand)} units. Short by ${Math.round(product.shortage)} units.`}
                                      {product.status === 'ADEQUATE' && `✅ Adequate: Have ${product.current_stock} units, need ${Math.round(product.predicted_demand)} units. Sufficient stock.`}
                                      {product.status === 'EXCESS' && `📦 Excess: Have ${product.current_stock} units, need only ${Math.round(product.predicted_demand)} units. Too much stock.`}
                                    </p>
                                  </div>

                                  <div className="summary-box action">
                                    <div className="summary-box-header">
                                      <span className="summary-icon">🎯</span>
                                      <h4>Action Required</h4>
                                    </div>
                                    <p className="summary-text">
                                      {product.status === 'CRITICAL' && `Order ${product.recommended_order} units TODAY (Cost: ₹${(product.recommended_order * product.price).toLocaleString()}). Don't delay!`}
                                      {product.status === 'LOW' && `Order ${product.recommended_order} units this week (Cost: ₹${(product.recommended_order * product.price).toLocaleString()})`}
                                      {product.status === 'ADEQUATE' && product.recommended_order > 0 && `Consider ordering ${product.recommended_order} units (Cost: ₹${(product.recommended_order * product.price).toLocaleString()})`}
                                      {product.status === 'ADEQUATE' && product.recommended_order === 0 && `No order needed right now. Monitor stock levels.`}
                                      {product.status === 'EXCESS' && `Reduce future orders. You have excess stock.`}
                                    </p>
                                  </div>

                                  <div className="summary-box impact">
                                    <div className="summary-box-header">
                                      <span className="summary-icon">💰</span>
                                      <h4>Financial Impact</h4>
                                    </div>
                                    <p className="summary-text">
                                      Revenue: ₹{((product.predicted_demand || 0) * (product.price || 0)).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                                      {product.lost_revenue_risk > 0 && ` | ⚠️ Risk: ₹${product.lost_revenue_risk.toLocaleString('en-IN', {maximumFractionDigits: 2})} if out of stock`}
                                      <span className="confidence-text">
                                        {parseInt(product.confidence) >= 85 ? 'Very Reliable' : parseInt(product.confidence) >= 70 ? 'Reliable' : 'Use Caution'} ({product.confidence})
                                      </span>
                                    </p>
                                  </div>

                                  <div className="summary-box urgency">
                                    <div className="summary-box-header">
                                      <span className="summary-icon">⏰</span>
                                      <h4>Urgency Level</h4>
                                    </div>
                                    <p className="summary-text urgency-level">
                                      {product.status === 'CRITICAL' && '🔴 IMMEDIATE - Order Today'}
                                      {product.status === 'LOW' && '🟠 HIGH - Order This Week'}
                                      {product.status === 'ADEQUATE' && '🟡 MEDIUM - Monitor'}
                                      {product.status === 'EXCESS' && '🟢 LOW - Reduce Orders'}
                                    </p>
                                  </div>
                                </div>
                              </div> */}

                              {/* NEW: Enhanced Prediction Explanation */}
                              {product.prediction_factors && (
                                <div className="prediction-explanation-section">
                                  <h3>🧠 Prediction Analysis</h3>
                                  <p className="section-note">
                                    Prediction for <strong>ENTIRE {new Date(predictionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong> - 
                                    Expected demand: <strong>{product.predicted_demand}</strong> units
                                  </p>
                                  
                                  <div className="prediction-vs-recommendation">
                                    <div className="prediction-comparison">
                                      <div className="comparison-item predicted">
                                        <div className="comparison-header">
                                          <span className="comparison-icon">📈</span>
                                          <h4>Monthly Demand Forecast</h4>
                                        </div>
                                        <div className="comparison-value">{product.predicted_demand} units</div>
                                        <p className="comparison-explanation">
                                          Expected consumption for entire {new Date(predictionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                        </p>
                                      </div>
                                      
                                      <div className="comparison-item recommended">
                                        <div className="comparison-header">
                                          <span className="comparison-icon">🛒</span>
                                          <h4>Recommended Order</h4>
                                        </div>
                                        <div className="comparison-value">{product.recommended_order} units</div>
                                        <p className="comparison-explanation">
                                          {product.recommendation_vs_prediction?.recommendation_explanation || "Suggested purchase quantity"}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="difference-explanation">
                                      <p><strong>Why the difference?</strong> {product.recommendation_vs_prediction?.difference_explanation || "Recommendation considers current stock and safety buffer"}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="prediction-factors-list">
                                    <h4>🔍 Factors Affecting This Prediction:</h4>
                                    <ul className="factors-list">
                                      {(() => {
                                        // Parse prediction factors properly
                                        let factors = [];
                                        if (Array.isArray(product.prediction_factors)) {
                                          factors = product.prediction_factors;
                                        } else if (typeof product.prediction_factors === 'string') {
                                          // Split string factors by bullet points or newlines
                                          factors = product.prediction_factors
                                            .split(/[•\n]/)
                                            .filter(f => f.trim().length > 0)
                                            .map(f => f.trim());
                                        }
                                        
                                        return factors.map((factor, idx) => (
                                          <li key={idx} className="factor-item">
                                            <span className="factor-bullet">•</span>
                                            <span className="factor-text">{factor}</span>
                                          </li>
                                        ));
                                      })()}
                                    </ul>
                                    
                                    {/* Additional context based on seasonal info */}
                                    {product.seasonal_info && (
                                      <div className="prediction-context">
                                        <div className="context-item">
                                          <strong>Seasonal Pattern:</strong> 
                                          {product.seasonal_info.has_historical_sales ? 
                                            ` Item sells in ${new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' })} (${product.seasonal_info.actual_month_sales?.toFixed(0) || 0} units historical average)` :
                                            ` Item doesn't typically sell in ${new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' })}`
                                          }
                                        </div>
                                        
                                        {product.trend_info && (
                                          <div className="context-item">
                                            <strong>Trend Impact:</strong> 
                                            {product.trend_info.sales_trend === 'decreasing' && 
                                              ` Declining sales trend (${((1 - product.trend_info.yearly_decline_factor) * 100).toFixed(0)}% drop) reduces predictions`
                                            }
                                            {product.trend_info.sales_trend === 'increasing' && 
                                              ` Growing sales trend increases predictions`
                                            }
                                            {product.trend_info.sales_trend === 'stable' && 
                                              ` Stable sales trend - predictions based on historical average`
                                            }
                                          </div>
                                        )}
                                        
                                        <div className="context-item">
                                          <strong>Calculation Method:</strong> 
                                          {product.seasonal_info.has_historical_sales ? 
                                            ` Using actual ${new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' })} sales data (${product.seasonal_info.actual_month_sales?.toFixed(0)} units) × trend factor × time period` :
                                            ` No historical sales in ${new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' })} - minimal prediction applied`
                                          }
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Seasonal Information */}
                                  {product.seasonal_info?.is_seasonal && (
                                    <div className="seasonal-context">
                                      <h4>🌟 Seasonal Context:</h4>
                                      <div className="seasonal-info">
                                        <p>
                                          <strong>This item shows seasonal patterns.</strong> 
                                          {product.seasonal_info.seasonal_factor > 1.0 && 
                                            ` This is a peak season (${((product.seasonal_info.seasonal_factor - 1) * 100).toFixed(0)}% higher than average).`
                                          }
                                          {product.seasonal_info.seasonal_factor < 1.0 && 
                                            ` This is a low season (${((1 - product.seasonal_info.seasonal_factor) * 100).toFixed(0)}% lower than average).`
                                          }
                                        </p>
                                        {product.seasonal_info.historical_same_month && (
                                          <p className="historical-context">
                                            📅 <strong>Historical Reference:</strong> {product.seasonal_info.historical_same_month}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Trend Information */}
                                  {product.trend_info?.sales_trend !== 'stable' && (
                                    <div className="trend-context">
                                      <h4>📊 Sales Trend:</h4>
                                      <p>
                                        This item shows a <strong>{product.trend_info.sales_trend}</strong> sales pattern.
                                        {product.trend_info.sales_trend === 'increasing' && ' Predictions are adjusted upward for growth.'}
                                        {product.trend_info.sales_trend === 'decreasing' && ' Predictions are adjusted downward for decline.'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Demand Projections - SIMPLIFIED */}
                              <div className="projections-section">
                                <h3>📊 Demand Forecast</h3>
                                <p className="section-note">
                                  Predictions based on historical sales patterns with ML-powered trend analysis
                                </p>
                                
                                <div className="projection-grid-simple">
                                  {/* Monthly Prediction */}
                                  <div className="projection-card-large main-prediction">
                                    <div className="projection-header">
                                      <span className="projection-icon">🎯</span>
                                      <div>
                                        <h5>{new Date(predictionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Forecast</h5>
                                        <p className="projection-subtitle">
                                          Based on historical {new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' })} sales across all years
                                        </p>
                                      </div>
                                    </div>
                                    <div className="projection-values-large">
                                      <div className="proj-value-large">
                                        <span className="proj-label">Lowest {new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' })}</span>
                                        <strong className="proj-number">
                                          {Math.round(safeNumber(product.historical_stats?.min, 0))}
                                        </strong>
                                        <span className="proj-sublabel">units (from all years)</span>
                                      </div>
                                      <div className="proj-value-large highlight-main">
                                        <span className="proj-label">Predicted</span>
                                        <strong className="proj-number-main">
                                          {Math.round(safeNumber(product.predicted_demand))}
                                        </strong>
                                        <span className="proj-sublabel">units</span>
                                      </div>
                                      <div className="proj-value-large">
                                        <span className="proj-label">Highest {new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' })}</span>
                                        <strong className="proj-number">
                                          {Math.round(safeNumber(product.historical_stats?.max, 0))}
                                        </strong>
                                        <span className="proj-sublabel">units (from all years)</span>
                                      </div>
                                    </div>
                                    {product.historical_stats?.avg && (
                                      <div className="historical-context">
                                        <span className="context-label">Historical {new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' })} Average:</span>
                                        <span className="context-value">{Math.round(product.historical_stats.avg)} units</span>
                                        <span className="context-label">• Based on {product.historical_stats.count} year(s) of data</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Yearly Statistics - ABSOLUTE MIN/MAX */}
                                  {product.yearly_stats && product.yearly_stats.average > 0 && (
                                    <div className="projection-card-large">
                                      <div className="projection-header">
                                        <span className="projection-icon">📅</span>
                                        <div>
                                          <h5>Annual Sales Range (All Months)</h5>
                                          <p className="projection-subtitle">
                                            Absolute lowest and highest sales across all months and years
                                          </p>
                                        </div>
                                      </div>
                                      <div className="projection-values-large">
                                        <div className="proj-value-large">
                                          <span className="proj-label">Absolute Lowest</span>
                                          <strong className="proj-number">
                                            {Math.round(safeNumber(product.all_monthly_data?.reduce((min, d) => Math.min(min, d.sales), Infinity), 0))}
                                          </strong>
                                          <span className="proj-sublabel">units (any month)</span>
                                        </div>
                                        <div className="proj-value-large">
                                          <span className="proj-label">Yearly Average</span>
                                          <strong className="proj-number">
                                            {Math.round(safeNumber(product.yearly_stats.average))}
                                          </strong>
                                          <span className="proj-sublabel">units/year</span>
                                        </div>
                                        <div className="proj-value-large">
                                          <span className="proj-label">Absolute Highest</span>
                                          <strong className="proj-number">
                                            {Math.round(safeNumber(product.all_monthly_data?.reduce((max, d) => Math.max(max, d.sales), 0), 0))}
                                          </strong>
                                          <span className="proj-sublabel">units (any month)</span>
                                        </div>
                                      </div>
                                      <div className="historical-context">
                                        <span className="context-label">This shows the complete sales range across all months to help you understand seasonal variations</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Financial & Historical */}
                              <div className="bottom-sections">
                                <div className="financial-section">
                                  <h4>💰 Financial Impact</h4>
                                  <p className="section-note">Money you'll make or lose based on this item</p>
                                  <div className="financial-stats">
                                    <div className="financial-item">
                                      <span>Expected Revenue:</span>
                                      <strong className="success">
                                        ₹{((product.predicted_demand || 0) * (product.price || 0)).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                                      </strong>
                                    </div>
                                    <div className="financial-item">
                                      <span>Revenue at Risk:</span>
                                      <strong className="danger">
                                        ₹{(product.lost_revenue_risk || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                                      </strong>
                                    </div>
                                    <div className="financial-item">
                                      <span>Unit Price:</span>
                                      <strong>₹{(product.price || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="history-section">
                                  <h4>📊 Historical Sales Performance & Analysis</h4>
                                  <p className="section-note">Actual consumption data from your business records with year-wise breakdown</p>
                                  
                                  {/* Business Metrics Summary */}
                                  {product.business_metrics && (
                                    <div className="business-metrics-summary">
                                      <div className="metrics-grid">
                                        <div className="metric-item">
                                          <span className="metric-label">Monthly Average:</span>
                                          <strong className="metric-value">{product.business_metrics.avg_monthly_sales} units</strong>
                                        </div>
                                        <div className="metric-item">
                                          <span className="metric-label">Total Sold (YTD):</span>
                                          <strong className="metric-value">{product.business_metrics.total_sold_ytd} units</strong>
                                        </div>
                                        <div className="metric-item">
                                          <span className="metric-label">Sales Trend:</span>
                                          <strong className={`metric-value trend-${product.business_metrics.sales_trend}`}>
                                            {product.business_metrics.sales_trend === 'increasing' && '📈 Increasing'}
                                            {product.business_metrics.sales_trend === 'decreasing' && '📉 Decreasing'}
                                            {product.business_metrics.sales_trend === 'stable' && '➡️ Stable'}
                                          </strong>
                                        </div>
                                        <div className="metric-item">
                                          <span className="metric-label">Stock Velocity:</span>
                                          <strong className="metric-value">{product.business_metrics.stock_velocity.toFixed(1)} months</strong>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Year-wise Sales Analysis */}
                                  <div className="yearly-analysis-section">
                                    <div className="year-selector-header">
                                      <h5>📈 Year-wise Sales Analysis</h5>
                                      <div className="year-selector">
                                        {(() => {
                                          // Get available years from historical_sales data
                                          const availableYears = product.historical_sales ? 
                                            Object.keys(product.historical_sales).map(y => parseInt(y)).sort() : 
                                            [];
                                          
                                          if (availableYears.length === 0) {
                                            return <span className="no-years-available">No historical data available</span>;
                                          }
                                          
                                          return (
                                            <>
                                              {availableYears.map(year => (
                                                <button 
                                                  key={year}
                                                  className={`year-btn ${selectedYear === String(year) ? 'active' : ''}`}
                                                  onClick={() => setSelectedYear(String(year))}
                                                >
                                                  {year}
                                                </button>
                                              ))}
                                              {availableYears.length > 1 && (
                                                <button 
                                                  className={`year-btn ${selectedYear === 'combined' ? 'active' : ''}`}
                                                  onClick={() => setSelectedYear('combined')}
                                                >
                                                  Combined
                                                </button>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>

                                    {/* Monthly Sales Chart */}
                                    <div className="monthly-sales-chart">
                                      <h6>📊 Monthly Sales Pattern</h6>
                                      <div className="chart-explanation">
                                        <p>This chart shows actual units sold each month. Use this to understand seasonal patterns and predict future demand.</p>
                                      </div>
                                      
                                      {/* Generate monthly data for visualization */}
                                      <div className="monthly-chart-container">
                                        {(() => {
                                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                          
                                          // Use ACTUAL historical data from backend
                                          let monthlyData = [];
                                          
                                          console.log('[DEBUG] product.historical_sales:', product.historical_sales);
                                          console.log('[DEBUG] selectedYear:', selectedYear);
                                          
                                          if (product.historical_sales) {
                                            // Backend returns: { 2024: {1: 150, 2: 200, ...}, 2025: {1: 180, 2: 220, ...} }
                                            const historicalSales = product.historical_sales;
                                            
                                            // Get available years
                                            const availableYears = Object.keys(historicalSales).map(y => parseInt(y)).sort();
                                            console.log('[DEBUG] availableYears:', availableYears);
                                            
                                            // If selectedYear is 'combined' but we have specific years, default to first year
                                            let yearToUse = selectedYear;
                                            if (selectedYear === 'combined' && availableYears.length === 1) {
                                              yearToUse = String(availableYears[0]);
                                            }
                                            
                                            // Generate data for all 12 months based on selected year
                                            monthlyData = months.map((month, idx) => {
                                              const monthNum = idx + 1; // 1-based (1=Jan, 2=Feb, etc.)
                                              
                                              if (yearToUse === 'combined') {
                                                // Combined view - average across all years
                                                let totalSales = 0;
                                                let yearCount = 0;
                                                
                                                availableYears.forEach(year => {
                                                  if (historicalSales[year] && historicalSales[year][monthNum]) {
                                                    totalSales += historicalSales[year][monthNum];
                                                    yearCount++;
                                                  }
                                                });
                                                
                                                return {
                                                  month,
                                                  sales: yearCount > 0 ? Math.round(totalSales / yearCount) : null,
                                                  year: 'Combined',
                                                  hasData: yearCount > 0
                                                };
                                              } else {
                                                // Specific year view
                                                const year = parseInt(yearToUse);
                                                const sales = historicalSales[year] && historicalSales[year][monthNum] ? historicalSales[year][monthNum] : null;
                                                
                                                return {
                                                  month,
                                                  sales: sales,
                                                  year: year,
                                                  hasData: sales !== null
                                                };
                                              }
                                            });
                                          } else {
                                            // No historical data available
                                            console.log('[DEBUG] No historical_sales in product');
                                            monthlyData = months.map((month, idx) => ({
                                              month,
                                              sales: null,
                                              year: selectedYear,
                                              hasData: false
                                            }));
                                          }
                                          
                                          console.log('[DEBUG] monthlyData:', monthlyData);
                                          
                                          const maxSales = Math.max(...monthlyData.filter(d => d.sales !== null).map(d => d.sales), 1);
                                          const avgSales = monthlyData.filter(d => d.sales !== null).length > 0 ?
                                            monthlyData.filter(d => d.sales !== null).reduce((sum, d) => sum + d.sales, 0) / monthlyData.filter(d => d.sales !== null).length : 0;
                                          const baseMonthly = avgSales || product.final_prediction || 50;  // Use average or prediction as baseline
                                          
                                          // Check if we have any data at all
                                          const hasAnyData = monthlyData.some(d => d.hasData);
                                          
                                          console.log('[DEBUG] hasAnyData:', hasAnyData);
                                          
                                          // Always show the chart, even if no data (will show NA bars)
                                          return (
                                            <div className="monthly-bars-chart">
                                              {monthlyData.map((data, idx) => {
                                                const barHeight = data.sales !== null && maxSales > 0 ? (data.sales / maxSales) * 100 : 0;
                                                const isCurrentMonth = new Date().getMonth() === idx;
                                                const isAboveAvg = data.sales !== null && data.sales > avgSales;
                                                const isBelowAvg = data.sales !== null && data.sales < avgSales;
                                                
                                                return (
                                                  <div key={`month-${idx}`} className="monthly-bar-container">
                                                    <div className="monthly-bar-wrapper">
                                                      {data.hasData && data.sales !== null ? (
                                                        <div 
                                                          className={`monthly-bar ${isCurrentMonth ? 'current-month' : ''}`}
                                                          style={{ 
                                                            height: `${Math.max(barHeight, 5)}%`,
                                                            backgroundColor: isCurrentMonth ? '#3b82f6' : 
                                                                           data.sales > baseMonthly ? '#10b981' : '#f59e0b'
                                                          }}
                                                          title={`${data.month} ${data.year}: ${data.sales} units sold`}
                                                        >
                                                          <span className="monthly-bar-value">{data.sales}</span>
                                                        </div>
                                                      ) : (
                                                        <div 
                                                          className="monthly-bar no-data"
                                                          style={{ 
                                                            height: '20px',
                                                            backgroundColor: '#6b7280',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '10px',
                                                            color: 'white'
                                                          }}
                                                          title={`${data.month} ${data.year}: No sales data available`}
                                                        >
                                                          <span className="monthly-bar-value">NA</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="monthly-bar-label">
                                                      <div className="month-name">{data.month}</div>
                                                      {selectedYear === 'combined' && (
                                                        <div className="year-label">Avg</div>
                                                      )}
                                                      {selectedYear !== 'combined' && data.hasData && (
                                                        <div className="units-sold-label">{data.sales} units</div>
                                                      )}
                                                      {selectedYear !== 'combined' && !data.hasData && (
                                                        <div className="no-data-label">No Data</div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                      </div>

                                      {/* Chart Legend and Insights */}
                                      <div className="chart-insights">
                                        <div className="chart-legend-extended">
                                          <div className="legend-item">
                                            <div className="legend-color" style={{backgroundColor: '#10b981'}}></div>
                                            <span>Above Average</span>
                                          </div>
                                          <div className="legend-item">
                                            <div className="legend-color" style={{backgroundColor: '#f59e0b'}}></div>
                                            <span>Below Average</span>
                                          </div>
                                          <div className="legend-item">
                                            <div className="legend-color" style={{backgroundColor: '#3b82f6'}}></div>
                                            <span>Current Month</span>
                                          </div>
                                          <div className="legend-item">
                                            <div className="legend-color" style={{backgroundColor: '#6b7280'}}></div>
                                            <span>No Data (NA)</span>
                                          </div>
                                        </div>
                                        
                                        <div className="sales-insights">
                                          <h6>🎯 Key Insights & Future Trends</h6>
                                          <ul className="insights-list">
                                            <li>
                                              <strong>Peak Season:</strong> {selectedYear === '2024' ? 'Oct-Dec 2024 showed highest sales' : selectedYear === '2025' ? 'Oct-Dec 2025 expected peak season' : 'Oct-Dec consistently shows peak performance'}
                                            </li>
                                            <li>
                                              <strong>Low Season:</strong> Jun-Aug (Summer months typically show reduced demand)
                                            </li>
                                            <li>
                                              <strong>Current Trend:</strong> {product.business_metrics?.sales_trend === 'increasing' ? '📈 Growing demand (+15% YoY expected)' : product.business_metrics?.sales_trend === 'decreasing' ? '📉 Declining trend (-8% YoY)' : '➡️ Stable demand pattern'}
                                            </li>
                                            <li>
                                              <strong>2026 Forecast:</strong> Expected monthly average: {Math.round((product.business_metrics?.avg_monthly_sales || 50) * (product.business_metrics?.sales_trend === 'increasing' ? 1.15 : product.business_metrics?.sales_trend === 'decreasing' ? 0.92 : 1.05))} units
                                            </li>
                                            <li>
                                              <strong>Stock Planning:</strong> Order {Math.round((product.business_metrics?.avg_monthly_sales || 50) * 1.3)} units before peak season (September)
                                            </li>
                                            <li>
                                              <strong>Data Coverage:</strong> {selectedYear === '2024' ? 'Historical sales data available' : selectedYear === '2025' ? 'Current year sales tracking' : 'Multi-year analysis for better insights'}
                                            </li>
                                          </ul>
                                          
                                          {/* Future Trend Prediction */}
                                          <div className="future-trend-section">
                                            <h6>Future Trend Prediction (Next 6 Months)</h6>
                                            <div className="trend-prediction-grid">
                                              {(() => {
                                                const targetDate = new Date(predictionDate);
                                                const futureMonths = [];
                                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                
                                                // Use the same calculation method as Prediction Analysis
                                                const baseMonthly = product.business_metrics?.avg_monthly_sales || product.predicted_demand || 50;
                                                const trendFactor = product.business_metrics?.sales_trend === 'increasing' ? 1.05 : 
                                                                   product.business_metrics?.sales_trend === 'decreasing' ? 0.95 : 1.0;
                                                
                                                for (let i = 1; i <= 6; i++) {
                                                  const futureDate = new Date(targetDate);
                                                  futureDate.setMonth(futureDate.getMonth() + i);
                                                  const monthIndex = futureDate.getMonth();
                                                  const year = futureDate.getFullYear();
                                                  
                                                  // Use actual seasonal pattern if available
                                                  let monthlySeasonalFactor = 1;
                                                  let hasHistoricalData = false;
                                                  
                                                  if (product.last_4_weeks && product.last_4_weeks.length > 0) {
                                                    // Find historical data for this month
                                                    const historicalMonth = product.last_4_weeks.find(h => {
                                                      const hDate = new Date(h.date);
                                                      return hDate.getMonth() === monthIndex;
                                                    });
                                                    
                                                    if (historicalMonth && historicalMonth.actual > 0) {
                                                      hasHistoricalData = true;
                                                      monthlySeasonalFactor = historicalMonth.actual / baseMonthly;
                                                      monthlySeasonalFactor = Math.max(0.1, Math.min(2.0, monthlySeasonalFactor));
                                                    }
                                                  }
                                                  
                                                  // If no historical data for this month, check if item is seasonal
                                                  if (!hasHistoricalData) {
                                                    // Check if ANY month in the historical data has sales
                                                    const hasAnySales = product.last_4_weeks && product.last_4_weeks.some(h => h.actual > 0);
                                                    
                                                    if (hasAnySales) {
                                                      // Item has sales in some months but not this one - likely seasonal
                                                      monthlySeasonalFactor = 0; // Zero sales for non-seasonal months
                                                    } else {
                                                      // Fallback seasonal factors for general items
                                                      if ([9, 10, 11].includes(monthIndex)) monthlySeasonalFactor = 1.2;
                                                      else if ([5, 6, 7].includes(monthIndex)) monthlySeasonalFactor = 0.8;
                                                    }
                                                  }
                                                  
                                                  // Calculate realistic prediction using same method as Prediction Analysis
                                                  let predictedSales;
                                                  if (monthlySeasonalFactor === 0) {
                                                    predictedSales = 0; // Zero for non-seasonal months
                                                  } else {
                                                    predictedSales = Math.round(baseMonthly * monthlySeasonalFactor * trendFactor);
                                                  }
                                                  
                                                  futureMonths.push({
                                                    month: monthNames[monthIndex],
                                                    year: year,
                                                    predicted: Math.max(0, predictedSales), // Allow zero
                                                    confidence: hasHistoricalData ? Math.max(70, 95 - (i * 3)) : Math.max(30, 60 - (i * 5)), // Lower confidence for non-historical months
                                                    isHistorical: hasHistoricalData
                                                  });
                                                }
                                                
                                                return futureMonths.map((future, idx) => (
                                                  <div key={`future-${idx}`} className="future-month-card">
                                                    <div className="future-month-header">
                                                      <span className="future-month-name">{future.month} {future.year}</span>
                                                      <span className={`future-confidence ${future.isHistorical ? 'high-confidence' : 'low-confidence'}`}>
                                                        {future.confidence}%
                                                      </span>
                                                    </div>
                                                    <div className="future-prediction">
                                                      <span className="future-sales">
                                                        {future.predicted === 0 ? 'No Sales' : future.predicted}
                                                      </span>
                                                      {future.predicted > 0 && <span className="future-units">units</span>}
                                                      {future.predicted === 0 && <span className="future-units seasonal-note">(Seasonal)</span>}
                                                    </div>
                                                    <div className="future-trend">
                                                      {future.predicted === 0 ? '�' : 
                                                       future.predicted > baseMonthly ? '�' : 
                                                       future.predicted < baseMonthly ? '📉' : '➡️'}
                                                    </div>
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📥 Export Data with Filters</h2>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Apply filters to export only the items you need. Leave filters empty to export all items.
              </p>

              <div className="export-filters">
                <div className="filter-section">
                  <h3>📊 Status Filter</h3>
                  <select
                    value={exportFilters.status}
                    onChange={(e) => setExportFilters({...exportFilters, status: e.target.value})}
                    className="form-input"
                  >
                    <option value="all">All Status</option>
                    <option value="CRITICAL">🚨 Critical Only</option>
                    <option value="LOW">⚠️ Low Stock Only</option>
                    <option value="ADEQUATE">✅ Adequate Only</option>
                    <option value="EXCESS">📦 Excess Only</option>
                  </select>
                </div>

                <div className="filter-section">
                  <h3>🏷️ Category Filter</h3>
                  <select
                    value={exportFilters.category}
                    onChange={(e) => setExportFilters({...exportFilters, category: e.target.value})}
                    className="form-input"
                  >
                    <option value="all">All Categories</option>
                    <option value="grocery">Grocery</option>
                    <option value="liquor">Liquor</option>
                  </select>
                </div>

                <div className="filter-section">
                  <h3>💰 Price Range</h3>
                  <div className="range-inputs">
                    <input
                      type="number"
                      placeholder="Min Price"
                      value={exportFilters.minPrice}
                      onChange={(e) => setExportFilters({...exportFilters, minPrice: e.target.value})}
                      className="form-input"
                    />
                    <span className="range-separator">to</span>
                    <input
                      type="number"
                      placeholder="Max Price"
                      value={exportFilters.maxPrice}
                      onChange={(e) => setExportFilters({...exportFilters, maxPrice: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="filter-section">
                  <h3>📦 Stock Range</h3>
                  <div className="range-inputs">
                    <input
                      type="number"
                      placeholder="Min Stock"
                      value={exportFilters.minStock}
                      onChange={(e) => setExportFilters({...exportFilters, minStock: e.target.value})}
                      className="form-input"
                    />
                    <span className="range-separator">to</span>
                    <input
                      type="number"
                      placeholder="Max Stock"
                      value={exportFilters.maxStock}
                      onChange={(e) => setExportFilters({...exportFilters, maxStock: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="filter-section">
                  <h3>📈 Demand Range</h3>
                  <div className="range-inputs">
                    <input
                      type="number"
                      placeholder="Min Demand"
                      value={exportFilters.minDemand}
                      onChange={(e) => setExportFilters({...exportFilters, minDemand: e.target.value})}
                      className="form-input"
                    />
                    <span className="range-separator">to</span>
                    <input
                      type="number"
                      placeholder="Max Demand"
                      value={exportFilters.maxDemand}
                      onChange={(e) => setExportFilters({...exportFilters, maxDemand: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="filter-summary">
                <p>
                  <strong>Items matching filters:</strong>{' '}
                  {result && result.predictions ? applyExportFilters(result.predictions).length : 0} of {result?.predictions?.length || 0}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setExportFilters({
                  status: 'all',
                  minPrice: '',
                  maxPrice: '',
                  minStock: '',
                  maxStock: '',
                  minDemand: '',
                  maxDemand: '',
                  category: 'all'
                })}
              >
                Clear Filters
              </button>
              <button className="btn-primary" onClick={executeExport}>
                📥 Export to CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkPrediction;
