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

    // First, check if the table exists
    try {
      const { error: tableCheckError } = await supabaseServer.from("prompt_templates").select("id").limit(1)
      
      if (tableCheckError && tableCheckError.code === "42P01") {
        console.log("Prompt templates table doesn't exist yet")
        return NextResponse.json({ templates: [] })
      }
    } catch (error) {
      console.warn("Error checking if table exists:", error)
      return NextResponse.json({ templates: [] })
    }

    // Build the query
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
      return NextResponse.json({ error: "Failed to fetch prompt templates" }, { status: 500 })
    }

    // Now try to enrich with persona data if personas table exists
    let enrichedTemplates = data || []
    if (data && data.length > 0) {
      try {
        // Check if personas table exists
        const { error: personasTableCheckError } = await supabaseServer.from("personas").select("id").limit(1)
        
        if (!personasTableCheckError) {
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
        } else {
          console.log("Personas table doesn't exist yet")
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

    // First, check if the table exists
    try {
      const { error: tableCheckError } = await supabaseServer.from("prompt_templates").select("id").limit(1)
      
      if (tableCheckError && tableCheckError.code === "42P01") {
        console.error("Prompt templates table doesn't exist")
        return NextResponse.json({ error: "Prompt templates feature is not available" }, { status: 500 })
      }
    } catch (error) {
      console.error("Error checking if table exists:", error)
      return NextResponse.json({ error: "Failed to check database schema" }, { status: 500 })
    }

    const body = await request.json()
    const { title, description, template, variables, category, tags, persona_id, is_public } = body

    if (!title || !template) {
      return NextResponse.json({ error: "Title and template are required" }, { status: 400 })
    }

    // If persona_id is provided, check if it exists in the personas table
    if (persona_id && persona_id !== "none") {
      try {
        // Check if personas table exists
        const { error: personasTableCheckError } = await supabaseServer.from("personas").select("id").limit(1)
        
        if (!personasTableCheckError) {
          // Check if the persona exists and belongs to the user
          const { data: personaData, error: personaError } = await supabaseServer
            .from("personas")
            .select("id")
            .eq("id", persona_id)
            .eq("user_id", userId)
            .single()

          if (personaError || !personaData) {
            console.warn("Invalid persona ID or persona doesn't belong to user")
            // Continue without persona_id
          }
        } else {
          console.log("Personas table doesn't exist yet")
        }
      } catch (error) {
        console.warn("Error checking persona:", error)
      }
    }

    // Insert the template
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
        persona_id: persona_id === "none" ? null : persona_id,
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
        // Check if personas table exists
        const { error: personasTableCheckError } = await supabaseServer.from("personas").select("id").limit(1)
        
        if (!personasTableCheckError) {
          const { data: persona } = await supabaseServer
            .from("personas")
            .select("id, name, avatar_emoji, color")
            .eq("id", data.persona_id)
            .single()

          if (persona) {
            enrichedTemplate = { ...data, personas: persona }
          }
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
