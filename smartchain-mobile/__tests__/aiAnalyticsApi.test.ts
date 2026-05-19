import {approveAllReorderSuggestions} from '../src/api/aiAnalytics';
import {apiCall} from '../src/api/client';

jest.mock('../src/api/client', () => ({
  apiCall: jest.fn(),
}));

describe('aiAnalytics API', () => {
  it('approveAllReorderSuggestions posts to backend', async () => {
    (apiCall as jest.Mock).mockResolvedValue({createdCount: 2, failedCount: 0});
    const res = await approveAllReorderSuggestions();
    expect(apiCall).toHaveBeenCalledWith('/ai/reorder-suggestions/approve-all', {
      method: 'POST',
    });
    expect(res.createdCount).toBe(2);
  });
});
