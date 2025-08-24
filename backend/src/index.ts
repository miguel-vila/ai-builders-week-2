import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import OpenAI from 'openai';
import { zodTextFormat } from "openai/helpers/zod";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Zod schemas for validation
const MessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  model: z.string().optional().default('gpt-3.5-turbo')
});

const ItineraryInputSchema = z.object({
  city: z.string().min(1, 'City is required'),
  dates: z.string().min(1, 'Dates are required'),
  preferences: z.string().optional()
});

const ItineraryActivity = z.object({
  activity: z.string(),
  durationInHours: z.number().min(1, 'Duration must be at least 1 hour')
});

const ItineraryOutputSchema = 
z.object({
  days: z.array(
    z.object({
      day: z.string(),
      morning: z.array(ItineraryActivity),
      afternoon: z.array(ItineraryActivity),
      evening: z.array(ItineraryActivity)
    })
  )
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, model } = MessageSchema.parse(req.body);
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: message }],
      model: model,
      max_tokens: 500
    });

    res.json({
      response: completion.choices[0]?.message?.content || 'No response generated',
      usage: completion.usage
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.post('/api/itinerary', async (req, res) => {
  try {
    const { city, dates, preferences } = ItineraryInputSchema.parse(req.body);
    
    const prompt = `Create a travel itinerary for ${city} for ${dates}. ${preferences ? `Preferences: ${preferences}` : ''} Please provide a detailed day-by-day plan with activities, restaurants, and tips.`;
    
    const response = await openai.responses.parse({
      model: "gpt-4o-2024-08-06",
      input: [
        {role: 'system', content: prompt }
      ],
      text: {
        format: zodTextFormat(ItineraryOutputSchema, "itinerary")
      }
    });

    response.output_parsed?.days.map(day => 
      console.log(`Day: ${JSON.stringify(day)}`)
    );

    console.log('Itinerary response:', response.output_parsed);

    res.json({
      itinerary: response.output_parsed,
      city,
      dates,
      preferences
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
