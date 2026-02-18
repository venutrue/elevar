import { useState } from 'react';
import { Search, Plus, Wallet, Loader2, TrendingUp, Clock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import useApi from '@/hooks/useApi';
import api from '@/api/client';

interface Expense { id: string; property_id: string; property_name: string; category: string; description: string; amount: number; payment_status: string; payment_date: string | null; due_date: string | null; vendor: string | null; is_recurring: boolean; recurrence_frequency: string | null; created_at: string; }
interface PaginatedResponse<T> { data: T[]; total: number; }
interface Property { id: string; name: string; }

const CATEGORIES = [
  { value: '', label: 'All Categories' }, { value: 'utilities', label: 'Utilities' }, { value: 'maintenance', label: 'Maintenance' },
  { value: 'insurance', label: 'Insurance' }, { value: 'tax', label: 'Tax' }, { value: 'management_fee', label: 'Management Fee' },
  { value: 'legal', label: 'Legal' }, { value: 'marketing', label: 'Marketing' }, { value: 'supplies', label: 'Supplies' },
  { value: 'renovation', label: 'Renovation' }, { value: 'other', label: 'Other' },
];
const PAY_STATUSES = [{ value: '', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }, { value: 'cancelled', label: 'Cancelled' }];
const FREQUENCIES = [{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'semi_annually', label: 'Semi Annually' }, { value: 'annually', label: 'Annually' }];
const FORM_CATEGORIES = CATEGORIES.filter((c) => c.value !== '');

function formatCurrency(amount: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount); }
function formatDate(d: string | null): string { if (!d) return '-'; return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }
function payColor(s: string): 'green' | 'yellow' | 'red' | 'gray' { switch (s) { case 'paid': return 'green'; case 'pending': return 'yellow'; case 'overdue': return 'red'; default: return 'gray'; } }
function catColor(c: string): 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'indigo' | 'pink' | 'yellow' | 'gray' {
  const m: Record<string, 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'indigo' | 'pink' | 'yellow' | 'gray'> = { utilities: 'blue', maintenance: 'orange', insurance: 'green', tax: 'red', management_fee: 'purple', legal: 'indigo', marketing: 'pink', supplies: 'yellow', renovation: 'blue', other: 'gray' };
  return m[c] || 'gray';
}
const catBarColors: Record<string, string> = { utilities: 'bg-blue-500', maintenance: 'bg-orange-500', insurance: 'bg-green-500', tax: 'bg-red-500', management_fee: 'bg-purple-500', legal: 'bg-indigo-500', marketing: 'bg-pink-500', supplies: 'bg-yellow-500', renovation: 'bg-teal-500', other: 'bg-gray-500' };

