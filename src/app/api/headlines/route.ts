import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import path from 'path'; // Import path
import fs from 'fs';   // Import fs

// --- Direct File Read Logic for API Key --- START ---
let apiKeyFromFile: string | null = null;
let apiKeyReadError: string | null = null;
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  console.log(`Headlines route: Attempting to read API key directly from: ${envPath}`);
  const fileContent = fs.readFileSync(envPath, { encoding: 'utf8' });
  const lines = fileContent.split('\\n');
  const keyLine = lines.find(line => line.trim().startsWith('OPENAI_API_KEY='));
  if (keyLine) {
    apiKeyFromFile = keyLine.trim().substring('OPENAI_API_KEY='.length);
    console.log(`Headlines route: Successfully read and parsed key directly from file.`);
  } else {
    apiKeyReadError = "Headlines route: Could not find OPENAI_API_KEY= line in .env.local";
    console.error(`!!! ${apiKeyReadError}`);
  }
} catch (err: any) {
  apiKeyReadError = `Headlines route: Error reading .env.local directly: ${err.message}`;
  console.error(`!!! ${apiKeyReadError}`);
}
// --- Direct File Read Logic for API Key --- END ---


// Define the structure for our headline objects
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

// RSS feed URLs
const feeds = [
  { source: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { source: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
  { source: 'CNN', url: 'http://rss.cnn.com/rss/cnn_topstories.rss' },
];

// Define the categories for classification
const CATEGORIES = ["Politics", "Technology", "Business", "Sports", "World News", "Entertainment", "Health", "Science", "General"];

// Initialize OpenAI client using the key read from file
let openai: OpenAI | null = null;
if (apiKeyFromFile && !apiKeyReadError) {
  try {
    const keyToUse = apiKeyFromFile.trim(); // Trim whitespace just in case
    const maskedKey = `${keyToUse.substring(0, 5)}...${keyToUse.substring(keyToUse.length - 4)}`;
    console.log(`Headlines route: Initializing OpenAI client with key from file: ${maskedKey}`);
    openai = new OpenAI({
      apiKey: keyToUse,
    });
  } catch (error) {
    console.error("Headlines route: Failed to initialize OpenAI client (with key from file):", error);
  }
} else {
    console.error("Headlines route: OpenAI client NOT initialized because API key could not be read from file.");
    // Optionally, you could throw the apiKeyReadError here if the key is absolutely required
}


// Function to classify a single headline using OpenAI
async function classifyHeadline(title: string): Promise<string> {
  if (!openai) {
    // Log the original file read error if that was the cause
    const reason = apiKeyReadError ? `Reason: ${apiKeyReadError}` : 'OpenAI client not initialized.';
    console.warn(`Skipping classification. ${reason}`);
    return 'General'; // Default category if OpenAI is not available
  }

  const prompt = `Classify the following news headline into one of these categories: ${CATEGORIES.join(', ')}. Respond with only the category name.\r\n\r\nHeadline: \"${title}\"\r\n\r\nCategory:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1", // Using 4.1 as in the test route
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 10,
    });

    let category = completion.choices[0]?.message?.content?.trim() || 'General';

    // Validate if the returned category is one of the predefined ones
    if (!CATEGORIES.includes(category)) {
        console.warn(`OpenAI returned an unexpected category: \"${category}\" for title: \"${title}\". Defaulting to General.`);
        category = 'General';
    }
    return category;

  } catch (error) {
    console.error(`Error classifying headline \"${title}\":`, error);
    return 'General'; // Default to General on error
  }
}


// Function to summarize headlines for a source using OpenAI
async function summarizeSourceHeadlines(titles: string[]): Promise<string> {
  if (!openai || titles.length === 0) {
    const reason = !openai ? (apiKeyReadError ? `Reason: ${apiKeyReadError}` : 'OpenAI client not initialized.') : 'No titles provided.';
    console.warn(`Skipping summary. ${reason}`);
    return 'No summary available.';
  }

  // Limit the number of titles sent for summary to avoid overly long prompts/costs
  const titlesForSummary = titles.slice(0, 20); // Use first 20 titles

  const prompt = `Based on the following news headlines, provide a very brief (1-2 sentences) summary of the main topics currently being reported:\\n\\n${titlesForSummary.map(t => `- ${t}`).join('\\n')}\\n\\nSummary:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1", // Using 4.1
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 60,
    });

    let summary = completion.choices[0]?.message?.content?.trim() || 'Could not generate summary.';

    return summary; // Return the raw summary

  } catch (error) {
    console.error(`Error generating summary:`, error);
    // Return the error message without the label
    return 'Error generating summary.';
  }
}


export async function GET() {
  // Check if the client failed to initialize due to key reading error
  if (!openai && apiKeyReadError) {
      return NextResponse.json({ error: `Failed to initialize OpenAI: ${apiKeyReadError}` }, { status: 500 });
  }
  const parser = new Parser();
  const resultsBySource: ApiResponse = {}; // Use the new ApiResponse interface

  console.log('Fetching and processing headlines by source...');

  try {
    // Process feeds sequentially to manage OpenAI calls per source
    for (const feedInfo of feeds) {
      let sourceHeadlinesRaw: { title: string; link: string; pubDate?: string }[] = [];
      let classifiedHeadlines: Headline[] = [];
      let summary = 'Summary not available.';

      try {
        console.log(`Fetching from ${feedInfo.source}...`);
        const feed = await parser.parseURL(feedInfo.url);
        console.log(`Fetched ${feed.items.length} items from ${feedInfo.source}`);

        feed.items.forEach(item => {
          if (item.title && item.link) {
            sourceHeadlinesRaw.push({
              title: item.title,
              link: item.link,
              pubDate: item.pubDate || item.isoDate,
            });
          }
        });

        if (sourceHeadlinesRaw.length > 0) {
          // Classify headlines for this source
          console.log(`Classifying ${sourceHeadlinesRaw.length} headlines for ${feedInfo.source}...`);
          const classificationPromises = sourceHeadlinesRaw.map(async (rawHeadline) => {
            const category = await classifyHeadline(rawHeadline.title);
            return {
              ...rawHeadline,
              source: feedInfo.source, // Ensure source is added
              category: category,
            } as Headline;
          });
          classifiedHeadlines = await Promise.all(classificationPromises);
          console.log(`Classification complete for ${feedInfo.source}.`);

          // Generate summary for this source
          console.log(`Generating summary for ${feedInfo.source}...`);
          const titles = classifiedHeadlines.map(h => h.title);
          summary = await summarizeSourceHeadlines(titles);
          console.log(`Summary generated for ${feedInfo.source}.`);
        }

      } catch (error) {
        console.error(`Error processing feed ${feedInfo.source}:`, error);
        summary = 'Error processing feed data.'; // Set error summary for this source
      }

      // Store results for this source
      resultsBySource[feedInfo.source] = {
        summary: summary,
        headlines: classifiedHeadlines, // Store the classified headlines
      };
    }

    console.log('All sources processed.');
    return NextResponse.json(resultsBySource); // Return the structured object

  } catch (error) {
    console.error('Error in GET /api/headlines:', error);
    // Removed the specific OPENAI_API_KEY check as we handle initialization failure earlier
    return NextResponse.json({ error: 'Failed to fetch, classify, or summarize headlines' }, { status: 500 });
  }
}

// Optional: Add revalidation logic if needed later
// export const revalidate = 60; // Revalidate every 60 seconds
