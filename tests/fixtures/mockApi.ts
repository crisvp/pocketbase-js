import { DefaultBodyType, http, HttpResponse, HttpResponseResolver, JsonBodyType, PathParams } from 'msw';
import { setupServer as mswSetupServer } from 'msw/node';
import { expect } from 'vitest';

const pageMatcher: HttpResponseResolver<PathParams, DefaultBodyType, JsonBodyType> = ({ request, params }) => {
  const paramResponses = {
    'page=1&perPage=1&filter=test%3D123&skipTotal=1&q1=abc': {
      page: 1,
      perPage: 1,
      totalItems: 3,
      totalPages: 3,
      items: [{ id: 'item1' }],
    },
    'page=1&perPage=1&skipTotal=1&q1=emptyRequest': {
      page: 1,
      perPage: 1,
      totalItems: -1,
      totalPages: -1,
      items: [{ id: 'item1' }],
    },
    'page=2&perPage=1&skipTotal=1&q1=emptyRequest': {
      page: 2,
      perPage: 1,
      totalItems: -1,
      totalPages: -1,
      items: [{ id: 'item2' }],
    },
    'page=3&perPage=1&skipTotal=1&q1=emptyRequest': {
      page: 3,
      perPage: 1,
      totalItems: -1,
      totalPages: -1,
      items: [],
    },
    'page=1&perPage=2&skipTotal=1&q1=noEmptyRequest': {
      page: 1,
      perPage: 2,
      totalItems: -1,
      totalPages: -1,
      items: [{ id: 'item1' }, { id: 'item2' }],
    },
    'page=2&perPage=2&skipTotal=1&q1=noEmptyRequest': {
      page: 2,
      perPage: 2,
      totalItems: -1,
      totalPages: -1,
      items: [{ id: 'item3' }],
    },
    'page=1&perPage=1&q1=abc': {
      page: 1,
      perPage: 1,
      totalItems: 3,
      totalPages: 3,
      items: [{ id: 'item1' }, { id: 'item2' }],
    },
    'page=2&perPage=1&q1=abc': {
      page: 2,
      perPage: 1,
      totalItems: 3,
      totalPages: 3,
      items: [{ id: 'item3' }],
    },
  };
  const urlParams = request.url.split('?')[1];
  let response = urlParams ? (paramResponses as Record<string, JsonBodyType>)[urlParams] : undefined;

  if (!response && params.collection === 'backups') {
    response = [
      {
        key: 'test1',
        modified: '2023-05-18 10:00:00.123Z',
        size: 100,
      },
      {
        key: 'test2',
        modified: '2023-05-18 11:00:00.123Z',
        size: 200,
      },
    ];
  }

  return HttpResponse.json(
    response ?? {
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
      items: [{ id: 'item' }],
    }
  );
};

