# AI Builders Week 2 Project

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `backend/.env` with:

```
OPENAI_API_KEY=your_openai_api_key
PORT=3001
AMADEUS_API_KEY=your_amadeus_client_id
AMADEUS_API_SECRET=your_amadeus_client_secret
API_MARKETAPI_KEY=your_api_market_key
```

### 3. Development

Start both backend and frontend in development mode:

```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend server on http://localhost:3000

Or run them separately:

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### 4. Building for Production

```bash
npm run build
```

## Notes

- Make sure to get the API keys for OpenAI, Amadeus, and ApiMarket
- The frontend uses Vite's proxy to forward `/api` requests to the backend
- Calendar export generates standard .ics files compatible with Google Calendar and other calendar applications
