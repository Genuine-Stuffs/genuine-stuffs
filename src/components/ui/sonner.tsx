import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:border-2",
          title: "font-black text-base uppercase tracking-tight",
          description: "group-[.toast]:text-muted-foreground font-bold",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-black",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-black",
          closeButton: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
