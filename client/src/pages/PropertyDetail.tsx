import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  Building2,
  Users,
  Scale,
  ShieldCheck,
  ClipboardCheck,
  Wrench,
  FileText,
  DollarSign,
  MapPin,
  Calendar,
  Edit,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
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

interface Property {
  id: string;
  title: string;
  type: string;
  address: string;
  city: string;
  country: string;
  occupancyStatus: string;
  estimatedValue: number;
  marketValue?: number;
  currency: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  areaUnit?: string;
  yearBuilt?: number;
  description?: string;
  createdAt: string;
}

interface Owner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ownershipPercentage: number;
  type: string;
}

interface Tenancy {
  id: string;
  tenantName: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  status: string;
}

interface LegalCase {
  id: string;
  caseNumber: string;
  caseType: string;
  status: string;
  priority: string;
  title: string;
  createdAt: string;
}

interface ComplianceCheck {
  id: string;
  checkType: string;
  status: string;
  dueDate: string;
  assignedTo?: string;
}

interface Inspection {
  id: string;
  type: string;
  scheduledDate: string;
  status: string;
  inspector?: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  size?: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: string;
}

// ---- Tabs Config ----

type TabKey = 'overview' | 'owners' | 'tenancies' | 'legal' | 'compliance' | 'inspections' | 'maintenance' | 'documents' | 'expenses';

const tabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: 'overview', label: 'Overview', icon: Home },
  { key: 'owners', label: 'Owners', icon: Users },
  { key: 'tenancies', label: 'Tenancies', icon: Building2 },
  { key: 'legal', label: 'Legal Cases', icon: Scale },
  { key: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { key: 'inspections', label: 'Inspections', icon: ClipboardCheck },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'expenses', label: 'Expenses', icon: DollarSign },
];

// ---- Helpers ----

