import { useState, useMemo, type FormEvent } from 'react';
import {
  Plus,
  Search,
  Filter,
  Scale,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import useApi from '@/hooks/useApi';
import api from '@/api/client';

// ---- Types ----

interface CaseUpdate {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  type: string;
}

interface LegalCase {
  id: string;
  caseNumber: string;
  title: string;
  caseType: string;
  status: string;
  priority: string;
  property: {
    id: string;
    title: string;
  };
  assignedTo?: string;
  description?: string;
  filingDate: string;
  updates: CaseUpdate[];
}

interface LegalCasesResponse {
  data: LegalCase[];
  total: number;
}

interface CaseFormData {
  title: string;
  caseType: string;
  priority: string;
  propertyId: string;
  assignedTo: string;
  description: string;
}

interface UpdateFormData {
  content: string;
  type: string;
}

interface PropertyOption {
  id: string;
  title: string;
}

const CASE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'dispute', label: 'Dispute' },
  { value: 'eviction', label: 'Eviction' },
  { value: 'breach', label: 'Breach of Contract' },
  { value: 'rent_claim', label: 'Rent Claim' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'title_dispute', label: 'Title Dispute' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'other', label: 'Other' },
];

const CASE_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
  { value: 'resolved', label: 'Resolved' },
];

const PRIORITIES = [
  { value: '', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const UPDATE_TYPES = [
  { value: 'note', label: 'Note' },
  { value: 'hearing', label: 'Hearing Update' },
  { value: 'filing', label: 'Filing Update' },
  { value: 'decision', label: 'Decision' },
  { value: 'settlement', label: 'Settlement' },
];

const PRIORITY_COLORS: Record<string, 'red' | 'orange' | 'yellow' | 'green' | 'gray'> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'green',
};

const emptyCaseForm: CaseFormData = {
  title: '',
  caseType: 'dispute',
  priority: 'medium',
  propertyId: '',
  assignedTo: '',
  description: '',
};

const emptyUpdateForm: UpdateFormData = {
  content: '',
  type: 'note',
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

// ---- Component ----

export default function LegalCases() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseForm, setCaseForm] = useState<CaseFormData>(emptyCaseForm);
  const [updateForm, setUpdateForm] = useState<UpdateFormData>(emptyUpdateForm);
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, refetch } = useApi<LegalCasesResponse>(
    () => api.get('/legal-cases'),
    []
  );

  const { data: propertiesData } = useApi<{ data: PropertyOption[] }>(
    () => api.get('/properties', { limit: '100' }),
    []
  );

  const cases = data?.data ?? [];
  const propertyOptions = propertiesData?.data ?? [];

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.property.title.toLowerCase().includes(search.toLowerCase());
      const matchesType = !typeFilter || c.caseType === typeFilter;
      const matchesStatus = !statusFilter || c.status === statusFilter;
      const matchesPriority = !priorityFilter || c.priority === priorityFilter;
      return matchesSearch && matchesType && matchesStatus && matchesPriority;
    });
  }, [cases, search, typeFilter, statusFilter, priorityFilter]);

  const handleCaseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/legal-cases', caseForm);
      setShowCaseModal(false);
      setCaseForm(emptyCaseForm);
      refetch();
    } catch {
      // handled by api client
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;
    setSubmitting(true);
    try {
      await api.post(`/legal-cases/${selectedCaseId}/updates`, updateForm);
      setShowUpdateModal(false);
      setUpdateForm(emptyUpdateForm);
      setSelectedCaseId(null);
      refetch();
    } catch {
      // handled by api client
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateModal = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowUpdateModal(true);
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
              <div className="h-4 flex-1 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Cases</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage all legal proceedings
          </p>
        </div>
        <Button onClick={() => setShowCaseModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Case
        </Button>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <Filter className="h-4 w-4 text-gray-400 hidden md:block" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-auto min-w-[130px]"
            >
              {CASE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto min-w-[130px]"
            >
              {CASE_STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input w-auto min-w-[130px]"
            >
              {PRIORITIES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Scale className="h-8 w-8 text-gray-400" />}
          title="No legal cases found"
          description="Try adjusting your filters, or create a new case."
          action={
            <Button onClick={() => setShowCaseModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Case
            </Button>
          }
        />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Case Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((legalCase) => {
                const isExpanded = expandedRow === legalCase.id;
                const priorityColor = PRIORITY_COLORS[legalCase.priority] || 'gray';

                return (
                  <>
                    <TableRow
                      key={legalCase.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedRow(isExpanded ? null : legalCase.id)}
                    >
                      <TableCell className="w-8 pr-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-gray-500">{legalCase.caseNumber}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{legalCase.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge color="blue">
                          {legalCase.caseType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">{legalCase.property.title}</TableCell>
                      <TableCell>
                        <Badge color={priorityColor}>
                          <span className="flex items-center gap-1">
                            {(legalCase.priority === 'critical' || legalCase.priority === 'high') && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {legalCase.priority.charAt(0).toUpperCase() + legalCase.priority.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={legalCase.status} />
                      </TableCell>
                      <TableCell className="text-gray-600">{legalCase.assignedTo || '-'}</TableCell>
                      <TableCell className="text-gray-500 text-xs">{formatDate(legalCase.filingDate)}</TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openUpdateModal(legalCase.id);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Add update"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded: Case Updates Timeline */}
                    {isExpanded && (
                      <tr key={`${legalCase.id}-updates`}>
                        <td colSpan={10} className="bg-gray-50 px-6 py-5">
                          <div className="max-w-3xl">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-semibold text-gray-700">Case Timeline</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openUpdateModal(legalCase.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Update
                              </Button>
                            </div>

                            {legalCase.description && (
                              <p className="text-sm text-gray-600 mb-4 p-3 bg-white rounded-lg border border-gray-200">
                                {legalCase.description}
                              </p>
                            )}

                            {legalCase.updates && legalCase.updates.length > 0 ? (
                              <div className="relative pl-6">
                                {/* Timeline line */}
                                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />

                                <div className="space-y-4">
                                  {legalCase.updates.map((update) => (
                                    <div key={update.id} className="relative">
                                      {/* Timeline dot */}
                                      <div className="absolute -left-[17px] top-1.5 w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />

                                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-2">
                                            <Badge color="gray">{update.type}</Badge>
                                            <span className="text-sm font-medium text-gray-900">
                                              {update.createdBy}
                                            </span>
                                          </div>
                                          <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDateTime(update.createdAt)}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{update.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No case updates yet.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* New Case Modal */}
      <Modal open={showCaseModal} onClose={() => setShowCaseModal(false)} title="New Legal Case" size="lg">
        <form onSubmit={handleCaseSubmit} className="space-y-4">
          <Input
            label="Case Title"
            value={caseForm.title}
            onChange={(e) => setCaseForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Brief description of the case"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Case Type"
              value={caseForm.caseType}
              onChange={(e) => setCaseForm((f) => ({ ...f, caseType: e.target.value }))}
              options={CASE_TYPES.filter((t) => t.value !== '')}
            />
            <Select
              label="Priority"
              value={caseForm.priority}
              onChange={(e) => setCaseForm((f) => ({ ...f, priority: e.target.value }))}
              options={PRIORITIES.filter((p) => p.value !== '')}
            />
          </div>

          <Select
            label="Property"
            value={caseForm.propertyId}
            onChange={(e) => setCaseForm((f) => ({ ...f, propertyId: e.target.value }))}
            options={[
              { value: '', label: 'Select a property...' },
              ...propertyOptions.map((p) => ({ value: p.id, label: p.title })),
            ]}
            required
          />

          <Input
            label="Assigned To"
            value={caseForm.assignedTo}
            onChange={(e) => setCaseForm((f) => ({ ...f, assignedTo: e.target.value }))}
            placeholder="Lawyer or team member name"
          />

          <Textarea
            label="Description"
            value={caseForm.description}
            onChange={(e) => setCaseForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Detailed description of the case..."
            rows={4}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" type="button" onClick={() => setShowCaseModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Case'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Update Modal */}
      <Modal open={showUpdateModal} onClose={() => setShowUpdateModal(false)} title="Add Case Update">
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <Select
            label="Update Type"
            value={updateForm.type}
            onChange={(e) => setUpdateForm((f) => ({ ...f, type: e.target.value }))}
            options={UPDATE_TYPES}
          />

          <Textarea
            label="Update Content"
            value={updateForm.content}
            onChange={(e) => setUpdateForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Describe the update..."
            rows={5}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" type="button" onClick={() => setShowUpdateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Update'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
