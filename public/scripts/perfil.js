// Dados do usuário vêm do sessionStorage (preenchido em loginUsuario.js)
const dado = (chave, padrao) => sessionStorage.getItem(chave) || padrao;

const nome = dado('NOME_USUARIO', 'Nome do Usuário');
const email = dado('EMAIL_USUARIO', 'usuario@streamco.com.br');
const cargo = dado('CARGO', 'Gerente');
const empresa = dado('NOME_EMPRESA', 'StreamCo Brasil');

const partes = nome.trim().split(/\s+/);
const iniciais = (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();

const preencher = (seletor, texto) =>
  document.querySelectorAll(seletor).forEach(el => (el.textContent = texto));

preencher('[data-nome]', nome);
preencher('[data-email]', email);
preencher('[data-cargo]', cargo);
preencher('[data-cargo-up]', cargo.toUpperCase());
preencher('[data-empresa]', empresa);
preencher('[data-iniciais]', iniciais);
document.getElementById('envEmpresa').textContent = empresa;
document.getElementById('inNome').value = nome;
document.getElementById('inEmail').value = email;
document.getElementById('inCargo').value = cargo;

// Último acesso: hora atual da sessão
const agora = new Date();
document.getElementById('ultimoAcesso').textContent =
  'Hoje, ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Menu lateral
const menuBtn = document.getElementById('menuBtn');
const alternarMenu = (aberto) => {
  document.body.classList.toggle('nav-open', aberto);
  menuBtn.setAttribute('aria-expanded', String(aberto));
};
menuBtn.addEventListener('click', () => alternarMenu(!document.body.classList.contains('nav-open')));
document.getElementById('overlay').addEventListener('click', () => alternarMenu(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') alternarMenu(false); });
window.matchMedia('(min-width: 1101px)').addEventListener('change', () => alternarMenu(false));

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

  // TODO: enviar ao backend (ainda não existe rota de atualização de perfil/senha)
  pwAtual.value = pwNova.value = pwConf.value = '';
  avisar('Alterações salvas.', 'ok');
});

// Sair
document.getElementById('sair').addEventListener('click', () => {
  sessionStorage.clear();
  window.location.href = 'login.html';
});
