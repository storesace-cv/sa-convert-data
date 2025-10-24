async function readSot() {
  try {
    const res = await window.pywebview.api.read_sot();
    document.getElementById('status').textContent = JSON.stringify(res, null, 2);
  } catch (e) {
    document.getElementById('status').textContent = "Erro: " + e;
  }
}

async function runLearning() {
  const scope = document.getElementById('scope').value || 'global';
  const fpath = document.getElementById('learn-path').value;
  document.getElementById('learn-log').textContent = "A executar...";

  try {
    const result = await window.pywebview.api.learning_import(fpath, scope);
    document.getElementById('learn-log').textContent = JSON.stringify(result, null, 2);
  } catch (e) {
    document.getElementById('learn-log').textContent = "Erro: " + e;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-status').addEventListener('click', readSot);
  document.getElementById('btn-learn').addEventListener('click', runLearning);
});
