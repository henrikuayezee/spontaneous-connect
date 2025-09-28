import { http, HttpResponse } from 'msw';

// Mock API endpoints for testing
export const handlers = [
  // Supabase Auth endpoints
  http.post('*/auth/v1/signup', () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
      },
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
      },
    });
  }),

  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
      },
    });
  }),

  // Supabase REST API endpoints
  http.get('*/rest/v1/users', () => {
    return HttpResponse.json([
      {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        partner_name: 'Test Partner',
        daily_call_limit: 3,
        active_days: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        morning_start: '09:00',
        evening_end: '21:00',
        created_at: '2023-01-01T00:00:00Z',
      },
    ]);
  }),

  http.post('*/rest/v1/users', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      partner_name: 'Test Partner',
      daily_call_limit: 3,
      active_days: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      morning_start: '09:00',
      evening_end: '21:00',
      created_at: '2023-01-01T00:00:00Z',
    });
  }),

  http.get('*/rest/v1/call_history', () => {
    return HttpResponse.json([
      {
        id: 'call-1',
        user_id: 'test-user-id',
        scheduled_time: '2023-01-01T14:00:00Z',
        actual_time: '2023-01-01T14:05:00Z',
        platform_used: 'phone',
        status: 'called',
        success_rating: 5,
        created_at: '2023-01-01T14:05:00Z',
      },
    ]);
  }),

  http.post('*/rest/v1/call_history', () => {
    return HttpResponse.json({
      id: 'new-call-id',
      user_id: 'test-user-id',
      scheduled_time: '2023-01-01T16:00:00Z',
      status: 'suggested',
      created_at: '2023-01-01T15:00:00Z',
    });
  }),

  http.get('*/rest/v1/schedule_helper', () => {
    return HttpResponse.json([
      {
        id: 'schedule-1',
        user_id: 'test-user-id',
        next_call_due: '2023-01-01T16:00:00Z',
        calls_today: 1,
        last_generated: '2023-01-01T15:00:00Z',
      },
    ]);
  }),

  // EmailJS mock
  http.post('https://api.emailjs.com/api/v1.0/email/send', () => {
    return HttpResponse.json({ success: true });
  }),

  // Error simulation handlers for testing error states
  http.get('*/rest/v1/users*', ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('simulate') === 'error') {
      return HttpResponse.json(
        { error: 'Internal server error', code: 500 },
        { status: 500 }
      );
    }
  }),
];