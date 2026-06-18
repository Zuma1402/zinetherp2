import { GoogleGenAI } from "@google/genai";
import { FinancialSummary, TrialBalanceRow, Ledger } from "../types";

// Helper to sanitize data for the prompt to save tokens
const formatFinancialContext = (summary: FinancialSummary, tb: TrialBalanceRow[]) => {
  const tbString = tb.map(r => `${r.ledgerName}: ${r.balanceType} ${r.netBalance}`).join('\n');
  return `
Financial Summary:
Net Profit: ${summary.netProfit}
Income: ${summary.totalIncome}
Expenses: ${summary.totalExpenses}
Assets: ${summary.totalAssets}
Liabilities: ${summary.totalLiabilities}

Ledger Balances:
${tbString}
  `;
};

export const askFinancialAssistant = async (
  query: string,
  summary: FinancialSummary,
  tb: TrialBalanceRow[]
): Promise<string> => {
  // PERMANENT FIX: Vite handles env variables through import.meta.env
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    return "Error: API Key is missing. Please check your configuration.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const context = formatFinancialContext(summary, tb);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // PERMANENT FIX: Using stable current model
      contents: `
You are an expert Accountant and Financial Analyst for a small business.
The user is asking a question about their accounting data.

Context Data:
${context}

User Query: "${query}"

Answer concisely. If suggesting journal entries, use the format:
Dr [Account] [Amount]
Cr [Account] [Amount]
      `,
    });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error analyzing your data.";
  }
};