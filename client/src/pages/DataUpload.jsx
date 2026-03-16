import { useState, useEffect } from "react";
import { getDataFormat, uploadMonthlyData, updateStock, retrainModel } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./DataUpload.css";

const DataUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [retrainResult, setRetrainResult] = useState(null);
  const [dataFormat, setDataFormat] = useState(null);
  const [showFormatPreview, setShowFormatPreview] = useState(false);
  
  // Form fields
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedCategory, setSelectedCategory] = useState("Grocery");
  
  // Stock update
  const [stockUpdates, setStockUpdates] = useState([]);
  const [showStockUpdate, setShowStockUpdate] = useState(false);

  useEffect(() => {
    loadDataFormat();
  }, []);

  const loadDataFormat = async () => {
    try {
      const data = await getDataFormat();
      setDataFormat(data);
    } catch (error) {
      console.error("Failed to load data format:", error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (validTypes.includes(selectedFile.type) || 
          selectedFile.name.endsWith('.xlsx') || 
          selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        alert("Please select an Excel file (.xls or .xlsx)");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const result = await uploadMonthlyData(file, selectedYear, selectedMonth, selectedCategory);
      setUploadResult(result);
      if (result.success) {
        setFile(null);
        document.getElementById("file-input").value = "";
      }
    } catch (error) {
      setUploadResult({ error: error.response?.data?.error || "Failed to upload file" });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleRetrain = async () => {
    if (!confirm("This will reload all data and update predictions. Continue?")) {
      return;
    }

    setRetraining(true);
    setRetrainResult(null);

    try {
      const result = await retrainModel();
      setRetrainResult(result);
    } catch (error) {
      setRetrainResult({ error: error.response?.data?.error || "Failed to retrain model" });
      console.error(error);
    } finally {
      setRetraining(false);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="data-upload-page">
      <div className="page-header">
        <h1>📤 Data Upload & Model Training</h1>
        <p className="subtitle">
          Upload monthly sales data and retrain the AI model with latest information
        </p>
      </div>

      {/* Format Preview Section */}
      <div className="format-preview-card">
        <div className="format-header">
          <h2>📋 Expected Excel Format</h2>
          <button 
            className="btn-secondary"
            onClick={() => setShowFormatPreview(!showFormatPreview)}
          >
            {showFormatPreview ? "Hide Format" : "Show Format"}
          </button>
        </div>

        {showFormatPreview && dataFormat && (
          <div className="format-content">
            <div className="format-info">
              <div className="info-box">
                <h3>📄 File Requirements</h3>
                <ul>
                  <li><strong>Format:</strong> {dataFormat.format} (Excel file)</li>
                  <li><strong>File Types:</strong> {dataFormat.file_types.join(", ")}</li>
                  <li><strong>One file per month</strong> - System will overwrite existing data</li>
                  <li><strong>Naming:</strong> Use format like "06 JUN.xls" or "sale jun 24.xlsx"</li>
                </ul>
              </div>

              <div className="info-box">
                <h3>📊 Required Columns</h3>
                <div className="columns-grid">
                  {dataFormat.required_columns.slice(0, 6).map((col, idx) => (
                    <div key={idx} className="column-item">
                      <strong>{col.name}</strong>
                      <span className="column-type">{col.type}</span>
                      <p>{col.description}</p>
                    </div>
                  ))}
                </div>
                <button 
                  className="btn-link"
                  onClick={() => alert(dataFormat.required_columns.map(c => `${c.name}: ${c.description}`).join('\n'))}
                >
                  View All {dataFormat.required_columns.length} Columns
                </button>
              </div>
            </div>

            <div className="sample-data-section">
              <h3>📝 Sample Data Row</h3>
              <div className="sample-table-wrapper">
                <table className="sample-table">
                  <thead>
                    <tr>
                      {Object.keys(dataFormat.sample_data[0]).slice(0, 8).map((key, idx) => (
                        <th key={idx}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {Object.values(dataFormat.sample_data[0]).slice(0, 8).map((val, idx) => (
                        <td key={idx}>{val}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="important-notes">
              <h3>⚠️ Important Notes</h3>
              <ul>
                {dataFormat.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="upload-section-grid">
        <div className="upload-card">
          <h2>📁 Upload Monthly Sales Data</h2>
          <p className="card-description">
            Upload Excel file with monthly sales data. Select the year, month, and category for the data you're uploading.
          </p>

          <div className="upload-form">
            <div className="form-row">
              <div className="form-group">
                <label>Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="form-input"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>

              <div className="form-group">
                <label>Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="form-input"
                >
                  {monthNames.map((month, idx) => (
                    <option key={idx} value={idx + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="form-input"
                >
                  <option value="Grocery">Grocery</option>
                  <option value="Liquor">Liquor</option>
                </select>
              </div>
            </div>

            <div className="upload-info-banner">
              <span className="info-icon">ℹ️</span>
              <span>
                Uploading data for: <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> - <strong>{selectedCategory}</strong>
              </span>
            </div>

            <div className="upload-area">
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="file-input" className="file-label">
                <span className="upload-icon">📄</span>
                <span className="upload-text">
                  {file ? file.name : "Click to select Excel file"}
                </span>
                <span className="upload-hint">Excel files only (.xls, .xlsx)</span>
              </label>
            </div>

            {file && (
              <div className="file-info">
                <div className="file-details">
                  <span className="file-name">📎 {file.name}</span>
                  <span className="file-size">
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? "Uploading..." : "Upload Data"}
                </button>
              </div>
            )}

            {uploading && <LoadingSpinner message="Uploading monthly data..." />}

            {uploadResult && (
              <div
                className={`result-box ${
                  uploadResult.success ? "success" : "error"
                }`}
              >
                {uploadResult.success ? (
                  <>
                    <h3>✅ Upload Successful!</h3>
                    <div className="result-details">
                      <p><strong>File:</strong> {uploadResult.filename}</p>
                      <p><strong>Period:</strong> {monthNames[uploadResult.month - 1]} {uploadResult.year}</p>
                      <p><strong>Category:</strong> {uploadResult.category}</p>
                      <p className="success-message">{uploadResult.message}</p>
                      <p className="note-message">{uploadResult.note}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>❌ Upload Failed</h3>
                    <p className="error-message">{uploadResult.error}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Retrain Model Section */}
        <div className="retrain-card">
          <h2>🤖 Retrain AI Model</h2>
          <p className="card-description">
            After uploading new data, retrain the model to update all predictions with the latest information.
          </p>

          <div className="retrain-info">
            <div className="info-item">
              <span className="info-icon">🔄</span>
              <div>
                <h4>What happens during retraining?</h4>
                <ul>
                  <li>Reloads all Excel files from data folder</li>
                  <li>Processes and analyzes all sales records</li>
                  <li>Updates item profiles and patterns</li>
                  <li>Recalculates seasonal factors and trends</li>
                  <li>Updates all predictions immediately</li>
                </ul>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">⏱️</span>
              <div>
                <h4>Processing Time</h4>
                <p>Retraining takes 30-60 seconds to process all data. The system will remain available during this time.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="btn-primary btn-large"
          >
            {retraining ? "Retraining Model..." : "🔄 Retrain Model with Latest Data"}
          </button>

          {retraining && <LoadingSpinner message="Retraining model with latest data... This may take up to 60 seconds" />}

          {retrainResult && (
            <div
              className={`result-box ${
                retrainResult.success ? "success" : "error"
              }`}
            >
              {retrainResult.success ? (
                <>
                  <h3>✅ Model Retrained Successfully!</h3>
                  <div className="result-details">
                    <p className="success-message">{retrainResult.message}</p>
                    {retrainResult.statistics && (
                      <div className="statistics-grid">
                        <div className="stat-item">
                          <span className="stat-label">Total Items</span>
                          <span className="stat-value">{retrainResult.statistics.total_items}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Critical Items</span>
                          <span className="stat-value critical">{retrainResult.statistics.critical_items}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Grocery Items</span>
                          <span className="stat-value">{retrainResult.statistics.grocery_items}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Liquor Items</span>
                          <span className="stat-value">{retrainResult.statistics.liquor_items}</span>
                        </div>
                      </div>
                    )}
                    <p className="note-message">{retrainResult.note}</p>
                  </div>
                </>
              ) : (
                <>
                  <h3>❌ Retraining Failed</h3>
                  <p className="error-message">{retrainResult.error}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions-card">
        <h2>📋 Step-by-Step Instructions</h2>
        <div className="instructions-content">
          <div className="instruction-step">
            <span className="step-number">1</span>
            <div>
              <h3>Prepare Your Excel File</h3>
              <p>
                Ensure your Excel file follows the required format (click "Show Format" above to see details).
                The file should be tab-delimited with all required columns, especially <strong>Net_Qty</strong> which contains actual units sold.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">2</span>
            <div>
              <h3>Select Period and Category</h3>
              <p>
                Choose the year, month, and category (Grocery or Liquor) for the data you're uploading.
                The system will save the file in the correct location and overwrite any existing data for that period.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">3</span>
            <div>
              <h3>Upload the File</h3>
              <p>
                Click the upload area to select your Excel file, then click "Upload Data".
                The system will validate and save your file to the appropriate folder.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">4</span>
            <div>
              <h3>Retrain the Model</h3>
              <p>
                After uploading new data, click "Retrain Model" to update all predictions.
                This will reload all data files and recalculate patterns, trends, and forecasts.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">5</span>
            <div>
              <h3>View Updated Predictions</h3>
              <p>
                Go to the "Bulk Order Predictions" page to see updated forecasts based on your new data.
                All predictions will now reflect the latest sales patterns and trends.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="tips-card">
        <h2>💡 Quick Tips</h2>
        <div className="tips-grid">
          <div className="tip-item">
            <span className="tip-icon">📅</span>
            <div>
              <h4>Monthly Updates</h4>
              <p>Upload data at the end of each month to keep predictions accurate and up-to-date.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🔄</span>
            <div>
              <h4>Overwrite Protection</h4>
              <p>Uploading data for the same month/year/category will replace the existing file - use this to correct errors.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📊</span>
            <div>
              <h4>Data Quality</h4>
              <p>Ensure Net_Qty column is accurate - this is the most important field for predictions.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">⚡</span>
            <div>
              <h4>Immediate Effect</h4>
              <p>After retraining, all predictions update immediately - no need to restart the system.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
