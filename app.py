# /mon_projet_hd/app.py

import os, re, csv, json, time, datetime
import requests
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

# ========== CONFIGURATION ==========
load_dotenv()
app = Flask(__name__)

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
    raise ValueError("ERREUR: Ajoutez TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID dans .env")

# Chemins vers les fichiers de données
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

ORDERS_CSV = os.path.join(DATA_DIR, 'orders.csv')
REVIEWS_JSON = os.path.join(DATA_DIR, 'reviews.json')

RATE_LIMIT = {} # Anti-spam simple

# ========== FONCTIONS UTILITAIRES (Backend) ==========

def html_escape(s: str) -> str:
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def now_ts():
    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def order_id():
    return 'HD-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S')

def is_url(u: str) -> bool:
    return bool(u and re.match(r'^https?://', u.strip()))

def rate_limited(ip: str, seconds=8) -> bool:
    last = RATE_LIMIT.get(ip, 0)
    if time.time() - last < seconds: return True
    RATE_LIMIT[ip] = time.time()
    return False

def append_order_row(row: dict):
    file_exists = os.path.isfile(ORDERS_CSV)
    fieldnames = ['created_at','order_id','produit','prix','quantite','taille','couleur','nom','telephone','wilaya','adresse','description','source','image']
    with open(ORDERS_CSV, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)

def load_reviews():
    if not os.path.isfile(REVIEWS_JSON): return []
    try:
        with open(REVIEWS_JSON, 'r', encoding='utf-8') as f: return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError): return []

def save_reviews(reviews):
    with open(REVIEWS_JSON, 'w', encoding='utf-8') as f:
        json.dump(reviews, f, ensure_ascii=False, indent=2)

def average_rating(reviews):
    if not reviews: return 0
    vals = [r.get('rating', 0) for r in reviews if isinstance(r.get('rating'), int)]
    return round(sum(vals) / len(vals), 1) if vals else 0

def send_to_telegram(text_html: str, image_url: str = None):
    """
    Envoie un message ou une photo à Telegram.
    Cette fonction est maintenant "stricte" : elle lève une exception en cas d'échec
    et affiche des informations de débogage détaillées dans le terminal.
    """
    if image_url and is_url(image_url):
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
        payload = {'chat_id': TELEGRAM_CHAT_ID, 'photo': image_url, 'caption': text_html, 'parse_mode': 'HTML'}
    else:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {'chat_id': TELEGRAM_CHAT_ID, 'text': text_html, 'parse_mode': 'HTML'}

    try:
        response = requests.post(url, json=payload, timeout=12)

        # Affiche la réponse de Telegram pour le débogage, quelle qu'elle soit
        print("-" * 20)
        print(f"Réponse de l'API Telegram (Status HTTP: {response.status_code}):")
        print(response.text)
        print("-" * 20)

        # Lève une erreur si le statut HTTP n'est pas un succès (ex: 404, 500)
        response.raise_for_status()

        # Vérifie la réponse JSON pour le champ "ok"
        data = response.json()
        if not data.get('ok'):
            # Si "ok" est false, lève une exception avec la description de l'erreur
            raise Exception(f"API Telegram Error: {data.get('description', 'Erreur inconnue')}")
        
        print(">>> Message envoyé à Telegram avec succès (selon l'API).")

    except requests.exceptions.RequestException as e:
        # Erreur réseau (timeout, DNS, pas de connexion, etc.)
        raise Exception(f"Erreur Réseau en contactant Telegram: {e}")


# ========== ROUTES (Endpoints de l'API) ==========

@app.route('/')
def index():
    """Sert la page HTML principale."""
    return render_template('index.html')

