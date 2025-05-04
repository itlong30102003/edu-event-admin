import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import OrganizerDashboard from "./pages/OrganizerDashboard"
import Events from "./component/Events"
import EventDetailPage from "./component/EventDetailPage"
import Chat from "./component/Chat"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/organizer" element={<OrganizerDashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/event/:eventId" element={<EventDetailPage />} />
        <Route path="/dashboard/chat/:id" element={<Chat />} />
      </Routes>
    </Router>
  )
}

export default App