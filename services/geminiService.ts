import { GoogleGenAI, Type } from "@google/genai";
import { DataPoint } from "../types";

export const generateDataset = async (topic: string): Promise<DataPoint[]> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing");
    throw new Error("API Key is missing. Please check your environment.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a dataset of 40 items related to the topic: "${topic}". 
      Each item should have a category (one of 3-4 groups), two numerical values (valueA, valueB) between 1-100, and a short label.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique ID" },
              category: { type: Type.STRING, description: "Category name (e.g., Type, Genre)" },
              valueA: { type: Type.NUMBER, description: "A numerical metric (e.g., Power, Price)" },
              valueB: { type: Type.NUMBER, description: "Another numerical metric (e.g., Speed, Rating)" },
              label: { type: Type.STRING, description: "Name of the item" },
            },
            required: ["id", "category", "valueA", "valueB", "label"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const data = JSON.parse(text) as DataPoint[];
    // Ensure IDs are strings and unique if the model hallucinates duplicates
    return data.map((d, i) => ({ ...d, id: d.id || `gen-${i}` }));
  } catch (error) {
    console.error("Error generating data:", error);
    return [];
  }
};
