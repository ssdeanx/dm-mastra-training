import { MemoryProcessor, MemoryProcessorOpts } from '@mastra/core/memory';
import { CoreMessage as OriginalCoreMessage } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';

type CoreMessage = OriginalCoreMessage & {
  metadata?: Record<string, unknown>;
};

const logger = new PinoLogger({ name: 'processor-extra', level: 'info' });

export class ExtendedMemoryProcessor extends MemoryProcessor {
  constructor() {
    super({ name: 'processor-extra' });
  }

  override process(messages: CoreMessage[], opts: MemoryProcessorOpts = {}): CoreMessage[] {
    messages.forEach(msg =>
      logger.info('Processing message with metadata', { metadata: msg.metadata })
    );
    return super.process(messages, opts);
  }
}