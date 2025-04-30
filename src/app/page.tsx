'use client';

import { useState, useEffect } from 'react';

// Define the structure for our headline objects (matching the API)
interface Headline {
  source: string;
  title: string;
  link: string;
  pubDate?: string;
}

// Group headlines by source
interface GroupedHeadlines {
  [source: string]: Headline[];
}

export default function Home() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeadlines = async () => {
    setIsLoading(true);
    setError(null);
    console.log('Fetching headlines from API...');
    try {
      const response = await fetch('/api/headlines');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      console.log('Headlines received:', data.headlines.length);
      setHeadlines(data.headlines || []); // Ensure headlines is always an array
    } catch (e: any) {
      console.error('Failed to fetch headlines:', e);
      setError(e.message || 'An unknown error occurred');
      setHeadlines([]); // Clear headlines on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch headlines when the component mounts
  useEffect(() => {
    fetchHeadlines();
  }, []); // Empty dependency array means this runs once on mount

  // Group headlines by source for rendering
  const groupedHeadlines = headlines.reduce(
    (acc, headline) => {
      const { source } = headline;
      if (!acc[source]) {
        acc[source] = [];
      }
      acc[source].push(headline);
      return acc;
    },
    {} as GroupedHeadlines
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header Section */}
      <header className="bg-white shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
              {/* Optional: Add an icon here */}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center text-gray-500 py-16">
            <svg className="animate-spin mx-auto h-10 w-10 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-medium">Loading fresh headlines...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow-sm w-full max-w-3xl mx-auto">
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
        {!isLoading && !error && Object.keys(groupedHeadlines).length === 0 && (
          <div className="text-center text-gray-500 py-16">
             {/* Optional: Add an icon for empty state */}
            <p className="text-lg">No headlines found. Try refreshing!</p>
          </div>
        )}

        {/* Headlines Grid */}
        {!isLoading && !error && Object.keys(groupedHeadlines).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {Object.entries(groupedHeadlines).map(([source, sourceHeadlines]) => (
              <div key={source} className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
                {/* Updated Card Header - Removed logo */}
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center space-x-3">
                   {/* Removed Logo Image */}
                   <h2 className="text-lg font-semibold text-gray-800 truncate flex-grow min-w-0">{source}</h2>
                </div>
                <ul className="space-y-3 p-5 flex-grow">
                  {sourceHeadlines.map((headline, index) => (
                    <li key={`${source}-${index}-${headline.link}`} className="text-sm leading-normal">
                      <a
                        href={headline.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:text-blue-900 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-300 rounded transition-colors duration-150 group"
                      >
                        {headline.title}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-xs ml-1">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
