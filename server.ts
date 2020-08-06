import * as http from 'http';
import { IncomingMessage, ServerResponse } from 'http';

interface Route {
  match: (req: IncomingMessage) => MatchResult;
  handler: RouteHandler;
}

type MatchResult = ReturnType<typeof matchUrl>;

// argument for middleware
export interface Context<TPayload extends any = any> {
  req: IncomingMessage;
  res: ServerResponse;
  // to pass data between middlewares
  payload: TPayload;
  // shortcut for just send data
  success: (res: any) => this;
  // shortcut for error
  error: (code: number, res: any) => this;
  // for params from url
  matchResult: MatchResult;
}

export type Middleware = (ctx: Context) => Context;
export type RouteHandler = Middleware;

type RouteMatching = string | RegExp;

// compose for middleware
const flowInner = <T extends any[], R>(
  fn1: (...args: T) => R,
  ...fns: Array<(a: R) => R>
) => {
  const piped = fns.reduce(
    (prevFn, nextFn) => (value: R) => nextFn(prevFn(value)),
    (value) => value,
  );
  return (...args: T) => piped(fn1(...args));
};

const flow = (arr: Array<(...args: any) => any>) => {
  if (!arr.length) return (x: any) => x;
  const [first, ...rest] = arr;
  return flowInner(first, ...rest);
};

const matchUrl = (matching: RouteMatching, url: string) => {
  if (matching instanceof RegExp) return url.match(matching);
  else return url === matching;
};

const createContext = (req: IncomingMessage, res: ServerResponse): Context => {
  const context = {
    req,
    res,
    payload: {},
    matchResult: null,
    success: (result: any) => {
      res.statusCode = 200;
      res.end(result);
      return context;
    },
    error: (code: number, result: any) => {
      res.statusCode = code;
      res.end(result);
      return context;
    },
  };

  return context;
};

const createGlobalHandler = flow;

const createRoute = (
  matching: RouteMatching,
  handler: RouteHandler,
  filterMethod?: string,
) => ({
  match: (req: IncomingMessage) =>
    Boolean(!filterMethod || (filterMethod && filterMethod === req.method)) &&
    matchUrl(matching, req.url as string),
  handler,
});

const Server = () => {
  const globalMiddleware: Middleware[] = [];
  const routes: Route[] = [];

  const httpServer = http.createServer(async (req, res) => {
    const context = createContext(req, res);

    for (const route of routes) {
      const globalHandler = createGlobalHandler(globalMiddleware);

      const matchResult = route.match(req);

      if (matchResult) {
        context.matchResult = matchResult;
        await route.handler(await globalHandler(context));
        return;
      }
    }
  });

  return {
    use: (middleware: Middleware) => {
      globalMiddleware.push(middleware);
    },
    all: (matching: RouteMatching, ...middlewares: Array<RouteHandler>) => {
      routes.push(createRoute(matching, flow(middlewares)));
    },
    get: (matching: RouteMatching, ...middlewares: Array<RouteHandler>) => {
      routes.push(createRoute(matching, flow(middlewares), 'GET'));
    },
    post: (matching: RouteMatching, ...middlewares: Array<RouteHandler>) => {
      routes.push(createRoute(matching, flow(middlewares), 'POST'));
    },
    listen: () => httpServer.listen(8080),
  };
};

export default Server;
