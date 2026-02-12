import * as cheerio from "https://cdn.jsdelivr.net/npm/cheerio@1.0.0-rc.12/+esm";

function norm(s) {
  return s.replace(/\s+/g, " ").replace(/[’']/g, "’").trim();
}

function parseMatchesFromBodyText(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let jornada = null;
  const jornadaRe = /^Jornada\s+(\d+)$/i;
  const scoreRe = /^(.*?)\s{1,}(.*?)\s+(\d+)-(\d+)$/;

  const matches = [];

  for (const ln of lines) {
    const jm = ln.match(jornadaRe);
    if (jm) {
      jornada = Number(jm[1]);
      continue;
    }
    if (!jornada) continue;

    if (ln.startsWith("DESCANSA")) continue;
    if (ln.endsWith("---") && ln.includes("DESCANSA")) continue;

    const sm = ln.match(scoreRe);
    if (!sm) continue;

    matches.push({
      jornada,
      home: norm(sm[1]),
      away: norm(sm[2]),
      hg: Number(sm[3]),
      ag: Number(sm[4]),
    });
  }

  return matches;
}

function computeStandings(matches) {
  const teams = new Set();
  for (const m of matches) {
    teams.add(m.home);
    teams.add(m.away);
  }

  const table = new Map();
  for (const t of teams) {
    table.set(t, { team: t, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0 });
  }

  for (const m of matches) {
    const h = table.get(m.home);
    const a = table.get(m.away);

    h.pj++; a.pj++;
    h.gf += m.hg; h.gc += m.ag;
    a.gf += m.ag; a.gc += m.hg;

    if (m.hg > m.ag) { h.pg++; a.pp++; h.pts += 3; }
    else if (m.hg < m.ag) { a.pg++; h.pp++; a.pts += 3; }
    else { h.pe++; a.pe++; h.pts += 1; a.pts += 1; }
  }

  const rows = [...table.values()].map(r => ({ ...r, dg: r.gf - r.gc }));

  // Desempate: Pts → DG → GF → nombre
  rows.sort((x, y) => {
    if (y.pts !== x.pts) return y.pts - x.pts;
    if (y.dg !== x.dg) return y.dg - x.dg;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });

  return rows;
}

function groupByJornada(matches) {
  const by = new Map();
  for (const m of matches) {
    if (!by.has(m.jornada)) by.set(m.jornada, []);
    by.get(m.jornada).push(m);
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0]);
}

function renderStandings(rows) {
  const head = `
    <table>
      <thead>
        <tr>
          <th>#</th><th>Equipo</th><th>Pts</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th>
        </tr>
      </thead><tbody>`;
  const body = rows.map((r, i) => `
      <tr>
        <td class="mono">${String(i + 1).padStart(2, "0")}</td>
        <td>${r.team}</td>
        <td><b>${r.pts}</b></td>
        <td>${r.pj}</td>
        <td>${r.pg}</td>
        <td>${r.pe}</td>
        <td>${r.pp}</td>
        <td>${r.gf}</td>
        <td>${r.gc}</td>
        <td>${r.dg}</td>
      </tr>`).join("");
  return head + body + "</tbody></table>";
}

function renderResults(byJ) {
  return byJ.map(([j, ms]) => {
    const lines = ms.map(m => `• ${m.home} ${m.hg}-${m.ag} ${m.away}`).join("<br/>");
    return `<div style="margin-bottom:12px;"><b>Jornada ${j}</b><div class="muted" style="margin-top:6px;">${lines}</div></div>`;
  }).join("");
}

async function load() {
  const status = document.querySelector("#status");
  status.textContent = "Cargando…";

  const r = await fetch("/api/group");
  if (!r.ok) throw new Error(`API error ${r.status}`);
  const html = await r.text();

  const $ = cheerio.load(html);
  const text = $("body").text();

  const matches = parseMatchesFromBodyText(text);
  const standings = computeStandings(matches);
  const byJ = groupByJornada(matches);

  document.querySelector("#standings").innerHTML = renderStandings(standings);
  document.querySelector("#results").innerHTML = renderResults(byJ);

  status.textContent = `OK · ${matches.length} partidos con marcador`;
}

document.querySelector("#refresh").addEventListener("click", () => {
  load().catch((e) => {
    document.querySelector("#status").textContent = `Error: ${String(e)}`;
  });
});

load().catch((e) => {
  document.querySelector("#status").textContent = `Error: ${String(e)}`;
});
