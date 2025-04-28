import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import './Events.css';

function Events() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const querySnapshot = await getDocs(collection(db, "event"));
    const eventList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const today = new Date();
    const pastEvents = eventList.filter((e) => e.time?.toDate() < today);
    setEvents(pastEvents);
  };

  const handleDeleteEvent = async (id) => {
    await deleteDoc(doc(db, "event", id));
    setSelectedEvent(null);
    fetchEvents();
  };

  return (
    <section className="info-section">
      <div className="card">
        <h3>Past Events</h3>
        <div className="card-body">
          {events.length > 0 ? (
            <ul>
              {events.map((event) => (
                <li key={event.id} onClick={() => setSelectedEvent(event)} style={{ cursor: "pointer" }}>
                  {event.title} — {event.time.toDate().toLocaleString()} tại {event.location}
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa có sự kiện nào đã qua.</p>
          )}
        </div>
      </div>

      {selectedEvent && (
        <div className="event-detail-overlay">
          <div className="event-detail">
            <h2>{selectedEvent.title}</h2>
            <p><strong>About:</strong> {selectedEvent.about}</p>
            <p><strong>Time:</strong> {selectedEvent.time.toDate().toLocaleString()}</p>
            <p><strong>Location:</strong> {selectedEvent.location}</p>
            <p><strong>Organizer:</strong> {selectedEvent.organizer?.name}</p>
            <button className="delete-button" onClick={() => handleDeleteEvent(selectedEvent.id)}>Xoá sự kiện</button>
            <button className="close-button" onClick={() => setSelectedEvent(null)}>Đóng</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default Events;
