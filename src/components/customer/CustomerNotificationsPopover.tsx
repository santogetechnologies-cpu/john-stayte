import { useState } from "react";
import { Bell, Check, ShoppingBag, Truck, Tag, HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CustomerNotificationsPopover() {
  const [unread, setUnread] = useState(false);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unread && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
          <h4 className="font-semibold text-sm">Account Notifications</h4>
          <span className="text-xs text-muted-foreground font-medium">0 unread</span>
        </div>

        <div className="p-8 text-center space-y-1">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs font-bold text-foreground">You're all caught up</p>
          <p className="text-[11px] text-muted-foreground">No new notifications at the moment.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
