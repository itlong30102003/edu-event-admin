import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { doc, deleteDoc } from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Events.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { getAuth } from "firebase/auth";

// Fix the default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon,
  iconUrl: icon,
  shadowUrl: iconShadow
});

// Add Font Awesome icons to library
library.add(fas, far);

function Events() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]); // New state for filtered events
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term
  const [benefitText, setBenefitText] = useState('');
  const [benefitIcon, setBenefitIcon] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPicture, setGuestPicture] = useState('');
  const [newEvent, setNewEvent] = useState({
    title: "",
    about: "",
    category: "",
    host: "",
    images: [],
    organizerId: "",
    location: "",
    quantitymax: "",
    time: "",
    videoUrl: "",
    benefits: [],
    guests: [],
    point: "",
  });
  const [isLocalImage, setIsLocalImage] = useState(false);
  const [isGuestImageLocal, setIsGuestImageLocal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const storage = getStorage();
  const auth = getAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [position, setPosition] = useState([10.980671753776012, 106.67452525297074]); // TDMU coordinates
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('');

  // Map style
  const mapStyle = {
    width: '100%',
    height: '400px'
  };

  // Scrollable list style
  const scrollableListStyle = {
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '10px'
  };

  // Common Font Awesome icons
  const commonIcons = [
    'heart', 'star', 'check', 'gift', 'trophy', 'medal', 'certificate',
    'graduation-cap', 'book', 'laptop', 'coffee', 'lightbulb', 'smile',
    'clock', 'calendar', 'user-graduate', 'award', 'crown', 'gem',
    'shield-alt', 'thumbs-up', 'comments', 'hand-holding-heart'
  ];

  // Time slots
  const timeSlots = {
    morning: '07:00:00',
    afternoon: '12:30:00'
  };

  // Authentication state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
        setNewEvent(prev => ({
          ...prev,
          organizerId: user.uid
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events based on search term
  useEffect(() => {
    const filtered = events.filter(event =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEvents(filtered);
  }, [searchTerm, events]);

  const fetchEvents = async () => {
    const querySnapshot = await getDocs(collection(db, "event"));
    const eventList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const today = new Date();
    const upcomingEvents = eventList.filter((e) => e.time?.toDate() >= today);
    setEvents(upcomingEvents);
    setFilteredEvents(upcomingEvents); // Initialize filteredEvents with all events
  };

  const handleAddBenefit = () => {
    if (!benefitText || !selectedIcon) return;
    setNewEvent((prevData) => ({
      ...prevData,
      benefits: [
        ...prevData.benefits,
        { icon: selectedIcon, text: benefitText },
      ],
    }));
    setBenefitText('');
    setBenefitIcon('');
    setSelectedIcon('');
  };

  const handleAddGuest = () => {
    if (!guestName || !guestPicture) return;
    setNewEvent((prevData) => ({
      ...prevData,
      guests: [
        ...prevData.guests,
        { name: guestName, picture: guestPicture },
      ],
    }));
    setGuestName('');
    setGuestPicture('');
  };

  const handleDeleteEvent = async (id, e) => {
    e.stopPropagation();
    await deleteDoc(doc(db, "event", id));
    fetchEvents();
  };

  const handleLocationSelect = async (query) => {
    if (!query) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 1,
          countrycodes: 'vn'
        })
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const location = data[0];
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        const address = location.display_name;
        const locationData = {
          address: address,
          coordinates: { lat, lng }
        };
        setSelectedLocation(locationData);
        setPosition([lat, lng]);
        setNewEvent(prev => ({
          ...prev,
          location: address,
          coordinates: { lat, lng }
        }));
        setSearchQuery('');
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error("Error searching location:", error);
      alert('Error searching for location. Please try again.');
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLocationSelect(searchQuery);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !selectedDate || !selectedTimeSlot || !selectedLocation || !currentUser) {
      alert("Please fill in all required fields and ensure you're logged in!");
      return;
    }
    try {
      const [year, month, day] = selectedDate.split('-');
      const [hours, minutes, seconds] = timeSlots[selectedTimeSlot].split(':');
      const eventDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
      const eventData = {
        ...newEvent,
        time: Timestamp.fromDate(eventDateTime),
        timeSlot: selectedTimeSlot,
        coordinates: {
          lat: selectedLocation.coordinates.lat,
          lng: selectedLocation.coordinates.lng
        }
      };
      await addDoc(collection(db, "event"), eventData);
      resetModalStates();
      fetchEvents();
    } catch (error) {
      console.error("Error adding event:", error);
      alert('Error adding event. Please try again.');
    }
  };

  const resetModalStates = () => {
    setNewEvent({
      title: "",
      about: "",
      category: "",
      host: "",
      images: [],
      organizerId: currentUser?.uid || "",
      location: "",
      quantitymax: "",
      time: "",
      videoUrl: "",
      benefits: [],
      guests: [],
      point: "",
    });
    setBenefitText('');
    setBenefitIcon('');
    setGuestName('');
    setGuestPicture('');
    setIsLocalImage(false);
    setIsGuestImageLocal(false);
    setIsModalOpen(false);
    setSelectedLocation(null);
    setSearchQuery("");
    setSelectedIcon('');
    setIsIconPickerOpen(false);
    setSelectedTimeSlot('');
    setSelectedDate('');
  };

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    try {
      const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleEventImageUpload = async (file) => {
    try {
      const imageUrl = await uploadImage(file);
      setNewEvent(prev => ({
        ...prev,
        images: [...prev.images, imageUrl]
      }));
    } catch (error) {
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleGuestImageUpload = async (file) => {
    try {
      const imageUrl = await uploadImage(file);
      setGuestPicture(imageUrl);
      setIsGuestImageLocal(false);
    } catch (error) {
      alert('Failed to upload guest image. Please try again.');
    }
  };

  const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    const facebookRegex = /facebook.com\/[^/]+\/videos\/(\d+)/;
    const facebookMatch = url.match(facebookRegex);
    const driveRegex = /drive\.google\.com\/file\/d\/([^/]+)/;
    const driveMatch = url.match(driveRegex);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    } else if (facebookMatch) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0`;
    } else if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    return url;
  };

  const VideoPreview = ({ url }) => {
    const embedUrl = getVideoEmbedUrl(url);
    if (!embedUrl) return null;
    return (
      <div className="video-preview" style={{
        marginTop: '10px',
        width: '100%',
        aspectRatio: '16/9',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #ddd'
      }}>
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video Preview"
        />
      </div>
    );
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  function ChangeView({ center }) {
    const map = useMap();
    map.setView(center, map.getZoom());
    return null;
  }

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

  return (
    <section className="events-section">
      <div className="events-container">
        <div className="events-header-container">
          <h2 className="events-title">Upcoming Events</h2>
          <div className="events-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search events by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                width: '200px',
                backgroundColor: '#fff', // nền trắng
                color: '#000'            // chữ đen
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}

            <button className="add-event-button" onClick={() => setIsModalOpen(true)}>
              Add New Event
            </button>
          </div>
        </div>

        <div className="events-content">
          {filteredEvents.length > 0 ? (
            <div className="event-list">
              {filteredEvents.map((event) => (
                <div key={event.id} className="event-item">
                  <div
                    className="event-content"
                    onClick={() => handleEventClick(event.id)}
                  >
                    <h4>{event.title}</h4>
                    <p>
                      {event.time.toDate().toLocaleTimeString()}<br />
                      {event.time.toDate().toLocaleDateString()} at {event.location}
                    </p>
                  </div>
                  <button
                    className="delete-button"
                    onClick={(e) => handleDeleteEvent(event.id, e)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-events">No events found.</p>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div
          className="modal"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Add New Event</h3>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                style={{ height: '100px', marginTop: 20, fontSize: '1.5rem', fontWeight: 'bold' }}
              />
              <div className="image-section">
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button
                    onClick={() => setIsLocalImage(!isLocalImage)}
                    style={{
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: isLocalImage ? '#e6e6e6' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    {isLocalImage ? 'Enter URL Instead' : 'Upload Image'}
                  </button>
                </div>
                <div className="image-inputs">
                  {isLocalImage ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleEventImageUpload(file);
                        }
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Image URL"
                      onChange={(e) => {
                        setNewEvent(prev => ({
                          ...prev,
                          images: [...prev.images, e.target.value]
                        }));
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    />
                  )}
                </div>
                <div className="images-list">
                  {newEvent.images.map((img, index) => (
                    <div key={index} className="image-item">
                      <img src={img} alt={`Event ${index + 1}`} />
                      <button onClick={() => {
                        setNewEvent(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index)
                        }));
                      }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="Host"
                value={newEvent.host}
                onChange={(e) => setNewEvent({ ...newEvent, host: e.target.value })}
              />
              <input
                type="text"
                placeholder="Category"
                value={newEvent.category}
                onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
              />
              <textarea
                placeholder="About"
                value={newEvent.about}
                onChange={(e) => setNewEvent({ ...newEvent, about: e.target.value })}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  backgroundColor: '#fff',
                  color: '#333'
                }}
              />
              <div className="location-section">
                <div className="location-search">
                  <input
                    type="text"
                    placeholder="Search location"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                  />
                  <button
                    onClick={() => handleLocationSelect(searchQuery)}
                    disabled={!searchQuery}
                  >
                    Search
                  </button>
                </div>
                <MapContainer
                  center={position}
                  zoom={17}
                  style={mapStyle}
                >
                  <ChangeView center={position} />
                  <MapEvents
                    onMapClick={(e) => {
                      const { lat, lng } = e.latlng;
                      setSelectedLocation({
                        address: `${lat}, ${lng}`,
                        coordinates: { lat, lng }
                      });
                      setPosition([lat, lng]);
                      setNewEvent(prev => ({
                        ...prev,
                        location: `${lat}, ${lng}`
                      }));
                    }}
                  />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                  />
                  {selectedLocation && (
                    <>
                      <Marker
                        position={[
                          selectedLocation.coordinates.lat,
                          selectedLocation.coordinates.lng
                        ]}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const marker = e.target;
                            const position = marker.getLatLng();
                            const { lat, lng } = position;
                            setSelectedLocation({
                              address: `${lat}, ${lng}`,
                              coordinates: { lat, lng }
                            });
                            setNewEvent(prev => ({
                              ...prev,
                              location: `${lat}, ${lng}`
                            }));
                          }
                        }}
                      />
                      <Circle
                        center={[
                          selectedLocation.coordinates.lat,
                          selectedLocation.coordinates.lng
                        ]}
                        pathOptions={{
                          fillColor: 'red',
                          fillOpacity: 0.2,
                          color: 'red',
                          opacity: 0.5
                        }}
                        radius={20}
                      />
                    </>
                  )}
                </MapContainer>
                {selectedLocation && (
                  <div className="selected-location">
                    <p>Selected location: {selectedLocation.address}</p>
                  </div>
                )}
              </div>
              <input
                type="number"
                min="1"
                placeholder="Max Quantity"
                value={newEvent.quantitymax}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > 0 || e.target.value === '') {
                    setNewEvent({ ...newEvent, quantitymax: e.target.value });
                  }
                }}
              />
              <input
                type="number"
                min="1"
                placeholder="Point"
                value={newEvent.point}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value > 0 || e.target.value === '') {
                    setNewEvent({ ...newEvent, point: e.target.value });
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
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="date"
                  min={getTodayDate()}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (selectedTimeSlot) {
                      const dateTime = new Date(`${e.target.value}T${timeSlots[selectedTimeSlot]}`);
                      setNewEvent({ ...newEvent, time: dateTime.toISOString() });
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
                      setNewEvent({ ...newEvent, time: dateTime.toISOString() });
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
              <div className="video-url-section">
                <input
                  type="url"
                  placeholder="Video URL (YouTube, Facebook, Drive, etc.)"
                  value={newEvent.videoUrl}
                  onChange={(e) => setNewEvent({ ...newEvent, videoUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    marginBottom: '10px'
                  }}
                />
                {newEvent.videoUrl && <VideoPreview url={newEvent.videoUrl} />}
              </div>
              <div className="event-details-section" style={{ display: 'flex', gap: '20px' }}>
                <div className="benefits-container" style={{ flex: '1' }}>
                  <h4>Benefits</h4>
                  <div className="benefit-section" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="benefits-list" style={scrollableListStyle}>
                      {newEvent.benefits.map((benefit, index) => (
                        <div key={index} className="benefit-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '5px',
                          padding: '5px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '4px'
                        }}>
                          <FontAwesomeIcon icon={benefit.icon} />
                          <span>{benefit.text}</span>
                          <button
                            onClick={() => {
                              setNewEvent(prev => ({
                                ...prev,
                                benefits: prev.benefits.filter((_, i) => i !== index)
                              }));
                            }}
                            style={{
                              marginLeft: 'auto',
                              background: 'none',
                              border: 'none',
                              color: 'red',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="benefit-inputs" style={{ marginTop: '10px' }}>
                      <input
                        type="text"
                        placeholder="Benefit Text"
                        value={benefitText}
                        onChange={(e) => setBenefitText(e.target.value)}
                      />
                      <div className="icon-picker-container" style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                          style={{
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            background: '#fff',
                            cursor: 'pointer',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {selectedIcon ? (
                            <>
                              <FontAwesomeIcon icon={selectedIcon} />
                              <span>Selected Icon</span>
                            </>
                          ) : (
                            'Choose an icon'
                          )}
                        </button>
                        {isIconPickerOpen && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            zIndex: 1000,
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '10px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                            width: '300px',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(6, 1fr)',
                            gap: '10px'
                          }}>
                            {commonIcons.map((iconName) => (
                              <button
                                key={iconName}
                                onClick={() => {
                                  setSelectedIcon(iconName);
                                  setBenefitIcon(iconName);
                                  setIsIconPickerOpen(false);
                                }}
                                style={{
                                  padding: '8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  background: selectedIcon === iconName ? '#e6e6e6' : '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center'
                                }}
                              >
                                <FontAwesomeIcon icon={iconName} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        className="add-benefit-button"
                        onClick={handleAddBenefit}
                        disabled={!benefitText || !selectedIcon}
                        style={{
                          marginTop: '10px',
                          width: '100%'
                        }}
                      >
                        Add Benefit
                      </button>
                    </div>
                  </div>
                </div>
                <div className="guests-container" style={{ flex: '1' }}>
                  <h4>Guests</h4>
                  <div className="guest-section" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="guests-list" style={scrollableListStyle}>
                      {newEvent.guests.map((guest, index) => (
                        <div key={index} className="guest-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '10px',
                          padding: '5px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '4px'
                        }}>
                          <img
                            src={guest.picture}
                            alt={guest.name}
                            className="guest-picture"
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '50%'
                            }}
                          />
                          <span>{guest.name}</span>
                          <button
                            onClick={() => {
                              setNewEvent(prev => ({
                                ...prev,
                                guests: prev.guests.filter((_, i) => i !== index)
                              }));
                            }}
                            style={{
                              marginLeft: 'auto',
                              background: 'none',
                              border: 'none',
                              color: 'red',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="guest-inputs" style={{ marginTop: '10px' }}>
                      <input
                        type="text"
                        placeholder="Guest Name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                      <div className="guest-image-section" style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <button
                            onClick={() => setIsGuestImageLocal(!isGuestImageLocal)}
                            CS
                            style={{
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              background: isGuestImageLocal ? '#e6e6e6' : '#fff',
                              cursor: 'pointer'
                            }}
                          >
                            {isGuestImageLocal ? 'Enter URL Instead' : 'Upload Image'}
                          </button>
                        </div>
                        {isGuestImageLocal ? (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                handleGuestImageUpload(file);
                              }
                            }}
                            style={{
                              marginBottom: '10px'
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder="Guest Picture URL"
                            value={guestPicture}
                            onChange={(e) => setGuestPicture(e.target.value)}
                            style={{
                              marginBottom: '10px',
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}
                          />
                        )}
                        {guestPicture && (
                          <div className="guest-image-preview" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '10px'
                          }}>
                            <img
                              src={guestPicture}
                              alt="Guest Preview"
                              style={{
                                width: '100px',
                                height: '100px',
                                objectFit: 'cover',
                                borderRadius: '4px'
                              }}
                            />
                            <button
                              onClick={() => {
                                setGuestPicture('');
                                setIsGuestImageLocal(false);
                              }}
                              style={{
                                padding: '5px 10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                background: '#fff',
                                cursor: 'pointer',
                                color: 'red'
                              }}
                            >
                              Remove Image
                            </button>
                          </div>
                        )}
                      </div>
                      <button className="add-image-button" onClick={handleAddGuest}>
                        Add Guest
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button className="add-event-button-modal" onClick={handleAddEvent}>
                Add Event
              </button>
              <button className="close-button-modal" onClick={resetModalStates}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Events;