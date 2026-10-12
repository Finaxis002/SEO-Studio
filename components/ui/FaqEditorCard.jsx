"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function parseBulkFaqText(text, format = "auto") {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const questionPrefix = /^(?:Q(?:UESTION)?\s*\d*\s*[:.)-])\s*(.*)$/i;
  const answerPrefix = /^(?:A(?:NSWER)?\s*\d*\s*[:.)-])\s*(.*)$/i;
  const numberedQuestion = /^\d+[.)]\s+(.+)$/;
  const detectedFormat =
    format === "auto"
      ? lines.some(
          (line) => questionPrefix.test(line) || answerPrefix.test(line)
        )
        ? "qa"
        : lines.some((line) => numberedQuestion.test(line))
          ? "numbered"
          : "line-separated"
      : format;

  if (detectedFormat === "line-separated") {
    if (lines.length < 2 || lines.length % 2 !== 0) return null;
    return Array.from({ length: lines.length / 2 }, (_, index) => ({
      question: lines[index * 2],
      answer: lines[index * 2 + 1],
    }));
  }

  const pairs = [];
  let current = null;
  let section = detectedFormat === "numbered" ? "answer" : "question";
  let invalid = false;

  const finishPair = () => {
    if (!current) return;
    if (current.question.trim() && current.answer.trim()) {
      pairs.push({
        question: current.question.trim(),
        answer: current.answer.trim(),
      });
    } else {
      invalid = true;
    }
    current = null;
  };

  for (const line of lines) {
    const questionMatch =
      detectedFormat === "qa" ? line.match(questionPrefix) : null;
    const answerMatch =
      detectedFormat === "qa" ? line.match(answerPrefix) : null;
    const numberedMatch =
      detectedFormat === "numbered" ? line.match(numberedQuestion) : null;

    if (questionMatch) {
      finishPair();
      current = { question: questionMatch[1].trim(), answer: "" };
      section = "question";
    } else if (answerMatch) {
      if (!current || !current.question.trim()) {
        invalid = true;
        continue;
      }
      current.answer = [current.answer, answerMatch[1].trim()]
        .filter(Boolean)
        .join("\n");
      section = "answer";
    } else if (numberedMatch) {
      finishPair();
      current = { question: numberedMatch[1].trim(), answer: "" };
      section = "answer";
    } else if (!current) {
      invalid = true;
    } else if (section === "question") {
      current.question = [current.question, line].filter(Boolean).join("\n");
    } else {
      current.answer = [current.answer, line].filter(Boolean).join("\n");
    }
  }

  finishPair();
  return invalid || pairs.length === 0 ? null : pairs;
}

const FAQ_IMPORT_EXAMPLES = {
  auto: "Q: How do I get started?\nA: Open Settings and follow the setup steps.\n\nQ: Can I change this later?\nA: Yes, update it anytime from your account.",
  qa: "Q: How do I get started?\nA: Open Settings and follow the setup steps.\n\nQ: Can I change this later?\nA: Yes, update it anytime from your account.",
  numbered:
    "1. How do I get started?\nOpen Settings and follow the setup steps.\n\n2. Can I change this later?\nYes, update it anytime from your account.",
  "line-separated":
    "How do I get started?\nOpen Settings and follow the setup steps.\n\nCan I change this later?\nYes, update it anytime from your account.",
};

const FAQ_IMPORT_HINTS = {
  auto: "Use Q:/A:, numbered questions with answers on the next line, or alternating question and answer lines. The format will be detected automatically.",
  qa: "Format example: Q: Question? [Line break] A: Answer text",
  numbered: "Format example: 1. Question? [Line break] Answer text",
  "line-separated": "Format example: Line 1 = Question, Line 2 = Answer",
};

