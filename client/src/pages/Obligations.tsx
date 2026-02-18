import { useState } from 'react';
import {
  Search,
  Plus,
  Receipt,
  Loader2,
  IndianRupee,
  Calendar,
  Eye,
  CreditCard,
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

interface Obligation {
  id: string;
  property_id: string;
  property_name: string;
  obligation_type: string;
  title: string;
  description: string | null;
  amount: number;
  frequency: string;
  status: string;
  next_due_date: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  obligation_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference_number: string | null;
  status: string;
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

const OBLIGATION_TYPE_OPTIONS = [
  { value: 'property_tax', label: 'Property Tax' }, { value: 'insurance', label: 'Insurance' },
  { value: 'hoa_fee', label: 'Hoa Fee' }, { value: 'utility', label: 'Utility' },
  { value: 'mortgage', label: 'Mortgage' }, { value: 'ground_rent', label: 'Ground Rent' },
  { value: 'service_charge', label: 'Service Charge' }, { value: 'other', label: 'Other' },
];
const OBLIGATION_TYPE_FILTER = [{ value: '', label: 'All Types' }, ...OBLIGATION_TYPE_OPTIONS];
const FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'One Time' }, { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }, { value: 'semi_annually', label: 'Semi Annually' },
  { value: 'annually', label: 'Annually' },
];
const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' }, { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' }, { value: 'other', label: 'Other' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- Component ----

export default function Obligations() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    property_id: '',
    obligation_type: 'property_tax',
    title: '',
    description: '',
    amount: '',
    frequency: 'annually',
    next_due_date: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
  });

  const params: Record<string, string> = {};
  if (filterType) params.obligation_type = filterType;

  const { data: obligationsData, loading, refetch } = useApi<PaginatedResponse<Obligation>>(
    () => api.get('/obligations', params),
    [filterType]
  );

  const { data: properties } = useApi<PaginatedResponse<Property>>(
    () => api.get('/properties', { limit: '200' }),
    []
  );

  const { data: payments, refetch: refetchPayments } = useApi<Payment[]>(
    () =>
      selectedObligation
        ? api.get(`/obligations/${selectedObligation.id}/payments`)
        : Promise.resolve([]),
    [selectedObligation?.id]
  );

  const obligations = obligationsData?.data || [];
  const filtered = obligations.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.property_name.toLowerCase().includes(q) ||
      o.title.toLowerCase().includes(q) ||
      o.obligation_type.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!form.property_id || !form.title || !form.amount) return;
    setSubmitting(true);
    try {
      await api.post('/obligations', {
        property_id: form.property_id,
        obligation_type: form.obligation_type,
        title: form.title,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        frequency: form.frequency,
        next_due_date: form.next_due_date || undefined,
      });
      setShowAddModal(false);
      setForm({ property_id: '', obligation_type: 'property_tax', title: '', description: '', amount: '', frequency: 'annually', next_due_date: '' });
      refetch();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedObligation || !paymentForm.amount) return;
    setSubmitting(true);
    try {
      await api.post(`/obligations/${selectedObligation.id}/payments`, {
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || undefined,
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'bank_transfer', reference_number: '' });
      refetchPayments();
      refetch();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = (obligation: Obligation) => {
    setSelectedObligation(obligation);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Obligations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage property obligations and recurring payments</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Obligation
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
                placeholder="Search obligations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">{OBLIGATION_TYPE_FILTER.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
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
              icon={<Receipt className="w-8 h-8 text-gray-400" />}
              title="No obligations found"
              description="Add a property obligation to track recurring payments."
              action={
                <Button onClick={() => setShowAddModal(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Obligation
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((obligation) => (
                  <TableRow key={obligation.id}>
                    <TableCell className="font-medium">{obligation.property_name}</TableCell>
                    <TableCell>{obligation.title}</TableCell>
                    <TableCell>
                      <Badge color="purple">
                        {obligation.obligation_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(obligation.amount)}</TableCell>
                    <TableCell>
                      <Badge color="blue">
                        {obligation.frequency.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={obligation.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(obligation.next_due_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(obligation)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedObligation(obligation);
                            setPaymentForm({ ...paymentForm, amount: obligation.amount.toString() });
                            setShowPaymentModal(true);
                          }}
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Obligation Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Obligation" size="lg">
        <div className="space-y-4">
          <Select
            label="Property"
            value={form.property_id}
            onChange={(e) => setForm({ ...form, property_id: e.target.value })}
            options={(properties?.data || []).map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select a property"
          />
          <Input
            label="Title"
            placeholder="e.g., Annual property tax"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Obligation Type"
              value={form.obligation_type}
              onChange={(e) => setForm({ ...form, obligation_type: e.target.value })}
              options={OBLIGATION_TYPE_OPTIONS}
            />
            <Select
              label="Frequency"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              options={FREQUENCY_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (INR)"
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Next Due Date"
              type="date"
              value={form.next_due_date}
              onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Additional details..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.property_id || !form.title || !form.amount}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Obligation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment">
        <div className="space-y-4">
          {selectedObligation && (
            <div className="bg-gray-50 rounded-lg p-3 mb-2">
              <p className="text-sm font-medium">{selectedObligation.title}</p>
              <p className="text-xs text-gray-500">{selectedObligation.property_name}</p>
            </div>
          )}
          <Input
            label="Amount (INR)"
            type="number"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
          />
          <Input
            label="Payment Date"
            type="date"
            value={paymentForm.payment_date}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
          />
          <Select
            label="Payment Method"
            value={paymentForm.payment_method}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
            options={PAYMENT_METHOD_OPTIONS}
          />
          <Input
            label="Reference Number (optional)"
            placeholder="Transaction reference"
            value={paymentForm.reference_number}
            onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button onClick={handlePayment} disabled={submitting || !paymentForm.amount}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal with Payment History */}
      <Modal
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedObligation(null); }}
        title="Obligation Details"
        size="lg"
      >
        {selectedObligation && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Property</p>
                <p className="text-sm font-medium">{selectedObligation.property_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Type</p>
                <Badge color="purple">
                  {selectedObligation.obligation_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <StatusBadge status={selectedObligation.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Amount</p>
                <p className="text-sm font-semibold">{formatCurrency(selectedObligation.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Frequency</p>
                <Badge color="blue">{selectedObligation.frequency.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Next Due</p>
                <p className="text-sm">{formatDate(selectedObligation.next_due_date)}</p>
              </div>
            </div>

            {selectedObligation.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedObligation.description}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4" />
                  Payment History
                </h4>
                <Button
                  size="sm"
                  onClick={() => {
                    setPaymentForm({ ...paymentForm, amount: selectedObligation.amount.toString() });
                    setShowPaymentModal(true);
                  }}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  Record Payment
                </Button>
              </div>
              {!payments || payments.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <Receipt className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No payments recorded yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.payment_date)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{p.payment_method || '-'}</TableCell>
                        <TableCell className="text-gray-500">{p.reference_number || '-'}</TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
