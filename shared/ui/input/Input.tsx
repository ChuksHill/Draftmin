import { cn } from "@/shared/utils/format/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500",
        className
      )}
      {...props}
    />
  );
}