import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

export async function getThreads() {
  try {
    const { data, error } = await supabase.from("threads").select("*").order("updated_at", { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error fetching threads:", error)
    toast.error("Failed to fetch threads")
    throw error
  }
}

export async function createThread({ name }: { name: string }) {
  try {
    const { data, error } = await supabase.from("threads").insert({ title: name }).select().single()

    if (error) throw error
    toast.success("Thread created successfully")
    return data
  } catch (error) {
    console.error("Error creating thread:", error)
    toast.error("Failed to create thread")
    throw error
  }
}
