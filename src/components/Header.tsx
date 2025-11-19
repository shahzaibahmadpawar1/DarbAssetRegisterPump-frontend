import { Button } from "../components/ui/button";
import { Fuel, LogOut, Menu } from "lucide-react";

interface HeaderProps {
  onLogout: () => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function Header({ onLogout, onMenuClick, showMenuButton = false }: HeaderProps) {
  return (
    <header className="h-16 border-b bg-card/70 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
            data-testid="button-menu-toggle"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Fuel className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Darb Station</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Asset Management</p>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={onLogout}
        className="gap-2"
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Logout</span>
      </Button>
    </header>
  );
}
