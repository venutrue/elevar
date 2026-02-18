import { useState } from 'react';
import {
  Search,
  Plus,
  Wallet,
  Loader2,
  IndianRupee,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
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

interface Expense {
  id: string;
  property_id: string;
  property_name: string;
  category: string;
  description: string;
  amount: number;
  payment_status: string;
  payment_date: string | null;
  due_date: string | null;
  vendor: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
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

const CATEGORIES = ['utilities', 'maintenance', 'insurance', 'tax', 'management_fee', 'legal', 'marketing', 'supplies', 'renovation', 'other'];
const PAYMENT_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'];
const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'semi_annually', 'annually'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function paymentStatusColor(status: string): 'green' | 'yellow' | 'red' | 'gray' {
  switch (status) {
    case 'paid': return 'green';
    case 'pending': return 'yellow';
    case 'overdue': return 'red';
    case 'cancelled': return 'gray';
    default: return 'gray';
  }
}

// ---- Component ----

export default function Expenses() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    property_id: '',
    category: 'other',
    description: '',
    amount: '',
    due_date: '',
    vendor: '',
    is_recurring: false,
    recurrence_frequency: 'monthly',
  });

  const params: Record<string, string> = {};
  if (filterCategory) params.category = filterCategory;
  if (filterPaymentStatus) params.payment_status = filterPaymentStatus;

  const { data: expensesData, loading, refetch } = useApi<PaginatedResponse<Expense>>(
    () => api.get('/expenses', params),
    [filterCategory, filterPaymentStatus]
  );

  const { data: properties } = useApi<PaginatedResponse<Property>>(
    () => api.get('/properties', { limit: '200' }),
    []
  );

  const expenses = expensesData?.data || [];
  const filtered = expenses.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.property_name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.vendor && e.vendor.toLowerCase().includes(q))
    );
  });

  // Summary calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidTotal = expenses.filter((e) => e.payment_status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingTotal = expenses.filter((e) => e.payment_status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const overdueTotal = expenses.filter((e) => e.payment_status === 'overdue').reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const maxCategoryAmount = Math.max(...Object.values(categoryTotals), 1);

  const categoryColors: Record<string, string> = {
    utilities: 'bg-blue-500',
    maintenance: 'bg-orange-500',
    insurance: 'bg-green-500',
    tax: 'bg-red-500',
    management_fee: 'bg-purple-500',
    legal: 'bg-indigo-500',
    marketing: 'bg-pink-500',
    supplies: 'bg-yellow-500',
    renovation: 'bg-teal-500',
    other: 'bg-gray-500',
  };

  const handleSubmit = async () => {
    if (!form.property_id || !form.amount) return;
    setSubmitting(true);
    try {
      await api.post('/expenses', {
        property_id: form.property_id,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        due_date: form.due_date || undefined,
        vendor: form.vendor || undefined,
        is_recurring: form.is_recurring,
        recurrence_frequency: form.is_recurring ? form.recurrence_frequency : undefined,
      });
      setShowAddModal(false);
      setForm({ property_id: '', category: 'other', description: '', amount: '', due_date: '', vendor: '', is_recurring: false, recurrence_frequency: 'monthly' });
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
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Track property expenses and payments</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(paidTotal)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(pendingTotal)}</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(overdueTotal)}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([category, total]) => (
                  <div key={category} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-600 truncate">
                      {category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${categoryColors[category] || 'bg-gray-400'}`}
                          style={{ width: `${(total / maxCategoryAmount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-28 text-right text-sm font-medium text-gray-700">
                      {formatCurrency(total)}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}</option>
              ))}
            </Select>
            <Select value={filterPaymentStatus} onChange={(e) => setFilterPaymentStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {PAYMENT_STATUSES.map((s) => (
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
              icon={<Wallet className="w-8 h-8 text-gray-400" />}
              title="No expenses found"
              description="Add an expense or adjust your filters."
              action={
                <Button onClick={() => setShowAddModal(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Expense
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Recurring</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.property_name}</TableCell>
                    <TableCell>
                      <Badge color={docCategoryColor(expense.category)}>
                        {expense.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{formatDate(expense.due_date || expense.created_at)}</TableCell>
                    <TableCell>
                      <Badge color={paymentStatusColor(expense.payment_status)}>
                        {expense.payment_status.charAt(0).toUpperCase() + expense.payment_status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {expense.is_recurring ? (
                        <Badge color="indigo">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          {expense.recurrence_frequency || 'Yes'}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Expense" size="lg">
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
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}</option>
              ))}
            </Select>
            <Input
              label="Amount (INR)"
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Expense description..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
            <Input
              label="Vendor"
              placeholder="Vendor name"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_recurring"
              checked={form.is_recurring}
              onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_recurring" className="text-sm text-gray-700 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
              Recurring expense
            </label>
          </div>
          {form.is_recurring && (
            <Select
              label="Frequency"
              value={form.recurrence_frequency}
              onChange={(e) => setForm({ ...form, recurrence_frequency: e.target.value })}
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </Select>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.property_id || !form.amount}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// helper for category badge colors
function docCategoryColor(category: string): 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'indigo' | 'pink' | 'yellow' | 'gray' {
  const map: Record<string, 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'indigo' | 'pink' | 'yellow' | 'gray'> = {
    utilities: 'blue',
    maintenance: 'orange',
    insurance: 'green',
    tax: 'red',
    management_fee: 'purple',
    legal: 'indigo',
    marketing: 'pink',
    supplies: 'yellow',
    renovation: 'blue',
    other: 'gray',
  };
  return map[category] || 'gray';
}
