export { search } from "./web-search"

// Tool registry for easy access
export const tools = {
  search: async () => (await import("./web-search")).search,
} 