export default function Expenses() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayStatus, setFilterPayStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ property_id: '', category: 'other', description: '', amount: '', due_date: '', vendor: '', is_recurring: false, recurrence_frequency: 'monthly' });

  const params: Record<string, string> = {};
  if (filterCategory) params.category = filterCategory;
  if (filterPayStatus) params.payment_status = filterPayStatus;

  const { data: expData, loading, refetch } = useApi<PaginatedResponse<Expense>>(() => api.get('/expenses', params), [filterCategory, filterPayStatus]);
  const { data: properties } = useApi<PaginatedResponse<Property>>(() => api.get('/properties', { limit: '200' }), []);

  const expenses = expData?.data || [];
  const filtered = expenses.filter((e) => { if (!search) return true; const q = search.toLowerCase(); return e.property_name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q); });
  const propertyOptions = (properties?.data || []).map((p) => ({ value: p.id, label: p.name }));

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const paidTotal = expenses.filter((e) => e.payment_status === 'paid').reduce((s, e) => s + e.amount, 0);
  const pendingTotal = expenses.filter((e) => e.payment_status === 'pending').reduce((s, e) => s + e.amount, 0);
  const overdueTotal = expenses.filter((e) => e.payment_status === 'overdue').reduce((s, e) => s + e.amount, 0);
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {});
  const maxCat = Math.max(...Object.values(categoryTotals), 1);

  const handleSubmit = async () => {
    if (!form.property_id || !form.amount) return;
    setSubmitting(true);
    try {
      await api.post('/expenses', { property_id: form.property_id, category: form.category, description: form.description, amount: parseFloat(form.amount), due_date: form.due_date || undefined, vendor: form.vendor || undefined, is_recurring: form.is_recurring, recurrence_frequency: form.is_recurring ? form.recurrence_frequency : undefined });
      setShowAddModal(false); setForm({ property_id: '', category: 'other', description: '', amount: '', due_date: '', vendor: '', is_recurring: false, recurrence_frequency: 'monthly' }); refetch();
    } catch { /* silent */ } finally { setSubmitting(false); }
  };

  if (loading) { return (<div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="bg-white rounded-xl border p-6 animate-pulse"><div className="h-4 w-1/2 bg-gray-200 rounded mb-2" /><div className="h-8 w-3/4 bg-gray-200 rounded" /></div>))}</div></div>); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Expenses</h1><p className="text-sm text-gray-500 mt-1">Track property expenses and payments</p></div>
        <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Expenses', value: totalExpenses, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { label: 'Paid', value: paidTotal, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'Pending', value: pendingTotal, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { label: 'Overdue', value: overdueTotal, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-gray-500 uppercase font-medium">{label}</p><p className={`text-2xl font-bold mt-1 ${color}`}>{formatCurrency(value)}</p></div><div className={`p-2 rounded-lg ${bg}`}><Icon className={`w-5 h-5 ${color}`} /></div></div></CardContent></Card>
        ))}
      </div>

      {Object.keys(categoryTotals).length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader><CardContent><div className="space-y-3">
          {Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).map(([cat, total]) => (
            <div key={cat} className="flex items-center gap-3"><div className="w-32 text-sm text-gray-600 truncate">{cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div><div className="flex-1"><div className="w-full bg-gray-100 rounded-full h-3"><div className={`h-3 rounded-full ${catBarColors[cat] || 'bg-gray-400'}`} style={{ width: `${(total / maxCat) * 100}%` }} /></div></div><div className="w-28 text-right text-sm font-medium text-gray-700">{formatCurrency(total)}</div></div>
          ))}
        </div></CardContent></Card>
      )}

      <Card><CardContent><div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" /></div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        <select value={filterPayStatus} onChange={(e) => setFilterPayStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">{PAY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
      </div></CardContent></Card>

      <Card>{filtered.length === 0 ? (
        <EmptyState icon={<Wallet className="w-8 h-8 text-gray-400" />} title="No expenses found" description="Add an expense or adjust your filters." action={<Button onClick={() => setShowAddModal(true)} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Expense</Button>} />
      ) : (
        <Table><TableHeader><TableRow><TableHead>Property</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Payment Status</TableHead><TableHead>Recurring</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map((exp) => (
            <TableRow key={exp.id}><TableCell className="font-medium">{exp.property_name}</TableCell><TableCell><Badge color={catColor(exp.category)}>{exp.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Badge></TableCell><TableCell className="max-w-xs truncate">{exp.description}</TableCell><TableCell className="font-semibold">{formatCurrency(exp.amount)}</TableCell><TableCell>{formatDate(exp.due_date || exp.created_at)}</TableCell><TableCell><Badge color={payColor(exp.payment_status)}>{exp.payment_status.charAt(0).toUpperCase() + exp.payment_status.slice(1)}</Badge></TableCell><TableCell>{exp.is_recurring ? <Badge color="indigo"><RefreshCw className="w-3 h-3 mr-1" />{exp.recurrence_frequency || 'Yes'}</Badge> : <span className="text-gray-400">-</span>}</TableCell></TableRow>
          ))}</TableBody></Table>
      )}</Card>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Expense" size="lg">
        <div className="space-y-4">
          <Select label="Property" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} options={propertyOptions} placeholder="Select a property" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={FORM_CATEGORIES} />
            <Input label="Amount (INR)" type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <Textarea label="Description" placeholder="Expense description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Due Date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <Input label="Vendor" placeholder="Vendor name" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div className="flex items-center gap-2"><input type="checkbox" id="is_recurring" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /><label htmlFor="is_recurring" className="text-sm text-gray-700 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-gray-400" />Recurring expense</label></div>
          {form.is_recurring && <Select label="Frequency" value={form.recurrence_frequency} onChange={(e) => setForm({ ...form, recurrence_frequency: e.target.value })} options={FREQUENCIES} />}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.property_id || !form.amount}>{submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Add Expense</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
