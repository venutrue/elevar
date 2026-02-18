import { useState, useMemo, type FormEvent } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
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

interface Tenancy {
  id: string;
  property: {
    id: string;
    title: string;
  };
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  securityDeposit: number;
  status: string;
  currency: string;
  rentPayments?: RentPayment[];
}

interface RentPayment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
}

interface TenanciesResponse {
  data: Tenancy[];
  total: number;
}

interface PropertyOption {
  id: string;
  title: string;
}

interface TenancyFormData {
  propertyId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
  securityDeposit: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'draft', label: 'Draft' },
];

const emptyForm: TenancyFormData = {
  propertyId: '',
  tenantName: '',
  tenantEmail: '',
  tenantPhone: '',
  leaseStart: '',
  leaseEnd: '',
  monthlyRent: '',
  securityDeposit: '',
};

// ---- Helpers ----

const formatCurrency = (value: number, currency = 'AED') =>
  new Intl.NumberFormat('en-AE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// ---- Component ----

export default function Tenancies() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [formData, setFormData] = useState<TenancyFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, refetch } = useApi<TenanciesResponse>(
    () => api.get('/tenancies'),
    []
  );

  const { data: propertiesData } = useApi<{ data: PropertyOption[] }>(
    () => api.get('/properties', { limit: '100' }),
    []
  );

  const tenancies = data?.data ?? [];
  const propertyOptions = propertiesData?.data ?? [];

  const filtered = useMemo(() => {
    return tenancies.filter((t) => {
      const matchesSearch =
        !search ||
        t.tenantName.toLowerCase().includes(search.toLowerCase()) ||
        t.property.title.toLowerCase().includes(search.toLowerCase()) ||
        t.tenantEmail.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || t.status === statusFilter;
      const matchesProperty = !propertyFilter || t.property.id === propertyFilter;
      return matchesSearch && matchesStatus && matchesProperty;
    });
  }, [tenancies, search, statusFilter, propertyFilter]);

  const updateForm = (field: keyof TenancyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/tenancies', {
        ...formData,
        monthlyRent: Number(formData.monthlyRent),
        securityDeposit: Number(formData.securityDeposit),
      });
      setShowModal(false);
      setFormData(emptyForm);
      refetch();
    } catch {
      // handled by api client
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-36 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
              <div className="h-4 flex-1 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
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
          <h1 className="text-2xl font-bold text-gray-900">Tenancies</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all tenant leases and rent payments
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tenancy
        </Button>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tenant or property..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-3 items-center">
            <Filter className="h-4 w-4 text-gray-400 hidden md:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto min-w-[140px]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="input w-auto min-w-[160px]"
            >
              <option value="">All Properties</option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-gray-400" />}
          title="No tenancies found"
          description="Try adjusting your filters, or add a new tenancy."
          action={
            <Button onClick={() => setShowModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Tenancy
            </Button>
          }
        />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Lease Period</TableHead>
                <TableHead>Monthly Rent</TableHead>
                <TableHead>Security Deposit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenancy) => {
                const isExpanded = expandedRow === tenancy.id;
                return (
                  <>
                    <TableRow
                      key={tenancy.id}
                      className="cursor-pointer"
                      onClick={() => toggleRow(tenancy.id)}
                    >
                      <TableCell className="w-8 pr-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{tenancy.property.title}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{tenancy.tenantName}</p>
                          <p className="text-xs text-gray-500">{tenancy.tenantEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {formatDate(tenancy.leaseStart)} - {formatDate(tenancy.leaseEnd)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 font-medium">
                          <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                          {formatCurrency(tenancy.monthlyRent, tenancy.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(tenancy.securityDeposit, tenancy.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tenancy.status} />
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <tr key={`${tenancy.id}-payments`}>
                        <td colSpan={7} className="bg-gray-50 px-6 py-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Rent Payments</h4>
                            {tenancy.rentPayments && tenancy.rentPayments.length > 0 ? (
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Due Date
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Amount
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Paid Date
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Status
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {tenancy.rentPayments.map((payment) => (
                                      <tr key={payment.id}>
                                        <td className="px-4 py-2 text-sm">{formatDate(payment.dueDate)}</td>
                                        <td className="px-4 py-2 text-sm font-medium">
                                          {formatCurrency(payment.amount, tenancy.currency)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-500">
                                          {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                                        </td>
                                        <td className="px-4 py-2">
                                          <StatusBadge status={payment.status} />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No rent payments recorded.</p>
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

      {/* Add Tenancy Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Tenancy" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Property"
            value={formData.propertyId}
            onChange={(e) => updateForm('propertyId', e.target.value)}
            options={[
              { value: '', label: 'Select a property...' },
              ...propertyOptions.map((p) => ({ value: p.id, label: p.title })),
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tenant Name"
              value={formData.tenantName}
              onChange={(e) => updateForm('tenantName', e.target.value)}
              placeholder="Full name"
              required
            />
            <Input
              label="Tenant Email"
              type="email"
              value={formData.tenantEmail}
              onChange={(e) => updateForm('tenantEmail', e.target.value)}
              placeholder="tenant@email.com"
              required
            />
          </div>

          <Input
            label="Tenant Phone"
            type="tel"
            value={formData.tenantPhone}
            onChange={(e) => updateForm('tenantPhone', e.target.value)}
            placeholder="+971 50 123 4567"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lease Start"
              type="date"
              value={formData.leaseStart}
              onChange={(e) => updateForm('leaseStart', e.target.value)}
              required
            />
            <Input
              label="Lease End"
              type="date"
              value={formData.leaseEnd}
              onChange={(e) => updateForm('leaseEnd', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monthly Rent (AED)"
              type="number"
              value={formData.monthlyRent}
              onChange={(e) => updateForm('monthlyRent', e.target.value)}
              placeholder="8000"
              required
            />
            <Input
              label="Security Deposit (AED)"
              type="number"
              value={formData.securityDeposit}
              onChange={(e) => updateForm('securityDeposit', e.target.value)}
              placeholder="16000"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Tenancy'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
