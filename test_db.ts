import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
async function test() {
  const { data } = await supabaseAdmin.from('departments').select('*');
  console.log(data);
}
test();
