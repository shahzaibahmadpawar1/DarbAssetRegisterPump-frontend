import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Package, Users, Building2, TrendingUp } from "lucide-react";

interface AnalyticsData {
  totalAssets: number;
  totalBatchItems: number; // Total items in all batches
  totalAssignedItems: number; // Total items assigned (with serial numbers)
  totalValue: number;
  totalAssignedValue: number; // Total value of assigned assets (station + employee)
  totalStationAssignedValue: number; // Total value assigned to stations
  totalEmployeeAssignedValue: number; // Total value assigned to employees
  totalStations: number;
  topStationsByValue: Array<{ name: string; value: number }>;
  topStationsByItems: Array<{ name: string; items: number }>;
  topEmployeesByValue: Array<{ name: string; value: number; employee_id?: string }>;
  topEmployeesByItems: Array<{ name: string; items: number; employee_id?: string }>;
  topAssetsByItems: Array<{ name: string; items: number }>;
  topAssetsByValue: Array<{ name: string; value: number }>;
  categoryDistribution: Array<{ name: string; value: number }>;
  departmentValue: Array<{ name: string; value: number }>;
  departmentEmployeeCount: Array<{ name: string; count: number }>;
}

const COLORS = ['#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5', '#FEF3C7'];

// Helper function to group small items into "Others" category
// Returns both the grouped data and a map of "Others" items for tooltips
const groupSmallItems = <T extends { name: string; [key: string]: any }>(
  data: T[],
  valueKey: string,
  thresholdPercent: number = 5 // Default: group items with less than 5% share
): { groupedData: T[]; othersItems: T[] } => {
  if (data.length === 0) return { groupedData: data, othersItems: [] };
  
  const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);
  if (total === 0) return { groupedData: data, othersItems: [] };
  
  const threshold = (total * thresholdPercent) / 100;
  const mainItems: T[] = [];
  const othersItems: T[] = [];
  let othersValue = 0;
  
  data.forEach((item) => {
    const value = Number(item[valueKey]) || 0;
    if (value >= threshold) {
      mainItems.push(item);
    } else {
      othersItems.push(item);
      othersValue += value;
    }
  });
  
  if (othersItems.length > 0) {
    const othersItem = {
      name: `Others (${othersItems.length})`,
      [valueKey]: othersValue,
      _isOthers: true, // Flag to identify "Others" in tooltips
      _othersItems: othersItems, // Store grouped items for tooltip
    } as T & { _isOthers?: boolean; _othersItems?: T[] };
    return { groupedData: [...mainItems, othersItem], othersItems };
  }
  
  return { groupedData: mainItems, othersItems: [] };
};

interface AnalyticsProps {
  onNavigate?: (view: string) => void;
}

