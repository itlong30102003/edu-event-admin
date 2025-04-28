import React, { useState } from "react";
import "./OrganizerDashboard.css";
import { useLocation } from "react-router-dom";

// Import các component con
import Overview from "../component/Overview";
import Events from "../component/Events";
import Locations from "../component/Locations";
import PastEvents from "../component/PastEvents";

function OrganizerDashboard() {
  const location = useLocation();
  const organizer = location.state?.userData;

  // State để lưu trữ mục hiện tại trong sidebar được chọn
  const [selectedSection, setSelectedSection] = useState("overview");

  // Hàm xử lý thay đổi mục sidebar
  const handleSectionChange = (section) => {
    setSelectedSection(section);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Organizer</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button onClick={() => handleSectionChange("overview")} className="sidebar-link">
                <span className="icon">📊</span>
                <span>Overview</span>
              </button>
            </li>
            <li>
              <button onClick={() => handleSectionChange("events")} className="sidebar-link">
                <span className="icon">📅</span>
                <span>Events</span>
              </button>
            </li>
            <li>
              <button onClick={() => handleSectionChange("past")} className="sidebar-link">
                <span className="icon">📍</span>
                <span>Past Events</span>
              </button>
            </li>
            <li>
              <button onClick={() => handleSectionChange("locations")} className="sidebar-link">
                <span className="icon">📍</span>
                <span>Locations</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <div>
            <h1>
              {selectedSection === "overview" ? "Overview" : 
               selectedSection === "events" ? "Events Management" : 
               selectedSection === "locations" ? "Locations Management" : ""}
            </h1>
            {organizer && (
              <p>
                Xin chào, <strong>{organizer?.name || "Người dùng"}</strong> ({organizer?.email || "Không có email"})
              </p>
            )}
          </div>
          <div className="header-search">
            <input type="text" placeholder="Search..." />
            <button className="search-button">🔍</button>
          </div>
        </header>

        {/* Render các component tùy theo section */}
        {selectedSection === "overview" && <Overview />}
        {selectedSection === "events" && <Events />}
        {selectedSection === "past" && <PastEvents />}
        {selectedSection === "locations" && <Locations />}

      </main>
    </div>
  );
}

export default OrganizerDashboard;
