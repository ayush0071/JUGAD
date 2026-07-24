// Minimal SSE hub — keeps a list of connected response streams and broadcasts
// notification events to them instantly. This is what makes "new software" or
// "payment confirmed" alerts genuinely real-time across every visitor's browser,
// not just tabs of the same browser (which is all a backend-less site could do).

const clients = new Set();

exports.subscribe = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('retry: 3000\n\n');

  const client = { res, userId: req.user?.id?.toString() || null };
  clients.add(client);

  req.on('close', () => clients.delete(client));
};

// notif.user (if set) means "only deliver to this specific user"; otherwise broadcast to all.
exports.broadcast = (notif) => {
  const payload = `data: ${JSON.stringify(notif)}\n\n`;
  for (const client of clients) {
    if (!notif.user || String(notif.user) === client.userId) {
      client.res.write(payload);
    }
  }
};
