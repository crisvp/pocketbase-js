import { BaseService } from '@/services/utils/BaseService';
import { CommonOptions, FileOptions } from '@/services/utils/options';
import { RecordModel } from './utils/dtos';

export class FileService extends BaseService {
  /**
   * Builds and returns an absolute record file url for the provided filename.
   */
  getUrl(record: RecordModel, filename: string, queryParams: FileOptions = {}): string {
    if (!filename || !record.id || !(record.collectionId || record.collectionName)) {
      console.error('Missing required record id or filename.', record);
      return '';
    }

    const parts = [];
    parts.push('api');
    parts.push('files');
    parts.push(encodeURIComponent(record.collectionId || record.collectionName));
    parts.push(encodeURIComponent(record.id));
    parts.push(encodeURIComponent(filename));

    let result = this.client.buildUrl(parts.join('/'));

    if (Object.keys(queryParams).length) {
      // normalize the download query param for consistency with the Dart sdk
      if (queryParams.download === false) {
        delete queryParams.download;
      }

      const p = Object.entries(queryParams).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      ]);
      const params = new URLSearchParams(p);

      result += (result.includes('?') ? '&' : '?') + params;
    }

    return result;
  }

  /**
   * Requests a new private file access token for the current auth model (admin or record).
   *
   * @throws {ClientResponseError}
   */
  async getToken(options?: CommonOptions): Promise<string> {
    const hasToken = (data: unknown): data is { token: string } =>
      typeof data === 'object' && data !== null && 'token' in data;

    options ??= {};
    options.method = 'POST';

    const data = await this.client.send('/api/files/token', options);
    return hasToken(data) ? data.token : '';
  }
}
