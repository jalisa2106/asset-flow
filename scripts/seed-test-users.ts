import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const USERS = [
  { id: 'e1000000-0000-0000-0000-000000000001', email: 'admin@assetflow.test', password: 'admin1234', full_name: 'Aditi Admin', role: 'Admin', department: 'Engineering' },
  { id: 'e1000000-0000-0000-0000-000000000002', email: 'manager@assetflow.test', password: 'manager1234', full_name: 'Manoj Manager', role: 'Asset Manager', department: 'Facilities' },
  { id: 'e1000000-0000-0000-0000-000000000003', email: 'depthead@assetflow.test', password: 'depthead1234', full_name: 'Divya Depthead', role: 'Department Head', department: 'Engineering' },
  { id: 'e1000000-0000-0000-0000-000000000004', email: 'employee@assetflow.test', password: 'employee1234', full_name: 'Ekta Employee', role: 'Employee', department: 'Field Ops' },
  { id: 'e1000000-0000-0000-0000-000000000005', email: 'priya.shah@assetflow.test', password: 'priya12345', full_name: 'Priya Shah', role: 'Employee', department: 'Engineering' },
  { id: 'e1000000-0000-0000-0000-000000000006', email: 'raj.mehta@assetflow.test', password: 'raj123456', full_name: 'Raj Mehta', role: 'Employee', department: 'Engineering' },
  { id: 'e1000000-0000-0000-0000-000000000007', email: 'arjun.nair@assetflow.test', password: 'arjun12345', full_name: 'Arjun Nair', role: 'Employee', department: 'Facilities' },
  { id: 'e1000000-0000-0000-0000-000000000008', email: 'sana.iqbal@assetflow.test', password: 'sana123456', full_name: 'Sana Iqbal', role: 'Department Head', department: 'Human Resources' },
  { id: 'e1000000-0000-0000-0000-000000000009', email: 'aditi.rao@assetflow.test', password: 'aditi123456', full_name: 'Aditi Rao', role: 'Asset Manager', department: 'IT Support' },
  { id: 'e1000000-0000-0000-0000-000000000010', email: 'rohan.mehta@assetflow.test', password: 'rohan123456', full_name: 'Rohan Mehta', role: 'Employee', department: 'Field Ops' },
  { id: 'e1000000-0000-0000-0000-000000000011', email: 'lisa.gomes@assetflow.test', password: 'lisa123456', full_name: 'Lisa Gomes', role: 'Employee', department: 'Human Resources' },
  { id: 'e1000000-0000-0000-0000-000000000012', email: 'karan.shah@assetflow.test', password: 'karan123456', full_name: 'Karan Shah', role: 'Employee', department: 'Finance (legacy)', status: 'Inactive' },
];

async function main() {
  const { data: departments } = await supabaseAdmin.from('departments').select('id, name');
  const deptIdByName = Object.fromEntries((departments ?? []).map((d) => [d.name, d.id]));

  for (const u of USERS) {
    // This is the supported call — creates the auth.users row AND the matching
    // auth.identities row correctly, in one step, with no manual SQL needed.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: u.password,
      email_confirm: true, // skips email verification, same effect as the SQL email_confirmed_at trick
      user_metadata: { full_name: u.full_name },
    });

    let userId = data?.user?.id;
    if (error) {
      if (error.message.includes('User already registered') || error.status === 422 || error.message.includes('already exists')) {
        userId = u.id; // We know the ID because we hardcoded it!
      } else {
        console.error(`Failed to create ${u.email}:`, error.message);
        continue;
      }
    }

    // handle_new_user() trigger already inserted an employee_profiles row with role='Employee'.
    // Now update it to the intended role/department/status for this seeded persona.
    const { error: updateError } = await supabaseAdmin
      .from('employee_profiles')
      .update({
        role: u.role,
        department_id: deptIdByName[u.department] ?? null,
        status: u.status ?? 'Active',
      })
      .eq('id', userId);

    if (updateError) console.error(`Failed to update profile for ${u.email}:`, updateError.message);
    else console.log(`✓ ${u.email} (${u.role})`);
  }
}

main();
