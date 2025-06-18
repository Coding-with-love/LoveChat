"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        style: {
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          background: "hsl(var(--card))",
          color: "hsl(var(--card-foreground))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "calc(var(--radius) - 2px)",
          boxShadow: "var(--shadow-md)",
          backdropFilter: "none",
          opacity: "1",
        },
        className: "bg-card text-card-foreground",
        ...props.toastOptions,
      }}
      {...props}
    />
  );
};

export { Toaster };
