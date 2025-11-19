import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { X } from "lucide-react";

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScannerModal({
  open,
  onClose,
  onScan,
}: BarcodeScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // todo: remove mock functionality
    // In a real implementation, this would use html5-qrcode library
    // For demo purposes, we'll show a placeholder
    if (open) {
      setIsScanning(true);
    } else {
      setIsScanning(false);
    }
  }, [open]);

  const handleMockScan = () => {
    // todo: remove mock functionality
    // Simulate a barcode scan
    const mockBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(13, "0");
    onScan(mockBarcode);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Position the barcode within the camera frame
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            {isScanning ? (
              <div className="text-center p-8">
                <div className="w-full h-full border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Camera preview would appear here</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Initializing camera...</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-scan">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleMockScan} data-testid="button-mock-scan">
              Simulate Scan (Demo)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
