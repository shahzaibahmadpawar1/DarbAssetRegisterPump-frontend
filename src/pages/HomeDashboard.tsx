import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid2X2, PlusCircle, List, FolderPlus, PackageSearch, Factory } from "lucide-react";

interface HomeDashboardProps {
  onGoPumps: () => void;
  onGoAssets: () => void;
  onGoAddCategory: () => void;
  onGoReportAssetsByCategory: () => void;
  onGoReportAllAssets: () => void;
  onGoReportAllStations: () => void;
}

export default function HomeDashboard(props: HomeDashboardProps) {
  const items = [
    {
      label: "Add Station",
      icon: <Factory className="w-5 h-5" />,
      onClick: props.onGoPumps,
    },
    {
      label: "Add Asset",
      icon: <PlusCircle className="w-5 h-5" />,
      onClick: props.onGoAssets,
    },
    {
      label: "Add Category",
      icon: <FolderPlus className="w-5 h-5" />,
      onClick: props.onGoAddCategory,
    },
    {
      label: "Filter by Station & Category",
      icon: <Grid2X2 className="w-5 h-5" />,
      onClick: props.onGoReportAssetsByCategory,
    },
    {
      label: "All Assets",
      icon: <PackageSearch className="w-5 h-5" />,
      onClick: props.onGoReportAllAssets,
    },
    {
      label: "All Stations",
      icon: <List className="w-5 h-5" />,
      onClick: props.onGoReportAllStations,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <Card key={it.label} className="hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {it.icon}
                {it.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={it.onClick} className="w-full">
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
