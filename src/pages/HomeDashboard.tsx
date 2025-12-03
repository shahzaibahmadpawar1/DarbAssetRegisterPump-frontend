import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid2X2, PlusCircle, List, FolderPlus, PackageSearch, Factory, UserPlus } from "lucide-react";

interface HomeDashboardProps {
  onGoPumps: () => void;
  onGoAssets: () => void;
  onGoAddCategory: () => void;
  onGoAddEmployee: () => void;
  onGoReportAssetsByCategory: () => void;
  onGoReportAllAssets: () => void;
  onGoReportAllStations: () => void;
}

export default function HomeDashboard(props: HomeDashboardProps) {
  const items = [
    {
      label: "Add Station/Department",
      icon: <Factory className="w-5 h-5" />,
      onClick: props.onGoPumps,
      buttonText: "Add", 
    },
    {
      label: "Add Asset",
      icon: <PlusCircle className="w-5 h-5" />,
      onClick: props.onGoAssets,
      buttonText: "Add", 
    },
    {
      label: "Add Category",
      icon: <FolderPlus className="w-5 h-5" />,
      onClick: props.onGoAddCategory,
      buttonText: "Add", 
    },
    {
      label: "Add Employee",
      icon: <UserPlus className="w-5 h-5" />,
      onClick: props.onGoAddEmployee,
      buttonText: "Add", 
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
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <Card key={it.label} className="hover:shadow-md transition bg-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {it.icon}
                {it.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={it.onClick} className="w-full bg-orange-500 hover:bg-orange-600">
                {/* Use the dynamic buttonText property */}
                {it.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}