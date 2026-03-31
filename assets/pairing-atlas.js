/**
 * Pairing Atlas — D3 force graph from combined_data + aroma food_pairings.
 * Protein anchors → book-backed neighbors (Flavor tiers + Aroma seasonings).
 */
(function () {
  'use strict';

  var UNIFIED = 'combined_data/ingredients_unified.json';
  var FOOD_PAIR = 'aroma_data/food_pairings.json';

  var PROFILES = [
    { id: 'lamb', label: 'Lamb', keys: ['lamb', 'mutton', 'sheep'] },
    { id: 'beef', label: 'Beef', keys: ['beef', 'veal', 'ox', 'steak'] },
    { id: 'chicken', label: 'Chicken', keys: ['chicken', 'poultry', 'hen'] },
    { id: 'pork', label: 'Pork', keys: ['pork', 'pig', 'bacon', 'ham'] },
    { id: 'fish', label: 'Fish', keys: ['fish', 'salmon', 'cod', 'seafood'] },
    { id: 'duck', label: 'Duck', keys: ['duck', 'canard'] },
    { id: 'eggs', label: 'Eggs', keys: ['egg', 'eggs'] },
    { id: 'tofu', label: 'Tofu', keys: ['tofu', 'soy'] },
    { id: 'legumes', label: 'Legumes', keys: ['lentil', 'lentils', 'bean', 'beans', 'chickpea'] },
    { id: 'mushroom', label: 'Mushrooms', keys: ['mushroom', 'mushrooms', 'porcini'] },
  ];

  var unified = [];
  var foodPairings = [];
  var svg = null;
  var gRoot = null;
  var simulation = null;
  var linkSel = null;
  var nodeSel = null;
  var labelSel = null;
  var zoom = null;
  var width = 800;
  var height = 560;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function slug(s) {
    return norm(s).replace(/\s+/g, '-').slice(0, 64);
  }

  function findFoodRow(keys) {
    for (var i = 0; i < foodPairings.length; i++) {
      var fp = foodPairings[i];
      var n = norm(fp.name || '');
      for (var k = 0; k < keys.length; k++) {
        if (n.indexOf(keys[k]) >= 0 || keys[k].indexOf(n) >= 0) return fp;
      }
    }
    return null;
  }

  function findUnifiedRow(keys) {
    var best = null;
    var bestSc = 0;
    for (var i = 0; i < unified.length; i++) {
      var u = unified[i];
      var n = norm(u.name || '');
      if (!n) continue;
      var sc = 0;
      for (var k = 0; k < keys.length; k++) {
        if (n === keys[k]) sc += 3;
        else if (n.indexOf(keys[k]) >= 0) sc += 2;
      }
      var flav = u.flavor;
      if (flav && flav.pairings && Object.keys(flav.pairings).length) sc += 1;
      if (sc > bestSc) {
        bestSc = sc;
        best = u;
      }
    }
    return bestSc >= 2 ? best : null;
  }

  function addPairingEdges(map, fromId, tier, list, weight) {
    if (!list || !list.length) return;
    var cap = tier === 'holy_grail' ? 12 : tier === 'very_highly_recommended' ? 18 : tier === 'highly_recommended' ? 22 : 28;
    for (var i = 0; i < Math.min(list.length, cap); i++) {
      var label = String(list[i]).trim();
      if (!label || label.length > 72) continue;
      if (/^[•\d]/.test(label) || /→/.test(label)) continue;
      var tid = 'p-' + slug(label);
      if (!map.nodes[tid]) {
        map.nodes[tid] = {
          id: tid,
          name: label,
          kind: 'pairing',
          tier: tier,
        };
      }
      var eid = fromId + '->' + tid + ':' + tier;
      if (!map.edges[eid]) {
        map.edges[eid] = { source: fromId, target: tid, weight: weight, tier: tier };
      }
    }
  }

  function buildGraph(profile) {
    var anchorName = profile.label;
    var keys = profile.keys;
    var nodes = {};
    var edges = {};

    var centerId = 'center-' + profile.id;
    nodes[centerId] = {
      id: centerId,
      name: anchorName,
      kind: 'anchor',
      tier: null,
    };

    var fp = findFoodRow(keys);
    if (fp && fp.seasonings) {
      for (var s = 0; s < Math.min(fp.seasonings.length, 36); s++) {
        var se = fp.seasonings[s];
        var nm = se.name || se.id || '';
        var sid = 'a-' + slug(nm);
        if (!nodes[sid]) {
          nodes[sid] = { id: sid, name: nm, kind: 'aroma', tier: 'aroma' };
        }
        edges[centerId + '->' + sid + ':aroma'] = {
          source: centerId,
          target: sid,
          weight: 2,
          tier: 'aroma',
        };
      }
    }

    var ur = findUnifiedRow(keys);
    if (ur && ur.flavor && ur.flavor.pairings) {
      var p = ur.flavor.pairings;
      addPairingEdges({ nodes: nodes, edges: edges }, centerId, 'holy_grail', p.holy_grail, 5);
      addPairingEdges({ nodes: nodes, edges: edges }, centerId, 'very_highly_recommended', p.very_highly_recommended, 4);
      addPairingEdges({ nodes: nodes, edges: edges }, centerId, 'highly_recommended', p.highly_recommended, 3);
      addPairingEdges({ nodes: nodes, edges: edges }, centerId, 'recommended', p.recommended, 2);
    }

    var nodeList = Object.keys(nodes).map(function (k) {
      return nodes[k];
    });
    var edgeList = Object.keys(edges).map(function (k) {
      return edges[k];
    });

    if (nodeList.length < 2 && fp) {
      /* fallback label */
      nodes[centerId].name = fp.name || anchorName;
    }

    return { nodes: nodeList, links: edgeList, unifiedRow: ur, foodRow: fp };
  }

  function tierColor(tier) {
    if (tier === 'holy_grail') return 'var(--gold)';
    if (tier === 'very_highly_recommended') return 'var(--gold-light)';
    if (tier === 'highly_recommended') return '#c4b896';
    if (tier === 'aroma') return 'var(--blue)';
    return 'var(--text3)';
  }

  function renderGraph(data) {
    var nodes = data.nodes.map(function (d) {
      return Object.assign({}, d);
    });
    var links = data.links.map(function (d) {
      return {
        source: d.source,
        target: d.target,
        weight: d.weight,
        tier: d.tier,
      };
    });

    if (!svg || !gRoot) return;

    function linkKey(d) {
      var s = typeof d.source === 'object' && d.source ? d.source.id : d.source;
      var t = typeof d.target === 'object' && d.target ? d.target.id : d.target;
      return String(s) + '-' + String(t);
    }

    linkSel = gRoot
      .selectAll('line.pa-link-line')
      .data(links, linkKey)
      .join('line')
      .attr('class', 'pa-link-line pa-link')
      .attr('class', 'pa-link')
      .attr('stroke', function (d) {
        return tierColor(d.tier);
      })
      .attr('stroke-opacity', 0.35)
      .attr('stroke-width', function (d) {
        return 0.5 + (d.weight || 1) * 0.35;
      });

    nodeSel = gRoot
      .selectAll('circle.pa-node')
      .data(nodes, function (d) {
        return d.id;
      })
      .join('circle')
      .attr('class', 'pa-node')
      .attr('r', function (d) {
        return d.kind === 'anchor' ? 14 : d.tier === 'holy_grail' ? 9 : 7;
      })
      .attr('fill', function (d) {
        if (d.kind === 'anchor') return 'var(--gold)';
        return tierColor(d.tier);
      })
      .attr('stroke', 'rgba(255,255,255,0.12)')
      .attr('stroke-width', 1.5)
      .style('cursor', 'grab');

    labelSel = gRoot
      .selectAll('text.pa-label')
      .data(
        nodes.filter(function (d) {
          return d.kind === 'anchor' || d.tier === 'holy_grail' || d.kind === 'aroma';
        }),
        function (d) {
          return d.id;
        }
      )
      .join('text')
      .attr('class', 'pa-label')
      .text(function (d) {
        var t = d.name || '';
        return t.length > 22 ? t.slice(0, 20) + '…' : t;
      })
      .attr('font-size', 11)
      .attr('fill', 'var(--text2)')
      .attr('dx', 12)
      .attr('dy', 4)
      .style('pointer-events', 'none');

    simulation.nodes(nodes);
    simulation.force(
      'link',
      d3
        .forceLink(links)
        .id(function (d) {
          return d.id;
        })
        .distance(function (d) {
          return 48 + (6 - (d.weight || 2)) * 8;
        })
        .strength(0.55)
    );
    nodeSel.call(drag(simulation));
    simulation.alpha(reduceMotion ? 0 : 0.85).restart();
    if (reduceMotion) {
      for (var i = 0; i < 80; i++) simulation.tick();
      simulation.alpha(0);
      ticked();
    }

    nodeSel.on('click', function (ev, d) {
      ev.stopPropagation();
      showDetail(d, data);
    });
  }

  function ticked() {
    if (!linkSel || !nodeSel) return;
    linkSel
      .attr('x1', function (d) {
        return d.source.x;
      })
      .attr('y1', function (d) {
        return d.source.y;
      })
      .attr('x2', function (d) {
        return d.target.x;
      })
      .attr('y2', function (d) {
        return d.target.y;
      });

    nodeSel.attr('cx', function (d) {
      return d.x;
    }).attr('cy', function (d) {
      return d.y;
    });

    if (labelSel) {
      labelSel.attr('x', function (d) {
        return d.x;
      }).attr('y', function (d) {
        return d.y;
      });
    }
  }

  function drag(sim) {
    function dragstarted(event) {
      if (!event.active) sim.alphaTarget(0.35).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event) {
      if (!event.active) sim.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
  }

  function showDetail(d, data) {
    var panel = document.getElementById('paDetail');
    var live = document.getElementById('paLive');
    if (!panel) return;

    var html =
      '<h3 class="pa-detail-title">' +
      escapeHtml(d.name) +
      '</h3>' +
      '<p class="pa-detail-meta">' +
      (d.kind === 'anchor'
        ? 'Protein / focus anchor'
        : d.kind === 'aroma'
          ? 'Aroma Bible seasoning'
          : 'Flavor Bible pairing · ' + escapeHtml(d.tier || '').replace(/_/g, ' ')) +
      '</p>';

    if (d.kind === 'anchor' && data.unifiedRow && data.unifiedRow.flavor) {
      var f = data.unifiedRow.flavor;
      if (f.taste && f.taste.length)
        html += '<div class="pa-chips">' + f.taste.map(chip).join('') + '</div>';
      if (f.season) html += '<p class="pa-detail-line"><strong>Season</strong> · ' + escapeHtml(f.season) + '</p>';
    }

    html +=
      '<p class="pa-detail-actions"><a class="pa-link-out" href="flavor.html?q=' +
      encodeURIComponent(d.name) +
      '">Open in Flavor explorer →</a></p>';
    panel.innerHTML = html;
    if (live) live.textContent = 'Selected: ' + d.name;

    var inp = document.getElementById('paSearch');
    if (inp) inp.value = d.name;

    if (nodeSel) {
      nodeSel.classed('pa-node--selected', function (n) {
        return n.id === d.id;
      });
    }
  }

  function chip(t) {
    return '<span class="pa-chip">' + escapeHtml(t) + '</span>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resizeSvg() {
    var wrap = document.getElementById('paGraph');
    if (!wrap || !svg) return;
    var r = wrap.getBoundingClientRect();
    width = Math.max(320, r.width);
    height = Math.max(400, Math.min(720, window.innerHeight * 0.62));
    svg.attr('viewBox', [0, 0, width, height]);
    if (simulation) {
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.2).restart();
    }
  }

  function runProfile(profile) {
    document.querySelectorAll('.pa-profile').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-profile') === profile.id ? 'true' : 'false');
    });
    var data = buildGraph(profile);
    var status = document.getElementById('paStatus');
    if (status) {
      status.textContent =
        data.nodes.length +
        ' nodes · ' +
        data.links.length +
        ' links' +
        (data.foodRow ? ' · Aroma: “' + data.foodRow.name + '”' : '');
    }
    renderGraph(data);
    showDetail(data.nodes[0], data);
  }

  function init() {
    var wrap = document.getElementById('paGraph');
    if (!wrap || typeof d3 === 'undefined') {
      wrap.innerHTML = '<p class="pa-error">D3 failed to load. Check network.</p>';
      return;
    }

    svg = d3.select('#paGraph').append('svg').attr('class', 'pa-svg').attr('preserveAspectRatio', 'xMidYMid meet');
    gRoot = svg.append('g');

    zoom = d3
      .zoom()
      .scaleExtent([0.35, 3])
      .on('zoom', function (ev) {
        gRoot.attr('transform', ev.transform);
      });
    svg.call(zoom);

    simulation = d3
      .forceSimulation()
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(10))
      .on('tick', ticked);

    window.addEventListener('resize', resizeSvg);

    Promise.all([
      fetch(UNIFIED).then(function (r) {
        return r.ok ? r.json() : [];
      }),
      fetch(FOOD_PAIR).then(function (r) {
        return r.ok ? r.json() : [];
      }),
    ])
      .then(function (pair) {
        unified = pair[0] || [];
        foodPairings = pair[1] || [];
        resizeSvg();
        runProfile(PROFILES[0]);

        document.querySelectorAll('.pa-profile').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-profile');
            var p = null;
            for (var pi = 0; pi < PROFILES.length; pi++) {
              if (PROFILES[pi].id === id) {
                p = PROFILES[pi];
                break;
              }
            }
            if (p) runProfile(p);
          });
        });

        document.getElementById('paSearchBtn').addEventListener('click', function () {
          var q = norm(document.getElementById('paSearch').value);
          if (!q) return;
          var custom = { id: 'custom', label: q.split(' ').map(cap).join(' '), keys: q.split(/\s+/).filter(Boolean) };
          runProfile(custom);
        });

        document.getElementById('paResetZoom').addEventListener('click', function () {
          svg.transition().duration(reduceMotion ? 0 : 220).call(zoom.transform, d3.zoomIdentity);
        });

        var searchInp = document.getElementById('paSearch');
        if (searchInp) {
          searchInp.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              document.getElementById('paSearchBtn').click();
            }
          });
        }
      })
      .catch(function () {
        wrap.innerHTML = '<p class="pa-error">Could not load data files.</p>';
      });
  }

  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
