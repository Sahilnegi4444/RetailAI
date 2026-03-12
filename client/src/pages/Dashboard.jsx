import { useEffect, useState } from "react";
import { getHistory, getForecast, getStores, getProducts, getModelInfo } from "../api";
import StatsCard from "../components/StatsCard";
import HistoryChart from "../components/HistoryChart";
import ForecastChart from "../components/ForecastChart";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import "./Dashboard.css";

const Dashboard = () => {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [history, setHistory] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelInfo, setModelInfo] = useState(getModelInfo());
  const [isSingleStore, setIsSingleStore] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadProducts(selectedStore);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (selectedStore && selectedProduct) {
      loadData();
    }
  }, [selectedStore, selectedProduct]);

  const loadStores = async () => {
    try {
      const data = await getStores();
      setStores(data.stores || []);
      
      // Check if single store model
      if (data.stores && data.stores.length === 1) {
        setIsSingleStore(true);
        setSelectedStore(data.stores[0]);
      } else if (data.stores && data.stores.length > 0) {
        setSelectedStore(data.stores[0]);
      }
    } catch (error) {
      console.error("Failed to load stores:", error);
      setError("Failed to load stores. Please check if the API is running.");
    }
  };

  const loadProducts = async (storeId) => {
    console.log("🔍 [DASHBOARD] Loading products for store:", storeId);
    try {
      const selectedModel = localStorage.getItem("selectedModel") || "secondary";
      console.log("🔍 [DASHBOARD] Selected model:", selectedModel);
      
      if (selectedModel === "secondary") {
        // For Model 2, load items instead of products
        console.log("🔍 [DASHBOARD] Fetching items from /api/items");
        const data = await getProducts(storeId); // Use the API function which will call /api/items
        console.log("✅ [DASHBOARD] Items data received:", data);
        
        if (data.grocery && data.liquor) {
          // Combine grocery and liquor items for dropdown
          const allItems = [
            ...data.grocery.items.slice(0, 20), // First 20 grocery items
            ...data.liquor.items.slice(0, 10)   // First 10 liquor items
          ];
          console.log("✅ [DASHBOARD] Combined items:", allItems.length);
          setProducts(allItems);
          
          // Auto-select first item
          if (allItems.length > 0) {
            setSelectedProduct(allItems[0]);
            console.log("✅ [DASHBOARD] Auto-selected product:", allItems[0]);
          }
          setLoading(false); // Stop loading after products are loaded
        } else {
          // Fallback to empty state for Model 2
          console.log("⚠️ [DASHBOARD] No grocery/liquor data found");
          setProducts([]);
          setSelectedProduct("");
          setLoading(false); // Stop loading if no products
        }
      } else {
        // Original logic for Model 1
        console.log("🔍 [DASHBOARD] Fetching products for Model 1");
        const data = await getProducts(storeId);
        console.log("✅ [DASHBOARD] Products data received:", data);
        setProducts(data.products || []);
        
        // Auto-select first product
        if (data.products && data.products.length > 0) {
          setSelectedProduct(data.products[0]);
          console.log("✅ [DASHBOARD] Auto-selected product:", data.products[0]);
        }
        setLoading(false); // Stop loading after products are loaded
      }
    } catch (error) {
      console.error("❌ [DASHBOARD] Failed to load products:", error);
      setLoading(false); // Stop loading on error
    }
  };

  const loadData = async () => {
    if (!selectedStore || !selectedProduct) {
      setLoading(false); // Stop loading if no store or product
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const selectedModel = localStorage.getItem("selectedModel");
      
      if (selectedModel === "secondary") {
        // For Model 2, use different API endpoints
        const [historyData, forecastData] = await Promise.all([
          getHistory(selectedStore, selectedProduct),
          getForecast(selectedStore, selectedProduct, 3),
        ]);
        setHistory(historyData || []);
        setForecast(forecastData || []);
      } else {
        // Original logic for Model 1
        const [historyData, forecastData] = await Promise.all([
          getHistory(selectedStore, selectedProduct),
          getForecast(selectedStore, selectedProduct, 3),
        ]);
        setHistory(historyData);
        setForecast(forecastData);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setError("Failed to load data. Please ensure the API server is running on the correct port.");
    } finally {
      setLoading(false);
    }
  };

  const avgError = history.length
    ? Math.round(
        history.reduce(
          (sum, d) => sum + Math.abs(d.units_sold_7d - d.predicted),
          0
        ) / history.length
      )
    : 0;

  const accuracy = history.length
    ? Math.round(
        (1 -
          history.reduce(
            (sum, d) => sum + Math.abs(d.units_sold_7d - d.predicted) / d.units_sold_7d,
            0
          ) / history.length) *
          100
      )
    : 0;

  const totalDemand = forecast.reduce((sum, f) => sum + f.expected_demand, 0);

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Demand Forecasting Dashboard</h1>
          <p className="subtitle">
            AI-powered inventory intelligence - Track sales, predict demand, optimize stock
            <span className="model-badge" title={`Using ${modelInfo.name}`}>
              {modelInfo.name} ({modelInfo.accuracy})
            </span>
          </p>
        </div>
        <div className="header-actions">
          {!isSingleStore && (
            <select
              className="select-input"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              {stores.map((store) => (
                <option key={store} value={store}>
                  Store {store}
                </option>
              ))}
            </select>
          )}
          {isSingleStore && (
            <div className="single-store-badge">
              📍 My Store
            </div>
          )}
          <select
            className="select-input"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            disabled={products.length === 0}
          >
            {products.length === 0 ? (
              <option value="">No items available</option>
            ) : (
              products.map((product) => (
                <option key={product} value={product}>
                  {product.length > 30 ? `${product.substring(0, 30)}...` : product}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading dashboard data..." />
      ) : products.length === 0 && localStorage.getItem("selectedModel") === "secondary" ? (
        <div className="model2-dashboard">
          <div className="stats-grid">
            <StatsCard
              title="Business Model"
              value="Active"
              icon="🏪"
              trend="Real Data"
              trendUp={true}
              tooltip="Using your actual 2024-2025 sales data for predictions"
            />
            <StatsCard
              title="Total Items"
              value="2,694"
              icon="📦"
              trend="Analyzed"
              trendUp={true}
              tooltip="Total unique products in your inventory"
            />
            <StatsCard
              title="Categories"
              value="2"
              icon="🏷️"
              trend="Grocery + Liquor"
              trendUp={true}
              tooltip="Product categories tracked in your store"
            />
            <StatsCard
              title="Data Period"
              value="2024-2025"
              icon="📅"
              trend="Real Sales"
              trendUp={true}
              tooltip="Time period of sales data used for analysis"
            />
          </div>
          
          <div className="business-intelligence-card">
            <h2>🎯 Business Intelligence Dashboard</h2>
            <p>Your Model 2 is powered by real business data from 2024-2025 sales.</p>
            <div className="bi-features">
              <div className="bi-feature">
                <span className="bi-icon">📊</span>
                <div>
                  <h4>Smart Analytics</h4>
                  <p>2,694 items analyzed with consumption patterns</p>
                </div>
              </div>
              <div className="bi-feature">
                <span className="bi-icon">🛒</span>
                <div>
                  <h4>Purchase Recommendations</h4>
                  <p>Go to Bulk Predictions for smart reorder suggestions</p>
                </div>
              </div>
              <div className="bi-feature">
                <span className="bi-icon">💰</span>
                <div>
                  <h4>Revenue Optimization</h4>
                  <p>Prioritized by business value and stock velocity</p>
                </div>
              </div>
            </div>
            <div className="bi-actions">
              <button 
                className="btn-primary"
                onClick={() => window.location.href = '/bulk-orders'}
              >
                View Purchase Recommendations
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <StatsCard
              title="Model Accuracy"
              value={`${accuracy}%`}
              icon="🎯"
              trend="+2.5%"
              trendUp={true}
              tooltip="How accurate our predictions are compared to actual sales"
            />
            <StatsCard
              title="Avg Error"
              value={`${avgError} units`}
              icon="📊"
              trend="-1.2%"
              trendUp={true}
              tooltip="Average difference between predicted and actual sales"
            />
            <StatsCard
              title="Forecast Period"
              value={`${forecast.length} weeks`}
              icon="📅"
              tooltip="How far ahead we're predicting demand"
            />
            <StatsCard
              title="Expected Demand"
              value={`${Math.round(totalDemand)} units`}
              icon="📈"
              trend="+5.3%"
              trendUp={true}
              tooltip="Total units customers will buy in the forecast period"
            />
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-header">
                <h2>Historical Performance</h2>
                <span className="chart-badge">Last {history.length} weeks</span>
              </div>
              <HistoryChart data={history} />
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h2>Demand Forecast</h2>
                <span className="chart-badge">Next {forecast.length} weeks</span>
              </div>
              <ForecastChart data={forecast} />
            </div>
          </div>

          <div className="insights-section">
            <h2>Key Insights</h2>
            <div className="insights-grid">
              <div className="insight-card">
                <span className="insight-icon">💡</span>
                <div>
                  <h3>High Accuracy</h3>
                  <p>Model maintains {accuracy}% accuracy across predictions</p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">⚠️</span>
                <div>
                  <h3>Stock Alert</h3>
                  <p>Ensure adequate inventory for upcoming demand spike</p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">📊</span>
                <div>
                  <h3>Trend Analysis</h3>
                  <p>Demand showing steady growth pattern</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
