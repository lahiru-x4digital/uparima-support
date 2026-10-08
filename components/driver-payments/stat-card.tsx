import { Card, CardContent } from "@/components/ui/card";
import { formatLkr } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A headline money figure with an icon. `tone` colours the icon (a text colour class). */
export function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className={cn("rounded-lg bg-muted p-2", tone)}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{formatLkr(value)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
