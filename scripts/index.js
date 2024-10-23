class PrivacyProtectorScanner {
  constructor() {
    this.score = 100;
    this.deductions = {
      thirdParty: 0,
      hijacking: 0,
      storage: 0,
      fingerprint: 0,
      cookies: 0,
      cookieAmount: 0
    };
    this.thirdPartyDomains = [];
    this.hijackingDetected = false;
    this.localStorageDetected = false;
    this.canvasFingerprintDetected = false;
    this.cookieDetected = false;
    this.firstPartyCookies = 0;
    this.thirdPartyCookies = 0;
    this.localStorageItems = []; // Para armazenar detalhes do localStorage
    this.canvasFingerprintAttempts = []; // Para armazenar detalhes do fingerprinting
    this.cookies = []; // Para armazenar detalhes dos cookies

    // Bind the message handler
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  handleMessage(request, sender, sendResponse) {
    console.log("Mensagem recebida em PrivacyProtectorScanner:", request.msg);

    if (request.msg === "start scan") {
      // Resetar variáveis para cada varredura
      this.resetScan();

      // Executar todas as verificações
      this.thirdPartyCheck();
      this.hijackingCheck();
      this.localStorageCheck();
      this.canvasFingerprintCheck();
      this.cookieCheck();

      // Executar uma operação de canvas para forçar a detecção de fingerprinting
      this.performCanvasOperation();

      // Após todas as verificações, enviar o resultado
      setTimeout(() => {
        this.sendScanResult();
        sendResponse({ status: "completed" });
      }, 3000);

      // Retornar true para indicar resposta assíncrona
      return true;
    }
  }

  resetScan() {
    this.score = 100;
    this.deductions = {
      thirdParty: 0,
      hijacking: 0,
      storage: 0,
      fingerprint: 0,
      cookies: 0,
      cookieAmount: 0
    };
    this.thirdPartyDomains = [];
    this.hijackingDetected = false;
    this.localStorageDetected = false;
    this.canvasFingerprintDetected = false;
    this.cookieDetected = false;
    this.firstPartyCookies = 0;
    this.thirdPartyCookies = 0;
    this.localStorageItems = [];
    this.canvasFingerprintAttempts = [];
    this.cookies = [];
  }

  thirdPartyCheck() {
    const requests = performance.getEntriesByType('resource');
    requests.forEach((request) => {
      try {
        const url = new URL(request.name);
        if (url.hostname !== window.location.hostname) {
          if (!this.thirdPartyDomains.includes(url.hostname)) {
            this.thirdPartyDomains.push(url.hostname);
          }
        }
      } catch (e) {
        console.warn(`URL inválida encontrada: ${request.name}`);
      }
    });

    if (this.thirdPartyDomains.length > 0) {
      this.deductions.thirdParty = 15; // Atualizado para 15 pontos
      this.score -= this.deductions.thirdParty;
    }
    console.log("Domínios de terceiros detectados:", this.thirdPartyDomains);
  }

  hijackingCheck() {
    if (window.top !== window.self) {
      this.hijackingDetected = true;
      this.deductions.hijacking = 20; // Atualizado para 20 pontos
      this.score -= this.deductions.hijacking;
    }
    console.log("Ameaças de sequestro detectadas:", this.hijackingDetected);
  }

  localStorageCheck() {
    if (localStorage.length > 0) {
      this.localStorageDetected = true;
      this.deductions.storage = 15; // Atualizado para 15 pontos
      this.score -= this.deductions.storage;

      // Coletar detalhes do localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        this.localStorageItems.push({ key, value });
      }
    }
    console.log("Armazenamento local detectado:", this.localStorageDetected);
    console.log("Itens no Local Storage:", this.localStorageItems);
  }

  canvasFingerprintCheck() {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;

    const self = this;

    HTMLCanvasElement.prototype.toDataURL = function () {
      if (!self.canvasFingerprintDetected) {
        self.canvasFingerprintDetected = true;
        self.deductions.fingerprint = 10; // Atualizado para 10 pontos
        self.score -= self.deductions.fingerprint;
        console.log("Canvas fingerprinting detectado via toDataURL.");
      }
      self.canvasFingerprintAttempts.push('toDataURL');
      return originalToDataURL.apply(this, arguments);
    };

    HTMLCanvasElement.prototype.toBlob = function () {
      if (!self.canvasFingerprintDetected) {
        self.canvasFingerprintDetected = true;
        self.deductions.fingerprint = 10; // Atualizado para 10 pontos
        self.score -= self.deductions.fingerprint;
        console.log("Canvas fingerprinting detectado via toBlob.");
      }
      self.canvasFingerprintAttempts.push('toBlob');
      return originalToBlob.apply(this, arguments);
    };
  }

  performCanvasOperation() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.fillText('Test', 10, 50);
      canvas.toDataURL(); // Isto deve disparar a detecção de fingerprinting
      console.log("Operação de canvas executada para detecção de fingerprinting.");
    } catch (error) {
      console.error("Erro ao executar operação de canvas:", error);
    }
  }

  cookieCheck() {
    const allCookies = document.cookie.split(';');

    allCookies.forEach((cookie) => {
      const cookieTrimmed = cookie.trim();
      if (cookieTrimmed) {
        const [name, value] = cookieTrimmed.split('=');
        const domain = this.getCookieDomain(name);
        this.cookies.push({ name, value, domain });
        if (domain === window.location.hostname) {
          this.firstPartyCookies++;
        } else {
          this.thirdPartyCookies++;
        }
      }
    });

    if (this.thirdPartyCookies > 0) {
      this.cookieDetected = true;
      this.deductions.cookies = 15; // Atualizado para 15 pontos
      this.score -= this.deductions.cookies;
    }
    console.log("Cookies de primeira parte:", this.firstPartyCookies, "Cookies de terceiros:", this.thirdPartyCookies);
    console.log("Detalhes dos cookies:", this.cookies);

    // Dedução adicional se a quantidade de cookies de terceiros for alta
    // Exemplo: Se houver mais de 5 cookies de terceiros, deduzir pontos extras
    if (this.thirdPartyCookies > 5) {
      const extraDeduction = (this.thirdPartyCookies - 5) * 2; // 2 pontos por cookie acima de 5
      this.deductions.cookies += extraDeduction;
      this.score -= extraDeduction;
      console.log(`Dedução extra por excesso de cookies de terceiros: ${extraDeduction} pontos`);
    }

    // Dedução para a quantidade total de cookies
    this.deductions.cookieAmount = 0;
    if (this.firstPartyCookies + this.thirdPartyCookies > 10) {
      this.deductions.cookieAmount = 10; // Atualizado para 10 pontos
      this.score -= this.deductions.cookieAmount;
      console.log(`Dedução por quantidade total de cookies: ${this.deductions.cookieAmount} pontos`);
    }
  }

  getCookieDomain(cookieName) {
    // JavaScript não permite obter diretamente o domínio de um cookie específico.
    // Retornaremos 'Desconhecido' para todos os cookies.
    return 'Desconhecido';
  }

  sendScanResult() {
    chrome.runtime.sendMessage({
      type: "scanResult",
      score: this.score,
      deductions: this.deductions,
      thirdPartyDomains: this.thirdPartyDomains.length > 0 ? this.thirdPartyDomains.join(', ') : 'Nenhum domínio de terceiros detectado',
      hijackingDetected: this.hijackingDetected ? 'Ameaça de sequestro detectada' : 'Nenhuma ameaça de sequestro detectada',
      localStorageDetected: this.localStorageDetected ? 'Armazenamento local detectado' : 'Nenhum armazenamento local detectado',
      canvasFingerprintDetected: this.canvasFingerprintDetected ? 'Canvas fingerprinting detectado' : 'Nenhum canvas fingerprinting detectado',
      cookieStatus: this.cookieDetected ? 'Cookies de terceiros detectados' : 'Nenhum cookie de terceiros detectado',
      cookieAmount: `Cookies de primeira parte: ${this.firstPartyCookies} | Cookies de terceiros: ${this.thirdPartyCookies}`,
      firstPartyCookies: this.firstPartyCookies,
      thirdPartyCookies: this.thirdPartyCookies,
      localStorageItems: this.localStorageItems, // Detalhes do localStorage
      canvasFingerprintAttempts: this.canvasFingerprintAttempts, // Detalhes do fingerprinting
      cookies: this.cookies // Detalhes dos cookies
    });

    console.log("Resultado da varredura enviado:", {
      score: this.score,
      deductions: this.deductions,
      thirdPartyDomains: this.thirdPartyDomains,
      hijackingDetected: this.hijackingDetected,
      localStorageDetected: this.localStorageDetected,
      canvasFingerprintDetected: this.canvasFingerprintDetected,
      cookieStatus: this.cookieDetected,
      cookieAmount: this.cookieAmount,
      firstPartyCookies: this.firstPartyCookies,
      thirdPartyCookies: this.thirdPartyCookies,
      localStorageItems: this.localStorageItems,
      canvasFingerprintAttempts: this.canvasFingerprintAttempts,
      cookies: this.cookies
    });
  }
}

// Instanciar a classe para ativar o listener
new PrivacyProtectorScanner();
