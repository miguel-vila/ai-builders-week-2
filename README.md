# AI Builders Week 2 Project

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

## Notes

- Make sure to get an OpenAI API key from https://platform.openai.com/
- The frontend uses Vite's proxy to forward `/api` requests to the backend
- Both frontend and backend have TypeScript strict mode enabled
