import React, { useState } from "react";
import axios from "axios";

interface ItineraryActivity {
  activity: string;
  location: string;
  durationInHours: number;
}

interface ItineraryDay {
  day: string;
  morning: ItineraryActivity[];
  afternoon: ItineraryActivity[];
  evening: ItineraryActivity[];
}

interface ItineraryResponse {
  itinerary: {
    days: ItineraryDay[];
    arrivalCity: string;
    departureCity: string;
  };
  city: string;
  dates: string;
  preferences?: string;
}

function describeActivity(activity: ItineraryActivity) {
  if(activity.activity.search(activity.location) === -1) {
    return `${activity.activity} in ${activity.location}`;
  }
  return activity.activity;
}

function renderActivity(activity: ItineraryActivity, idx: number) {
  return (
    <div key={idx} style={{ marginLeft: "1rem", marginBottom: "0.5rem" }}>
      • {describeActivity(activity)}
      <em>
        ({activity.durationInHours}h)
      </em>
    </div>
  );
}

function renderDaySection(title: string, daySection: ItineraryActivity[]) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>{title}</h4>
      {daySection.map((activity, idx) => renderActivity(activity, idx))}
    </div>
  );
}

function renderDay(day: ItineraryDay, idx: number) {
  return (
    <div
      key={idx}
      style={{
        marginBottom: "2rem",
        padding: "1rem",
        border: "1px solid #e1e5e9",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ color: "#667eea", marginBottom: "1rem" }}>{day.day}</h3>

      {renderDaySection("🌅 Morning", day.morning)}
      {renderDaySection("☀️ Afternoon", day.afternoon)}
      {renderDaySection("🌙 Evening", day.evening)}
    </div>
  );
}

function renderArrivalAndDeparture(itinerary: ItineraryResponse) {
  if(itinerary.itinerary.arrivalCity !== itinerary.itinerary.departureCity ) {
    return (
      <div>
        <em>
          Arrival: {itinerary.itinerary.arrivalCity} - Departure: {itinerary.itinerary.departureCity}
        </em>
      </div>
    );
  }
}

function App() {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [closestAirport, setClosestAirport] = useState<{shortName: string, iata: string} | null>(null);

  // Itinerary state
  const [city, setCity] = useState("");
  const [dates, setDates] = useState("");
  const [arrivalCity, setArrivalCity] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [preferences, setPreferences] = useState("");
  const [itineraryResponse, setItineraryResponse] =
    useState<ItineraryResponse | null>(null);

  const handleFindClosestAirport = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    setClosestAirport(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await axios.get(`/api/closest-airport?lat=${latitude}&lng=${longitude}`);
          setClosestAirport(response.data);
        } catch (error) {
          console.error('Error finding closest airport:', error);
          alert('Failed to find closest airport. Please try again.');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location. Please enable location services.');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !dates.trim()) return;

    setLoading(true);
    setItineraryResponse(null);

    try {
      const response = await axios.post("/api/itinerary", {
        city: city.trim(),
        dates: dates.trim(),
        arrivalCity: arrivalCity.trim(),
        departureCity: departureCity.trim(),
        preferences: preferences.trim() || undefined,
      });
      setItineraryResponse(response.data);
    } catch (error) {
      console.error("Itinerary error:", error);
      setItineraryResponse({
        itinerary: { days: [], arrivalCity: "", departureCity: "" },
        city,
        dates,
        preferences,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1
        style={{
          textAlign: "center",
          color: "white",
          marginBottom: "2rem",
          fontSize: "2.5rem",
        }}
      >
        AI Builders Project
      </h1>

      <div className="card">
        <h2 style={{ marginBottom: "1.5rem", color: "#333" }}>
          Generate Travel Itinerary
        </h2>
        
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f8f9fa", borderRadius: "8px" }}>
          <h3 style={{ marginBottom: "1rem", color: "#333", fontSize: "1.1rem" }}>Find Your Closest Airport</h3>
          <button 
            type="button" 
            onClick={handleFindClosestAirport}
            disabled={locationLoading}
            style={{ 
              marginBottom: "0.5rem",
              background: locationLoading ? "#ccc" : "linear-gradient(135deg, #28a745 0%, #20c997 100%)"
            }}
          >
            {locationLoading ? "Finding Airport..." : "📍 Find Closest Airport"}
          </button>
          {closestAirport && (
            <div style={{ color: "#28a745", fontWeight: "600" }}>
              ✈️ Closest Airport: {closestAirport.shortName}
              {closestAirport.iata && (
                <span style={{ marginLeft: "0.5rem", fontSize: "0.9rem" }}>({closestAirport.iata})</span>
              )}
            </div>
          )}
        </div>
        <form onSubmit={handleItinerary}>
          <div className="input-group">
            <label htmlFor="city">City/Destination</label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Paris, Tokyo, New York"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="dates">Travel Dates</label>
            <input
              id="dates"
              type="text"
              value={dates}
              onChange={(e) => setDates(e.target.value)}
              placeholder="e.g., December 15-20, 2024 or 5 days"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="preferences">Preferences (Optional)</label>
            <textarea
              id="preferences"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="e.g., museums, outdoor activities, local food, budget-friendly..."
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !city.trim() || !dates.trim()}
          >
            {loading ? "Creating Itinerary..." : "Generate Itinerary"}
          </button>
        </form>

        {loading && (
          <div className="loading">Creating your perfect itinerary...</div>
        )}

        {itineraryResponse && (
          <div className="response">
            <strong>Your Itinerary for {itineraryResponse.city}</strong>
            <div>
              <em>Dates: {itineraryResponse.dates}</em>
            </div>
            {renderArrivalAndDeparture(itineraryResponse)}
            {itineraryResponse.preferences && (
              <em>Preferences: {itineraryResponse.preferences}</em>
            )}
            {itineraryResponse.itinerary.days.length === 0
              ? "Error: Failed to generate itinerary"
              : itineraryResponse.itinerary.days.map((day, index) =>
                  renderDay(day, index)
                )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
