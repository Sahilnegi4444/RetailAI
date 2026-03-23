import "./Sidebar.css";

const Sidebar = ({ activeView, setActiveView }) => {
  const menuItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "bulk", icon: "📋", label: "Bulk Orders" },
    { id: "database", icon: "🗄️", label: "Database" },
    { id: "upload", icon: "📤", label: "Upload Data" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🎯</span>
          <span className="logo-text">RetailAI</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? "active" : ""}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">👤</div>
          <div className="user-info">
            <div className="user-name">Demo User</div>
            <div className="user-role">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
