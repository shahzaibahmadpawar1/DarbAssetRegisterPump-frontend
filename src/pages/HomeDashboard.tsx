import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid2X2, PlusCircle, List, FolderPlus, PackageSearch, Factory, UserPlus, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface HomeDashboardProps {
  onGoPumps: () => void;
  onGoAssets: () => void;
  onGoAddCategory: () => void;
  onGoAddEmployee: () => void;
  onGoEmployees: () => void;
  onGoReportAssetsByCategory: () => void;
  onGoReportAllAssets: () => void;
  onGoReportAllStations: () => void;
}

export default function HomeDashboard(props: HomeDashboardProps) {
  const { isAdmin, canView } = useUserRole();
  
  const items = [
    {
      label: "Add Station/Department",
      icon: <Factory className="w-5 h-5" />,
      onClick: props.onGoPumps,
      buttonText: "Add",
      requiresAdmin: true,
    },
    {
      label: "Add Asset",
      icon: <PlusCircle className="w-5 h-5" />,
      onClick: props.onGoAssets,
      buttonText: "Add",
      requiresAdmin: true,
    },
    {
      label: "Add Category",
      icon: <FolderPlus className="w-5 h-5" />,
      onClick: props.onGoAddCategory,
      buttonText: "Add",
      requiresAdmin: true,
    },
    {
      label: "Add Employee",
      icon: <UserPlus className="w-5 h-5" />,
      onClick: props.onGoAddEmployee,
      buttonText: "Add",
      requiresAdmin: true,
    },
    {
      label: "Filter by Station & Category",
      icon: <Grid2X2 className="w-5 h-5" />,
      onClick: props.onGoReportAssetsByCategory,
      buttonText: "Open", 
    },
    {
      label: "All Assets",
      icon: <PackageSearch className="w-5 h-5" />,
      onClick: props.onGoReportAllAssets,
      buttonText: "Open", 
    },
    {
      label: "All Stations/Departments",
      icon: <List className="w-5 h-5" />,
      onClick: props.onGoReportAllStations,
      buttonText: "Open", 
    },
    {
      label: "Employees",
      icon: <Users className="w-5 h-5" />,
      onClick: props.onGoEmployees,
      buttonText: "Open",
      hideForAdmin: true, // Hide for admin (they have "Add Employee" card)
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => {
          // Hide items that require admin permission if user is not admin
          if (it.requiresAdmin && !isAdmin) {
            return null;
          }
          // Hide items that should be hidden for admin
          if (it.hideForAdmin && isAdmin) {
            return null;
          }
          return (
            <Card key={it.label} className="hover:shadow-md transition bg-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {it.icon}
                  {it.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={it.onClick} className="w-full bg-orange-500 hover:bg-orange-600">
                  {it.buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}