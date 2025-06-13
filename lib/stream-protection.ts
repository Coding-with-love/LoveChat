/**
 * StreamProtection class to detect and prevent problematic streaming patterns
 * such as repetitions, excessive length, and timeouts.
 */
export class StreamProtection {
  private chunks: string[] = []
  private startTime: number
  private totalLength = 0
  private repetitionCounts: Map<string, number> = new Map()
  private similarChunksCount = 0
  private lastChunks: string[] = []
  private maxRepetitions: number
  private repetitionWindowSize: number
  private maxResponseLength: number
  private timeoutMs: number
  private maxSimilarChunks: number
  private minRepetitionLength: number

  constructor({
    maxRepetitions = 5,
    repetitionWindowSize = 80,
    maxResponseLength = 50000,
    timeoutMs = 120000,
    maxSimilarChunks = 8,
    minRepetitionLength = 5,
  } = {}) {
    this.maxRepetitions = maxRepetitions
    this.repetitionWindowSize = repetitionWindowSize
    this.maxResponseLength = maxResponseLength
    this.timeoutMs = timeoutMs
    this.maxSimilarChunks = maxSimilarChunks
    this.minRepetitionLength = minRepetitionLength
    this.startTime = Date.now()
  }

  /**
   * Analyze a chunk of text for problematic patterns
   * @param chunk The text chunk to analyze
   * @returns Object indicating if the chunk is allowed and the reason if not
   */
  analyzeChunk(chunk: string): { allowed: boolean; reason?: string } {
    // Check for timeout
    if (Date.now() - this.startTime > this.timeoutMs) {
      return { allowed: false, reason: "Response timeout exceeded" }
    }

    // Check for excessive length
    this.totalLength += chunk.length
    if (this.totalLength > this.maxResponseLength) {
      return { allowed: false, reason: "Response length limit exceeded" }
    }

    // Store the chunk for analysis
    this.chunks.push(chunk)

    // Check for repetitive patterns
    const result = this.checkRepetitivePatterns(chunk)
    if (!result.allowed) {
      return result
    }

    // Check for similar consecutive chunks
    const similarResult = this.checkSimilarChunks(chunk)
    if (!similarResult.allowed) {
      return similarResult
    }

    return { allowed: true }
  }

  /**
   * Check for repetitive patterns in the text
   */
  private checkRepetitivePatterns(chunk: string): { allowed: boolean; reason?: string } {
    // Skip very short chunks
    if (chunk.length < this.minRepetitionLength) {
      return { allowed: true }
    }

    // Check for exact repetitions
    for (
      let windowSize = this.minRepetitionLength;
      windowSize <= Math.min(this.repetitionWindowSize, chunk.length / 2);
      windowSize++
    ) {
      for (let i = 0; i <= chunk.length - windowSize * 2; i++) {
        const pattern = chunk.substring(i, i + windowSize)

        // Skip very short or whitespace-only patterns
        if (pattern.trim().length < this.minRepetitionLength) continue

        let repetitionCount = 0
        let j = i

        while (j <= chunk.length - windowSize) {
          const nextChunk = chunk.substring(j, j + windowSize)
          if (nextChunk === pattern) {
            repetitionCount++
            j += windowSize
          } else {
            break
          }
        }

        if (repetitionCount >= this.maxRepetitions) {
          return {
            allowed: false,
            reason: `Detected repetitive pattern: "${pattern.substring(0, 20)}${pattern.length > 20 ? "..." : ""}" repeated ${repetitionCount} times`,
          }
        }
      }
    }

    // Track patterns across chunks
    const existingPatterns = Array.from(this.repetitionCounts.keys())
    for (const pattern of existingPatterns) {
      if (chunk.includes(pattern)) {
        const count = (this.repetitionCounts.get(pattern) || 0) + 1
        this.repetitionCounts.set(pattern, count)

        if (count >= this.maxRepetitions) {
          return {
            allowed: false,
            reason: `Detected cross-chunk repetitive pattern: "${pattern.substring(0, 20)}${pattern.length > 20 ? "..." : ""}" repeated ${count} times`,
          }
        }
      }
    }

    // Add new patterns to track
    if (chunk.length >= this.minRepetitionLength) {
      this.repetitionCounts.set(chunk, 1)
    }

    return { allowed: true }
  }

  /**
   * Check for similar consecutive chunks
   */
  private checkSimilarChunks(chunk: string): { allowed: boolean; reason?: string } {
    // Keep track of last few chunks
    if (this.lastChunks.length >= 5) {
      this.lastChunks.shift()
    }
    this.lastChunks.push(chunk)

    // Check if this chunk is very similar to previous chunks
    if (this.lastChunks.length > 1) {
      const currentChunk = this.lastChunks[this.lastChunks.length - 1]
      const previousChunk = this.lastChunks[this.lastChunks.length - 2]

      // Simple similarity check - if chunks share significant content
      if (currentChunk.length > 10 && previousChunk.length > 10) {
        const similarity = this.calculateSimilarity(currentChunk, previousChunk)

        if (similarity > 0.8) {
          // 80% similar
          this.similarChunksCount++

          if (this.similarChunksCount >= this.maxSimilarChunks) {
            return {
              allowed: false,
              reason: `Detected ${this.similarChunksCount} consecutive similar chunks, possible loop`,
            }
          }
        } else {
          this.similarChunksCount = 0
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Calculate similarity between two strings (simple implementation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // For very different length strings, they're not very similar
    if (Math.abs(str1.length - str2.length) / Math.max(str1.length, str2.length) > 0.3) {
      return 0
    }

    // Count common characters
    const chars1 = new Set(str1)
    const chars2 = new Set(str2)
    let common = 0

    for (const char of chars1) {
      if (chars2.has(char)) common++
    }

    return common / Math.max(chars1.size, chars2.size)
  }

  /**
   * Get statistics about the stream protection
   */
  getStats() {
    return {
      totalChunks: this.chunks.length,
      totalLength: this.totalLength,
      elapsedTime: Date.now() - this.startTime,
      similarChunksCount: this.similarChunksCount,
      trackedPatterns: this.repetitionCounts.size,
    }
  }
}

/**
 * Circuit breaker for stream operations to prevent cascading failures
 */
export class StreamCircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private maxFailures: number
  private resetTimeMs: number

  constructor(maxFailures = 3, resetTimeMs = 300000) {
    this.maxFailures = maxFailures
    this.resetTimeMs = resetTimeMs
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open (too many failures)
    if (this.isOpen()) {
      throw new Error("Circuit breaker is open due to too many failures")
    }

    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  /**
   * Check if the circuit breaker is open
   */
  private isOpen(): boolean {
    // Reset failures if enough time has passed
    if (this.failures > 0 && Date.now() - this.lastFailureTime > this.resetTimeMs) {
      console.log("🔄 Circuit breaker: Resetting failure count after timeout")
      this.failures = 0
    }

    return this.failures >= this.maxFailures
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(): void {
    if (this.failures > 0) {
      this.failures = Math.max(0, this.failures - 1)
    }
  }

  /**
   * Record a failed operation
   */
  private recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    console.warn(`⚠️ Circuit breaker: Recorded failure #${this.failures}`)
  }
}
