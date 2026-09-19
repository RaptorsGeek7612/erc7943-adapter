# Guide utilisateur — Adaptateur ERC-7943

Ce guide explique comment utiliser la console web pour inspecter et
administrer un adaptateur ERC-7943 exposant un token ERC-3643 (T-REX).

Console en ligne : **https://erc7943-adapter.vercel.app**

Aucune installation n'est necessaire : la console tourne dans le navigateur,
en lecture seule tant qu'aucun portefeuille n'est connecte.

---

## 1. Vue d'ensemble de l'interface

À l'ouverture, la page presente quatre sections empilees :

| Section | Fonction |
|---|---|
| **Adaptateur cible** | Ou renseigner l'adresse du contrat a inspecter |
| **Vue d'ensemble** | Identite du token sous-jacent, conformite au standard |
| **Verifications de conformite** | Questions en lecture seule, sans portefeuille |
| **Actions d'agent** | Ecritures reservees a un compte habilite (gel, transfert force) |

L'adresse saisie est memorisee dans le navigateur (elle reste privee, elle
n'est jamais envoyee ailleurs qu'aux nœuds du reseau Ethereum interroges).

## 2. Renseigner l'adaptateur

Dans **Adaptateur cible**, colle l'adresse du contrat `ERC7943Adapter` a
inspecter (et non l'adresse du token, ni une adresse de portefeuille — voir
§6 en cas de doute).

Exemple de reference, deploye sur le testnet Sepolia :

```
0x0EDf8DDcD22FF2CB92f8213852bd0eC30Ac23A21
```

Des que l'adresse est valide, la section **Vue d'ensemble** se remplit
automatiquement :

- **Token ERC-3643 sous-jacent** — l'adresse du token reellement detenu par
  les porteurs ; l'adaptateur ne detient jamais de fonds lui-meme.
- **Token (nom / symbole / decimales)** — identite lisible du token.
- **Identifiant d'interface ERC-7943 (calcule)** — la signature ERC-165 de
  l'adaptateur, calculee a partir de l'interface qu'il implemente. A
  comparer avec la valeur publiee par l'EIP final une fois celui-ci stabilise
  (voir [eip-7943](https://eips.ethereum.org/EIPS/eip-7943)).
- **Compatible ERC-7943 / ERC-165** — confirme que le contrat repond
  correctement au standard d'introspection.

## 3. Verifier une conformite de transfert (lecture)

Cette section ne necessite **aucun portefeuille connecte** : ce sont des
lectures publiques sur la blockchain.

1. Renseigne l'adresse de l'**emetteur** (le compte qui enverrait les
   tokens) et/ou du **destinataire**.
2. Ajuste le **montant** (en plus petite unite du token — la plupart des
   tokens ERC-3643 n'ont pas de decimales, verifie le champ "decimales" en
   §2).
3. Les quatre cartes repondent en temps reel :
   - *L'emetteur peut-il envoyer ce montant ?* — verifie la pause du token,
     le gel, la verification d'identite et le solde disponible.
   - *Le destinataire peut-il le recevoir ?* — pause, gel et verification
     d'identite du destinataire.
   - *Le transfert complet est-il autorise ?* — combine les deux
     verifications precedentes et les regles de conformite du token
     (limites geographiques, plafonds, etc. selon les modules actives).
   - *Quantite gelee chez l'emetteur* — la part du solde actuellement
     bloquee et non transferable.

Si une carte affiche **« Aucun adaptateur detecte a cette adresse »**,
l'adresse renseignee en §2 ne repond pas comme attendu — le cas le plus
frequent est d'avoir colle une adresse de portefeuille par erreur. Verifie
l'adresse et reessaie.

## 4. Actions d'agent (ecriture)

Ces deux formulaires modifient l'etat du token. Ils necessitent :

1. Un **portefeuille connecte** (bouton *Connect Wallet* en haut a droite —
   compatible avec les portefeuilles injectes comme MetaMask et avec
   WalletConnect pour les portefeuilles mobiles) ;
2. Que ce portefeuille **detienne le role d'agent** sur le token ERC-3643
   sous-jacent. Sans ce role, la transaction est refusee par le contrat
   (comportement volontaire — voir le [guide institutions](./guide-institutions.md#3-gouvernance-du-role-dagent)).

### Geler une quantite de tokens

Fixe la quantite gelee **cible** (et non un delta) pour l'utilisateur
indique. L'adaptateur calcule lui-meme s'il faut geler ou degeler la
difference cote token.

### Forcer un transfert

Deplace des tokens d'un compte a un autre **sans le consentement du
porteur**. Fonction reservee a une autorite habilitee (ex. execution d'une
decision judiciaire, correction d'une erreur d'emission). A utiliser avec
prudence : l'operation est irreversible une fois confirmee sur la
blockchain.

Chaque formulaire affiche l'etat de la transaction en direct :
*Confirmation dans le portefeuille…* → *Transaction envoyee, en attente de
confirmation…* → *Confirmee : 0x…* (avec le hash, a retrouver sur
[Sepolia Etherscan](https://sepolia.etherscan.io) pour un audit
independant).

## 5. Se connecter avec un portefeuille mobile

1. Clique sur **Connect Wallet** puis choisis **WalletConnect**.
2. Un QR code s'affiche : scanne-le avec l'application de ton portefeuille
   mobile (Rainbow, MetaMask Mobile, Trust Wallet, etc.), configuree sur le
   meme reseau que l'adaptateur (Sepolia pour l'exemple de reference).
3. Approuve la connexion sur le telephone. L'adresse et le solde du
   portefeuille apparaissent alors en haut a droite de la console.

## 6. Erreurs frequentes

| Message | Cause probable | Solution |
|---|---|---|
| Adresse Ethereum invalide | Format d'adresse incorrect (longueur, caracteres) | Verifie le copier-coller, une adresse fait 42 caracteres (`0x` + 40 hexadecimaux) |
| Aucun adaptateur detecte a cette adresse | L'adresse pointe vers autre chose qu'un contrat `ERC7943Adapter` (souvent une adresse de portefeuille) | Utilise l'adresse du contrat, pas celle d'un compte |
| Connecte un portefeuille pour executer une ecriture | Aucun portefeuille connecte | Clique sur *Connect Wallet* |
| Transaction refusee / echouee apres connexion | Le portefeuille connecte n'a pas le role d'agent sur le token | Demande a l'administrateur du token de t'accorder ce role (voir guide institutions) |

---

Pour la gouvernance du role d'agent, le deploiement d'une instance propre, et
le contexte reglementaire, voir le
**[guide detaille pour institutions](./guide-institutions.md)**.
