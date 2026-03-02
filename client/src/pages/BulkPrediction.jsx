import React, { useState, useEffect } from "react";
import { getBulkPrediction, getStores } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import "./BulkPrediction.css";

const BulkPrediction = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [predictionDate, setPredictionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isSingleStore, setIsSingleStore] = useState(false);

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
              const response = await fetch(`${localStorage.getItem("apiUrl") || "http://127.0.0.1:8001"}/items`);
              const itemsData = await response.json();
              
              if (itemsData.grocery && itemsData.liquor) {
                setAvailableCategories([
                  { value: "all", label: "All Categories", count: itemsData.summary?.total_items || 0 },
                  { value: "grocery", label: "Grocery", count: itemsData.grocery.total || 0 },
                  { value: "liquor", label: "Liquor", count: itemsData.liquor.total || 0 }
                ]);
              }
            } catch (error) {
              console.error("Failed to load categories:", error);
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
    try {
      const requestData = {
        store_id: selectedStore,
        prediction_date: predictionDate
      };
      
      // Add category filter for Model 2
      if (selectedCategory && selectedCategory !== "all") {
        requestData.category_filter = selectedCategory;
      }
      
      const data = await getBulkPrediction(selectedStore, predictionDate, requestData);
      
      // Check if there's an error in the response
      if (data.error) {
        setError(data.error);
        setResult(null);
        return;
      }
      
      // Filter results by category if selected
      if (selectedCategory && selectedCategory !== "all" && data.predictions) {
        data.predictions = data.predictions.filter(p => 
          p.category && p.category.toLowerCase() === selectedCategory.toLowerCase()
        );
        
        // Update summary counts
        if (data.summary) {
          data.summary.total_products = data.predictions.length;
          data.summary.critical_stock = data.predictions.filter(p => p.status === 'CRITICAL').length;
          data.summary.low_stock = data.predictions.filter(p => p.status === 'LOW').length;
          data.summary.adequate_stock = data.predictions.filter(p => p.status === 'ADEQUATE').length;
          data.summary.excess_stock = data.predictions.filter(p => p.status === 'EXCESS').length;
        }
      }
      
      setResult(data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Failed to generate predictions. Please check if the API is running.";
      setError(errorMsg);
      console.error("Bulk prediction error:", err);
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
              Prediction Date
              <span className="help-tooltip" title="Select when you want to check stock levels. The system will calculate how much you need by that date.">ℹ️</span>
            </label>
            <div className="date-picker-container">
              <input
                type="date"
                value={predictionDate}
                onChange={(e) => setPredictionDate(e.target.value)}
                className="form-input"
                min={new Date().toISOString().split("T")[0]}
                max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              />
              <div className="date-shortcuts">
                <button
                  type="button"
                  className="btn-date-shortcut"
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 7);
                    setPredictionDate(date.toISOString().split("T")[0]);
                  }}
                  title="Predict stock needs for next week"
                >
                  +1 Week
                </button>
                <button
                  type="button"
                  className="btn-date-shortcut"
                  onClick={() => {
                    const date = new Date();
                    date.setMonth(date.getMonth() + 1);
                    setPredictionDate(date.toISOString().split("T")[0]);
                  }}
                  title="Predict stock needs for next month"
                >
                  +1 Month
                </button>
                <button
                  type="button"
                  className="btn-date-shortcut"
                  onClick={() => {
                    const date = new Date();
                    date.setMonth(date.getMonth() + 3);
                    setPredictionDate(date.toISOString().split("T")[0]);
                  }}
                  title="Predict stock needs for next 3 months"
                >
                  +3 Months
                </button>
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

          {/* Products Table */}
          <div className="products-table-card">
            <div className="table-header">
              <h2>📊 Product Order Recommendations</h2>
              <div className="table-actions">
                <button className="btn-secondary">Export to CSV</button>
                <button className="btn-secondary">Print Report</button>
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
                  {result.predictions.map((product, index) => (
                    <React.Fragment key={product.product_id || product.item_name || index}>
                      <tr
                        className={`product-row ${
                          expandedProduct === (product.product_id || product.item_name) ? "expanded" : ""
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
                          {product.product_id || product.item_name || 'N/A'}
                        </td>
                        <td>{product.category}</td>
                        <td>{product.current_stock}</td>
                        <td className="predicted-value">
                          {product.predicted_demand}
                        </td>
                        <td className="order-qty">
                          <strong>{product.recommended_order}</strong>
                        </td>
                        <td>₹{(product.recommended_order * product.price).toFixed(2)}</td>
                        <td>
                          <span className="confidence-badge">
                            {product.confidence}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-explain"
                            onClick={() => toggleExpand(product.product_id || product.item_name)}
                          >
                            {expandedProduct === (product.product_id || product.item_name)
                              ? "Hide"
                              : "Explain"}
                          </button>
                        </td>
                      </tr>

                      {expandedProduct === (product.product_id || product.item_name) && (
                        <tr className="expanded-row">
                          <td colSpan="9">
                            <div className="expanded-content">
                              {/* Demand Projections */}
                              <div className="projections-section">
                                <h3>📊 Demand Projections Breakdown</h3>
                                <p className="section-note">
                                  These projections show how much customers will buy over different time periods. 
                                  <strong> Low</strong> = conservative estimate, <strong>Average</strong> = most likely, <strong>High</strong> = optimistic scenario.
                                </p>
                                
                                <div className="projection-grid">
                                  {/* Daily Average */}
                                  <div className="projection-card" key="daily">
                                    <div className="projection-header">
                                      <span className="projection-icon">📆</span>
                                      <div>
                                        <h5>Daily Average</h5>
                                        <p className="projection-subtitle">
                                          {product.demand_breakdown?.daily_average?.explanation || "Average daily sales rate"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="projection-values">
                                      <div className="proj-value">
                                        <span>Low</span>
                                        <strong>{product.demand_breakdown?.daily_average?.low || 0}</strong>
                                      </div>
                                      <div className="proj-value highlight">
                                        <span>Average</span>
                                        <strong>{product.demand_breakdown?.daily_average?.average || 0}</strong>
                                      </div>
                                      <div className="proj-value">
                                        <span>High</span>
                                        <strong>{product.demand_breakdown?.daily_average?.high || 0}</strong>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Weekly */}
                                  <div className="projection-card" key="weekly">
                                    <div className="projection-header">
                                      <span className="projection-icon">📅</span>
                                      <div>
                                        <h5>Weekly (7 Days)</h5>
                                        <p className="projection-subtitle">
                                          {product.demand_breakdown?.weekly?.explanation || "Expected sales for the next week"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="projection-values">
                                      <div className="proj-value">
                                        <span>Low</span>
                                        <strong>{product.demand_breakdown?.weekly?.low || 0}</strong>
                                      </div>
                                      <div className="proj-value highlight">
                                        <span>Average</span>
                                        <strong>{product.demand_breakdown?.weekly?.average || 0}</strong>
                                      </div>
                                      <div className="proj-value">
                                        <span>High</span>
                                        <strong>{product.demand_breakdown?.weekly?.high || 0}</strong>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Monthly */}
                                  <div className="projection-card" key="monthly">
                                    <div className="projection-header">
                                      <span className="projection-icon">📅</span>
                                      <div>
                                        <h5>Monthly (30 Days)</h5>
                                        <p className="projection-subtitle">
                                          {product.demand_breakdown?.monthly?.explanation || "Expected sales for the next month"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="projection-values">
                                      <div className="proj-value">
                                        <span>Low</span>
                                        <strong>{product.demand_breakdown?.monthly?.low || 0}</strong>
                                      </div>
                                      <div className="proj-value highlight">
                                        <span>Average</span>
                                        <strong>{product.demand_breakdown?.monthly?.average || 0}</strong>
                                      </div>
                                      <div className="proj-value">
                                        <span>High</span>
                                        <strong>{product.demand_breakdown?.monthly?.high || 0}</strong>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Quarterly */}
                                  <div className="projection-card" key="quarterly">
                                    <div className="projection-header">
                                      <span className="projection-icon">📊</span>
                                      <div>
                                        <h5>Quarterly (90 Days)</h5>
                                        <p className="projection-subtitle">
                                          {product.demand_breakdown?.quarterly?.explanation || "Expected sales for the next quarter"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="projection-values">
                                      <div className="proj-value">
                                        <span>Low</span>
                                        <strong>{product.demand_breakdown?.quarterly?.low || 0}</strong>
                                      </div>
                                      <div className="proj-value highlight">
                                        <span>Average</span>
                                        <strong>{product.demand_breakdown?.quarterly?.average || 0}</strong>
                                      </div>
                                      <div className="proj-value">
                                        <span>High</span>
                                        <strong>{product.demand_breakdown?.quarterly?.high || 0}</strong>
                                      </div>
                                    </div>
                                  </div>
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
                                        ₹{product.potential_revenue || 0}
                                      </strong>
                                    </div>
                                    <div className="financial-item">
                                      <span>Revenue at Risk:</span>
                                      <strong className="danger">
                                        ₹{product.lost_revenue_risk || 0}
                                      </strong>
                                    </div>
                                    <div className="financial-item">
                                      <span>Unit Price:</span>
                                      <strong>₹{product.price || 0}</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="history-section">
                                  <h4>📊 Last 4 Weeks Performance</h4>
                                  <p className="section-note">How accurate our predictions were recently</p>
                                  <table className="history-table">
                                    <thead>
                                      <tr>
                                        <th>Date</th>
                                        <th>Predicted</th>
                                        <th>Actual</th>
                                        <th>Accuracy</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {product.last_4_weeks?.map((week, idx) => {
                                        const accuracy =
                                          week.actual > 0
                                            ? (
                                                (1 -
                                                  Math.abs(
                                                    week.predicted - week.actual
                                                  ) /
                                                    week.actual) *
                                                100
                                              ).toFixed(1)
                                            : "N/A";
                                        return (
                                          <tr key={`week-${idx}`}>
                                            <td>{week.date}</td>
                                            <td>{week.predicted}</td>
                                            <td>{week.actual}</td>
                                            <td>
                                              <span className="accuracy-badge">
                                                {accuracy}%
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      }) || []}
                                    </tbody>
                                  </table>
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
    </div>
  );
};

export default BulkPrediction;
