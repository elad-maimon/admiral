import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from('teams').select(`
    *,
    people(*)
  `).order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    const { data, error } = await supabase
      .from('teams')
      .insert([{ name }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
