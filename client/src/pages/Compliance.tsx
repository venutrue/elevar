import { useState, useMemo, type FormEvent } from 'react';
import {
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  CalendarRange,
  ClipboardList,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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

interface ComplianceCheck {
  id: string;
  property: {
    id: string;
    title: string;
  };
  checkType: string;
  status: string;
  dueDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
}

interface AuditCycle {
  id: string;
  property: {
    id: string;
    title: string;
  };
  year: number;
  status: string;
  checklistType: string;
  startDate: string;
  endDate: string;
  completedItems?: number;
  totalItems?: number;
}

interface ComplianceResponse {
  data: ComplianceCheck[];
  total: number;
}

interface AuditCyclesResponse {
  data: AuditCycle[];
  total: number;
}

interface PropertyOption {
  id: string;
  title: string;
}

interface CheckFormData {
  propertyId: string;
  checkType: string;
  dueDate: string;
  assignedTo: string;
  notes: string;
}

interface AuditFormData {
  propertyId: string;
  year: string;
  checklistType: string;
  startDate: string;
  endDate: string;
}

const CHECK_TYPES = [
  { value: '', label: 'All Check Types' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'structural', label: 'Structural' },
  { value: 'gas_safety', label: 'Gas Safety' },
  { value: 'health_safety', label: 'Health & Safety' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'license_renewal', label: 'License Renewal' },
  { value: 'other', label: 'Other' },
];

const CHECK_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'failed', label: 'Failed' },
  { value: 'scheduled', label: 'Scheduled' },
];

const CHECKLIST_TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'ad_hoc', label: 'Ad Hoc' },
];

const emptyCheckForm: CheckFormData = {
  propertyId: '',
  checkType: 'fire_safety',
  dueDate: '',
  assignedTo: '',
  notes: '',
};

const emptyAuditForm: AuditFormData = {
  propertyId: '',
  year: new Date().getFullYear().toString(),
  checklistType: 'annual',
  startDate: '',
  endDate: '',
};

// ---- Helpers ----

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

const getDueDateClass = (dateStr: string, status: string) => {
  if (status === 'completed') return 'text-gray-500';
  if (isOverdue(dateStr)) return 'text-danger-600 font-semibold';
  // Within 7 days
  const daysUntil = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 7) return 'text-accent-600 font-medium';
  return 'text-gray-600';
};

// ---- Component ----

