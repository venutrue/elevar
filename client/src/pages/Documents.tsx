import { useState } from 'react';
import {
  Search,
  Plus,
  FileText,
  File,
  FileImage,
  FileSpreadsheet,
  Loader2,
  Download,
  Lock,
  Eye,
  Upload,
  FolderOpen,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import useApi from '@/hooks/useApi';
import api from '@/api/client';

// ---- Types ----

interface Document {
  id: string;
  property_id: string | null;
  property_name: string | null;
  title: string;
  description: string | null;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  is_sensitive: boolean;
  uploaded_by_name?: string;
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

const DOCUMENT_TYPES = ['lease', 'deed', 'contract', 'invoice', 'receipt', 'notice', 'inspection_report', 'insurance', 'tax', 'other'];

function fileTypeIcon(mimeType: string | null, fileName: string) {
  if (mimeType?.startsWith('image/')) return <FileImage className="w-8 h-8 text-purple-500" />;
  if (mimeType?.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.csv'))
    return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
  if (mimeType?.includes('pdf') || fileName.endsWith('.pdf'))
    return <FileText className="w-8 h-8 text-red-500" />;
  return <File className="w-8 h-8 text-blue-500" />;
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function docTypeColor(type: string): 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'yellow' | 'gray' | 'pink' {
  const map: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'yellow' | 'gray' | 'pink'> = {
    lease: 'blue',
    deed: 'purple',
    contract: 'indigo',
    invoice: 'orange',
    receipt: 'green',
    notice: 'red',
    inspection_report: 'yellow',
    insurance: 'pink',
    tax: 'gray',
    other: 'gray',
  };
  return map[type] || 'gray';
}

// ---- Component ----

export default function Documents() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    document_type: 'other',
    property_id: '',
    file_url: '',
    file_name: '',
    is_sensitive: false,
  });

  const params: Record<string, string> = {};
  if (filterType) params.document_type = filterType;
  if (filterProperty) params.property_id = filterProperty;

  const { data: docsData, loading, refetch } = useApi<PaginatedResponse<Document>>(
    () => api.get('/documents', params),
    [filterType, filterProperty]
  );

  const { data: properties } = useApi<PaginatedResponse<Property>>(
    () => api.get('/properties', { limit: '200' }),
    []
  );

  const documents = docsData?.data || [];
  const filtered = documents.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.file_name.toLowerCase().includes(q) ||
      (d.property_name && d.property_name.toLowerCase().includes(q))
    );
  });

  // Group by document type
  const grouped = filtered.reduce<Record<string, Document[]>>((acc, doc) => {
    const key = doc.document_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const handleSubmit = async () => {
    if (!form.title || !form.file_url) return;
    setSubmitting(true);
    try {
      await api.post('/documents', {
        title: form.title,
        description: form.description || undefined,
        document_type: form.document_type,
        property_id: form.property_id || undefined,
        file_url: form.file_url,
        file_name: form.file_name || form.title,
        is_sensitive: form.is_sensitive,
      });
      setShowUploadModal(false);
      setForm({ title: '', description: '', document_type: 'other', property_id: '', file_url: '', file_name: '', is_sensitive: false });
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
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Manage property documents and files</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
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
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </Select>
            <Select value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)}>
              <option value="">All Properties</option>
              {(properties?.data || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid (grouped by type) */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<FolderOpen className="w-8 h-8 text-gray-400" />}
              title="No documents found"
              description="Upload your first document or adjust your filters."
              action={
                <Button onClick={() => setShowUploadModal(true)} size="sm">
                  <Upload className="w-4 h-4 mr-1" /> Upload Document
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, docs]) => (
          <div key={type}>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Badge color={docTypeColor(type)}>
                {type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
              <span className="text-gray-400 font-normal">({docs.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {docs.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {fileTypeIcon(doc.mime_type, doc.file_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                          {doc.is_sensitive && (
                            <Lock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{doc.file_name}</p>
                        {doc.property_name && (
                          <p className="text-xs text-gray-400 mt-1">{doc.property_name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatFileSize(doc.file_size)} {doc.file_size ? ' - ' : ''}
                            {formatDate(doc.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => window.open(doc.file_url, '_blank')}>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Preview
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1">
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Upload Document Modal */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Document" size="lg">
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Document title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Select
            label="Document Type"
            value={form.document_type}
            onChange={(e) => setForm({ ...form, document_type: e.target.value })}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </Select>
          <Select
            label="Property (optional)"
            value={form.property_id}
            onChange={(e) => setForm({ ...form, property_id: e.target.value })}
          >
            <option value="">No property</option>
            {(properties?.data || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Input
            label="File URL"
            placeholder="https://storage.example.com/document.pdf"
            value={form.file_url}
            onChange={(e) => setForm({ ...form, file_url: e.target.value })}
          />
          <Input
            label="File Name"
            placeholder="document.pdf"
            value={form.file_name}
            onChange={(e) => setForm({ ...form, file_name: e.target.value })}
          />
          <Textarea
            label="Description (optional)"
            placeholder="Brief description of the document..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_sensitive"
              checked={form.is_sensitive}
              onChange={(e) => setForm({ ...form, is_sensitive: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_sensitive" className="text-sm text-gray-700 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              Mark as sensitive document
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.title || !form.file_url}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
