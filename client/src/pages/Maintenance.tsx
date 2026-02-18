import { useState } from 'react';
import {
  Search,
  Plus,
  Wrench,
  Loader2,
  IndianRupee,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import useApi from '@/hooks/useApi';
import api from '@/api/client';

interface MaintenanceRequest {
  id: string;
  property_id: string;
  property_name: string;
  request_type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface PaginatedResponse<T> { data: T[]; total: number; }
interface Property { id: string; name: string; }

const REQUEST_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'structural', label: 'Structural' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'painting', label: 'Painting' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'general', label: 'General' },
];
const PRIORITIES = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];
const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FORM_TYPES = REQUEST_TYPES.filter((t) => t.value !== '');
const FORM_PRIORITIES = PRIORITIES.filter((p) => p.value !== '');

function priorityColor(p: string): 'green' | 'yellow' | 'orange' | 'red' {
  switch (p) { case 'urgent': return 'red'; case 'high': return 'orange'; case 'medium': return 'yellow'; default: return 'green'; }
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Maintenance() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ property_id: '', request_type: 'general', priority: 'medium', title: '', description: '', estimated_cost: '' });

  const params: Record<string, string> = {};
  if (filterStatus) params.status = filterStatus;
  if (filterPriority) params.priority = filterPriority;
  if (filterType) params.request_type = filterType;

  const { data: maintenanceData, loading, refetch } = useApi<PaginatedResponse<MaintenanceRequest>>(
    () => api.get('/maintenance', params), [filterStatus, filterPriority, filterType]
  );
  const { data: properties } = useApi<PaginatedResponse<Property>>(() => api.get('/properties', { limit: '200' }), []);

  const requests = maintenanceData?.data || [];
  const filtered = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.property_name.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  });

  const propertyOptions = (properties?.data || []).map((p) => ({ value: p.id, label: p.name }));

  const handleSubmit = async () => {
    if (!form.property_id || !form.title) return;
    setSubmitting(true);
    try {
      await api.post('/maintenance', {
        property_id: form.property_id, request_type: form.request_type, priority: form.priority,
        title: form.title, description: form.description || undefined,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : undefined,
      });
      setShowAddModal(false);
      setForm({ property_id: '', request_type: 'general', priority: 'medium', title: '', description: '', estimated_cost: '' });
      refetch();
    } catch { /* silent */ } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><div className="h-7 w-40 bg-gray-200 rounded animate-pulse" /><div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" /></div>
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"><div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-12 bg-gray-100 rounded" />))}</div></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Maintenance</h1><p className="text-sm text-gray-500 mt-1">Track and manage maintenance requests</p></div>
        <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 mr-2" />New Request</Button>
      </div>

      <Card><CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search requests..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
            {REQUEST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </CardContent></Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<Wrench className="w-8 h-8 text-gray-400" />} title="No maintenance requests" description="Create a new maintenance request or adjust your filters." action={<Button onClick={() => setShowAddModal(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> New Request</Button>} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Property</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Est. Cost</TableHead><TableHead>Actual Cost</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.property_name}</TableCell>
                  <TableCell>{req.title}</TableCell>
                  <TableCell><Badge color="purple">{req.request_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Badge></TableCell>
                  <TableCell><Badge color={priorityColor(req.priority)}>{req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}</Badge></TableCell>
                  <TableCell><StatusBadge status={req.status} /></TableCell>
                  <TableCell className="text-gray-600">{formatCurrency(req.estimated_cost)}</TableCell>
                  <TableCell className="text-gray-600">{formatCurrency(req.actual_cost)}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}><Eye className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="New Maintenance Request" size="lg">
        <div className="space-y-4">
          <Select label="Property" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} options={propertyOptions} placeholder="Select a property" />
          <Input label="Title" placeholder="Brief description of the issue" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Request Type" value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })} options={FORM_TYPES} />
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={FORM_PRIORITIES} />
          </div>
          <Textarea label="Description" placeholder="Detailed description of the maintenance issue..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Estimated Cost (INR)" type="number" placeholder="0" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.property_id || !form.title}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Create Request
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedRequest(null); }} title="Maintenance Request Details" size="lg">
        {selectedRequest && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><p className="text-xs text-gray-500 uppercase">Property</p><p className="text-sm font-medium">{selectedRequest.property_name}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Type</p><Badge color="purple">{selectedRequest.request_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Badge></div>
              <div><p className="text-xs text-gray-500 uppercase">Priority</p><Badge color={priorityColor(selectedRequest.priority)}>{selectedRequest.priority.charAt(0).toUpperCase() + selectedRequest.priority.slice(1)}</Badge></div>
              <div><p className="text-xs text-gray-500 uppercase">Status</p><StatusBadge status={selectedRequest.status} /></div>
              <div><p className="text-xs text-gray-500 uppercase">Created</p><p className="text-sm">{formatDate(selectedRequest.created_at)}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Resolved</p><p className="text-sm">{formatDate(selectedRequest.resolved_at)}</p></div>
            </div>
            {selectedRequest.description && (<div><h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4><p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedRequest.description}</p></div>)}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><IndianRupee className="w-4 h-4" />Cost Comparison</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center"><p className="text-xs text-blue-600 uppercase font-medium">Estimated Cost</p><p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(selectedRequest.estimated_cost)}</p></div>
                <div className="bg-green-50 rounded-lg p-4 text-center"><p className="text-xs text-green-600 uppercase font-medium">Actual Cost</p><p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(selectedRequest.actual_cost)}</p></div>
              </div>
              {selectedRequest.estimated_cost != null && selectedRequest.actual_cost != null && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Budget utilisation</span><span>{Math.round((selectedRequest.actual_cost / selectedRequest.estimated_cost) * 100)}%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${selectedRequest.actual_cost > selectedRequest.estimated_cost ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, Math.round((selectedRequest.actual_cost / selectedRequest.estimated_cost) * 100))}%` }} /></div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
