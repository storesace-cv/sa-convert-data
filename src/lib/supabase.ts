import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = 'https://jdqcdhrjjsxrctslamnk.supabase.co';
const supabaseKey = 'sb_publishable_GhDS_hvHWPqX9cRf1dViHw_VU2qsmeJ';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };