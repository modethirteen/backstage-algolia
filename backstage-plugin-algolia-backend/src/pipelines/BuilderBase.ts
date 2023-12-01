import { assertError } from '@backstage/errors';
import { IndexObject } from 'backstage-plugin-algolia-common';
import { Transform } from 'stream';
import { CollatorResult } from './types';

export abstract class BuilderBase extends Transform {
  public constructor() {
    super({ objectMode: true });
  }

  public abstract build(result: CollatorResult): Promise<IndexObject | undefined>;

  public abstract finalize(): Promise<void>;

  /**
   * @internal
   */
  async _transform(
    result: CollatorResult,
    _: any,
    done: (error?: Error | null) => void,
  ) {
    try {
      const object = await this.build(result);
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
