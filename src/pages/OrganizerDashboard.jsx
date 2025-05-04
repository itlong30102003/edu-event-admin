import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "./OrganizerDashboard.css";
import { auth } from "../firebase"; // Import auth from firebase

// Import components
import Overview from "../component/Overview";
import Events from "../component/Events";
import Locations from "../component/Locations";
import PastEvents from "../component/PastEvents";
import AllChats from "../component/AllChats"; // Import new AllChats component
import Chat from "../component/Chat"; // Import Chat component
import { Save, Edit, MessageCircle } from "lucide-react"; // Thêm MessageCircle
import { db, storage } from "../firebase"; // adjust path as needed
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function OrganizerDashboard() {
  const location = useLocation();
  const organizer = location.state?.userData;
  
  // State declarations
  const [selectedSection, setSelectedSection] = useState("overview");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [organizerData, setOrganizerData] = useState({
    avatar: organizer?.avatar,
    email: organizer?.email,
    field: organizer?.field,
    name: organizer?.name
  });
  
  const [formData, setFormData] = useState({...organizerData});

  // Add this function after the state declarations and before the useEffect hook
  const updateCurrentUserData = async (newData) => {
    try {
      if (!auth.currentUser?.uid) {
        throw new Error("No authenticated user found");
      }

      const userId = auth.currentUser.uid;
      const userDocRef = doc(db, "organizer", userId);

      // Update the document with new data
      await updateDoc(userDocRef, {
        ...newData,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setOrganizerData(prevData => ({
        ...prevData,
        ...newData
      }));

      return true;
    } catch (error) {
      console.error("Error updating user data:", error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchOrganizerData = async () => {
      if (!organizer?.uid || !auth.currentUser) {
        console.warn("No organizer ID or current user available");
        return;
      }

      try {
        const docRef = doc(db, "organizers", organizer.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrganizerData({ 
            ...data, 
            userId: organizer.uid,
            currentUserId: auth.currentUser.uid 
          });
          setFormData({ 
            ...data, 
            userId: organizer.uid,
            currentUserId: auth.currentUser.uid 
          });
        } else {
          // Create new organizer document if it doesn't exist
          const newOrganizerData = {
            avatar: organizerData.avatar,
            email: organizer.email,
            field: organizerData.field,
            name: organizer.name,
            createdAt: new Date().toISOString(),
          };
          
          await setDoc(doc(db, "organizers", organizer.uid), newOrganizerData);
          setOrganizerData(newOrganizerData);
          setFormData(newOrganizerData);
        }
      } catch (error) {
        console.error("Error fetching/creating organizer data:", error);
      }
    };

    fetchOrganizerData();
  }, [organizer?.uid, auth.currentUser]);

  // Handle sidebar section change
  const handleSectionChange = (section) => {
    setSelectedSection(section);
  };

  // Toggle profile modal
  const toggleModal = () => {
    setShowModal(!showModal);
    // Reset editing state when closing modal
    if (showModal) {
      setIsEditing(false);
      setFormData({...organizerData});
    }
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Cancel editing - reset form data
      setFormData({...organizerData});
    }
    setIsEditing(!isEditing);
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Modify the saveProfileChanges function to use the new updateCurrentUserData function
  const saveProfileChanges = async () => {
    try {
      if (!auth.currentUser?.uid) {
        throw new Error("No authenticated user found");
      }

      let updatedData = { ...formData };

      // Handle image upload if it's a base64 string
      if (formData.avatar?.startsWith("data:")) {
        const storageRef = ref(storage, `avatars/${auth.currentUser.uid}.jpg`);
        const response = await fetch(formData.avatar);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        updatedData.avatar = downloadURL;
      }

      await updateCurrentUserData(updatedData);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(`Failed to update profile: ${error.message}`);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    // Implement logout functionality here
    console.log("Logging out...");
    // Example: redirect to login page
    // history.push('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>EduEvent</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button onClick={() => handleSectionChange("overview")} className={`sidebar-link ${selectedSection === "overview" ? "active" : ""}`}>
                <span className="icon">📊</span>
                <span>Overview</span>
              </button>
            </li>
            <li>
              <button onClick={() => handleSectionChange("events")} className={`sidebar-link ${selectedSection === "events" ? "active" : ""}`}>
                <span className="icon">📅</span>
                <span>Events</span>
              </button>
            </li>
            <li>
              <button onClick={() => handleSectionChange("past")} className={`sidebar-link ${selectedSection === "past" ? "active" : ""}`}>
                <span className="icon">🕒</span>
                <span>Past Events</span>
              </button>
            </li>
            <li>
              <button onClick={() => handleSectionChange("locations")} className={`sidebar-link ${selectedSection === "locations" ? "active" : ""}`}>
                <span className="icon">📍</span>
                <span>Locations</span>
              </button>
            </li>
            <li>
              <button onClick={() => handleSectionChange("chat")} className={`sidebar-link ${selectedSection === "chat" ? "active" : ""}`}>
                <span className="icon"><MessageCircle size={18} /></span>
                <span>Chat</span>
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
               selectedSection === "past" ? "Past Events" :
               selectedSection === "locations" ? "Locations Management" :
               selectedSection === "chat" ? "Inbox" : ""}
            </h1>
            {/* Touchable welcome text that opens modal */}
            {organizer && (
              <div 
                className="organizer-welcome"
                onClick={toggleModal}
                role="button"
              >
                <p>
                  <strong>{organizerData.name}</strong> ({organizerData.email})
                </p>
              </div>
            )}
          </div>
          <div className="header-search">
            <input type="text" placeholder="Search..." />
            <button className="search-button">🔍</button>
          </div>
        </header>

        {/* Profile Modal */}
        {showModal && (
          <>
            <div className="modal-overlay" onClick={toggleModal}></div>
            <div className="modal-popup p-6">
              <button 
                className="modal-close-btn"
                onClick={toggleModal}
                aria-label="Close modal"
              >
                X
              </button>
              
              <div className="flex flex-col items-center mb-4">
                {!isEditing ? (
                  <>
                    <img 
                      src={organizerData.avatar} 
                      alt="Profile" 
                      className="w-24 h-24 avatar object-cover border-4 border-blue-500"
                    />
                    <h2 className="text-xl font-bold mt-4">{organizerData.name}</h2>
                    <p className="text-gray-600">{organizerData.field}</p>
                  </>
                ) : (
                  <div className="w-full mt-4">
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {!isEditing ? (
                  // Display Mode
                  <>
                    <div className="flex items-center">
                      <span className="font-medium w-24">Email:</span>
                      <span>{organizerData.email}</span>
                    </div>
                  </>
                ) : (
                  // Edit Mode
                  <>
                    <div className="image-upload-section">
                      <img 
                        src={formData.avatar} 
                        alt="Profile Preview" 
                        className="avatar-preview"
                      />
                      <div className="upload-options">
                        <button 
                          onClick={() => document.getElementById('fileInput').click()}
                          type="button"
                        >
                          Upload Image
                        </button>
                        <button 
                          onClick={() => {
                            const url = prompt('Enter image URL:');
                            if (url) {
                              setFormData({...formData, avatar: url});
                            }
                          }}
                          type="button"
                        >
                          Paste URL
                        </button>
                      </div>
                      <input
                        id="fileInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({...formData, avatar: reader.result});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Field</label>
                        <input
                          type="text"
                          name="field"
                          value={formData.field}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="account-options-container">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={saveProfileChanges}
                          className="bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors flex items-center justify-center btn btn-save"
                        >
                          <Save size={18} className="mr-1" /> Save
                        </button>
                        <button 
                          onClick={toggleEditMode}
                          className="bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 transition-colors btn btn-cancel"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={toggleEditMode}
                          className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors flex items-center justify-center btn btn-edit"
                        >
                          <Edit size={18} className="mr-1" /> Edit Profile
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 transition-colors btn btn-logout"
                        >
                          Logout
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Render components based on selected section */}
        <Routes>
          <Route
            path="/"
            element={
              selectedSection === "overview" ? <Overview /> :
              selectedSection === "events" ? <Events /> :
              selectedSection === "past" ? <PastEvents /> :
              selectedSection === "locations" ? <Locations /> :
              selectedSection === "chat" ? <AllChats /> : null
            }
          />
          <Route path="/chat/:organizerId" element={<Chat />} />
        </Routes>
      </main>
    </div>
  );
}

export default OrganizerDashboard;