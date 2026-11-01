export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let body = {};
  if (req.body) {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (_) {
      body = {};
    }
  }

  const query = body.query || body.q || req.query?.query || req.query?.q || '';
  const searchType = body.type || req.query?.type || 'music';

  if (!query) {
    return res.status(400).json({ success: false, message: 'No query provided' });
  }

  const cleanQ = String(query).trim();
  const encodedQ = encodeURIComponent(cleanQ);

  let fullAudioUrl = null;
  let songTitle = cleanQ;
  let artistName = 'Ultron Music';
  let durationStr = null;
  let coverImage = null;

  // 1. Fetch genuine 320kbps full-length stream from JioSaavn official API
  try {
    const jioHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*'
    };
    const sResp = await fetch(`https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&p=1&n=5&q=${encodedQ}`, {
      headers: jioHeaders
    });
    if (sResp.ok) {
      const sData = await sResp.json();
      const results = sData.results || [];
      if (results.length > 0) {
        const topSong = results[0];
        songTitle = topSong.song || topSong.title || cleanQ;
        artistName = topSong.primary_artists || topSong.singers || 'Featured Artist';
        durationStr = String(topSong.duration || '');
        const rawImg = topSong.image || '';
        coverImage = rawImg.replace('-150x150.', '-500x500.');
        const encUrl = topSong.encrypted_media_url;

        if (encUrl) {
          const authUrl = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&_format=json&bitrate=320&url=${encodeURIComponent(encUrl)}`;
          const aResp = await fetch(authUrl, { headers: jioHeaders });
          if (aResp.ok) {
            const aData = await aResp.json();
            if (aData.auth_url) {
              const match = aData.auth_url.match(/saavncdn\.com\/(\d+)\/([a-zA-Z0-9_-]+)_320\.mp4/);
              fullAudioUrl = match ? `https://aac.saavncdn.com/${match[1]}/${match[2]}_320.mp4` : aData.auth_url;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Vercel YT-Search] JioSaavn resolution error:', err);
  }

  // 2. Fetch YouTube candidate video IDs
  let topId = null;
  let alternateIds = [];
  try {
    const searchTerm = searchType === 'music' ? `${cleanQ} official audio lyrics` : cleanQ;
    const ytResp = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (ytResp.ok) {
      const ytHtml = await ytResp.text();
      const ids = Array.from(ytHtml.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g), m => m[1]);
      const uniqueIds = Array.from(new Set(ids));
      topId = uniqueIds[0] || null;
      alternateIds = uniqueIds.slice(1, 8);
    }
  } catch (ytErr) {
    console.warn('[Vercel YT-Search] YouTube resolution error:', ytErr);
  }

  return res.status(200).json({
    success: true,
    query: cleanQ,
    title: songTitle,
    artist: artistName,
    duration: durationStr,
    cover: coverImage,
    audioUrl: fullAudioUrl,
    videoId: topId,
    alternateIds: alternateIds,
    embedUrl: topId ? `https://www.youtube.com/embed/${topId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0` : null,
    watchUrl: topId ? `https://www.youtube.com/watch?v=${topId}` : null,
    musicUrl: topId ? `https://music.youtube.com/watch?v=${topId}` : `https://music.youtube.com/search?q=${encodedQ}`
  });
}
