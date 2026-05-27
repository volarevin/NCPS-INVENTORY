import {
  ComposedChart,
  Line,
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
import { Calendar, Wrench, CheckCircle, UserCheck, TrendingUp, Activity, Pencil, Trash } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/button";
import { getProfilePictureUrl } from "@/lib/utils";
import { apiUrl } from '@/config/api';

const COLORS = ["#5B8FFF", "#FFB366", "#5DD37C", "#FF6B6B", "#8884d8", "#9CA3AF"]; // Added Gray for Others

const asArray = (value: any) => (Array.isArray(value) ? value : []);

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [serviceStats, setServiceStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const headers = { 'Authorization': `Bearer ${token}` };

        const [statsRes, monthlyRes, serviceRes, activityRes] = await Promise.all([
          fetch(apiUrl('/api/admin/stats'), { headers }),
          fetch(apiUrl('/api/admin/monthly-stats'), { headers }),
          fetch(apiUrl('/api/admin/service-distribution'), { headers }),
          fetch(apiUrl('/api/admin/recent-activity'), { headers })
        ]);

        const responses = [statsRes, monthlyRes, serviceRes, activityRes];
        if (responses.some((res) => res.status === 401 || res.status === 403)) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          navigate('/login');
          return;
        }

        const stats = statsRes.ok ? await statsRes.json() : {};
        const monthly = monthlyRes.ok ? await monthlyRes.json() : [];
        const services = serviceRes.ok ? await serviceRes.json() : [];
        const activity = activityRes.ok ? await activityRes.json() : [];

        setStatsData(stats);
        setMonthlyStats(asArray(monthly));
        
        // Format service stats for Pie Chart
        const safeServices = asArray(services);
        setServiceStats(safeServices.map((s: any, index: number) => ({
          name: s.name,
          value: s.value,
          color: s.name === "Others" ? "#9CA3AF" : COLORS[index % COLORS.length]
        })));

        // Format activity (Audit Logs)
        const safeActivity = asArray(activity);
        setRecentActivity(safeActivity.map((a: any) => {
          const actionText = String(a?.action || "");
          let icon = Activity;
          let color = "#5B8FFF";

          if (actionText.includes("Create") || actionText.includes("Insert")) {
             icon = CheckCircle;
             color = "#5DD37C";
          } else if (actionText.includes("Update") || actionText.includes("Edit")) {
             icon = Pencil;
             color = "#FFB366";
          } else if (actionText.includes("Delete") || actionText.includes("Remove")) {
             icon = Trash;
             color = "#FF6B6B";
          } else if (actionText.includes("Login")) {
             icon = UserCheck;
             color = "#5B8FFF";
          }

          return {
            id: a?.log_id,
            title: `${actionText || 'Activity'} ${a?.table_name || ''}`.trim(),
            user: a?.actor_username || 'System',
            time: a?.created_at ? new Date(a.created_at).toLocaleString() : 'Unknown time',
            icon,
            color,
            profile_picture: a?.profile_picture
          };
        }));

      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      }
    };

    fetchData();
  }, []);

  const formatNumber = (num: number | string) => {
    if (!num) return "0";
    return Number(num).toLocaleString();
  };

  const formatCurrency = (num: number | string) => {
    if (!num) return "₱0";
    return `₱${Number(num).toLocaleString()}`;
  };

  const stats = [
    {
      icon: Calendar,
      value: formatNumber(statsData?.today_appointments),
      label: "Today's Appointments",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      iconBg: "#5B8FFF",
    },
    {
      icon: Wrench,
      value: formatNumber(statsData?.pending_requests),
      label: "Pending Requests",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
      iconBg: "#FFB366",
    },
    {
      icon: TrendingUp,
      value: formatCurrency(statsData?.actual_revenue),
      label: "Actual Revenue",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      iconBg: "#5DD37C",
    },
    {
      icon: Activity,
      value: formatCurrency(statsData?.projected_revenue),
      label: "Projected Revenue",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      iconBg: "#8884d8",
    },
    {
      icon: TrendingUp,
      value: formatCurrency((Number(statsData?.actual_revenue || 0) + Number(statsData?.projected_revenue || 0))),
      label: "Combined Revenue",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      iconBg: "#3B82F6",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Dashboard Overview" 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card p-6 rounded-2xl shadow-sm border border-border flex items-center space-x-4"
          >
            <div
              className={`p-3 rounded-xl ${stat.bgColor}`}
            >
              <stat.icon
                className="w-6 h-6"
                style={{ color: stat.iconBg }}
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Appointments & Revenue Chart */}
        <div className="lg:col-span-2 bg-card p-6 rounded-2xl shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Monthly Performance
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  yAxisId="left" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(value) => `₱${value/1000}k`} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    color: "hsl(var(--popover-foreground))"
                  }}
                  itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                  formatter={(value: any, name: string) => [
                    name === "Revenue" ? `₱${Number(value).toLocaleString()}` : value,
                    name
                  ]}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                <Bar
                  yAxisId="left"
                  dataKey="appointments"
                  name="Appointments"
                  fill="#5B8FFF"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue"
                  stroke="#FFB366" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#FFB366", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Recent Audit Logs
            </h3>
            <Button variant="secondary" size="sm" onClick={() => onNavigate('Audit Logs')}>
              View all
            </Button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <img 
                  src={getProfilePictureUrl(activity.profile_picture) || "https://github.com/shadcn.png"} 
                  alt={activity.user} 
                  className="w-8 h-8 rounded-full object-cover" 
                  onError={(e) => (e.currentTarget.src = "https://github.com/shadcn.png")} 
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <activity.icon className="w-4 h-4" style={{ color: activity.color }} />
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    by <span className="text-sky-500 dark:text-sky-400">{activity.user}</span> • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Distribution */}
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Service Distribution
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={serviceStats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {serviceStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--popover-foreground))"
                }}
                itemStyle={{ color: "hsl(var(--popover-foreground))" }}
              />
              <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
