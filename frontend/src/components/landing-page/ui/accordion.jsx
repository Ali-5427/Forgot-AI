;
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function Accordion({ ...props }: ComponentProps) {
  return ;
}

function AccordionItem({ className, ...props }: ComponentProps) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-line last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({ className, children, ...props }: ComponentProps) {
  return (
    
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-center justify-between gap-4 py-5 text-left font-sans text-base font-medium text-ink transition-[color] duration-150 ease-out hover:text-ink/80 [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className="size-4 shrink-0 text-muted transition-transform duration-200 ease-out"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      
    
  );
}

function AccordionContent({ className, children, ...props }: ComponentProps) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="accordion-content overflow-hidden text-muted"
      {...props}
    >
      
    
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
