import React, { useState } from 'react';
import axios from 'axios';

interface ChatResponse {
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

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
  const [activeTab, setActiveTab] = useState<'chat' | 'itinerary'>('chat');
  const [loading, setLoading] = useState(false);
  
  // Chat state
  const [message, setMessage] = useState('');
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  
  // Itinerary state
  const [city, setCity] = useState('');
  const [dates, setDates] = useState('');
  const [preferences, setPreferences] = useState('');
  const [itineraryResponse, setItineraryResponse] = useState<ItineraryResponse | null>(null);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setLoading(true);
    setChatResponse(null);
    
    try {
      const response = await axios.post('/api/chat', {
        message: message.trim()
      });
      setChatResponse(response.data);
    } catch (error) {
      console.error('Chat error:', error);
      setChatResponse({ response: 'Error: Failed to get response from AI' });
    } finally {
      setLoading(false);
    }
  };

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
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat with AI
        </button>
        <button 
          className={`tab ${activeTab === 'itinerary' ? 'active' : ''}`}
          onClick={() => setActiveTab('itinerary')}
        >
          Generate Itinerary
        </button>
      </div>

      {activeTab === 'chat' && (
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Chat with AI</h2>
          <form onSubmit={handleChat}>
            <div className="input-group">
              <label htmlFor="message">Your Message</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                rows={4}
                required
              />
            </div>
            <button type="submit" disabled={loading || !message.trim()}>
              {loading ? 'Thinking...' : 'Send Message'}
            </button>
          </form>
          
          {loading && <div className="loading">AI is thinking...</div>}
          
          {chatResponse && (
            <div className="response">
              <strong>AI Response:</strong>\n\n{chatResponse.response}
              {chatResponse.usage && (
                <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                  Tokens used: {chatResponse.usage.total_tokens} (prompt: {chatResponse.usage.prompt_tokens}, completion: {chatResponse.usage.completion_tokens})
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'itinerary' && (
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
      )}
    </div>
  );
}

export default App;