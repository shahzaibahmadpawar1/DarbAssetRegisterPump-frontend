import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid2X2, PlusCircle, List, FolderPlus, PackageSearch, Factory, UserPlus, Users, BarChart3 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface HomeDashboardProps {
  onGoAddCategory: () => void;
  onGoAddEmployee: () => void;
  onGoEmployees: () => void;
  onGoReportAssetsByCategory: () => void;
  onGoReportAllAssets: () => void;
  onGoReportAllStations: () => void;
  onGoAnalytics?: () => void;
}

export default function HomeDashboard(props: HomeDashboardProps) {
  const { isAdmin, canView } = useUserRole();
  
  const items = [
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-6 sm:p-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome to Darb Station
          </h1>
          <p className="text-muted-foreground text-lg">
            Select a module to get started with your asset management tasks
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              <Card 
                key={it.label} 
                className="group relative overflow-hidden border-2 border-card-border bg-card/80 backdrop-blur-sm hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={it.onClick}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                      {it.icon}
                    </div>
                    <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                      {it.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      it.onClick();
                    }} 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 font-medium"
                  >
                    {it.buttonText}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}