import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Scale,
  ShieldCheck,
  TicketCheck,
  Bell,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import useApi from '@/hooks/useApi';
import api from '@/api/client';

// ---- Types ----

interface DashboardStats {
  totalProperties: number;
  activeTenancies: number;
  openLegalCases: number;
  pendingCompliance: number;
  openTickets: number;
  unreadNotifications: number;
}

interface RecentActivity {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  user: string;
  timestamp: string;
}

interface FinancialSummary {
  rentCollection: { month: string; collected: number; expected: number }[];
  propertyTypes: { name: string; count: number }[];
  expensesTrend: { month: string; amount: number }[];
}

interface UpcomingItem {
  id: string;
  title: string;
  type: 'inspection' | 'compliance' | 'rent';
  date: string;
  status: string;
  property?: string;
}

interface UpcomingData {
  items: UpcomingItem[];
}

// ---- Stat Card Config ----

const statCards = [
  { key: 'totalProperties', label: 'Total Properties', icon: Building2, textColor: 'text-primary-600', bgLight: 'bg-primary-50' },
  { key: 'activeTenancies', label: 'Active Tenancies', icon: Users, textColor: 'text-secondary-600', bgLight: 'bg-secondary-50' },
  { key: 'openLegalCases', label: 'Open Legal Cases', icon: Scale, textColor: 'text-accent-600', bgLight: 'bg-accent-50' },
  { key: 'pendingCompliance', label: 'Pending Compliance', icon: ShieldCheck, textColor: 'text-orange-600', bgLight: 'bg-orange-50' },
  { key: 'openTickets', label: 'Open Tickets', icon: TicketCheck, textColor: 'text-cyan-600', bgLight: 'bg-cyan-50' },
  { key: 'unreadNotifications', label: 'Unread Notifications', icon: Bell, textColor: 'text-danger-600', bgLight: 'bg-danger-50' },
] as const;

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6', '#ec4899'];

// ---- Component ----

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: stats, loading: statsLoading } = useApi<DashboardStats>(
    () => api.get('/dashboard/stats'),
    []
  );
  const { data: activity, loading: activityLoading } = useApi<RecentActivity[]>(
    () => api.get('/dashboard/recent-activity'),
    []
  );
  const { data: financial, loading: financialLoading } = useApi<FinancialSummary>(
    () => api.get('/dashboard/financial-summary'),
    []
  );
  const { data: upcoming, loading: upcomingLoading } = useApi<UpcomingData>(
    () => api.get('/dashboard/upcoming'),
    []
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(value);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

  const rentData = useMemo(() => financial?.rentCollection ?? [], [financial]);
  const propertyTypeData = useMemo(() => financial?.propertyTypes ?? [], [financial]);
  const expensesData = useMemo(() => financial?.expensesTrend ?? [], [financial]);
  const upcomingItems = useMemo(() => upcoming?.items ?? [], [upcoming]);

  // ---- Skeleton helpers ----

  const StatSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-8 w-16 bg-gray-200 rounded" />
        </div>
        <div className="h-12 w-12 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );

  const ChartSkeleton = () => (
    <div className="h-64 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-gray-300 text-sm">Loading chart...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back. Here is an overview of your portfolio.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsLoading
          ? Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map((card) => {
              const Icon = card.icon;
              const value = stats ? stats[card.key as keyof DashboardStats] : 0;
              return (
                <Card key={card.key} className="relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    </div>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${card.bgLight}`}>
                      <Icon className={`h-6 w-6 ${card.textColor}`} />
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rent Collection Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rent Collection</CardTitle>
              <span className="text-xs text-gray-400">Last 6 months</span>
            </div>
          </CardHeader>
          <CardContent>
            {financialLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rentData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  />
                  <Legend />
                  <Bar dataKey="expected" name="Expected" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Property Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Property Types</CardTitle>
          </CardHeader>
          <CardContent>
            {financialLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={propertyTypeData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {propertyTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }} />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expenses Trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gray-400" />
                Expenses Trend
              </span>
            </CardTitle>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
        </CardHeader>
        <CardContent>
          {financialLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={expensesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Expenses"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#f43f5e' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: Recent Activity + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  Recent Activity
                </span>
              </CardTitle>
              <button
                onClick={() => navigate('/notifications')}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-gray-900">{item.user}</span>{' '}
                        {item.action}{' '}
                        <span className="font-medium text-primary-600">{item.entity}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(item.timestamp)} at {formatTime(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">No recent activity</div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  Upcoming
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-2 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingItems.length > 0 ? (
              <div className="space-y-3">
                {upcomingItems.slice(0, 8).map((item) => {
                  const overdue = isOverdue(item.date);
                  const typeIcon =
                    item.type === 'inspection' ? ShieldCheck :
                    item.type === 'compliance' ? Scale :
                    Calendar;
                  const TypeIcon = typeIcon;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          overdue ? 'bg-danger-50' : 'bg-gray-50'
                        }`}
                      >
                        <TypeIcon className={`h-5 w-5 ${overdue ? 'text-danger-500' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        {item.property && (
                          <p className="text-xs text-gray-500 truncate">{item.property}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-medium ${overdue ? 'text-danger-600' : 'text-gray-500'}`}>
                          {formatDate(item.date)}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Nothing upcoming</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
