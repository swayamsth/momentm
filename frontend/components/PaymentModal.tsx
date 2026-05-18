"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, CreditCard, Lock, Loader2, Sparkles } from "lucide-react";
import { usePremium } from "@/hooks/usePremium";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

export function PaymentModal({ open, onClose, onSuccess }: Props) {
  const { activatePremium } = usePremium();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    setError("");
    const rawCard = cardNumber.replace(/\s/g, "");
    if (rawCard.length !== 16) { setError("Please enter a valid 16-digit card number."); return; }
    if (expiry.length !== 5) { setError("Please enter a valid expiry date (MM/YY)."); return; }
    if (cvv.length < 3) { setError("Please enter a valid CVV."); return; }
    if (!name.trim()) { setError("Please enter the cardholder name."); return; }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    activatePremium();
    setLoading(false);
    setSuccess(true);
    onSuccess?.();
  };

  const handleClose = () => {
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setName("");
    setError("");
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {success ? (
          <div className="flex flex-col items-center text-center gap-4 p-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold mb-1">You&apos;re Premium!</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Your account has been upgraded. Enjoy unlimited loops, daily AI recalibration, and more for the next 30 days.
              </p>
            </div>
            <Button className="w-full gradient-bg" onClick={handleClose}>Get started</Button>
          </div>
        ) : (
          <>
            {/* Plan summary */}
            <div className="gradient-bg p-5 text-primary-foreground">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Momentm Premium</span>
              </div>
              <div className="text-3xl font-bold">$12<span className="text-base font-normal opacity-80">/month</span></div>
              <p className="text-xs opacity-75 mt-1">Unlimited loops · Daily AI · Priority rewards</p>
            </div>

            <div className="p-5 space-y-4">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Card details
              </DialogTitle>

              {/* Test card hint */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-0.5">
                <p className="font-semibold">Test card details:</p>
                <p>Card: <span className="font-mono">4242 4242 4242 4242</span></p>
                <p>Expiry: <span className="font-mono">12/28</span> &nbsp; CVV: <span className="font-mono">123</span></p>
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1">Cardholder name</Label>
                  <Input
                    placeholder="Jenish Ranjit"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1">Card number</Label>
                  <Input
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1">Expiry (MM/YY)</Label>
                    <Input
                      placeholder="12/28"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1">CVV</Label>
                    <Input
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              <Button className="w-full gradient-bg" onClick={handlePay} disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
                ) : (
                  <><Lock className="w-4 h-4 mr-2" />Pay $12.00</>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Secured · Cancel anytime
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
