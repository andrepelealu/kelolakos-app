import fs from 'fs';
import path from 'path';

export function initializeTempDirectory() {
  if (typeof window !== 'undefined') return; // Only run on server
  
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
      console.log('Creating temp directory:', tempDir);
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('Temp directory created successfully');
    } else {
      console.log('Temp directory already exists:', tempDir);
    }
  } catch (error) {
    console.error('Error initializing temp directory:', error);
  }
}

// Initialize on module load
initializeTempDirectory();