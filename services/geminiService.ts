import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AiResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const translationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    correction: {
      type: Type.STRING,
      description: "If the user input contains a typo or is a vague layman term, provide the corrected/intended medical term here. Otherwise leave empty.",
      nullable: true
    },
    literal: {
      type: Type.OBJECT,
      properties: {
        term: { type: Type.STRING, description: "The literal or common translation." },
        context: { type: Type.STRING, description: "A concise definition (max 15 words)." }
      },
      required: ["term", "context"]
    },
    clinical: {
      type: Type.OBJECT,
      properties: {
        term: { type: Type.STRING, description: "The formal clinical/medical terminology." },
        context: { type: Type.STRING, description: "A concise definition (max 15 words)." }
      },
      required: ["term", "context"]
    },
    descriptive: {
      type: Type.OBJECT,
      properties: {
        term: { type: Type.STRING, description: "A descriptive phrase or specific syndrome." },
        context: { type: Type.STRING, description: "A concise definition (max 15 words)." }
      },
      required: ["term", "context"]
    }
  },
  required: ["literal", "clinical", "descriptive"]
};

export const fetchMedicalTranslation = async (inputTerm: string): Promise<AiResponse | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    throw new Error("Gemini API Key is missing");
  }

  // Detect script preference based on browser
  // Default to Traditional unless specific Simplified locale is detected
  const isSimplified = typeof navigator !== 'undefined' && navigator.language === 'zh-CN';
  const chineseScriptPreference = isSimplified ? "Simplified Chinese" : "Traditional Chinese (繁體中文)";

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      System Role: You are an expert bidirectional medical translator (English <-> Chinese).
      User Input: "${inputTerm}"
      
      Script Preference: If outputting Chinese, MUST use ${chineseScriptPreference}.

      Task: 
      1. Analyze the input. If it is a typo or a vague layman term that isn't standard, identify the intended medical concept. Put the corrected term in the 'correction' field.
      2. If input is Chinese, provide 3 English translations.
      3. If input is English, provide 3 Chinese translations.
      
      Categories:
      1. Literal/Common: Direct translation or patient-friendly language.
      2. Clinical/Formal: The precise standard medical terminology.
      3. Descriptive: A descriptive term or specific condition name.

      Constraints:
      - If suggestions overlap (e.g. literal is same as clinical), provide a different valid synonym for one of them to ensure variety.
      - For 'context', provide a very short, precise definition (e.g. "Abnormal tissue growth.").
      - Be concise. Return only the JSON.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: translationSchema,
        temperature: 0.3,
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AiResponse;
    }
    return null;

  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};