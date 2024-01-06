### Create products : https://dashboard.stripe.com/test/products?active=true

- "Splinar"
  - Unit wording: "1000 items"
- Add two pricing:
  1. Standard price:
  - Récurrent
  - à la conso
  - par niveau
  - au volume
  - 10 + 1x
  - exclure taxe du tarif
  - mensuel
  - Max value de la période
  2. Zero price:
  - Récurrent
  - À la conso
  - par unité
  - O EUROS (et pas usd)
  - inclure taxe dans tarif (utile ?)
  - mensuel
  - Max value de la période

### Set up portal : https://dashboard.stripe.com/test/settings/billing/portal

- Disable "Annuler les abonnements"
- Only let :
  - Historique de facturation
  - Informations client
  - Moyen de paiement

-> Enregistrer les modifications

### Set up webhook

- https://app.splinar.com/api/stripe-hook

- Events :
  - customer.subscription.created
  - customer.subscription.deleted
  - customer.subscription.updated
