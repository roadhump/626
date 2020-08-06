import { Middleware } from './server';

type MiddlewareCreator<TConfig = any> = (config?: TConfig) => Middleware;

export const asHtml: MiddlewareCreator = () => (ctx) => {
  ctx.res.setHeader('Content-Type', 'text/html');
  return ctx;
};

export const asJson: MiddlewareCreator = () => (ctx) => {
  ctx.res.setHeader('Content-Type', 'application/json');
  return ctx;
};

export const finish: MiddlewareCreator = () => (ctx) => {
  const { payload, res } = ctx;
  res.end(JSON.stringify(payload));
  return ctx;
};
