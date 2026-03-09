// Mock Ollama Service - dla trybu awaryjnego
export const mockOllama = {
  generate: async (prompt, options = {}) => {
    console.log(`[MOCK OLLAMA] Generating response for: ${prompt.slice(0, 100)}...`);
    
    // Proste mock odpowiedzi
    const responses = {
      'hello': 'Hello! I am GAI Assistant ready to help you.',
      'help': 'I can help you with coding, analysis, writing and general questions.',
      'code': '```javascript\nconsole.log("Hello World!");\n```',
      'analysis': 'Based on my analysis, here are the key insights...',
      'default': 'I understand your request. Let me help you with that.'
    };
    
    const promptLower = prompt.toLowerCase();
    let response = responses.default;
    
    if (promptLower.includes('hello') || promptLower.includes('hi')) {
      response = responses.hello;
    } else if (promptLower.includes('help')) {
      response = responses.help;
    } else if (promptLower.includes('code') || promptLower.includes('programming')) {
      response = responses?.code;
    } else if (promptLower.includes('analysis') || promptLower.includes('analyze')) {
      response = responses.analysis;
    }
    
    // Symuluj opóźnienie
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    return {
      response: response,
      done: true,
      context: [],
      total_duration: 150000000,
      load_duration: 50000000,
      prompt_eval_count: prompt.split(' ').length,
      prompt_eval_duration: 20000000,
      eval_count: response.split(' ').length,
      eval_duration: 100000000
    };
  },
  
  chat: async (messages, options = {}) => {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const response = await mockOllama.generate(lastMessage, options);
    
    return {
      message: {
        role: 'assistant',
        content: response.response
      },
      done: true
    };
  }
};

export const initializeMockOllama = () => {
  console.log('🎭 Mock Ollama Service initialized - running in emergency mode');
};