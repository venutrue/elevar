import { useState } from 'react';
import {
  Search,
  Plus,
  Scale,
  Loader2,
  Calendar,
  Ban,
  Eye,
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

interface PowerOfAttorney {
  id: string;
  property_id: string;
  property_name: string;
  owner_name: string;
  attorney_holder_name: string;
  scope: string;
  poa_type: string;
  status: string;
  valid_from: string;
  valid_until: string | null;
  notarized: boolean;
  registration_number: string | null;
  revocation_reason: string | null;
  revoked_at: string | null;
  created_at: string;
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

const POA_STATUSES = ['draft', 'active', 'expired', 'revoked'];
const POA_TYPES = ['general', 'special', 'limited', 'durable'];
const POA_SCOPES = ['full_management', 'sale', 'lease', 'legal_proceedings', 'banking', 'tax_matters', 'custom'];

function statusBadgeColor(status: string): 'green' | 'yellow' | 'red' | 'gray' {
  switch (status) {
    case 'active': return 'green';
    case 'draft': return 'yellow';
    case 'revoked': return 'red';
    case 'expired': return 'gray';
    default: return 'gray';
  }
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- Component ----

export default function PowersOfAttorney() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPoa, setSelectedPoa] = useState<PowerOfAttorney | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    property_id: '',
    owner_name: '',
    attorney_holder_name: '',
    scope: 'full_management',
    poa_type: 'general',
    valid_from: '',
    valid_until: '',
    notarized: false,
    registration_number: '',
  });

  const params: Record<string, string> = {};
  if (filterStatus) params.status = filterStatus;

  const { data: poaData, loading, refetch } = useApi<PaginatedResponse<PowerOfAttorney>>(
    () => api.get('/poa', params),
    [filterStatus]
  );

  const { data: properties } = useApi<PaginatedResponse<Property>>(
    () => api.get('/properties', { limit: '200' }),
    []
  );

  const poas = poaData?.data || [];
  const filtered = poas.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.property_name.toLowerCase().includes(q) ||
      p.owner_name.toLowerCase().includes(q) ||
      p.attorney_holder_name.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!form.property_id || !form.owner_name || !form.attorney_holder_name || !form.valid_from) return;
    setSubmitting(true);
    try {
      await api.post('/poa', {
        property_id: form.property_id,
        owner_name: form.owner_name,
        attorney_holder_name: form.attorney_holder_name,
        scope: form.scope,
        poa_type: form.poa_type,
        valid_from: form.valid_from,
        valid_until: form.valid_until || undefined,
        notarized: form.notarized,
        registration_number: form.registration_number || undefined,
      });
      setShowAddModal(false);
      setForm({
        property_id: '', owner_name: '', attorney_holder_name: '', scope: 'full_management',
        poa_type: 'general', valid_from: '', valid_until: '', notarized: false, registration_number: '',
      });
      refetch();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedPoa || !revokeReason.trim()) return;
    setSubmitting(true);
    try {
      await api.put(`/poa/${selectedPoa.id}`, {
        status: 'revoked',
        revocation_reason: revokeReason,
      });
      setShowRevokeModal(false);
      setRevokeReason('');
      setSelectedPoa(null);
      refetch();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Powers of Attorney</h1>
          <p className="text-sm text-gray-500 mt-1">Manage power of attorney documents for properties</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add PoA
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
                placeholder="Search by property, owner, or attorney holder..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {POA_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
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
              icon={<Scale className="w-8 h-8 text-gray-400" />}
              title="No Powers of Attorney"
              description="Add a new power of attorney document."
              action={
                <Button onClick={() => setShowAddModal(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add PoA
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Attorney Holder</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validity Period</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((poa) => (
                  <TableRow key={poa.id}>
                    <TableCell className="font-medium">{poa.property_name}</TableCell>
                    <TableCell>{poa.owner_name}</TableCell>
                    <TableCell>{poa.attorney_holder_name}</TableCell>
                    <TableCell>
                      <Badge color="purple">
                        {poa.scope.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={statusBadgeColor(poa.status)}>
                        {poa.status.charAt(0).toUpperCase() + poa.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(poa.valid_from)}
                        {poa.valid_until && (
                          <span className="text-gray-400"> - {formatDate(poa.valid_until)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedPoa(poa); setShowDetailModal(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {poa.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedPoa(poa); setShowRevokeModal(true); }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add PoA Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Power of Attorney" size="lg">
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Owner Name"
              placeholder="Property owner"
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            />
            <Input
              label="Attorney Holder Name"
              placeholder="Person receiving PoA"
              value={form.attorney_holder_name}
              onChange={(e) => setForm({ ...form, attorney_holder_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="PoA Type"
              value={form.poa_type}
              onChange={(e) => setForm({ ...form, poa_type: e.target.value })}
            >
              {POA_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
            <Select
              label="Scope"
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            >
              {POA_SCOPES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valid From"
              type="date"
              value={form.valid_from}
              onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
            />
            <Input
              label="Valid Until (optional)"
              type="date"
              value={form.valid_until}
              onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
            />
          </div>
          <Input
            label="Registration Number (optional)"
            placeholder="Document registration number"
            value={form.registration_number}
            onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notarized"
              checked={form.notarized}
              onChange={(e) => setForm({ ...form, notarized: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="notarized" className="text-sm text-gray-700">
              Document has been notarized
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.property_id || !form.owner_name || !form.attorney_holder_name || !form.valid_from}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create PoA
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke PoA Modal */}
      <Modal open={showRevokeModal} onClose={() => { setShowRevokeModal(false); setRevokeReason(''); }} title="Revoke Power of Attorney">
        <div className="space-y-4">
          {selectedPoa && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800">
                You are about to revoke the Power of Attorney for:
              </p>
              <p className="text-sm text-red-600 mt-1">
                {selectedPoa.property_name} - from {selectedPoa.owner_name} to {selectedPoa.attorney_holder_name}
              </p>
            </div>
          )}
          <Textarea
            label="Reason for Revocation"
            placeholder="Provide a reason for revoking this PoA..."
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowRevokeModal(false); setRevokeReason(''); }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRevoke} disabled={submitting || !revokeReason.trim()}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
              Revoke PoA
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedPoa(null); }}
        title="Power of Attorney Details"
        size="lg"
      >
        {selectedPoa && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Property</p>
                <p className="text-sm font-medium">{selectedPoa.property_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Owner</p>
                <p className="text-sm font-medium">{selectedPoa.owner_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Attorney Holder</p>
                <p className="text-sm font-medium">{selectedPoa.attorney_holder_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Type</p>
                <Badge color="indigo">{selectedPoa.poa_type}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Scope</p>
                <Badge color="purple">
                  {selectedPoa.scope.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <Badge color={statusBadgeColor(selectedPoa.status)}>
                  {selectedPoa.status.charAt(0).toUpperCase() + selectedPoa.status.slice(1)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Valid From</p>
                <p className="text-sm">{formatDate(selectedPoa.valid_from)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Valid Until</p>
                <p className="text-sm">{formatDate(selectedPoa.valid_until)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Notarized</p>
                <p className="text-sm">{selectedPoa.notarized ? 'Yes' : 'No'}</p>
              </div>
              {selectedPoa.registration_number && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Registration No.</p>
                  <p className="text-sm">{selectedPoa.registration_number}</p>
                </div>
              )}
            </div>
            {selectedPoa.revocation_reason && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-2">Revocation Reason</h4>
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{selectedPoa.revocation_reason}</p>
                {selectedPoa.revoked_at && (
                  <p className="text-xs text-red-400 mt-1">Revoked on {formatDate(selectedPoa.revoked_at)}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
