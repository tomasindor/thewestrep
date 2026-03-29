import type { ReactNode } from "react";

type FaqAccordionItem = {
  question: string;
  answer: ReactNode;
};

type FaqAccordionProps = {
  items: FaqAccordionItem[];
  defaultOpenIndex?: number;
};

export function FaqAccordion({
  items,
  defaultOpenIndex,
}: FaqAccordionProps) {
  return (
    <div className="space-y-3" data-accordion="faq">
      {items.map((item, index) => (
        <details
          key={item.question}
          open={index === defaultOpenIndex}
          data-faq-item="true"
          className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
        >
          <summary
            data-faq-trigger="true"
            className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-5 text-left marker:hidden [&::-webkit-details-marker]:hidden sm:px-6"
          >
            <span className="pr-2 text-base font-semibold text-white sm:text-lg">
              {item.question}
            </span>
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/6 text-lg leading-none text-orange-100 transition duration-200 group-open:rotate-45 group-open:border-orange-300/35 group-open:bg-orange-500/12">
              +
            </span>
          </summary>

          <div
            data-faq-panel="true"
            className="border-t border-white/8 px-5 pb-5 pt-4 sm:px-6 sm:pb-6"
          >
            <div className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              {item.answer}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
