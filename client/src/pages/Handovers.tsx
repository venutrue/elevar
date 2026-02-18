import { useState } from 'react';
import {
  Search,
  Plus,
  ArrowRightLeft,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  XCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import useApi from '@/hooks/useApi';
import api from '@/api/client';

// ---- Types ----

interface Handover {
  id: string;
  property_id: string;
  property_name: string;
  handover_type: string;
  status: string;
  initiated_date: string;
  target_date: string | null;
  completed_date: string | null;
  notes: string | null;
  items_completed: number;
  items_total: number;
  created_at: string;
}

interface HandoverItem {
  id: string;
  handover_id: string;
  title: string;
  description: string | null;
  status: string;
  completed_date: string | null;
  assigned_to: string | null;
  order_index: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface Property {
  id: string;
  name: string;
}

// ---- Constants ----

const HANDOVER_TYPES = ['property_management', 'tenant_move_in', 'tenant_move_out', 'ownership_transfer', 'contractor', 'other'];
const HANDOVER_STATUSES = ['initiated', 'in_progress', 'pending_review', 'completed', 'cancelled'];

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- Component ----

export default function Handovers() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    property_id: '',
    handover_type: 'property_management',
    initiated_date: new Date().toISOString().split('T')[0],
    target_date: '',
    notes: '',
  });

  const params: Record<string, string> = {};
  if (filterStatus) params.status = filterStatus;

  const { data: handoversData, loading, refetch } = useApi<PaginatedResponse<Handover>>(
    () => api.get('/handovers', params),
    [filterStatus]
  );

  const { data: properties } = useApi<PaginatedResponse<Property>>(
    () => api.get('/properties', { limit: '200' }),
    []
  );

  const { data: items, refetch: refetchItems } = useApi<HandoverItem[]>(
    () =>
      expandedRow
        ? api.get(`/handovers/${expandedRow}/items`)
        : Promise.resolve([]),
    [expandedRow]
  );

  const handovers = handoversData?.data || [];
  const filtered = handovers.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.property_name.toLowerCase().includes(q) ||
      h.handover_type.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!form.property_id || !form.handover_type) return;
    setSubmitting(true);
    try {
      await api.post('/handovers', {
        property_id: form.property_id,
        handover_type: form.handover_type,
        initiated_date: form.initiated_date,
        target_date: form.target_date || undefined,
        notes: form.notes || undefined,
      });
      setShowAddModal(false);
      setForm({ property_id: '', handover_type: 'property_management', initiated_date: new Date().toISOString().split('T')[0], target_date: '', notes: '' });
      refetch();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const toggleItem = async (item: HandoverItem) => {
    try {
      const newStatus = item.status === 'completed' ? 'pending' : 'completed';
      await api.put(`/handovers/items/${item.id}`, {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null,
      });
      refetchItems();
      refetch();
    } catch {
      // silent
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Handovers</h1>
          <p className="text-sm text-gray-500 mt-1">Track property and service handover processes</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Handover
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search handovers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {HANDOVER_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ArrowRightLeft className="w-8 h-8 text-gray-400" />}
              title="No handovers found"
              description="Initiate a new handover process."
              action={
                <Button onClick={() => setShowAddModal(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Handover
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initiated</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((handover) => {
                  const isExpanded = expandedRow === handover.id;
                  const progressPct = handover.items_total > 0
                    ? Math.round((handover.items_completed / handover.items_total) * 100)
                    : 0;

                  return (
                    <>
                      <TableRow key={handover.id} className="cursor-pointer" onClick={() => toggleRow(handover.id)}>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{handover.property_name}</TableCell>
                        <TableCell>
                          <Badge color="indigo">
                            {handover.handover_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={handover.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {formatDate(handover.initiated_date)}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(handover.target_date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  progressPct === 100 ? 'bg-green-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-16 text-right">
                              {handover.items_completed}/{handover.items_total}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <tr key={`${handover.id}-expanded`}>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            {handover.notes && (
                              <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes</h4>
                                <p className="text-sm text-gray-600">{handover.notes}</p>
                              </div>
                            )}
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Checklist Items</h4>
                            {!items || items.length === 0 ? (
                              <p className="text-sm text-gray-400">No checklist items defined yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {items
                                  .sort((a, b) => a.order_index - b.order_index)
                                  .map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-gray-200"
                                    >
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleItem(item); }}
                                        className="flex-shrink-0"
                                      >
                                        {item.status === 'completed' ? (
                                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : item.status === 'in_progress' ? (
                                          <Clock className="w-5 h-5 text-blue-500" />
                                        ) : item.status === 'skipped' ? (
                                          <XCircle className="w-5 h-5 text-gray-400" />
                                        ) : (
                                          <Circle className="w-5 h-5 text-gray-300" />
                                        )}
                                      </button>
                                      <div className="flex-1">
                                        <p className={`text-sm ${item.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                          {item.title}
                                        </p>
                                        {item.description && (
                                          <p className="text-xs text-gray-400">{item.description}</p>
                                        )}
                                      </div>
                                      {item.assigned_to && (
                                        <span className="text-xs text-gray-400">Assigned: {item.assigned_to}</span>
                                      )}
                                      <StatusBadge status={item.status} />
                                    </div>
                                  ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Handover Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Service Handover" size="lg">
        <div className="space-y-4">
          <Select
            label="Property"
            value={form.property_id}
            onChange={(e) => setForm({ ...form, property_id: e.target.value })}
          >
            <option value="">Select a property</option>
            {(properties?.data || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Select
            label="Handover Type"
            value={form.handover_type}
            onChange={(e) => setForm({ ...form, handover_type: e.target.value })}
          >
            {HANDOVER_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Initiated Date"
              type="date"
              value={form.initiated_date}
              onChange={(e) => setForm({ ...form, initiated_date: e.target.value })}
            />
            <Input
              label="Target Date"
              type="date"
              value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })}
            />
          </div>
          <Textarea
            label="Notes"
            placeholder="Handover notes..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.property_id}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Handover
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
