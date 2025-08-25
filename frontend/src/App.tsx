import React, { useState } from 'react';
import axios from 'axios';

interface ItineraryActivity {
  activity: string;
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
  };
  city: string;
  dates: string;
  preferences?: string;
}

function App() {
  const [loading, setLoading] = useState(false);
  
  // Itinerary state
  const [city, setCity] = useState('');
  const [dates, setDates] = useState('');
  const [preferences, setPreferences] = useState('');
  const [itineraryResponse, setItineraryResponse] = useState<ItineraryResponse | null>(null);

  const handleItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !dates.trim()) return;
    
    setLoading(true);
    setItineraryResponse(null);
    
    try {
      const response = await axios.post('/api/itinerary', {
        city: city.trim(),
        dates: dates.trim(),
        preferences: preferences.trim() || undefined
      });
      setItineraryResponse(response.data);
    } catch (error) {
      console.error('Itinerary error:', error);
      setItineraryResponse({
        itinerary: { days: [] },
        city,
        dates,
        preferences
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 style={{ textAlign: 'center', color: 'white', marginBottom: '2rem', fontSize: '2.5rem' }}>
        AI Builders Project
      </h1>
      
      <div className="card">
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Generate Travel Itinerary</h2>
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
            
            <button type="submit" disabled={loading || !city.trim() || !dates.trim()}>
              {loading ? 'Creating Itinerary...' : 'Generate Itinerary'}
            </button>
          </form>
          
          {loading && <div className="loading">Creating your perfect itinerary...</div>}
          
          {itineraryResponse && (
            <div className="response">
              <strong>Your Itinerary for {itineraryResponse.city}</strong>\n
              <em>Dates: {itineraryResponse.dates}</em>\n
              {itineraryResponse.preferences && (
                <em>Preferences: {itineraryResponse.preferences}</em>
              )}\n\n              {itineraryResponse.itinerary.days.length === 0 ? (
                'Error: Failed to generate itinerary'
              ) : (
                itineraryResponse.itinerary.days.map((day, index) => (
                  <div key={index} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #e1e5e9', borderRadius: '8px' }}>
                    <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>{day.day}</h3>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ color: '#333', marginBottom: '0.5rem' }}>🌅 Morning</h4>
                      {day.morning.map((activity, idx) => (
                        <div key={idx} style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>
                          • {activity.activity} <em>({activity.durationInHours}h)</em>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ color: '#333', marginBottom: '0.5rem' }}>☀️ Afternoon</h4>
                      {day.afternoon.map((activity, idx) => (
                        <div key={idx} style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>
                          • {activity.activity} <em>({activity.durationInHours}h)</em>
                        </div>
                      ))}
                    </div>
                    
                    <div>
                      <h4 style={{ color: '#333', marginBottom: '0.5rem' }}>🌙 Evening</h4>
                      {day.evening.map((activity, idx) => (
                        <div key={idx} style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>
                          • {activity.activity} <em>({activity.durationInHours}h)</em>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
    </div>
  );
}

export default App;