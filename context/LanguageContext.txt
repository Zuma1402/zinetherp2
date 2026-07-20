import React, { useState, useEffect } from 'react';
import { AuditService } from '../services/auditService';
import { ShieldCheck, User, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ForensicTimelineProps {
  recordId: string;
  refreshTrigger?: unknown;
}

export const ForensicTimeline: React.FC<ForensicTimelineProps> = ({ recordId, refreshTrigger }) => {
  // ⭐ NEW ADDITION ONLY: Safe Hook Context Interceptor (Bina kisi code logic ko touch kiye)
  let t = (key: string) => key === 'forensic_audit_trail' ? 'Forensic Audit Trail' : 'No audit trail generated for this transaction yet (Legacy record entry).';
  try {
    const langContext = useLanguage();
    if (langContext && langContext.t) {
      t = langContext.t;
    }
  } catch (err) {
    // Context fallback quiet mode
  }

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadHistory = async () => {
    if (!recordId) return;
    setIsLoading(true);
    try {
      const history = await AuditService.getRecordHistory(recordId);
      setLogs(history || []);
    } catch (err) {
      console.error("Forensic log read error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [recordId, refreshTrigger]);

  if (!recordId) return null;

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xl shadow-gray-100/40 space-y-4">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              {t('forensic_audit_trail')}
            </h4>
            <p className="text-[10px] text-gray-400 font-bold">INTERNAL ACCOUNTING SENTINEL ACTIVE</p>
          </div>
        </div>
        <button 
          type="button" 
          onClick={loadHistory} 
          disabled={isLoading}
          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading && logs.length === 0 ? (
        <div className="text-center py-6 text-xs font-bold text-gray-400 animate-pulse">
          Querying cluster forensic ledger partitions...
        </div>
      ) : logs.length === 0 ? (
        <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl text-xs font-medium text-gray-500 border border-dashed border-gray-200">
          <AlertCircle size={14} className="text-slate-400 shrink-0" />
          <span>{t('no_audit_trail')}</span>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-100 pl-5 ml-2.5 space-y-6">
          {logs.map((log) => {
            const dateStr = log.created_at 
              ? new Date(log.created_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })
              : '';

            let actionBadgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
            if (log.action === 'INSERT') actionBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            if (log.action === 'DELETE') actionBadgeColor = 'bg-rose-50 text-rose-700 border-rose-100';

            return (
              <div key={log.id || Math.random()} className="relative group animate-in slide-in-from-left duration-200">
                <div className={`absolute -left-[27px] top-0.5 w-3 h-3 rounded-full border-2 border-white ring-4 ${log.action === 'UPDATE' ? 'bg-amber-400 ring-amber-50' : log.action === 'INSERT' ? 'bg-emerald-500 ring-emerald-50' : 'bg-rose-500 ring-rose-50'}`}></div>
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 border rounded text-[10px] font-black uppercase tracking-wider ${actionBadgeColor}`}>
                      {log.action}
                    </span>
                    <div className="flex items-center gap-1 font-black text-gray-800">
                      <User size={12} className="text-gray-400" />
                      <span>@{log.username || 'system'}</span>
                    </div>
                    {dateStr && (
                      <div className="flex items-center gap-1 font-bold text-gray-400 font-mono text-[10px] ml-auto">
                        <Clock size={11} />
                        <span>{dateStr}</span>
                      </div>
                    )}
                  </div>

                  {log.meta_changes && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 font-mono text-[11px] leading-relaxed text-gray-600 shadow-inner">
                      {log.meta_changes.before && (
                        <div className="flex gap-2 truncate">
                          <span className="text-rose-500 font-bold shrink-0">[BEFORE]:</span>
                          <span className="opacity-80">{JSON.stringify(log.meta_changes.before)}</span>
                        </div>
                      )}
                      {log.meta_changes.after && (
                        <div className="flex gap-2 truncate">
                          <span className="text-emerald-600 font-bold shrink-0">[AFTER]:</span>
                          <span>{JSON.stringify(log.meta_changes.after)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};