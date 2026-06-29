import { supabase } from './supabaseService';
import { Voucher, VoucherType } from '../types';

/**
 * 🤖 ZinethERP Multi-Tenant WhatsApp AI Controller Engine
 * This module isolates financial metrics using real-time database contexts.
 */
export const WhatsAppService = {
  
  /**
   * 🛡️ Layer 1: Core Process Incoming Webhook Message Payload
   */
  async processIncomingMessage(incomingNumber: string, messageBody: string): Promise<string> {
    const text = messageBody.trim().toLowerCase();

    try {
      // 1. Cross-verify identity from secured users schema partition
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('id, username, company_id, role')
        .eq('whatsapp_number', incomingNumber)
        .maybeSingle();

      if (userError || !userProfile) {
        return "⚠️ Access Denied: Aapka yeh WhatsApp number ZinethERP registry mein active nahi hai. Khas taur par pehle settings dashboard se apna profile number link karwayen.";
      }

      const companyId = userProfile.company_id;

      // 2. Fetch Active Corporate Identity Metadata Bounds
      const { data: companyObj } = await supabase
        .from('companies')
        .select('name, base_currency')
        .eq('id', companyId)
        .maybeSingle();

      const companyName = companyObj ? companyObj.name : 'Your Entity';
      const currency = companyObj ? companyObj.base_currency : 'PKR';

      // 📊 INTENT SWITCH MATRIX 
      // Intent 1: Liquidity Check (Cash/Bank Ledger Groups)
      if (text.includes('cash') || text.includes('bank') || text.includes('balance')) {
        const { data: ledgers } = await supabase
          .from('ledgers')
          .select('opening_balance, group')
          .eq('company_id', companyId);

        const liquidity = ledgers
          ? ledgers
              .filter(l => l.group.includes('Cash') || l.group.includes('Bank'))
              .reduce((sum, l) => sum + (l.opening_balance || 0), 0)
          : 0;

        return `📊 *${companyName} Live Liquidity Update*\n\n• *Cash & Bank Total:* ${currency} ${liquidity.toLocaleString()}\n\nVerified session secure for @${userProfile.username}.`;
      }

      // Intent 2: Real-time Profit & Loss Summary Extraction
      if (text.includes('pnl') || text.includes('profit') || text.includes('loss') || text.includes('income')) {
        const { data: vouchers } = await supabase
          .from('vouchers')
          .select('entries')
          .eq('company_id', companyId);

        const { data: ledgers } = await supabase
          .from('ledgers')
          .select('id, type')
          .eq('company_id', companyId);

        let totalIncome = 0;
        let totalExpense = 0;

        if (vouchers && ledgers) {
          vouchers.forEach((v: any) => {
            const entries = Array.isArray(v.entries) ? v.entries : JSON.parse(v.entries || '[]');
            entries.forEach((e: any) => {
              const led = ledgers.find(l => l.id === e.ledgerId);
              if (led?.type === 'INCOME') totalIncome += ((e.credit || 0) - (e.debit || 0));
              if (led?.type === 'EXPENSE') totalExpense += ((e.debit || 0) - (e.credit || 0));
            });
          });
        }

        const netProfit = totalIncome - totalExpense;

        return `📈 *${companyName} Live P&L Summary*\n\n• *Total Income:* ${currency} ${totalIncome.toLocaleString()}\n• *Total Expenses:* ${currency} ${totalExpense.toLocaleString()}\n────────────────────\n💰 *Net Profit:* ${currency} ${netProfit.toLocaleString()}\n\nData safety isolation secure.`;
      }

      // Default Fallback Instruction Card Menu
      return `👋 Salaam @${userProfile.username}!\n\nZinethERP Automated AI Broker Node Active for entity *${companyName}*.\n\n*Available Live Commands:*\n1. Type *"profit"* or *"p&l"* to fetch dynamic operating movements.\n2. Type *"bank"* or *"cash"* to pull liquidity statements.`;

    } catch (err) {
      console.error("WhatsApp Engine Critical Error:", err);
      return "❌ AI Node Framework Runtime Error. Matrix mapping timeout.";
    }
  }
};