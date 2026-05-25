import {ApiError} from '../../api/client';
import {verifyTinWithRra} from '../tinValidation';

jest.mock('../../api/client', () => {
  const actual = jest.requireActual('../../api/client');
  return {
    ...actual,
    apiCall: jest.fn(),
  };
});

const {apiCall} = jest.requireMock('../../api/client') as {
  apiCall: jest.Mock;
};

describe('verifyTinWithRra', () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it('passes when format is valid and API reports registered', async () => {
    apiCall.mockResolvedValueOnce({
      registered: true,
      name: 'ACME Rwanda Ltd',
    });

    const result = await verifyTinWithRra('123456789');

    expect(result).toEqual({registered: true, name: 'ACME Rwanda Ltd'});
    expect(apiCall).toHaveBeenCalledTimes(1);
    expect(apiCall).toHaveBeenCalledWith('/compliance/tin/validate', {
      method: 'POST',
      body: JSON.stringify({tin: '123456789'}),
    });
  });

  it('throws before API call when TIN format is invalid', async () => {
    await expect(verifyTinWithRra('12')).rejects.toThrow('9 digits');
    expect(apiCall).not.toHaveBeenCalled();
  });

  it('returns not registered when API reports unregistered TIN', async () => {
    apiCall.mockResolvedValueOnce({
      registered: false,
      error: 'Unknown TIN',
    });

    const result = await verifyTinWithRra('987654321');

    expect(result).toEqual({registered: false});
  });

  it('propagates network errors instead of silently passing', async () => {
    apiCall.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(verifyTinWithRra('123456789')).rejects.toThrow(
      'Network request failed',
    );
  });

  it('propagates non-2xx API errors', async () => {
    apiCall.mockRejectedValueOnce(new ApiError(503, {message: 'Service unavailable'}));

    await expect(verifyTinWithRra('123456789')).rejects.toThrow(
      'Service unavailable',
    );
  });

  it('throws on timeout', async () => {
    jest.useFakeTimers();
    apiCall.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    const pending = verifyTinWithRra('123456789');
    jest.advanceTimersByTime(10_001);

    await expect(pending).rejects.toThrow('TIN validation timed out');
    jest.useRealTimers();
  });
});
