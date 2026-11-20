import type { Locale } from "@/lib/locale";

/**
 * Every word on the home page, in both languages. The English is the
 * designer's mockup (cirixboceto.pages.dev) word for word; the Spanish is a
 * translation still to be reviewed by Cirix.
 *
 * PENDING with Cirix before this page goes live (see docs/home.md):
 * - Apple / Google Wallet, push notifications and the cashback, subscription
 *   and gift cards are promised here but the app does not have them yet.
 * - The card pictures and the hero photo show other companies' brands.
 * - The price (49 € + VAT) and the 2×, 30 % and 48 h figures need confirming.
 */
export type HomeCopy = ReturnType<typeof homeCopy>;

type Pair = { es: string; en: string };
const pick = (locale: Locale, pair: Pair) => pair[locale];

export function homeCopy(locale: Locale) {
  const t = (es: string, en: string) => pick(locale, { es, en });
  return {
    skip: t("Saltar al contenido", "Skip to content"),
    nav: {
      label: t("Navegación principal", "Main navigation"),
      home: t("Inicio", "Home"),
      cards: t("Tarjetas", "Cards"),
      process: t("Proceso", "Process"),
      contact: t("Contacto", "Contact"),
      start: t("Empezar", "Get started"),
      signIn: t("Ingresar", "Sign in"),
      open: t("Abrir menú", "Open menu"),
      close: t("Cerrar menú", "Close menu"),
      homeLabel: t("CIRIX, inicio", "CIRIX, home"),
    },
    hero: {
      announcement: t("Pide más información aquí", "Request more info here"),
      title: t(
        "Convierte los días flojos en tus días más llenos, sin mover un dedo.",
        "Turn Slow Weekdays Into Your Busiest Days—Without Lifting a Finger.",
      ),
      description: t(
        "Creamos, lanzamos y administramos por ti programas digitales de sellos y puntos para restaurantes, salones, tiendas y talleres. Guarda los datos de cada cliente, haz que vuelvan solos y mide el retorno en tiempo real.",
        "We build, launch, and fully manage done-for-you digital stamp and point reward systems for restaurants, salons, boutiques, and auto shops. Capture every customer's data, automate repeat visits, and see exact ROI in real time.",
      ),
      cta: t("Agenda tu diagnóstico gratis de días flojos", "Book Your Free Slow-Day Revenue Audit"),
      stars: t("5 estrellas", "5 stars"),
      review: t("A tus clientes les va a encantar CIRIX", "Your customers will love CIRIX"),
      photoAlt: t("Ejemplo de un negocio", "Work 1 example photo"),
      badges: [
        { title: t("Medido", "Tracked"), text: t("Medido con precisión", "Tracked with Precision"), value: "+350" },
        { title: t("Clientes felices", "Fulfilled Clients"), text: t("Clientes satisfechos", "Satisfied Customers"), value: "+130" },
      ],
    },
    advantages: {
      eyebrow: t("VENTAJAS", "ADVANTAGES"),
      title: t("Tus clientes vuelven una y otra vez", "Your customers come back time and time again"),
      lead: t("Nos enfocamos en 4 puntos clave para tu negocio.", "We focus on 4 key points for your business."),
      items: [
        { icon: "percent", title: t("Deja de pagar 30 % a las apps de delivery.", "Stop paying 30% to delivery apps."), text: t("Tu lista de clientes es tuya, y las mesas del martes al mediodía se llenan solas.", "Own your customer list and fill Tuesday lunch tables on autopilot.") },
        { icon: "calendar", title: t("Asegura citas que se repiten.", "Lock in recurring appointments."), text: t("Premia a quien reserva su próxima cita en días tranquilos antes de levantarse de la silla.", "Reward clients for rebooking on off-peak days before they leave the chair.") },
        { icon: "crown", title: t("Convierte curiosos en clientes VIP.", "Turn one-time browsers into VIP regulars."), text: t("Mueve el inventario lento con multiplicadores de puntos.", "Move slow-moving inventory using targeted point multipliers.") },
        { icon: "bell", title: t("Sigue presente entre un cambio de aceite y otro.", "Stay top-of-mind between oil changes."), text: t("Genera confianza con puntos por servicio para que nunca llamen a otro taller.", "Build trust with service points so they never call another shop.") },
      ] as const,
    },
    cards: {
      eyebrow: t("TARJETAS DE FIDELIZACIÓN", "LOYALTY CARDS"),
      title: t("El sistema de fidelización perfecto", "The perfect customer loyalty system"),
      lead: t("Te ayudamos a elegir el mejor programa para tus objetivos.", "We help you choose the best program for your goals."),
      items: [
        { image: "/brand/home/card-1.png", alt: t("Tarjeta de sellos naranja", "Orange stamp card"), title: t("Tarjeta de sellos", "Stamp Card"), text: t("¡La más popular! Por cada 10 cafés, el 11.º es gratis. Muy visual y fácil de seguir para tus clientes.", "The most popular option! For every 10 coffees, the 11th is free. Highly visual and effortless for customers to follow.") },
        { image: "/brand/home/card-2.png", alt: t("Tarjeta de puntos", "Points card"), title: t("Tarjeta de puntos", "Points Card"), text: t("Suma puntos en cada visita; por ejemplo, 1 dólar gastado es 1 punto. Ofrece premios distintos en cada nivel.", "Earn points with every visit—for instance, 1 dollar spent equals 1 point. Offer different rewards at each tier level.") },
        { image: "/brand/home/card-3.png", alt: t("Tarjeta de descuento con niveles", "Discount card with tiers"), title: t("Tarjeta de descuento", "Discount Card"), text: t("Da un porcentaje de descuento al llegar a cierto nivel. Aumenta la frecuencia de visitas y el ticket promedio.", "Offer a percentage discount when reaching a specific tier level. Increases visit frequency and average ticket size.") },
        { image: "/brand/home/card-4.png", alt: t("Tarjeta de cashback", "Cashback card"), title: t("Tarjeta de cashback", "Cashback Card"), text: t("Funciona como la de descuento, pero le devuelve dinero al cliente cuando alcanza un nivel.", "Works just like the discount card, but gives customers money back once they reach a tier.") },
        { image: "/brand/home/card-5.png", alt: t("Tarjeta de suscripción", "Subscription card"), title: t("Tarjeta de suscripción", "Subscription Card"), text: t("Imagina a tus clientes suscritos a tu negocio: pagan una cuota mensual y reciben productos fijos cada mes.", "Imagine your customers subscribing to your business. They pay a monthly fee and receive set products every month.") },
        { image: "/brand/home/card-6.png", alt: t("Tarjeta de regalo", "Gift card"), title: t("Tarjeta de regalo", "Gift Card"), text: t("La estrategia de las grandes marcas, fácil. Tus clientes pueden comprar tarjetas de regalo para amigos y familia.", "Big brand strategy made easy. Your customers can purchase gift cards for friends and family.") },
      ],
    },
    process: {
      eyebrow: t("PROCESO", "PROCESS"),
      title: t("Cómo funciona para tus clientes", "How it works for your customers"),
      lead: t("Un motor de visitas sin fricción para tu negocio.", "Frictionless frequency driver for your business."),
      tabsLabel: t("Pasos para usar CIRIX", "Steps to use CIRIX"),
      step: t("PASO", "STEP"),
      steps: [
        { image: "/brand/home/step-1.png", width: 1018, height: 618, phone: false, alt: t("Cliente escaneando el código QR del mostrador", "Customer buying and scanning counter QR code"), title: t("El cliente compra y escanea el QR", "Customer Buys & Scans QR"), text: t("Visitas sin fricción. El cliente escanea un código QR al pagar (guardado en Apple Wallet / Google Wallet, sin descargar ninguna app).", "Frictionless frequency driver. Clients scan a QR code at checkout (stored natively in Apple Wallet / Google Wallet—no app download required).") },
        { image: "/brand/home/step-2.webp", width: 1144, height: 2048, phone: true, alt: t("Tarjeta digital mostrando un sello ganado", "Digital loyalty card showing earned virtual stamp"), title: t("Gana 1 sello virtual", "Earns 1 Virtual Stamp"), text: t("Junta un sello virtual por visita o compra al instante, sin descargar ninguna app.", "Collect a virtual stamp per visit or purchase instantly without downloading any app.") },
        { image: "/brand/home/step-3.webp", width: 944, height: 2048, phone: true, alt: t("Cliente desbloqueando premios", "Customer unlocking rewards and push notifications"), title: t("Desbloquea premios y gana", "Unlocks Rewards & Wins"), text: t("Desbloquea un producto o servicio gratis en la visita 5 o 10. Adiós a las tarjetas de papel perdidas, evita el fraude de empleados y envía notificaciones automáticas cuando un cliente lleva 14 días sin venir.", "Unlocks a free item/service on visit #5 or #10. Eliminates lost paper punch cards, prevents employee fraud, and triggers automated push notifications when a customer hasn't visited in 14 days.") },
      ],
    },
    stats: {
      title: t("Convierte visitas en ingresos predecibles y recurrentes.", "Turn visits into predictable, recurring revenue."),
      items: [
        { value: 2, unit: "×", label: t("Más retención de clientes", "Increase in customer retention"), aria: t("2 veces", "2 times") },
        { value: 30, unit: "%", label: t("Más ticket promedio", "Increase in average order value"), aria: t("30 por ciento", "30 percent") },
        { value: 48, unit: t("horas", "hours"), label: t("Tiempo promedio para arrancar", "Average time to go live"), aria: t("48 horas", "48 hours") },
      ],
    },
    benefits: {
      eyebrow: t("BENEFICIOS", "BENEFITS"),
      title: t("Por qué los negocios locales eligen CIRIX", "Why local businesses choose CIRIX"),
      lead: t("Hecho para el ritmo de tu día, no en su contra.", "Built for the rhythm of your workday, not against it."),
      items: [
        { icon: "rocket", title: t("Sin apps que descargar", "No apps to download"), text: t("Tus clientes guardan la tarjeta en Apple Wallet o Google Wallet. Sin fricción y sin contraseñas olvidadas.", "Customers save the card directly to Apple Wallet or Google Wallet. No friction, no forgotten passwords.") },
        { icon: "chart", title: t("Retorno en tiempo real", "Real-time ROI"), text: t("Mira cuántos clientes vuelven, qué premios se canjean y cuánto deja cada campaña.", "See exactly how many customers return, which rewards redeem, and what each campaign brings in.") },
        { icon: "bell", title: t("Reactivación automática", "Automated re-engagement"), text: t("Notificaciones que le recuerdan volver a quien lleva 14 días sin venir, sin que muevas un dedo.", "Push notifications remind customers who haven't visited in 14 days—without you lifting a finger.") },
      ] as const,
    },
    comparison: {
      eyebrow: t("COMPARACIÓN", "COMPARISON"),
      title: t("CIRIX vs. la forma de siempre", "CIRIX vs. the old way"),
      lead: t("Las tarjetas de papel y las apps de delivery se hicieron para que otro gane.", "Paper punch cards and delivery apps were built for someone else's profit."),
      before: {
        title: t("Antes de CIRIX", "Before CIRIX"),
        items: [
          t("Las tarjetas de papel se pierden o se olvidan", "Paper cards get lost or forgotten"),
          t("Sin datos de clientes, sin información", "No customer data, no insights"),
          t("30 % para las plataformas de delivery", "30% cut to delivery platforms"),
          t("Premios difíciles de controlar y canjear", "Rewards hard to track and redeem"),
        ],
        cta: t("Cámbiate a CIRIX", "Switch to CIRIX"),
      },
      after: {
        title: t("Con CIRIX", "With CIRIX"),
        items: [
          t("Tarjeta digital en Apple/Google Wallet", "Digital card in Apple/Google Wallet"),
          t("Datos de clientes y panel de retorno", "Full customer data and ROI dashboard"),
          t("La relación con el cliente es tuya", "You own the customer relationship"),
          t("Reactivación automática con notificaciones", "Automated push re-engagement"),
        ],
        cta: t("Empieza hoy", "Get started today"),
      },
    },
    pricing: {
      eyebrow: t("PRECIOS", "PRICING"),
      title: t("Precios simples y transparentes", "Simple, transparent pricing"),
      lead: t("Un plan. Sin costos ocultos. Cancela cuando quieras.", "One plan. No hidden fees. Cancel anytime."),
      periodLabel: t("Periodo de pago", "Billing period"),
      monthly: t("Mensual", "Monthly"),
      annual: t("Anual", "Annual"),
      save: t("Ahorra 2 meses con el plan anual", "Save 2 months with annual"),
      note: t("Incluye dos meses gratis al pagar el año.", "Includes two free months when billed annually."),
      plan: t("PLAN PRO", "PRO PLAN"),
      tax: t("+ IVA", "+ VAT"),
      monthlyAmount: "49",
      annualAmount: "40,83",
      currency: "€",
      perMonth: t("/mes", "/month"),
      description: t("Todo lo que necesitas para lanzar y manejar tu programa de fidelización.", "Everything you need to launch and run your loyalty program."),
      annualDetail: t("Se cobra al año: 490 € + IVA (2 meses gratis).", "Billed annually at €490 + VAT (2 months free)."),
      included: [
        t("Clientes y sellos ilimitados", "Unlimited customers and stamps"),
        t("Tarjetas digitales en Wallet (Apple y Google)", "Digital wallet cards (Apple & Google)"),
        t("Panel de estadísticas en tiempo real", "Real-time analytics dashboard"),
        t("Notificaciones automáticas de reactivación", "Automated re-engagement push notifications"),
        t("Niveles de premios y multiplicadores de puntos a tu medida", "Custom reward tiers and point multipliers"),
        t("Soporte por correo y chat", "Email and chat support"),
      ],
      cta: t("Empezar", "Get started"),
    },
    footer: {
      tagline: t("El sistema de fidelización digital más simple para negocios locales.", "The world's simplest digital loyalty system for local businesses."),
      social: t("Redes", "Social"),
      legal: t("Legal", "Legal"),
      privacy: t("Política de privacidad", "Privacy Policy"),
      // The mockup's newsletter has nowhere to send emails; this column offers WhatsApp instead.
      contactTitle: t("Contacto", "Contact"),
      contactText: t("Escríbenos y te ayudamos a elegir tu programa.", "Message us and we'll help you choose your program."),
      contactCta: t("Escríbenos por WhatsApp", "Message us on WhatsApp"),
      rights: t("Todos los derechos reservados.", "All rights reserved."),
    },
    contact: {
      eyebrow: t("EMPIEZA CON CIRIX", "GET STARTED WITH CIRIX"),
      title: t("Tu próxima visita empieza aquí.", "Your next visit starts here."),
      intro: t("Cuéntanos un poco de tu negocio y te escribimos por WhatsApp.", "Tell us a little about your business and we'll continue on WhatsApp."),
      close: t("Cerrar el formulario", "Close form"),
      name: t("Tu nombre", "Your name"),
      namePlaceholder: t("Nombre y apellido", "First and last name"),
      business: t("Nombre del negocio", "Business name"),
      businessPlaceholder: t("Tu negocio", "Your business"),
      type: t("Tipo de negocio", "Business type"),
      typePlaceholder: t("Elige una opción", "Select an option"),
      types: [
        t("Cafetería / Restaurante", "Coffee Shop / Restaurant"),
        t("Peluquería / Belleza", "Hair Salon / Beauty"),
        t("Tienda / Comercio", "Retail Store / Shop"),
        t("Gimnasio / Bienestar", "Gym / Wellness"),
        t("Otro negocio", "Other business"),
      ],
      plan: t("Plan que te interesa", "Interested plan"),
      plans: { monthly: t("Pro · Mensual", "Pro · Monthly"), annual: t("Pro · Anual", "Pro · Annual"), advice: t("Necesito asesoría", "I need advice") },
      message: t("¿Qué te gustaría lograr?", "What would you like to achieve?"),
      optional: t("(opcional)", "(optional)"),
      messagePlaceholder: t("Más visitas, conocer mejor a mis clientes…", "More visits, understanding my customers better..."),
      submit: t("Continuar en WhatsApp", "Continue on WhatsApp"),
      note: t("Se abre WhatsApp con tu mensaje listo; tú decides si lo envías. Sin contratos ni compromiso.", "WhatsApp opens with your message ready; you decide whether to send it. No contracts, no commitment."),
      greeting: t("Hola CIRIX, quiero información sobre el programa de fidelización.", "Hello CIRIX, I'd like information about the loyalty program."),
      lines: { name: t("Nombre", "Name"), business: t("Negocio", "Business"), type: t("Tipo", "Type"), plan: t("Plan", "Plan"), goal: t("Objetivo", "Goal") },
    },
  };
}

/** The number every contact button ends up at (the same one the old home used). */
export const WHATSAPP_NUMBER = "12393403877";
