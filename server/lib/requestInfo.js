// Low-cardinality route label for logs and metrics, derived from the URL
// (req.route is empty when a middleware such as auth fails before routing).
export function routeLabel(req) {
  const parts = req.originalUrl.split('?')[0].split('/').filter(Boolean)
  if (parts[0] !== 'api') return '/api/unmatched'
  if (parts[1] === 'auth') return '/' + parts.slice(0, 4).join('/')
  if ((parts[1] === 'products' || parts[1] === 'orders') && parts[2] && !['mine', 'express'].includes(parts[2])) {
    parts[2] = ':id'
  }
  return '/' + parts.slice(0, 3).join('/')
}

export const expressPayStats = { orders: 0, firstAt: null, lastAt: null }
