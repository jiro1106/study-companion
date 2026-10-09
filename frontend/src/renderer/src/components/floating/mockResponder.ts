/**
 * Temporary mock responder — returns a fixed greeting after a
 * short simulated delay.
 *
 * Replace this module with the real local-AI bridge when ready.
 */

const MOCK_RESPONSES: string[] = [
  "Hi! I'm BARDHIE 🐦 Your floating study companion is ready. What would you like to work on?",
  "Great question! Let me think about that for a moment… I'd suggest starting with your most challenging topic while your focus is fresh.",
  "I'm here to help! Try breaking your study session into 25-minute focused blocks with short breaks in between.",
  "Need help with a specific subject? Just tell me what you're studying and I'll do my best to assist!",
  "Remember: understanding > memorizing. Try explaining the concept back to me in your own words!",
]

let responseIndex = 0

/**
 * Simulates a response from the assistant.
 *
 * @param _userMessage - The user's message (unused in mock).
 * @returns A promise that resolves with a mock assistant reply.
 */
export async function getMockResponse(_userMessage: string): Promise<string> {
  // Simulate network / inference latency
  const delay = 1200 + Math.random() * 800
  await new Promise((resolve) => setTimeout(resolve, delay))

  const response = MOCK_RESPONSES[responseIndex % MOCK_RESPONSES.length]
  responseIndex++
  return response
}
