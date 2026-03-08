import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

// Initialize Google Generative AI for direct Vision API calls
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const visionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Vision analysis function
export async function visionAnalysisFlow(input: {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  lat?: number;
  lng?: number;
}) {
  try {
    logger.agentStart('Vision', 0, !!(input.lat && input.lng)); // 0 length as it's an image

    // Prepare the image part
    const imageParts = [
      {
        inlineData: {
          data: input.imageBase64,
          mimeType: input.mimeType,
        },
      },
    ];

    // Create the prompt
    const prompt = `Analyze this image for city maintenance or safety issues in Montgomery, Alabama.

Identify the issue type:
- pothole: damaged road surface, holes, cracks, asphalt damage
- graffiti: vandalism, spray paint on walls, buildings, public surfaces
- trash: illegal dumping, overflowing bins, litter, waste accumulation
- flooding: standing water, blocked drains, water accumulation
- overgrown_grass: overgrown vegetation, unkempt lots, tall weeds, neglected landscaping
- other: anything else requiring city attention (broken signs, damaged sidewalks, etc.)

Assess severity:
- high: immediate danger, major damage, safety hazard
- medium: significant issue needing attention soon
- low: minor issue, routine maintenance

Return JSON only (no markdown, no explanation):
{
  "incidentType": "...",
  "severity": "high|medium|low",
  "confidence": 0.0-1.0,
  "description": "2-3 sentence detailed description of what you see and why it needs attention",
  "prefilledForm": {
    "serviceType": "exact 311 service type name",
    "description": "detailed description for 311 form including location if visible",
    "suggestedPriority": "Emergency|High|Normal|Low"
  }
}`;

    // Generate content with JSON Response Mode
    const result = await visionModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const response = result.response;
    const text = response.text();

    // Parse JSON response - Now guaranteed to be valid JSON by the API
    let parsedResult;
    try {
      parsedResult = JSON.parse(text);
    } catch (parseError) {
      logger.error('VisionParse', parseError);
      throw new Error('Invalid vision analysis response format');
    }

    // Validate and sanitize the response
    if (!parsedResult.incidentType || !parsedResult.severity || !parsedResult.confidence || !parsedResult.description) {
      throw new Error('Invalid vision analysis response format');
    }

    // Ensure confidence is within valid range
    parsedResult.confidence = Math.max(0, Math.min(1, parsedResult.confidence));

    logger.info('VisionResult', {
      incidentType: parsedResult.incidentType,
      severity: parsedResult.severity,
      confidence: parsedResult.confidence
    });

    return parsedResult;

  } catch (error) {
    logger.error('VisionFlow', error);

    // Fallback response for when vision analysis fails
    return {
      incidentType: 'other',
      severity: 'medium',
      confidence: 0.5,
      description: 'Unable to analyze image due to technical issues. Please describe the issue manually.',
      prefilledForm: {
        serviceType: 'other',
        description: 'Image analysis failed - please describe the issue manually',
        suggestedPriority: 'Normal'
      }
    };
  }
}
