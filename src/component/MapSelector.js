import React, { useCallback, useRef, useState } from 'react';
import { GoogleMap, useLoadScript, Marker, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const centerDefault = {
  lat: 10.7769, // Default to Ho Chi Minh City
  lng: 106.7009,
};

function MapSelector({ location, setLocation }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY', // TODO: Replace with your API key
    libraries,
  });

  const [center, setCenter] = useState(centerDefault);
  const [markerPosition, setMarkerPosition] = useState(centerDefault);

  const autocompleteRef = useRef(null);

  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPosition({ lat, lng });
    setLocation(`${lat},${lng}`);
  }, [setLocation]);

  const onPlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (place.geometry) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
      setLocation(`${lat},${lng}`);
    }
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <div>
      <Autocomplete
        onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          type="text"
          placeholder="Search a location"
          style={{
            boxSizing: `border-box`,
            border: `1px solid transparent`,
            width: `100%`,
            height: `40px`,
            padding: `0 12px`,
            borderRadius: `8px`,
            fontSize: `16px`,
            marginBottom: `10px`,
          }}
        />
      </Autocomplete>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={14}
        center={center}
        onClick={onMapClick}
      >
        <Marker
          position={markerPosition}
          draggable
          onDragEnd={(e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setMarkerPosition({ lat, lng });
            setLocation(`${lat},${lng}`);
          }}
        />
      </GoogleMap>
    </div>
  );
}

export default MapSelector;
