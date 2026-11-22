// One request per mounted page/account; retry explicitly invalidates it.
export function createPageRequest<T>(fetcher: () => Promise<T>) {
  let request: Promise<T> | undefined;
  return {
    load: () => request ??= fetcher(),
    reset: () => { request = undefined; },
  };
}
