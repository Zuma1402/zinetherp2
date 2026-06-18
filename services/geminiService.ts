import { createClient } from "@supabase/supabase-js";
import { FinancialSummary, TrialBalanceRow } from "../types";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const formatFinancialContext = (summary: FinancialSummary, tb: TrialBalanceRow[]) => {
  const tbString = tb?.map(r => `${r.ledgerName}: ${r.balanceType} ${r.netBalance}`).join('\n') || '';
  return `
Financial Summary:
Net Profit: ${summary?.netProfit || 0}
Income: ${summary?.totalIncome || 0}
Expenses: ${summary?.totalExpenses || 0}
Assets: ${summary?.totalAssets || 0}
Liabilities: ${summary?.totalLiabilities || 0}

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
    // 1. Fetch the API key dynamically from Supabase database
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
    const context = formatFinancialContext(summary, tb);

    // 2. Direct HTTP REST Fetch Call (Super Stable, No SDK package issues on frontend)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `
You are an expert Accountant and Financial Analyst for a small business.
The user is asking a question about their accounting data.

Context Data:
${context}

User Query: "${query}"

Answer concisely. If suggesting journal entries, use the format:
Dr [Account] [Amount]
Cr [Account] [Amount]
            `
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API HTTP Error status:", response.status, errorData);
      return `Error: Gemini API responded with status ${response.status}`;
    }

    const jsonResponse = await response.json();
    
    // Exact path mapping for Gemini JSON response
    const aiText = jsonResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

    return aiText || "I couldn't generate a response.";

  } catch (error) {
    console.error("Gemini Native Fetch Error:", error);
    return "Sorry, I encountered an error analyzing your data.";
  }
};