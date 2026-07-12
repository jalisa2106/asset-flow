import { NextResponse } from 'next/server';
import { PG_ERROR } from '@/lib/constants';

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return apiError('You do not have permission to perform this action', 403);
}

export function notFound(entity: string) {
  return apiError(`${entity} not found`, 404);
}

export function fromPostgresError(error: { code?: string; message: string }, context: {
  onUniqueViolation?: () => NextResponse;
  onExclusionViolation?: () => NextResponse;
} = {}) {
  if (error.code === PG_ERROR.UNIQUE_VIOLATION && context.onUniqueViolation) {
    return context.onUniqueViolation();
  }
  if (error.code === PG_ERROR.EXCLUSION_VIOLATION && context.onExclusionViolation) {
    return context.onExclusionViolation();
  }
  if (error.code === PG_ERROR.RAISE_EXCEPTION) {
    return apiError(error.message, 409);
  }
  // PGRST116: .single() returned no rows — usually means the status guard filtered it out
  if (error.code === 'PGRST116') {
    return apiError('Record not found or current status does not allow this action', 404);
  }
  return apiError('Something went wrong processing this request', 400);
}
