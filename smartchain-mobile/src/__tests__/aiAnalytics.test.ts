import {
  approveAllReorderSuggestions,
  createPosFromForecastGaps,
  fetchCashFlowForecast,
  fetchDemandForecast,
  fetchReorderSuggestions,
} from '../api/aiAnalytics';
import {apiCall} from '../api/client';

jest.mock('../api/client', () => ({
  apiCall: jest.fn(),
}));

describe('aiAnalytics API', () => {
  beforeEach(() => {
    (apiCall as jest.Mock).mockReset();
  });

  it('fetchDemandForecast posts horizon', async () => {
    (apiCall as jest.Mock).mockResolvedValue({horizonDays: 7, items: []});
    await fetchDemandForecast(14);
    expect(apiCall).toHaveBeenCalledWith('/ai/analytics/demand-forecast', {
      method: 'POST',
      body: JSON.stringify({horizonDays: 14}),
    });
  });

  it('fetchReorderSuggestions GETs suggestions', async () => {
    (apiCall as jest.Mock).mockResolvedValue({count: 0, suggestions: []});
    await fetchReorderSuggestions();
    expect(apiCall).toHaveBeenCalledWith('/ai/reorder-suggestions');
  });

  it('fetchCashFlowForecast posts days', async () => {
    (apiCall as jest.Mock).mockResolvedValue({
      days: 30,
      projectedBalance: 0,
      negativeWithinWindow: false,
      series: [],
    });
    await fetchCashFlowForecast();
    expect(apiCall).toHaveBeenCalledWith('/ai/analytics/cash-flow-forecast', {
      method: 'POST',
      body: JSON.stringify({days: 30}),
    });
  });

  it('approveAllReorderSuggestions posts approve-all', async () => {
    (apiCall as jest.Mock).mockResolvedValue({createdCount: 2, failedCount: 0});
    const res = await approveAllReorderSuggestions();
    expect(apiCall).toHaveBeenCalledWith('/ai/reorder-suggestions/approve-all', {
      method: 'POST',
    });
    expect(res.createdCount).toBe(2);
  });

  it('createPosFromForecastGaps posts product ids', async () => {
    (apiCall as jest.Mock).mockResolvedValue({createdCount: 1, failedCount: 0});
    await createPosFromForecastGaps(['p1', 'p2']);
    expect(apiCall).toHaveBeenCalledWith('/ai/analytics/demand-forecast/create-pos', {
      method: 'POST',
      body: JSON.stringify({productIds: ['p1', 'p2']}),
    });
  });
});
