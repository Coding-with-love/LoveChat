import { getAuthHeaders } from "./auth-headers"

interface ApiClientOptions {
  baseUrl?: string
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || ""
    this.defaultHeaders = options.headers || {}
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      const headers = await this.getHeaders(options.headers as Record<string, string>)
      console.log(`📡 API Client: FETCH ${url}`)

      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      })

      console.log(`📡 API Client: Response status:`, response.status)
      return response
    } catch (error) {
      console.error(`❌ API Client: FETCH ${url} failed:`, error)
      throw error
    }
  }

  private async getHeaders(customHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
    try {
      console.log("🔑 API Client: Getting auth headers...")
      const authHeaders = await getAuthHeaders()
      console.log(
        "🔑 API Client: Auth headers obtained, token length:",
        authHeaders.authorization ? authHeaders.authorization.length : 0,
      )

      return {
        ...this.defaultHeaders,
        ...authHeaders,
        ...customHeaders,
      }
    } catch (error) {
      console.error("❌ API Client: Failed to get auth headers:", error)
      throw new Error("Authentication required")
    }
  }

  async get<T>(url: string, options: { headers?: Record<string, string> } = {}): Promise<T> {
    try {
      const headers = await this.getHeaders(options.headers)
      console.log(`📡 API Client: GET ${url}`)

      const response = await fetch(`${this.baseUrl}${url}`, {
        method: "GET",
        headers,
      })

      console.log(`📡 API Client: Response status:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Client: Error response:`, errorText)
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`❌ API Client: GET ${url} failed:`, error)
      throw error
    }
  }

  async post<T>(url: string, data: any, options: { headers?: Record<string, string> } = {}): Promise<T> {
    try {
      const headers = await this.getHeaders(options.headers)
      console.log(`📡 API Client: POST ${url}`)

      const response = await fetch(`${this.baseUrl}${url}`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })

      console.log(`📡 API Client: Response status:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Client: Error response:`, errorText)

        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(errorText)
          throw new Error(errorJson.error || `HTTP ${response.status}: ${response.statusText}`)
        } catch (e) {
          // If parsing fails, use the raw text
          throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`)
        }
      }

      return await response.json()
    } catch (error) {
      console.error(`❌ API Client: POST ${url} failed:`, error)
      throw error
    }
  }

  async put<T>(url: string, data: any, options: { headers?: Record<string, string> } = {}): Promise<T> {
    try {
      const headers = await this.getHeaders(options.headers)
      console.log(`📡 API Client: PUT ${url}`)

      const response = await fetch(`${this.baseUrl}${url}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      })

      console.log(`📡 API Client: Response status:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Client: Error response:`, errorText)
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`❌ API Client: PUT ${url} failed:`, error)
      throw error
    }
  }

  async delete<T>(url: string, options: { headers?: Record<string, string> } = {}): Promise<T> {
    try {
      const headers = await this.getHeaders(options.headers)
      console.log(`📡 API Client: DELETE ${url}`)

      const response = await fetch(`${this.baseUrl}${url}`, {
        method: "DELETE",
        headers,
      })

      console.log(`📡 API Client: Response status:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Client: Error response:`, errorText)
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`❌ API Client: DELETE ${url} failed:`, error)
      throw error
    }
  }
}

export const apiClient = new ApiClient()
