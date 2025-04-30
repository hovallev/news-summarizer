import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

// Define the structure for our headline objects
interface Headline {
  source: string;
  title: string;
  link: string;
  pubDate?: string; // Publication date might be available
  category?: string; // Add category field
}

// RSS feed URLs
const feeds = [
  { source: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { source: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
  { source: 'CNN', url: 'http://rss.cnn.com/rss/cnn_topstories.rss' },
  // Add more feeds here later if needed
];

export async function GET() {
  const parser = new Parser();
  let allHeadlines: Headline[] = [];

  console.log('Fetching headlines...'); // Log start

  try {
    for (const feedInfo of feeds) {
      try {
        console.log(`Fetching from ${feedInfo.source}...`); // Log which feed
        const feed = await parser.parseURL(feedInfo.url);
        console.log(`Fetched ${feed.items.length} items from ${feedInfo.source}`); // Log count

        feed.items.forEach(item => {
          // Basic check for essential fields
          if (item.title && item.link) {
            // Check for categories - take the first one if available
            const category = (item.categories && item.categories.length > 0) ? item.categories[0] : 'General';

            allHeadlines.push({
              source: feedInfo.source,
              title: item.title,
              link: item.link,
              pubDate: item.pubDate || item.isoDate, // Use pubDate or isoDate if available
              category: category, // Add the determined category
            });
          }
        });
      } catch (error) {
        console.error(`Error fetching or parsing feed ${feedInfo.source}:`, error);
        // Optionally, decide if you want to return partial data or an error
        // For now, we'll just log the error and continue with other feeds
      }
    }

    console.log(`Total headlines fetched: ${allHeadlines.length}`); // Log total

    // Optional: Sort headlines, maybe by date if available and consistent
    // allHeadlines.sort((a, b) => { ... sorting logic ... });

    return NextResponse.json({ headlines: allHeadlines });

  } catch (error) {
    console.error('Error in GET /api/headlines:', error);
    return NextResponse.json({ error: 'Failed to fetch headlines' }, { status: 500 });
  }
}

// Optional: Add revalidation logic if needed later
// export const revalidate = 60; // Revalidate every 60 seconds
