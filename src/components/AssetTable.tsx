import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";

export interface AssetAssignment {
  id: number;
  pump_id: number;
  pump_name?: string | null;
  quantity: number;
  assignment_value?: number | null;
}

export interface Asset {
  id: number;
  serial_number: string;
  asset_name: string;
  asset_number: string;
  barcode: string | null;
  quantity: number | null;
  units: string | null;
  remarks?: string | null;
  categoryName?: string | null;
  asset_value?: number | null;
  totalAssigned?: number;
  totalAssignedValue?: number | null;
  remainingQuantity?: number;
  remainingValue?: number | null;
  totalValue?: number | null;
  assignments?: AssetAssignment[];
}

interface AssetTableProps {
  assets: Asset[];
  onEdit: (assetId: number) => void;
  onDelete: (assetId: number) => void;
  mode?: "global" | "station";
}

export default function AssetTable({
  assets,
  onEdit,
  onDelete,
  mode = "global",
}: AssetTableProps) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No assets found. Click "Add Asset" to get started.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Serial No.</TableHead>
              <TableHead className="font-semibold">Asset Name</TableHead>
              <TableHead className="font-semibold">Asset No.</TableHead>
              <TableHead className="font-semibold">Barcode</TableHead>
              <TableHead className="font-semibold">Quantity</TableHead>
              <TableHead className="font-semibold">Assigned</TableHead>
              <TableHead className="font-semibold">Remaining</TableHead>
              <TableHead className="font-semibold">Stations</TableHead>
              <TableHead className="font-semibold">Unit Value</TableHead>
              <TableHead className="font-semibold">
                {mode === "station" ? "Assigned Value" : "Total Value"}
              </TableHead>
              <TableHead className="font-semibold">Units</TableHead>
              <TableHead className="font-semibold">Remarks</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id} data-testid={`row-asset-${asset.id}`}>
                <TableCell className="font-mono text-sm" data-testid={`text-serial-${asset.id}`}>
                  {asset.serial_number}
                </TableCell>
                <TableCell data-testid={`text-asset-name-${asset.id}`}>
                  {asset.asset_name}
                </TableCell>
                <TableCell className="font-mono text-sm" data-testid={`text-asset-number-${asset.id}`}>
                  {asset.asset_number}
                </TableCell>
                <TableCell className="font-mono text-sm" data-testid={`text-barcode-${asset.id}`}>
                  {asset.barcode}
                </TableCell>
                <TableCell data-testid={`text-quantity-${asset.id}`}>
                  {asset.quantity ?? "—"}
                </TableCell>
                <TableCell data-testid={`text-total-assigned-${asset.id}`}>
                  {asset.totalAssigned ?? 0}
                </TableCell>
                <TableCell data-testid={`text-remaining-${asset.id}`}>
                  {asset.remainingQuantity ?? (asset.quantity ?? 0)}
                </TableCell>
                <TableCell data-testid={`text-assignments-${asset.id}`}>
                  {asset.assignments && asset.assignments.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {asset.assignments.map((assignment) => (
                        <span
                          key={assignment.id}
                          className="text-sm text-muted-foreground"
                        >
                          {assignment.pump_name || `Pump #${assignment.pump_id}`} ·{" "}
                          {assignment.quantity}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {asset.asset_value != null ? asset.asset_value : "—"}
                </TableCell>
                <TableCell className="font-semibold">
                  {mode === "station"
                    ? asset.totalAssignedValue ?? 0
                    : asset.totalValue ?? 0}
                </TableCell>
                <TableCell data-testid={`text-units-${asset.id}`}>
                  {asset.units || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm" data-testid={`text-remarks-${asset.id}`}>
                  {asset.remarks || "-"}
                </TableCell>
                <TableCell>
                  {asset.categoryName || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(asset.id)}
                      data-testid={`button-edit-asset-${asset.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(asset.id)}
                      data-testid={`button-delete-asset-${asset.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}