import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { loadState } from '../common/utils';

export async function GET() {
  try {
    const state = await loadState();
    if (!state) return NextResponse.json({ error: 'admin_not_found' }, { status: 404 });
    return NextResponse.json(state);
  } catch (e: any) {
    return NextResponse.json({ error: 'failed_to_read_state', details: e?.message ?? String(e) }, { status: 500 });
  }
}
    
export const runtime = 'nodejs';


