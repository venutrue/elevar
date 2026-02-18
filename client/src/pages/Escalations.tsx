import { useState } from 'react';
import {
  Search,
  Plus,
  AlertOctagon,
  Loader2,
  Zap,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Bell,
  ArrowUpCircle,
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

interface EscalationRule {
  id: string;
  name: string;
  description: string | null;
  entity_type: string;
  trigger_condition: string;
  escalate_to_role: string;
  is_active: boolean;
  time_threshold_hours: number | null;
  created_at: string;
}

interface EscalationEvent {
  id: string;
  rule_id: string | null;
  rule_name: string | null;
  entity_type: string;
  entity_id: string;
  entity_title: string | null;
  escalated_to: string;
  escalated_to_name: string | null;
  reason: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// ---- Constants ----

const ENTITY_TYPES = ['maintenance', 'support_ticket', 'legal_case', 'compliance', 'inspection', 'construction'];
const TRIGGER_CONDITIONS = ['sla_breach', 'status_stale', 'high_priority_unassigned', 'overdue', 'custom'];
const ROLES = ['admin', 'manager', 'senior_manager', 'director', 'legal_head', 'operations_head'];

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ---- Component ----

export default function Escalations() {
  const [activeTab, setActiveTab] = useState<'rules' | 'events'>('rules');
  const [search, setSearch] = useState('');
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    entity_type: 'maintenance',
    trigger_condition: 'sla_breach',
    escalate_to_role: 'manager',
    time_threshold_hours: '',
  });

  const [triggerForm, setTriggerForm] = useState({
    entity_type: 'maintenance',
    entity_id: '',
    escalated_to: '',
    reason: '',
  });

  const { data: rulesData, loading: loadingRules, refetch: refetchRules } = useApi<PaginatedResponse<EscalationRule>>(
    () => api.get('/escalations/rules'),
    []
  );

  const { data: eventsData, loading: loadingEvents, refetch: refetchEvents } = useApi<PaginatedResponse<EscalationEvent>>(
    () => api.get('/escalations/events'),
    []
  );

  const rules = rulesData?.data || [];
  const events = eventsData?.data || [];

  const filteredRules = rules.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.entity_type.toLowerCase().includes(q);
  });

  const filteredEvents = events.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.entity_title && e.entity_title.toLowerCase().includes(q)) ||
      (e.escalated_to_name && e.escalated_to_name.toLowerCase().includes(q)) ||
      e.entity_type.toLowerCase().includes(q)
    );
  });

  const handleAddRule = async () => {
    if (!ruleForm.name || !ruleForm.entity_type) return;
    setSubmitting(true);
    try {
      await api.post('/escalations/rules', {
        name: ruleForm.name,
        description: ruleForm.description || undefined,
        entity_type: ruleForm.entity_type,
        trigger_condition: ruleForm.trigger_condition,
        escalate_to_role: ruleForm.escalate_to_role,
        time_threshold_hours: ruleForm.time_threshold_hours ? parseInt(ruleForm.time_threshold_hours) : undefined,
      });
      setShowAddRuleModal(false);
      setRuleForm({ name: '', description: '', entity_type: 'maintenance', trigger_condition: 'sla_breach', escalate_to_role: 'manager', time_threshold_hours: '' });
      refetchRules();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerEscalation = async () => {
    if (!triggerForm.entity_id || !triggerForm.escalated_to || !triggerForm.reason) return;
    setSubmitting(true);
    try {
      await api.post('/escalations/events', {
        entity_type: triggerForm.entity_type,
        entity_id: triggerForm.entity_id,
        escalated_to: triggerForm.escalated_to,
        reason: triggerForm.reason,
      });
      setShowTriggerModal(false);
      setTriggerForm({ entity_type: 'maintenance', entity_id: '', escalated_to: '', reason: '' });
      refetchEvents();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRuleActive = async (rule: EscalationRule) => {
    try {
      await api.put(`/escalations/rules/${rule.id}`, { is_active: !rule.is_active });
      refetchRules();
    } catch {
      // silent
    }
  };

  const acknowledgeEvent = async (eventId: string) => {
    try {
      await api.put(`/escalations/events/${eventId}`, { acknowledged: true });
      refetchEvents();
    } catch {
      // silent
    }
  };

  const loading = activeTab === 'rules' ? loadingRules : loadingEvents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escalations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage escalation rules and track escalation events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTriggerModal(true)}>
            <Zap className="w-4 h-4 mr-2" />
            Manual Escalation
          </Button>
          <Button onClick={() => setShowAddRuleModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setActiveTab('rules'); setSearch(''); }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'rules' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Rules
          <Badge color="gray" className="ml-2">{rules.length}</Badge>
        </button>
        <button
          onClick={() => { setActiveTab('events'); setSearch(''); }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'events' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Events
          <Badge color="red" className="ml-2">
            {events.filter((e) => !e.acknowledged).length}
          </Badge>
        </button>
      </div>

      {/* Search */}
      <Card>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'rules' ? 'Search rules...' : 'Search events...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <Card>
          <CardContent className="p-0">
            {loadingRules ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredRules.length === 0 ? (
              <EmptyState
                icon={<AlertOctagon className="w-8 h-8 text-gray-400" />}
                title="No escalation rules"
                description="Create rules to automatically escalate issues."
                action={
                  <Button onClick={() => setShowAddRuleModal(true)} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Add Rule
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Escalate To</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{rule.name}</p>
                          {rule.description && (
                            <p className="text-xs text-gray-400">{rule.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge color="indigo">
                          {rule.entity_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge color="orange">
                          {rule.trigger_condition.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge color="purple">
                          {rule.escalate_to_role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rule.time_threshold_hours
                          ? `${rule.time_threshold_hours}h`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleRuleActive(rule)}
                          className="flex items-center gap-1"
                        >
                          {rule.is_active ? (
                            <ToggleRight className="w-6 h-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <Card>
          <CardContent className="p-0">
            {loadingEvents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                icon={<Bell className="w-8 h-8 text-gray-400" />}
                title="No escalation events"
                description="Escalation events will appear here when triggered."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Escalated To</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Acknowledged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id} className={!event.acknowledged ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">
                        {event.entity_title || event.entity_id}
                      </TableCell>
                      <TableCell>
                        <Badge color="indigo">
                          {event.entity_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.escalated_to_name || event.escalated_to}</TableCell>
                      <TableCell className="max-w-xs truncate text-gray-600">{event.reason}</TableCell>
                      <TableCell>{formatDateTime(event.created_at)}</TableCell>
                      <TableCell>
                        {event.acknowledged ? (
                          <Badge color="green">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Acknowledged
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acknowledgeEvent(event.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Rule Modal */}
      <Modal open={showAddRuleModal} onClose={() => setShowAddRuleModal(false)} title="Add Escalation Rule" size="lg">
        <div className="space-y-4">
          <Input
            label="Rule Name"
            placeholder="e.g., SLA Breach - Support Tickets"
            value={ruleForm.name}
            onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
          />
          <Textarea
            label="Description (optional)"
            placeholder="Describe when this rule should trigger..."
            value={ruleForm.description}
            onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Entity Type"
              value={ruleForm.entity_type}
              onChange={(e) => setRuleForm({ ...ruleForm, entity_type: e.target.value })}
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </Select>
            <Select
              label="Trigger Condition"
              value={ruleForm.trigger_condition}
              onChange={(e) => setRuleForm({ ...ruleForm, trigger_condition: e.target.value })}
            >
              {TRIGGER_CONDITIONS.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Escalate To Role"
              value={ruleForm.escalate_to_role}
              onChange={(e) => setRuleForm({ ...ruleForm, escalate_to_role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </Select>
            <Input
              label="Time Threshold (hours)"
              type="number"
              placeholder="e.g., 24"
              value={ruleForm.time_threshold_hours}
              onChange={(e) => setRuleForm({ ...ruleForm, time_threshold_hours: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddRuleModal(false)}>Cancel</Button>
            <Button onClick={handleAddRule} disabled={submitting || !ruleForm.name}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Rule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Trigger Manual Escalation Modal */}
      <Modal open={showTriggerModal} onClose={() => setShowTriggerModal(false)} title="Manual Escalation" size="lg">
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Manually escalate an entity to a specific person. This will create an escalation event.
            </p>
          </div>
          <Select
            label="Entity Type"
            value={triggerForm.entity_type}
            onChange={(e) => setTriggerForm({ ...triggerForm, entity_type: e.target.value })}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </Select>
          <Input
            label="Entity ID"
            placeholder="ID of the entity to escalate"
            value={triggerForm.entity_id}
            onChange={(e) => setTriggerForm({ ...triggerForm, entity_id: e.target.value })}
          />
          <Input
            label="Escalate To (User ID)"
            placeholder="User ID of the escalation target"
            value={triggerForm.escalated_to}
            onChange={(e) => setTriggerForm({ ...triggerForm, escalated_to: e.target.value })}
          />
          <Textarea
            label="Reason"
            placeholder="Reason for escalation..."
            value={triggerForm.reason}
            onChange={(e) => setTriggerForm({ ...triggerForm, reason: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTriggerModal(false)}>Cancel</Button>
            <Button
              onClick={handleTriggerEscalation}
              disabled={submitting || !triggerForm.entity_id || !triggerForm.escalated_to || !triggerForm.reason}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
              Escalate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
