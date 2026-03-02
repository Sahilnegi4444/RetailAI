import "./StatsCard.css";

const StatsCard = ({ title, value, icon, trend, trendUp, tooltip }) => {
  return (
    <div className="stats-card" title={tooltip}>
      <div className="stats-header">
        <span className="stats-title">
          {title}
          {tooltip && <span className="help-tooltip">ℹ️</span>}
        </span>
        <span className="stats-icon">{icon}</span>
      </div>
      <div className="stats-value">{value}</div>
      {trend && (
        <div className={`stats-trend ${trendUp ? "trend-up" : "trend-down"}`}>
          <span>{trendUp ? "↑" : "↓"}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
