import { useState } from 'react';
import {
  Search,
  Plus,
  MapPin,
  Loader2,
  Eye,
  Landmark,
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

interface RevenueRecord {
  id: string;
  property_id: string;
  property_name: string;
  record_type: string;
  state: string;
  district: string | null;
  taluk: string | null;
  village: string | null;
  survey_number: string | null;
  subdivision: string | null;
  extent: string | null;
  extent_unit: string | null;
  classification: string | null;
  pattadar_name: string | null;
  khata_number: string | null;
  encumbrance_details: string | null;
  remarks: string | null;
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

const RECORD_TYPE_OPTIONS = [
  { value: 'patta', label: 'Patta' }, { value: 'chitta', label: 'Chitta' }, { value: 'adangal', label: 'Adangal' },
  { value: 'fmb', label: 'Fmb' }, { value: 'encumbrance_certificate', label: 'Encumbrance Certificate' },
  { value: 'khata', label: 'Khata' }, { value: 'mutation', label: 'Mutation' }, { value: 'rr', label: 'Rr' },
  { value: 'pahani', label: 'Pahani' }, { value: 'other', label: 'Other' },
];
const RECORD_TYPE_FILTER = [{ value: '', label: 'All Record Types' }, ...RECORD_TYPE_OPTIONS];
const STATE_OPTIONS = [
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' }, { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' }, { value: 'Telangana', label: 'Telangana' },
  { value: 'Kerala', label: 'Kerala' }, { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Gujarat', label: 'Gujarat' }, { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' }, { value: 'Other', label: 'Other' },
];
const STATE_FILTER = [{ value: '', label: 'All States' }, ...STATE_OPTIONS];
const EXTENT_UNIT_OPTIONS = [
  { value: 'acres', label: 'Acres' }, { value: 'hectares', label: 'Hectares' },
  { value: 'cents', label: 'Cents' }, { value: 'guntas', label: 'Guntas' },
  { value: 'sq_ft', label: 'Sq. Ft.' }, { value: 'sq_m', label: 'Sq. M.' },
];

function recordTypeColor(type: string): 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'yellow' | 'red' | 'gray' {
  const map: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'yellow' | 'red' | 'gray'> = {
    patta: 'blue',
    chitta: 'green',
    adangal: 'purple',
    fmb: 'orange',
    encumbrance_certificate: 'red',
    khata: 'indigo',
    mutation: 'yellow',
    rr: 'blue',
    pahani: 'green',
    other: 'gray',
  };
  return map[type] || 'gray';
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- Component ----

export default function RevenueRecords() {
  const [search, setSearch] = useState('');
  const [filterRecordType, setFilterRecordType] = useState('');
  const [filterState, setFilterState] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RevenueRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    property_id: '',
    record_type: 'patta',
    state: 'Tamil Nadu',
    district: '',
    taluk: '',
    village: '',
    survey_number: '',
    subdivision: '',
    extent: '',
    extent_unit: 'acres',
    classification: '',
    pattadar_name: '',
    khata_number: '',
    encumbrance_details: '',
    remarks: '',
  });

  const params: Record<string, string> = {};
  if (filterRecordType) params.record_type = filterRecordType;
  if (filterState) params.state = filterState;

  const { data: recordsData, loading, refetch } = useApi<PaginatedResponse<RevenueRecord>>(
    () => api.get('/revenue-records', params),
    [filterRecordType, filterState]
  );

  const { data: properties } = useApi<PaginatedResponse<Property>>(
    () => api.get('/properties', { limit: '200' }),
    []
  );

  const records = recordsData?.data || [];
  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.property_name.toLowerCase().includes(q) ||
      (r.survey_number && r.survey_number.toLowerCase().includes(q)) ||
      (r.village && r.village.toLowerCase().includes(q)) ||
      (r.pattadar_name && r.pattadar_name.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async () => {
    if (!form.property_id || !form.record_type) return;
    setSubmitting(true);
    try {
      await api.post('/revenue-records', {
        property_id: form.property_id,
        record_type: form.record_type,
        state: form.state,
        district: form.district || undefined,
        taluk: form.taluk || undefined,
        village: form.village || undefined,
        survey_number: form.survey_number || undefined,
        subdivision: form.subdivision || undefined,
        extent: form.extent || undefined,
        extent_unit: form.extent_unit || undefined,
        classification: form.classification || undefined,
        pattadar_name: form.pattadar_name || undefined,
        khata_number: form.khata_number || undefined,
        encumbrance_details: form.encumbrance_details || undefined,
        remarks: form.remarks || undefined,
      });
      setShowAddModal(false);
      setForm({
        property_id: '', record_type: 'patta', state: 'Tamil Nadu', district: '', taluk: '', village: '',
        survey_number: '', subdivision: '', extent: '', extent_unit: 'acres', classification: '',
        pattadar_name: '', khata_number: '', encumbrance_details: '', remarks: '',
      });
      refetch();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  // State-specific field labels
  const stateFieldLabels: Record<string, { surveyLabel: string; ownerLabel: string }> = {
    'Tamil Nadu': { surveyLabel: 'Survey Number', ownerLabel: 'Pattadar Name' },
    'Karnataka': { surveyLabel: 'Survey Number', ownerLabel: 'Khata Holder' },
    'Andhra Pradesh': { surveyLabel: 'Survey Number', ownerLabel: 'Pattadar Name' },
    'Telangana': { surveyLabel: 'Survey Number', ownerLabel: 'Pattadar Name' },
    'Kerala': { surveyLabel: 'Survey Number', ownerLabel: 'Owner Name' },
    'Maharashtra': { surveyLabel: 'Gat/Survey Number', ownerLabel: 'Holder Name' },
  };
  const currentLabels = stateFieldLabels[form.state] || { surveyLabel: 'Survey Number', ownerLabel: 'Owner Name' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Records</h1>
          <p className="text-sm text-gray-500 mt-1">Land revenue records and property documentation</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Record
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
                placeholder="Search by survey number, village, owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select value={filterRecordType} onChange={(e) => setFilterRecordType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">{RECORD_TYPE_FILTER.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
            <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">{STATE_FILTER.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
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
              icon={<Landmark className="w-8 h-8 text-gray-400" />}
              title="No revenue records"
              description="Add your first land revenue record."
              action={
                <Button onClick={() => setShowAddModal(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Record
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Record Type</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Survey No.</TableHead>
                  <TableHead>Extent</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.property_name}</TableCell>
                    <TableCell>
                      <Badge color={recordTypeColor(record.record_type)}>
                        {record.record_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {record.state}
                      </div>
                    </TableCell>
                    <TableCell>{record.survey_number || '-'}</TableCell>
                    <TableCell>
                      {record.extent
                        ? `${record.extent} ${record.extent_unit || ''}`
                        : '-'}
                    </TableCell>
                    <TableCell>{record.classification || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedRecord(record); setShowDetailModal(true); }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Record Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Revenue Record" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Property"
              value={form.property_id}
              onChange={(e) => setForm({ ...form, property_id: e.target.value })}
              options={(properties?.data || []).map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select a property"
            />
            <Select
              label="Record Type"
              value={form.record_type}
              onChange={(e) => setForm({ ...form, record_type: e.target.value })}
              options={RECORD_TYPE_OPTIONS}
            />
          </div>
          <Select
            label="State"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            options={STATE_OPTIONS}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="District"
              placeholder="District name"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
            />
            <Input
              label="Taluk / Mandal"
              placeholder="Taluk name"
              value={form.taluk}
              onChange={(e) => setForm({ ...form, taluk: e.target.value })}
            />
            <Input
              label="Village"
              placeholder="Village name"
              value={form.village}
              onChange={(e) => setForm({ ...form, village: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={currentLabels.surveyLabel}
              placeholder="e.g., 123/4"
              value={form.survey_number}
              onChange={(e) => setForm({ ...form, survey_number: e.target.value })}
            />
            <Input
              label="Subdivision"
              placeholder="Subdivision"
              value={form.subdivision}
              onChange={(e) => setForm({ ...form, subdivision: e.target.value })}
            />
            <Input
              label="Khata Number"
              placeholder="Khata number"
              value={form.khata_number}
              onChange={(e) => setForm({ ...form, khata_number: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Extent"
              placeholder="e.g., 2.5"
              value={form.extent}
              onChange={(e) => setForm({ ...form, extent: e.target.value })}
            />
            <Select
              label="Extent Unit"
              value={form.extent_unit}
              onChange={(e) => setForm({ ...form, extent_unit: e.target.value })}
              options={EXTENT_UNIT_OPTIONS}
            />
            <Input
              label="Classification"
              placeholder="e.g., Wet, Dry, Garden"
              value={form.classification}
              onChange={(e) => setForm({ ...form, classification: e.target.value })}
            />
          </div>
          <Input
            label={currentLabels.ownerLabel}
            placeholder="Name as in records"
            value={form.pattadar_name}
            onChange={(e) => setForm({ ...form, pattadar_name: e.target.value })}
          />
          <Textarea
            label="Encumbrance Details"
            placeholder="Details of any encumbrances..."
            value={form.encumbrance_details}
            onChange={(e) => setForm({ ...form, encumbrance_details: e.target.value })}
          />
          <Textarea
            label="Remarks"
            placeholder="Additional notes..."
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.property_id}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Record
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedRecord(null); }}
        title="Revenue Record Details"
        size="xl"
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Property</p>
                <p className="text-sm font-medium">{selectedRecord.property_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Record Type</p>
                <Badge color={recordTypeColor(selectedRecord.record_type)}>
                  {selectedRecord.record_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">State</p>
                <p className="text-sm">{selectedRecord.state}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">District</p>
                <p className="text-sm">{selectedRecord.district || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Taluk / Mandal</p>
                <p className="text-sm">{selectedRecord.taluk || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Village</p>
                <p className="text-sm">{selectedRecord.village || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Survey Number</p>
                <p className="text-sm font-medium">{selectedRecord.survey_number || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Subdivision</p>
                <p className="text-sm">{selectedRecord.subdivision || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Extent</p>
                <p className="text-sm">{selectedRecord.extent ? `${selectedRecord.extent} ${selectedRecord.extent_unit || ''}` : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Classification</p>
                <p className="text-sm">{selectedRecord.classification || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Owner / Pattadar</p>
                <p className="text-sm font-medium">{selectedRecord.pattadar_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Khata Number</p>
                <p className="text-sm">{selectedRecord.khata_number || '-'}</p>
              </div>
            </div>
            {selectedRecord.encumbrance_details && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Encumbrance Details</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedRecord.encumbrance_details}</p>
              </div>
            )}
            {selectedRecord.remarks && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Remarks</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedRecord.remarks}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
