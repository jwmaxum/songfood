const workerOrigin = 'https://song-food.jwmaxum.workers.dev';

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, workerOrigin);
    return Response.redirect(target.toString(), 308);
  },
};
