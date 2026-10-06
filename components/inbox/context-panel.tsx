import { Bike, Car, MapPin, Phone, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Conversation, Priority, TeamMember } from "@/types/inbox";
import { PRIORITIES, initials } from "./meta";
import { OptionSelect } from "./option-select";

const PRIORITY_OPTIONS = (Object.keys(PRIORITIES) as Priority[]).map((p) => ({ value: p, label: PRIORITIES[p].label }));

interface Props {
  conversation: Conversation;
  team: TeamMember[];
  onAssign: (name: string | null) => void;
  onPriority: (priority: Priority) => void;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// TODO(api): customer details (phone, city, rides, member-since) come from the lookup endpoints:
//   GET /support-desk/lookup/riders | /drivers | /rides/:id | /tickets/:ticketNumber
// "Tags" are display-only for now — there is no tags field/endpoint on tickets.
export function ContextPanel({ conversation: c, team, onAssign, onPriority, onClose }: Props) {
  const RoleIcon = c.role === "rider" ? Bike : Car;
  const assignOptions = [
    { value: "__none__", label: "Unassigned" },
    ...team.map((t) => ({ value: t.name, label: t.name })),
  ];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">Details</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details"><X /></Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar size="lg" className="size-14"><AvatarFallback className="text-base">{initials(c.customerName)}</AvatarFallback></Avatar>
            <div>
              <p className="font-semibold">{c.customerName}</p>
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <RoleIcon className="size-3" /> {c.role === "rider" ? "Rider" : "Driver"} · since {c.memberSince}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <span className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{c.phone}</span>
            <span className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{c.city}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-2.5 text-center">
              <p className="text-lg font-semibold">{c.totalRides}</p>
              <p className="text-xs text-muted-foreground">Total rides</p>
            </div>
            <div className="rounded-lg border p-2.5 text-center">
              <p className="text-lg font-semibold">{c.rideId ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Linked ride</p>
            </div>
          </div>

          <Separator />

          <Field label="Assigned to">
            <OptionSelect label="Assignee" className="w-full" value={c.assignedTo ?? "__none__"} options={assignOptions}
              onChange={(v) => onAssign(v === "__none__" ? null : v)} />
          </Field>
          <Field label="Priority">
            <OptionSelect label="Priority" className="w-full" value={c.priority} options={PRIORITY_OPTIONS} onChange={onPriority} />
          </Field>
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {c.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          </Field>
        </div>
      </ScrollArea>
    </aside>
  );
}
