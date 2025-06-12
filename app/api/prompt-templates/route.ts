import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includePublic = searchParams.get("includePublic") === "true"
    const category = searchParams.get("category")
    const personaId = searchParams.get("personaId")

    // First, try to get templates without the join to see if table exists
    let query = supabaseServer.from("prompt_templates").select("*")

    if (includePublic) {
      query = query.or(`user_id.eq.${userId},is_public.eq.true`)
    } else {
      query = query.eq("user_id", userId)
    }

    if (category) {
      query = query.eq("category", category)
    }

    if (personaId) {
      query = query.eq("persona_id", personaId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching prompt templates:", error)
      // If table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json({ templates: [] })
      }
      return NextResponse.json({ error: "Failed to fetch prompt templates" }, { status: 500 })
    }

    // Now try to enrich with persona data if personas table exists
    let enrichedTemplates = data || []
    if (data && data.length > 0) {
      try {
        // Get unique persona IDs
        const personaIds = [...new Set(data.map(t => t.persona_id).filter(Boolean))]
        
        if (personaIds.length > 0) {
          const { data: personas } = await supabaseServer
            .from("personas")
            .select("id, name, avatar_emoji, color")
            .in("id", personaIds)

          if (personas) {
            // Map personas to templates
            enrichedTemplates = data.map(template => ({
              ...template,
              personas: template.persona_id 
                ? personas.find(p => p.id === template.persona_id) || null
                : null
            }))
          }
        }
      } catch (personaError) {
        console.warn("Could not fetch persona data:", personaError)
        // Continue with templates without persona data
      }
    }

    return NextResponse.json({ templates: enrichedTemplates })
  } catch (error) {
    console.error("Error in prompt templates GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, template, variables, category, tags, persona_id, is_public } = body

    if (!title || !template) {
      return NextResponse.json({ error: "Title and template are required" }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from("prompt_templates")
      .insert({
        user_id: userId,
        title,
        description,
        template,
        variables: variables || [],
        category,
        tags: tags || [],
        persona_id,
        is_public: is_public || false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating prompt template:", error)
      return NextResponse.json({ error: "Failed to create prompt template" }, { status: 500 })
    }

    // Try to get persona data if available
    let enrichedTemplate = data
    if (data.persona_id) {
      try {
        const { data: persona } = await supabaseServer
          .from("personas")
          .select("id, name, avatar_emoji, color")
          .eq("id", data.persona_id)
          .single()

        if (persona) {
          enrichedTemplate = { ...data, personas: persona }
        }
      } catch (personaError) {
        console.warn("Could not fetch persona data:", personaError)
      }
    }

    return NextResponse.json({ template: enrichedTemplate })
  } catch (error) {
    console.error("Error in prompt templates POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
