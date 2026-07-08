import { supabase } from './supabaseService';

export const AuditService = {
  /**
   * 🛡️ Background Forensic Logger Agent
   */
  async logAction(params: {
    companyId: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    recordType: 'VOUCHER' | 'INVOICE' | 'LEDGER';
    recordId: string;
    recordNumber?: string;
    metaChanges?: { before: any; after: any };
  }) {
    try {
      // Active login user session metadata fetch karein
      const activeUserRaw = localStorage.getItem('user'); 
      const activeUser = activeUserRaw ? JSON.parse(activeUserRaw) : null;

      await supabase.from('audit_logs').insert([
        {
          company_id: params.companyId,
          user_id: activeUser?.id || null,
          username: activeUser?.username || 'system_agent',
          action: params.action,
          record_type: params.recordType,
          record_id: params.recordId,
          record_number: params.recordNumber || 'N/A',
          meta_changes: params.metaChanges || null
        }
      ]);
    } catch (err) {
      console.error("Forex Audit Log engine failure:", err);
    }
  },

  /**
   * 🔍 Fetch Forensic Timeline Logs for a specific Voucher/Invoice
   */
  async getRecordHistory(recordId: string) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Audit log registry read failure:", err);
      return [];
    }
  }
};