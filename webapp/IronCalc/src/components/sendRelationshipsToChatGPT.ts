export async function sendRelationshipsToChatGPT(
  data: { prompt: string; systemPrompt: string },
  apiKey: string
): Promise<string> {
  console.log('Starting ChatGPT API call...');
  console.log('Prompt:', data.prompt.substring(0, 500) + (data.prompt.length > 500 ? '...' : ''));
  
  const requestBody = {
    model: 'gpt-4.1-nano',
    messages: [
      { role: 'system', content: data.systemPrompt },
      { role: 'user', content: data.prompt }
    ],
    max_tokens: 2000
  };
  
  console.log('Sending request to OpenAI API...');
  console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response received!');
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Full API response:', data);
    
    const result = data.choices[0].message.content as string;
    console.log('ChatGPT response:', result);
    console.log('Response length:', result.length, 'characters');
    
    return result;
  } catch (error) {
    console.error('Error in sendRelationshipsToChatGPT:', error);
    throw error;
  }
} 