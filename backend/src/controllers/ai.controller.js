/**
 * @fileoverview API Controller - Handles HTTP requests and business logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import asyncHandler from "../utils/asyncHandler.js";
import ApiErrors from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { SystemConfig } from "../models/systemConfig.model.js";
import axios from "axios";

/**
 * Discovers and selects the best available Gemini model for the given API key.
 * Prioritizes newer models (2.5 > 2.0 > 1.5 > 1.0) that support content generation.
 *
 * @param {string} apiKey - Google Gemini API key
 * @returns {Promise<string|null>} The name of the best available model, or null if discovery fails
 * @example
 * const model = await getBestModel('your-api-key');
 * // Returns: 'models/gemini-2.5-flash' or null
 */
const getBestModel = async (apiKey) => {
    try {
        // Fetch available models for this specific key
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const models = response.data.models || [];

        // Filter for models that support generating content
        const genModels = models.filter(m => m.supportedGenerationMethods.includes("generateContent"));

        // Future-proof selection priority: 2.5 -> 2.0 -> 1.5 -> 1.0
        const priority = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];

        for (const p of priority) {
            const found = genModels.find(m => m.name.includes(p));
            if (found) return found.name;
        }

        return genModels[0]?.name || null;
    } catch (err) {
        console.warn(`Model discovery failed for key ending in ...${apiKey.slice(-5)}:`, err.message);
        return null; // Return null to signal discovery failed for this key
    }
};

/**
 * Creates and configures a Google Generative AI model instance.
 *
 * @param {string} apiKey - Google Gemini API key
 * @param {string} modelName - Name of the model to use (e.g., 'gemini-2.5-flash')
 * @param {string} systemPrompt - System instruction/prompt for the model
 * @returns {Object} Configured GenerativeModel instance
 */
const getGenerativeModel = (apiKey, modelName, systemPrompt) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ]
    });
};

/**
 * Generates a form schema using AI based on user prompt.
 * Implements quota management, API key failover, and institutional context injection.
 *
 * @route POST /api/v1/ai/generate-form
 * @access Private
 * @param {Object} req.body.prompt - User's natural language description of the form
 * @returns {Object} Generated form schema with title, description, and fields
 * @throws {ApiErrors} 400 if prompt is missing, 404 if user not found, 429 if daily limit exceeded, 500 if AI generation fails
 * @example
 * // Request body:
 * { "prompt": "Create a leave application form" }
 * // Response:
 * { "schema": {...}, "remaining": 9, "modelUsed": "gemini-2.5-flash" }
 */
