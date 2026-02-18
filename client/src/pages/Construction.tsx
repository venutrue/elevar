import { useState } from 'react';
import {
  Search,
  Plus,
  HardHat,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  IndianRupee,
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

interface ConstructionProject {
  id: string;
  property_id: string;
  property_name: string;
  project_type: string;
  title: string;
  description: string | null;
  status: string;
  estimated_budget: number | null;
  actual_spend: number | null;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  milestones_completed: number;
  milestones_total: number;
  created_at: string;
}

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  completed_date: string | null;
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

const PROJECT_TYPES = ['new_build', 'renovation', 'extension', 'interior', 'exterior', 'landscaping', 'infrastructure'];
const PROJECT_STATUSES = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'];

function formatCurrency(amount: number | null): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- Component ----

export default function Construction() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    property_id: '',
    project_type: 'renovation',
    title: '',
    description: '',
    estimated_budget: '',
    start_date: '',
    target_end_date: '',
  });

  const params: Record<string, string> = {};
  if (filterStatus) params.status = filterStatus;

  const { data: projectsData, loading, refetch } = useApi<PaginatedResponse<ConstructionProject>>(
    () => api.get('/construction', params),
    [filterStatus]
  );

  const { data: properties } = useApi<PaginatedResponse<Property>>(
    () => api.get('/properties', { limit: '200' }),
    []
  );

  const { data: milestones, refetch: refetchMilestones } = useApi<Milestone[]>(
    () =>
      expandedRow
        ? api.get(`/construction/${expandedRow}/milestones`)
        : Promise.resolve([]),
    [expandedRow]
  );

  const projects = projectsData?.data || [];
  const filtered = projects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.property_name.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!form.property_id || !form.title) return;
    setSubmitting(true);
    try {
      await api.post('/construction', {
        property_id: form.property_id,
        project_type: form.project_type,
        title: form.title,
        description: form.description || undefined,
        estimated_budget: form.estimated_budget ? parseFloat(form.estimated_budget) : undefined,
        start_date: form.start_date || undefined,
        target_end_date: form.target_end_date || undefined,
      });
      setShowAddModal(false);
      setForm({ property_id: '', project_type: 'renovation', title: '', description: '', estimated_budget: '', start_date: '', target_end_date: '' });
      refetch();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMilestone = async (milestone: Milestone) => {
    try {
      const newStatus = milestone.status === 'completed' ? 'pending' : 'completed';
      await api.put(`/construction/milestones/${milestone.id}`, {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null,
      });
      refetchMilestones();
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
          <h1 className="text-2xl font-bold text-gray-900">Construction Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage construction and renovation projects</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
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
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {PROJECT_STATUSES.map((s) => (
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
              icon={<HardHat className="w-8 h-8 text-gray-400" />}
              title="No construction projects"
              description="Create a new project to get started."
              action={
                <Button onClick={() => setShowAddModal(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Project
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Property</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((project) => {
                  const isExpanded = expandedRow === project.id;
                  const progressPct = project.milestones_total > 0
                    ? Math.round((project.milestones_completed / project.milestones_total) * 100)
                    : 0;

                  return (
                    <>
                      <TableRow key={project.id} className="cursor-pointer" onClick={() => toggleRow(project.id)}>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{project.property_name}</TableCell>
                        <TableCell>{project.title}</TableCell>
                        <TableCell>
                          <Badge color="indigo">
                            {project.project_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={project.status} />
                        </TableCell>
                        <TableCell>{formatCurrency(project.estimated_budget)}</TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-500">
                            {formatDate(project.start_date)} - {formatDate(project.target_end_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-16 text-right">
                              {project.milestones_completed}/{project.milestones_total}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <tr key={`${project.id}-expanded`}>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50">
                            {/* Budget Comparison */}
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <IndianRupee className="w-4 h-4" />
                                Budget Comparison
                              </h4>
                              <div className="grid grid-cols-2 gap-4 max-w-md">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                  <p className="text-xs text-blue-600 uppercase font-medium">Estimated</p>
                                  <p className="text-lg font-bold text-blue-700">{formatCurrency(project.estimated_budget)}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                  <p className="text-xs text-green-600 uppercase font-medium">Actual Spend</p>
                                  <p className="text-lg font-bold text-green-700">{formatCurrency(project.actual_spend)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Milestones */}
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Milestones</h4>
                            {!milestones || milestones.length === 0 ? (
                              <p className="text-sm text-gray-400">No milestones defined yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {milestones
                                  .sort((a, b) => a.order_index - b.order_index)
                                  .map((ms) => (
                                    <div
                                      key={ms.id}
                                      className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-gray-200"
                                    >
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleMilestone(ms); }}
                                        className="flex-shrink-0"
                                      >
                                        {ms.status === 'completed' ? (
                                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : ms.status === 'in_progress' ? (
                                          <Clock className="w-5 h-5 text-blue-500" />
                                        ) : (
                                          <Circle className="w-5 h-5 text-gray-300" />
                                        )}
                                      </button>
                                      <div className="flex-1">
                                        <p className={`text-sm ${ms.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                          {ms.title}
                                        </p>
                                        {ms.description && (
                                          <p className="text-xs text-gray-400">{ms.description}</p>
                                        )}
                                      </div>
                                      {ms.due_date && (
                                        <span className="text-xs text-gray-400">{formatDate(ms.due_date)}</span>
                                      )}
                                      <StatusBadge status={ms.status} />
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

      {/* Add Project Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Construction Project" size="lg">
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
          <Input
            label="Title"
            placeholder="Project title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Select
            label="Project Type"
            value={form.project_type}
            onChange={(e) => setForm({ ...form, project_type: e.target.value })}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </Select>
          <Textarea
            label="Description"
            placeholder="Project description..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Estimated Budget (INR)"
            type="number"
            placeholder="0"
            value={form.estimated_budget}
            onChange={(e) => setForm({ ...form, estimated_budget: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
            <Input
              label="Target End Date"
              type="date"
              value={form.target_end_date}
              onChange={(e) => setForm({ ...form, target_end_date: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.property_id || !form.title}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
