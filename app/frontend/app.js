const UNIT_TYPES = [
  { key: 'unit_default', label: 'Unidade default' },
  { key: 'unit_compra', label: 'Unidade de compra' },
  { key: 'unit_stock', label: 'Unidade de stock' },
  { key: 'unit_log', label: 'Unidade logística' },
];

const clusterStates = new Map();

function getDashboardFrame() {
  return document.getElementById('learning-dashboard-frame');
}

function postDashboardMessage(action, payload = {}) {
  const frame = getDashboardFrame();
  if (!frame || !frame.contentWindow) {
    return;
  }
  frame.contentWindow.postMessage({
    source: 'sa-convert-data',
    action,
    ...payload,
  }, '*');
}

function notifyDashboardScope(scope) {
  postDashboardMessage('scope-change', { scope });
}

function notifyDashboardRefresh(reason) {
  postDashboardMessage('refresh', { reason });
}

function stringifyResult(result) {
  return JSON.stringify(result, null, 2);
}

function getCurrentScope() {
  const scopeInput = document.getElementById('scope');
  const value = (scopeInput?.value || '').trim();
  return value || 'global';
}

function describeConfidence(score) {
  if (score >= 0.92) {
    return { label: 'Alta', className: 'confidence-high' };
  }
  if (score >= 0.85) {
    return { label: 'Média', className: 'confidence-medium' };
  }
  return { label: 'Baixa', className: 'confidence-low' };
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  return num.toLocaleString('pt-PT', { maximumFractionDigits: 3 });
}

function formatQuantity(quantity) {
  if (!quantity || typeof quantity !== 'object') {
    return '—';
  }
  const parts = [];
  const totalFormatted = formatNumber(quantity.total);
  const valueFormatted = formatNumber(quantity.valor);
  const numeroFormatted = formatNumber(quantity.numero);

  if (totalFormatted && quantity.unidade) {
    parts.push(`${totalFormatted} ${quantity.unidade}`);
  } else if (valueFormatted && quantity.unidade) {
    parts.push(`${valueFormatted} ${quantity.unidade}`);
  }

  if (quantity.tipo) {
    parts.push(quantity.tipo);
  }

  if (numeroFormatted) {
    parts.push(`x${numeroFormatted}`);
  }

  return parts.length ? parts.join(' · ') : '—';
}

function formatFlags(flags) {
  if (!flags || !flags.length) {
    return '—';
  }
  return flags.join(', ');
}

function sanitizeUnits(units) {
  const payload = {};
  UNIT_TYPES.forEach(({ key }) => {
    const raw = units?.[key];
    const value = typeof raw === 'string' ? raw.trim() : raw;
    if (value) {
      payload[key] = value;
    }
  });
  return payload;
}

function ensureClusterState(cluster) {
  const existing = clusterStates.get(cluster.id);
  const suggested = {};
  UNIT_TYPES.forEach(({ key }) => {
    suggested[key] = cluster.suggested_units?.[key] || null;
  });

  if (existing) {
    const merged = {};
    UNIT_TYPES.forEach(({ key }) => {
      const options = cluster.unit_options?.[key] || [];
      let value = existing.units?.[key];
      if (value && options.length && !options.includes(value)) {
        value = suggested[key] || null;
      }
      merged[key] = value ?? suggested[key] ?? null;
    });
    existing.units = merged;
    existing.cluster = cluster;
    return existing;
  }

  const state = {
    units: suggested,
    warnings: [],
    cluster,
  };
  clusterStates.set(cluster.id, state);
  return state;
}

function updateClusterWarnings(state, clusterData, warningBox, prohibitions, wrapper) {
  const tokens = new Set();
  clusterData.members
    .filter(member => member.selected)
    .forEach(member => {
      (member.blocking_tokens || []).forEach(token => tokens.add(token));
    });

  const matches = [];
  (prohibitions || []).forEach(rule => {
    if (rule.every(token => tokens.has(token))) {
      matches.push(rule.join(' + '));
    }
  });

  state.warnings = matches;

  if (matches.length) {
    warningBox.innerHTML = `<strong>Regras de bloqueio:</strong> ${matches.join(', ')}`;
    warningBox.style.display = 'block';
    wrapper.classList.add('has-warning');
  } else {
    warningBox.innerHTML = '';
    warningBox.style.display = 'none';
    wrapper.classList.remove('has-warning');
  }
}

