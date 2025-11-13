// /mon_projet_hd/static/js/main.js

document.addEventListener('DOMContentLoaded', () => {

    // ========== GESTION DU THÈME (DARK/LIGHT) ==========
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    // Détecte le thème préféré du système ou utilise celui sauvegardé
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

    // Fermer le menu en cliquant sur un lien (pour une navigation fluide sur une seule page)
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

    // Fermer en cliquant en dehors de la modale
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

    // ========== PRÉ-REMPLISSAGE DU FORMULAIRE VIA URL ==========
    const params = new URLSearchParams(window.location.search);
    const pName = params.get('produit');
    if (pName) {
        document.getElementById('product-info').style.display = 'flex';
        document.getElementById('product-name').textContent = pName;
        document.getElementById('hidden-product-name').value = pName;
        
        const pPrice = params.get('prix');
        if (pPrice) {
            document.getElementById('product-price').textContent = pPrice + ' DZD';
            document.getElementById('hidden-product-price').value = pPrice;
        }
        
        const pImg = params.get('image');
        if (pImg) {
            document.getElementById('product-image').src = pImg;
            document.getElementById('hidden-product-image').value = pImg;
        }

        const pSource = params.get('source');
        if (pSource) {
            document.getElementById('hidden-source').value = pSource;
        }
        
        // Aller directement à la section commande
        document.getElementById('commande').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ========== SOUMISSION DES FORMULAIRES ==========

    // --- Formulaire de Commande ---
    const orderForm = document.getElementById('orderForm');
    if(orderForm){
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.style.display = 'block';
            statusDiv.className = '';
            statusDiv.textContent = 'Envoi en cours...';

            const data = {
                produit: document.getElementById('hidden-product-name').value || 'Commande générale',
                prix: document.getElementById('hidden-product-price').value,
                image: document.getElementById('hidden-product-image').value,
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
                const response = await fetch('/send-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
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

    // --- Chargement et soumission des Avis ---
    const reviewForm = document.getElementById('reviewForm');
    const reviewsList = document.getElementById('reviewsList');

    async function loadReviews() {
        if (!reviewsList) return;
        try {
            const response = await fetch('/api/reviews');
            const data = await response.json();
            
            reviewsList.innerHTML = ''; // Vider la liste
            if (data.reviews && data.reviews.length > 0) {
                data.reviews.forEach(rv => {
                    const div = document.createElement('div');
                    div.className = 'review-card';
                    div.innerHTML = `
                        <div class="stars">${'★'.repeat(rv.rating)}${'☆'.repeat(5 - rv.rating)}</div>
                        <p>${rv.comment || ''}</p>
                        <div class="author">- ${rv.name || 'Client'}</div>
                    `;
                    reviewsList.appendChild(div);
                });
            } else {
                reviewsList.innerHTML = '<p class="note">Aucun avis pour le moment. Soyez le premier !</p>';
            }
        } catch (e) {
            reviewsList.innerHTML = '<p class="note">Erreur lors du chargement des avis.</p>';
        }
    }
    loadReviews(); // Charger les avis au démarrage

    if(reviewForm){
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusDiv = document.getElementById('r_status');
            statusDiv.textContent = 'Envoi...';
            statusDiv.className = '';

            const data = {
                name: document.getElementById('r_nom').value,
                rating: parseInt(document.getElementById('r_rating').value, 10),
                comment: document.getElementById('r_comment').value
            };

            try {
                const response = await fetch('/send-review', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                statusDiv.className = 'success';
                statusDiv.textContent = `✅ ${result.message}`;
                reviewForm.reset();
                loadReviews(); // Recharger la liste des avis

            } catch (err) {
                statusDiv.className = 'error';
                statusDiv.textContent = `❌ ${err.message}`;
            }
        });
    }

    // --- Formulaire de Contact ---
    const contactForm = document.getElementById('contactForm');
    if(contactForm){
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusDiv = document.getElementById('c_status');
            statusDiv.textContent = 'Envoi...';
            statusDiv.className = '';

            const data = {
                name: document.getElementById('c_nom').value,
                moyen: document.getElementById('c_moyen').value,
                message: document.getElementById('c_msg').value
            };

            try {
                const response = await fetch('/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                statusDiv.className = 'success';
                statusDiv.textContent = '✅ Message envoyé. Nous vous répondrons bientôt !';
                contactForm.reset();
            } catch (err) {
                statusDiv.className = 'error';
                statusDiv.textContent = `❌ ${err.message}`;
            }
        });
    }

}); // Fin de DOMContentLoaded