const formatCurrency = (value: number, currency = 'AED') =>
  new Intl.NumberFormat('en-AE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// ---- Component ----

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const { data: property, loading } = useApi<Property>(
    () => api.get(`/properties/${id}`),
    [id]
  );

  const { data: owners } = useApi<Owner[]>(
    () => api.get(`/properties/${id}/owners`),
    [id]
  );

  const { data: tenancies } = useApi<Tenancy[]>(
    () => api.get(`/properties/${id}/tenancies`),
    [id]
  );

  const { data: legalCases } = useApi<LegalCase[]>(
    () => api.get(`/properties/${id}/legal-cases`),
    [id]
  );

  const { data: complianceChecks } = useApi<ComplianceCheck[]>(
    () => api.get(`/properties/${id}/compliance`),
    [id]
  );

  const { data: inspections } = useApi<Inspection[]>(
    () => api.get(`/properties/${id}/inspections`),
    [id]
  );

  const { data: maintenance } = useApi<MaintenanceRequest[]>(
    () => api.get(`/properties/${id}/maintenance`),
    [id]
  );

  const { data: documents } = useApi<Document[]>(
    () => api.get(`/properties/${id}/documents`),
    [id]
  );

  const { data: expenses } = useApi<Expense[]>(
    () => api.get(`/properties/${id}/expenses`),
    [id]
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-12 w-full bg-gray-100 rounded-lg" />
        <div className="h-64 w-full bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!property) {
    return (
      <EmptyState
        icon={<Building2 className="h-8 w-8 text-gray-400" />}
        title="Property not found"
        description="The property you are looking for does not exist or has been removed."
        action={
          <Button variant="outline" onClick={() => navigate('/properties')}>
            Back to Properties
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <button onClick={() => navigate('/properties')} className="hover:text-primary-600 transition-colors">
          Properties
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium truncate max-w-xs">{property.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
            <StatusBadge status={property.occupancyStatus} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {property.address}, {property.city}, {property.country}
            </span>
            <Badge color="blue">{property.type}</Badge>
          </div>
        </div>
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit Property
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 overflow-x-auto -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent>
                {property.description && (
                  <p className="text-sm text-gray-600 mb-4">{property.description}</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoItem label="Type" value={property.type} />
                  <InfoItem label="Bedrooms" value={property.bedrooms?.toString() ?? 'N/A'} />
                  <InfoItem label="Bathrooms" value={property.bathrooms?.toString() ?? 'N/A'} />
                  <InfoItem label="Area" value={property.area ? `${property.area} ${property.areaUnit || 'sqft'}` : 'N/A'} />
                  <InfoItem label="Year Built" value={property.yearBuilt?.toString() ?? 'N/A'} />
                  <InfoItem label="Listed" value={formatDate(property.createdAt)} />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Valuation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Estimated Value</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(property.estimatedValue, property.currency)}
                    </p>
                  </div>
                  {property.marketValue && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Market Value</p>
                      <p className="text-xl font-bold text-secondary-600">
                        {formatCurrency(property.marketValue, property.currency)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <QuickStat label="Owners" value={owners?.length ?? 0} />
                  <QuickStat label="Active Tenancies" value={tenancies?.filter((t) => t.status === 'active').length ?? 0} />
                  <QuickStat label="Open Cases" value={legalCases?.filter((c) => c.status === 'open').length ?? 0} />
                  <QuickStat label="Pending Compliance" value={complianceChecks?.filter((c) => c.status === 'pending').length ?? 0} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Owners Tab */}
        {activeTab === 'owners' && (
          <Card className="!p-0 overflow-hidden">
            {owners && owners.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Ownership %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((owner) => (
                    <TableRow key={owner.id}>
                      <TableCell className="font-medium">{owner.name}</TableCell>
                      <TableCell>{owner.email}</TableCell>
                      <TableCell>{owner.phone || '-'}</TableCell>
                      <TableCell><Badge color="blue">{owner.type}</Badge></TableCell>
                      <TableCell>{owner.ownershipPercentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No owners" description="No ownership records for this property." />
            )}
          </Card>
        )}

        {/* Tenancies Tab */}
        {activeTab === 'tenancies' && (
          <Card className="!p-0 overflow-hidden">
            {tenancies && tenancies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Lease Period</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenancies.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.tenantName}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(t.leaseStart)} - {formatDate(t.leaseEnd)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(t.monthlyRent)}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No tenancies" description="No tenancy records for this property." />
            )}
          </Card>
        )}

        {/* Legal Cases Tab */}
        {activeTab === 'legal' && (
          <Card className="!p-0 overflow-hidden">
            {legalCases && legalCases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legalCases.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.caseNumber}</TableCell>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell><Badge color="blue">{c.caseType}</Badge></TableCell>
                      <TableCell><StatusBadge status={c.priority} /></TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-gray-500">{formatDate(c.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No legal cases" description="No legal cases for this property." />
            )}
          </Card>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <Card className="!p-0 overflow-hidden">
            {complianceChecks && complianceChecks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceChecks.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.checkType}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell>
                        <span className={new Date(c.dueDate) < new Date() ? 'text-danger-600 font-medium' : ''}>
                          {formatDate(c.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell>{c.assignedTo || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No compliance checks" description="No compliance records for this property." />
            )}
          </Card>
        )}

        {/* Inspections Tab */}
        {activeTab === 'inspections' && (
          <Card className="!p-0 overflow-hidden">
            {inspections && inspections.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((insp) => (
                    <TableRow key={insp.id}>
                      <TableCell className="font-medium">{insp.type}</TableCell>
                      <TableCell>{formatDate(insp.scheduledDate)}</TableCell>
                      <TableCell>{insp.inspector || '-'}</TableCell>
                      <TableCell><StatusBadge status={insp.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No inspections" description="No inspection records for this property." />
            )}
          </Card>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <Card className="!p-0 overflow-hidden">
            {maintenance && maintenance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell><StatusBadge status={m.priority} /></TableCell>
                      <TableCell><StatusBadge status={m.status} /></TableCell>
                      <TableCell className="text-gray-500">{formatDate(m.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No maintenance requests" description="No maintenance records for this property." />
            )}
          </Card>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <Card className="!p-0 overflow-hidden">
            {documents && documents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{doc.name}</span>
                        </span>
                      </TableCell>
                      <TableCell><Badge color="gray">{doc.type}</Badge></TableCell>
                      <TableCell className="text-gray-500">{formatDate(doc.uploadedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No documents" description="No documents uploaded for this property." />
            )}
          </Card>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <Card className="!p-0 overflow-hidden">
            {expenses && expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell><Badge color="gray">{exp.category}</Badge></TableCell>
                      <TableCell className="font-medium">{formatCurrency(exp.amount)}</TableCell>
                      <TableCell className="text-gray-500">{formatDate(exp.date)}</TableCell>
                      <TableCell><StatusBadge status={exp.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No expenses" description="No expense records for this property." />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
