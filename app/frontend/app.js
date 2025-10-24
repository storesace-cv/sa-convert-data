function stringifyResult(result) {
  return JSON.stringify(result, null, 2);
}

async function readSot() {
  const output = document.getElementById('status');
  output.textContent = 'A carregar...';
  try {
    const res = await window.pywebview.api.read_sot();
    output.textContent = stringifyResult(res);
  } catch (e) {
    output.textContent = 'Erro: ' + e;
  }
}

async function runLearning() {
  const scope = document.getElementById('scope').value || 'global';
  const fpath = document.getElementById('learn-path').value;
  const output = document.getElementById('learn-log');
  output.textContent = 'A executar...';
  try {
    const result = await window.pywebview.api.learning_import(fpath, scope);
    output.textContent = stringifyResult(result);
  } catch (e) {
    output.textContent = 'Erro: ' + e;
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
    await loadClusters();
  } catch (e) {
    output.textContent = 'Erro: ' + e;
  }
}

async function runClustering() {
  const batchId = (document.getElementById('batch-id').value || '').trim();
  const t1 = parseFloat(document.getElementById('threshold-1').value) || 0.85;
  const t2 = parseFloat(document.getElementById('threshold-2').value) || 0.92;
  const output = document.getElementById('cluster-log');

  if (!batchId) {
    output.textContent = 'Indica um batch id.';
    return;
  }

  output.textContent = 'A clusterizar...';
  try {
    const result = await window.pywebview.api.run_clustering(batchId, t1, t2);
    output.textContent = stringifyResult(result);
    await loadClusters();
  } catch (e) {
    output.textContent = 'Erro: ' + e;
  }
}

function renderClusters(items) {
  const container = document.getElementById('clusters-area');
  container.innerHTML = '';

  if (!items || !items.length) {
    container.innerHTML = '<p class="empty">Sem clusters gerados ainda.</p>';
    return;
  }

  items.forEach(cluster => {
    const wrapper = document.createElement('article');
    wrapper.className = 'cluster-card';

    const header = document.createElement('header');
    header.className = 'cluster-head';
    header.innerHTML = `<h3>Cluster #${cluster.id}</h3><span>${cluster.label}</span>`;
    wrapper.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'member-list';

    cluster.members
      .sort((a, b) => b.score - a.score)
      .forEach(member => {
        const li = document.createElement('li');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = member.selected;
        cb.addEventListener('change', async () => {
          cb.disabled = true;
          try {
            const result = await window.pywebview.api.select_member(cluster.id, member.id, cb.checked);
            if (!result.ok) {
              cb.checked = !cb.checked;
              window.alert('Erro ao atualizar membro: ' + (result.error || 'desconhecido'));
            }
          } catch (err) {
            cb.checked = !cb.checked;
            window.alert('Erro ao atualizar membro: ' + err);
          } finally {
            cb.disabled = false;
          }
        });

        const label = document.createElement('div');
        label.className = 'member-label';
        label.innerHTML = `<strong>${member.nome}</strong><small>Score: ${(member.score).toFixed(3)}</small>`;

        li.appendChild(cb);
        li.appendChild(label);
        list.appendChild(li);
      });

    const footer = document.createElement('div');
    footer.className = 'cluster-actions';
    const approveBtn = document.createElement('button');
    approveBtn.textContent = 'Aprovar cluster';
    approveBtn.addEventListener('click', async () => {
      approveBtn.disabled = true;
      try {
        const result = await window.pywebview.api.approve_cluster(cluster.id);
        if (!result.ok) {
          window.alert('Erro ao aprovar: ' + (result.error || 'desconhecido'));
        } else {
          window.alert('Cluster aprovado! ID canónico: ' + result.canonical_id);
        }
      } catch (err) {
        window.alert('Erro ao aprovar: ' + err);
      } finally {
        approveBtn.disabled = false;
      }
    });

    footer.appendChild(approveBtn);
    wrapper.appendChild(list);
    wrapper.appendChild(footer);
    container.appendChild(wrapper);
  });
}

async function loadClusters() {
  const batchId = (document.getElementById('batch-id').value || '').trim();
  if (!batchId) {
    return;
  }
  const container = document.getElementById('clusters-area');
  container.innerHTML = '<p class="loading">A carregar clusters...</p>';
  try {
    const response = await window.pywebview.api.list_clusters(batchId);
    if (!response.ok) {
      container.innerHTML = `<p class="error">${response.error}</p>`;
      return;
    }
    renderClusters(response.items);
  } catch (e) {
    container.innerHTML = `<p class="error">Erro: ${e}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-status').addEventListener('click', readSot);
  document.getElementById('btn-learn').addEventListener('click', runLearning);
  document.getElementById('btn-import').addEventListener('click', importCardex);
  document.getElementById('btn-cluster').addEventListener('click', runClustering);
  document.getElementById('btn-refresh-clusters').addEventListener('click', loadClusters);
});
