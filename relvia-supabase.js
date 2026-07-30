Exit code: 0
Wall time: 1.4 seconds
Output:
const config = window.RELVIA_SUPABASE_CONFIG;

if (config?.url && !config.url.includes('YOUR-PROJECT') && config?.anonKey && !config.anonKey.includes('YOUR-ANON')) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(config.url, config.anonKey);
  const { data: releases, error } = await supabase
    .from('releases')
    .select('id,title,release_type,cover_url,artist:artists(stage_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(4);

  if (!error && releases?.length) {
    document.querySelector('#release-grid').innerHTML = releases.map((release, index) => `
      <article class="album" data-release-id="${release.id}">
        <div class="cover ${['one','two','three','four'][index % 4]}" ${release.cover_url ? `style="background-image:url('${release.cover_url}');background-size:cover"` : ''}></div>
        <strong>${release.title}</strong>
        <span>${release.artist?.stage_name ?? 'Relvia Records'} Â· ${release.release_type}</span>
      </article>`).join('');
  }

  const { data: tracks } = await supabase
    .from('tracks')
    .select('title,duration_seconds,release:releases(title,artist:artists(stage_name))')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(3);
  if (tracks?.length) document.querySelector('#recent-tracks').innerHTML = tracks.map((track, index) => {
    const minutes = Math.floor(track.duration_seconds / 60);
    const seconds = String(track.duration_seconds % 60).padStart(2, '0');
    return `<tr><td>${String(index + 1).padStart(2, '0')}</td><td>${track.title}</td><td>${track.release?.artist?.stage_name ?? 'Relvia Records'}</td><td>${minutes}:${seconds}</td></tr>`;
  }).join('');
}

