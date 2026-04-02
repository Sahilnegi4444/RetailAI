import React, { useState } from 'react';
import './PredictionModals.css';

export const PredictPreviousYearsModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({ type: 'previous_years', date: selectedDate });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📅 Predict Based on Previous Years</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            This prediction analyzes the same month across all available years to forecast demand.
          </p>

          <div className="form-group">
            <label>Select Month & Year</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
            />
            <small className="help-text">
              The system will extract data for this month from all previous years and calculate:
              Low sales, High sales, and Average (medium) to generate predictions.
            </small>
          </div>

          <div className="prediction-info">
            <h4>📊 What You'll Get:</h4>
            <ul>
              <li>Historical data for each year</li>
              <li>Low, High, and Average sales per year</li>
              <li>Final prediction for current year</li>
              <li>Exportable report with all statistics</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Prediction'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PredictLastNMonthsModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [months, setMonths] = useState(4);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (months < 1 || months > 24) {
      alert('Please enter a number between 1 and 24');
      return;
    }
    onSubmit({ type: 'last_n_months', months: parseInt(months) });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Predict Based on Last N Months</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            This prediction uses the last N months of sales data to forecast future demand.
          </p>

          <div className="form-group">
            <label>Number of Months</label>
            <div className="input-group">
              <button
                className="btn-spinner"
                onClick={() => setMonths(Math.max(1, months - 1))}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max="24"
                value={months}
                onChange={(e) => setMonths(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                className="form-input-number"
              />
              <button
                className="btn-spinner"
                onClick={() => setMonths(Math.min(24, months + 1))}
              >
                +
              </button>
            </div>
            <small className="help-text">
              Recommended: 3-6 months for seasonal patterns, 12+ months for annual trends
            </small>
          </div>

          <div className="prediction-info">
            <h4>📊 What You'll Get:</h4>
            <ul>
              <li>Month-wise breakdown of last {months} months</li>
              <li>Low, High, and Average sales statistics</li>
              <li>Trend analysis (increasing/decreasing/stable)</li>
              <li>Final prediction for next period</li>
              <li>Exportable report with detailed analytics</li>
            </ul>
          </div>

          <div className="months-preview">
            <p className="preview-label">Preview: Last {months} months</p>
            <div className="months-grid">
              {Array.from({ length: months }).map((_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - (months - 1 - i));
                return (
                  <div key={i} className="month-badge">
                    {date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Prediction'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ExportModal = ({ isOpen, onClose, onSubmit, isLoading, totalRecords }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeAnalytics, setIncludeAnalytics] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({
      format: exportFormat,
      includeFilters,
      includeAnalytics
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📥 Export Data</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Export {totalRecords} records with your selected options.
          </p>

          <div className="form-group">
            <label>Export Format</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value)}
                />
                <span>CSV (Excel Compatible)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={(e) => setExportFormat(e.target.value)}
                />
                <span>JSON (Data Format)</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeFilters}
                onChange={(e) => setIncludeFilters(e.target.checked)}
              />
              <span>Include Applied Filters</span>
            </label>
            <small className="help-text">
              Export only records matching current filters
            </small>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeAnalytics}
                onChange={(e) => setIncludeAnalytics(e.target.checked)}
              />
              <span>Include Analytics Summary</span>
            </label>
            <small className="help-text">
              Add summary statistics and charts to export
            </small>
          </div>

          <div className="export-info">
            <h4>📊 Export Details:</h4>
            <ul>
              <li>Total Records: {totalRecords}</li>
              <li>Format: {exportFormat.toUpperCase()}</li>
              <li>Filters: {includeFilters ? 'Applied' : 'Not Applied'}</li>
              <li>Analytics: {includeAnalytics ? 'Included' : 'Not Included'}</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Exporting...' : 'Export Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
