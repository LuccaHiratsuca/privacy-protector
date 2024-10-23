class PrivacyProtectorPopup {
  constructor() {
    // Elementos do DOM
    this.runButton = document.getElementById('runScan');
    this.aboutButton = document.getElementById('about');
    this.loadingDiv = document.getElementById('loading');
    this.resultDiv = document.getElementById('result'); 
    this.aboutDiv = document.getElementById('aboutSection');
    this.closeAboutButton = document.getElementById('closeAbout');

    // Botões de detalhes
    this.detailsButtons = document.querySelectorAll('.details-btn');

    // Bind de métodos
    this.handleAboutClick = this.handleAboutClick.bind(this);
    this.handleCloseAboutClick = this.handleCloseAboutClick.bind(this);
    this.handleRunClick = this.handleRunClick.bind(this);
    this.handleScanResult = this.handleScanResult.bind(this);
    this.handleDetailsClick = this.handleDetailsClick.bind(this);

    // Configurar listeners
    this.addEventListeners();

    // Listener para receber os resultados do scan
    chrome.runtime.onMessage.addListener(this.handleScanResult);
  }

  addEventListeners() {
    this.aboutButton.addEventListener('click', this.handleAboutClick);
    this.closeAboutButton.addEventListener('click', this.handleCloseAboutClick);
    this.runButton.addEventListener('click', this.handleRunClick);
    this.detailsButtons.forEach(button => {
      button.addEventListener('click', this.handleDetailsClick);
    });
  }

  handleAboutClick() {
    this.hideElements(['loading', 'result', 'runScan', 'about']);
    this.showElement('aboutSection');
  }

  handleCloseAboutClick() {
    this.hideElements(['loading', 'result', 'aboutSection']);
    this.showElements(['runScan', 'about']);
  }

  handleRunClick() {
    this.hideElements(['runScan', 'about']);
    this.showElement('loading');

    // Executar o script de escaneamento na aba ativa
    chrome.tabs.executeScript(null, {
      file: "/scripts/index.js",
    }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { msg: "start scan" }, (response) => {
          if (response && response.status === "completed") {
            this.hideElement('loading');
            this.showElement('result');
          }
        });
      });
    });
  }

  handleScanResult(message) {
    if (message.type === 'scanResult') {
      // Atualizar os status
      document.getElementById('thirdPartyStatus').textContent = message.thirdPartyDomains !== 'Nenhum domínio de terceiros detectado' ? 'Detectado' : 'Nenhum domínio de terceiros detectado';
      document.getElementById('hijackingStatus').textContent = message.hijackingDetected !== 'Nenhuma ameaça de sequestro detectada' ? 'Detectado' : 'Nenhuma ameaça de sequestro detectada';
      document.getElementById('storageStatus').textContent = message.localStorageDetected ? 'Detectado' : 'Nenhum armazenamento local detectado';
      document.getElementById('fingerprintStatus').textContent = message.canvasFingerprintDetected ? 'Detectado' : 'Nenhum canvas fingerprinting detectado';
      document.getElementById("cookieStatus").textContent = message.cookieStatus !== 'Nenhum cookie de terceiros detectado' ? 'Detectado' : 'Nenhum cookie de terceiros detectado';
      document.getElementById('cookieAmount').textContent = `Cookies de primeira parte: ${message.firstPartyCookies} | Cookies de terceiros: ${message.thirdPartyCookies}`;
      document.getElementById('privacyScore').textContent = `${message.score}/100`;

      // Atualizar as deduções
      document.getElementById('thirdPartyDeduction').textContent = `Dedução: ${message.deductions.thirdParty} pontos`;
      document.getElementById('hijackingDeduction').textContent = `Dedução: ${message.deductions.hijacking} pontos`;
      document.getElementById('storageDeduction').textContent = `Dedução: ${message.deductions.storage} pontos`;
      document.getElementById('fingerprintDeduction').textContent = `Dedução: ${message.deductions.fingerprint} pontos`;
      document.getElementById('cookieDeduction').textContent = `Dedução: ${message.deductions.cookies} pontos`;
      document.getElementById('cookieAmountDeduction').textContent = `Dedução: ${message.deductions.cookieAmount} pontos`;

      // Atualizar detalhes
      // Domínios de Terceiros
      const thirdPartyDetails = document.getElementById('thirdPartyDetails');
      if (message.thirdPartyDomains !== 'Nenhum domínio de terceiros detectado') {
        const domains = message.thirdPartyDomains.split(', ').map(domain => `<li>${domain}</li>`).join('');
        thirdPartyDetails.innerHTML = `<ul>${domains}</ul>`;
      } else {
        thirdPartyDetails.textContent = 'Nenhum domínio de terceiros detectado.';
      }

      // Ameaças de Sequestro
      const hijackingDetails = document.getElementById('hijackingDetails');
      hijackingDetails.textContent = message.hijackingDetected !== 'Nenhuma ameaça de sequestro detectada' ? 'A página está embutida em um iframe, o que pode indicar uma ameaça potencial de sequestro ou hooking.' : 'Nenhuma ameaça de sequestro detectada.';

      // Armazenamento Local
      const storageDetails = document.getElementById('storageDetails');
      if (message.localStorageDetected && message.localStorageItems.length > 0) {
        const items = message.localStorageItems.map(item => `<li><strong>${item.key}:</strong> ${item.value}</li>`).join('');
        storageDetails.innerHTML = `<ul>${items}</ul>`;
      } else {
        storageDetails.textContent = 'Nenhum armazenamento local detectado.';
      }

      // Canvas Fingerprinting
      const fingerprintDetails = document.getElementById('fingerprintDetails');
      if (message.canvasFingerprintDetected) {
        if (message.canvasFingerprintAttempts.length > 0) {
          const attempts = message.canvasFingerprintAttempts.map(method => `<li>Intercepção de método: ${method}</li>`).join('');
          fingerprintDetails.innerHTML = `<ul>${attempts}</ul>`;
        } else {
          fingerprintDetails.textContent = 'Canvas fingerprinting detectado, mas nenhum método específico foi registrado.';
        }
      } else {
        fingerprintDetails.textContent = 'Nenhum canvas fingerprinting detectado.';
      }

      // Cookies
      const cookiesDetails = document.getElementById('cookiesDetails');
      if (message.cookieStatus !== 'Nenhum cookie de terceiros detectado') {
        // Listar todos os cookies com detalhes
        const cookiesList = message.cookies.map(cookie => {
          const domain = cookie.domain !== 'Desconhecido' ? cookie.domain : 'Desconhecido';
          return `<li><strong>${cookie.name}:</strong> ${cookie.value} | <strong>Domínio:</strong> ${domain}</li>`;
        }).join('');
        cookiesDetails.innerHTML = `Cookies de terceiros detectados. Detalhes:<ul>${cookiesList}</ul>`;
      } else {
        cookiesDetails.textContent = 'Nenhum cookie de terceiros detectado.';
      }

      // Quantidade de Cookies
      const cookieAmountDetails = document.getElementById('cookieAmountDetails');
      cookieAmountDetails.innerHTML = `Quantidade total de cookies:<br>Cookies de primeira parte: ${message.firstPartyCookies}<br>Cookies de terceiros: ${message.thirdPartyCookies}`;
    }
  }

  handleDetailsClick(event) {
    const type = event.target.getAttribute('data-type');
    const detailsDiv = document.getElementById(`${type}Details`);
    if (detailsDiv) {
      if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'block';
        event.target.textContent = 'Ocultar Detalhes';
      } else {
        detailsDiv.style.display = 'none';
        event.target.textContent = 'Ver Detalhes';
      }
    }
  }

  showElement(id) {
    document.getElementById(id).style.display = 'block';
  }

  hideElement(id) {
    document.getElementById(id).style.display = 'none';
  }

  showElements(ids) {
    ids.forEach(id => this.showElement(id));
  }

  hideElements(ids) {
    ids.forEach(id => this.hideElement(id));
  }
}

// Instanciar a classe para ativar os listeners e manipulações
document.addEventListener('DOMContentLoaded', () => {
  new PrivacyProtectorPopup();
});
