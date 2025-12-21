import { Card, CardContent, CardFooter, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { MapPin, User, Package, Pencil, Trash2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

export interface Pump {
  id: number;
  name: string;
  location: string;
  manager: string;
  contact_number?: string | null;
  remarks?: string | null;
  assetCount: number;
}

interface PumpCardProps {
  pump: Pump;
  onViewAssets: (pumpId: number) => void;
  onEdit: (pumpId: number) => void;
  onDelete: (pumpId: number) => void;
}

export default function PumpCard({ pump, onViewAssets, onEdit, onDelete }: PumpCardProps) {
  const { isAdmin } = useUserRole();
  return (
    <Card 
      className="group relative overflow-hidden border-2 border-card-border bg-card/80 backdrop-blur-sm hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1" 
      data-testid={`card-pump-${pump.id}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold group-hover:text-primary transition-colors duration-300" data-testid={`text-pump-name-${pump.id}`}>
              {pump.name}
            </h3>
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(pump.id)}
                className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
                data-testid={`button-edit-pump-${pump.id}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(pump.id)}
                className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                data-testid={`button-delete-pump-${pump.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 relative z-10">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-foreground font-medium" data-testid={`text-location-${pump.id}`}>
            {pump.location}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-foreground font-medium" data-testid={`text-manager-${pump.id}`}>
            {pump.manager}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground font-medium" data-testid={`text-asset-count-${pump.id}`}>
            {pump.assetCount} {pump.assetCount === 1 ? "asset" : "assets"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="relative z-10 pt-4">
        <Button
          onClick={() => onViewAssets(pump.id)}
          className="w-full bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
          data-testid={`button-view-assets-${pump.id}`}
        >
          View Assets
        </Button>
      </CardFooter>
    </Card>
  );
}
