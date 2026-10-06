/* ==========================================================
   BorB · Validação e comportamento dos formulários
   JavaScript puro (RP01), sem frameworks.
   Atenção: validar no front é só conforto para o usuário.
   O back-end precisa repetir TODAS estas regras (RNF04).
   ========================================================== */

(function () {
  "use strict";

  /* ---------- CPF ---------- */

  function somenteDigitos(valor) {
    return valor.replace(/\D/g, "");
  }

  function mascararCPF(valor) {
    const d = somenteDigitos(valor).slice(0, 11);
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  // Confere os dois dígitos verificadores do CPF
  function cpfValido(valor) {
    const cpf = somenteDigitos(valor);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    for (let t = 9; t < 11; t++) {
      let soma = 0;
      for (let i = 0; i < t; i++) {
        soma += Number(cpf[i]) * (t + 1 - i);
      }
      const digito = ((soma * 10) % 11) % 10;
      if (digito !== Number(cpf[t])) return false;
    }
    return true;
  }

  document.querySelectorAll("[data-cpf]").forEach(function (input) {
    input.addEventListener("input", function () {
      input.value = mascararCPF(input.value);
    });
  });

  /* ---------- Mostrar / ocultar senha ---------- */

  document.querySelectorAll(".btn-olho").forEach(function (botao) {
    botao.addEventListener("click", function () {
      const input = document.getElementById(botao.getAttribute("aria-controls"));
      const mostrar = input.type === "password";
      input.type = mostrar ? "text" : "password";
      botao.setAttribute("aria-pressed", String(mostrar));
      botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
      input.focus();
    });
  });

  /* ---------- Regras de validação ---------- */

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validarCampo(input, form) {
    const valor = input.type === "checkbox" ? input.checked : input.value.trim();

    if (input.type === "checkbox") {
      if (input.required && !valor) return input.dataset.msgObrigatorio || "Campo obrigatório.";
      return "";
    }

    if (input.required && !valor) return "Preencha este campo.";
    if (!valor) return "";

    if (input.hasAttribute("data-cpf") && !cpfValido(valor)) {
      return "CPF inválido.";
    }

    if (input.type === "email" && !EMAIL_REGEX.test(valor)) {
      return "Informe um e-mail válido.";
    }

    if (input.dataset.nomeCompleto !== undefined && valor.split(/\s+/).length < 2) {
      return "Informe nome e sobrenome.";
    }

    const minimo = Number(input.dataset.min || 0);
    if (minimo && input.value.length < minimo) {
      return "Use pelo menos " + minimo + " caracteres.";
    }

    if (input.dataset.senhaForte !== undefined &&
        !(/[A-Za-z]/.test(input.value) && /\d/.test(input.value))) {
      return "A senha precisa ter letras e números.";
    }

    if (input.dataset.igual) {
      const outro = form.querySelector("#" + input.dataset.igual);
      if (outro && outro.value !== input.value) return "As senhas não conferem.";
    }

    return "";
  }

  function mostrarErro(input, mensagem) {
    const caixaErro = document.getElementById(input.id + "-erro");
    if (caixaErro) caixaErro.textContent = mensagem;
    input.setAttribute("aria-invalid", mensagem ? "true" : "false");
  }

  /* ---------- Envio ---------- */

  // Monta o objeto enviado ao back-end. CPF vai sem máscara.
  function coletarDados(form) {
    const dados = {};
    form.querySelectorAll("input[name]").forEach(function (input) {
      if (input.dataset.naoEnviar !== undefined) return;
      if (input.type === "checkbox") dados[input.name] = input.checked;
      else if (input.hasAttribute("data-cpf")) dados[input.name] = somenteDigitos(input.value);
      else dados[input.name] = input.value.trim();
    });
    return dados;
  }

  function avisar(form, texto, tipo) {
    const aviso = form.querySelector(".aviso");
    if (!aviso) return;
    aviso.className = "aviso aviso--" + tipo;
    aviso.textContent = texto;
  }

  async function enviar(form, dados) {
    const endpoint = form.dataset.endpoint;

    // TODO: integrar com o back-end (Express) quando as rotas estiverem prontas.
    // Exemplo:
    // const resposta = await fetch(endpoint, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(dados),
    // });
    // if (!resposta.ok) throw new Error((await resposta.json()).mensagem);
    console.info("[BorB] POST", endpoint, dados);

    if (form.dataset.sucesso) {
      avisar(form, form.dataset.sucesso, "sucesso");
    }
  }

  document.querySelectorAll("form[data-validar]").forEach(function (form) {
    const campos = Array.from(form.querySelectorAll("input[name]"));

    // Valida ao sair do campo e limpa o erro enquanto a pessoa corrige
    campos.forEach(function (input) {
      input.addEventListener("blur", function () {
        if (input.value || input.getAttribute("aria-invalid") === "true") {
          mostrarErro(input, validarCampo(input, form));
        }
      });
      input.addEventListener(input.type === "checkbox" ? "change" : "input", function () {
        if (input.getAttribute("aria-invalid") === "true") {
          mostrarErro(input, validarCampo(input, form));
        }
      });
    });

    form.addEventListener("submit", async function (evento) {
      evento.preventDefault();
      avisar(form, "", "sucesso");

      let primeiroInvalido = null;
      campos.forEach(function (input) {
        const erro = validarCampo(input, form);
        mostrarErro(input, erro);
        if (erro && !primeiroInvalido) primeiroInvalido = input;
      });

      if (primeiroInvalido) {
        primeiroInvalido.focus();
        return;
      }

      const botao = form.querySelector("button[type='submit']");
      botao.disabled = true;
      try {
        await enviar(form, coletarDados(form));
      } catch (erro) {
        avisar(form, erro.message || "Não foi possível concluir. Tente novamente.", "erro");
      } finally {
        botao.disabled = false;
      }
    });
  });
})();
