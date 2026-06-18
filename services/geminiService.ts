import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { FinancialSummary, TrialBalanceRow } from "../types";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  try {
    // PERMANENT FIX: Fetching the API key dynamically from Supabase database instead of Vercel env
    const { data, error } = await supabase
      .from('app_secrets')
      .select('secret_value')
      .eq('id', 'gemini_api_key')
      .single();

    if (error || !data?.secret_value) {
      console.error("Database secret fetch error:", error);
      return "Error: Unable to retrieve the AI API Key from database config.";
    }

    const apiKey = data.secret_value;
    const ai = new GoogleGenAI({ apiKey });
    const context = formatFinancialContext(summary, tb);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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