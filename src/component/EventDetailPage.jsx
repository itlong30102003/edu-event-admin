import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faMapMarkerAlt, faTag, faUserTie, faUsers, faTimes } from '@fortawesome/free-solid-svg-icons';
import './EventDetailPage.css';

function EventDetailPage() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedEvent, setEditedEvent] = useState(null);
  const { eventId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventRef = doc(db, "event", eventId);
        const eventDoc = await getDoc(eventRef);
        
        if (eventDoc.exists()) {
          const eventData = {
            id: eventDoc.id,
            ...eventDoc.data()
          };
          setEvent(eventData);
          setEditedEvent(eventData);
        } else {
          console.log("No such event!");
          navigate("/events");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId, navigate]);

  const handleDeleteEvent = async () => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteDoc(doc(db, "event", eventId));
        navigate("/events");
      } catch (error) {
        console.error("Error deleting event:", error);
      }
    }
  };

  const handleUpdateEvent = async () => {
    try {
      const eventRef = doc(db, "event", eventId);
      
      // Prepare data for update (remove id field)
      const { id, ...updateData } = editedEvent;
      
      await updateDoc(eventRef, updateData);
      setEvent(editedEvent);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedEvent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOrganizerChange = (e) => {
    const { name, value } = e.target;
    setEditedEvent(prev => ({
      ...prev,
      organizer: {
        ...prev.organizer,
        [name]: value
      }
    }));
  };

  if (loading) {
    return <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading event details...</p>
    </div>;
  }

  if (!event) {
    return <div className="error-container">
      <div className="error-message">Event not found!</div>
      <button className="primary-button" onClick={() => navigate("/organizer")}>
        Return to Events
      </button>
    </div>;
  }

  return (
    <div className="event-detail-page">
      <div className="event-detail-header">
        <button className="back-button" onClick={() => navigate("/organizer")}>
          <FontAwesomeIcon icon={faCalendarAlt} /> Back to Events
        </button>
        <div className="event-detail-actions">
          <button className="edit-button" onClick={() => setIsEditModalOpen(true)}>
            Edit Event
          </button>
          <button className="delete-button" onClick={handleDeleteEvent}>
            Delete Event
          </button>
        </div>
      </div>
      
      <div className="event-detail-content">
        <div className="event-header-panel">
          <div className="event-title-container">
            <h1 className="event-title">{event.title}</h1>
            <div className="event-capacity">
              <FontAwesomeIcon icon={faUsers} />
              <span>{event.quantity}/{event.quantitymax} Registered</span>
            </div>
          </div>
          
          {event.image && (
            <div className="event-image-container">
              <img src={event.image} alt={event.title} className="event-image" />
            </div>
          )}
        </div>
        
        <div className="event-content-grid">
          <div className="event-info-panel">
            <h3 className="panel-title">Event Details</h3>
            <div className="event-info-content">
              <div className="info-item">
                <FontAwesomeIcon icon={faCalendarAlt} className="info-icon" />
                <div>
                  <h4>Date & Time</h4>
                  <p>{event.time.toDate().toLocaleString()}</p>
                </div>
              </div>
              
              <div className="info-item">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="info-icon" />
                <div>
                  <h4>Location</h4>
                  <p>{event.location}</p>
                </div>
              </div>
              
              <div className="info-item">
                <FontAwesomeIcon icon={faTag} className="info-icon" />
                <div>
                  <h4>Category</h4>
                  <p>{event.category}</p>
                </div>
              </div>
              
              <div className="info-item">
                <FontAwesomeIcon icon={faUserTie} className="info-icon" />
                <div>
                  <h4>Host</h4>
                  <p>{event.host}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="event-about-panel">
            <h3 className="panel-title">About This Event</h3>
            <p className="about-content">{event.about}</p>
          </div>
          
          {event.organizer && (
            <div className="event-organizer-panel">
              <h3 className="panel-title">Organizer</h3>
              <div className="organizer-info">
                {event.organizer.avatar && (
                  <img src={event.organizer.avatar} alt="Organizer" className="organizer-avatar" />
                )}
                <div className="organizer-details">
                  <h4>{event.organizer.name}</h4>
                  <p>{event.organizer.field}</p>
                </div>
              </div>
            </div>
          )}
          
          {event.benefits && event.benefits.length > 0 && (
            <div className="event-benefits-panel">
              <h3 className="panel-title">Benefits</h3>
              <ul className="benefits-list">
                {event.benefits.map((benefit, index) => (
                  <li key={index} className="benefit-item">
                    <FontAwesomeIcon icon={benefit.icon} className="benefit-icon" />
                    <span className="benefit-text">{benefit.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {event.videoUrl && (
          <div className="event-trailer-panel">
            <h3 className="panel-title">Event Video & Location</h3>
            <div className="media-map-grid">
              <div className="trailer-container">
                {event.videoUrl.includes('youtube.com') || event.videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${event.videoUrl.split(/[\/=]/g).pop()}`}
                    title="Event Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : event.videoUrl.includes('facebook.com') ? (
                  <iframe
                    src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(event.videoUrl)}&show_text=false&t=0&width=560`}
                    width="560"
                    height="315"
                    style={{ border: 'none', overflow: 'hidden' }}
                    scrolling="no"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : event.videoUrl.includes('drive.google.com') ? (
                  <iframe
                    src={event.videoUrl.replace('/view', '/preview')}
                    title="Event Video"
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="video-fallback">
                    <a href={event.videoUrl} target="_blank" rel="noopener noreferrer">
                      View Video
                    </a>
                  </div>
                )}
              </div>
              <div className="map-container">
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                  title="Event Location"
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Event Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="modal-title">Edit Event</h2>
              <button className="modal-close-button" onClick={() => setIsEditModalOpen(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="edit-form-grid">
                <div className="edit-form-panel basic-info">
                  <h3 className="panel-title">Basic Information</h3>
                  <div className="form-group">
                    <label>Event Title</label>
                    <input
                      type="text"
                      name="title"
                      value={editedEvent.title}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>About</label>
                    <textarea
                      name="about"
                      value={editedEvent.about}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                  
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      name="category"
                      value={editedEvent.category}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="edit-form-panel location-time">
                  <h3 className="panel-title">Location & Time</h3>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={editedEvent.location}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Date & Time</label>
                    <input
                      type="datetime-local"
                      name="time"
                      value={editedEvent.time}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="edit-form-panel capacity-host">
                  <h3 className="panel-title">Capacity & Host</h3>
                  <div className="form-group">
                    <label>Host</label>
                    <input
                      type="text"
                      name="host"
                      value={editedEvent.host}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Current Capacity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={editedEvent.quantity}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Maximum Capacity</label>
                    <input
                      type="number"
                      name="quantitymax"
                      value={editedEvent.quantitymax}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="edit-form-panel media-content">
                  <h3 className="panel-title">Media Content</h3>
                  <div className="form-group">
                    <label>Image URL</label>
                    <input
                      type="text"
                      name="image"
                      value={editedEvent.image}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Video URL</label>
                    <input
                      type="url"
                      name="videoUrl"
                      value={editedEvent.videoUrl}
                      onChange={handleInputChange}
                      placeholder="Enter video URL (YouTube, Drive, Facebook, etc.)"
                    />
                  </div>
                </div>
                
                <div className="edit-form-panel organizer-info">
                  <h3 className="panel-title">Organizer Information</h3>
                  <div className="form-group">
                    <label>Organizer Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editedEvent.organizer?.name || ""}
                      onChange={handleOrganizerChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Organizer Field</label>
                    <input
                      type="text"
                      name="field"
                      value={editedEvent.organizer?.field || ""}
                      onChange={handleOrganizerChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Organizer Avatar URL</label>
                    <input
                      type="text"
                      name="avatar"
                      value={editedEvent.organizer?.avatar || ""}
                      onChange={handleOrganizerChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="save-button" onClick={handleUpdateEvent}>
                Save Changes
              </button>
              <button className="cancel-button" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetailPage;