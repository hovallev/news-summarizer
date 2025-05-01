'use client';

import { useState, useEffect, useCallback } from 'react'; // Import useCallback

// Define the structure for our headline objects (matching the API)
interface Headline {
  source: string;
  title: string;
  link: string;
  pubDate?: string;
  category: string; // Category determined by AI
}

// Define the structure for the data returned for each source
interface SourceData {
  summary: string;
  headlines: Headline[];
}

// Define the structure for the final API response
interface ApiResponse {
  [source: string]: SourceData;
}

// Group headlines by category within a source
interface GroupedSourceHeadlines {
  [category: string]: Headline[];
}

// Define the order of categories for display
const CATEGORY_ORDER = ["Politics", "World News", "Business", "Technology", "Science", "Health", "Sports", "Entertainment", "General"];

export default function Home() {
  const [sourceData, setSourceData] = useState<ApiResponse>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeadlines = async () => {
    setIsLoading(true);
    setError(null);
    console.log('Fetching headlines from API...');
    try {
      const response = await fetch('/api/headlines');
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMsg = errorData.error;
            }
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      const data: ApiResponse = await response.json(); // Expect ApiResponse structure
      if (typeof data !== 'object' || data === null) {
          throw new Error("Invalid data format received from API.");
      }
      // Check for error property specifically if the API might return { error: '...' } on failure
      if ('error' in data && typeof (data as any).error === 'string') {
          throw new Error((data as any).error);
      }

      console.log('Headline data received:', Object.keys(data).length, 'sources');
      setSourceData(data || {}); // Store the entire object

    } catch (e: any) {
      console.error('Failed to fetch headlines:', e);
      setError(e.message || 'An unknown error occurred');
      setSourceData({}); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch headlines when the component mounts
  useEffect(() => {
    fetchHeadlines();
  }, []);

  // Function to adjust summary heights
  const adjustSummaryHeights = useCallback(() => {
    // Run only if data is loaded and rendered
    if (!isLoading && !error && Object.keys(sourceData).length > 0) {
      const summaryElements = document.querySelectorAll<HTMLDivElement>('.summary-container');
      if (summaryElements.length > 0) {
        let maxHeight = 0;
        // Reset heights first to measure natural height
        summaryElements.forEach(el => {
          el.style.minHeight = '';
        });
        // Find the max height
        summaryElements.forEach(el => {
          if (el.offsetHeight > maxHeight) {
            maxHeight = el.offsetHeight;
          }
        });
        // Apply the max height
        summaryElements.forEach(el => {
          el.style.minHeight = `${maxHeight}px`;
        });
        console.log(`Adjusted summary heights to: ${maxHeight}px`);
      }
    }
  }, [isLoading, error, sourceData]); // Dependencies for the callback

  // Effect to run height adjustment after data loads and on resize
  useEffect(() => {
    // Adjust heights once data is loaded
    adjustSummaryHeights();

    // Add resize listener
    window.addEventListener('resize', adjustSummaryHeights);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('resize', adjustSummaryHeights);
    };
  }, [adjustSummaryHeights]); // Dependency is the memoized callback

  // Helper function to group headlines by category for a single source
  const groupHeadlinesByCategory = (headlines: Headline[]): GroupedSourceHeadlines => {
    return headlines.reduce((acc, headline) => {
      const { category } = headline;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(headline);
      return acc;
    }, {} as GroupedSourceHeadlines);
  };

  // Helper function to sort categories
  const sortCategories = (categories: string[]): string[] => {
    return [...categories].sort((a, b) => {
        const indexA = CATEGORY_ORDER.indexOf(a);
        const indexB = CATEGORY_ORDER.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  };


  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Section */}
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-200">
        {/* ... (header content remains the same) ... */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600 hidden sm:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6 4h6" />
              </svg>
              Headline Hub
            </h1>
            <button
              onClick={fetchHeadlines}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
            >
              {/* ... (button content remains the same) ... */}
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2M15 15h-1.419" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center text-gray-500 py-16">
            <svg className="animate-spin mx-auto h-10 w-10 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-medium">Loading, Classifying & Summarizing headlines...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm w-full max-w-3xl mx-auto">
            {/* ... (error display remains the same) ... */}
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">Error fetching headlines:</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && Object.keys(sourceData).length === 0 && (
          <div className="text-center text-gray-500 py-16">
            <p className="text-lg">No headlines found. Try refreshing.</p>
          </div>
        )}

        {/* Headlines Grid - Grouped by Source */}
        {!isLoading && !error && Object.keys(sourceData).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Iterate over sources from the API response */}
            {Object.entries(sourceData).map(([source, data]) => {
              // Group headlines for this source by category
              const headlinesByCategory = groupHeadlinesByCategory(data.headlines);
              const categoriesForSource = sortCategories(Object.keys(headlinesByCategory));

              return (
                <div key={source} className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
                  {/* Card Header: Source Name */}
                  <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                     <h2 className="text-base font-semibold text-gray-700 tracking-wide uppercase truncate">{source}</h2>
                  </div>

                  {/* Source Summary */}
                  {/* Add flex properties for vertical alignment */}
                  <div className="summary-container px-5 py-4 border-b border-gray-100 flex flex-col justify-between">
                      {/* Wrap summary text in a div if needed, but often not necessary */}
                      <div>
                          <p className="text-sm text-gray-600 italic">{data.summary || 'Summary not available.'}</p>
                      </div>
                      {/* Conditionally render the AI tag */}
                      {data.summary && !data.summary.startsWith('Error') && data.summary !== 'No summary available.' && data.summary !== 'Could not generate summary.' && (
                        // The tag will be pushed to the bottom by justify-between
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mt-2 self-start"> {/* Use self-start if you want it left-aligned */}
                          AI-generated summary
                        </span>
                      )}
                  </div>

                  {/* Headlines grouped by Category within the Source Card */}
                  <div className="p-5 flex-grow space-y-4">
                      {categoriesForSource.length === 0 && (
                          <p className="text-sm text-gray-500">No headlines found for this source.</p>
                      )}
                      {categoriesForSource.map((category) => (
                          <div key={category}>
                              <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">{category}</h3>
                              <ul className="space-y-2">
                                  {headlinesByCategory[category].map((headline, index) => (
                                      <li key={`${source}-${category}-${index}-${headline.link}`}>
                                          <a
                                              href={headline.link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm font-medium text-gray-800 hover:text-blue-700 leading-snug group transition-colors duration-150 block"
                                          >
                                              {headline.title}
                                              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-xs ml-1 text-blue-600">↗</span>
                                          </a>
                                          {/* Optional: Display pubDate if needed */}
                                          {/* {headline.pubDate && <span className="text-xs text-gray-500 mt-1 block">{new Date(headline.pubDate).toLocaleString()}</span>} */}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}