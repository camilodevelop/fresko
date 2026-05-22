import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-[#1F4D36]/15 bg-white/80 px-4 py-2 text-sm text-[#1B1B1B] shadow-sm backdrop-blur-sm transition-colors placeholder:text-[#1B1B1B]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BC34A]/50 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
