(function(){
"use strict";

/* ---------- helpers ---------- */
var EPOCH = new Date(DATA.epoch + 'T00:00:00Z');
function dayToDate(d){ var t = new Date(EPOCH.getTime()); t.setUTCDate(t.getUTCDate() + d); return t; }
function fmtDate(d){
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getUTCDate() + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}
function fmtDateShort(d){
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getUTCDate() + ' ' + months[d.getUTCMonth()] + " '" + String(d.getUTCFullYear()).slice(2);
}
function esc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function num(n, d){ return (d===undefined ? n : n.toFixed(d)); }

// match row: [dayNum, compIdx, homeIdx, awayIdx, hg, ag, preHElo, postHElo, preAElo, postAElo, neutral, seasonIdx]
var M = { DAY:0, COMP:1, HOME:2, AWAY:3, HG:4, AG:5, PREH:6, POSTH:7, PREA:8, POSTA:9, NEUTRAL:10, SEASON:11,
  RESTH:12, RESTA:13, M180H:14, M180A:15, GF5H:16, GA5H:17, GF5A:18, GA5A:19, TRENDH:20, TRENDA:21 };

/* ---------- tabs ---------- */
var views = document.querySelectorAll('.view');
var tabBtns = document.querySelectorAll('nav.tabs button');
tabBtns.forEach(function(btn){
  btn.addEventListener('click', function(){
    tabBtns.forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    views.forEach(function(v){ v.classList.remove('active'); });
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    window.scrollTo({top:0, behavior:'smooth'});
    onViewShown(btn.dataset.view);
  });
});
function onViewShown(name){
  if(name === 'overview') renderOverview();
  else if(name === 'rankings') renderRankings();
  else if(name === 'compare') renderCompare();
  else if(name === 'insights') renderInsights();
}
function goToView(name){
  tabBtns.forEach(function(b){ b.classList.toggle('active', b.dataset.view===name); });
  views.forEach(function(v){ v.classList.toggle('active', v.id === 'view-' + name); });
}

/* ---------- header stats ---------- */
(function initHeader(){
  var minDay = Infinity, maxDay = -Infinity;
  var countries = new Set();
  DATA.matches.forEach(function(m){ if(m[M.DAY] < minDay) minDay = m[M.DAY]; if(m[M.DAY] > maxDay) maxDay = m[M.DAY]; });
  DATA.compInfo.forEach(function(c){ if(c.country) countries.add(c.country); });
  document.getElementById('dateRangeMeta').textContent =
    fmtDate(dayToDate(minDay)) + ' — ' + fmtDate(dayToDate(maxDay));

  function shortSeason(s){ return "'" + s.slice(2); } // "2021/22" -> "'21/22"
  var seasonSpan = DATA.seasons.length > 1 ? (shortSeason(DATA.seasons[0]) + '–' + shortSeason(DATA.seasons[DATA.seasons.length-1])) : shortSeason(DATA.seasons[0]);
  var stats = [
    { v: DATA.matches.length.toLocaleString(), l: 'Matches recorded' },
    { v: DATA.comps.length.toLocaleString(), l: 'Competitions' },
    { v: countries.size.toLocaleString(), l: 'Countries' },
    { v: DATA.teams.length.toLocaleString(), l: 'Clubs tracked' },
    { v: DATA.seasons.length.toLocaleString(), l: 'Seasons (' + seasonSpan + ')' }
  ];
  var el = document.getElementById('tickerStats');
  el.innerHTML = stats.map(function(s){
    return '<div class="stat"><div class="v">'+s.v+'</div><div class="l">'+s.l+'</div></div>';
  }).join('');

  var startLabel = fmtDate(dayToDate(minDay));
  var seasonsWord = DATA.seasons.length + (DATA.seasons.length===1 ? ' season' : ' seasons');
  var ovSpan = document.getElementById('ovSeasonsSpan'); if(ovSpan) ovSpan.textContent = seasonsWord;
  var teamsSpan = document.getElementById('teamsCountSpan'); if(teamsSpan) teamsSpan.textContent = DATA.teams.length.toLocaleString()+'+';
  var sinceSpan = document.getElementById('sinceSpan'); if(sinceSpan) sinceSpan.textContent = startLabel;
  var footer = document.getElementById('footerText');
  if(footer) footer.textContent = 'Full Time — built from ' + seasonsWord + ' of match results and Elo ratings (' +
    startLabel + ' – ' + fmtDate(dayToDate(maxDay)) + '), ' + DATA.comps.length + ' competitions worldwide.';
})();

/* =========================================================
   LEAGUES VIEW
   ========================================================= */
var leagueSort = { key:'rating', dir:-1 };
function renderLeagueTable(){
  var q = document.getElementById('leagueSearch').value.trim().toLowerCase();
  var cat = document.getElementById('leagueCategoryFilter').value;
  var rows = DATA.leagueMeta.filter(function(r){
    if(cat && r.category !== cat) return false;
    if(q){
      var hay = ((r.country||'') + ' ' + r.comp).toLowerCase();
      if(hay.indexOf(q) === -1) return false;
    }
    return true;
  });
  rows.sort(function(a,b){
    var k = leagueSort.key, dir = leagueSort.dir;
    var av = a[k], bv = b[k];
    if(av === null || av === undefined) av = (typeof bv === 'number') ? -Infinity : '';
    if(bv === null || bv === undefined) bv = (typeof av === 'number') ? -Infinity : '';
    if(typeof av === 'string') return dir * av.localeCompare(bv);
    return dir * (av - bv);
  });
  document.getElementById('leagueCount').textContent = rows.length.toLocaleString() + ' competitions';
  var tbody = document.querySelector('#leagueTable tbody');
  tbody.innerHTML = rows.map(function(r){
    return '<tr data-comp="'+esc(r.comp)+'">'+
      '<td>'+esc(r.country||'—')+'</td>'+
      '<td>'+esc(r.comp)+'</td>'+
      '<td class="badge-cat">'+esc(r.category||'—')+'</td>'+
      '<td class="num-cell">'+(r.clubs!=null?r.clubs:'—')+'</td>'+
      '<td class="num-cell">'+(r.P!=null?r.P.toLocaleString():'—')+'</td>'+
      '<td class="num-cell">'+(r.G!=null?num(r.G,2):'—')+'</td>'+
      '<td class="num-cell">'+(r.rating!=null?Math.round(r.rating):'—')+'</td>'+
      '<td class="num-cell">'+(r.stddev!=null?num(r.stddev,1)+'%':'—')+'</td>'+
    '</tr>';
  }).join('') || '<tr><td colspan="8" style="color:var(--ink-soft);padding:20px 10px;">No competitions match that filter.</td></tr>';

  tbody.querySelectorAll('tr[data-comp]').forEach(function(tr){
    tr.addEventListener('click', function(){
      openCompetition(tr.dataset.comp);
      goToView('competition');
    });
  });
}
(function initLeagueControls(){
  var cats = Array.from(new Set(DATA.leagueMeta.map(function(r){ return r.category; }).filter(Boolean))).sort();
  var sel = document.getElementById('leagueCategoryFilter');
  cats.forEach(function(c){
    var o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o);
  });
  document.getElementById('leagueSearch').addEventListener('input', renderLeagueTable);
  sel.addEventListener('change', renderLeagueTable);
  document.querySelectorAll('#leagueTable th[data-key]').forEach(function(th){
    th.addEventListener('click', function(){
      var k = th.dataset.key;
      if(leagueSort.key === k) leagueSort.dir *= -1; else { leagueSort.key = k; leagueSort.dir = -1; }
      updateSortArrows('#leagueTable', leagueSort);
      renderLeagueTable();
    });
  });
  updateSortArrows('#leagueTable', leagueSort);
  renderLeagueTable();
})();

function updateSortArrows(tableSel, sortState){
  document.querySelectorAll(tableSel + ' th[data-key]').forEach(function(th){
    var base = th.textContent.replace(/\s*[▲▼]$/,'');
    if(th.dataset.key === sortState.key){
      th.innerHTML = base + '<span class="arrow">'+(sortState.dir===1?'▲':'▼')+'</span>';
    } else {
      th.textContent = base;
    }
  });
}

/* =========================================================
   COMPETITION VIEW
   ========================================================= */
// Pre-index matches by competition for speed
var matchesByComp = {};
DATA.matches.forEach(function(m){
  var c = m[M.COMP];
  (matchesByComp[c] || (matchesByComp[c] = [])).push(m);
});

var currentComp = null, currentSeason = null;

(function initCompSelect(){
  var sel = document.getElementById('compSelect');
  var opts = DATA.comps.map(function(c, i){ return {c:c, i:i}; });
  opts.sort(function(a,b){ return a.c.localeCompare(b.c); });
  opts.forEach(function(o){
    var el = document.createElement('option');
    el.value = o.c;
    var info = DATA.compInfo[o.i];
    el.textContent = (info && info.country ? info.country + ' — ' : '') + o.c;
    sel.appendChild(el);
  });
  sel.addEventListener('change', function(){ openCompetition(sel.value); });
})();

function openCompetition(compName){
  var idx = DATA.comps.indexOf(compName);
  if(idx === -1) return;
  currentComp = idx;
  document.getElementById('compSelect').value = compName;
  var info = DATA.compInfo[idx];
  document.getElementById('compTitle').textContent = compName;
  document.getElementById('compSub').textContent =
    (info && info.country ? info.country + ' · ' : '') + (info && info.category ? info.category : 'Competition') +
    ' — table, Elo movers and recent results.';

  var comp_matches = matchesByComp[idx] || [];
  var seasonsPresent = Array.from(new Set(comp_matches.map(function(m){ return m[M.SEASON]; }))).sort();
  var pillWrap = document.getElementById('seasonPills');
  pillWrap.innerHTML = seasonsPresent.map(function(s){
    return '<button class="pill" data-season="'+s+'">'+esc(DATA.seasons[s])+'</button>';
  }).join('');
  currentSeason = seasonsPresent[seasonsPresent.length - 1];
  pillWrap.querySelectorAll('.pill').forEach(function(p){
    p.classList.toggle('active', +p.dataset.season === currentSeason);
    p.addEventListener('click', function(){
      currentSeason = +p.dataset.season;
      pillWrap.querySelectorAll('.pill').forEach(function(x){ x.classList.remove('active'); });
      p.classList.add('active');
      renderCompetitionContent();
    });
  });
  renderCompetitionContent();
}

function renderCompetitionContent(){
  var container = document.getElementById('compContent');
  if(currentComp === null){
    container.innerHTML = '<div class="empty-state"><h3>Pick a competition</h3><p>Choose one from the dropdown, or click a row in Leagues.</p></div>';
    return;
  }
  var all = matchesByComp[currentComp] || [];
  var ms = all.filter(function(m){ return m[M.SEASON] === currentSeason; });
  ms.sort(function(a,b){ return a[M.DAY] - b[M.DAY]; });

  // Standings
  var table = {};
  function ensure(t){
    if(!table[t]) table[t] = {team:t, P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0, elo:null};
    return table[t];
  }
  ms.forEach(function(m){
    var h = ensure(m[M.HOME]), a = ensure(m[M.AWAY]);
    h.P++; a.P++;
    h.GF += m[M.HG]; h.GA += m[M.AG];
    a.GF += m[M.AG]; a.GA += m[M.HG];
    if(m[M.HG] > m[M.AG]){ h.W++; h.Pts+=3; a.L++; }
    else if(m[M.HG] < m[M.AG]){ a.W++; a.Pts+=3; h.L++; }
    else { h.D++; a.D++; h.Pts++; a.Pts++; }
    h.elo = m[M.POSTH]; a.elo = m[M.POSTA];
  });
  var standings = Object.values(table).sort(function(x,y){
    return (y.Pts - x.Pts) || ((y.GF-y.GA) - (x.GF-x.GA)) || (y.GF - x.GF);
  });

  // Elo movers within this season (post - pre first appearance)
  var eloStart = {}, eloEnd = {};
  ms.forEach(function(m){
    if(eloStart[m[M.HOME]] === undefined) eloStart[m[M.HOME]] = m[M.PREH];
    if(eloStart[m[M.AWAY]] === undefined) eloStart[m[M.AWAY]] = m[M.PREA];
    eloEnd[m[M.HOME]] = m[M.POSTH];
    eloEnd[m[M.AWAY]] = m[M.POSTA];
  });
  var movers = Object.keys(eloEnd).map(function(t){
    return { team:+t, start:eloStart[t], end:eloEnd[t], diff: eloEnd[t]-eloStart[t] };
  }).sort(function(a,b){ return b.diff - a.diff; });

  var recent = ms.slice(-15).reverse();

  var html = '';
  html += '<div class="grid-2">';

  // Standings panel
  html += '<div class="panel"><div class="panel-title"><span>Table — '+esc(DATA.seasons[currentSeason])+'</span><span>'+standings.length+' clubs</span></div>';
  html += '<div class="scroll-x"><table class="data"><thead><tr>' +
    '<th>#</th><th>Club</th><th class="num-cell">P</th><th class="num-cell">W</th><th class="num-cell">D</th>' +
    '<th class="num-cell">L</th><th class="num-cell">GF</th><th class="num-cell">GA</th><th class="num-cell">GD</th>' +
    '<th class="num-cell">Pts</th><th class="num-cell">Elo</th></tr></thead><tbody>';
  standings.forEach(function(r, i){
    html += '<tr><td class="rank">'+(i+1)+'</td>' +
      '<td><span class="team-link" data-team="'+r.team+'">'+esc(DATA.teams[r.team])+'</span></td>' +
      '<td class="num-cell">'+r.P+'</td><td class="num-cell">'+r.W+'</td><td class="num-cell">'+r.D+'</td><td class="num-cell">'+r.L+'</td>' +
      '<td class="num-cell">'+r.GF+'</td><td class="num-cell">'+r.GA+'</td><td class="num-cell">'+(r.GF-r.GA>0?'+':'')+(r.GF-r.GA)+'</td>' +
      '<td class="num-cell" style="font-weight:700;">'+r.Pts+'</td><td class="num-cell">'+Math.round(r.elo)+'</td></tr>';
  });
  html += '</tbody></table></div></div>';

  // Side column: movers + recent
  html += '<div>';
  html += '<div class="panel amber"><div class="panel-title"><span>Elo movers this season</span></div>';
  html += '<table class="data"><tbody>';
  movers.slice(0,5).forEach(function(mv){
    html += '<tr><td><span class="team-link" data-team="'+mv.team+'">'+esc(DATA.teams[mv.team])+'</span></td>' +
      '<td class="num-cell elo-diff '+(mv.diff>=0?'pos':'neg')+'">'+(mv.diff>=0?'+':'')+Math.round(mv.diff)+'</td></tr>';
  });
  html += '</tbody></table>';
  if(movers.length > 5){
    html += '<table class="data" style="margin-top:2px;"><tbody>';
    movers.slice(-5).reverse().forEach(function(mv){
      html += '<tr><td><span class="team-link" data-team="'+mv.team+'">'+esc(DATA.teams[mv.team])+'</span></td>' +
        '<td class="num-cell elo-diff '+(mv.diff>=0?'pos':'neg')+'">'+(mv.diff>=0?'+':'')+Math.round(mv.diff)+'</td></tr>';
    });
    html += '</tbody></table>';
  }
  html += '</div>';

  html += '<div class="panel"><div class="panel-title"><span>Recent results</span></div>';
  html += '<table class="data"><tbody>';
  recent.forEach(function(m){
    var d = dayToDate(m[M.DAY]);
    html += '<tr>' +
      '<td class="mono" style="color:var(--ink-soft);">'+fmtDateShort(d)+'</td>' +
      '<td class="wrap-cell"><span class="team-link" data-team="'+m[M.HOME]+'">'+esc(DATA.teams[m[M.HOME]])+'</span></td>' +
      '<td class="num-cell mono" style="font-weight:700;">'+m[M.HG]+'–'+m[M.AG]+'</td>' +
      '<td class="wrap-cell"><span class="team-link" data-team="'+m[M.AWAY]+'">'+esc(DATA.teams[m[M.AWAY]])+'</span></td>' +
    '</tr>';
  });
  html += '</tbody></table></div>';
  html += '</div>'; // side column
  html += '</div>'; // grid-2

  container.innerHTML = html;
  container.querySelectorAll('.team-link').forEach(function(el){
    el.addEventListener('click', function(){
      openTeam(+el.dataset.team);
      goToView('teams');
    });
  });
}

/* =========================================================
   TEAMS VIEW
   ========================================================= */
var matchesByTeam = {};
DATA.matches.forEach(function(m){
  (matchesByTeam[m[M.HOME]] || (matchesByTeam[m[M.HOME]] = [])).push(m);
  (matchesByTeam[m[M.AWAY]] || (matchesByTeam[m[M.AWAY]] = [])).push(m);
});

var teamPage = 0;
var TEAM_PAGE_SIZE = 20;
var currentTeam = null;

function openTeam(teamIdx){
  currentTeam = teamIdx;
  teamPage = 0;
  document.getElementById('teamSearch').value = DATA.teams[teamIdx];
  renderTeamContent();
}

function renderTeamContent(){
  var container = document.getElementById('teamContent');
  if(currentTeam === null){
    container.innerHTML = '<div class="empty-state"><h3>No club selected</h3><p>Search above to pull up a club\'s Elo trend and match log.</p></div>';
    return;
  }
  var ms = (matchesByTeam[currentTeam] || []).slice().sort(function(a,b){ return a[M.DAY]-b[M.DAY]; });
  if(ms.length === 0){
    container.innerHTML = '<div class="empty-state"><h3>No matches found</h3></div>';
    return;
  }
  var last = ms[ms.length-1];
  var currentElo = (last[M.HOME]===currentTeam) ? last[M.POSTH] : last[M.POSTA];
  var peak = -Infinity, trough = Infinity;
  var series = [];
  ms.forEach(function(m){
    var isHome = m[M.HOME] === currentTeam;
    var post = isHome ? m[M.POSTH] : m[M.POSTA];
    series.push({ day:m[M.DAY], elo:post });
    if(post > peak) peak = post;
    if(post < trough) trough = post;
  });
  var comps = Array.from(new Set(ms.map(function(m){ return m[M.COMP]; })));
  var compNames = comps.map(function(c){ return DATA.comps[c]; }).sort();

  var w = ms.length, wins=0, draws=0, losses=0;
  ms.forEach(function(m){
    var isHome = m[M.HOME]===currentTeam;
    var gf = isHome?m[M.HG]:m[M.AG], ga = isHome?m[M.AG]:m[M.HG];
    if(gf>ga) wins++; else if(gf===ga) draws++; else losses++;
  });

  var html = '';
  html += '<div class="team-header"><div>' +
    '<h2>'+esc(DATA.teams[currentTeam])+'</h2>' +
    '<div class="meta">'+esc(compNames.join(' · '))+'</div>' +
    '</div><div class="big-elo"><div class="v">'+Math.round(currentElo)+'</div><div class="l">current Elo</div></div></div>';

  html += '<div class="grid-3" style="margin:16px 0 20px;">' +
    '<div class="panel" style="margin-bottom:0;"><div class="panel-title"><span>Record</span></div>' +
      '<div class="mono" style="font-size:20px;font-weight:600;">'+wins+'W '+draws+'D '+losses+'L</div>' +
      '<div class="table-note" style="margin-top:6px;">'+w+' matches since Jul 2021</div></div>' +
    '<div class="panel" style="margin-bottom:0;"><div class="panel-title"><span>Peak Elo</span></div>' +
      '<div class="mono" style="font-size:20px;font-weight:600;color:var(--pitch);">'+Math.round(peak)+'</div></div>' +
    '<div class="panel" style="margin-bottom:0;"><div class="panel-title"><span>Lowest Elo</span></div>' +
      '<div class="mono" style="font-size:20px;font-weight:600;color:var(--loss);">'+Math.round(trough)+'</div></div>' +
  '</div>';

  // Recent form snapshot, from the rolling features attached to the team's
  // most recent match (home/away specific).
  var lastIsHome = last[M.HOME] === currentTeam;
  var restD = lastIsHome ? last[M.RESTH] : last[M.RESTA];
  var gf5 = lastIsHome ? last[M.GF5H] : last[M.GF5A];
  var ga5 = lastIsHome ? last[M.GA5H] : last[M.GA5A];
  var trend5 = lastIsHome ? last[M.TRENDH] : last[M.TRENDA];
  if(gf5 != null || ga5 != null || trend5 != null){
    html += '<div class="panel amber"><div class="panel-title"><span>Form heading into the most recent match</span></div>' +
      '<div class="grid-3">' +
        '<div><div class="table-note">Goals scored, avg (last 5)</div><div class="mono" style="font-size:19px;font-weight:600;">'+(gf5!=null?gf5.toFixed(1):'—')+'</div></div>' +
        '<div><div class="table-note">Goals conceded, avg (last 5)</div><div class="mono" style="font-size:19px;font-weight:600;">'+(ga5!=null?ga5.toFixed(1):'—')+'</div></div>' +
        '<div><div class="table-note">Elo trend (last 5)</div><div class="mono elo-diff '+(trend5>=0?'pos':'neg')+'" style="font-size:19px;font-weight:600;">'+(trend5!=null?((trend5>=0?'+':'')+trend5.toFixed(1)):'—')+'</div></div>' +
      '</div>' +
      (restD!=null ? '<div class="table-note" style="margin-top:10px;">Came into that match on '+restD+' day'+(restD===1?'':'s')+' of rest.</div>' : '') +
    '</div>';
  }

  html += '<div class="panel"><div class="panel-title"><span>Elo history</span></div>' +
    '<div class="chart-wrap" id="eloChart"></div></div>';

  html += '<div class="panel"><div class="panel-title"><span>Match log</span><span id="matchLogCount"></span></div>' +
    '<div class="scroll-x"><table class="data" id="matchLogTable"><thead><tr>' +
    '<th>Date</th><th>Competition</th><th>Opponent</th><th class="num-cell">Score</th><th>Result</th><th class="num-cell">Elo</th>' +
    '</tr></thead><tbody></tbody></table></div>' +
    '<div class="pager" id="matchLogPager"></div></div>';

  container.innerHTML = html;
  drawEloChart(series);
  renderMatchLog(ms);
}

// Any run of days longer than this between two consecutive appearances for a
// team is treated as "not part of the tracked leagues" rather than a normal
// gap between fixtures (international breaks, off-season, etc).
var ELO_GAP_DAYS = 40;

function drawEloChart(series){
  var host = document.getElementById('eloChart');
  host.style.position = 'relative';
  var W = 1000, H = 260, padL = 40, padR = 14, padT = 14, padB = 26;
  var minDay = series[0].day, maxDay = series[series.length-1].day;
  var minElo = Math.min.apply(null, series.map(function(s){return s.elo;}));
  var maxElo = Math.max.apply(null, series.map(function(s){return s.elo;}));
  var pad = Math.max(10, (maxElo-minElo)*0.08);
  minElo -= pad; maxElo += pad;
  function x(d){ return padL + (maxDay===minDay?0:(d-minDay)/(maxDay-minDay)) * (W-padL-padR); }
  function y(e){ return H-padB - ((e-minElo)/(maxElo-minElo)) * (H-padT-padB); }

  // Split the series into segments wherever the gap between two consecutive
  // matches is unusually long. Each segment is drawn as its own path so the
  // "gap" segments can be rendered dashed instead of solid.
  var segments = [];
  var cur = [series[0]];
  var hasGap = false;
  for(var i=1;i<series.length;i++){
    var gap = series[i].day - series[i-1].day;
    if(gap > ELO_GAP_DAYS){
      hasGap = true;
      segments.push({ pts: cur, dashed:false });
      segments.push({ pts: [series[i-1], series[i]], dashed:true });
      cur = [series[i]];
    } else {
      cur.push(series[i]);
    }
  }
  segments.push({ pts: cur, dashed:false });

  var linePaths = segments.map(function(seg){
    if(seg.pts.length < 2) return '';
    var d = seg.pts.map(function(p,i){ return (i===0?'M':'L') + x(p.day).toFixed(1) + ',' + y(p.elo).toFixed(1); }).join(' ');
    return '<path class="chart-line'+(seg.dashed?' dashed':'')+'" d="'+d+'"></path>';
  }).join('');

  // Area fill uses the full chronological series regardless of gaps, purely
  // for the soft backdrop under the line.
  var fullPath = series.map(function(s,i){ return (i===0?'M':'L') + x(s.day).toFixed(1) + ',' + y(s.elo).toFixed(1); }).join(' ');
  var areaPath = fullPath + ' L' + x(series[series.length-1].day).toFixed(1) + ',' + (H-padB) + ' L' + x(series[0].day).toFixed(1) + ',' + (H-padB) + ' Z';

  // gridlines: 4 horizontal
  var gridLines = '';
  var ticks = 4;
  for(var i=0;i<=ticks;i++){
    var val = minElo + (maxElo-minElo)*i/ticks;
    var yy = y(val);
    gridLines += '<line x1="'+padL+'" y1="'+yy.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+yy.toFixed(1)+'"></line>';
    gridLines += '<text class="axis-label" x="4" y="'+(yy+4).toFixed(1)+'">'+Math.round(val)+'</text>';
  }
  // x labels: season starts roughly - use first day of each year present
  var xLabels = '';
  var seen = {};
  series.forEach(function(s){
    var d = dayToDate(s.day);
    if(d.getUTCDate() <= 7 && !seen[d.getUTCFullYear()]){
      seen[d.getUTCFullYear()] = true;
      xLabels += '<text class="axis-label" x="'+x(s.day).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+d.getUTCFullYear()+'</text>';
    }
  });

  // Invisible hit-targets (one per match) so hovering anywhere near a point
  // reveals its exact Elo and date via the tooltip.
  var hitCircles = series.map(function(p){
    return '<circle class="chart-hit" cx="'+x(p.day).toFixed(2)+'" cy="'+y(p.elo).toFixed(2)+'" r="7" data-day="'+p.day+'" data-elo="'+p.elo+'"></circle>';
  }).join('');

  var svg = '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#1F4A34" stop-opacity="0.35"/><stop offset="100%" stop-color="#1F4A34" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<g class="chart-grid">'+gridLines+'</g>' +
    '<path class="chart-area" d="'+areaPath+'"></path>' +
    linePaths +
    '<circle id="hoverDot" class="chart-dot" r="4" style="display:none;"></circle>' +
    xLabels +
    '<g class="chart-hits">'+hitCircles+'</g>' +
    '</svg>';

  var legend = hasGap ?
    '<div class="chart-legend">' +
      '<span class="legend-item"><span class="legend-swatch solid"></span>Elo after each match</span>' +
      '<span class="legend-item"><span class="legend-swatch dashed"></span>Gap — club not part of the tracked leagues during this period</span>' +
    '</div>' : '';

  host.innerHTML = svg + '<div class="chart-tooltip" id="chartTooltip"></div>' + legend;

  // Hover interaction
  var svgEl = host.querySelector('svg');
  var tooltip = document.getElementById('chartTooltip');
  var hoverDot = host.querySelector('#hoverDot');
  host.querySelectorAll('circle.chart-hit').forEach(function(c){
    c.addEventListener('mouseenter', function(){
      var cx = +c.getAttribute('cx'), cy = +c.getAttribute('cy');
      var day = +c.dataset.day, elo = +c.dataset.elo;
      var rect = svgEl.getBoundingClientRect();
      var hostRect = host.getBoundingClientRect();
      var scaleX = rect.width / W, scaleY = rect.height / H;
      var px = (rect.left - hostRect.left) + cx * scaleX;
      var py = (rect.top - hostRect.top) + cy * scaleY;

      hoverDot.setAttribute('cx', cx);
      hoverDot.setAttribute('cy', cy);
      hoverDot.style.display = 'block';

      tooltip.innerHTML = '<strong>'+Math.round(elo)+'</strong> Elo<br>'+fmtDateShort(dayToDate(day));
      tooltip.style.left = px + 'px';
      tooltip.style.top = py + 'px';
      tooltip.classList.add('show');
    });
    c.addEventListener('mouseleave', function(){
      tooltip.classList.remove('show');
      hoverDot.style.display = 'none';
    });
  });
}

function renderMatchLog(msAsc){
  var ms = msAsc.slice().reverse(); // newest first
  var totalPages = Math.ceil(ms.length / TEAM_PAGE_SIZE);
  if(teamPage >= totalPages) teamPage = totalPages - 1;
  if(teamPage < 0) teamPage = 0;
  var pageItems = ms.slice(teamPage*TEAM_PAGE_SIZE, (teamPage+1)*TEAM_PAGE_SIZE);
  document.getElementById('matchLogCount').textContent = ms.length + ' matches';
  var tbody = document.querySelector('#matchLogTable tbody');
  tbody.innerHTML = pageItems.map(function(m){
    var isHome = m[M.HOME] === currentTeam;
    var oppIdx = isHome ? m[M.AWAY] : m[M.HOME];
    var gf = isHome ? m[M.HG] : m[M.AG], ga = isHome ? m[M.AG] : m[M.HG];
    var res = gf>ga ? 'W' : (gf===ga ? 'D' : 'L');
    var pre = isHome ? m[M.PREH] : m[M.PREA];
    var post = isHome ? m[M.POSTH] : m[M.POSTA];
    var diff = post - pre;
    var d = dayToDate(m[M.DAY]);
    var venue = m[M.NEUTRAL] ? 'N' : (isHome ? 'H' : 'A');
    return '<tr>' +
      '<td class="mono" style="color:var(--ink-soft);">'+fmtDateShort(d)+'</td>' +
      '<td>'+esc(DATA.comps[m[M.COMP]])+'</td>' +
      '<td><span class="team-link" data-team="'+oppIdx+'">'+esc(DATA.teams[oppIdx])+'</span> <span class="venue-chip">('+venue+')</span></td>' +
      '<td class="num-cell mono">'+gf+'–'+ga+'</td>' +
      '<td><span class="result-chip '+res+'">'+res+'</span></td>' +
      '<td class="num-cell elo-diff '+(diff>=0?'pos':'neg')+'">'+(diff>=0?'+':'')+Math.round(diff)+'</td>' +
    '</tr>';
  }).join('');
  tbody.querySelectorAll('.team-link').forEach(function(el){
    el.addEventListener('click', function(){ openTeam(+el.dataset.team); });
  });
  var pager = document.getElementById('matchLogPager');
  pager.innerHTML = '<button id="pgPrev" '+(teamPage===0?'disabled':'')+'>← Newer</button>' +
    '<span>Page '+(teamPage+1)+' of '+Math.max(totalPages,1)+'</span>' +
    '<button id="pgNext" '+(teamPage>=totalPages-1?'disabled':'')+'>Older →</button>';
  var prevBtn = document.getElementById('pgPrev'), nextBtn = document.getElementById('pgNext');
  if(prevBtn) prevBtn.addEventListener('click', function(){ teamPage--; renderMatchLog(msAsc); });
  if(nextBtn) nextBtn.addEventListener('click', function(){ teamPage++; renderMatchLog(msAsc); });
}

/* ---------- team search autocomplete ---------- */
(function initTeamSearch(){
  var input = document.getElementById('teamSearch');
  var results = document.getElementById('acResults');
  var teamCurrentElo = {};
  // compute current elo per team quickly (last match's post elo)
  var lastMatchIdx = {};
  DATA.matches.forEach(function(m, i){
    lastMatchIdx[m[M.HOME]] = i;
    lastMatchIdx[m[M.AWAY]] = i;
  });
  function currentEloFor(t){
    if(teamCurrentElo[t] !== undefined) return teamCurrentElo[t];
    var arr = matchesByTeam[t];
    if(!arr || !arr.length) return null;
    var last = arr[arr.length-1];
    var v = (last[M.HOME]===t) ? last[M.POSTH] : last[M.POSTA];
    teamCurrentElo[t] = v;
    return v;
  }
  var hiIndex = -1;
  function show(list){
    if(!list.length){ results.classList.remove('show'); results.innerHTML=''; return; }
    hiIndex = -1;
    results.innerHTML = list.map(function(t){
      var e = currentEloFor(t);
      return '<div data-team="'+t+'"><span>'+esc(DATA.teams[t])+'</span><span class="ac-elo">'+(e!=null?Math.round(e):'')+'</span></div>';
    }).join('');
    results.classList.add('show');
    results.querySelectorAll('div[data-team]').forEach(function(el){
      el.addEventListener('mousedown', function(e){
        e.preventDefault();
        openTeam(+el.dataset.team);
        results.classList.remove('show');
        goToView('teams');
      });
    });
  }
  input.addEventListener('input', function(){
    var q = input.value.trim().toLowerCase();
    if(q.length < 1){ show([]); return; }
    var matches = [];
    for(var i=0;i<DATA.teams.length;i++){
      if(DATA.teams[i].toLowerCase().indexOf(q) !== -1){
        matches.push(i);
        if(matches.length >= 30) break;
      }
    }
    matches.sort(function(a,b){
      var an = DATA.teams[a].toLowerCase(), bn = DATA.teams[b].toLowerCase();
      var ap = an.indexOf(q), bp = bn.indexOf(q);
      if(ap !== bp) return ap - bp;
      return an.length - bn.length;
    });
    show(matches.slice(0,10));
  });
  input.addEventListener('focus', function(){ if(input.value.trim()) input.dispatchEvent(new Event('input')); });
  document.addEventListener('click', function(e){
    if(!results.contains(e.target) && e.target !== input) results.classList.remove('show');
  });
  input.addEventListener('keydown', function(e){
    var items = results.querySelectorAll('div[data-team]');
    if(!items.length) return;
    if(e.key === 'ArrowDown'){ e.preventDefault(); hiIndex = Math.min(hiIndex+1, items.length-1); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); hiIndex = Math.max(hiIndex-1, 0); }
    else if(e.key === 'Enter'){
      if(hiIndex >= 0){ items[hiIndex].dispatchEvent(new Event('mousedown')); }
      return;
    } else { return; }
    items.forEach(function(it,i){ it.classList.toggle('hi', i===hiIndex); });
    items[hiIndex].scrollIntoView({block:'nearest'});
  });
})();

