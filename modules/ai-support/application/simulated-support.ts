import type {
  PublicCommerceKnowledge,
  SupportRequest,
} from "./public-commerce-knowledge";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const hasAny = (text: string, words: string[]) => words.some((word) => text.includes(word));

const money = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("es-VE", { style: "currency", currency }).format(cents / 100);

export async function answerSimulatedSupport(
  request: SupportRequest,
  knowledge: PublicCommerceKnowledge
): Promise<string> {
  const text = normalize(request.text);
  const es = request.locale === "es";

  if (hasAny(text, ["contact", "contactar", "contacto", "telefono", "correo", "email", "whatsapp"])) {
    return es
      ? "Puedes contactarnos mediante el formulario publico del demo. Vuelve a Modulos y abre CRM / Zoho > Formulario demo. No mostramos telefonos ni correos que no esten configurados publicamente."
      : "You can contact us through the demo's public contact form. Return to Modules and open CRM / Zoho > Demo form. We do not display phone numbers or email addresses that are not publicly configured.";
  }

  if (hasAny(text, ["que hacen", "quienes son", "sobre ustedes", "what do you do", "who are you", "about you"])) {
    return es
      ? "Cirix es un demo de comercio para supermercado: permite explorar productos, comprar con retiro o delivery y participar en un programa de recompensas y referidos."
      : "Cirix is a grocery-commerce demo where customers can browse products, order for pickup or delivery, and participate in rewards and referral programs.";
  }

  if (hasAny(text, ["pedido", "order", "wallet", "billetera", "saldo", "balance", "mi cuenta"])) {
    return es
      ? "Este demo publico no consulta pedidos, cuentas ni saldos personales. Inicia sesion y usa las secciones Pedidos o Billetera para ver esa informacion de forma segura."
      : "This public demo cannot access orders, accounts, or personal balances. Sign in and use Orders or Wallet to view that information securely.";
  }

  if (hasAny(text, ["delivery", "entrega", "envio", "retiro", "pickup", "zona"])) {
    const options = await knowledge.getFulfillmentOptions();
    const zones = options.deliveryZones
      .map((zone) => `${zone.name}: ${money(zone.feeCents, zone.currency)}`)
      .join(", ");
    return es
      ? `Puedes retirar sin costo o pedir delivery. Zonas disponibles: ${zones}. Las tarifas son las configuradas actualmente en el demo.`
      : `Free pickup and delivery are available. Current demo delivery zones: ${zones}.`;
  }

  if (hasAny(text, ["pago", "payment", "pagar", "zelle", "efectivo", "transferencia", "pago movil"])) {
    const options = await knowledge.getFulfillmentOptions();
    return es
      ? `Los metodos disponibles son: ${options.paymentMethods.join(", ")}. El pago se reporta y un operador lo verifica; este asistente nunca muestra datos bancarios.`
      : `Available payment methods: ${options.paymentMethods.join(", ")}. Payments are reported for operator verification; this assistant never exposes banking details.`;
  }

  if (hasAny(text, ["reward", "recompensa", "credito", "referido", "referral", "puntos", "loyalty"])) {
    const program = await knowledge.getLoyaltyProgram();
    return es
      ? `El credito aprobado se libera despues de ${program.holdbackDays} dias, vence en ${program.expiryDays} dias y puede cubrir hasta ${program.maxRedeemPctOfOrder}% de una compra. Un referido calificado recompensa ${money(program.referralRewardCents, program.currency)}, con un maximo de ${program.referralMonthlyCap} al mes.`
      : `Approved credit is released after ${program.holdbackDays} days, expires after ${program.expiryDays} days, and can cover up to ${program.maxRedeemPctOfOrder}% of an order. A qualified referral earns ${money(program.referralRewardCents, program.currency)}, up to ${program.referralMonthlyCap} per month.`;
  }

  if (hasAny(text, ["producto", "product", "precio", "price", "catalogo", "catalog", "venden", "vender", "sell", "tomate", "aguacate", "brocoli", "zanahoria", "pimenton", "lechuga"])) {
    const products = await knowledge.searchProducts(request.text);
    if (products.length === 0) {
      return es
        ? "No encontre un producto que coincida. Prueba preguntando por tomates, aguacates, brocoli, zanahorias, pimenton o lechuga."
        : "I could not find a matching product. Try asking about tomatoes, avocados, broccoli, carrots, peppers, or lettuce.";
    }
    const list = products
      .slice(0, 6)
      .map((product) => `${product.name} (${money(product.priceCents, product.currency)})`)
      .join(", ");
    return es ? `Catalogo disponible: ${list}.` : `Available catalog: ${list}.`;
  }

  return es
    ? "Estoy en modo simulado y puedo ayudarte con productos y precios, delivery, metodos de pago, recompensas y referidos. No uso IA ni consumo tokens en este modo."
    : "I am running in simulated mode. I can help with products and prices, delivery, payment methods, rewards, and referrals. This mode uses no AI or tokens.";
}
