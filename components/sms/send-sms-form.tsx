"use client";

import { useState } from "react";
import { Loader2, Send as SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCan } from "@/lib/hooks/use-desk";
import { useSendSms } from "@/lib/hooks/use-sms";
import { PhoneInput, SRI_LANKA_ISO2, isValidNumber } from "./phone-input";
import type { SendSmsForm } from "@/types/sms";

const MAX_LENGTH = 1000;

const EMPTY: SendSmsForm = { countryIso2: SRI_LANKA_ISO2, phone: "", message: "" };

export function SendSmsForm() {
  const canSend = useCan("sms.send");
  const send = useSendSms();
  const [form, setForm] = useState<SendSmsForm>(EMPTY);

  const set = <K extends keyof SendSmsForm>(key: K, value: SendSmsForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const canSubmit = canSend && isValidNumber(form.phone) && form.message.trim().length > 0 && !send.isPending;

  function submit() {
    if (!isValidNumber(form.phone)) {
      toast.error("Enter a valid mobile number");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Enter a message");
      return;
    }
    send.mutate(
      { countryIso2: form.countryIso2, phone: form.phone, message: form.message.trim() },
      { onSuccess: () => setForm(EMPTY) },
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 bg-linear-to-r from-sidebar to-sidebar-end px-5 py-4 text-sidebar-foreground">
          <SendIcon className="size-5" />
          <h1 className="text-base font-semibold">Send SMS Message</h1>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <PhoneInput phone={form.phone} onPhoneChange={(v) => set("phone", v)} />

          <div>
            <Label className="mb-1.5 text-xs font-semibold">Message</Label>
            <Textarea
              value={form.message}
              onChange={(e) => set("message", e.target.value.slice(0, MAX_LENGTH))}
              rows={5}
              placeholder="Enter your SMS message here…"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {form.message.length}/{MAX_LENGTH} characters
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/40 px-5 py-3">
          <Button variant="secondary" onClick={() => setForm(EMPTY)} disabled={send.isPending}>
            Reset
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {send.isPending ? <Loader2 className="animate-spin" /> : <SendIcon />} Send SMS
          </Button>
        </div>
      </div>
    </div>
  );
}
