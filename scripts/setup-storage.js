require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function setupStorageBucket() {
  console.log('Setting up storage bucket for invoices...');
  
  try {
    // Create the invoices bucket
    const { data, error } = await supabase.storage.createBucket('invoices', {
      public: false,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['application/pdf']
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Storage bucket "invoices" already exists');
      } else {
        console.error('❌ Error creating bucket:', error);
        return;
      }
    } else {
      console.log('✅ Storage bucket "invoices" created successfully');
    }

    // Test upload to verify bucket works
    const testBuffer = Buffer.from('test');
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload('test.txt', testBuffer);

    if (uploadError) {
      console.error('❌ Error testing upload:', uploadError);
    } else {
      console.log('✅ Storage bucket test upload successful');
      
      // Clean up test file
      await supabase.storage
        .from('invoices')
        .remove(['test.txt']);
    }

  } catch (err) {
    console.error('❌ Setup failed:', err);
  }
}

setupStorageBucket();