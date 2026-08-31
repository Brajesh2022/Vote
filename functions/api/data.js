const DEFAULT_DATA = {
  links: [
    "https://old.reddit.com/r/RealTeensIndia/comments/1w2cu3s/finally_the_truth_is_coming_out"
  ]
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet() {
  return new Response(JSON.stringify(DEFAULT_DATA), {
    status: 200,
    headers: CORS_HEADERS
  });
}
