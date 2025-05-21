const express = require('express');
require('dotenv').config();

const app = express();
const PORT = 8080;

// Add this middleware to parse JSON bodies
app.use(express.json());

// Vertex AI setup
const {
  HarmBlockThreshold,
  HarmCategory,
  VertexAI
} = require('@google-cloud/vertexai');

const project = 'jovial-coral-456321-c6';
const location = 'us-central1';
const textModel = 'gemini-2.0-flash-001';

const vertexAI = new VertexAI({ project, location });

const generativeModel = vertexAI.getGenerativeModel({
  model: textModel,
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
    }
  ],
  generationConfig: { maxOutputTokens: 1024 },
  systemInstruction: {
    role: 'system',
    parts: [{ text: 'For example, you are a helpful customer service agent.' }]
  }
});

// root endpoint
app.get('/', (req, res) => {
  res.send(`Hello World version 2- ${process.env.ENVIRONMENT}`);
});

// /generate endpoint for Gemini
app.post('/generate', async (req, res) => {
  try {
    // Extract summary and list from request body
    const { summary, list } = req.body;

    // Log or process the extracted data
    console.log('Summary:', summary);
    console.log('List:', list);

    // Build the prompt as specified
    const prompt = `
      You are a system that extracts structured field metadata from documents.

      Given:
      - A summary of a document
      - A list of words representing important details (field hints)

      Your task is to generate a JSON object with the following structure:

      {
        "fields": [
          {
            "name": string,           // concise machine-readable field name in camelCase
            "type": string,           // one of: "string", "number", "boolean", "date", or "enum"
            "description": string     // human-readable description of what the field is
            "token": string,           // token used to identify the field in the document
          },
          ...
        ]
      }

      Rules:
      - Use the list of detail-related words as a guide for what fields to include
      - Infer type and description based on the summary and context
      - If uncertain, default to type "string"
      - Do not include extra text outside the JSON

      ---

      Summary:
      """
      ${summary || ''}
      """

      Details:
      ${JSON.stringify(list || [])}

      Respond with only the JSON.
    `;

    const request = {
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ]
    };

    const result = await generativeModel.generateContent(request);
    const response = result.response;

    // Extract only the text from the first candidate and format as JSON
    let jsonText = '';
    if (
      response &&
      response.candidates &&
      response.candidates[0] &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts[0] &&
      response.candidates[0].content.parts[0].text
    ) {
      jsonText = response.candidates[0].content.parts[0].text.trim();
      // Remove markdown code block if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/i, '').replace(/```$/, '').trim();
      }
    }

    res.type('application/json').send(jsonText);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating content');
  }
});

// start server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!- http://localhost:${PORT}`);
});