export default function FaqEditorCard({
  faqs = [],
  onFaqsChange,
  onDirty,
  showIcon = true,
  description = "Add common questions & answers.",
  cardClassName = "border-border shadow-xs",
  headerClassName = "pb-3 border-b border-border/70 flex flex-row items-center justify-between space-y-0",
  headerContentClassName = "flex items-center gap-3",
  titleClassName = "text-base font-bold text-foreground",
  descriptionClassName = "text-xs text-muted-foreground",
  addButtonClassName = "text-xs font-semibold rounded-xl border-dashed border-border hover:border-foreground text-foreground",
  questionLabelClassName = "text-xs font-semibold text-foreground mb-1 block",
  answerLabelClassName = "text-xs font-semibold text-foreground mb-1 block",
  questionPlaceholder = "e.g. Can I configure custom fields for each invoice individually?",
  allowDeleteLast = false,
  emptyMessage = "",
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState("auto");
  const [importTargetIndex, setImportTargetIndex] = useState(null);

  const parsedFaqs = useMemo(
    () => parseBulkFaqText(importText, importFormat),
    [importText, importFormat]
  );
  const importExample = FAQ_IMPORT_EXAMPLES[importFormat];
  const importHint = FAQ_IMPORT_HINTS[importFormat];

  const openImportDialog = () => {
    setImportText("");
    setImportFormat("auto");
    setImportTargetIndex(null);
    setImportOpen(true);
  };

  const handleFaqPaste = (index, event) => {
    const text = event.clipboardData?.getData("text/plain") || "";
    if (!/[\r\n]/.test(text)) return;
    event.preventDefault();
    setImportText(text);
    setImportFormat("auto");
    setImportTargetIndex(index);
    setImportOpen(true);
  };

  const handleAddFaq = () => {
    onDirty();
    onFaqsChange([...faqs, { question: "", answer: "" }]);
  };

  const handleRemoveFaq = (index) => {
    onDirty();
    onFaqsChange(faqs.filter((_, faqIndex) => faqIndex !== index));
  };

  const handleFaqChange = (index, field, value) => {
    onDirty();
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    onFaqsChange(updated);
  };

  const handleImportFaqs = () => {
    if (!parsedFaqs?.length) return;
    let importedFaqs;
    if (importTargetIndex !== null && faqs[importTargetIndex]) {
      importedFaqs = [...faqs];
      importedFaqs[importTargetIndex] = {
        ...importedFaqs[importTargetIndex],
        ...parsedFaqs[0],
      };
      importedFaqs.push(...parsedFaqs.slice(1));
    } else {
      importedFaqs = [...faqs, ...parsedFaqs];
    }

    onDirty();
    onFaqsChange(importedFaqs);
    toast.success(
      `Imported ${parsedFaqs.length} FAQ${parsedFaqs.length === 1 ? "" : "s"}. Please check for accuracy.`
    );
    setImportOpen(false);
  };

  return (
    <>
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <div className={headerContentClassName}>
            {showIcon && (
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <HelpCircle className="w-5 h-5" />
              </div>
            )}
            <div>
              <CardTitle className={titleClassName}>
                Frequently Asked Questions (FAQs)
              </CardTitle>
              <CardDescription className={descriptionClassName}>
                {description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openImportDialog}
              className="text-xs font-semibold rounded-xl border-border text-foreground"
            >
              Import FAQs
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddFaq}
              className={addButtonClassName}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  FAQ #{index + 1}
                </span>
                {(allowDeleteLast || faqs.length > 1) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFaq(index)}
                    className="text-muted-foreground hover:text-red-600 h-7 w-7 p-0 rounded-lg"
                    title="Delete FAQ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div>
                <label className={questionLabelClassName}>
                  Question
                </label>
                <Input
                  value={faq.question}
                  onChange={(event) =>
                    handleFaqChange(index, "question", event.target.value)
                  }
                  onPaste={(event) => handleFaqPaste(index, event)}
                  placeholder={questionPlaceholder}
                  className="rounded-xl border-border bg-background"
                />
              </div>
              <div>
                <label className={answerLabelClassName}>
                  Answer
                </label>
                <Textarea
                  value={faq.answer}
                  onChange={(event) =>
                    handleFaqChange(index, "answer", event.target.value)
                  }
                  rows={2}
                  placeholder="Provide a clear, helpful answer..."
                  className="rounded-xl border-border bg-background"
                />
              </div>
            </div>
          ))}
          {faqs.length === 0 && emptyMessage && (
            <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              {emptyMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col [&>button:last-child]:z-20">
          <DialogHeader className="sticky top-0 z-10 shrink-0 bg-background pb-4 pr-10">
            <DialogTitle>Import FAQs</DialogTitle>
            <DialogDescription>
              Paste your questions and answers below. Each Q&amp;A pair will automatically generate a new FAQ card.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="faq-import-text">
                Questions and answers
              </label>
              <Textarea
                id="faq-import-text"
                autoFocus
                rows={8}
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder={importExample}
                className="min-h-40 resize-y font-mono text-sm"
              />
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {importFormat === "auto"
                    ? "Example formats (auto-detected)"
                    : "Example for the selected format"}
                </p>
                {importFormat === "auto" ? (
                  <div className="space-y-2">
                    {[
                      [
                        "Q: / A:",
                        "Q: How do I get started?\nA: Open Settings and follow the setup steps.",
                      ],
                      [
                        "Numbered",
                        "1. How do I get started?\nOpen Settings and follow the setup steps.",
                      ],
                      [
                        "Alternating lines",
                        "How do I get started?\nOpen Settings and follow the setup steps.",
                      ],
                    ].map(([label, example]) => (
                      <div key={label}>
                        <p className="text-[11px] font-medium text-foreground">
                          {label}
                        </p>
                        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                          {example}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {importExample}
                  </pre>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="faq-import-format">
                Input format
              </label>
              <Select value={importFormat} onValueChange={setImportFormat}>
                <SelectTrigger id="faq-import-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="qa">Q: / A:</SelectItem>
                  <SelectItem value="numbered">Numbered questions</SelectItem>
                  <SelectItem value="line-separated">
                    Alternating question / answer lines
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {importHint}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Live preview</h3>
                {parsedFaqs?.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {parsedFaqs.length} FAQ{parsedFaqs.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {parsedFaqs?.length > 0 ? (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {parsedFaqs.map((faq, index) => (
                    <div
                      key={`${index}-${faq.question}`}
                      className="rounded-md bg-muted/40 p-3 text-sm"
                    >
                      <p className="font-medium">
                        <span className="mr-1 text-muted-foreground">
                          Q{index + 1}.
                        </span>
                        {faq.question}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        <span className="mr-1 font-medium text-foreground">
                          A:
                        </span>
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  {importText.trim()
                    ? "Could not split this text into complete question and answer pairs. Check the selected format and make sure each question has an answer."
                    : "Paste FAQ text to preview the question and answer pairs here."}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImportFaqs}
              disabled={!parsedFaqs?.length}
            >
              Import FAQs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
