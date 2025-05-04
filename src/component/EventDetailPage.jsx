import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../firebase";
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faMapMarkerAlt, faTag, faUserTie, faUsers, faTimes } from '@fortawesome/free-solid-svg-icons';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import { QRCodeSVG } from 'qrcode.react';
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css";
import 'leaflet/dist/leaflet.css';
import './EventDetailPage.css';

library.add(fas);

const commonIcons = [
  'heart', 'star', 'check', 'gift', 'trophy', 'medal', 'certificate', 
  'graduation-cap', 'book', 'laptop', 'coffee', 'lightbulb', 'smile',
  'clock', 'calendar', 'user-graduate', 'award', 'crown', 'gem',
  'shield-alt', 'thumbs-up', 'comments', 'hand-holding-heart'
];

function EventDetailPage() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedEvent, setEditedEvent] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [benefitText, setBenefitText] = useState('');
  const [benefitIcon, setBenefitIcon] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPicture, setGuestPicture] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isLocalImage, setIsLocalImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isOrganizerAvatarLocal, setIsOrganizerAvatarLocal] = useState(false);
  const [isGuestImageLocal, setIsGuestImageLocal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [guestImagePreview, setGuestImagePreview] = useState('');
  const { eventId } = useParams();
  const navigate = useNavigate();

  // Define time slots constant
  const timeSlots = {
    morning: '07:00:00',
    afternoon: '12:30:00'
  };

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

  // Set initial values when opening the edit modal
  useEffect(() => {
    if (isEditModalOpen && event) {
      // Ensure coordinates exist
      const eventWithDefaults = {
        ...event,
        coordinates: event.coordinates || { lat: 0, lng: 0 }
      };
      setEditedEvent(eventWithDefaults);
      
      // Set the initial selected date and time slot based on event time
      const eventDate = event.time.toDate();
      setSelectedDate(eventDate.toISOString().split('T')[0]);
      
      const hours = eventDate.getHours();
      if (hours === 7) {
        setSelectedTimeSlot('morning');
      } else if (hours === 12) {
        setSelectedTimeSlot('afternoon');
      }

      // Set the selected location
      if (event.coordinates) {
        setSelectedLocation({
          address: event.location,
          coordinates: event.coordinates
        });
      }
    }
  }, [isEditModalOpen, event]);

  const handleDeleteEvent = async () => {
    if (window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      try {
        const eventRef = doc(db, "event", eventId);
        await deleteDoc(eventRef);
        alert("Event deleted successfully.");
        navigate("/organizer");
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Error deleting event. Please try again.");
      }
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

  const handleAddBenefit = () => {
    setEditedEvent(prev => ({
      ...prev,
      benefits: [
        ...prev.benefits,
        { icon: benefitIcon, text: benefitText }
      ]
    }));
    setBenefitText('');
    setBenefitIcon('');
  };

  const handleRemoveBenefit = (index) => {
    setEditedEvent(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const handleAddGuest = () => {
    setEditedEvent(prev => ({
      ...prev,
      guests: [
        ...prev.guests,
        { name: guestName, picture: guestPicture }
      ]
    }));
    setGuestName('');
    setGuestPicture('');
  };

  const handleRemoveGuest = (index) => {
    setEditedEvent(prev => ({
      ...prev,
      guests: prev.guests.filter((_, i) => i !== index)
    }));
  };

  const generateQRData = () => {
    if (!event.coordinates) return '';
    const { lat, lng } = event.coordinates;
    return `${event.id}:${lat}:${lng}`;
  };

  // Map style configuration
  const mapStyle = {
    width: '100%',
    height: '300px'
  };

  const handleUpdateEvent = async () => {
    try {
      const eventRef = doc(db, "event", eventId);
      
      // Create event datetime from selected date and time slot
      const [year, month, day] = selectedDate.split('-');
      const [hours, minutes, seconds] = timeSlots[selectedTimeSlot].split(':');
      const eventDateTime = new Date(year, month - 1, day, hours, minutes, seconds);

      let updateData = {
        ...editedEvent,
        time: Timestamp.fromDate(eventDateTime),
        timeSlot: selectedTimeSlot
      };

      // Remove id field as it shouldn't be updated
      const { id, ...finalUpdateData } = updateData;
      
      await updateDoc(eventRef, finalUpdateData);
      setEvent(updateData);
      setIsEditModalOpen(false);
      
      // Refresh event data
      const updatedDoc = await getDoc(eventRef);
      if (updatedDoc.exists()) {
        setEvent({ id: updatedDoc.id, ...updatedDoc.data() });
      }
    } catch (error) {
      console.error("Error updating event:", error);
      alert('Error updating event. Please try again.');
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    try {
      // Create preview immediately
      const previewUrl = URL.createObjectURL(file);
      setEditedEvent(prev => ({
        ...prev,
        images: [...prev.images, previewUrl]
      }));

      // Upload to Firebase
      const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytes(storageRef, file);
      
      // Handle the upload
      const snapshot = await uploadTask;
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Replace preview with actual URL
      setEditedEvent(prev => ({
        ...prev,
        images: prev.images.map(img => 
          img === previewUrl ? downloadURL : img
        )
      }));

      // Cleanup
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleRemoveImage = (index) => {
    setEditedEvent(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Replace the guest image upload handler
  const handleGuestImageUpload = async (file) => {
    if (!file) return;
    
    try {
      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setGuestImagePreview(previewUrl);

      // Upload to Firebase
      const storageRef = ref(storage, `guests/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytes(storageRef, file);
      
      // Get download URL
      const snapshot = await uploadTask;
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Set the guest picture URL
      setGuestPicture(downloadURL);
      
      // Cleanup preview
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      console.error("Error uploading guest image:", error);
      alert('Failed to upload guest image. Please try again.');
    }
  };

  // Update the handleGuestImageUrl function
  const handleGuestImageUrl = (url) => {
    setGuestPicture(url);
    setGuestImagePreview(url);
  };

  // Add this new function for handling organizer avatar upload
  const handleOrganizerAvatarUpload = async (file) => {
    if (!file) return;
    
    try {
      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setEditedEvent(prev => ({
        ...prev,
        organizer: {
          ...prev.organizer,
          avatar: previewUrl
        }
      }));

      // Upload to Firebase
      const storageRef = ref(storage, `organizers/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytes(storageRef, file);
      
      // Get download URL
      const snapshot = await uploadTask;
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update with actual URL
      setEditedEvent(prev => ({
        ...prev,
        organizer: {
          ...prev.organizer,
          avatar: downloadURL
        }
      }));

      // Cleanup
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      console.error("Error uploading organizer avatar:", error);
      alert('Failed to upload avatar. Please try again.');
    }
  };

  // Add this component near your other component definitions
  function MapEvents({ onMapClick }) {
    const map = useMap();
    
    useEffect(() => {
      if (!map) return;
      
      map.on('click', (e) => {
        onMapClick(e);
      });
      
      return () => {
        map.off('click');
      };
    }, [map, onMapClick]);
    
    return null;
  }

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
              <span>{event.quantity || 0}/{event.quantitymax} Registered</span>
            </div>
          </div>
        </div>
        
        {/* Image Gallery / Carousel */}
        {event.images && event.images.length > 0 && (
          <div className="event-images-gallery">
            <h3 className="panel-title">Event Images</h3>
            <Carousel
              showArrows={true}
              showStatus={false}
              showThumbs={false}
              infiniteLoop={true}
              dynamicHeight={false}
              className="event-carousel"
            >
              {event.images.map((img, index) => (
                <div key={index}>
                  <img src={img} alt={`${event.title} - ${index + 1}`} />
                </div>
              ))}
            </Carousel>
          </div>
        )}
        
        <div className="event-content-grid">
          <div className="event-info-panel">
            <h3 className="panel-title">Event Details</h3>
            <div className="event-info-content">
              <div className="info-item">
                <FontAwesomeIcon icon={faCalendarAlt} className="info-icon" />
                <div>
                  <h4>Date & Time</h4>
                  <p>
                    {event.time?.toDate().toLocaleDateString()} <br />
                    {event.timeSlot === 'morning' ? 'Morning (7:00 AM - 11:30 AM)' : 
                     event.timeSlot === 'afternoon' ? 'Afternoon (12:30 PM - 5:00 PM)' : 
                     event.time?.toDate().toLocaleTimeString()}
                  </p>
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
          
          {/* Display Benefits */}
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
          
          {/* Display Guests */}
          {event.guests && event.guests.length > 0 && (
            <div className="event-guests-panel">
              <h3 className="panel-title">Special Guests</h3>
              <div className="guests-grid">
                {event.guests.map((guest, index) => (
                  <div key={index} className="guest-card">
                    {guest.picture && (
                      <img src={guest.picture} alt={guest.name} className="guest-image" />
                    )}
                    <h4 className="guest-name">{guest.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Video & Map Section */}
        <div className="event-media-panel">
          <h3 className="panel-title">Event Media & Location</h3>
          <div className="media-map-grid">
            {/* Video Section */}
            {event.videoUrl && (
              <div className="video-container">
                <h4>Video</h4>
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
            )}
            
            {/* Map Section */}
            <div className="map-container">
              <h4>Location</h4>
              {event.coordinates ? (
                <MapContainer
                  center={[event.coordinates.lat, event.coordinates.lng]}
                  zoom={17}
                  style={mapStyle}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                  />
                  <Marker position={[event.coordinates.lat, event.coordinates.lng]} />
                  <Circle
                    center={[event.coordinates.lat, event.coordinates.lng]}
                    pathOptions={{ 
                      fillColor: 'red',
                      fillOpacity: 0.2,
                      color: 'red',
                      opacity: 0.5
                    }}
                    radius={50}
                  />
                </MapContainer>
              ) : (
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                  title="Event Location"
                  frameBorder="0"
                  style={mapStyle}
                  allowFullScreen
                ></iframe>
              )}
            </div>
          </div>
        </div>

        <div className="qr-code-section">
          <button 
            className="qr-button" 
            onClick={() => setShowQRCode(!showQRCode)}
            style={{
              padding: '10px 20px',
              margin: '10px 0',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showQRCode ? 'Hide QR Code' : 'Show Event QR Code'}
          </button>
          
          {showQRCode && event.coordinates && (
            <div style={{ 
              marginTop: '10px', 
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <QRCodeSVG 
                value={generateQRData()}
                size={200}
                level={'H'}
                includeMargin={true}
              />
              <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                Scan this QR code to verify your location
              </p>
            </div>
          )}
        </div>
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

                  <div className="form-group">
                    <label>Host</label>
                    <input
                      type="text"
                      name="host"
                      value={editedEvent.host || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="edit-form-panel location-time">
                  <h3 className="panel-title">Location & Time</h3>
                  
                  <div className="form-group">
                    <label>Date & Time</label>
                    <div style={{ marginBottom: '20px' }}>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          // Update editedEvent time when date changes
                          if (selectedTimeSlot) {
                            const dateTime = new Date(`${e.target.value}T${timeSlots[selectedTimeSlot]}`);
                            setEditedEvent(prev => ({
                              ...prev,
                              time: dateTime.toISOString(),
                              timeSlot: selectedTimeSlot
                            }));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          marginBottom: '10px'
                        }}
                      />
                      
                      <select
                        value={selectedTimeSlot}
                        onChange={(e) => {
                          setSelectedTimeSlot(e.target.value);
                          if (selectedDate) {
                            const dateTime = new Date(`${selectedDate}T${timeSlots[e.target.value]}`);
                            setEditedEvent(prev => ({
                              ...prev,
                              time: dateTime.toISOString(),
                              timeSlot: e.target.value
                            }));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          backgroundColor: '#fff',
                          color: '#333',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Select time slot</option>
                        <option value="morning">Morning (7:00 AM - 11:30 AM)</option>
                        <option value="afternoon">Afternoon (12:30 PM - 5:00 PM)</option>
                      </select>
                    </div>
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

                  <div className="form-group">
                    <label>Location & Coordinates</label>
                    <div className="location-map-container" style={{ marginBottom: '20px' }}>
                      <MapContainer 
                        center={[editedEvent.coordinates?.lat || 10.980671753776012, editedEvent.coordinates?.lng || 106.67452525297074]} 
                        zoom={17} 
                        style={{ height: '400px', width: '100%', borderRadius: '4px' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          maxZoom={19}
                        />
                        <MapEvents 
                          onMapClick={(e) => {
                            const { lat, lng } = e.latlng;
                            setEditedEvent(prev => ({
                              ...prev,
                              coordinates: { lat, lng },
                              location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                            }));
                          }}
                        />
                        {editedEvent.coordinates && (
                          <>
                            <Marker
                              position={[editedEvent.coordinates.lat, editedEvent.coordinates.lng]}
                              draggable={true}
                              eventHandlers={{
                                dragend: (e) => {
                                  const marker = e.target;
                                  const position = marker.getLatLng();
                                  const { lat, lng } = position;
                                  setEditedEvent(prev => ({
                                    ...prev,
                                    coordinates: { lat, lng },
                                    location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                                  }));
                                }
                              }}
                            />
                            <Circle
                              center={[editedEvent.coordinates.lat, editedEvent.coordinates.lng]}
                              pathOptions={{ 
                                fillColor: 'red',
                                fillOpacity: 0.2,
                                color: 'red',
                                opacity: 0.5
                              }}
                              radius={50}
                            />
                          </>
                        )}
                      </MapContainer>
                    </div>
                  </div>
                </div>
                
                <div className="edit-form-panel media-content">
                  <h3 className="panel-title">Media Content</h3>
                  <div className="form-group">
                    <label>Video URL</label>
                    <div className="video-input-container">
                      <input
                        type="url"
                        name="videoUrl"
                        value={editedEvent.videoUrl || ""}
                        onChange={handleInputChange}
                        placeholder="Enter video URL (YouTube, Drive, Facebook, etc.)"
                      />
                      {editedEvent.videoUrl && (
                        <div className="video-preview">
                          <h4>Video Preview</h4>
                          {editedEvent.videoUrl.includes('youtube.com') || editedEvent.videoUrl.includes('youtu.be') ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${editedEvent.videoUrl.split(/[\/=]/g).pop()}`}
                              title="Video Preview"
                              frameBorder="0"
                              allowFullScreen
                              style={{ width: '100%', height: '200px' }}
                            ></iframe>
                          ) : editedEvent.videoUrl.includes('facebook.com') ? (
                            <iframe
                              src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(editedEvent.videoUrl)}&show_text=false`}
                              width="100%"
                              height="200px"
                              style={{ border: 'none', overflow: 'hidden' }}
                              scrolling="no"
                              frameBorder="0"
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <div className="video-fallback">
                              <a href={editedEvent.videoUrl} target="_blank" rel="noopener noreferrer">
                                View Video
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="edit-form-panel media-content">
                  <h3 className="panel-title">Organizer Information</h3>
                  <div className="organizer-two-column">
                    <div className="organizer-avatar-section">
                      <div className="avatar-container">
                        {editedEvent.organizer?.avatar && (
                          <div className="avatar-preview">
                            <img 
                              src={editedEvent.organizer.avatar} 
                              alt="Organizer Avatar Preview"
                            />
                            <button
                              className="remove-avatar-button"
                              onClick={() => setEditedEvent(prev => ({
                                ...prev,
                                organizer: {
                                  ...prev.organizer,
                                  avatar: ''
                                }
                              }))}
                            >
                              ×
                            </button>
                          </div>
                        )}
                        
                        <div className="avatar-upload-controls">
                          <button 
                            className="toggle-upload-button"
                            onClick={() => setIsOrganizerAvatarLocal(!isOrganizerAvatarLocal)}
                          >
                            {isOrganizerAvatarLocal ? 'Enter URL Instead' : 'Upload Image'}
                          </button>
                          
                          {isOrganizerAvatarLocal ? (
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleOrganizerAvatarUpload(file);
                                }
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              placeholder="Avatar URL"
                              value={editedEvent.organizer?.avatar || ""}
                              onChange={(e) => {
                                const imageUrl = e.target.value;
                                // Create new image to test URL
                                const img = new Image();
                                img.onload = () => {
                                  setEditedEvent(prev => ({
                                    ...prev,
                                    organizer: {
                                      ...prev.organizer,
                                      avatar: imageUrl
                                    }
                                  }));
                                };
                                img.onerror = () => {
                                  alert('Invalid image URL. Please try another URL.');
                                };
                                img.src = imageUrl;
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="organizer-details-section">
                      <div className="form-group">
                        <label>Organizer Name</label>
                        <input
                          type="text"
                          name="name"
                          value={editedEvent.organizer?.name || ""}
                          onChange={(e) =>
                            setEditedEvent(prev => ({
                              ...prev,
                              organizer: {
                                ...prev.organizer,
                                name: e.target.value
                              }
                            }))
                          }
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Organizer Field</label>
                        <input
                          type="text"
                          name="field"
                          value={editedEvent.organizer?.field || ""}
                          onChange={(e) =>
                            setEditedEvent(prev => ({
                              ...prev,
                              organizer: {
                                ...prev.organizer,
                                field: e.target.value
                              }
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Benefits Section */}
                <div className="edit-form-panel benefits-info">
                  <h3 className="panel-title">Benefits</h3>
                  <div className="form-group">
                    <label>Add Benefit</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        value={benefitText}
                        onChange={(e) => setBenefitText(e.target.value)}
                        placeholder="Enter benefit text"
                      />
                      <button onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}>
                        {selectedIcon ? <FontAwesomeIcon icon={selectedIcon} /> : 'Select Icon'}
                      </button>
                      <button onClick={handleAddBenefit} disabled={!benefitText || !selectedIcon}>
                        Add
                      </button>
                    </div>
                    
                    {isIconPickerOpen && (
                      <div className="icon-picker" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, 1fr)',
                        gap: '5px',
                        marginTop: '10px'
                      }}>
                        {commonIcons.map(icon => (
                          <button
                            key={icon}
                            onClick={() => {
                              setSelectedIcon(icon);
                              setBenefitIcon(icon);
                              setIsIconPickerOpen(false);
                            }}
                            style={{
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px'
                            }}
                          >
                            <FontAwesomeIcon icon={icon} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="benefits-list">
                    {editedEvent.benefits?.map((benefit, index) => (
                      <div key={index} className="benefit-item" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '5px'
                      }}>
                        <FontAwesomeIcon icon={benefit.icon} />
                        <span>{benefit.text}</span>
                        <button onClick={() => handleRemoveBenefit(index)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Guest Section */}
                <div className="edit-form-panel guests-info">
                  <h3 className="panel-title">Special Guests</h3>
                  <div className="form-group">
                    <label>Add Guest</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Guest Name"
                      />
                      <div className="guest-image-controls">
                        <button 
                          className="toggle-upload-button"
                          onClick={() => setIsGuestImageLocal(!isGuestImageLocal)}
                        >
                          {isGuestImageLocal ? 'Enter URL Instead' : 'Upload Image'}
                        </button>
                        
                        {isGuestImageLocal ? (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handleGuestImageUpload(file);
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={guestPicture}
                            onChange={(e) => handleGuestImageUrl(e.target.value)}
                            placeholder="Guest Picture URL"
                          />
                        )}

                        {/* Guest Image Preview */}
                        {(guestPicture || guestImagePreview) && (
                          <div className="guest-preview" style={{
                            marginTop: '10px',
                            position: 'relative',
                            width: '150px',
                            height: '150px'
                          }}>
                            <img
                              src={guestImagePreview || guestPicture}
                              alt="Guest Preview"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '8px'
                              }}
                            />
                            <button
                              onClick={() => {
                                setGuestPicture('');
                                setGuestImagePreview('');
                              }}
                              style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                background: 'rgba(255, 0, 0, 0.7)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={handleAddGuest} 
                        disabled={!guestName || !guestPicture}
                        style={{
                          padding: '8px',
                          backgroundColor: (!guestName || !guestPicture) ? '#ccc' : '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (!guestName || !guestPicture) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Add Guest
                      </button>
                    </div>
                  </div>
                  
                  <div className="guests-list">
                    {editedEvent.guests?.map((guest, index) => (
                      <div key={index} className="guest-item" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '10px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px'
                      }}>
                        <img 
                          src={guest.picture} 
                          alt={guest.name} 
                          style={{ 
                            width: '50px', 
                            height: '50px', 
                            objectFit: 'cover', 
                            borderRadius: '50%' 
                          }}
                        />
                        <span>{guest.name}</span>
                        <button 
                          onClick={() => handleRemoveGuest(index)}
                          style={{
                            marginLeft: 'auto',
                            background: 'none',
                            border: 'none',
                            color: 'red',
                            cursor: 'pointer',
                            fontSize: '18px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Images Section */}
                <div className="edit-form-panel images-info">
                  <h3 className="panel-title">Event Images</h3>
                  <div className="form-group">
                    <label>Add Image</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button 
                        onClick={() => setIsLocalImage(!isLocalImage)}
                        style={{
                                padding: '8px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                background: isLocalImage ? 'navy' : 'green',
                                cursor: 'pointer',
                                width: 'fit-content'
                              }}
                      >
                        {isLocalImage ? 'Enter URL Instead' : 'Upload Image'}
                      </button>

                      <div className="image-inputs" style={{ display: 'flex', gap: '10px' }}>
                        {isLocalImage ? (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handleImageUpload(file);
                            }}
                            style={{
                              flex: 1,
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px'
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder="Image URL"
                            onChange={(e) => {
                              if (e.target.value) {
                                const imageUrl = e.target.value;
                                // Create new image to test URL
                                const img = new Image();
                                img.onload = () => {
                                  setEditedEvent(prev => ({
                                    ...prev,
                                    images: [...prev.images, imageUrl]
                                  }));
                                  e.target.value = ''; // Clear input after adding
                                };
                                img.onerror = () => {
                                  alert('Invalid image URL. Please try another URL.');
                                };
                                img.src = imageUrl;
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="images-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '15px',
                    marginTop: '20px'
                  }}>
                    {editedEvent.images?.map((img, index) => (
                      <div key={index} className="image-item" style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #ddd'
                      }}>
                        <img 
                          src={img} 
                          alt={`Event ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'rgba(255, 0, 0, 0.7)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
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