export default function Compliance() {
  const [activeSection, setActiveSection] = useState<'checks' | 'audits'>('checks');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [checkForm, setCheckForm] = useState<CheckFormData>(emptyCheckForm);
  const [auditForm, setAuditForm] = useState<AuditFormData>(emptyAuditForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: checksData, loading: checksLoading, refetch: refetchChecks } = useApi<ComplianceResponse>(
    () => api.get('/compliance/checks'),
    []
  );

  const { data: auditsData, loading: auditsLoading, refetch: refetchAudits } = useApi<AuditCyclesResponse>(
    () => api.get('/compliance/audit-cycles'),
    []
  );

  const { data: propertiesData } = useApi<{ data: PropertyOption[] }>(
    () => api.get('/properties', { limit: '100' }),
    []
  );

  const checks = checksData?.data ?? [];
  const audits = auditsData?.data ?? [];
  const propertyOptions = propertiesData?.data ?? [];

  // ---- Filtered data ----

  const filteredChecks = useMemo(() => {
    return checks.filter((c) => {
      const matchesSearch =
        !search ||
        c.property.title.toLowerCase().includes(search.toLowerCase()) ||
        c.checkType.toLowerCase().includes(search.toLowerCase()) ||
        (c.assignedTo && c.assignedTo.toLowerCase().includes(search.toLowerCase()));
      const matchesType = !typeFilter || c.checkType === typeFilter;
      const matchesStatus = !statusFilter || c.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [checks, search, typeFilter, statusFilter]);

  const filteredAudits = useMemo(() => {
    return audits.filter((a) => {
      const matchesSearch =
        !search ||
        a.property.title.toLowerCase().includes(search.toLowerCase()) ||
        a.checklistType.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [audits, search, statusFilter]);

  // ---- Stats ----

  const overdueCount = checks.filter((c) => c.status === 'overdue' || (c.status !== 'completed' && isOverdue(c.dueDate))).length;
  const pendingCount = checks.filter((c) => c.status === 'pending').length;
  const completedCount = checks.filter((c) => c.status === 'completed').length;

  // ---- Handlers ----

  const handleCheckSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/compliance/checks', checkForm);
      setShowCheckModal(false);
      setCheckForm(emptyCheckForm);
      refetchChecks();
    } catch {
      // handled by api client
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/compliance/audit-cycles', {
        ...auditForm,
        year: Number(auditForm.year),
      });
      setShowAuditModal(false);
      setAuditForm(emptyAuditForm);
      refetchAudits();
    } catch {
      // handled by api client
    } finally {
      setSubmitting(false);
    }
  };

  const loading = checksLoading || auditsLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor compliance checks and audit cycles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAuditModal(true)}>
            <CalendarRange className="h-4 w-4 mr-2" />
            New Audit Cycle
          </Button>
          <Button onClick={() => setShowCheckModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Check
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-danger-50">
            <AlertCircle className="h-6 w-6 text-danger-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue</p>
            <p className="text-2xl font-bold text-danger-600">{overdueCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent-50">
            <Clock className="h-6 w-6 text-accent-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-accent-600">{pendingCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary-50">
            <CheckCircle2 className="h-6 w-6 text-secondary-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold text-secondary-600">{completedCount}</p>
          </div>
        </Card>
      </div>

      {/* Section Toggle */}
      <div className="flex rounded-lg bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveSection('checks')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeSection === 'checks'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Compliance Checks
          </span>
        </button>
        <button
          onClick={() => setActiveSection('audits')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeSection === 'audits'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Audit Cycles
          </span>
        </button>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeSection === 'checks' ? 'Search compliance checks...' : 'Search audit cycles...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-3 items-center">
            <Filter className="h-4 w-4 text-gray-400 hidden md:block" />
            {activeSection === 'checks' && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input w-auto min-w-[150px]"
              >
                {CHECK_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto min-w-[140px]"
            >
              {CHECK_STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Compliance Checks Table */}
      {activeSection === 'checks' && (
        <>
          {filteredChecks.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-8 w-8 text-gray-400" />}
              title="No compliance checks found"
              description="Add a compliance check to start tracking."
              action={
                <Button onClick={() => setShowCheckModal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Check
                </Button>
              }
            />
          ) : (
            <Card className="!p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Check Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChecks.map((check) => (
                    <TableRow key={check.id}>
                      <TableCell>
                        <span className="font-medium text-gray-900">{check.property.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge color="blue">
                          {check.checkType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={check.status} />
                      </TableCell>
                      <TableCell>
                        <span className={getDueDateClass(check.dueDate, check.status)}>
                          {formatDate(check.dueDate)}
                          {check.status !== 'completed' && isOverdue(check.dueDate) && (
                            <span className="ml-1.5 text-xs text-danger-500">(Overdue)</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {check.completedDate ? formatDate(check.completedDate) : '-'}
                      </TableCell>
                      <TableCell className="text-gray-600">{check.assignedTo || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Audit Cycles Table */}
      {activeSection === 'audits' && (
        <>
          {filteredAudits.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8 text-gray-400" />}
              title="No audit cycles found"
              description="Create an audit cycle to schedule compliance reviews."
              action={
                <Button onClick={() => setShowAuditModal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> New Audit Cycle
                </Button>
              }
            />
          ) : (
            <Card className="!p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Checklist Type</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudits.map((audit) => {
                    const progress =
                      audit.totalItems && audit.totalItems > 0
                        ? Math.round(((audit.completedItems ?? 0) / audit.totalItems) * 100)
                        : 0;

                    return (
                      <TableRow key={audit.id}>
                        <TableCell>
                          <span className="font-medium text-gray-900">{audit.property.title}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{audit.year}</span>
                        </TableCell>
                        <TableCell>
                          <Badge color="indigo">
                            {audit.checklistType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600 text-sm">
                            {formatDate(audit.startDate)} - {formatDate(audit.endDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  progress === 100
                                    ? 'bg-secondary-500'
                                    : progress > 50
                                      ? 'bg-primary-500'
                                      : 'bg-accent-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 min-w-[32px]">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={audit.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Add Compliance Check Modal */}
      <Modal open={showCheckModal} onClose={() => setShowCheckModal(false)} title="Add Compliance Check" size="lg">
        <form onSubmit={handleCheckSubmit} className="space-y-4">
          <Select
            label="Property"
            value={checkForm.propertyId}
            onChange={(e) => setCheckForm((f) => ({ ...f, propertyId: e.target.value }))}
            options={[
              { value: '', label: 'Select a property...' },
              ...propertyOptions.map((p) => ({ value: p.id, label: p.title })),
            ]}
            required
          />

          <Select
            label="Check Type"
            value={checkForm.checkType}
            onChange={(e) => setCheckForm((f) => ({ ...f, checkType: e.target.value }))}
            options={CHECK_TYPES.filter((t) => t.value !== '')}
          />

          <Input
            label="Due Date"
            type="date"
            value={checkForm.dueDate}
            onChange={(e) => setCheckForm((f) => ({ ...f, dueDate: e.target.value }))}
            required
          />

          <Input
            label="Assigned To"
            value={checkForm.assignedTo}
            onChange={(e) => setCheckForm((f) => ({ ...f, assignedTo: e.target.value }))}
            placeholder="Person responsible"
          />

          <Textarea
            label="Notes"
            value={checkForm.notes}
            onChange={(e) => setCheckForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Additional notes..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" type="button" onClick={() => setShowCheckModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Add Check'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Audit Cycle Modal */}
      <Modal open={showAuditModal} onClose={() => setShowAuditModal(false)} title="New Audit Cycle" size="lg">
        <form onSubmit={handleAuditSubmit} className="space-y-4">
          <Select
            label="Property"
            value={auditForm.propertyId}
            onChange={(e) => setAuditForm((f) => ({ ...f, propertyId: e.target.value }))}
            options={[
              { value: '', label: 'Select a property...' },
              ...propertyOptions.map((p) => ({ value: p.id, label: p.title })),
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Year"
              type="number"
              value={auditForm.year}
              onChange={(e) => setAuditForm((f) => ({ ...f, year: e.target.value }))}
              required
            />
            <Select
              label="Checklist Type"
              value={auditForm.checklistType}
              onChange={(e) => setAuditForm((f) => ({ ...f, checklistType: e.target.value }))}
              options={CHECKLIST_TYPES}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={auditForm.startDate}
              onChange={(e) => setAuditForm((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={auditForm.endDate}
              onChange={(e) => setAuditForm((f) => ({ ...f, endDate: e.target.value }))}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" type="button" onClick={() => setShowAuditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Audit Cycle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