const restHandlers = [
  http.get('/123', () => HttpResponse.json('successGet')),
  http.post('/123', () => HttpResponse.json('successPost')),
  http.put('/123', () => HttpResponse.json('successPut')),
  http.patch('/123', () => HttpResponse.json('successPatch')),
  http.delete('/123', () => HttpResponse.json('successDelete')),
  http.post('/multipart', () => HttpResponse.json('successMultipart')),
  http.post('/multipartAuto', async ({ request }) => {
    const body = await request.formData();
    console.log('bbb', body);
    const [file1, file2] = body.getAll('files[]');
    if (typeof file1 !== 'object' || typeof file2 !== 'object')
      throw new Error(`Invalid file type: ${typeof file1}, ${typeof file2}`);

    expect(file1.size).toEqual(2);
    expect(file2.size).toEqual(1);

    return HttpResponse.json('successMultipartAuto');
  }),

  // Authentication tests
  http.get('/unauthenticated', ({ request }) => {
    if (request.headers.get('Authorization') !== undefined) return HttpResponse.json('successAuth');
    return HttpResponse.json('unauthorized', { status: 400 });
  }),
  http.get('/admin', ({ request }) => {
    if (request.headers.get('Authorization') === 'token123') return HttpResponse.json('successAuth');

    return HttpResponse.json('unauthorized', { status: 401 });
  }),
  http.get('/user', ({ request }) => {
    if (request.headers.get('Authorization') === 'token123') return HttpResponse.json('successAuth');

    return HttpResponse.json('unauthorized', { status: 401 });
  }),

  // Other tests
  http.get('/old', () => HttpResponse.json('successOld')),
  http.get('/new', ({ request }) => {
    expect(request.headers.get('X-Custom-Header')).toEqual('456');
    return HttpResponse.json('successNew');
  }),
  http.get('/success', () => HttpResponse.json('success')),
  http.get('/failure', () => HttpResponse.json('failure', { status: 500 })),
  http.get(
    'http://*:8090/slow-*',
    () => new Promise<HttpResponse>(resolve => setTimeout(() => resolve(HttpResponse.json('success')), 0))
  ),

  // SettingsService
  http.get('*/api/settings', () => {
    return HttpResponse.json({ test: 'abc' });
  }),
  http.patch('*/api/settings', () => {
    return HttpResponse.json({ test: 'abc' });
  }),
  http.post('*/api/settings/test/s3', () => {
    return new Response(null, { status: 204 });
    // return HttpResponse.json(, { status: 204 });
  }),
  http.post('*/api/settings/test/email', () => {
    return HttpResponse.json({ test: 'abc' });
  }),
  http.post('*/api/settings/apple/generate-client-secret', () => {
    return HttpResponse.json({ secret: 'test' });
  }),

  // // RecordService
  http.get('*/api/collections/sub%3D/auth-refresh', () => {
    return HttpResponse.json({
      token: 'token_refresh',
      record: { id: 'id_refresh' },
    });
  }),
  http.patch('*/api/collections/sub%3D/records/test123', () => {
    return HttpResponse.json({ id: 'test123', email: 'new@example.com' });
  }),
  http.get('*/api/collections/sub%3D/records/abc%3D', () => {
    return HttpResponse.json({ id: 'item-one' });
  }),
  http.post('*/api/collections/sub%3D/records', () => HttpResponse.json({ id: 'item-post' })),
  http.get(/\/api\/collections\/([^/]+\/)*records/, () => {
    return HttpResponse.json({
      items: [{ id: 'item1' }],
    });
  }),
  http.delete('/api/collections/sub%3D/records/%40test_id/external-auths/%40test_provider', () =>
    HttpResponse.json(null, { status: 204 })
  ),
  http.get('/api/collections/sub%3D/records/%40test_id/external-auths/%40test_provider', () =>
    HttpResponse.json({ id: 'item-one' })
  ),

  // AdminService
  http.get('*/api/:collection/abc%3D', () => HttpResponse.json({ id: 'item-get' })),
  http.patch('*/api/:collection/abc%3D', () => HttpResponse.json({ id: 'item-update' })),
  http.get('*/api/:collection', pageMatcher),
  http.get('*/api/collections/sub%3D/records', pageMatcher),
  http.patch('*/api/:collection/test123', () => HttpResponse.json('success')),
  http.delete('*/api/:collection/abc%3D', () => HttpResponse.json({ id: 'item-delete' })),
  http.put('*/api/:collection/import', () => HttpResponse.json('success')),

  // backup
  http.put('*/api/backups/%40test/restore', () => HttpResponse.json('success')),
  http.post('*/api/backups', () => HttpResponse.json('success')),
  http.post('*/api/backups/upload', () => HttpResponse.json('success')),
  http.delete('*/api/backups/%40test', () => HttpResponse.json('success')),
  http.post('*/api/backups/%40test/restore', () => HttpResponse.json('Success')),
];

export function setupServer() {
  return mswSetupServer();
  // return mswSetupServer(...restHandlers);
}
