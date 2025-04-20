import { assertError } from '@backstage/errors';
import { Transform } from 'stream';
import { PipelineResult } from './types';

export abstract class TransformerBase extends Transform {
  public constructor() {
    super({ objectMode: true });
  }

  public abstract transform(
    result: PipelineResult,
  ): Promise<PipelineResult | undefined>;

  public abstract finalize(): Promise<void>;

  /**
   * @internal
   */
  async _transform(
    result: PipelineResult,
    _: any,
    done: (error?: Error | null) => void,
  ) {
    try {
      const object = await this.transform(result);
      if (typeof object === 'undefined') {
        done();
        return;
      }
      if (Array.isArray(object)) {
        object.forEach(o => this.push(o));
        done();
        return;
      }
      this.push(object);
      done();
    } catch (e) {
      assertError(e);
      done(e);
    }
  }

  /**
   * @internal
   */
  async _final(done: (error?: Error | null) => void) {
    try {
      await this.finalize();
      done();
    } catch (e) {
      assertError(e);
      done(e);
    }
  }
}
