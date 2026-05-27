import { PageHeader } from "./PageHeader";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  Users,
  Wrench,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Star,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getProfilePictureUrl } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const COLORS = ['#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA', '#22D3EE', '#F87171', '#10B981'];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const asArray = (value: any) => (Array.isArray(value) ? value : []);

function parseMonthLabel(label: string) {
  const match = /^([A-Za-z]{3})\s+(\d{4})$/.exec(label.trim());
  if (!match) return null;

  const monthIndex = MONTH_LABELS.indexOf(match[1]);
  if (monthIndex === -1) return null;

  const year = Number(match[2]);
  if (!Number.isFinite(year)) return null;

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

export function Reports() {
  const navigate = useNavigate();
  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };
  const getMonthRangeFromLabel = (label: string) => {
    const parsed = parseMonthLabel(label);
    if (!parsed) {
      return getCurrentMonthRange();
    }

    return parsed;
  };
  const [summary, setSummary] = useState<any>({
    total: 0,
    completed: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any[]>([]);
  const [peakDays, setPeakDays] = useState<any[]>([]);
  const [cancellationReasonsData, setCancellationReasonsData] = useState<any[]>([]);
  const [revenueStats, setRevenueStats] = useState<any>({
    actualRevenue: 0,
    projectedRevenue: 0,
    combinedRevenue: 0,
    avgPerAppointment: 0
  });
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const queryParams = new URLSearchParams();
      if (dateRange.start) queryParams.append('startDate', dateRange.start);
      if (dateRange.end) queryParams.append('endDate', dateRange.end);

      const response = await fetch(`http://localhost:5000/api/admin/reports?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch reports');
      
      const data = await response.json();
      
      setSummary(data.summary || {
        total: 0,
        completed: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
      });
      setMonthlyData(asArray(data.monthly));
      setServiceData(asArray(data.services));
      setStaffData(asArray(data.staff));
      setPeakHours(asArray(data.peakHours));
      setPeakDays(asArray(data.peakDays));
      setCancellationReasonsData(asArray(data.cancellationReasons).map((c: any, i: number) => ({
        ...c,
        color: COLORS[i % COLORS.length]
      })));
      setRevenueStats(data.revenueStats || {
        actualRevenue: 0,
        projectedRevenue: 0,
        combinedRevenue: 0,
        avgPerAppointment: 0
      });

      if (
        dateRange.start === getCurrentMonthRange().start &&
        dateRange.end === getCurrentMonthRange().end &&
        (!data.summary || Number(data.summary.total) === 0) &&
        (!Array.isArray(data.monthly) || data.monthly.length === 0)
      ) {
        const fallbackResponse = await fetch('http://localhost:5000/api/admin/reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackMonthly = asArray(fallbackData.monthly);
          const latestMonth = fallbackMonthly.length > 0
            ? fallbackMonthly[fallbackMonthly.length - 1]?.month
            : null;

          if (latestMonth) {
            setDateRange(getMonthRangeFromLabel(latestMonth));
            return;
          }
        }
      }

    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const queryParams = new URLSearchParams();
      if (dateRange.start) queryParams.append('startDate', dateRange.start);
      if (dateRange.end) queryParams.append('endDate', dateRange.end);

      const response = await fetch(`http://localhost:5000/api/admin/reports/export?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to export reports');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detailed_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader title="Reports & Analytics" />
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border shadow-sm flex-wrap">
          <input 
            type="date" 
            className="bg-transparent border-none text-sm focus:ring-0 text-foreground"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          <span className="text-muted-foreground">-</span>
          <input 
            type="date" 
            className="bg-transparent border-none text-sm focus:ring-0 text-foreground"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Total Bookings"
          value={summary.total}
          color="#5B8FFF"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Completed"
          value={summary.completed}
          color="#5DD37C"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Pending"
          value={summary.pending}
          color="#FFB366"
        />
        <StatCard
          icon={<XCircle className="w-5 h-5" />}
          label="Cancelled"
          value={summary.cancelled}
          color="#FF6B6B"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-card border border-border p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Popularity */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Service Popularity
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                      cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    />
                    <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
                      {serviceData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Technician Performance */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Technician Performance
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {staffData.map((staff: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/technicians`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={getProfilePictureUrl(staff.profile_picture)} />
                        <AvatarFallback>{staff.first_name?.[0]}{staff.last_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{staff.first_name} {staff.last_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {staff.totalAssigned} Assigned • {staff.totalHandled} Completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-lg">
                      <Star className="w-3 h-3 text-yellow-600 dark:text-yellow-400 fill-current" />
                      <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">
                        {Number(staff.rating).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Revenue Report Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={<DollarSign className="w-6 h-6" />}
              label="Actual Revenue"
              value={`₱${(revenueStats.actualRevenue / 1000).toFixed(1)}K`}
              color="#5DD37C"
            />
            <StatCard
              icon={<Activity className="w-6 h-6" />}
              label="Projected Revenue"
              value={`₱${(revenueStats.projectedRevenue / 1000).toFixed(1)}K`}
              color="#8884d8"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Combined Revenue"
              value={`₱${(revenueStats.combinedRevenue / 1000).toFixed(1)}K`}
              color="#3B82F6"
            />
          </div>

          {/* Monthly Revenue Chart */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Monthly Revenue Trend
              </h3>
              <button onClick={handleExport} className="text-sm text-primary hover:underline">
                Export CSV
              </button>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `₱${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="revenue" fill="#5DD37C" name="Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Appointment Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Peak Hours */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Peak Booking Hours
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }} />
                  <Bar dataKey="bookings" fill="#5B8FFF" name="Bookings" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Days */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Peak Booking Days
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakDays}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }} />
                    <Bar dataKey="bookings" fill="#7B9B7C" name="Bookings" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cancellation Reasons */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-primary" />
                Cancellation Reasons
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cancellationReasonsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }: any) =>
                        `${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="category"
                    >
                      {cancellationReasonsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }} />
                    <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl text-foreground font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
