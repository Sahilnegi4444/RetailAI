import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import BulkPrediction from "./pages/BulkPrediction";
import Database from "./pages/Database";
import DataUpload from "./pages/DataUpload";
import Sidebar from "./components/Sidebar";
import "./App.css";

function App() {
  const [activeView, setActiveView] = useState("dashboard");

  return (
    <div className="app-container">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="main-content">
        {activeView === "dashboard" && <Dashboard />}
        {activeView === "bulk" && <BulkPrediction />}
        {activeView === "database" && <Database />}
        {activeView === "upload" && <DataUpload />}
      </main>
    </div>
  );
}

export default App;
