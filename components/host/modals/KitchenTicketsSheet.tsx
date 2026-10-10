'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type FilterType = 'ALL' | 'PENDING' | 'PREPARING' | 'COMPLETED';

export function KitchenTicketsSheet({ timeframe, onClose }: { timeframe: 'daily' | 'weekly' | 'monthly' | 'custom', onClose: () => void }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    async function fetchTickets() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
        if (!business) return;

        const now = new Date();
        let startIso = '';
        if (timeframe === 'weekly') {
          startIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (timeframe === 'monthly') {
          startIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        } else {
          startIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        }

        const { data, error } = await supabase
          .from('kitchen_tickets')
          .select('*')
          .eq('business_id', business.id)
          .gte('created_at', startIso)
          .lte('created_at', now.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTickets(data || []);
      } catch (e) {
        console.error('Failed to fetch kitchen tickets for sheet', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTickets();
  }, [timeframe]);

  const filteredTickets = tickets.filter(t => {
    if (filter === 'ALL') return true;
    if (filter === 'COMPLETED') return t.status === 'READY' || t.status === 'SERVED';
    return t.status === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 transition-opacity" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-white h-[90vh] sm:h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col p-6 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-2xl font-medium text-zinc-900">Order Status Deep-Dive</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1">Timeframe: {timeframe}</p>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-black rounded-full hover:bg-zinc-100 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {(['ALL', 'PENDING', 'PREPARING', 'COMPLETED'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors whitespace-nowrap ${filter === f ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
              >
                {f} ({f === 'ALL' ? tickets.length : f === 'COMPLETED' ? tickets.filter(t => t.status === 'READY' || t.status === 'SERVED').length : tickets.filter(t => t.status === f).length})
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.length === 0 ? (
                <p className="text-zinc-500 italic text-center mt-10">No tickets found for this filter.</p>
              ) : (
                filteredTickets.map(ticket => {
                  const date = new Date(ticket.created_at);
                  const itemsSummary = (ticket.items || []).map((i: any) => `${i.qty || i.quantity || 1}x ${i.name}`).join(', ');
                  return (
                    <div key={ticket.id} className="flex flex-col gap-3 p-4 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-zinc-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-lg font-medium text-black">{ticket.ticket_number}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">{ticket.table_or_room}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                          ticket.status === 'PENDING' ? 'bg-neutral-100 text-neutral-800 border border-neutral-200' :
                          ticket.status === 'PREPARING' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          ticket.status === 'READY' || ticket.status === 'SERVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-sm text-zinc-700 flex-1">{itemsSummary}</p>
                        <span className="text-xs font-mono text-zinc-400 ml-4">{date.toLocaleDateString('en-IN', {month: 'short', day: 'numeric'})}, {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
