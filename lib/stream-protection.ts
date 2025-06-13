interface StreamProtectionConfig {
  maxRepetitions: number
  repetitionWindowSize: number
  maxResponseLength: number
  timeoutMs: number
  maxSimilarChunks: number
}

interface StreamState {
  content: string
  chunks: string[]
  lastActivity: number
  repetitionCount: number
  similarChunks: string[]
  isStuck: boolean
}

export class StreamProtection {
  private config: StreamProtectionConfig
  private state: StreamState
  private startTime: number

  constructor(config: Partial<StreamProtectionConfig> = {}) {
    this.config = {
      maxRepetitions: 5,
      repetitionWindowSize: 50, // characters to analyze for repetition
      maxResponseLength: 50000, // max characters before forcing stop
      timeoutMs: 120000, // 2 minutes timeout
      maxSimilarChunks: 8, // max similar chunks before flagging as stuck
      ...config,
    }

    this.state = {
      content: "",
      chunks: [],
      lastActivity: Date.now(),
      repetitionCount: 0,
      similarChunks: [],
      isStuck: false,
    }

    this.startTime = Date.now()
  }

  /**
   * Analyzes a new chunk for problematic patterns
   * Returns true if the chunk should be allowed, false if it should be rejected
   */
  analyzeChunk(chunk: string): { allowed: boolean; reason?: string } {
    if (this.state.isStuck) {
      return { allowed: false, reason: "Stream is stuck in repetitive pattern" }
    }

    // Update activity
    this.state.lastActivity = Date.now()
    this.state.chunks.push(chunk)
    this.state.content += chunk

    // Check timeout
    if (Date.now() - this.startTime > this.config.timeoutMs) {
      this.state.isStuck = true
      return { allowed: false, reason: "Stream timeout exceeded" }
    }

    // Check max length
    if (this.state.content.length > this.config.maxResponseLength) {
      this.state.isStuck = true
      return { allowed: false, reason: "Response length limit exceeded" }
    }

    // Check for repetitive patterns
    const repetitionCheck = this.checkForRepetition(chunk)
    if (!repetitionCheck.allowed) {
      this.state.isStuck = true
      return repetitionCheck
    }

    // Check for similar chunks
    const similarityCheck = this.checkForSimilarity(chunk)
    if (!similarityCheck.allowed) {
      this.state.isStuck = true
      return similarityCheck
    }

    // Check for stuck patterns (same words repeating)
    const stuckCheck = this.checkForStuckPattern()
    if (!stuckCheck.allowed) {
      this.state.isStuck = true
      return stuckCheck
    }

    return { allowed: true }
  }

  private checkForRepetition(chunk: string): { allowed: boolean; reason?: string } {
    const recentContent = this.state.content.slice(-this.config.repetitionWindowSize)
    
    // Check if current chunk starts with exactly what we just wrote
    if (chunk.length > 5 && recentContent.endsWith(chunk.substring(0, Math.min(chunk.length - 1, 10)))) {
      this.state.repetitionCount++
      
      if (this.state.repetitionCount >= this.config.maxRepetitions) {
        return { 
          allowed: false, 
          reason: `Repetitive pattern detected: "${chunk.substring(0, 20)}..."` 
        }
      }
    } else {
      this.state.repetitionCount = 0
    }

    return { allowed: true }
  }

  private checkForSimilarity(chunk: string): { allowed: boolean; reason?: string } {
    if (chunk.trim().length < 3) return { allowed: true }

    // Check if this chunk is very similar to recent chunks
    const recentChunks = this.state.chunks.slice(-10)
    const similarity = this.calculateSimilarity(chunk, recentChunks)
    
    if (similarity > 0.8) {
      this.state.similarChunks.push(chunk)
      
      if (this.state.similarChunks.length >= this.config.maxSimilarChunks) {
        return { 
          allowed: false, 
          reason: "Too many similar chunks detected - possible loop" 
        }
      }
    } else {
      this.state.similarChunks = []
    }

    return { allowed: true }
  }

  private checkForStuckPattern(): { allowed: boolean; reason?: string } {
    // Look for patterns like "To solve" -> "To solve this" -> "To solve this problem"
    const words = this.state.content.split(/\s+/).filter(w => w.length > 0)
    if (words.length < 10) return { allowed: true }

    const recentWords = words.slice(-20) // Last 20 words
    const firstWords = recentWords.slice(0, 5)
    
    // Check if the same starting sequence appears multiple times
    let sequenceCount = 0
    for (let i = 0; i < recentWords.length - 5; i++) {
      const sequence = recentWords.slice(i, i + 5)
      if (this.arraysEqual(sequence, firstWords)) {
        sequenceCount++
      }
    }

    if (sequenceCount >= 3) {
      return { 
        allowed: false, 
        reason: `Stuck pattern detected: repeating "${firstWords.join(' ')}"` 
      }
    }

    return { allowed: true }
  }

  private calculateSimilarity(chunk: string, recentChunks: string[]): number {
    if (recentChunks.length === 0) return 0

    const chunkWords = new Set(chunk.toLowerCase().split(/\s+/))
    let maxSimilarity = 0

    for (const recentChunk of recentChunks) {
      const recentWords = new Set(recentChunk.toLowerCase().split(/\s+/))
      const intersection = new Set([...chunkWords].filter(w => recentWords.has(w)))
      const union = new Set([...chunkWords, ...recentWords])
      
      const similarity = intersection.size / union.size
      maxSimilarity = Math.max(maxSimilarity, similarity)
    }

    return maxSimilarity
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i])
  }

  /**
   * Get current stream statistics
   */
  getStats() {
    return {
      contentLength: this.state.content.length,
      chunkCount: this.state.chunks.length,
      repetitionCount: this.state.repetitionCount,
      similarChunkCount: this.state.similarChunks.length,
      isStuck: this.state.isStuck,
      duration: Date.now() - this.startTime,
    }
  }

  /**
   * Check if stream should be terminated
   */
  shouldTerminate(): boolean {
    return this.state.isStuck
  }

  /**
   * Get the current content
   */
  getContent(): string {
    return this.state.content
  }

  /**
   * Reset protection state (useful for stream resumption)
   */
  reset() {
    this.state = {
      content: "",
      chunks: [],
      lastActivity: Date.now(),
      repetitionCount: 0,
      similarChunks: [],
      isStuck: false,
    }
    this.startTime = Date.now()
  }
}

/**
 * Circuit breaker for stream operations
 */
export class StreamCircuitBreaker {
  private failures = 0
  private lastFailure: number = 0
  private readonly maxFailures: number
  private readonly resetTimeoutMs: number

  constructor(maxFailures = 3, resetTimeoutMs = 300000) { // 5 minutes
    this.maxFailures = maxFailures
    this.resetTimeoutMs = resetTimeoutMs
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error("Circuit breaker is open - too many recent failures")
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.maxFailures) {
      if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
        this.reset()
        return false
      }
      return true
    }
    return false
  }

  private onSuccess() {
    this.failures = 0
  }

  private onFailure() {
    this.failures++
    this.lastFailure = Date.now()
  }

  private reset() {
    this.failures = 0
    this.lastFailure = 0
  }

  getStats() {
    return {
      failures: this.failures,
      isOpen: this.isOpen(),
      lastFailure: this.lastFailure,
    }
  }
} 