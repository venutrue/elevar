import { useState } from 'react';
import {
  Search,
  Plus,
  ClipboardCheck,
  AlertTriangle,
  Eye,
  Image,
  Calendar,
  Loader2,
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

interface Inspection {
  id: string;
  property_id: string;
  property_name: string;
  inspection_type: string;
  status: string;
  scheduled_date: string;
  completed_date: string | null;
  inspector_first_name: string | null;
  inspector_last_name: string | null;
  inspector_user_id: string | null;
  notes: string | null;
  findings: string | null;
  rating: number | null;
  risk_level?: string;
  created_at: string;
}

interface InspectionMedia {
  id: string;
  inspection_id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  room: string | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

interface Property {
  id: string;
  name: string;
}

// ---- Helpers ----

const INSPECTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'routine', label: 'Routine' },
  { value: 'move_in', label: 'Move In' },
  { value: 'move_out', label: 'Move Out' },
  { value: 'safety', label: 'Safety' },
  { value: 'structural', label: 'Structural' },
  { value: 'pest', label: 'Pest' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
];

const INSPECTION_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FORM_TYPES = INSPECTION_TYPES.filter((t) => t.value !== '');

type RiskColor = 'green' | 'yellow' | 'orange' | 'red';

function riskBadgeColor(level: string): RiskColor {
  switch (level) {
    case 'critical': return 'red';
    case 'high': return 'orange';
    case 'medium': return 'yellow';
    case 'low': return 'green';
    default: return 'green';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---- Component ----

export default function Inspections() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    property_id: '',
    inspection_type: 'routine',
    scheduled_date: '',
    inspector_user_id: '',
    notes: '',
  });

  const params: Record<string, string> = {};
  if (filterType) params.type = filterType;
  if (filterStatus) params.status = filterStatus;

  const { data: inspectionsData, loading, refetch } = useApi<PaginatedResponse<Inspection>>(
    () => api.get('/inspections', params),
    [filterType, filterStatus]
  );

  const { data: properties } = useApi<PaginatedResponse<Property>>(
    () => api.get('/properties', { limit: '200' }),
    []
  );

  const { data: mediaList } = useApi<InspectionMedia[]>(
    () =>
      selectedInspection
        ? api.get(`/inspections/${selectedInspection.id}/media`)
        : Promise.resolve([]),
    [selectedInspection?.id]
  );

  const inspections = inspectionsData?.data || [];
  const filteredInspections = inspections.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.property_name.toLowerCase().includes(q) ||
      i.inspection_type.toLowerCase().includes(q) ||
      (i.inspector_first_name && i.inspector_first_name.toLowerCase().includes(q)) ||
      (i.inspector_last_name && i.inspector_last_name.toLowerCase().includes(q))
    );
  });

  const propertyOptions = (properties?.data || []).map((p) => ({ value: p.id, label: p.name }));

  const handleSubmit = async () => {
    if (!form.property_id || !form.inspection_type || !form.scheduled_date) return;
    setSubmitting(true);
    try {
      await api.post('/inspections', {
        property_id: form.property_id,
        inspection_type: form.inspection_type,
        scheduled_date: form.scheduled_date,
        inspector_user_id: form.inspector_user_id || undefined,
        notes: form.notes || undefined,
      });
      setShowAddModal(false);
      setForm({ property_id: '', inspection_type: 'routine', scheduled_date: '', inspector_user_id: '', notes: '' });
      refetch();
    } catch {
      // handled by api client
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
          <p className="text-sm text-gray-500 mt-1">Manage property inspections and assessments</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Inspection
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
                placeholder="Search inspections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              {INSPECTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              {INSPECTION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {filteredInspections.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="w-8 h-8 text-gray-400" />}
            title="No inspections found"
            description="Create your first inspection or adjust your filters."
            action={
              <Button onClick={() => setShowAddModal(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Inspection
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInspections.map((inspection) => {
                const risk = inspection.risk_level || 'low';
                return (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">{inspection.property_name}</TableCell>
                    <TableCell>
                      {inspection.inspector_first_name
                        ? `${inspection.inspector_first_name} ${inspection.inspector_last_name || ''}`
                        : <span className="text-gray-400">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      <Badge color="indigo">
                        {inspection.inspection_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inspection.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(inspection.scheduled_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color={riskBadgeColor(risk)}>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {risk.charAt(0).toUpperCase() + risk.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openDetail(inspection)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Inspection Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Inspection" size="lg">
        <div className="space-y-4">
          <Select
            label="Property"
            value={form.property_id}
            onChange={(e) => setForm({ ...form, property_id: e.target.value })}
            options={propertyOptions}
            placeholder="Select a property"
          />
          <Select
            label="Inspection Type"
            value={form.inspection_type}
            onChange={(e) => setForm({ ...form, inspection_type: e.target.value })}
            options={FORM_TYPES}
          />
          <Input
            label="Scheduled Date"
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
          />
          <Input
            label="Inspector User ID"
            placeholder="Enter inspector user ID (optional)"
            value={form.inspector_user_id}
            onChange={(e) => setForm({ ...form, inspector_user_id: e.target.value })}
          />
          <Textarea
            label="Notes"
            placeholder="Additional notes..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.property_id || !form.scheduled_date}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Inspection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inspection Detail Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedInspection(null); }}
        title="Inspection Details"
        size="xl"
      >
        {selectedInspection && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Property</p>
                <p className="text-sm font-medium">{selectedInspection.property_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Inspector</p>
                <p className="text-sm font-medium">
                  {selectedInspection.inspector_first_name
                    ? `${selectedInspection.inspector_first_name} ${selectedInspection.inspector_last_name || ''}`
                    : 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Type</p>
                <Badge color="indigo">
                  {selectedInspection.inspection_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <StatusBadge status={selectedInspection.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Scheduled</p>
                <p className="text-sm">{formatDate(selectedInspection.scheduled_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Completed</p>
                <p className="text-sm">{formatDate(selectedInspection.completed_date)}</p>
              </div>
              {selectedInspection.rating != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Rating</p>
                  <p className="text-sm font-medium">{selectedInspection.rating}/10</p>
                </div>
              )}
            </div>

            {selectedInspection.findings && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Findings</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedInspection.findings}</p>
              </div>
            )}

            {selectedInspection.notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedInspection.notes}</p>
              </div>
            )}

            {/* Media Gallery */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Media Gallery
              </h4>
              {!mediaList || mediaList.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No media attached to this inspection</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {mediaList.map((media) => (
                    <div key={media.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                      {media.file_type === 'image' ? (
                        <img
                          src={media.file_url}
                          alt={media.caption || 'Inspection media'}
                          className="w-full h-32 object-cover"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      {media.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                          <p className="text-xs text-white truncate">{media.caption}</p>
                        </div>
                      )}
                      {media.room && (
                        <div className="absolute top-2 left-2">
                          <Badge color="blue">{media.room}</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