async function runLearning() {
  const scope = getCurrentScope();
  const fpath = document.getElementById('learn-path').value;
  const output = document.getElementById('learn-log');
  output.textContent = 'A executar...';
  try {
    const result = await window.pywebview.api.learning_import(fpath, scope);
    output.textContent = stringifyResult(result);
    if (!result || result.ok !== false) {
      notifyDashboardRefresh('learning-run');
    }
  } catch (e) {
    output.textContent = 'Erro: ' + e;
  }
}

async function forgetLearning() {
  const scope = getCurrentScope();
  const confirmed = window.confirm(
    `Isto vai apagar todos os registos de aprendizagem no scope "${scope}". Continuar?`
  );
  if (!confirmed) {
    return;
  }

  const output = document.getElementById('learn-log');
  const button = document.getElementById('btn-forget-learning');
  output.textContent = 'A limpar aprendizagem...';
  if (button) {
    button.disabled = true;
  }
  try {
    const result = await window.pywebview.api.forget_learning(scope);
    output.textContent = stringifyResult(result);
    if (!result || result.ok !== false) {
      notifyDashboardRefresh('forget-learning');
    }
  } catch (e) {
    output.textContent = 'Erro: ' + e;
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

async function chooseFileForInput(targetId, purpose) {
  const input = document.getElementById(targetId);
  if (!input) {
    return;
  }

  const filters = purpose === 'excel'
    ? [{ description: 'Ficheiros Excel', extensions: ['*.xlsx', '*.xls'] }]
    : [];

  try {
    const response = await window.pywebview.api.choose_file({ filters });
    if (!response || !response.ok || response.canceled || !response.path) {
      return;
    }
    input.value = response.path;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (err) {
    window.alert('Erro ao abrir o seletor de ficheiros: ' + err);
  }
}

async function importCardex() {
  const batchInput = document.getElementById('batch-id');
  const pathInput = document.getElementById('cardex-path');
  const output = document.getElementById('import-log');
  const batchId = (batchInput.value || '').trim();
  const filePath = pathInput.value;

  if (!batchId) {
    output.textContent = 'Indica um batch id.';
    return;
  }

  output.textContent = 'A importar...';
  try {
    const result = await window.pywebview.api.import_cardex(filePath, batchId);
    output.textContent = stringifyResult(result);
    if (!result || result.ok !== false) {
      notifyDashboardRefresh('import-cardex');
    }
    await loadClusters();
  } catch (e) {
    output.textContent = 'Erro: ' + e;
  }
}

async function runClustering() {
  const batchId = (document.getElementById('batch-id').value || '').trim();
  const scope = getCurrentScope();
  const t1 = parseFloat(document.getElementById('threshold-1').value) || 0.85;
  const t2 = parseFloat(document.getElementById('threshold-2').value) || 0.92;
  const output = document.getElementById('cluster-log');

  if (!batchId) {
    output.textContent = 'Indica um batch id.';
    return;
  }

  output.textContent = 'A clusterizar...';
  try {
    const result = await window.pywebview.api.run_clustering(batchId, scope, t1, t2);
    output.textContent = stringifyResult(result);
    if (!result || result.ok !== false) {
      notifyDashboardRefresh('run-clustering');
    }
    await loadClusters();
  } catch (e) {
    output.textContent = 'Erro: ' + e;
  }
}

function renderClusters(items, prohibitions) {
  const container = document.getElementById('clusters-area');
  container.innerHTML = '';

  if (!items || !items.length) {
    clusterStates.clear();
    container.innerHTML = '<p class="empty">Sem clusters gerados ainda.</p>';
    return;
  }

  const activeIds = new Set(items.map(cluster => cluster.id));
  Array.from(clusterStates.keys()).forEach(id => {
    if (!activeIds.has(id)) {
      clusterStates.delete(id);
    }
  });

  items.forEach(rawCluster => {
    const clusterData = {
      ...rawCluster,
      members: (rawCluster.members || []).map(member => ({
        ...member,
        flags: member.flags || [],
        blocking_tokens: member.blocking_tokens || [],
      })),
    };

    clusterData.members.sort((a, b) => b.score - a.score);

    const state = ensureClusterState(clusterData);
    state.cluster = clusterData;

    const wrapper = document.createElement('article');
    wrapper.className = 'cluster-card';

    const header = document.createElement('header');
    header.className = 'cluster-head';
    header.innerHTML = `<h3>Cluster #${clusterData.id}</h3><span>${clusterData.label}</span>`;
    wrapper.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'member-list';

    clusterData.members.forEach(member => {
      const li = document.createElement('li');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = member.selected;

      cb.addEventListener('change', async () => {
        const desired = cb.checked;
        cb.disabled = true;
        try {
          const result = await window.pywebview.api.select_member(clusterData.id, member.id, desired);
          if (!result.ok) {
            cb.checked = !desired;
            window.alert('Erro ao atualizar membro: ' + (result.error || 'desconhecido'));
            return;
          }
          member.selected = desired;
          updateClusterWarnings(state, clusterData, warningBox, prohibitions, wrapper);
        } catch (err) {
          cb.checked = !desired;
          window.alert('Erro ao atualizar membro: ' + err);
        } finally {
          cb.disabled = false;
        }
      });

      const label = document.createElement('div');
      label.className = 'member-label';

      const title = document.createElement('strong');
      title.textContent = member.nome;
      label.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'member-meta';

      const confidence = describeConfidence(member.score || 0);
      const confidenceSpan = document.createElement('span');
      confidenceSpan.className = `confidence-badge ${confidence.className}`;
      confidenceSpan.textContent = `${confidence.label} ${(member.score || 0).toFixed(3)}`;
      meta.appendChild(confidenceSpan);

      const qtySpan = document.createElement('span');
      qtySpan.textContent = `Quantidade: ${formatQuantity(member.quantidade)}`;
      meta.appendChild(qtySpan);

      const flagsSpan = document.createElement('span');
      flagsSpan.textContent = `Flags: ${formatFlags(member.flags)}`;
      meta.appendChild(flagsSpan);

      const brandSpan = document.createElement('span');
      brandSpan.textContent = `Marca: ${member.marca || '—'}`;
      meta.appendChild(brandSpan);

      label.appendChild(meta);

      li.appendChild(cb);
      li.appendChild(label);
      list.appendChild(li);
    });

    wrapper.appendChild(list);

    const unitSection = document.createElement('div');
    unitSection.className = 'unit-section';

    const unitTitle = document.createElement('div');
    unitTitle.className = 'unit-title';
    unitTitle.textContent = 'Unidades herdadas';
    unitSection.appendChild(unitTitle);

    const unitGrid = document.createElement('div');
    unitGrid.className = 'unit-grid';

    UNIT_TYPES.forEach(type => {
      const row = document.createElement('label');
      row.className = 'unit-row';

      const caption = document.createElement('span');
      caption.textContent = type.label;
      row.appendChild(caption);

      const select = document.createElement('select');
      select.className = 'unit-select';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Sugestão automática';
      select.appendChild(placeholder);

      const options = clusterData.unit_options?.[type.key] || [];
      options.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      const currentValue = state.units?.[type.key] || null;
      if (currentValue && !options.includes(currentValue)) {
        const option = document.createElement('option');
        option.value = currentValue;
        option.textContent = currentValue;
        select.appendChild(option);
      }

      select.value = currentValue || '';

      select.addEventListener('change', () => {
        state.units[type.key] = select.value || null;
      });

      row.appendChild(select);
      unitGrid.appendChild(row);
    });

    unitSection.appendChild(unitGrid);
    wrapper.appendChild(unitSection);

    const warningBox = document.createElement('div');
    warningBox.className = 'warning-box';
    warningBox.style.display = 'none';
    wrapper.appendChild(warningBox);

    const footer = document.createElement('div');
    footer.className = 'cluster-actions';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'secondary';
    selectAllBtn.textContent = 'Selecionar todos';
    selectAllBtn.addEventListener('click', async () => {
      selectAllBtn.disabled = true;
      try {
        const result = await window.pywebview.api.set_cluster_selection(clusterData.id, true);
        if (!result.ok) {
          window.alert('Erro ao selecionar: ' + (result.error || 'desconhecido'));
        } else {
          await loadClusters();
        }
      } catch (err) {
        window.alert('Erro ao selecionar: ' + err);
      } finally {
        selectAllBtn.disabled = false;
      }
    });
    footer.appendChild(selectAllBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'secondary';
    clearBtn.textContent = 'Limpar';
    clearBtn.addEventListener('click', async () => {
      clearBtn.disabled = true;
      try {
        const result = await window.pywebview.api.set_cluster_selection(clusterData.id, false);
        if (!result.ok) {
          window.alert('Erro ao limpar: ' + (result.error || 'desconhecido'));
        } else {
          await loadClusters();
        }
      } catch (err) {
        window.alert('Erro ao limpar: ' + err);
      } finally {
        clearBtn.disabled = false;
      }
    });
    footer.appendChild(clearBtn);

    const splitBtn = document.createElement('button');
    splitBtn.className = 'danger';
    splitBtn.textContent = 'Dividir cluster';
    splitBtn.addEventListener('click', async () => {
      const selectedIds = clusterData.members.filter(member => member.selected).map(member => member.id);
      if (selectedIds.length === 0) {
        window.alert('Seleciona pelo menos um membro para dividir.');
        return;
      }
      if (selectedIds.length === clusterData.members.length) {
        window.alert('Não é possível dividir usando todos os membros.');
        return;
      }

      splitBtn.disabled = true;
      try {
        const result = await window.pywebview.api.split_cluster(clusterData.id, selectedIds);
        if (!result.ok) {
          window.alert('Erro ao dividir: ' + (result.error || 'desconhecido'));
        } else {
          window.alert('Cluster dividido. Novo cluster #' + result.new_cluster_id);
          await loadClusters();
        }
      } catch (err) {
        window.alert('Erro ao dividir: ' + err);
      } finally {
        splitBtn.disabled = false;
      }
    });
    footer.appendChild(splitBtn);

    const approveBtn = document.createElement('button');
    approveBtn.textContent = 'Aprovar cluster';
    approveBtn.addEventListener('click', async () => {
      const scope = getCurrentScope();
      const unitsPayload = sanitizeUnits(state.units);
      if (state.warnings.length) {
        const proceed = window.confirm(
          'Existem regras de bloqueio violadas: ' + state.warnings.join(', ') + '. Continuar mesmo assim?'
        );
        if (!proceed) {
          return;
        }
      }

      approveBtn.disabled = true;
      try {
        const result = await window.pywebview.api.approve_cluster(clusterData.id, scope, unitsPayload);
        if (!result.ok) {
          window.alert('Erro ao aprovar: ' + (result.error || 'desconhecido'));
        } else {
          window.alert('Cluster aprovado! ID canónico: ' + result.canonical_id);
          await loadClusters();
        }
      } catch (err) {
        window.alert('Erro ao aprovar: ' + err);
      } finally {
        approveBtn.disabled = false;
      }
    });
    footer.appendChild(approveBtn);

    wrapper.appendChild(footer);
    container.appendChild(wrapper);

    updateClusterWarnings(state, clusterData, warningBox, prohibitions, wrapper);
  });
}

async function loadClusters() {
  const batchId = (document.getElementById('batch-id').value || '').trim();
  if (!batchId) {
    return;
  }
  const scope = getCurrentScope();
  const container = document.getElementById('clusters-area');
  container.innerHTML = '<p class="loading">A carregar clusters...</p>';
  try {
    const response = await window.pywebview.api.list_clusters(batchId, scope);
    if (!response.ok) {
      container.innerHTML = `<p class="error">${response.error}</p>`;
      return;
    }
    renderClusters(response.items || [], response.prohibitions || []);
  } catch (e) {
    container.innerHTML = `<p class="error">Erro: ${e}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-learn').addEventListener('click', runLearning);
  document.getElementById('btn-forget-learning').addEventListener('click', forgetLearning);
  document.getElementById('btn-import').addEventListener('click', importCardex);
  document.getElementById('btn-cluster').addEventListener('click', runClustering);
  document.getElementById('btn-refresh-clusters').addEventListener('click', loadClusters);

  document.querySelectorAll('[data-file-target]').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-file-target');
      const purpose = button.getAttribute('data-file-type') || 'any';
      chooseFileForInput(targetId, purpose);
    });
  });

  const scopeInput = document.getElementById('scope');
  const emitScope = () => notifyDashboardScope(getCurrentScope());
  if (scopeInput) {
    ['change', 'blur'].forEach(evt => scopeInput.addEventListener(evt, emitScope));
    scopeInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        emitScope();
      }
    });
    emitScope();
  } else {
    emitScope();
  }

  setTimeout(() => {
    notifyDashboardRefresh('initial-load');
  }, 300);
});
