import { Pump } from "../components/PumpCard";

interface PrintPumpsProps {
  pumps: Pump[];
}

export default function PrintPumps({ pumps }: PrintPumpsProps) {
  const currentDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="hidden print-only print:block">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-sm text-muted-foreground">{currentDate}</div>
          <div className="text-sm text-muted-foreground">Petroleum Asset Register</div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">DarbStation</h1>
        </div>

        {/* Pumps Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-foreground">
              <th className="text-left py-2 px-4 font-semibold">#</th>
              <th className="text-left py-2 px-4 font-semibold">Name</th>
              <th className="text-left py-2 px-4 font-semibold">Location</th>
              <th className="text-left py-2 px-4 font-semibold">Manager</th>
              <th className="text-left py-2 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pumps.map((pump, index) => (
              <tr key={pump.id} className="border-b border-border">
                <td className="py-3 px-4">{index + 1}</td>
                <td className="py-3 px-4">{pump.name}</td>
                <td className="py-3 px-4">{pump.location}</td>
                <td className="py-3 px-4">{pump.manager}</td>
                <td className="py-3 px-4"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-8 text-xs text-muted-foreground text-center">
          Page 1/1
        </div>
      </div>
    </div>
  );
}
