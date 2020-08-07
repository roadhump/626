import fetch from 'node-fetch';

import { asJson, finish, asHtml } from './middleware';
import Server from './server';

const log = console.log.bind(console); // eslint-disable-line no-console

const app = Server();

// global logging middleware
app.use((ctx) => {
  log(`[${new Date().toISOString()}] ${ctx.req.method}: ${ctx.req.url}`);
  return ctx;
});

// global middleware, return as HTML
app.use(asHtml());

// simple response
app.get('/', (ctx) => {
  return ctx.success(`
    <h1>Hello</h1>
    <div>
      <ul>
        <li><a href="/async">Async handler</a></li>
        <li><a href="/api">JSON API</a></li>
        <li><a href="/user/123">Dynamic Parameters</a></li>
        <li><a href="/lol">404</a></li>
      <ul>
      <div>
        <form method="POST" action="/settings">
          <button type="submit">Form</button>
        </form>
      </div>
    </div>
  `);
});

// handler with middleware
app.get(
  '/api',
  asJson(),
  (ctx) => {
    return {
      ...ctx,
      payload: { user: 'john' },
    };
  },
  (ctx) => {
    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        status: 'active',
      },
    };
  },
  finish(),
);

// handler on regexp, probably need better API
app.get(/^\/user\/(\d+)$/, (ctx) =>
  ctx.success(`User ${(ctx.matchResult as RegExpMatchArray)[1]}`),
);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// async middleware
app.get(
  '/async',
  async (ctx) => {
    log('more waiting...');
    await wait(1000);
    return ctx;
  },
  async (ctx) => {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');

    if (res.ok) {
      const data = await res.json();
      return ctx.success(`
        <h3>Async handler, fetch from API</h3>
        <pre>${JSON.stringify(data, null, 2)}</ore>
      `);
    } else {
      return ctx.error(500, `Error while ferch`);
    }
  },
);

// post
app.post('/settings', (ctx) => ctx.success('<h1>Nice try!</h1>'));

// error 494
app.all(/^\//, (ctx) => ctx.error(404, '<h1>Nothing here, go away!<h1>'));

log('start on http://localhost:8080');
app.listen();
