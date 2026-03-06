// shared/constants/montgomery.ts
export const MONTGOMERY_CONFIG = {
  center: [-86.2999, 32.3668] as [number, number], // [lng, lat]
  bounds: [[-86.55, 32.20], [-86.05, 32.55]] as [[number, number], [number, number]],
  defaultZoom: 12,
  neighborhoods: [
    'Downtown', 'Old Cloverdale', 'Cloverdale', 'Garden District',
    'Capitol Heights', 'Oak Park', 'Chisholm', 'Trenholm Court',
    'Millbrook', 'Dalraida', 'Snowdoun', 'Hampstead'
  ],
};

export const API_ENDPOINTS = {
  crime: '/api/v1/crime',
  requests311: '/api/v1/requests-311',
  predictions: '/api/v1/predictions',
  alerts: '/api/v1/alerts',
  chat: '/api/v1/chat',
  vision: '/api/v1/vision/analyze',
};

export const BRIGHT_DATA_SOURCES = [
  'https://www.montgomeryal.gov/city-government/departments/police',
  'https://www.montgomeryal.gov/news',
  'https://wsfa.com',
  'https://www.montgomeryadvertiser.com',
];
