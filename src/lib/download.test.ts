import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { downloadSvg } from './download';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadSvg', () => {
  it('clicks an <a download> anchor with the given filename', () => {
    const clickSpy = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickSpy(this.download, this.href);
    });

    downloadSvg('<svg/>', 'test.svg');

    expect(clickSpy).toHaveBeenCalledTimes(1);
    const [filename, href] = clickSpy.mock.calls[0];
    expect(filename).toBe('test.svg');
    expect(href).toMatch(/^blob:/);
  });

  it('creates a Blob URL with image/svg+xml type', () => {
    const createSpy = vi.fn((_: Blob) => 'blob:abc');
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createSpy,
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadSvg('<svg/>', 'x.svg');

    expect(createSpy).toHaveBeenCalledTimes(1);
    const blob = createSpy.mock.calls[0][0];
    expect(blob.type).toBe('image/svg+xml');
  });

  it('revokes the Blob URL after clicking', () => {
    const revokeSpy = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:abc'),
      revokeObjectURL: revokeSpy,
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadSvg('<svg/>', 'x.svg');

    expect(revokeSpy).toHaveBeenCalledWith('blob:abc');
  });
});
