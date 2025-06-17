import { useEffect, useRef } from 'react';

interface ReasoningStreamCallbacks {
  onReasoningStart?: () => void;
  onReasoningDelta?: (content: string) => void;
  onReasoningEnd?: (duration: number, totalReasoning: string) => void;
}

export function useReasoningStream(callbacks: ReasoningStreamCallbacks) {
  const originalFetch = useRef<typeof fetch | null>(null);

  useEffect(() => {
    // Store the original fetch function
    if (!originalFetch.current) {
      originalFetch.current = window.fetch;
    }

    // Override fetch to intercept reasoning stream events
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      
      // Only intercept chat API calls
      if (url.includes('/api/chat')) {
        console.log('🔍 Intercepting chat API call for reasoning stream processing');
        
        const response = await originalFetch.current!.call(this, input, init);
        
        // Only process streaming responses
        if (response.body && response.headers.get('content-type')?.includes('text/plain')) {
          console.log('🔍 Processing streaming response for reasoning events');
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          
          // Create a new readable stream that processes reasoning events
          const processedStream = new ReadableStream({
            async start(controller) {
              let reasoningBuffer = '';
              let isInReasoning = false;
              
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  
                  const chunk = decoder.decode(value, { stream: true });
                  const lines = chunk.split('\n');
                  
                  for (const line of lines) {
                    if (line.startsWith('r:')) {
                      // This is a reasoning event
                      try {
                        const reasoningData = JSON.parse(line.substring(2));
                        console.log('🧠 Reasoning event:', reasoningData);
                        
                        if (reasoningData.type === 'reasoning-start') {
                          callbacks.onReasoningStart?.();
                          isInReasoning = true;
                          reasoningBuffer = '';
                        } else if (reasoningData.type === 'reasoning-delta' && reasoningData.content) {
                          callbacks.onReasoningDelta?.(reasoningData.content);
                          reasoningBuffer += reasoningData.content;
                        } else if (reasoningData.type === 'reasoning-end') {
                          callbacks.onReasoningEnd?.(
                            reasoningData.duration || 0,
                            reasoningData.totalReasoning || reasoningBuffer
                          );
                          isInReasoning = false;
                        }
                      } catch (error) {
                        console.error('❌ Error parsing reasoning event:', error);
                      }
                      // Don't pass reasoning events to the original stream
                      continue;
                    }
                    
                    // Pass through all other events (text, finish, etc.)
                    if (line.trim()) {
                      controller.enqueue(new TextEncoder().encode(line + '\n'));
                    }
                  }
                }
                
                controller.close();
              } catch (error) {
                console.error('❌ Error in reasoning stream processor:', error);
                controller.error(error);
              }
            }
          });
          
          // Return a new response with the processed stream
          return new Response(processedStream, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      }
      
      // For non-chat requests, use original fetch with proper context
      return originalFetch.current!.call(this, input, init);
    };

    // Cleanup function to restore original fetch
    return () => {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
      }
    };
  }, [callbacks]);

  return null; // This hook doesn't return anything, it just sets up the interceptor
} 