import { useState, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MapPin,
  Building2,
  DollarSign,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
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

interface Property {
  id: string;
  title: string;
  type: string;
  address: string;
  city: string;
  country: string;
  occupancyStatus: string;
  estimatedValue: number;
  currency: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  areaUnit?: string;
  imageUrl?: string;
}

interface PropertiesResponse {
  data: Property[];
  total: number;
}

interface PropertyFormData {
  title: string;
  type: string;
  address: string;
  city: string;
  country: string;
  estimatedValue: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
}

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'villa', label: 'Villa' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'office', label: 'Office' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'retail', label: 'Retail' },
  { value: 'land', label: 'Land' },
];

const OCCUPANCY_STATUSES = [
  { value: '', label: 'All Status' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
];

const TYPE_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'pink' | 'yellow' | 'gray'> = {
  villa: 'purple',
  apartment: 'blue',
  townhouse: 'green',
  office: 'orange',
  warehouse: 'yellow',
  retail: 'pink',
  land: 'gray',
};

const emptyForm: PropertyFormData = {
  title: '',
  type: 'apartment',
  address: '',
  city: '',
  country: '',
  estimatedValue: '',
  bedrooms: '',
  bathrooms: '',
  area: '',
};

// ---- Component ----

export default function Properties() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, refetch } = useApi<PropertiesResponse>(
    () => api.get('/properties'),
    []
  );

  const properties = data?.data ?? [];

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.address.toLowerCase().includes(search.toLowerCase()) ||
        p.city.toLowerCase().includes(search.toLowerCase());
      const matchesType = !typeFilter || p.type === typeFilter;
      const matchesStatus = !statusFilter || p.occupancyStatus === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [properties, search, typeFilter, statusFilter]);

  const formatCurrency = (value: number, currency = 'AED') =>
    new Intl.NumberFormat('en-AE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(value);

  const updateForm = (field: keyof PropertyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/properties', {
        ...formData,
        estimatedValue: Number(formData.estimatedValue),
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
        area: formData.area ? Number(formData.area) : undefined,
      });
      setShowModal(false);
      setFormData(emptyForm);
      refetch();
    } catch {
      // Error handling is managed by the API client
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
              <div className="h-3 w-1/2 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-2/3 bg-gray-100 rounded" />
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
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} {filtered.length === 1 ? 'property' : 'properties'} found
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="!p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-3 items-center">
            <Filter className="h-4 w-4 text-gray-400 hidden md:block" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-auto min-w-[140px]"
            >
              {PROPERTY_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto min-w-[140px]"
            >
              {OCCUPANCY_STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-gray-400" />}
          title="No properties found"
          description="Try adjusting your filters, or add a new property to get started."
          action={
            <Button onClick={() => setShowModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Property
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((property) => (
            <Card
              key={property.id}
              hover
              className="cursor-pointer"
              onClick={() => navigate(`/properties/${property.id}`)}
            >
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{property.address}, {property.city}</span>
                    </div>
                  </div>
                  <Badge color={TYPE_COLORS[property.type] || 'gray'}>
                    {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  {property.bedrooms != null && (
                    <span>{property.bedrooms} bed</span>
                  )}
                  {property.bathrooms != null && (
                    <span>{property.bathrooms} bath</span>
                  )}
                  {property.area != null && (
                    <span>{property.area} {property.areaUnit || 'sqft'}</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-gray-900 font-semibold">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    {formatCurrency(property.estimatedValue, property.currency)}
                  </div>
                  <StatusBadge status={property.occupancyStatus} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card className="!p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((property) => (
                <TableRow
                  key={property.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/properties/${property.id}`)}
                >
                  <TableCell>
                    <span className="font-medium text-gray-900">{property.title}</span>
                  </TableCell>
                  <TableCell>
                    <Badge color={TYPE_COLORS[property.type] || 'gray'}>
                      {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {property.city}, {property.country}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(property.estimatedValue, property.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={property.occupancyStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Property Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Property" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Property Title"
            value={formData.title}
            onChange={(e) => updateForm('title', e.target.value)}
            placeholder="e.g. Marina Heights Tower - Unit 1201"
            required
          />

          <Select
            label="Property Type"
            value={formData.type}
            onChange={(e) => updateForm('type', e.target.value)}
            options={PROPERTY_TYPES.filter((t) => t.value !== '').map((t) => ({ value: t.value, label: t.label }))}
          />

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => updateForm('address', e.target.value)}
            placeholder="Full street address"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => updateForm('city', e.target.value)}
              placeholder="Dubai"
              required
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => updateForm('country', e.target.value)}
              placeholder="UAE"
              required
            />
          </div>

          <Input
            label="Estimated Value"
            type="number"
            value={formData.estimatedValue}
            onChange={(e) => updateForm('estimatedValue', e.target.value)}
            placeholder="1500000"
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Bedrooms"
              type="number"
              value={formData.bedrooms}
              onChange={(e) => updateForm('bedrooms', e.target.value)}
              placeholder="3"
            />
            <Input
              label="Bathrooms"
              type="number"
              value={formData.bathrooms}
              onChange={(e) => updateForm('bathrooms', e.target.value)}
              placeholder="2"
            />
            <Input
              label="Area (sqft)"
              type="number"
              value={formData.area}
              onChange={(e) => updateForm('area', e.target.value)}
              placeholder="1800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Property'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
