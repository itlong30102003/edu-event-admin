import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Để sử dụng icons web
import './Events.css';
function Events() {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    about: "",
    category: "",
    host: "",
    image: "",
    organizer: {
      name: "",
      field: "",
      avatar: "",
    },
    location: "",
    quantity: "",
    quantitymax: "",
    time: "",
    trailerId: "",
    benefits: [],
  });

  const [benefitText, setBenefitText] = useState('');
  const [benefitIcon, setBenefitIcon] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editEventData, setEditEventData] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const querySnapshot = await getDocs(collection(db, "event"));
    const eventList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setEvents(eventList);
  };

  const handleAddBenefit = () => {
    setNewEvent((prevData) => ({
      ...prevData,
      benefits: [
        ...prevData.benefits,
        { icon: benefitIcon, text: benefitText },
      ],
    }));
    setBenefitText('');
    setBenefitIcon('');
  };
  const handleDeleteEvent = async (id) => {
    await deleteDoc(doc(db, "event", id));
    setSelectedEvent(null);
    fetchEvents();
  };

  const handleUpdateEvent = async (updatedData) => {
    if (!selectedEvent) return;
    await updateDoc(doc(db, "event", selectedEvent.id), updatedData);
    setSelectedEvent(null);
    fetchEvents();
  };
  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.time || !newEvent.location) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    const eventData = {
      title: newEvent.title,
      about: newEvent.about,
      category: newEvent.category,
      host: newEvent.host,
      image: newEvent.image,
      organizer: newEvent.organizer,
      location: newEvent.location,
      quantity: newEvent.quantity,
      quantitymax: newEvent.quantitymax,
      time: Timestamp.fromDate(new Date(newEvent.time)), // lưu kiểu Timestamp
      trailerId: newEvent.trailerId,
      benefits: newEvent.benefits,
    };

    await addDoc(collection(db, "event"), eventData);
    setNewEvent({
      title: "",
      about: "",
      category: "",
      host: "",
      image: "",
      organizer: {
        name: "",
        field: "",
        avatar: "",
      },
      location: "",
      quantity: "",
      quantitymax: "",
      time: "",
      trailerId: "",
      benefits: [],
    });
    fetchEvents(); // load lại danh sách sau khi thêm
  };

  const today = new Date();
  const upcomingEvents = events.filter((e) => e.time?.toDate() >= today);
  const pastEvents = events.filter((e) => e.time?.toDate() < today);

  return (
    <section className="info-section">
      <div className="card">
        <h3>Upcoming Events</h3>
        {upcomingEvents.length > 0 ? (
          <div className="event-list">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="event-item" onClick={() => setSelectedEvent(event)}>
                <h4>{event.title}</h4>
                <p>{event.time.toDate().toLocaleTimeString()}<br />{event.time.toDate().toLocaleDateString()} tại {event.location}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>Không có sự kiện sắp tới.</p>
        )}
      </div>

      <div className="card">
        <h3>Add New Event</h3>
        <div className="card-body">
          {/* Title */}
          <input
            type="text"
            placeholder="Event Title"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          />

          {/* About */}
          <input
            type="text"
            placeholder="About"
            value={newEvent.about}
            onChange={(e) => setNewEvent({ ...newEvent, about: e.target.value })}
          />

          {/* Category */}
          <input
            type="text"
            placeholder="Category"
            value={newEvent.category}
            onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
          />

          {/* Host */}
          <input
            type="text"
            placeholder="Host"
            value={newEvent.host}
            onChange={(e) => setNewEvent({ ...newEvent, host: e.target.value })}
          />

          {/* Organizer Info */}
          <h4>Organizer Info</h4>
          <input
            type="text"
            placeholder="Organizer Name"
            value={newEvent.organizer.name}
            onChange={(e) =>
              setNewEvent({ ...newEvent, organizer: { ...newEvent.organizer, name: e.target.value } })
            }
          />
          <input
            type="text"
            placeholder="Organizer Field"
            value={newEvent.organizer.field}
            onChange={(e) =>
              setNewEvent({ ...newEvent, organizer: { ...newEvent.organizer, field: e.target.value } })
            }
          />
          <input
            type="text"
            placeholder="Organizer Avatar URL"
            value={newEvent.organizer.avatar}
            onChange={(e) =>
              setNewEvent({ ...newEvent, organizer: { ...newEvent.organizer, avatar: e.target.value } })
            }
          />

          {/* Location */}
          <input
            type="text"
            placeholder="Location"
            value={newEvent.location}
            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
          />

          {/* Quantity */}
          <input
            type="number"
            placeholder="Quantity"
            value={newEvent.quantity}
            onChange={(e) => setNewEvent({ ...newEvent, quantity: e.target.value })}
          />

          {/* Max Quantity */}
          <input
            type="number"
            placeholder="Max Quantity"
            value={newEvent.quantitymax}
            onChange={(e) => setNewEvent({ ...newEvent, quantitymax: e.target.value })}
          />

          {/* Event Time */}
          <input
            type="datetime-local"
            value={newEvent.time}
            onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
          />

          {/* Trailer ID (YouTube ID) */}
          <input
            type="text"
            placeholder="Trailer ID (YouTube)"
            value={newEvent.trailerId}
            onChange={(e) => setNewEvent({ ...newEvent, trailerId: e.target.value })}
          />

          {/* Benefits Section */}
          <h4>Benefits</h4>
          <input
            type="text"
            placeholder="Benefit Text"
            value={benefitText}
            onChange={(e) => setBenefitText(e.target.value)}
          />
          <input
            type="text"
            placeholder="Benefit Icon"
            value={benefitIcon}
            onChange={(e) => setBenefitIcon(e.target.value)}
          />
          <button onClick={handleAddBenefit}>Add Benefit</button>

          <div>
            {newEvent.benefits.map((benefit, index) => (
              <div key={index}>
                <FontAwesomeIcon name={benefit.icon} size="lg" />
                <span>{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Image URL */}
          <input
            type="text"
            placeholder="Image URL"
            value={newEvent.image}
            onChange={(e) => setNewEvent({ ...newEvent, image: e.target.value })}
          />

          {/* Submit Button */}
          <button onClick={handleAddEvent}>Add Event</button>
        </div>
      </div>

      <div className="card">
        <h3>Past Events</h3>
        <div className="card-body">
          {pastEvents.length > 0 ? (
            <ul>
              {pastEvents.map((event) => (
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
            <button className="edit-button" onClick={() => handleUpdateEvent({
              title: prompt("Nhập tiêu đề mới:", selectedEvent.title) || selectedEvent.title
            })}>Sửa tiêu đề</button>
            <button className="close-button" onClick={() => setSelectedEvent(null)}>Đóng</button>
          </div>

        </div>
      )}

    </section>
  );
}

export default Events;
