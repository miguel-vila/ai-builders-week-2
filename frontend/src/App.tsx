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

interface City {
  shortName: string;
  iata: string;
}

interface ItineraryResponse {
  itinerary: {
    days: ItineraryDay[];
    arrivalCity: City;
    returnCity: City;
  };
  city: string;
  dates: string;
  preferences?: string;
  departureAirport?: {
    shortName: string;
    iata: string;
  };
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
  const hasDepartureAirport = !!itinerary.departureAirport;
  const hasDifferentReturnCity =
    itinerary.itinerary.arrivalCity !== itinerary.itinerary.returnCity;

  if (!hasDepartureAirport && !hasDifferentReturnCity) {
    return null;
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      {itinerary.departureAirport && (
        <div style={{ color: "#28a745", fontWeight: "600", marginBottom: "0.5rem" }}>
          ✈️ Departure: {itinerary.departureAirport.shortName} ({itinerary.departureAirport.iata})
        </div>
      )}
      {itinerary.itinerary.arrivalCity !== itinerary.itinerary.returnCity && (
        <div>
          <em>
            Arrival: {itinerary.itinerary.arrivalCity.shortName} - Return: {itinerary.itinerary.returnCity.shortName}
          </em>
        </div>
      )}
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(false);


  // Itinerary state
  const [city, setCity] = useState("");
  const [dates, setDates] = useState("");
  const [arrivalCity, setArrivalCity] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [preferences, setPreferences] = useState("");
  const [itineraryResponse, setItineraryResponse] =
    useState<ItineraryResponse | null>(null);



  const handleItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !dates.trim()) return;

    setLoading(true);
    setItineraryResponse(null);

    // Get user location for departure airport detection
    const getLocationAndSubmit = (lat?: number, lng?: number) => {
      const payload: any = {
        city: city.trim(),
        dates: dates.trim(),
        preferences: preferences.trim() || undefined,
      };

      if (lat !== undefined && lng !== undefined) {
        payload.lat = lat;
        payload.lng = lng;
      }

      axios.post("/api/itinerary", payload)
        .then(response => {
          setItineraryResponse(response.data);
        })
        .catch(error => {
          console.error("Itinerary error:", error);
          setItineraryResponse({
            itinerary: { days: [], arrivalCity: {
              shortName: "",
              iata: "",
            }, returnCity: {
              shortName: "",
              iata: "",
            }},
            city,
            dates,
            preferences,
          });
        })
        .finally(() => {
          setLoading(false);
        });
    };

    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          getLocationAndSubmit(latitude, longitude);
        },
        (error) => {
          console.warn('Could not get location:', error);
          // Continue without location
          getLocationAndSubmit();
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      // No geolocation support, continue without location
      getLocationAndSubmit();
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
