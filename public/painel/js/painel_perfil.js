const dado = (chave, padrao) => {
  const valor = sessionStorage.getItem(chave);
  return valor && valor.trim() && !/^(null|undefined|nan)$/i.test(valor.trim()) ? valor : padrao;
};

const nome = SG.usuario.nome;
const email = dado('EMAIL_USUARIO', 'E-mail não informado');
const cargo = SG.usuario.cargo;
const empresa = SG.usuario.empresa;

const partes = nome.trim().split(/\s+/).filter(Boolean);
const iniciais = partes.length ? (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() : '—';

const preencher = (seletor, texto) =>
  document.querySelectorAll(seletor).forEach(el => (el.textContent = texto));

preencher('[data-nome]', nome);
preencher('[data-email]', email);
preencher('[data-cargo]', cargo);
preencher('[data-nivel]', SG.nomePerfil);
preencher('[data-nivel-up]', SG.nomePerfil.toUpperCase());
preencher('[data-empresa]', empresa);
preencher('[data-iniciais]', iniciais);
document.getElementById('inNome').value = dado('NOME_USUARIO', '');
document.getElementById('inEmail').value = dado('EMAIL_USUARIO', '');
document.getElementById('inCargo').value = dado('CARGO', '');

// Último acesso: hora atual da sessão
const agora = new Date();
document.getElementById('ultimoAcesso').textContent =
  'Hoje, ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });


// Mostrar/ocultar senha
document.querySelectorAll('.eye').forEach(botao => {
  botao.addEventListener('click', () => {
    const campo = botao.previousElementSibling;
    const mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    botao.querySelector('use').setAttribute('href', mostrar ? '#i-eye-off' : '#i-eye');
    botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  });
});

// Toast -- notificação após salvar alterações
const toast = document.getElementById('toast');
let timer;
function avisar(msg, tipo) {
  toast.textContent = msg;
  toast.className = 'toast show ' + tipo;
  clearTimeout(timer);
  timer = setTimeout(() => (toast.className = 'toast'), 3500);
}

// Salvar
const pwAtual = document.getElementById('pwAtual');
const pwNova = document.getElementById('pwNova');
const pwConf = document.getElementById('pwConf');

document.getElementById('formPerfil').addEventListener('submit', (e) => {
  e.preventDefault();
  [pwAtual, pwNova, pwConf].forEach(c => c.removeAttribute('aria-invalid'));

  const trocandoSenha = pwAtual.value || pwNova.value || pwConf.value;
  if (trocandoSenha) {
    let erro = null;
    if (!pwAtual.value) { erro = 'Informe a senha atual.'; pwAtual.setAttribute('aria-invalid', 'true'); }
    else if (pwNova.value.length < 8) { erro = 'A nova senha precisa ter no mínimo 8 caracteres.'; pwNova.setAttribute('aria-invalid', 'true'); }
    else if (pwNova.value !== pwConf.value) { erro = 'A confirmação não é igual à nova senha.'; pwConf.setAttribute('aria-invalid', 'true'); }
    if (erro) return avisar(erro, 'err');
  }

  avisar('Edição de perfil, senha e notificações ainda não implementada. Nenhuma alteração foi salva.', 'err');
});

// Sair
document.getElementById('sair').addEventListener('click', async (evento) => {
  const botao = evento.currentTarget;
  if (botao.disabled) return;
  botao.disabled = true;
  try {
    const resposta = await fetch('/usuarios/sair', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!resposta.ok) throw new Error('Falha ao encerrar a sessão.');
    sessionStorage.clear();
    window.location.href = '../login/login.html';
  } catch (erro) {
    avisar('Não foi possível sair. Verifique sua conexão e tente novamente.', 'err');
  } finally {
    botao.disabled = false;
  }
});
