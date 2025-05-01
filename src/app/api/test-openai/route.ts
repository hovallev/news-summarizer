import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// import dotenv from 'dotenv'; // No longer using dotenv for this test
import path from 'path';
import fs from 'fs'; // Import Node.js file system module

// --- Direct File Read Logic --- START ---
let apiKeyFromFile: string | null = null;
let fileReadError: string | null = null;
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  console.log(`Attempting to read API key directly from: ${envPath}`);
  const fileContent = fs.readFileSync(envPath, { encoding: 'utf8' });
  // Simple parsing: find the line starting with OPENAI_API_KEY=
  const lines = fileContent.split('\\n'); // Split by newline
  const keyLine = lines.find(line => line.trim().startsWith('OPENAI_API_KEY='));
  if (keyLine) {
    apiKeyFromFile = keyLine.trim().substring('OPENAI_API_KEY='.length);
    console.log(`Successfully read and parsed key directly from file.`);
  } else {
    fileReadError = "Could not find OPENAI_API_KEY= line in .env.local";
    console.error(`!!! ${fileReadError}`);
  }
} catch (err: any) {
  fileReadError = `Error reading .env.local directly: ${err.message}`;
  console.error(`!!! ${fileReadError}`);
}
// --- Direct File Read Logic --- END ---


export async function GET() {
  try {
    console.log("--- Testing OpenAI API connection (using direct file read) ---");

    // Use the key read directly from the file
    const apiKey = apiKeyFromFile;

    if (fileReadError) {
        // If file reading failed earlier, throw that error
        throw new Error(fileReadError);
    }

    if (!apiKey) {
      console.error("!!! API key was not successfully extracted from file !!!");
      throw new Error('API key could not be extracted directly from .env.local.');
    } else {
      const maskedKey = `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`;
      console.log(`Using key directly from file: ${maskedKey}`);

      // --- DETAILED KEY INSPECTION (from file read) --- START ---
      console.log(`Inspecting apiKey (from file) before use:`);
      console.log(`  Type: ${typeof apiKey}`);
      console.log(`  Length: ${apiKey.length}`);
      const firstChars = apiKey.substring(0, 5);
      const firstCharCodes = Array.from(firstChars).map(char => char.charCodeAt(0));
      console.log(`  First 5 chars: "${firstChars}", Char codes: [${firstCharCodes.join(', ')}]`);
      const lastChars = apiKey.substring(apiKey.length - 5);
      const lastCharCodes = Array.from(lastChars).map(char => char.charCodeAt(0));
      console.log(`  Last 5 chars: "${lastChars}", Char codes: [${lastCharCodes.join(', ')}]`);
      if (apiKey !== apiKey.trim()) {
          console.warn("  !!! WARNING: API key (from file) has leading or trailing whitespace !!!");
      }
      // --- DETAILED KEY INSPECTION (from file read) --- END ---
    }

    // Initialize OpenAI client *after* inspection
    const openai = new OpenAI({
      // Use trim() just in case there's whitespace we didn't catch
      apiKey: apiKey.trim(),
    });

    console.log("Attempting to call OpenAI chat.completions.create with gpt-4.1...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1", // Keep desired model
      messages: [{ role: "user", content: "Hello from the gpt-4.1 test route!" }],
      max_tokens: 15,
    });

    console.log("OpenAI API call successful!");
    return NextResponse.json({
      success: true,
      message: completion.choices[0]?.message?.content || 'No response content',
      model: completion.model,
    });

  } catch (error: any) {
    console.error("--- OpenAI API Test Error (using direct file read) ---");
    console.error("Timestamp:", new Date().toISOString());

    // Log the error object structure if possible
    if (error instanceof Error) {
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        // If it's an OpenAI API Error, it might have more details
        if ('status' in error) console.error("Error Status:", error.status);
        if ('code' in error) console.error("Error Code:", error.code);
        if ('type' in error) console.error("Error Type:", error.type);
        if ('request_id' in error) console.error("Request ID:", error.request_id); // Useful for OpenAI support
    } else {
        console.error("Caught non-Error object:", error);
    }
    console.error("-----------------------------");

    // Extract relevant error details for the response
    const errorDetails = {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      status: error.status
    };

    // Ensure a response is sent even on error
    return NextResponse.json({
      success: false,
      error: errorDetails // Send structured error details
    }, { status: error.status || 500 }); // Use error status if available, else 500
  }
}
