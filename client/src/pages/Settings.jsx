import { useState, useEffect } from "react";
import "./Settings.css";

const Settings = () => {
  const [selectedModel, setSelectedModel] = useState("primary");
  const [apiStatus, setApiStatus] = useState({ primary: false, secondary: false });

  useEffect(() => {
    // Load saved model preference
    const saved = localStorage.getItem("selectedModel");
    if (saved) {
      setSelectedModel(saved);
    }
    
    // Check API status
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    // Check primary model
    try {
      const res = await fetch("http://127.0.0.1:8000/");
      if (res.ok) {
        setApiStatus(prev => ({ ...prev, primary: true }));
      }
    } catch (error) {
      setApiStatus(prev => ({ ...prev, primary: false }));
    }

    // Check secondary model
    try {
      const res = await fetch("http://127.0.0.1:8001/");
      if (res.ok) {
        setApiStatus(prev => ({ ...prev, secondary: true }));
      }
    } catch (error) {
      setApiStatus(prev => ({ ...prev, secondary: false }));
    }
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    localStorage.setItem("selectedModel", model);
    
    // Update API URL
    const apiUrl = model === "primary" 
      ? "http://127.0.0.1:8000" 
      : "http://127.0.0.1:8001";
    localStorage.setItem("apiUrl", apiUrl);
    
    // Reload page to apply changes
    window.location.reload();
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <p className="subtitle">Configure your prediction model preferences</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2>Model Selection</h2>
          <p className="section-description">
            Choose which prediction model to use for forecasting
          </p>

          <div className="model-cards">
            <div 
              className={`model-card ${selectedModel === "primary" ? "selected" : ""} ${!apiStatus.primary ? "offline" : ""}`}
              onClick={() => apiStatus.primary && handleModelChange("primary")}
            >
              <div className="model-card-header">
                <div className="model-icon">🏪</div>
                <div className="model-status">
                  {apiStatus.primary ? (
                    <span className="status-badge online">Online</span>
                  ) : (
                    <span className="status-badge offline">Offline</span>
                  )}
                </div>
              </div>
              <h3>Primary Model</h3>
              <p className="model-description">
                General retail demand forecasting model trained on diverse retail data
              </p>
              <div className="model-stats">
                <div className="stat">
                  <span className="stat-label">Accuracy</span>
                  <span className="stat-value">87.12%</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Port</span>
                  <span className="stat-value">8000</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Data Type</span>
                  <span className="stat-value">General Retail</span>
                </div>
              </div>
              {selectedModel === "primary" && (
                <div className="selected-badge">✓ Currently Selected</div>
              )}
            </div>

            <div 
              className={`model-card ${selectedModel === "secondary" ? "selected" : ""} ${!apiStatus.secondary ? "offline" : ""}`}
              onClick={() => apiStatus.secondary && handleModelChange("secondary")}
            >
              <div className="model-card-header">
                <div className="model-icon">🍷</div>
                <div className="model-status">
                  {apiStatus.secondary ? (
                    <span className="status-badge online">Online</span>
                  ) : (
                    <span className="status-badge offline">Offline</span>
                  )}
                </div>
              </div>
              <h3>Secondary Model (My Store)</h3>
              <p className="model-description">
                Customized model trained on your Liquor & Grocery sales data (2024-2025)
              </p>
              <div className="model-stats">
                <div className="stat">
                  <span className="stat-label">Accuracy</span>
                  <span className="stat-value">81.45%</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Port</span>
                  <span className="stat-value">8001</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Data Type</span>
                  <span className="stat-value">Liquor & Grocery</span>
                </div>
              </div>
              {selectedModel === "secondary" && (
                <div className="selected-badge">✓ Currently Selected</div>
              )}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Model Information</h2>
          <div className="info-grid">
            <div className="info-card">
              <h4>Primary Model</h4>
              <ul>
                <li>Trained on general retail inventory data</li>
                <li>Supports multiple product categories</li>
                <li>Best for: General retail stores</li>
                <li>Features: Weather, seasonality, promotions</li>
              </ul>
            </div>
            <div className="info-card">
              <h4>Secondary Model (My Store)</h4>
              <ul>
                <li>Trained on your actual sales data</li>
                <li>Specialized for Liquor & Grocery items</li>
                <li>Best for: Your specific store operations</li>
                <li>Data: 16,010 weekly records (2024-2025)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>How to Start Models</h2>
          <div className="instructions">
            <div className="instruction-card">
              <h4>Start Primary Model</h4>
              <code>start_primary_model.bat</code>
              <p>Or manually:</p>
              <code>cd inventory_model\src</code>
              <code>python -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload</code>
            </div>
            <div className="instruction-card">
              <h4>Start Secondary Model</h4>
              <code>start_secondary_model.bat</code>
              <p>Or manually:</p>
              <code>cd inventory_model_secondary\src</code>
              <code>python -m uvicorn api_secondary:app --host 0.0.0.0 --port 8001 --reload</code>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn-secondary" onClick={checkApiStatus}>
            🔄 Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
