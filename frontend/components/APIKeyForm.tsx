import React, { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Key } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { supabase } from "@/lib/supabase/client"; // Make sure this is your supabase client import
import { useAuth } from "@/frontend/components/AuthProvider";

const formSchema = z.object({
  google: z.string().trim().min(1, {
    message: "Google API key is required for Title Generation",
  }),
  openrouter: z.string().trim().optional(),
  openai: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function APIKeyForm() {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          <CardTitle>Add Your API Keys To Start Chatting</CardTitle>
        </div>
        <CardDescription>
          Keys are stored securely with your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form />
      </CardContent>
    </Card>
  );
}

const Form = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { google: "", openrouter: "", openai: "" },
  });

  // Fetch user's keys from Supabase when user changes
  useEffect(() => {
    if (!user) {
      reset({ google: "", openrouter: "", openai: "" });
      setLoading(false);
      return;
    }
    const fetchKeys = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        reset({ google: "", openrouter: "", openai: "" });
      } else {
        reset({
          google: data.google ?? "",
          openrouter: data.openrouter ?? "",
          openai: data.openai ?? "",
        });
      }
      setLoading(false);
    };
    fetchKeys();
  }, [user, reset]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!user) {
        toast.error("You must be logged in.");
        return;
      }
      setLoading(true);
      const { error } = await supabase
        .from("user_api_keys")
        .upsert(
          [{ user_id: user.id, ...values, updated_at: new Date().toISOString() }],
          { onConflict: ["user_id"] }
        );
      if (error) {
        toast.error("Failed to save API keys.");
      } else {
        toast.success("API keys saved successfully!");
      }
      setLoading(false);
    },
    [user]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ApiKeyField
        id="google"
        label="Google API Key"
        models={["Gemini 2.5 Flash", "Gemini 2.5 Pro"]}
        linkUrl="https://aistudio.google.com/apikey"
        placeholder="AIza..."
        register={register}
        error={errors.google}
        required
      />

      <ApiKeyField
        id="openrouter"
        label="OpenRouter API Key"
        models={["DeepSeek R1 0538", "DeepSeek-V3"]}
        linkUrl="https://openrouter.ai/settings/keys"
        placeholder="sk-or-..."
        register={register}
        error={errors.openrouter}
      />

      <ApiKeyField
        id="openai"
        label="OpenAI API Key"
        models={["GPT-4o", "GPT-4.1-mini"]}
        linkUrl="https://platform.openai.com/settings/organization/api-keys"
        placeholder="sk-..."
        register={register}
        error={errors.openai}
      />

      <Button type="submit" className="w-full" disabled={loading || !isDirty}>
        {loading ? "Saving..." : "Save API Keys"}
      </Button>
    </form>
  );
};

import type { UseFormRegister, FieldError } from "react-hook-form";

interface ApiKeyFieldProps {
  id: string;
  label: string;
  linkUrl: string;
  models: string[];
  placeholder: string;
  error?: FieldError | undefined;
  required?: boolean;
  register: UseFormRegister<FormValues>;
}

const ApiKeyField = ({
  id,
  label,
  linkUrl,
  placeholder,
  models,
  error,
  required,
  register,
}: ApiKeyFieldProps) => (
  <div className="flex flex-col gap-2">
    <label
      htmlFor={id}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex gap-1"
    >
      <span>{label}</span>
      {required && <span className="text-muted-foreground"> (Required)</span>}
    </label>
    <div className="flex gap-2">
      {models.map((model) => (
        <Badge key={model}>{model}</Badge>
      ))}
    </div>
    <Input
      id={id}
      placeholder={placeholder}
      {...register(id as keyof FormValues)}
      className={error ? "border-red-500" : ""}
    />
    <a
      href={linkUrl}
      target="_blank"
      className="text-sm text-blue-500 inline w-fit"
    >
      Create {label.split(" ")[0]} API Key
    </a>
    {error && (
      <p className="text-[0.8rem] font-medium text-red-500">{error.message}</p>
    )}
  </div>
);
