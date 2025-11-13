// /mon_projet_hd/static/js/main.js

document.addEventListener('DOMContentLoaded', () => {

    // ========== GESTION DU THÈME (DARK/LIGHT) ==========
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    root.setAttribute('data-theme', savedTheme);
    themeToggle.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
        const newTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
    });

    // ========== MENU HAMBURGER (MOBILE) ==========
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('nav-menu');
    mobileMenuToggle.addEventListener('click', () => {
        document.body.classList.toggle('menu-open');
    });
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            document.body.classList.remove('menu-open');
        });
    });

    // ========== GESTION DES FENÊTRES MODALES (POP-UP) ==========
    const modalTriggers = document.querySelectorAll('.open-modal');
    const closeButtons = document.querySelectorAll('.close-btn');

    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            const modal = document.getElementById(trigger.dataset.modal);
            if (modal) modal.style.display = 'flex';
        });
    });

    const closeModal = (modal) => {
        if (modal) modal.style.display = 'none';
    };

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            closeModal(button.closest('.modal'));
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    });

    // ========== BOUTON "RETOUR EN HAUT" ==========
    const toTopButton = document.getElementById('toTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            toTopButton.classList.add('visible');
        } else {
            toTopButton.classList.remove('visible');
        }
    });
    toTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ========== PRÉ-REMPLISSAGE DU FORMULAIRE (VERSION TEXTE SEUL) ==========
    const params = new URLSearchParams(window.location.search);
    const pName = params.get('produit');

    if (pName) {
        const productInfoDiv = document.getElementById('product-info');
        const productNameEl = document.getElementById('product-name');
        const productPriceEl = document.getElementById('product-price');
        
        const hiddenProductName = document.getElementById('hidden-product-name');
        const hiddenProductPrice = document.getElementById('hidden-product-price');
        const hiddenProductImage = document.getElementById('hidden-product-image'); // On garde pour l'envoi à Telegram
        const hiddenSource = document.getElementById('hidden-source');
        
        if (productInfoDiv) productInfoDiv.style.display = 'block'; // 'block' est mieux que 'flex' sans image
        if (productNameEl) productNameEl.textContent = pName;
        if (hiddenProductName) hiddenProductName.value = pName;

        const pPrice = params.get('prix');
        if (pPrice) {
            if (productPriceEl) productPriceEl.textContent = pPrice + ' DZD';
            if (hiddenProductPrice) hiddenProductPrice.value = pPrice;
        }
        
        // On récupère l'URL de l'image pour la stocker mais on ne l'affiche pas
        const pImg = params.get('image');
        if (pImg && hiddenProductImage) {
            hiddenProductImage.value = pImg;
        }

        const pSource = params.get('source');
        if (pSource && hiddenSource) {
            hiddenSource.value = pSource;
        }
        
        const commandeSection = document.getElementById('commande');
        if (commandeSection) {
            commandeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ========== SOUMISSION DES FORMULAIRES ==========
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.style.display = 'block';
            statusDiv.className = '';
            statusDiv.textContent = 'Envoi en cours...';

            const data = {
                produit: document.getElementById('hidden-product-name').value || 'Commande générale',
                prix: document.getElementById('hidden-product-price').value,
                image: document.getElementById('hidden-product-image').value, // L'image sera envoyée à Telegram
                source: document.getElementById('hidden-source').value || 'Site Direct',
                quantite: parseInt(document.getElementById('quantite').value || '1', 10),
                taille: document.getElementById('taille').value,
                couleur: document.getElementById('couleur').value,
                nom: document.getElementById('nom').value,
                telephone: document.getElementById('telephone').value,
                wilaya: document.getElementById('wilaya').value,
                adresse: document.getElementById('adresse').value,
                description: document.getElementById('description').value
            };

            try {
                const response = await fetch('/send-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Erreur serveur.');
                statusDiv.className = 'success';
                statusDiv.textContent = `✅ ${result.message} (N° de commande : ${result.order_id})`;
                orderForm.reset();
            } catch (err) {
                statusDiv.className = 'error';
                statusDiv.textContent = `❌ ${err.message}`;
            }
        });
    }

    // Le reste du JS pour les avis et le contact est inchangé...
    // (code des formulaires d'avis et de contact)
});