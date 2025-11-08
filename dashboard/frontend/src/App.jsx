import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PreprocessedInspection from "./pages/PreprocessedInspection";
import LabeledInspection from "./pages/LabeledInspection";
import Sampling from "./pages/Sampling";
import InspectionPage from "./pages/InspectionPage";
import Report from "./pages/Report";
import {
  FileText,
  Tag,
  Shuffle,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";
import "./App.css";

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: "/sampling", icon: Shuffle, label: "샘플링" },
    // { path: '/preprocessed', icon: FileText, label: '전처리 검수' },
    // { path: '/labeled', icon: Tag, label: '라벨링 검수' },
    { path: "/report", icon: BarChart3, label: "검수 결과" },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h1>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>데이터바우처</p>
          <p style={{ fontSize: "0.8rem", color: "gray" }}>검수 대시보드</p>
        </h1>
      </div>
      <ul className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/sampling" replace />} />
          <Route path="/preprocessed" element={<PreprocessedInspection />} />
          <Route path="/labeled" element={<LabeledInspection />} />
          <Route path="/sampling" element={<Sampling />} />
          <Route path="/inspection/:sessionId" element={<InspectionPage />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
