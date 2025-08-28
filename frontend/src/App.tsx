import React, { useState } from "react";
import axios from "axios";

interface ItineraryActivity {
  activity: string;
  location: string;
  durationInHours: number;
}

interface ItineraryDay {
  dayDate: string;
  dayNumber: number;
  morning: ItineraryActivity[] | undefined;
  afternoon: ItineraryActivity[] | undefined;
  evening: ItineraryActivity[] | undefined;
}

interface City {
  shortName: string;
  iata: string;
}

interface FlightInfo {
  price: string;
  duration: string;
  airline: string;
  departure: {
    date: string;
    time: string;
    airport: string;
  };
  arrival: {
    date: string;
    time: string;
    airport: string;
  };
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
  flights?: {
    outbound?: FlightInfo;
    return?: FlightInfo;
  };
}

function describeActivity(activity: ItineraryActivity) {
  if (activity.activity.search(activity.location) === -1) {
    return `${activity.activity} in ${activity.location}`;
  }
  return activity.activity;
}

function renderActivity(activity: ItineraryActivity, idx: number) {
  return (
    <div key={idx} style={{ marginLeft: "1rem", marginBottom: "0.5rem" }}>
      • {describeActivity(activity)}
      <em>({activity.durationInHours}h)</em>
    </div>
  );
}

function renderDaySection(title: string, daySection: ItineraryActivity[] | undefined) {
  if (!daySection || daySection.length === 0) {
    return null;
  }
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
      <h3 style={{ color: "#667eea", marginBottom: "1rem" }}>Day {day.dayNumber}</h3>

      {renderDaySection("🌅 Morning", day.morning)}
      {renderDaySection("☀️ Afternoon", day.afternoon)}
      {renderDaySection("🌙 Evening", day.evening)}
    </div>
  );
}

function renderFlightInfoDates(flight: FlightInfo): string {
  if (flight.departure.date === flight.arrival.date) {
    return `${flight.departure.date} : ${flight.departure.time} → ${flight.arrival.time}`;
  }
  return `${flight.departure.date} : ${flight.departure.time} → ${flight.arrival.date} : ${flight.arrival.time}`;
}

function renderFlights(flights?: { outbound?: FlightInfo; return?: FlightInfo }) {
  if (!flights || (!flights.outbound && !flights.return)) {
    return null;
  }

  return (
    <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f8f9fa", borderRadius: "8px" }}>
      <h3 style={{ color: "#667eea", marginBottom: "1rem", fontSize: "1.2rem" }}>✈️ Flight Options</h3>
      
      {flights.outbound && (
        <div style={{ marginBottom: "1rem", padding: "1rem", background: "white", borderRadius: "6px", border: "1px solid #e1e5e9" }}>
          <div style={{ fontWeight: "600", color: "#333", marginBottom: "0.5rem" }}>Outbound Flight</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: "500" }}>
                {renderFlightInfoDates(flights.outbound)}
              </div>
              <div style={{ color: "#666", fontSize: "0.9rem" }}>
                {flights.outbound.departure.airport} → {flights.outbound.arrival.airport}
              </div>
              <div style={{ color: "#666", fontSize: "0.9rem" }}>
                {flights.outbound.airline} • {flights.outbound.duration}
              </div>
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "#28a745" }}>
              {flights.outbound.price}
            </div>
          </div>
        </div>
      )}
      
      {flights.return && (
        <div style={{ padding: "1rem", background: "white", borderRadius: "6px", border: "1px solid #e1e5e9" }}>
          <div style={{ fontWeight: "600", color: "#333", marginBottom: "0.5rem" }}>Return Flight</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: "500" }}>
                {renderFlightInfoDates(flights.return)}
              </div>
              <div style={{ color: "#666", fontSize: "0.9rem" }}>
                {flights.return.departure.airport} → {flights.return.arrival.airport}
              </div>
              <div style={{ color: "#666", fontSize: "0.9rem" }}>
                {flights.return.airline} • {flights.return.duration}
              </div>
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: "600", color: "#28a745" }}>
              {flights.return.price}
            </div>
          </div>
        </div>
      )}
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
        <div
          style={{
            color: "#28a745",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          ✈️ Departure: {itinerary.departureAirport.shortName} (
          {itinerary.departureAirport.iata})
        </div>
      )}
      {itinerary.itinerary.arrivalCity !== itinerary.itinerary.returnCity && (
        <div>
          <em>
            Arrival: {itinerary.itinerary.arrivalCity.shortName} - Return:{" "}
            {itinerary.itinerary.returnCity.shortName}
          </em>
        </div>
      )}
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(false);
  const [exportingCalendar, setExportingCalendar] = useState(false);

  // Itinerary state
  const [city, setCity] = useState("");
  const [dates, setDates] = useState("");
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

      axios
        .post("/api/itinerary", payload)
        .then((response) => {
          setItineraryResponse(response.data);
        })
        .catch((error) => {
          console.error("Itinerary error:", error);
          setItineraryResponse({
            itinerary: {
              days: [],
              arrivalCity: {
                shortName: "",
                iata: "",
              },
              returnCity: {
                shortName: "",
                iata: "",
              },
            },
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
          console.warn("Could not get location:", error);
          // Continue without location
          getLocationAndSubmit();
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 300000, // 5 minutes
        }
      );
    } else {
      // No geolocation support, continue without location
      getLocationAndSubmit();
    }
  };

  const handleExportToCalendar = async () => {
    if (!itineraryResponse) return;

    setExportingCalendar(true);
    try {
      const response = await axios.post("/api/export-calendar", itineraryResponse, {
        responseType: 'blob',
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${itineraryResponse.city.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Open Google Calendar import page
      setTimeout(() => {
        window.open('https://calendar.google.com/calendar/r/settings/import-export', '_blank');
      }, 500);
      
      alert('Calendar file downloaded! Please upload the .ics file to Google Calendar using the opened page.');
    } catch (error: any) {
      console.error("Calendar export error:", error);
      const errorMessage = error.response?.data?.message || "Failed to export calendar";
      alert(`Error: ${errorMessage}`);
    } finally {
      setExportingCalendar(false);
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <strong>Your Itinerary for {itineraryResponse.city}</strong>
              <button
                onClick={handleExportToCalendar}
                disabled={exportingCalendar}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#4285f4",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: exportingCalendar ? "not-allowed" : "pointer",
                  opacity: exportingCalendar ? 0.6 : 1,
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
              >
                {exportingCalendar ? "📅 Exporting..." : "📅 Export to Google Calendar"}
              </button>
            </div>
            <div>
              <em>Dates: {itineraryResponse.dates}</em>
            </div>
            {renderArrivalAndDeparture(itineraryResponse)}
            {renderFlights(itineraryResponse.flights)}
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
