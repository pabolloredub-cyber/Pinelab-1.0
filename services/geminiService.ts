
import { GoogleGenAI, Type } from "@google/genai";

export const generateProductDescription = async (productName: string, material: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Escreva uma descrição de marketing curta e atraente para um produto impresso em 3D chamado "${productName}" feito de "${material}". Foque na qualidade da impressão e durabilidade.`,
      config: {
        temperature: 0.7,
      }
    });
    
    return response.text?.trim() || "Descrição gerada automaticamente para o produto.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao gerar descrição automática.";
  }
};

export const suggestPrintSettings = async (material: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Quais as melhores configurações de temperatura de bico e mesa para imprimir ${material}? Responda em formato JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nozzleTemp: { 
              type: Type.STRING,
              description: "Recomendação de temperatura para o bico extrusor."
            },
            bedTemp: { 
              type: Type.STRING,
              description: "Recomendação de temperatura para a mesa de impressão."
            },
            notes: { 
              type: Type.STRING,
              description: "Observações técnicas adicionais sobre o material."
            }
          },
          required: ["nozzleTemp", "bedTemp"],
          propertyOrdering: ["nozzleTemp", "bedTemp", "notes"]
        }
      }
    });
    
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return { nozzleTemp: "N/A", bedTemp: "N/A", notes: "Consulte o fabricante." };
  }
};
