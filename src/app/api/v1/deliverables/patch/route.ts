import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  const supabase = createClient();
  try {
    const { id, updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (updates.planned_week_start && new Date(updates.planned_week_start).getDay() !== 0) {
      return NextResponse.json({ error: 'planned_week_start must be a Sunday' }, { status: 400 });
    }
    if (updates.planned_week_end && new Date(updates.planned_week_end).getDay() !== 0) {
      return NextResponse.json({ error: 'planned_week_end must be a Sunday' }, { status: 400 });
    }

    // We should ideally fetch current to validate end >= start if only one was provided,
    // but trusting client alignment for patch for now unless both are sent.
    if (updates.planned_week_start && updates.planned_week_end) {
      if (new Date(updates.planned_week_end) < new Date(updates.planned_week_start)) {
        return NextResponse.json({ error: 'planned_week_end must be >= planned_week_start' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('deliverables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
