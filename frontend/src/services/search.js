import { apiClient } from './api';

export const searchService = {
  /**
   * Perform semantic search on academic resources
   */
  async semanticSearch(query) {
    const response = await apiClient.post(
      '/search/semantic',
      query
    );
    return response.data;
  },

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(query) {
    const response = await apiClient.get(
      '/search/suggestions',
      { params: { q: query } }
    );
    return response.data.suggestions;
  },

  /**
   * Get trending searches
   */
  async getTrendingSearches() {
    const response = await apiClient.get(
      '/search/trending'
    );
    return response.data.searches;
  },

  /**
   * Save search query for analytics
   */
  async logSearch(query, resultCount) {
    await apiClient.post('/search/log', { query, resultCount });
  },
};
