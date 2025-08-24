# AI Builders TypeScript Project

A full-stack TypeScript application with a React frontend and Express backend, featuring OpenAI integration and Zod validation.

## Features

- **Backend**: Express.js server with TypeScript, OpenAI API integration, and Zod validation
- **Frontend**: React with TypeScript and Vite for fast development
- **AI Chat**: Direct chat interface with OpenAI models
- **Travel Itinerary Generator**: AI-powered travel planning based on user preferences

## Project Structure

```
ai-builders-project/
├── backend/           # Express.js API server
│   ├── src/
│   │   └── index.ts   # Main server file with OpenAI integration
│   ├── package.json
│   └── tsconfig.json
├── frontend/          # React frontend
│   ├── src/
│   │   ├── App.tsx    # Main React component
│   │   ├── main.tsx   # React entry point
│   │   └── index.css  # Styles
│   ├── package.json
│   └── vite.config.ts
└── package.json       # Root workspace configuration
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your OpenAI API key:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your OpenAI API key:

```
OPENAI_API_KEY=your_actual_openai_api_key_here
PORT=3001
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

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Chat with AI
- `POST /api/chat`
  ```json
  {
    "message": "Your question here",
    "model": "gpt-3.5-turbo" // optional
  }
  ```

### Generate Travel Itinerary
- `POST /api/itinerary`
  ```json
  {
    "city": "Paris",
    "dates": "December 15-20, 2024",
    "preferences": "museums, local food" // optional
  }
  ```

## Technologies Used

### Backend
- **Express.js**: Web framework
- **TypeScript**: Type safety
- **OpenAI**: AI integration
- **Zod**: Runtime type validation
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment variable management

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Axios**: HTTP client
- **CSS**: Custom styling with gradients and animations

## Usage

1. Open http://localhost:3000 in your browser
2. Use the **Chat with AI** tab to ask questions
3. Use the **Generate Itinerary** tab to create travel plans
4. The frontend communicates with the backend through API calls

## Notes

- Make sure to get an OpenAI API key from https://platform.openai.com/
- The frontend uses Vite's proxy to forward `/api` requests to the backend
- Both frontend and backend have TypeScript strict mode enabled
- Zod validates all API inputs to ensure type safety