export default function Analytics({ onNavigate }: AnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleNavigate = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  // Handle chart clicks
  const handleStationClick = (stationName: string, stationId?: number) => {
    if (stationName.includes("Others")) {
      // Navigate to all stations page
      handleNavigate("r-all-stations");
      window.history.pushState({ view: "r-all-stations" }, "All Stations", "#r-all-stations");
    } else if (stationId) {
      // Navigate to station details with ID in URL hash
      handleNavigate("r-all-stations");
      window.history.pushState({ view: "r-all-stations", stationId }, "All Stations", `#r-all-stations?stationId=${stationId}`);
    }
  };

  const handleDepartmentClick = (deptName: string, deptId?: number) => {
    if (deptName.includes("Others")) {
      // Navigate to all stations page with departments tab
      handleNavigate("r-all-stations");
      window.history.pushState({ view: "r-all-stations", tab: "departments" }, "All Stations", "#r-all-stations?tab=departments");
    } else if (deptId) {
      // Navigate to department details with ID in URL hash
      handleNavigate("r-all-stations");
      window.history.pushState({ view: "r-all-stations", tab: "departments", deptId }, "All Stations", `#r-all-stations?tab=departments&deptId=${deptId}`);
    }
  };

  const handleEmployeeClick = (employeeName: string, employeeId?: number) => {
    if (employeeName.includes("Others")) {
      // Navigate to all employees page
      handleNavigate("employees");
      window.history.pushState({ view: "employees" }, "Employees", "#employees");
    } else if (employeeId) {
      // Navigate to employees page with scroll to employee
      handleNavigate("employees");
      window.history.pushState({ view: "employees", employeeId }, "Employees", `#employees?employeeId=${employeeId}`);
    }
  };

  const handleAssetClick = (assetName: string, assetId?: number) => {
    if (assetName.includes("Others")) {
      // Navigate to all assets page
      handleNavigate("r-all-assets");
      window.history.pushState({ view: "r-all-assets" }, "All Assets", "#r-all-assets");
    } else if (assetId) {
      // Navigate to asset details with ID in URL hash
      handleNavigate("r-all-assets");
      window.history.pushState({ view: "r-all-assets", assetId }, "All Assets", `#r-all-assets?assetId=${assetId}`);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [assetsRes, pumpsRes, employeesRes, departmentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/assets`, { credentials: "include" }),
        fetch(`${API_BASE}/api/pumps`, { credentials: "include" }),
        fetch(`${API_BASE}/api/employees`, { credentials: "include" }),
        fetch(`${API_BASE}/api/departments`, { credentials: "include" }),
      ]);

      const [assets, pumps, employees, departments] = await Promise.all([
        assetsRes.json(),
        pumpsRes.json(),
        employeesRes.json(),
        departmentsRes.json(),
      ]);

      // Calculate metrics
      const totalAssets = assets?.length || 0;
      const totalValue = assets?.reduce((sum: number, asset: any) => sum + (asset.totalValue || 0), 0) || 0;
      const totalStations = pumps?.length || 0;

      // Calculate total items in all batches
      const totalBatchItems = assets?.reduce((sum: number, asset: any) => {
        const batchTotal = (asset.batches || []).reduce((batchSum: number, batch: any) => {
          return batchSum + (batch.quantity || 0);
        }, 0);
        return sum + batchTotal;
      }, 0) || 0;

      // Calculate total assigned items (items with serial numbers)
      // Count from batch_allocations (station assignments) and employee_asset_assignments
      let totalAssignedItems = 0;
      
      // Count from station assignments (batch_allocations with serial_number)
      assets?.forEach((asset: any) => {
        if (asset.assignments && asset.assignments.length > 0) {
          asset.assignments.forEach((assignment: any) => {
            if (assignment.batch_allocations && assignment.batch_allocations.length > 0) {
              assignment.batch_allocations.forEach((alloc: any) => {
                // Each allocation with a serial_number counts as one assigned item
                if (alloc.serial_number) {
                  totalAssignedItems += (alloc.quantity || 1);
                }
              });
            }
          });
        }
      });

      // Count from employee assignments - use totalAssignedToEmployees from asset data
      // This represents items assigned to employees (which should have serial numbers)
      const totalEmployeeAssigned = assets?.reduce((sum: number, asset: any) => {
        return sum + (asset.totalAssignedToEmployees || 0);
      }, 0) || 0;
      
      totalAssignedItems += totalEmployeeAssigned;

      // Top Stations by Value
      const stationValueMap = new Map<number, number>();
      const stationItemsMap = new Map<number, number>();
      
      assets?.forEach((asset: any) => {
        if (asset.assignments && asset.assignments.length > 0) {
          asset.assignments.forEach((assignment: any) => {
            const pumpId = assignment.pump_id;
            // Sum value
            const currentValue = stationValueMap.get(pumpId) || 0;
            stationValueMap.set(pumpId, currentValue + (assignment.assignment_value || 0));
            
            // Sum items (count from batch_allocations)
            const currentItems = stationItemsMap.get(pumpId) || 0;
            let itemsCount = 0;
            if (assignment.batch_allocations && assignment.batch_allocations.length > 0) {
              itemsCount = assignment.batch_allocations.reduce((sum: number, alloc: any) => {
                return sum + (alloc.quantity || 1);
              }, 0);
            } else {
              itemsCount = assignment.quantity || 0;
            }
            stationItemsMap.set(pumpId, currentItems + itemsCount);
          });
        }
      });

      const topStationsByValue = Array.from(stationValueMap.entries())
        .map(([pumpId, value]) => {
          const pump = pumps?.find((p: any) => p.id === pumpId);
          return {
            name: pump?.name || `Station #${pumpId}`,
            value: Math.round(value),
            id: pumpId,
          };
        })
        .sort((a, b) => b.value - a.value);

      const topStationsByItems = Array.from(stationItemsMap.entries())
        .map(([pumpId, items]) => {
          const pump = pumps?.find((p: any) => p.id === pumpId);
          return {
            name: pump?.name || `Station #${pumpId}`,
            items: items,
            id: pumpId,
          };
        })
        .sort((a, b) => b.items - a.items);

      // Top Employees by Value and Items
      const employeeValueMap = new Map<number, number>();
      const employeeItemsMap = new Map<number, number>();
      
      // Fetch employee assignments
      const employeeAssignmentsPromises = (employees || []).map(async (emp: any) => {
        try {
          const res = await fetch(`${API_BASE}/api/employees/${emp.id}/assignments`, { credentials: "include" });
          const assignments = await res.json();
          return { employee: emp, assignments: assignments || [] };
        } catch {
          return { employee: emp, assignments: [] };
        }
      });
      
      const employeeAssignmentsData = await Promise.all(employeeAssignmentsPromises);
      
      employeeAssignmentsData.forEach(({ employee, assignments }) => {
        let totalValue = 0;
        let totalItems = 0;
        
        assignments.forEach((assignment: any) => {
          // Employee assignments API returns batch with nested asset info
          if (assignment.batch) {
            const batch = assignment.batch;
            if (batch.purchase_price) {
              totalValue += Number(batch.purchase_price || 0);
              totalItems += 1; // Each assignment is one item
            }
          }
        });
        
        if (totalValue > 0 || totalItems > 0) {
          employeeValueMap.set(employee.id, totalValue);
          employeeItemsMap.set(employee.id, totalItems);
        }
      });

      const topEmployeesByValue = Array.from(employeeValueMap.entries())
        .map(([empId, value]) => {
          const emp = employees?.find((e: any) => e.id === empId);
          return {
            name: emp?.name || `Employee #${empId}`,
            value: Math.round(value),
            id: empId,
            employee_id: emp?.employee_id || undefined,
          };
        })
        .sort((a, b) => b.value - a.value);

      const topEmployeesByItems = Array.from(employeeItemsMap.entries())
        .map(([empId, items]) => {
          const emp = employees?.find((e: any) => e.id === empId);
          return {
            name: emp?.name || `Employee #${empId}`,
            items: items,
            id: empId,
            employee_id: emp?.employee_id || undefined,
          };
        })
        .sort((a, b) => b.items - a.items);

      // Calculate total assigned values
      const totalStationAssignedValue = Array.from(stationValueMap.values())
        .reduce((sum, value) => sum + value, 0);
      
      const totalEmployeeAssignedValue = Array.from(employeeValueMap.values())
        .reduce((sum, value) => sum + value, 0);
      
      const totalAssignedValue = totalStationAssignedValue + totalEmployeeAssignedValue;

      // Top Assets by Items and Value
      const topAssetsByItems = assets?.map((asset: any) => {
        const totalItems = (asset.batches || []).reduce((sum: number, batch: any) => {
          return sum + (batch.quantity || 0);
        }, 0);
        return {
          name: asset.asset_name || `Asset #${asset.id}`,
          items: totalItems,
          id: asset.id,
        };
      })
      .filter((a: any) => a.items > 0)
      .sort((a: any, b: any) => b.items - a.items)
      .slice(0, 10) || [];

      const topAssetsByValue = assets?.map((asset: any) => ({
        name: asset.asset_name || `Asset #${asset.id}`,
        value: Math.round(asset.totalValue || 0),
        id: asset.id,
      }))
      .filter((a: any) => a.value > 0)
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10) || [];

      // Category Distribution
      const categoryMap = new Map<string, number>();
      assets?.forEach((asset: any) => {
        const categoryName = asset.categoryName || "Uncategorized";
        const currentCount = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, currentCount + 1);
      });

      const categoryDistribution = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Department Value
      const departmentValue = departments?.map((dept: any) => ({
        name: dept.name,
        value: Math.round(dept.totalAssetValue || 0),
        id: dept.id,
      })).sort((a: any, b: any) => b.value - a.value) || [];

      // Department Employee Count
      const departmentEmployeeCount = departments?.map((dept: any) => ({
        name: dept.name,
        count: dept.employeeCount || 0,
        id: dept.id,
      })).sort((a: any, b: any) => b.count - a.count) || [];

      setData({
        totalAssets,
        totalBatchItems,
        totalAssignedItems,
        totalValue,
        totalAssignedValue,
        totalStationAssignedValue,
        totalEmployeeAssignedValue,
        totalStations,
        topStationsByValue,
        topStationsByItems,
        topEmployeesByValue,
        topEmployeesByItems,
        topAssetsByItems,
        topAssetsByValue,
        categoryDistribution,
        departmentValue,
        departmentEmployeeCount,
      });
    } catch (err: any) {
      console.error("Error loading analytics:", err);
      setError(err.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="border-2 border-destructive bg-card/80 backdrop-blur-sm shadow-lg max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">{error}</p>
            <Button
              onClick={loadAnalytics}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-muted-foreground text-lg">
                  Comprehensive insights and reports
                </p>
              </div>
            </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Assets = </span>
                  <span className="font-bold text-lg">{data.totalAssets.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Items = </span>
                  <span className="font-bold text-lg">{data.totalBatchItems.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Assigned Items = </span>
                  <span className="font-bold text-lg">{data.totalAssignedItems.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value (SAR)</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">SAR</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">SAR {formatCurrency(data.totalValue)}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned Value (SAR)</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">SAR</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">SAR {formatCurrency(data.totalAssignedValue)}</div>
                <div className="text-sm pt-2 space-y-1">
                  <div>
                    <span className="text-muted-foreground">Assigned to Station = </span>
                    <span className="font-semibold">SAR {formatCurrency(data.totalStationAssignedValue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned to Employee = </span>
                    <span className="font-semibold">SAR {formatCurrency(data.totalEmployeeAssignedValue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Stations</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalStations.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Stations */}
          <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Station Insights</CardTitle>
                  <p className="text-sm text-muted-foreground">Performance across stations</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="value" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/80 backdrop-blur-sm border-2 border-card-border shadow-sm mb-6">
                  <TabsTrigger value="value" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    By Value
                  </TabsTrigger>
                  <TabsTrigger value="items" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    By No. of Items
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="value">
                  {data.topStationsByValue.length > 0 ? (() => {
                    const { groupedData } = groupSmallItems(data.topStationsByValue, 'value', 5);
                    return (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={groupedData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" tickFormatter={formatCurrency} />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={120}
                            tick={{ fontSize: 11 }}
                            angle={0}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload[0]) return null;
                              const data = payload[0].payload;
                              const isOthers = (data as any)._isOthers;
                              const othersItems = (data as any)._othersItems || [];
                              
                              return (
                                <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-semibold text-foreground mb-1">
                                    {data.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Value: <span className="font-semibold text-foreground">SAR {data.value.toLocaleString()}</span>
                                  </p>
                                  {isOthers && othersItems.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">Includes:</p>
                                      <div className="max-h-32 overflow-y-auto">
                                        {othersItems.map((item: any, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground">
                                            • {item.name}: SAR {item.value.toLocaleString()}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="#F97316" 
                            radius={[0, 8, 8, 0]}
                            onClick={(data: any, index: number, e: any) => {
                              const payload = data.payload || data;
                              handleStationClick(payload.name, payload.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })() : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No station data available
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="items">
                  {data.topStationsByItems.length > 0 ? (() => {
                    const { groupedData } = groupSmallItems(data.topStationsByItems, 'items', 5);
                    return (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={groupedData}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={120}
                            tick={{ fontSize: 11 }}
                            angle={0}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload[0]) return null;
                              const data = payload[0].payload;
                              const isOthers = (data as any)._isOthers;
                              const othersItems = (data as any)._othersItems || [];
                              
                              return (
                                <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-semibold text-foreground mb-1">
                                    {data.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Items: <span className="font-semibold text-foreground">{data.items.toLocaleString()}</span>
                                  </p>
                                  {isOthers && othersItems.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">Includes:</p>
                                      <div className="max-h-32 overflow-y-auto">
                                        {othersItems.map((item: any, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground">
                                            • {item.name}: {item.items.toLocaleString()} items
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Bar 
                            dataKey="items" 
                            fill="#F97316" 
                            radius={[0, 8, 8, 0]}
                            onClick={(data: any, index: number, e: any) => {
                              const payload = data.payload || data;
                              handleStationClick(payload.name, payload.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })() : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No station data available
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Asset Distribution by Category */}
          <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Asset Distribution</CardTitle>
                  <p className="text-sm text-muted-foreground">By category</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.categoryDistribution.length > 0 ? (() => {
                const { groupedData } = groupSmallItems(data.categoryDistribution, 'value', 5);
                return (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={groupedData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {groupedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload[0]) return null;
                            const data = payload[0].payload;
                            const isOthers = (data as any)._isOthers;
                            const othersItems = (data as any)._othersItems || [];
                            
                            return (
                              <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold text-foreground mb-1">
                                  {data.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Count: <span className="font-semibold text-foreground">{data.value}</span>
                                </p>
                                {isOthers && othersItems.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Includes:</p>
                                    <div className="max-h-32 overflow-y-auto">
                                      {othersItems.map((item: any, idx: number) => (
                                        <p key={idx} className="text-xs text-muted-foreground">
                                          • {item.name}: {item.value}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-4 justify-center">
                      {groupedData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {item.name}: <span className="font-semibold text-foreground">{item.value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })() : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Assets Pie Chart */}
        <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Top Assets</CardTitle>
                <p className="text-sm text-muted-foreground">Leading assets by items and value</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="items" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/80 backdrop-blur-sm border-2 border-card-border shadow-sm mb-6">
                <TabsTrigger value="items" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  By No. of Items
                </TabsTrigger>
                <TabsTrigger value="value" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  By Value
                </TabsTrigger>
              </TabsList>
              <TabsContent value="items">
                {data.topAssetsByItems.length > 0 ? (() => {
                  const { groupedData } = groupSmallItems(data.topAssetsByItems, 'items', 5);
                  return (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={groupedData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="items"
                            onClick={(data: any, index: number, e: any) => {
                              const payload = data.payload || data;
                              handleAssetClick(payload.name, payload.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {groupedData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload[0]) return null;
                              const data = payload[0].payload;
                              const isOthers = (data as any)._isOthers;
                              const othersItems = (data as any)._othersItems || [];
                              
                              return (
                                <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-semibold text-foreground mb-1">
                                    {data.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Items: <span className="font-semibold text-foreground">{data.items.toLocaleString()}</span>
                                  </p>
                                  {isOthers && othersItems.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">Includes:</p>
                                      <div className="max-h-32 overflow-y-auto">
                                        {othersItems.map((item: any, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground">
                                            • {item.name}: {item.items.toLocaleString()} items
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-4 justify-center">
                        {groupedData.slice(0, 8).map((item, index) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {item.name}: <span className="font-semibold text-foreground">{item.items}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No asset data available
                  </div>
                )}
              </TabsContent>
              <TabsContent value="value">
                {data.topAssetsByValue.length > 0 ? (() => {
                  const { groupedData } = groupSmallItems(data.topAssetsByValue, 'value', 5);
                  return (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={groupedData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            onClick={(data: any, index: number, e: any) => {
                              const payload = data.payload || data;
                              handleAssetClick(payload.name, payload.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {groupedData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload[0]) return null;
                              const data = payload[0].payload;
                              const isOthers = (data as any)._isOthers;
                              const othersItems = (data as any)._othersItems || [];
                              
                              return (
                                <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-semibold text-foreground mb-1">
                                    {data.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Value: <span className="font-semibold text-foreground">SAR {data.value.toLocaleString()}</span>
                                  </p>
                                  {isOthers && othersItems.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">Includes:</p>
                                      <div className="max-h-32 overflow-y-auto">
                                        {othersItems.map((item: any, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground">
                                            • {item.name}: SAR {item.value.toLocaleString()}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-4 justify-center">
                        {groupedData.slice(0, 8).map((item, index) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {item.name}: <span className="font-semibold text-foreground">SAR {formatCurrency(item.value)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No asset data available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Employee and Department Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Insights */}
          <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Employee Insights</CardTitle>
                  <p className="text-sm text-muted-foreground">Performance across employees</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="value" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/80 backdrop-blur-sm border-2 border-card-border shadow-sm mb-6">
                  <TabsTrigger value="value" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    By Asset Value
                  </TabsTrigger>
                  <TabsTrigger value="items" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    By No. of Items Assigned
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="value">
                  {data.topEmployeesByValue.length > 0 ? (() => {
                    const { groupedData } = groupSmallItems(data.topEmployeesByValue, 'value', 5);
                    return (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                          data={groupedData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tickFormatter={formatCurrency} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload[0]) return null;
                              const data = payload[0].payload;
                              const isOthers = (data as any)._isOthers;
                              const othersItems = (data as any)._othersItems || [];
                              
                              return (
                                <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-semibold text-foreground mb-1">
                                    {data.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Value: <span className="font-semibold text-foreground">SAR {data.value.toLocaleString()}</span>
                                  </p>
                                  {isOthers && othersItems.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">Includes:</p>
                                      <div className="max-h-32 overflow-y-auto">
                                        {othersItems.map((item: any, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground">
                                            • {item.name}: SAR {item.value.toLocaleString()}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="#F97316" 
                            radius={[8, 8, 0, 0]}
                            onClick={(data: any, index: number, e: any) => {
                              const payload = data.payload || data;
                              handleEmployeeClick(payload.name, payload.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })() : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      No employee data available
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="items">
                  {data.topEmployeesByItems.length > 0 ? (() => {
                    const { groupedData } = groupSmallItems(data.topEmployeesByItems, 'items', 5);
                    return (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                          data={groupedData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload[0]) return null;
                              const data = payload[0].payload;
                              const isOthers = (data as any)._isOthers;
                              const othersItems = (data as any)._othersItems || [];
                              
                              return (
                                <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                                  <p className="font-semibold text-foreground mb-1">
                                    {data.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Items: <span className="font-semibold text-foreground">{data.items.toLocaleString()}</span>
                                  </p>
                                  {isOthers && othersItems.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">Includes:</p>
                                      <div className="max-h-32 overflow-y-auto">
                                        {othersItems.map((item: any, idx: number) => (
                                          <p key={idx} className="text-xs text-muted-foreground">
                                            • {item.name}: {item.items.toLocaleString()} items
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Bar 
                            dataKey="items" 
                            fill="#F97316" 
                            radius={[8, 8, 0, 0]}
                            onClick={(data: any, index: number, e: any) => {
                              const payload = data.payload || data;
                              handleEmployeeClick(payload.name, payload.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })() : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      No employee data available
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Department Insights */}
          <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Department Insights</CardTitle>
                <p className="text-sm text-muted-foreground">Performance across departments</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="value" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/80 backdrop-blur-sm border-2 border-card-border shadow-sm mb-6">
                <TabsTrigger value="value" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  By Value
                </TabsTrigger>
                <TabsTrigger value="employees" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  By Employee Count
                </TabsTrigger>
              </TabsList>
              <TabsContent value="value">
                {data.departmentValue.length > 0 ? (() => {
                  const { groupedData } = groupSmallItems(data.departmentValue, 'value', 5);
                  return (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={groupedData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tickFormatter={formatCurrency} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload[0]) return null;
                            const data = payload[0].payload;
                            const isOthers = (data as any)._isOthers;
                            const othersItems = (data as any)._othersItems || [];
                            
                            return (
                              <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold text-foreground mb-1">
                                  {data.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Value: <span className="font-semibold text-foreground">SAR {data.value.toLocaleString()}</span>
                                </p>
                                {isOthers && othersItems.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Includes:</p>
                                    <div className="max-h-32 overflow-y-auto">
                                      {othersItems.map((item: any, idx: number) => (
                                        <p key={idx} className="text-xs text-muted-foreground">
                                          • {item.name}: SAR {item.value.toLocaleString()}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#F97316" 
                          radius={[8, 8, 0, 0]}
                          onClick={(data: any, index: number, e: any) => {
                            const payload = data.payload || data;
                            handleDepartmentClick(payload.name, payload.id);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })() : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No department value data available
                  </div>
                )}
              </TabsContent>
              <TabsContent value="employees">
                {data.departmentEmployeeCount.length > 0 ? (() => {
                  const { groupedData } = groupSmallItems(data.departmentEmployeeCount, 'count', 5);
                  return (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={groupedData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload[0]) return null;
                            const data = payload[0].payload;
                            const isOthers = (data as any)._isOthers;
                            const othersItems = (data as any)._othersItems || [];
                            
                            return (
                              <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold text-foreground mb-1">
                                  {data.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Count: <span className="font-semibold text-foreground">{data.count}</span>
                                </p>
                                {isOthers && othersItems.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Includes:</p>
                                    <div className="max-h-32 overflow-y-auto">
                                      {othersItems.map((item: any, idx: number) => (
                                        <p key={idx} className="text-xs text-muted-foreground">
                                          • {item.name}: {item.count} employees
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#F97316" 
                          radius={[8, 8, 0, 0]}
                          onClick={(data: any, index: number, e: any) => {
                            const payload = data.payload || data;
                            handleDepartmentClick(payload.name, payload.id);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })() : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No department employee data available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

