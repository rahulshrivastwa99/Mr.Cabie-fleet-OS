import React, { useRef, useEffect, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, X, Loader2 } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Inner component that uses the Places library
const PlacesAutocompleteInput = ({ 
  value, 
  onChange, 
  onPlaceSelect,
  placeholder = "Enter location",
  className = "",
  disabled = false
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const places = useMapsLibrary('places');
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      componentRestrictions: { country: 'in' }, // Restrict to India
      fields: ['formatted_address', 'geometry', 'name', 'place_id'],
      types: ['geocode', 'establishment']
    };

    autocompleteRef.current = new places.Autocomplete(inputRef.current, options);

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      
      if (place && place.formatted_address) {
        const locationData = {
          address: place.formatted_address,
          name: place.name,
          place_id: place.place_id,
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng()
        };
        
        setInputValue(place.formatted_address);
        onChange(place.formatted_address);
        
        if (onPlaceSelect) {
          onPlaceSelect(locationData);
        }
      }
    });

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [places, onChange, onPlaceSelect]);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    if (onPlaceSelect) {
      onPlaceSelect(null);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <MapPin size={18} />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-10 pr-10 py-3 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF] disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        autoComplete="off"
      />
      {inputValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

// Main wrapper component with API Provider
const LocationAutocomplete = ({ 
  value, 
  onChange, 
  onPlaceSelect,
  placeholder = "Search for a location",
  className = "",
  disabled = false,
  label = null,
  required = false,
  error = null
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Check if API key is configured
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return (
      <div>
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <MapPin size={18} />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full pl-10 pr-4 py-3 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF] ${className}`}
          />
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <APIProvider 
        apiKey={GOOGLE_MAPS_API_KEY}
        onLoad={() => setIsLoaded(true)}
      >
        {!isLoaded ? (
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
            <input
              type="text"
              placeholder="Loading maps..."
              disabled
              className={`w-full pl-10 pr-4 py-3 border border-[#E5E5E5] rounded-lg text-sm bg-gray-50 ${className}`}
            />
          </div>
        ) : (
          <PlacesAutocompleteInput
            value={value}
            onChange={onChange}
            onPlaceSelect={onPlaceSelect}
            placeholder={placeholder}
            className={className}
            disabled={disabled}
          />
        )}
      </APIProvider>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default LocationAutocomplete;
