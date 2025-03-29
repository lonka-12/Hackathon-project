require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for your frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL // Use environment variable in production
    : /^http:\/\/localhost:\d+$/, // Allow any localhost port in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helper function to create signature
const createSignature = (apiKey, apiSecret, timestamp) => {
  const message = `${apiKey}${timestamp}`;
  const hmac = crypto.createHmac('sha256', apiSecret);
  hmac.update(message);
  return hmac.digest('hex');
};

// Proxy endpoint for Coursera API
app.get('/api/courses', async (req, res) => {
  try {
    const { query } = req.query;
    const COURSERA_API_KEY = process.env.COURSERA_API_KEY;
    const COURSERA_API_SECRET = process.env.COURSERA_API_SECRET;

    if (!COURSERA_API_KEY || !COURSERA_API_SECRET) {
      throw new Error('Coursera API credentials not found');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createSignature(COURSERA_API_KEY, COURSERA_API_SECRET, timestamp);

    // Format the query to be more specific and focused
    const formattedQuery = query.split(' ').slice(0, 5).join(' '); // Limit query length

    console.log('Making request to Coursera API with query:', formattedQuery);

    // Construct the API URL with proper parameters
    const apiUrl = new URL('https://api.coursera.org/api/courses.v1');
    apiUrl.searchParams.append('q', 'search');
    apiUrl.searchParams.append('query', formattedQuery);
    apiUrl.searchParams.append('fields', 'id,name,description,shortName,photoUrl,partnerIds,primaryLanguages,workload,rating,enrollmentCount,startDate,previewLink');
    apiUrl.searchParams.append('limit', '10'); // Limit results
    apiUrl.searchParams.append('includes', 'partnerIds'); // Include partner information

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${COURSERA_API_KEY}`,
        'X-Coursera-Timestamp': timestamp.toString(),
        'X-Coursera-Signature': signature,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coursera API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: apiUrl.toString()
      });
      throw new Error(`Failed to fetch courses from Coursera: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check if we got valid data
    if (!data || !data.elements) {
      console.log('No valid data received from Coursera API');
      return res.json({ elements: [] });
    }

    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch courses',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 