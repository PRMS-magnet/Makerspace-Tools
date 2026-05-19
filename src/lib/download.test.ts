// @vitest-environment jsdom
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

  it('defers revoking the Blob URL until after the click event settles (iOS/Safari race fix)', () => {
    vi.useFakeTimers();
    try {
      const revokeSpy = vi.fn();
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => 'blob:abc'),
        revokeObjectURL: revokeSpy,
      });
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      downloadSvg('<svg/>', 'x.svg');

      // Not revoked synchronously -- the URL must remain valid while the
      // browser starts the download.
      expect(revokeSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(revokeSpy).toHaveBeenCalledWith('blob:abc');
    } finally {
      vi.useRealTimers();
    }
  });

  it('sanitizes path-separator characters out of the filename', () => {
    const clickSpy = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickSpy(this.download);
    });

    downloadSvg('<svg/>', 'evil/path:with*reserved?chars.svg');

    expect(clickSpy).toHaveBeenCalledWith('evil_path_with_reserved_chars.svg');
  });
});