export const generateFormSchema = asyncHandler(async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) throw new ApiErrors("Prompt is required", 400);

    const user = await User.findById(req.user._id);
    if (!user) throw new ApiErrors("User not found", 404);

    // 1. Quota Management - Fetch configurable limit
    const limitConfig = await SystemConfig.findOne({ key: "AI_GENERATION_LIMIT_PER_DAY" });
    const dailyLimit = limitConfig?.value || 10; // Default to 10 if not configured

    const today = new Date().setHours(0, 0, 0, 0);
    const lastGenerated = user.aiUsage?.lastGeneratedDate ? new Date(user.aiUsage.lastGeneratedDate).setHours(0, 0, 0, 0) : null;

    if (lastGenerated !== today) {
        user.aiUsage = { lastGeneratedDate: new Date(), count: 1 };
    } else {
        if (user.aiUsage.count >= dailyLimit) {
            throw new ApiErrors(`Daily AI generation limit (${dailyLimit}) reached. Please try again tomorrow.`, 429);
        }
        user.aiUsage.count += 1;
    }
    await user.save({ validateBeforeSave: false });

    // 2. Gemini Integration with Failover & Discovery
    const apiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
    if (apiKeys.length === 0) throw new ApiErrors("Gemini API key not configured. Please add GEMINI_API_KEYS to your .env file.", 500);

    // 3. Realistic Context: Fetch institutional data for AI Guidance
    const configs = await SystemConfig.find({ key: { $in: ["LABS", "DESIGNATIONS", "DIVISIONS"] } });
    const context = {};
    configs.forEach(c => context[c.key] = c.value);

    const systemPrompt = `
        You are a Professional UI/UX Form Architect for CSIR (Council of Scientific and Industrial Research, India). 
        Your task is to generate a complete, production-ready form schema in JSON format based on the user's prompt.
        
        INSTITUTIONAL CONTEXT (Use these for realistic suggestions in "select" or "radio" fields):
        - CSIR Labs: ${JSON.stringify(context.LABS || [])}
        - Designations: ${JSON.stringify(context.DESIGNATIONS || [])}
        - Divisions: ${JSON.stringify(context.DIVISIONS || [])}

        The schema MUST strictly follow this JSON structure:
        {
          "title": "Clear Form Title",
          "description": "Brief description of the form's purpose",
          "fields": [
            {
              "id": "unique_camelCase_id",
              "type": "text" | "select" | "date" | "checkbox" | "radio" | "file" | "header",
              "label": "Human readable label",
              "placeholder": "Helpful placeholder",
              "section": "Logical section name (e.g., '1. Personal Details')",
              "columnSpan": 1 or 2,
              "required": true,
              "options": [{"label": "Option 1", "value": "option_1"}],
              "validation": {
                "rules": [
                  {"type": "email" | "mobile" | "pan" | "aadhaar" | "pincode" | "ifsc" | "gstin" | "numeric" | "min" | "max" | "minLength" | "maxLength"}
                ]
              }
            }
          ]
        }

        Rules:
        1. STRONGLY RECOMMENDED: Group related fields into logical "section" names.
        2. Use "columnSpan": 2 for wide fields like "Full Address" or "Remarks".
        3. MANDATORY: For "type": "radio" or "type": "select", you MUST provide an "options" array with at least 2 logical choices (e.g., [{"label": "Yes", "value": "yes"}, {"label": "No", "value": "no"}]).
        4. Choose "radio" for small sets of exclusive choices (2-4 items) and "select" for larger sets.
        5. VALIDATION RULES: Automatically add appropriate validation rules based on field labels:
           - Fields with "email" in label → add {"type": "email"}
           - Fields with "mobile" or "phone" in label → add {"type": "mobile"}
           - Fields with "pan" in label → add {"type": "pan"}
           - Fields with "aadhaar" or "aadhar" in label → add {"type": "aadhaar"}
           - Fields with "pincode" or "pin code" in label → add {"type": "pincode"}
           - Fields with "ifsc" in label → add {"type": "ifsc"}
           - Fields with "gstin" or "gst" in label → add {"type": "gstin"}
           - Fields with "age" in label → add {"type": "numeric"}, {"type": "min", "value": 1}, {"type": "max", "value": 120}
        6. Output ONLY the raw JSON object. Use double quotes for keys and values.
    `;

    let lastError;
    for (const apiKey of apiKeys) {
        try {
            // DYNAMIC DISCOVERY
            const discoveredModel = await getBestModel(apiKey);
            if (!discoveredModel) {
                console.warn(`Skipping key ending in ...${apiKey.slice(-5)} due to discovery failure.`);
                continue;
            }


            const model = getGenerativeModel(apiKey, discoveredModel, systemPrompt);
            const result = await model.generateContent(prompt);
            const response = await result.response;

            const text = response.text();
            if (!text) throw new Error("Empty text in response.");

            // Clean potential markdown blocks
            const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const schema = JSON.parse(cleanJson);

            return res.status(200).json(new ApiResponse(200, "Form generated successfully", {
                schema,
                remaining: dailyLimit - user.aiUsage.count,
                modelUsed: discoveredModel
            }));
        } catch (err) {
            console.error(`Gemini Error with key ending in ...${apiKey.slice(-5)}:`, err.message);
            lastError = err;
            if (err.message.includes("429") || err.message.includes("quota") || err.message.includes("limit") || err.message.includes("404")) {
                continue; // Try next key
            } else {
                break; // Fatal error
            }
        }
    }

    throw new ApiErrors(lastError?.message || "AI generation failed after multiple attempts.", lastError?.status || 500);
});

/**
 * Retrieves the current user's AI usage statistics for today.
 *
 * @route GET /api/v1/ai/usage
 * @access Private
 * @returns {Object} Usage count and daily limit
 * @example
 * // Response:
 * { "count": 3, "limit": 10 }
 */
export const getAIUsage = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const limitConfig = await SystemConfig.findOne({ key: "AI_GENERATION_LIMIT_PER_DAY" });
    const dailyLimit = limitConfig?.value || 10; // Default to 10 if not configured

    const today = new Date().setHours(0, 0, 0, 0);
    const lastGenerated = user.aiUsage?.lastGeneratedDate ? new Date(user.aiUsage.lastGeneratedDate).setHours(0, 0, 0, 0) : null;

    const count = lastGenerated === today ? (user.aiUsage.count || 0) : 0;
    res.status(200).json(new ApiResponse(200, "Usage context fetched", { count, limit: dailyLimit }));
});
