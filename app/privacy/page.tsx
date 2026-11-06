import type { Metadata } from "next";
import { COLUMN } from "@/components/store/layout";
import { getCurrentLocale, pick } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Privacy",
  robots: { index: false, follow: false },
};

const CONTACT = "info@cirixad.com";

type Section = { title: string; paragraphs?: string[]; items?: string[] };

/*
 * Draft for Cirix to review before real customers sign up: the promises about
 * selling data, messages, retention and minors are theirs to make. Keep every
 * statement true to what the code stores (see docs/receipts.md and docs/tenancy.md).
 */
const COPY: { es: { heading: string; updated: string; sections: Section[] }; en: { heading: string; updated: string; sections: Section[] } } = {
  es: {
    heading: "Política de privacidad",
    updated: "Última actualización: 6 de noviembre de 2026",
    sections: [
      {
        title: "Quiénes somos",
        paragraphs: [
          "Cirix (Fort Myers, Florida) opera esta plataforma de fidelización. Cada restaurante o supermercado administra su propio programa de sellos o puntos dentro de ella.",
        ],
      },
      {
        title: "Qué datos guardamos",
        items: [
          "Tu cuenta: el correo con el que inicias sesión y, si entras con Google, el nombre y la foto de tu perfil.",
          "Tu registro en cada negocio: nombre, teléfono si decides darlo, la fecha y cómo te registraste.",
          "Tu actividad en el programa: sellos, puntos, premios canjeados y sus fechas.",
          "De cada recibo aceptado: total, fecha, números de transacción y de comercio, y lo que ganaste.",
        ],
      },
      {
        title: "La foto de tu recibo",
        paragraphs: [
          "La foto se lee en nuestro servidor y se descarta enseguida. No guardamos la foto, el texto leído, la lista de productos ni el número de tu tarjeta.",
        ],
      },
      {
        title: "Para qué los usamos",
        paragraphs: [
          "Para llevar tu tarjeta o tus puntos, darte tus premios, evitar que un recibo se use dos veces y mostrarle al negocio la actividad de su programa. No vendemos tus datos. Hoy no te enviamos mensajes promocionales; si eso cambia, te pediremos permiso antes.",
        ],
      },
      {
        title: "Quién puede verlos",
        items: [
          "El negocio al que te uniste ve tu nombre, correo, teléfono, tu avance y tus recibos. Su personal ve solo lo necesario para validar visitas y premios.",
          "Los demás negocios de la plataforma no ven nada de esto.",
          "Nuestros proveedores guardan y procesan los datos por nosotros: Google Firebase (inicio de sesión y base de datos) y Vercel (alojamiento).",
          "Las autoridades, solo si la ley lo exige.",
        ],
      },
      {
        title: "Cookies",
        paragraphs: [
          "En el área de clientes usamos una cookie para mantener tu sesión abierta y guardamos en tu teléfono si cerraste el aviso de instalar la app. No usamos cookies de publicidad ni de medición en esta área.",
        ],
      },
      {
        title: "Cuánto tiempo y tus derechos",
        paragraphs: [
          `Conservamos tus datos mientras participes en un programa. Puedes pedirnos una copia, corregirlos o borrarlos escribiendo a ${CONTACT}. Si los borramos, pierdes tus sellos y puntos.`,
        ],
      },
      {
        title: "Menores de edad",
        paragraphs: ["Estos programas no están dirigidos a menores de 13 años, y no recogemos sus datos a sabiendas."],
      },
      {
        title: "Cambios y contacto",
        paragraphs: [`Si cambiamos esta política, actualizaremos la fecha de arriba. Para cualquier duda, escríbenos a ${CONTACT}.`],
      },
    ],
  },
  en: {
    heading: "Privacy policy",
    updated: "Last updated: November 6, 2026",
    sections: [
      {
        title: "Who we are",
        paragraphs: [
          "Cirix (Fort Myers, Florida) runs this loyalty platform. Each restaurant or supermarket manages its own stamp or points program on it.",
        ],
      },
      {
        title: "What we store",
        items: [
          "Your account: the email you sign in with and, if you use Google, your profile name and photo.",
          "Your signup at each business: your name, your phone if you choose to give it, the date and how you signed up.",
          "Your program activity: stamps, points, redeemed rewards and their dates.",
          "For each accepted receipt: the total, date, transaction and merchant numbers, and what you earned.",
        ],
      },
      {
        title: "Your receipt photo",
        paragraphs: [
          "The photo is read on our server and discarded right away. We don't keep the photo, the text read from it, the list of products or your card number.",
        ],
      },
      {
        title: "What we use it for",
        paragraphs: [
          "To run your card or points, give you your rewards, stop a receipt from being used twice and show the business its program's activity. We don't sell your data. We don't send you promotional messages today; if that changes, we'll ask for your permission first.",
        ],
      },
      {
        title: "Who can see it",
        items: [
          "The business you joined sees your name, email, phone, progress and receipts. Its staff see only what they need to validate visits and rewards.",
          "Other businesses on the platform see none of this.",
          "Our providers store and process data for us: Google Firebase (sign-in and database) and Vercel (hosting).",
          "Authorities, only when the law requires it.",
        ],
      },
      {
        title: "Cookies",
        paragraphs: [
          "In the customer area we use one cookie to keep you signed in, and we save on your phone whether you closed the install-the-app notice. We don't use advertising or measurement cookies in this area.",
        ],
      },
      {
        title: "How long, and your rights",
        paragraphs: [
          `We keep your data while you take part in a program. You can ask for a copy, correct it or delete it by writing to ${CONTACT}. If we delete it, you lose your stamps and points.`,
        ],
      },
      {
        title: "Minors",
        paragraphs: ["These programs aren't directed at children under 13, and we don't knowingly collect their data."],
      },
      {
        title: "Changes and contact",
        paragraphs: [`If we change this policy, we'll update the date above. For any question, write to ${CONTACT}.`],
      },
    ],
  },
};

/** Public, so anyone can read it before creating an account. */
export default async function PrivacyPage() {
  const locale = await getCurrentLocale();
  const copy = pick(locale, COPY);

  return (
    <main className={`${COLUMN} flex min-h-dvh flex-1 flex-col gap-6 py-10 md:max-w-2xl`}>
      <header className="flex flex-col gap-1">
        <h1 className="text-display font-bold tracking-tight text-text">{copy.heading}</h1>
        <p className="text-label text-text-muted">{copy.updated}</p>
      </header>
      {copy.sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="text-body font-medium text-text">{section.title}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="text-label text-text-muted">{paragraph}</p>
          ))}
          {section.items && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-label text-text-muted">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
