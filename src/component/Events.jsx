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

// Fix the default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: icon,
    iconUrl: icon,
    shadowUrl: iconShadow
});

function Events() {
  const [events, setEvents] = useState([]);
  const [benefitText, setBenefitText] = useState('');
  const [benefitIcon, setBenefitIcon] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPicture, setGuestPicture] = useState('');
  const [newEvent, setNewEvent] = useState({
    title: "",
    about: "",
    category: "",
    host: "",
    images: [], // Change image to images array
    organizer: {
      name: "",
      field: "",
      avatar: "",
    },
    location: "",
    quantity: "",
    quantitymax: "",
    time: "",
    videoUrl: "", // Changed from trailerId
    benefits: [], // Add a new field for benefits
    guests: [], // Add a new field for guests
  });
  const [isLocalImage, setIsLocalImage] = useState(false);
  // Add this state for organizer avatar input type
  const [isOrganizerAvatarLocal, setIsOrganizerAvatarLocal] = useState(false);
  // Add a new state for guest image handling
  const [isGuestImageLocal, setIsGuestImageLocal] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const querySnapshot = await getDocs(collection(db, "event"));
    const eventList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Only get upcoming events
    const today = new Date();
    const upcomingEvents = eventList.filter((e) => e.time?.toDate() >= today);
    
    setEvents(upcomingEvents);
  };

  const handleAddBenefit = () => {
    if (!benefitText || !benefitIcon) return;
    
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
    // Prevent event bubble up to parent div
    e.stopPropagation();
    
    await deleteDoc(doc(db, "event", id));
    fetchEvents();
  };

  // Add these new states after other state declarations
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [position, setPosition] = useState([10.980671753776012, 106.67452525297074]); // TDMU coordinates

  // Add this constant for map container style
  const mapStyle = {
    width: '100%',
    height: '400px'
  };

  // Add this component for handling map center updates
  function ChangeView({ center }) {
    const map = useMap();
    map.setView(center, map.getZoom());
    return null;
  }

  // Add this new component after the ChangeView component
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

  // Update the handleLocationSelect function
  const handleLocationSelect = async (query) => {
    if (!query) return;
    
    try {
      // Use Nominatim API to search for the location
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ', Thu Dau Mot, Binh Duong, Vietnam'
        )}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        
        // Update the selected location
        setSelectedLocation({
          address: location.display_name,
          coordinates: { lat, lng }
        });
        
        // Update the map position
        setPosition([lat, lng]);
        
        // Update the event location
        setNewEvent(prev => ({
          ...prev,
          location: location.display_name
        }));
        
        // Clear the search query
        setSearchQuery('');
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error("Error searching location:", error);
      alert('Error searching for location. Please try again.');
    }
  };

  // Also update the search input to handle Enter key
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLocationSelect(searchQuery);
    }
  };

  // Modify the existing handleAddEvent function
  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.time || !selectedLocation) {
      alert("Please enter all required information including location!");
      return;
    }

    const eventData = {
      title: newEvent.title,
      about: newEvent.about,
      category: newEvent.category,
      host: newEvent.host,
      images: newEvent.images, // Use the images array instead of single image
      organizer: newEvent.organizer,
      location: selectedLocation.address,
      coordinates: selectedLocation.coordinates,
      quantity: newEvent.quantity,
      quantitymax: newEvent.quantitymax,
      time: Timestamp.fromDate(new Date(newEvent.time)),
      videoUrl: newEvent.videoUrl, // Changed from trailerId
      benefits: newEvent.benefits,
      guests: newEvent.guests,
    };

    await addDoc(collection(db, "event"), eventData);
    resetModalStates();
    fetchEvents();
  };

  // Modify the resetModalStates function
  const resetModalStates = () => {
    setNewEvent({
      title: "",
      about: "",
      category: "",
      host: "",
      images: [],
      organizer: {
        name: "",
        field: "",
        avatar: "",
      },
      location: "",
      quantity: "",
      quantitymax: "",
      time: "",
      videoUrl: "",
      benefits: [],
      guests: [],
    });
    setBenefitText('');
    setBenefitIcon('');
    setGuestName('');
    setGuestPicture('');
    setIsLocalImage(false);
    setIsOrganizerAvatarLocal(false);
    setIsGuestImageLocal(false);
    setIsModalOpen(false);
    setSelectedLocation(null);
    setSearchQuery("");
  };

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  return (
    <section className="events-section">
      <div className="events-container">
        <div className="events-header-container">
          <h2 className="events-title">Upcoming Events</h2>
          <button className="add-event-button" onClick={() => setIsModalOpen(true)}>
            Add New Event
          </button>
        </div>

        <div className="events-content">
          {events.length > 0 ? (
            <div className="event-list">
              {events.map((event) => (
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
            <p className="no-events">No upcoming events.</p>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add New Event</h3>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
              <div className="image-section">
                <div className="image-inputs">
                  {isLocalImage ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewEvent(prev => ({
                              ...prev,
                              images: [...prev.images, reader.result]
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Image URL"
                      value={newEvent.imageInput || ''}
                      onChange={(e) => setNewEvent(prev => ({
                        ...prev,
                        imageInput: e.target.value
                      }))}
                    />
                  )}
                </div>
                <div className="image-actions">
                  <button 
                    className="toggle-image-button" 
                    onClick={() => setIsLocalImage(!isLocalImage)}
                  >
                    {isLocalImage ? 'Image URL' : 'Picture'}
                  </button>
                  <button 
                    className="add-image-button"
                    onClick={() => {
                      if (isLocalImage) return; // For local files, we add directly on file select
                      if (newEvent.imageInput) {
                        setNewEvent(prev => ({
                          ...prev,
                          images: [...prev.images, prev.imageInput],
                          imageInput: ''
                        }));
                      }
                    }}
                  >
                    Add Picture
                  </button>
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
                placeholder="About"
                value={newEvent.about}
                onChange={(e) => setNewEvent({ ...newEvent, about: e.target.value })}
              />
              <input
                type="text"
                placeholder="Category"
                value={newEvent.category}
                onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
              />
              <input
                type="text"
                placeholder="Host"
                value={newEvent.host}
                onChange={(e) => setNewEvent({ ...newEvent, host: e.target.value })}
              />
              
              <h4>Event Information</h4>
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
              <div className="organizer-avatar-section">
                <label>Organizer Avatar</label>
                <div className="image-inputs">
                  {isOrganizerAvatarLocal ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewEvent(prev => ({
                              ...prev,
                              organizer: {
                                ...prev.organizer,
                                avatar: reader.result
                              }
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Organizer Avatar URL"
                      value={newEvent.organizer.avatar}
                      onChange={(e) =>
                        setNewEvent(prev => ({
                          ...prev,
                          organizer: {
                            ...prev.organizer,
                            avatar: e.target.value
                          }
                        }))
                      }
                    />
                  )}
                </div>
                <div className="image-actions">
                  <button 
                    className="toggle-image-button" 
                    onClick={() => setIsOrganizerAvatarLocal(!isOrganizerAvatarLocal)}
                  >
                    {isOrganizerAvatarLocal ? 'Image URL' : 'Upload Picture'}
                  </button>
                </div>
                {newEvent.organizer.avatar && (
                  <div className="avatar-preview">
                    <img 
                      src={newEvent.organizer.avatar} 
                      alt="Organizer Avatar Preview" 
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }}
                    />
                    <button 
                      onClick={() => setNewEvent(prev => ({
                        ...prev,
                        organizer: {
                          ...prev.organizer,
                          avatar: ''
                        }
                      }))}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

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
                        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                        coordinates: { lat, lng }
                      });
                      setPosition([lat, lng]);
                      setNewEvent(prev => ({
                        ...prev,
                        location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                      }));
                    }}
                  />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
                              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                              coordinates: { lat, lng }
                            });
                            setNewEvent(prev => ({
                              ...prev,
                              location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
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
                placeholder="Current Quantity"
                value={newEvent.quantity}
                onChange={(e) => setNewEvent({ ...newEvent, quantity: e.target.value })}
              />
              <input
                type="number"
                placeholder="Max Quantity"
                value={newEvent.quantitymax}
                onChange={(e) => setNewEvent({ ...newEvent, quantitymax: e.target.value })}
              />
              <input
                type="datetime-local"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
              />
              <input
                type="url"
                placeholder="Video URL (YouTube, Facebook, Drive, etc.)"
                value={newEvent.videoUrl}
                onChange={(e) => setNewEvent({ ...newEvent, videoUrl: e.target.value })}
              />
              
              <h4>Benefits</h4>
              <div className="benefit-section">
                <div className="benefit-inputs">
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
                </div>
                <button className="add-benefit-button" onClick={handleAddBenefit}>
                  Add Benefit
                </button>
                
                <div className="benefits-list">
                  {newEvent.benefits.map((benefit, index) => (
                    <div key={index} className="benefit-item">
                      <FontAwesomeIcon icon={benefit.icon} />
                      <span>{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <h4>Guests</h4>
              <div className="guest-section">
                <div className="guest-inputs">
                  <input
                    type="text"
                    placeholder="Guest Name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                  <div className="guest-image-section">
                    {isGuestImageLocal ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setGuestPicture(reader.result);
                              setIsGuestImageLocal(true);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Guest Picture URL"
                          value={guestPicture}
                          onChange={(e) => setGuestPicture(e.target.value)}
                        />
                        <button 
                          className="toggle-image-button" 
                          onClick={() => setIsGuestImageLocal(true)}
                        >
                          Upload Picture
                        </button>
                      </>
                    )}
                    {guestPicture && (
                      <div className="guest-image-preview">
                        <img 
                          src={guestPicture} 
                          alt="Guest Preview" 
                        />
                        <button 
                          onClick={() => {
                            setGuestPicture('');
                            setIsGuestImageLocal(false);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button className="add-image-button" onClick={handleAddGuest}>
                  Add Guest
                </button>
                
                <div className="guests-list">
                  {newEvent.guests.map((guest, index) => (
                    <div key={index} className="guest-item">
                      <img src={guest.picture} alt={guest.name} className="guest-picture" />
                      <span>{guest.name}</span>
                    </div>
                  ))}
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