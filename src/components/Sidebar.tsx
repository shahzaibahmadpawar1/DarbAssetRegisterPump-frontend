import { Button } from "@/components/ui/button";
import { X, Menu, FolderPlus, UserPlus, Grid2X2, PackageSearch, List, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  requiresAdmin?: boolean;
  hideForAdmin?: boolean;
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onNavigate: (view: string) => void;
}

export default function Sidebar({ open, onToggle, onNavigate }: SidebarProps) {
  const { isAdmin } = useUserRole();

  const sidebarItems: SidebarItem[] = [
    {
      label: "Categories",
      icon: <FolderPlus className="w-5 h-5" />,
      onClick: () => onNavigate("categories"),
      // Accessible to all users - Add/Delete buttons are hidden for viewing users on the page itself
    },
    {
      label: "Add Employee",
      icon: <UserPlus className="w-5 h-5" />,
      onClick: () => onNavigate("employees"),
      requiresAdmin: true,
    },
    {
      label: "Assigned Assets",
      icon: <Grid2X2 className="w-5 h-5" />,
      onClick: () => onNavigate("r-assets-by-cat"),
    },
    {
      label: "All Assets",
      icon: <PackageSearch className="w-5 h-5" />,
      onClick: () => onNavigate("r-all-assets"),
    },
    {
      label: "All Stations/Departments",
      icon: <List className="w-5 h-5" />,
      onClick: () => onNavigate("r-all-stations"),
    },
    {
      label: "Employees",
      icon: <Users className="w-5 h-5" />,
      onClick: () => onNavigate("employees"),
      hideForAdmin: true,
    },
  ];

  return (
    <>
      {/* Sidebar */}
      <div
        className={`${
          open ? "w-64" : "w-0"
        } transition-all duration-300 ease-in-out overflow-hidden border-r border-border/50 bg-card/80 backdrop-blur-sm`}
      >
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Navigation</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {sidebarItems.map((item) => {
            if (item.requiresAdmin && !isAdmin) return null;
            if (item.hideForAdmin && isAdmin) return null;
            return (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={item.onClick}
              >
                {item.icon}
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Toggle Button (when closed) */}
      {!open && (
        <div className="fixed top-20 left-4 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={onToggle}
            className="bg-card/80 backdrop-blur-sm border-2 border-border shadow-md"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      )}
    </>
  );
}

