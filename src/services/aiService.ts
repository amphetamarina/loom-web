import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { ollama } from 'ollama-ai-provider';
import { streamText } from 'ai';
import type { GenerationSettings, ModelConfig } from '@/types';

export class AIService {
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  private getModel(modelName: string): any {
    switch (this.config.provider) {
      case 'openai': {
        const openai = createOpenAI({
          apiKey: this.config.api_key || (import.meta as any).env?.VITE_OPENAI_API_KEY || '',
          baseURL: this.config.api_base,
        });
        return openai(modelName);
      }

      case 'anthropic': {
        const anthropic = createAnthropic({
          apiKey: this.config.api_key || (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || '',
          baseURL: this.config.api_base,
        });
        return anthropic(modelName);
      }

      case 'ollama': {
        return ollama(modelName);
      }

      case 'custom': {
        // For custom providers, try OpenAI-compatible endpoint
        const customProvider = createOpenAI({
          apiKey: this.config.api_key || 'dummy-key',
          baseURL: this.config.api_base,
        });
        return customProvider(modelName);
      }

      default:
        throw new Error(`Provider não suportado: ${this.config.provider}`);
    }
  }

  async generateStreaming(
    prompt: string,
    settings: GenerationSettings,
    onChunk: (completionIndex: number, text: string, done: boolean) => void
  ): Promise<void> {
    try {
      // Generate each continuation sequentially with streaming
      for (let i = 0; i < settings.num_continuations; i++) {
        await this.generateSingleStreaming(prompt, settings, i, onChunk);
      }
    } catch (error) {
      console.error('Streaming generation error:', error);
      throw error;
    }
  }

  private async generateSingleStreaming(
    prompt: string,
    settings: GenerationSettings,
    completionIndex: number,
    onChunk: (completionIndex: number, text: string, done: boolean) => void
  ): Promise<void> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Add system prompt if configured
    if (this.config.system_prompt) {
      messages.push({ role: 'system', content: this.config.system_prompt });
    }

    messages.push({ role: 'user', content: prompt });

    // Get the model instance
    const model = this.getModel(settings.model);

    // Simplified parameters - only temperature
    const result = await streamText({
      model,
      messages,
      temperature: settings.temperature,
    });

    let fullText = '';

    // Stream the response
    for await (const textPart of result.textStream) {
      fullText += textPart;
      onChunk(completionIndex, fullText, false);
    }

    // Signal completion
    onChunk(completionIndex, fullText, true);
  }
}
