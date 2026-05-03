const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vfegpejicvcykajbfwdx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZWdwZWppY3ZjeWthamJmd2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTQ2OTgsImV4cCI6MjA5MTA5MDY5OH0.Ouq8FYhprY3sAyU24UqalVV_53PoNfwxCo38O-1ZyQs'
);

async function run() {
  const { data: p } = await supabase.from('prestamos').select('*').limit(2);
  console.log('Prestamos:', p);

  const { data: pa } = await supabase.from('pagos').select('*').limit(2);
  console.log('Pagos:', pa);
}

run();
