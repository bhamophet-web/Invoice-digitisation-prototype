import { GoogleGenAI, Type } from "@google/genai";
import type { InvoiceData } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            resolve('');
        }
    };
    reader.readAsDataURL(file);
  });
  const base64EncodedData = await base64EncodedDataPromise;
  return {
    inlineData: { data: base64EncodedData, mimeType: file.type },
  };
};

export const digitizeInvoice = async (imageFile: File, apiKey: string, model: string): Promise<InvoiceData> => {
  if (!apiKey) {
    throw new Error("Gemini API key is not set. Please enter your API key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const imagePart = await fileToGenerativePart(imageFile);

  const prompt = `You are a meticulous data entry specialist. Your task is to analyze this invoice image and extract the data into a JSON object matching the provided schema.

Key Instructions:
- **Non-Invoice Images:** If the image provided does not appear to be an invoice, receipt, or bill, you MUST respond with 'vendorName' as "Invalid Document", 'totalAmount' as 0, 'currency' as "USD", an empty 'lineItems' array, and a 'notes' field explaining that the image could not be processed as an invoice.
- **Accuracy is critical.** Double-check every field against the image.
- **Dates:** Must be in \`YYYY-MM-DD\` format. If \`dueDate\` is missing, omit it.
- **Numbers:** All monetary values (\`totalAmount\`, \`taxAmount\`, \`unitPrice\`, \`amount\`) must be numbers, not strings. Do not include currency symbols.
- **Currency:** Use the 3-letter ISO 4217 code (e.g., USD, EUR).
- **Calculations & Verification:** Verify that for each line item, \`quantity * unitPrice\` equals \`amount\`. Also, verify that the sum of line items plus tax equals the \`totalAmount\`. If there's a significant discrepancy (more than a small rounding error), extract all values exactly as they are printed on the invoice and add a 'notes' field briefly explaining the mathematical error you found.
- **Missing Tax:** If no tax amount is specified, use \`0\` for \`taxAmount\`.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { text: prompt },
        imagePart,
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vendorName: { type: Type.STRING, description: "The name of the company that issued the invoice." },
          invoiceNumber: { type: Type.STRING, description: "The unique identifier for the invoice." },
          invoiceDate: { type: Type.STRING, description: "The date the invoice was issued (YYYY-MM-DD)." },
          dueDate: { type: Type.STRING, description: "The date the payment is due (YYYY-MM-DD)." },
          totalAmount: { type: Type.NUMBER, description: "The total amount due, including taxes." },
          taxAmount: { type: Type.NUMBER, description: "The total amount of tax." },
          currency: { type: Type.STRING, description: "The 3-letter ISO 4217 currency code for the amounts (e.g., USD, EUR, MYR)." },
          lineItems: {
            type: Type.ARRAY,
            description: "A list of all items or services being billed.",
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING, description: "Description of the item or service." },
                quantity: { type: Type.NUMBER, description: "The quantity of the item." },
                unitPrice: { type: Type.NUMBER, description: "The price per unit of the item." },
                amount: { type: Type.NUMBER, description: "The total amount for the line item (quantity * unitPrice)." },
              },
              required: ["description", "quantity", "unitPrice", "amount"],
            },
          },
          notes: { type: Type.STRING, description: "A note about any mathematical discrepancies or oddities found on the invoice itself (e.g., line items do not sum to the total)." },
        },
        required: ["vendorName", "invoiceNumber", "invoiceDate", "totalAmount", "lineItems", "currency"],
      },
    },
  });

  try {
    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText);
    return data as InvoiceData;
  } catch (e) {
    console.error("Error parsing JSON response from Gemini:", e);
    console.error("Raw response text:", response.text);
    throw new Error("Failed to parse invoice data. The AI model returned an unexpected format.");
  }
};