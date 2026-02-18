import { useState } from 'react';
import {
  Search, Plus, LifeBuoy, Loader2, MessageSquare, Send, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import useApi from '@/hooks/useApi';
import api from '@/api/client';

interface Ticket {
  id: string; property_id: string | null; property_name: string | null; subject: string; description: string;
  ticket_type: string; priority: string; status: string; opened_by: string; opener_first_name: string;
  opener_last_name: string; assigned_to: string | null; sla_due_at: string | null; sla_breached: boolean;
  created_at: string; resolved_at: string | null;
}
interface TicketMessage {
  id: string; ticket_id: string; sender_id: string; sender_first_name: string; sender_last_name: string;
  content: string; is_internal: boolean; created_at: string;
}
interface PaginatedResponse<T> { data: T[]; total: number; }

const FILTER_TYPES = [
  { value: '', label: 'All Types' }, { value: 'general', label: 'General' }, { value: 'billing', label: 'Billing' },
  { value: 'maintenance', label: 'Maintenance' }, { value: 'lease', label: 'Lease' }, { value: 'complaint', label: 'Complaint' }, { value: 'inquiry', label: 'Inquiry' },
];
const FILTER_STATUSES = [
  { value: '', label: 'All Statuses' }, { value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_response', label: 'Awaiting Response' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
];
const FILTER_PRIORITIES = [
  { value: '', label: 'All Priorities' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
];
const FORM_TYPES = FILTER_TYPES.filter((t) => t.value !== '');
const FORM_PRIORITIES = FILTER_PRIORITIES.filter((p) => p.value !== '');

function priorityColor(p: string): 'green' | 'yellow' | 'orange' | 'red' {
  switch (p) { case 'urgent': return 'red'; case 'high': return 'orange'; case 'medium': return 'yellow'; default: return 'green'; }
}
function formatDate(d: string | null): string {
  if (!d) return '-'; return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatDateTime(d: string | null): string {
  if (!d) return '-'; return new Date(d).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SupportTickets() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [form, setForm] = useState({ subject: '', description: '', ticket_type: 'general', priority: 'medium' });

  const params: Record<string, string> = {};
  if (filterType) params.ticket_type = filterType;
  if (filterStatus) params.status = filterStatus;
  if (filterPriority) params.priority = filterPriority;

  const { data: ticketsData, loading, refetch } = useApi<PaginatedResponse<Ticket>>(() => api.get('/support-tickets', params), [filterType, filterStatus, filterPriority]);
  const { data: messages, refetch: refetchMessages } = useApi<TicketMessage[]>(
    () => selectedTicket ? api.get(`/support-tickets/${selectedTicket.id}/messages`) : Promise.resolve([]), [selectedTicket?.id]
  );

  const tickets = ticketsData?.data || [];
  const filtered = tickets.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.subject.toLowerCase().includes(q) || t.opener_first_name.toLowerCase().includes(q) || t.opener_last_name.toLowerCase().includes(q);
  });

  const handleSubmit = async () => {
    if (!form.subject) return;
    setSubmitting(true);
    try {
      await api.post('/support-tickets', { subject: form.subject, description: form.description, ticket_type: form.ticket_type, priority: form.priority });
      setShowAddModal(false); setForm({ subject: '', description: '', ticket_type: 'general', priority: 'medium' }); refetch();
    } catch { /* silent */ } finally { setSubmitting(false); }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedTicket) return;
    setSubmitting(true);
    try {
      await api.post(`/support-tickets/${selectedTicket.id}/messages`, { content: replyContent });
      setReplyContent(''); setShowReplyModal(false); refetchMessages();
    } catch { /* silent */ } finally { setSubmitting(false); }
  };

  if (loading) {
    return (<div className="space-y-6"><div className="flex items-center justify-between"><div><div className="h-7 w-48 bg-gray-200 rounded animate-pulse" /><div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" /></div><div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" /></div><div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"><div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-12 bg-gray-100 rounded" />))}</div></div></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1><p className="text-sm text-gray-500 mt-1">Manage support requests and track SLAs</p></div>
        <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 mr-2" />New Ticket</Button>
      </div>

      <Card><CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" /></div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">{FILTER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">{FILTER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">{FILTER_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
        </div>
      </CardContent></Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<LifeBuoy className="w-8 h-8 text-gray-400" />} title="No support tickets" description="All caught up! Create a new ticket if you need help." action={<Button onClick={() => setShowAddModal(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> New Ticket</Button>} />
        ) : (
          <Table><TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Opened By</TableHead><TableHead>SLA</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((ticket) => (
              <TableRow key={ticket.id} className="cursor-pointer" onClick={() => { setSelectedTicket(ticket); setShowDetailModal(true); }}>
                <TableCell className="font-medium max-w-xs truncate">{ticket.subject}</TableCell>
                <TableCell><Badge color="blue">{ticket.ticket_type.charAt(0).toUpperCase() + ticket.ticket_type.slice(1)}</Badge></TableCell>
                <TableCell><Badge color={priorityColor(ticket.priority)}>{ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}</Badge></TableCell>
                <TableCell><StatusBadge status={ticket.status} /></TableCell>
                <TableCell>{ticket.opener_first_name} {ticket.opener_last_name}</TableCell>
                <TableCell>{ticket.sla_breached ? <Badge color="red"><AlertCircle className="w-3 h-3 mr-1" />Breached</Badge> : ticket.sla_due_at ? <Badge color="green"><CheckCircle2 className="w-3 h-3 mr-1" />On Time</Badge> : <span className="text-gray-400">-</span>}</TableCell>
                <TableCell>{formatDate(ticket.created_at)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </Card>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="New Support Ticket" size="lg">
        <div className="space-y-4">
          <Input label="Subject" placeholder="Brief summary of your issue" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.ticket_type} onChange={(e) => setForm({ ...form, ticket_type: e.target.value })} options={FORM_TYPES} />
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={FORM_PRIORITIES} />
          </div>
          <Textarea label="Description" placeholder="Describe your issue in detail..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.subject}>{submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Create Ticket</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedTicket(null); }} title="Ticket Details" size="xl">
        {selectedTicket && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><p className="text-xs text-gray-500 uppercase">Subject</p><p className="text-sm font-medium">{selectedTicket.subject}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Type</p><Badge color="blue">{selectedTicket.ticket_type}</Badge></div>
              <div><p className="text-xs text-gray-500 uppercase">Priority</p><Badge color={priorityColor(selectedTicket.priority)}>{selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}</Badge></div>
              <div><p className="text-xs text-gray-500 uppercase">Status</p><StatusBadge status={selectedTicket.status} /></div>
              <div><p className="text-xs text-gray-500 uppercase">SLA</p>{selectedTicket.sla_breached ? <Badge color="red">Breached</Badge> : selectedTicket.sla_due_at ? <Badge color="green">On Time - Due {formatDateTime(selectedTicket.sla_due_at)}</Badge> : <span className="text-sm text-gray-400">No SLA</span>}</div>
              <div><p className="text-xs text-gray-500 uppercase">Created</p><p className="text-sm">{formatDateTime(selectedTicket.created_at)}</p></div>
            </div>
            {selectedTicket.description && (<div><h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4><p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedTicket.description}</p></div>)}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><MessageSquare className="w-4 h-4" />Messages</h4>
                <Button size="sm" onClick={() => setShowReplyModal(true)}><Send className="w-3.5 h-3.5 mr-1" />Reply</Button>
              </div>
              {!messages || messages.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg"><MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No messages yet</p></div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">{messages.map((msg) => (
                  <div key={msg.id} className={`rounded-lg p-3 ${msg.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-700">{msg.sender_first_name} {msg.sender_last_name}{msg.is_internal && <Badge color="yellow" className="ml-2">Internal</Badge>}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(msg.created_at)}</p>
                    </div>
                    <p className="text-sm text-gray-600">{msg.content}</p>
                  </div>
                ))}</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showReplyModal} onClose={() => setShowReplyModal(false)} title="Reply to Ticket">
        <div className="space-y-4">
          <Textarea label="Message" placeholder="Type your reply..." value={replyContent} onChange={(e) => setReplyContent(e.target.value)} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowReplyModal(false)}>Cancel</Button>
            <Button onClick={handleReply} disabled={submitting || !replyContent.trim()}>{submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Send Reply</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