/* =========================================================
   CHART PRIMITIVES (generic SVG bar / donut / multi-line / radar)
   ========================================================= */
var PALETTE = ['#1F4A34','#E5A22B','#8A3B2E','#2E5C8A','#6B4F8A','#3E7A5C'];

function svgBarChart(host, opts){
  // opts: {labels, values, horizontal, height, color, valueFmt}
  var horizontal = !!opts.horizontal;
  var W = 1000, H = opts.height || 240;
  var color = opts.color || 'var(--pitch)';
  var n = opts.values.length;
  var maxV = Math.max.apply(null, opts.values.concat([0]));
  maxV = maxV === 0 ? 1 : maxV * 1.12;
  var svg;
  if(horizontal){
    var padL = 120, padR = 46, padT = 8, padB = 8;
    var rowH = (H - padT - padB) / n;
    var bars = '', labels = '';
    for(var i=0;i<n;i++){
      var y = padT + i*rowH + rowH*0.18;
      var bh = rowH*0.64;
      var w = (opts.values[i]/maxV) * (W-padL-padR);
      bars += '<rect class="bar-rect" x="'+padL+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+color+'" rx="2"></rect>';
      bars += '<text class="bar-value" x="'+(padL+w+6).toFixed(1)+'" y="'+(y+bh/2+4).toFixed(1)+'">'+(opts.valueFmt?opts.valueFmt(opts.values[i]):opts.values[i])+'</text>';
      labels += '<text class="bar-label" x="'+(padL-8)+'" y="'+(y+bh/2+4).toFixed(1)+'" text-anchor="end">'+esc(String(opts.labels[i]).slice(0,20))+'</text>';
    }
    svg = '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'+bars+labels+'</svg>';
  } else {
    var padL2 = 34, padR2 = 8, padT2 = 10, padB2 = 26;
    var colW = (W - padL2 - padR2) / n;
    var bars2 = '', labels2 = '';
    for(var j=0;j<n;j++){
      var bh2 = (opts.values[j]/maxV) * (H-padT2-padB2);
      var x = padL2 + j*colW + colW*0.15;
      var bw = colW*0.7;
      var yTop = H-padB2-bh2;
      bars2 += '<rect class="bar-rect" x="'+x.toFixed(1)+'" y="'+yTop.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh2.toFixed(1)+'" fill="'+color+'" rx="2"></rect>';
      bars2 += '<text class="bar-value" x="'+(x+bw/2).toFixed(1)+'" y="'+(yTop-6).toFixed(1)+'" text-anchor="middle">'+(opts.valueFmt?opts.valueFmt(opts.values[j]):opts.values[j])+'</text>';
      labels2 += '<text class="bar-label" x="'+(x+bw/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(String(opts.labels[j]))+'</text>';
    }
    svg = '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'+bars2+labels2+'</svg>';
  }
  host.innerHTML = '<div class="chart-svg-wrap">'+svg+'</div>';
}

function svgDonutChart(host, segments, opts){
  opts = opts || {};
  var W = 240, H = 240, cx = W/2, cy = H/2, r = 88, ir = 54;
  var total = segments.reduce(function(a,s){ return a+s.value; }, 0) || 1;
  var angle = -Math.PI/2;
  var paths = '';
  segments.forEach(function(s){
    var frac = s.value/total;
    var a0 = angle, a1 = angle + frac*2*Math.PI;
    angle = a1;
    var x0 = cx+r*Math.cos(a0), y0 = cy+r*Math.sin(a0);
    var x1 = cx+r*Math.cos(a1), y1 = cy+r*Math.sin(a1);
    var xi0 = cx+ir*Math.cos(a1), yi0 = cy+ir*Math.sin(a1);
    var xi1 = cx+ir*Math.cos(a0), yi1 = cy+ir*Math.sin(a0);
    var large = (a1-a0) > Math.PI ? 1 : 0;
    var d = 'M'+x0.toFixed(2)+','+y0.toFixed(2)+' A'+r+','+r+' 0 '+large+' 1 '+x1.toFixed(2)+','+y1.toFixed(2)+
      ' L'+xi0.toFixed(2)+','+yi0.toFixed(2)+' A'+ir+','+ir+' 0 '+large+' 0 '+xi1.toFixed(2)+','+yi1.toFixed(2)+' Z';
    paths += '<path d="'+d+'" fill="'+s.color+'"></path>';
  });
  var svg = '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="max-width:240px;margin:0 auto;display:block;">'+paths+'</svg>';
  var legend = '<div class="donut-legend">' + segments.map(function(s){
    var pct = Math.round(s.value/total*100);
    return '<span class="item"><span class="swatch" style="background:'+s.color+';"></span>'+esc(s.label)+' — '+pct+'%</span>';
  }).join('') + '</div>';
  host.innerHTML = '<div class="chart-svg-wrap">'+svg+'</div>'+legend;
}

function svgMultiLineChart(host, opts){
  // opts: {labels: [x category strings], series: [{name, color, values}], height}
  var W = 1000, H = opts.height || 240, padL = 40, padR = 14, padT = 14, padB = 26;
  var all = [];
  opts.series.forEach(function(s){ all = all.concat(s.values); });
  var minV = Math.min.apply(null, all), maxV = Math.max.apply(null, all);
  var pad = Math.max((maxV-minV)*0.1, 0.001);
  minV -= pad; maxV += pad;
  var n = opts.labels.length;
  function x(i){ return padL + (n<=1?0:i/(n-1)) * (W-padL-padR); }
  function y(v){ return H-padB - ((v-minV)/(maxV-minV)) * (H-padT-padB); }
  var gridLines = '';
  for(var g=0;g<=3;g++){
    var val = minV + (maxV-minV)*g/3;
    var yy = y(val);
    gridLines += '<line x1="'+padL+'" y1="'+yy.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+yy.toFixed(1)+'" stroke="var(--chalk-line)"></line>';
    gridLines += '<text class="axis-label" x="4" y="'+(yy+4).toFixed(1)+'">'+(opts.yFmt?opts.yFmt(val):Math.round(val))+'</text>';
  }
  var xLabels = '';
  opts.labels.forEach(function(l, i){
    xLabels += '<text class="axis-label" x="'+x(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+esc(l)+'</text>';
  });
  var lines = '';
  opts.series.forEach(function(s){
    var d = s.values.map(function(v,i){ return (i===0?'M':'L')+x(i).toFixed(1)+','+y(v).toFixed(1); }).join(' ');
    lines += '<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="2.5"></path>';
    s.values.forEach(function(v,i){
      lines += '<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="3" fill="'+s.color+'"></circle>';
    });
  });
  var svg = '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'+
    '<g>'+gridLines+'</g>'+lines+xLabels+'</svg>';
  var legend = opts.series.length > 1 ? '<div class="multi-line-legend">' + opts.series.map(function(s){
    return '<span class="item"><span class="swatch" style="border-color:'+s.color+';"></span>'+esc(s.name)+'</span>';
  }).join('') + '</div>' : '';
  host.innerHTML = '<div class="chart-svg-wrap">'+svg+'</div>'+legend;
}

function svgRadarChart(host, opts){
  // opts: {axes:[labels], series:[{name,color,values (0..1)}], height}
  var W = 420, H = opts.height || 340, cx = W/2, cy = H/2-6, R = Math.min(W,H)/2 - 60;
  var n = opts.axes.length;
  function pt(i, frac){
    var ang = -Math.PI/2 + i*(2*Math.PI/n);
    return { x: cx + Math.cos(ang)*R*frac, y: cy + Math.sin(ang)*R*frac };
  }
  var rings = '';
  [0.25,0.5,0.75,1].forEach(function(frac){
    var pts = [];
    for(var i=0;i<n;i++){ var p = pt(i,frac); pts.push(p.x.toFixed(1)+','+p.y.toFixed(1)); }
    rings += '<polygon points="'+pts.join(' ')+'" fill="none" stroke="var(--chalk-line)"></polygon>';
  });
  var spokes = '', labels = '';
  for(var i=0;i<n;i++){
    var p = pt(i,1);
    spokes += '<line x1="'+cx+'" y1="'+cy+'" x2="'+p.x.toFixed(1)+'" y2="'+p.y.toFixed(1)+'" stroke="var(--chalk-line)"></line>';
    var lp = pt(i,1.16);
    var anchor = Math.abs(lp.x-cx) < 5 ? 'middle' : (lp.x > cx ? 'start' : 'end');
    labels += '<text class="radar-axis-label" x="'+lp.x.toFixed(1)+'" y="'+lp.y.toFixed(1)+'" text-anchor="'+anchor+'">'+esc(opts.axes[i])+'</text>';
  }
  var polys = '';
  opts.series.forEach(function(s){
    var pts = [];
    for(var i=0;i<n;i++){ var p = pt(i, Math.max(0,Math.min(1,s.values[i]))); pts.push(p.x.toFixed(1)+','+p.y.toFixed(1)); }
    polys += '<polygon points="'+pts.join(' ')+'" fill="'+s.color+'" fill-opacity="0.18" stroke="'+s.color+'" stroke-width="2"></polygon>';
  });
  var svg = '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="max-width:460px;margin:0 auto;display:block;">'+
    rings+spokes+polys+labels+'</svg>';
  var legend = '<div class="multi-line-legend" style="justify-content:center;">' + opts.series.map(function(s){
    return '<span class="item"><span class="swatch" style="border-color:'+s.color+';"></span>'+esc(s.name)+'</span>';
  }).join('') + '</div>';
  host.innerHTML = '<div class="chart-svg-wrap">'+svg+'</div>'+legend;
}

/* =========================================================
   OVERVIEW TAB
   ========================================================= */
var overviewRendered = false;
function renderOverview(){
  if(overviewRendered) return;
  overviewRendered = true;

  var seasonCounts = new Array(DATA.seasons.length).fill(0);
  var seasonGoals = new Array(DATA.seasons.length).fill(0);
  var hw=0, dr=0, aw=0;
  DATA.matches.forEach(function(m){
    seasonCounts[m[M.SEASON]]++;
    seasonGoals[m[M.SEASON]] += m[M.HG] + m[M.AG];
    if(m[M.HG] > m[M.AG]) hw++; else if(m[M.HG] === m[M.AG]) dr++; else aw++;
  });
  var goalsPerMatch = seasonGoals.map(function(g,i){ return seasonCounts[i] ? g/seasonCounts[i] : 0; });

  document.getElementById('ovStatCards').innerHTML = [
    { l:'Home wins', v: Math.round(hw/DATA.matches.length*100)+'%' },
    { l:'Draws', v: Math.round(dr/DATA.matches.length*100)+'%' },
    { l:'Away wins', v: Math.round(aw/DATA.matches.length*100)+'%' }
  ].map(function(s){ return '<div class="stat-card"><div class="v">'+s.v+'</div><div class="l">'+s.l+'</div></div>'; }).join('');

  svgBarChart(document.getElementById('ovSeasonChart'), {
    labels: DATA.seasons, values: seasonCounts, valueFmt: function(v){ return v.toLocaleString(); }
  });
  svgDonutChart(document.getElementById('ovResultChart'), [
    { label:'Home win', value:hw, color:'#1F4A34' },
    { label:'Draw', value:dr, color:'#8A7A4E' },
    { label:'Away win', value:aw, color:'#E5A22B' }
  ]);
  svgMultiLineChart(document.getElementById('ovGoalsChart'), {
    labels: DATA.seasons,
    series: [{ name:'Goals/match', color:'#1F4A34', values: goalsPerMatch }],
    yFmt: function(v){ return v.toFixed(1); }
  });

  // Top 10 clubs by current elo
  var top = buildGlobalRanking().slice(0,10);
  document.querySelector('#ovTopEloTable tbody').innerHTML = top.map(function(t){
    return '<tr><td class="rank">'+t.rank+'</td>' +
      '<td><span class="team-link" data-team="'+t.team+'">'+esc(DATA.teams[t.team])+'</span></td>' +
      '<td>'+esc(t.country)+'</td>' +
      '<td class="num-cell" style="font-weight:700;">'+Math.round(t.elo)+'</td></tr>';
  }).join('');
  document.querySelectorAll('#ovTopEloTable .team-link').forEach(function(el){
    el.addEventListener('click', function(){ openTeam(+el.dataset.team); goToView('teams'); });
  });
}

/* =========================================================
   RANKINGS TAB
   ========================================================= */
var globalRanking = null;
var rkPage = 0, RK_PAGE_SIZE = 25;
var rkSort = { key:'elo', dir:-1 };

function buildGlobalRanking(){
  if(globalRanking) return globalRanking;
  var rows = [];
  Object.keys(matchesByTeam).forEach(function(t){
    var arr = matchesByTeam[t];
    var last = arr[arr.length-1];
    var elo = (last[M.HOME]===+t) ? last[M.POSTH] : last[M.POSTA];
    // Country isn't reliable from the most recent match alone (that might be
    // a cup or continental fixture with no country attached), so scan every
    // competition this team has played in and use the first one that has a
    // known country - domestic league appearances almost always do.
    var country = null;
    for(var i=arr.length-1; i>=0 && !country; i--){
      var info = DATA.compInfo[arr[i][M.COMP]];
      if(info && info.country) country = info.country;
    }
    rows.push({ team:+t, elo:elo, country: country || '—' });
  });
  rows.sort(function(a,b){ return b.elo - a.elo; });
  rows.forEach(function(r,i){ r.rank = i+1; });
  globalRanking = rows;
  return rows;
}

function renderRankings(){
  var rows0 = buildGlobalRanking();
  if(!document.getElementById('rkCountryFilter').options.length || document.getElementById('rkCountryFilter').options.length === 1){
    var countries = Array.from(new Set(rows0.map(function(r){ return r.country; }))).filter(function(c){return c!=='—';}).sort();
    var sel = document.getElementById('rkCountryFilter');
    countries.forEach(function(c){ var o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
    sel.addEventListener('change', function(){ rkPage=0; renderRankingsTable(); });
    document.getElementById('rkSearch').addEventListener('input', function(){ rkPage=0; renderRankingsTable(); });
    document.querySelectorAll('#rkTable th[data-key]').forEach(function(th){
      th.addEventListener('click', function(){
        var k = th.dataset.key;
        if(rkSort.key === k) rkSort.dir *= -1; else { rkSort.key = k; rkSort.dir = k==='team'||k==='country' ? 1 : -1; }
        updateSortArrows('#rkTable', rkSort);
        rkPage = 0;
        renderRankingsTable();
      });
    });
    updateSortArrows('#rkTable', rkSort);

    var top15 = rows0.slice(0,15);
    svgBarChart(document.getElementById('rkTopChart'), {
      horizontal:true, height:340,
      labels: top15.map(function(r){ return DATA.teams[r.team]; }),
      values: top15.map(function(r){ return Math.round(r.elo); })
    });
  }
  renderRankingsTable();
}

function renderRankingsTable(){
  var rows0 = buildGlobalRanking();
  var q = document.getElementById('rkSearch').value.trim().toLowerCase();
  var country = document.getElementById('rkCountryFilter').value;
  var rows = rows0.filter(function(r){
    if(country && r.country !== country) return false;
    if(q && DATA.teams[r.team].toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
  var sorted = rows.slice();
  var k = rkSort.key, dir = rkSort.dir;
  sorted.sort(function(a,b){
    var av, bv;
    if(k==='team'){ av=DATA.teams[a.team]; bv=DATA.teams[b.team]; return dir*av.localeCompare(bv); }
    if(k==='rank' || k==='elo'){ av=a.elo; bv=b.elo; return dir*(av-bv); }
    av = a[k]; bv = b[k];
    return dir*String(av).localeCompare(String(bv));
  });
  document.getElementById('rkCount').textContent = sorted.length.toLocaleString() + ' clubs';
  var totalPages = Math.max(1, Math.ceil(sorted.length / RK_PAGE_SIZE));
  if(rkPage >= totalPages) rkPage = totalPages-1;
  var pageItems = sorted.slice(rkPage*RK_PAGE_SIZE, (rkPage+1)*RK_PAGE_SIZE);
  document.querySelector('#rkTable tbody').innerHTML = pageItems.map(function(r){
    return '<tr><td class="rank">'+r.rank+'</td>' +
      '<td><span class="team-link" data-team="'+r.team+'">'+esc(DATA.teams[r.team])+'</span></td>' +
      '<td>'+esc(r.country)+'</td>' +
      '<td class="num-cell" style="font-weight:700;">'+Math.round(r.elo)+'</td></tr>';
  }).join('') || '<tr><td colspan="4" style="color:var(--ink-soft);padding:20px 10px;">No clubs match that filter.</td></tr>';
  document.querySelectorAll('#rkTable .team-link').forEach(function(el){
    el.addEventListener('click', function(){ openTeam(+el.dataset.team); goToView('teams'); });
  });
  var pager = document.getElementById('rkPager');
  pager.innerHTML = '<button id="rkPrev" '+(rkPage===0?'disabled':'')+'>← Prev</button>' +
    '<span>Page '+(rkPage+1)+' of '+totalPages+'</span>' +
    '<button id="rkNext" '+(rkPage>=totalPages-1?'disabled':'')+'>Next →</button>';
  var pb = document.getElementById('rkPrev'), nb = document.getElementById('rkNext');
  if(pb) pb.addEventListener('click', function(){ rkPage--; renderRankingsTable(); });
  if(nb) nb.addEventListener('click', function(){ rkPage++; renderRankingsTable(); });
}

/* =========================================================
   COMPARE TAB
   ========================================================= */
var cmpSelected = [];
function renderCompare(){
  if(document.getElementById('cmpSearch')._wired) { renderCompareContent(); return; }
  document.getElementById('cmpSearch')._wired = true;
  var input = document.getElementById('cmpSearch');
  var results = document.getElementById('cmpAcResults');
  input.addEventListener('input', function(){
    var q = input.value.trim().toLowerCase();
    if(!q){ results.classList.remove('show'); return; }
    var matches = DATA.leagueMeta.filter(function(r){
      return cmpSelected.indexOf(r.comp) === -1 && ((r.country||'')+' '+r.comp).toLowerCase().indexOf(q) !== -1;
    }).slice(0,8);
    if(!matches.length){ results.classList.remove('show'); results.innerHTML=''; return; }
    results.innerHTML = matches.map(function(r){
      return '<div data-comp="'+esc(r.comp)+'"><span>'+esc(r.country||'')+' — '+esc(r.comp)+'</span></div>';
    }).join('');
    results.classList.add('show');
    results.querySelectorAll('div[data-comp]').forEach(function(el){
      el.addEventListener('mousedown', function(e){
        e.preventDefault();
        if(cmpSelected.length < 5){ cmpSelected.push(el.dataset.comp); }
        input.value = '';
        results.classList.remove('show');
        renderCompareContent();
      });
    });
  });
  document.addEventListener('click', function(e){
    if(!results.contains(e.target) && e.target !== input) results.classList.remove('show');
  });
  renderCompareContent();
}

function renderCompareContent(){
  var pillWrap = document.getElementById('cmpSelected');
  pillWrap.innerHTML = cmpSelected.map(function(c, i){
    return '<span class="pill removable" style="background:'+PALETTE[i%PALETTE.length]+';border-color:'+PALETTE[i%PALETTE.length]+';">'+esc(c)+' <span class="x" data-idx="'+i+'">&times;</span></span>';
  }).join('');
  pillWrap.querySelectorAll('.x').forEach(function(el){
    el.addEventListener('click', function(){
      cmpSelected.splice(+el.dataset.idx, 1);
      renderCompareContent();
    });
  });

  var container = document.getElementById('cmpContent');
  if(cmpSelected.length < 2){
    container.innerHTML = '<div class="empty-state"><h3>Pick at least two competitions</h3><p>Search above to add them to the comparison.</p></div>';
    return;
  }
  var rows = cmpSelected.map(function(c){ return DATA.leagueMeta.filter(function(r){ return r.comp === c; })[0]; });
  var maxGoals = Math.max.apply(null, rows.map(function(r){ return r.G||0; }));
  var maxElo = Math.max.apply(null, rows.map(function(r){ return r.rating||0; }));
  var maxHwPct = Math.max.apply(null, rows.map(function(r){ return r.W && r.P ? r.W/r.P : 0; }));
  var maxMatches = Math.max.apply(null, rows.map(function(r){ return r.P||0; }));
  var minStd = Math.min.apply(null, rows.map(function(r){ return r.stddev||0; }));
  var maxStd = Math.max.apply(null, rows.map(function(r){ return r.stddev||0; }));

  var radarSeries = rows.map(function(r, i){
    var parity = (maxStd===minStd) ? 1 : 1 - ((r.stddev-minStd)/(maxStd-minStd));
    return {
      name: r.comp, color: PALETTE[i%PALETTE.length],
      values: [
        maxGoals ? (r.G||0)/maxGoals : 0,
        maxElo ? (r.rating||0)/maxElo : 0,
        maxHwPct ? ((r.W&&r.P)?r.W/r.P:0)/maxHwPct : 0,
        maxMatches ? (r.P||0)/maxMatches : 0,
        parity
      ]
    };
  });

  var html = '<div class="grid-2">';
  html += '<div class="panel"><div class="panel-title"><span>Normalized profile</span></div>' +
    '<div id="cmpRadar"></div></div>';
  html += '<div class="panel"><div class="panel-title"><span>Average goals per match</span></div>' +
    '<div id="cmpBarGoals"></div></div>';
  html += '</div>';

  html += '<div class="panel"><div class="panel-title"><span>Side by side</span></div>' +
    '<div class="scroll-x"><table class="data"><thead><tr>' +
    '<th>Competition</th><th class="num-cell">Clubs</th><th class="num-cell">Matches</th>' +
    '<th class="num-cell">Goals/match</th><th class="num-cell">Avg Elo</th><th class="num-cell">Home win %</th><th class="num-cell">Parity σ%</th>' +
    '</tr></thead><tbody>' +
    rows.map(function(r,i){
      return '<tr><td><span class="cmp-color-dot" style="background:'+PALETTE[i%PALETTE.length]+';margin-right:6px;"></span>'+esc((r.country?r.country+' — ':'')+r.comp)+'</td>' +
        '<td class="num-cell">'+(r.clubs!=null?r.clubs:'—')+'</td>' +
        '<td class="num-cell">'+(r.P!=null?r.P.toLocaleString():'—')+'</td>' +
        '<td class="num-cell">'+(r.G!=null?num(r.G,2):'—')+'</td>' +
        '<td class="num-cell">'+(r.rating!=null?Math.round(r.rating):'—')+'</td>' +
        '<td class="num-cell">'+(r.W&&r.P?Math.round(r.W/r.P*100)+'%':'—')+'</td>' +
        '<td class="num-cell">'+(r.stddev!=null?num(r.stddev,1)+'%':'—')+'</td></tr>';
    }).join('') +
    '</tbody></table></div></div>';

  container.innerHTML = html;
  svgRadarChart(document.getElementById('cmpRadar'), {
    axes: ['Goals','Elo','Home win %','Match volume','Parity'],
    series: radarSeries
  });
  svgBarChart(document.getElementById('cmpBarGoals'), {
    labels: rows.map(function(r){ return r.comp; }),
    values: rows.map(function(r){ return r.G||0; }),
    color: PALETTE[0],
    valueFmt: function(v){ return v.toFixed(2); }
  });
}

/* =========================================================
   INSIGHTS TAB
   ========================================================= */
var insightsRendered = false;
function renderInsights(){
  if(insightsRendered) return;
  insightsRendered = true;

  // --- Elo gap vs outcome ---
  var gapW = 50, gapMax = 350;
  function gapBucket(diff){
    var d = Math.max(-gapMax, Math.min(gapMax, diff));
    return Math.round(d/gapW)*gapW;
  }
  var gapBuckets = {};
  DATA.matches.forEach(function(m){
    var diff = m[M.PREH] - m[M.PREA];
    var b = gapBucket(diff);
    var o = gapBuckets[b] || (gapBuckets[b] = {h:0,d:0,a:0,total:0});
    if(m[M.HG] > m[M.AG]) o.h++; else if(m[M.HG]===m[M.AG]) o.d++; else o.a++;
    o.total++;
  });
  var gapKeys = Object.keys(gapBuckets).map(Number).sort(function(a,b){return a-b;});
  svgMultiLineChart(document.getElementById('inEloGapChart'), {
    labels: gapKeys.map(function(k){ return (k>0?'+':'')+k; }),
    series: [
      { name:'Home win %', color:'#1F4A34', values: gapKeys.map(function(k){ return Math.round(gapBuckets[k].h/gapBuckets[k].total*100); }) },
      { name:'Draw %', color:'#8A7A4E', values: gapKeys.map(function(k){ return Math.round(gapBuckets[k].d/gapBuckets[k].total*100); }) },
      { name:'Away win %', color:'#E5A22B', values: gapKeys.map(function(k){ return Math.round(gapBuckets[k].a/gapBuckets[k].total*100); }) }
    ],
    yFmt: function(v){ return Math.round(v)+'%'; }
  });

  // --- Rest days vs home win rate ---
  var restBands = [ [0,2,'0-2d'], [3,4,'3-4d'], [5,6,'5-6d'], [7,9,'7-9d'], [10,999,'10d+'] ];
  var restAgg = restBands.map(function(){ return {win:0,total:0}; });
  DATA.matches.forEach(function(m){
    var r = m[M.RESTH];
    if(r === null || r === undefined) return;
    for(var i=0;i<restBands.length;i++){
      if(r >= restBands[i][0] && r <= restBands[i][1]){
        restAgg[i].total++;
        if(m[M.HG] > m[M.AG]) restAgg[i].win++;
        break;
      }
    }
  });
  svgBarChart(document.getElementById('inRestChart'), {
    labels: restBands.map(function(b){ return b[2]; }),
    values: restAgg.map(function(a){ return a.total ? Math.round(a.win/a.total*100) : 0; }),
    color: '#2E5C8A',
    valueFmt: function(v){ return v+'%'; }
  });

  // --- Schedule congestion vs goals scored ---
  var congBands = [ [0,14,'≤14'], [15,19,'15-19'], [20,24,'20-24'], [25,29,'25-29'], [30,999,'30+'] ];
  var congAgg = congBands.map(function(){ return {goals:0,total:0}; });
  DATA.matches.forEach(function(m){
    var c = m[M.M180H];
    if(c === null || c === undefined) return;
    for(var i=0;i<congBands.length;i++){
      if(c >= congBands[i][0] && c <= congBands[i][1]){
        congAgg[i].total++;
        congAgg[i].goals += m[M.HG];
        break;
      }
    }
  });
  svgBarChart(document.getElementById('inCongestionChart'), {
    labels: congBands.map(function(b){ return b[2]; }),
    values: congAgg.map(function(a){ return a.total ? +(a.goals/a.total).toFixed(2) : 0; }),
    color: '#8A3B2E',
    valueFmt: function(v){ return v.toFixed(2); }
  });

  // --- Elo trend (form) vs win rate ---
  var formBands = [ [-999,-10,'Cooling'], [-10,10,'Stable'], [10,999,'Hot'] ];
  var formAgg = formBands.map(function(){ return {win:0,total:0}; });
  DATA.matches.forEach(function(m){
    var t = m[M.TRENDH];
    if(t === null || t === undefined) return;
    for(var i=0;i<formBands.length;i++){
      if(t >= formBands[i][0] && t <= formBands[i][1]){
        formAgg[i].total++;
        if(m[M.HG] > m[M.AG]) formAgg[i].win++;
        break;
      }
    }
  });
  svgBarChart(document.getElementById('inFormChart'), {
    labels: formBands.map(function(b){ return b[2]; }),
    values: formAgg.map(function(a){ return a.total ? Math.round(a.win/a.total*100) : 0; }),
    color: '#6B4F8A',
    valueFmt: function(v){ return v+'%'; }
  });
}

/* ---------- deep-link: open a default competition on first load ---------- */
renderTeamContent();
renderOverview();

})();
