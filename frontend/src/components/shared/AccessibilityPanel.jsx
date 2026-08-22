import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Type, Contrast, MousePointer2, MoveDiagonal, Languages } from "lucide-react";
import { IDS } from "@/constants/testIds";

export default function AccessibilityPanel({ trigger }) {
  const { a11y, update, language, t } = useApp();
  const [open, setOpen] = useState(false);

  const setA11y = (patch) => update((s) => ({ ...s, a11y: { ...s.a11y, ...patch } }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            data-testid={IDS.a11yOpen}
            aria-label="Open accessibility settings"
            className="inline-flex items-center gap-2 rounded-full border border-brand-900/15 bg-white px-3 py-2 text-sm font-medium text-brand-900 shadow-sm hover:bg-brand-50 transition-colors"
          >
            <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">{t("a11y.title")}</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{t("a11y.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2"><Type className="h-4 w-4" /> {t("a11y.textSize")}</label>
            <Slider data-testid="a11y-scale-slider" min={0.9} max={1.4} step={0.05}
              value={[a11y.scale]} onValueChange={([v]) => setA11y({ scale: v })} />
            <div className="text-xs text-muted-foreground mt-1">Current: {Math.round(a11y.scale * 100)}%</div>
          </div>
          {[
            { key: "highContrast", label: t("a11y.contrast"), icon: <Contrast className="h-4 w-4" /> },
            { key: "reduceMotion", label: t("a11y.motion"), icon: <MoveDiagonal className="h-4 w-4" /> },
            { key: "dyslexia", label: t("a11y.dyslexia"), icon: <Type className="h-4 w-4" /> },
            { key: "largeButtons", label: t("a11y.large"), icon: <MousePointer2 className="h-4 w-4" /> },
            { key: "simple", label: t("a11y.simple"), icon: <Type className="h-4 w-4" /> },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">{row.icon}{row.label}</div>
              <Switch data-testid={`a11y-${row.key}`} checked={!!a11y[row.key]} onCheckedChange={(v) => setA11y({ [row.key]: v })} />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm"><Languages className="h-4 w-4" />{t("a11y.language")}</div>
            <Select value={language} onValueChange={(v) => update({ language: v })}>
              <SelectTrigger className="w-[160px]" data-testid={IDS.langSwitcher}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button data-testid="a11y-reset-btn" variant="outline"
            onClick={() => setA11y({ scale: 1, highContrast: false, reduceMotion: false, dyslexia: false, largeButtons: false, simple: false })}>
            Reset
          </Button>
          <Button data-testid="a11y-done-btn" onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
