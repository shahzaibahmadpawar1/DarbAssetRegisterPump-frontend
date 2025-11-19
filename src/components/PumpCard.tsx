import { Card, CardContent, CardFooter, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { MapPin, User, Package, Pencil, Trash2 } from "lucide-react";

export interface Pump {
  id: number;
  name: string;
  location: string;
  manager: string;
  assetCount: number;
}

interface PumpCardProps {
  pump: Pump;
  onViewAssets: (pumpId: number) => void;
  onEdit: (pumpId: number) => void;
  onDelete: (pumpId: number) => void;
}

export default function PumpCard({ pump, onViewAssets, onEdit, onDelete }: PumpCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-pump-${pump.id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xl font-semibold" data-testid={`text-pump-name-${pump.id}`}>
              {pump.name}
            </h3>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(pump.id)}
              data-testid={`button-edit-pump-${pump.id}`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(pump.id)}
              data-testid={`button-delete-pump-${pump.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground" data-testid={`text-location-${pump.id}`}>
            {pump.location}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground" data-testid={`text-manager-${pump.id}`}>
            {pump.manager}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground" data-testid={`text-asset-count-${pump.id}`}>
            {pump.assetCount} {pump.assetCount === 1 ? "asset" : "assets"}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onViewAssets(pump.id)}
          className="w-full"
          data-testid={`button-view-assets-${pump.id}`}
        >
          View Assets
        </Button>
      </CardFooter>
    </Card>
  );
}
