const state = {
  data: null,
  svg: null,
  viewport: null,
  simulation: null,
  panZoom: null,
  selectedNode: null
};

const WIDTH = 1400;
const HEIGHT = 900;

// Use embedded mock data from window.mockData
if (window.mockData) {
  initialize(window.mockData);
} else {
  console.error('Embedded mock data not found');
  document.getElementById('metaText').textContent = 'Failed to load overview data';
}

function initialize(data) {
  state.data = data;
  document.getElementById('metaText').textContent = `${data.metadata.title} · updated ${data.metadata.lastUpdated}`;
  renderLegend(data.groups || []);
  setupCanvas();
  drawGraph();
}

function renderLegend(groups) {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  groups.forEach((group) => {
    const span = document.createElement('span');
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = group.color;
    span.appendChild(swatch);
    span.append(group.label);
    legend.appendChild(span);
  });
}

function setupCanvas() {
  state.svg = d3.select('#flowCanvas');
  state.svg.selectAll('*').remove();

  state.svg.append('defs').append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 10)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#ffffff55');

  state.viewport = state.svg.append('g').attr('class', 'viewport');

  state.panZoom = svgPanZoom('#flowCanvas', {
    zoomEnabled: true,
    controlIconsEnabled: false,
    minZoom: 0.4,
    maxZoom: 4,
    fit: true,
    center: true
  });

  document.getElementById('resetZoom').addEventListener('click', () => {
    state.panZoom.reset();
  });
}

function drawGraph() {
  const nodes = state.data.apis.map((api) => ({
    ...api,
    width: 220,
    height: 90
  }));
  const links = state.data.links.map((link) => ({ ...link }));

  const colorMap = Object.fromEntries((state.data.groups || []).map((g) => [g.id, g.color]));

  const linkSelection = state.viewport.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('class', (d) => `link ${d.type || ''}`.trim());

  const nodeSelection = state.viewport.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .call(dragBehaviour());

  nodeSelection.append('rect')
    .attr('width', (d) => d.width)
    .attr('height', (d) => d.height)
    .attr('fill', (d) => colorMap[d.group] || '#2b2d42')
    .attr('stroke', '#ffffff33')
    .attr('stroke-width', 1.4)
    .attr('rx', 16)
    .attr('ry', 16);

  nodeSelection.append('text')
    .attr('x', 16)
    .attr('y', 24)
    .text((d) => d.name);

  nodeSelection.append('text')
    .attr('x', 16)
    .attr('y', 44)
    .attr('fill', '#d1d5db')
    .style('font-size', '11px')
    .text((d) => d.function);

  // tiny scenario boxes under each node
  nodeSelection.each(function (nodeData) {
    const scenarioGroup = d3.select(this)
      .append('g')
      .attr('class', 'node-scenarios');

    (nodeData.scenarios || []).forEach((scenario, index) => {
      const box = scenarioGroup.append('rect')
        .attr('x', 16 + index * 18)
        .attr('y', nodeData.height - 24)
        .attr('width', 14)
        .attr('height', 14)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', '#00000066')
        .attr('stroke', '#ffffff33')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          window.open(scenario.sample, '_blank');
        });

      scenarioGroup.append('title').text(`${scenario.label}: ${scenario.summary}`);
    });
  });

  nodeSelection.on('click', (_, d) => {
    state.selectedNode = d;
    highlightSelection(nodeSelection, d);
    populateDetails(d);
  });

  state.simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d) => d.id).distance(220).strength(0.8))
    .force('charge', d3.forceManyBody().strength(-900))
    .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2))
    .force('collision', d3.forceCollide().radius(140))
    .on('tick', ticked);

  function ticked() {
    linkSelection
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);

    nodeSelection
      .attr('transform', (d) => `translate(${d.x - d.width / 2}, ${d.y - d.height / 2})`);
  }
}

function dragBehaviour() {
  function dragStarted(event) {
    if (!event.active) state.simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragEnded(event) {
    if (!event.active) state.simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag().on('start', dragStarted).on('drag', dragged).on('end', dragEnded);
}

function highlightSelection(nodeSelection, selected) {
  nodeSelection.selectAll('rect')
    .attr('stroke-width', 1.4)
    .attr('stroke', '#ffffff33');

  nodeSelection
    .filter((d) => d.id === selected.id)
    .select('rect')
    .attr('stroke-width', 3)
    .attr('stroke', '#ffffffdd');
}

function populateDetails(node) {
  const placeholder = document.getElementById('placeholder');
  const details = document.getElementById('details');

  placeholder.hidden = true;
  details.hidden = false;

  document.getElementById('apiName').textContent = node.name;
  document.getElementById('apiFunction').textContent = node.function;
  document.getElementById('apiDescription').textContent = node.description;

  const meta = document.getElementById('apiMeta');
  meta.innerHTML = '';

  const source = document.createElement('a');
  source.href = `../${node.source}`;
  source.target = '_blank';
  source.rel = 'noreferrer';
  source.textContent = 'View source';
  meta.appendChild(source);

  const scenarioList = document.getElementById('scenarioList');
  scenarioList.innerHTML = '';
  (node.scenarios || []).forEach((scenario) => {
    const pill = document.createElement('div');
    pill.className = 'scenario-pill';

    const label = document.createElement('strong');
    label.textContent = scenario.label;
    pill.appendChild(label);

    const summary = document.createElement('p');
    summary.textContent = scenario.summary;
    summary.style.margin = '0';
    summary.style.fontSize = '0.85rem';
    summary.style.color = '#d1d5db';
    pill.appendChild(summary);

    const button = document.createElement('button');
    button.textContent = 'View sample';
    button.addEventListener('click', () => window.open(scenario.sample, '_blank'));
    pill.appendChild(button);

    scenarioList.appendChild(pill);
  });

  const docLinks = document.getElementById('docLinks');
  docLinks.innerHTML = '';
  (node.docs || []).forEach((docPath) => {
    const li = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = `../${docPath}`;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.textContent = docPath;
    li.appendChild(anchor);
    docLinks.appendChild(li);
  });
}
