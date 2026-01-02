
import { GoogleGenAI, Type } from "@google/genai";
import { SubjectWeapon, GameQuestion } from "../types";

const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' });

export async function generateGameQuestion(subject: SubjectWeapon, className: string = 'Class 8'): Promise<GameQuestion> {
  if (!apiKey) {
    return {
      q: "API Key Missing. What is 2+2?",
      o: ["3", "4", "5", "6"],
      a: "4",
      subject: subject
    };
  }

  let promptContext = "";
  if (subject === SubjectWeapon.MATH) promptContext = "Generate a challenging math calculation or logic problem.";
  if (subject === SubjectWeapon.SCIENCE) promptContext = "Generate a quick science fact or concept question.";
  if (subject === SubjectWeapon.ENGLISH) promptContext = "Generate a grammar or vocabulary question.";
  if (subject === SubjectWeapon.GK) promptContext = "Generate a simple general knowledge question for defense.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate one multiple-choice question for a ${className} student.
      Subject context: ${promptContext}
      Return ONLY valid JSON.
      Structure: { "q": "question string", "o": ["opt1", "opt2", "opt3", "opt4"], "a": "exact answer string matching one option" }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            q: { type: Type.STRING },
            o: { type: Type.ARRAY, items: { type: Type.STRING } },
            a: { type: Type.STRING }
          },
          required: ["q", "o", "a"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return { ...data, subject };
  } catch (error) {
    console.error("Game AI Error:", error);
    return {
      q: "Network Error. Select the correct option.",
      o: ["Option A", "Option B", "Option C", "Option D"],
      a: "Option A",
      subject: subject
    };
  }
}
