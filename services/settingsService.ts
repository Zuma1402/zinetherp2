import { ValuationMethod } from '../types';
import { supabase, handleSupabaseError } from './supabaseService';

export interface CompanySettings {
  id?: string;
  companyName: string;
  email?: string;
  taxId?: string;
  stockValuationMethod?: ValuationMethod;
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  
  // Subscription Fields
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  trialStartDate: string; // ISO Date string
  planType?: 'FREE' | 'PRO_YEARLY';
}

const TRIAL_DAYS = 5;

export const getCompanySettings = async (): Promise<CompanySettings> => {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    let settings: CompanySettings;

    if (!data) {
      // New User - Create default settings
      settings = {
        companyName: 'My Company',
        stockValuationMethod: 'FIFO',
        invoicePrefix: 'INV-',
        nextInvoiceNumber: 1,
        subscriptionStatus: 'TRIAL',
        trialStartDate: new Date().toISOString()
      };
      await saveCompanySettings(settings);
    } else {
      settings = data;
    }

    // Check Logic: Has trial expired?
    if (settings.subscriptionStatus === 'TRIAL') {
      const start = new Date(settings.trialStartDate).getTime();
      const now = new Date().getTime();
      const diffDays = (now - start) / (1000 * 3600 * 24);

      if (diffDays > TRIAL_DAYS) {
        settings.subscriptionStatus = 'EXPIRED';
        await saveCompanySettings(settings);
      }
    }

    return settings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Return default settings on error
    return {
      companyName: 'My Company',
      stockValuationMethod: 'FIFO',
      invoicePrefix: 'INV-',
      nextInvoiceNumber: 1,
      subscriptionStatus: 'TRIAL',
      trialStartDate: new Date().toISOString()
    };
  }
};

export const saveCompanySettings = async (settings: CompanySettings): Promise<void> => {
  try {
    const { error } = await supabase
      .from('company_settings')
      .upsert({
        id: settings.id || 'default',
        company_name: settings.companyName,
        email: settings.email,
        tax_id: settings.taxId,
        stock_valuation_method: settings.stockValuationMethod,
        invoice_prefix: settings.invoicePrefix,
        next_invoice_number: settings.nextInvoiceNumber,
        subscription_status: settings.subscriptionStatus,
        trial_start_date: settings.trialStartDate,
        plan_type: settings.planType,
      }, { onConflict: 'id' });

    if (error) throw error;
  } catch (error) {
    throw new Error(handleSupabaseError(error));
  }
};

export const activateSubscription = async (): Promise<void> => {
  try {
    const current = await getCompanySettings();
    const updated: CompanySettings = {
      ...current,
      subscriptionStatus: 'ACTIVE',
      planType: 'PRO_YEARLY'
    };
    await saveCompanySettings(updated);
  } catch (error) {
    throw new Error(handleSupabaseError(error));
  }
};

export const getDaysRemaining = async (): Promise<number> => {
  try {
    const settings = await getCompanySettings();
    if (settings.subscriptionStatus === 'ACTIVE') return 365;
    if (settings.subscriptionStatus === 'EXPIRED') return 0;

    const start = new Date(settings.trialStartDate).getTime();
    const now = new Date().getTime();
    const diffDays = (now - start) / (1000 * 3600 * 24);

    const remaining = Math.max(0, Math.ceil(TRIAL_DAYS - diffDays));
    return remaining;
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return 0;
  }
};