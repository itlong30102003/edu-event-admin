import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import OrganizerDashboard from "./pages/OrganizerDashboard"


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/organizer" element={<OrganizerDashboard />} />

      </Routes>
    </Router>
  )
}

export default App