@app.route('/send-order', methods=['POST'])
def send_order():
    try:
        ip = request.remote_addr or 'local'
        if rate_limited(ip):
            return jsonify({'message': 'Trop de requêtes, réessayez dans quelques secondes.'}), 429

        data = request.get_json(force=True)
        for k in ['nom', 'telephone', 'wilaya', 'adresse']:
            if not data.get(k):
                return jsonify({'message': f'Le champ "{k}" est requis.'}), 400

        oid = order_id()
        produit = html_escape(data.get('produit','Commande générale'))
        prix = html_escape(str(data.get('prix','N/A')))
        quantite = int(data.get('quantite') or 1)
        taille = html_escape(data.get('taille',''))
        couleur = html_escape(data.get('couleur',''))
        nom = html_escape(data.get('nom',''))
        tel = html_escape(data.get('telephone',''))
        wilaya = html_escape(data.get('wilaya',''))
        adresse = html_escape(data.get('adresse',''))
        desc = html_escape(data.get('description',''))
        source = html_escape(data.get('source',''))
        image = data.get('image','') if is_url(data.get('image','')) else ''

        caption = (
            f"<b>🔔 Nouvelle commande — H&D Designed</b>\n\n"
            f"<b>N° de commande :</b> {oid}\n"
            f"<b>Produit :</b> {produit}\n"
            f"<b>Prix :</b> {prix} DZD\n"
            f"<b>Quantité :</b> {quantite}\n"
            + (f"<b>Taille :</b> {taille}\n" if taille else "")
            + (f"<b>Couleur :</b> {couleur}\n" if couleur else "")
            + (f"<b>Source :</b> {source}\n" if source else "")
            + "\n<b>--- Client ---</b>\n"
            f"<b>Nom :</b> {nom}\n"
            f"<b>Tél :</b> <code>{tel}</code>\n"  # `<code>` pour copier-coller facile
            f"<b>Wilaya :</b> {wilaya}\n"
            f"<b>Adresse :</b> {adresse}\n"
            + (f"\n<b>Notes :</b>\n<i>{desc}</i>" if desc else "")
        )

        print(f"\n--- [INFO] Tentative d'envoi de la commande {oid} à Telegram ---")
        send_to_telegram(caption, image_url=image)
        
        # Si on arrive ici, l'envoi a réussi, on peut sauvegarder
        append_order_row({
            'created_at': now_ts(), 'order_id': oid, 'produit': produit, 'prix': prix, 'quantite': quantite,
            'taille': taille, 'couleur': couleur, 'nom': nom, 'telephone': tel, 'wilaya': wilaya, 'adresse': adresse,
            'description': desc, 'source': source, 'image': image
        })

        return jsonify({'message': 'Commande envoyée avec succès !', 'order_id': oid}), 200

    except Exception as e:
        # Ce bloc va maintenant capturer les erreurs de `send_to_telegram`
        print(f"\n🔥🔥🔥 ERREUR DANS send_order: {e} 🔥🔥🔥\n")
        return jsonify({'message': f"Erreur interne du serveur: {e}"}), 500


@app.route('/send-review', methods=['POST'])
def send_review():
    try:
        data = request.get_json(force=True)
        rating = int(data.get('rating') or 0)
        if not (1 <= rating <= 5):
            return jsonify({'message': 'Note invalide.'}), 400

        review = {
            'name': (data.get('name') or 'Client').strip()[:40],
            'rating': rating,
            'comment': (data.get('comment') or '').strip()[:500],
            'created_at': now_ts()
        }
        reviews = load_reviews()
        reviews.insert(0, review)
        save_reviews(reviews[:1000])

        try:
            txt = f"<b>NOUVEL AVIS ({rating}/5)</b>\n<b>Par:</b> {html_escape(review['name'])}\n\n<i>{html_escape(review['comment'])}</i>"
            send_to_telegram(txt)
        except Exception as e:
            print(f"[AVIS] N'a pas pu être envoyé sur Telegram : {e}")

        return jsonify({'message': 'Avis enregistré, merci !', 'avg': average_rating(reviews)}), 200
    except Exception as e:
        print(f"ERREUR dans send_review: {e}")
        return jsonify({'message': str(e)}), 500

@app.route('/api/reviews', methods=['GET'])
def api_reviews():
    reviews = load_reviews()
    return jsonify({'reviews': reviews[:6], 'avg': average_rating(reviews), 'count': len(reviews)})

@app.route('/contact', methods=['POST'])
def contact():
    try:
        data = request.get_json(force=True)
        name = html_escape(data.get('name',''))
        moyen = html_escape(data.get('moyen',''))
        message = html_escape(data.get('message',''))
        if not (name and moyen and message):
            return jsonify({'message': 'Tous les champs sont requis.'}), 400
        
        txt = f"<b>✉️ Nouveau Message de Contact</b>\n\n<b>Nom:</b> {name}\n<b>Contact:</b> {moyen}\n\n<b>Message:</b>\n{message}"
        send_to_telegram(txt)
        
        return jsonify({'message': 'Message envoyé.'}), 200
    except Exception as e:
        print(f"ERREUR dans contact: {e}")
        return jsonify({'message': str(e)}), 500

# ========== LANCEMENT DU SERVEUR ==========
if __name__ == '__main__':
    print("="*60)
    print("🚀 H&D Designed — Serveur de débogage démarré")
    print("➡  Ouvrez: http://127.0.0.1:5000")
    print("🗂️  Structure de projet avec fichiers séparés.")
    print("‼️  ATTENTION: Regardez ce terminal après avoir soumis une commande.")
    print("="*60)
    app.run(host='0.0.0.0', port=5000, debug=True)