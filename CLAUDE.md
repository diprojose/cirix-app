# Cirix Tech Platform

**Cirix Tech Platform** es un **MVP de e-commerce de supermercado** para el estado de **Florida**, construido como aplicación web progresiva (**PWA**) con Next.js. Es una **demostración**: su propósito es enseñar, con la menor fricción posible, cómo funciona un programa de **retención** basado en un **Ledger de Recompensas (wallet)** append-only, alimentado por **cupones**, **referidos** y un **hook de recompra**.

> **Principio rector: la retención es el motor; los cupones y los referidos son el combustible. Todos operan sobre un único Ledger de Recompensas (wallet) append-only.**
>
> Cada feature existe para que ese principio se pueda *ver* y *tocar* en pocos taps. Si un cambio no acerca o no facilita esa demostración, no pertenece a este MVP.

> **Neutralidad de segmento (obligatoria).** El dominio **no hornea ninguna suposición de nacionalidad, etnia ni idioma**. Florida es un mercado internacional (múltiples diásporas, jubilados, snowbirds). El *código* es agnóstico al segmento y multi-idioma desde el día uno; la *cabeza de playa* a la que se mensajea la demo es una decisión de **configuración**, no de dominio. Ver "Neutralidad de segmento e i18n".

Desarrollo **mobile-first**: el móvil es el escenario principal y se diseña/prueba primero. El escritorio debe funcionar y verse bien, pero no manda las decisiones de diseño.

> Las reglas de código (todo en inglés) y de commits (Conventional Commits con emoji, sin co-autor de Claude) están en las reglas globales del usuario y **también aplican aquí**. Este documento no las repite.

---

## Cambios respecto a la versión anterior (leer antes de implementar)

Este proyecto pivotó desde una tienda de postres por encargo hacia un e-commerce de supermercado centrado en retención. Aplicar de forma explícita:

- **Columna vertebral nueva:** bounded context **`rewards`** (Ledger append-only / wallet). Ver "El Ledger de Recompensas".
- **Hook de retención nuevo:** bounded context **`engagement`** — motor `evento → política → (entradas al Ledger + disparadores)` que implementa el loop de recompra. Ver "Hook de retención".
- **Catálogo:** ya no es postres "por encargo, sin stock". Es catálogo de supermercado; para la demo, **solo verduras con su imagen** (nombre, precio, imagen). El inventario/stock queda **fuera de alcance**.
- **Eliminado por completo:** el área de **suscripción a recetas** (contenido premium, video, rutas protegidas por suscripción). Borrar módulos, rutas, componentes y toda referencia.
- **PWA baja de prioridad.** La instalabilidad debe seguir funcionando pero **deja de ser la "regla de oro"**. La nueva regla de oro es la integridad del Ledger.
- **i18n desde el arranque:** mínimo español + inglés; el copy vive en diccionarios, no hardcodeado. Ver "Neutralidad de segmento e i18n".
- **Sin suposiciones de segmento** en el dominio (ver el recuadro de arriba).

---

## Producto / dominio

Dos áreas funcionales (recetas fue eliminada):

### 1. Tienda de supermercado

- Catálogo con imágenes de alta calidad. Para la demo: **solo verduras**, cada una con imagen, nombre y precio.
- **Sin gestión de inventario/stock** en este MVP: el foco es la retención, no la logística. Los productos son un pretexto realista para generar pedidos que alimenten el wallet.
- **Carrito y checkout** mobile-first. El checkout es donde el wallet **se llena** (earn) y **se gasta** (redención).

> El agregado del catálogo es `Product` (raíz), clasificado por el value object `Department`, con `imageUrl`. La home (`app/page.tsx`) es su adaptador primario. `modules/catalog/` es la implementación de referencia de la arquitectura.

### 2. Recompensas + retención — el corazón del MVP

- Cada cliente tiene un **wallet**: un **Ledger append-only** de movimientos.
- El wallet **se llena** al comprar (earn), aplicar cupón, referir, recibir un regalo y por el hook de recompra. Se **vacía** al redimir o al regalar saldo.
- El balance **nunca se almacena mutable**: siempre es la **proyección** (la suma) del historial.

---

## Stack

- **Framework:** Next.js **16** (App Router, **Turbopack** por defecto en dev y build)
- **UI:** React **19** + TypeScript
- **Estilos:** Tailwind CSS **v4**
- **i18n:** diccionarios por locale (p. ej. `next-intl` o dictionaries del App Router). Locales base: `es`, `en`; `ht` (créole) y `pt` como *packs* que se agregan sin tocar dominio.
- **Service Worker / offline:** SW manual en `public/sw.js`, registrado desde un componente cliente.
- **Deploy sugerido:** Vercel (HTTPS automático).

> **Por qué SW manual y no Serwist / next-pwa:** en Next 16 el bundler por defecto es Turbopack; los plugins de `@serwist/next` / `next-pwa` dependen de webpack y no corren en el build por defecto. Un `public/sw.js` estático es agnóstico del bundler. La PWA es secundaria: mantenerla simple.

> Next 16 tiene **breaking changes**. Antes de escribir código de Next, consultar `node_modules/next/dist/docs/` (ver `AGENTS.md`).

---

## Arquitectura: hexagonal + DDD

Todo el negocio sigue **arquitectura hexagonal (puertos y adaptadores) con DDD**. La capa `app/` es solo entrega (adaptadores primarios); el dominio **no conoce el framework**. `modules/catalog/` es la referencia — copiar su estructura para cada contexto nuevo.

```
modules/<context>/
  domain/          # entidades, value objects, puertos (contratos), errores — TS puro
  application/     # use cases, DTOs — orquesta el dominio
  infrastructure/  # adapters concretos (repos), mappers, composition root (di/)
shared/
  domain/          # Result, DomainError, Entity, AggregateRoot, ValueObject, Identifier
  application/      # UseCase
```

### Módulos (bounded contexts)

- **`catalog`** — productos de supermercado (verduras con imagen). Ya existe; es la plantilla.
- **`rewards`** — Ledger de Recompensas / wallet append-only. **Central.** Ver su sección.
- **`ordering`** — pedidos/checkout; dispara earn/redeem sobre `rewards`.
- **`engagement`** — hook de retención: reacciona a eventos y decide qué recompensa/disparador emitir. Ver su sección.

> **Eliminados:** `subscription` y `recipes` no forman parte de este MVP. Si hay restos, borrarlos.

### Regla de dependencias (obligatoria)

Dependencias **solo hacia adentro**: `app/ → infrastructure/ → application/ → domain/`.

- `domain/` **no** importa de `application/`, `infrastructure/`, `app/`, `react` ni `next`. TS puro.
- `application/` importa **solo** su `domain/` + el shared kernel. Depende de **interfaces**, nunca de implementaciones.
- `infrastructure/` implementa los puertos de `domain/`. Sustituir un adapter (in-memory → base de datos) **no debe tocar** dominio ni aplicación.
- **Entre contextos:** un módulo no importa el `domain/` de otro. `engagement` y `ordering` orquestan `rewards` por su **puerto de aplicación** o vía el composition root.

### Abstracciones del kernel

- **`Result<T, E>`**: unión discriminada `{ ok: true, value } | { ok: false, error }`. Los use cases **devuelven `Result`**, no lanzan, para fallos de negocio (p. ej. `InsufficientBalance`, `CouponNotFound`). Helpers `ok` / `err` / `isOk` / `isErr`.
- **`UseCase<TInput, TOutput>`**: `execute(input): Promise<Result<TOutput, DomainError>>`.
- **`DomainError`**: base con `code` estable para mapear a HTTP/UI en el borde.
- Bloques DDD: `Entity`, `AggregateRoot`, `ValueObject`, `Identifier`.

### Borde RSC (serialización)

Lo que cruce server→client debe ser **objetos planos serializables**. Las instancias de clase se quedan en el servidor: los use cases devuelven **DTOs** (`application/dtos/`) y los errores se mapean a `{ code, message }`. El cliente recibe `WalletBalanceDto` y `LedgerEntryDto[]`, nunca la entidad del ledger.

---

## El Ledger de Recompensas (`modules/rewards`) — la columna vertebral

Un **libro mayor append-only**: secuencia ordenada de movimientos inmutables; el balance es siempre la **suma**.

### Invariantes (no negociables)

1. **Append-only:** una entrada nunca se modifica ni se borra. Toda corrección es una **nueva** entrada `ADJUSTMENT`.
2. **Balance = proyección pura:** `balance(wallet) = Σ entry.amount`. No existe campo `balance` mutable. El saldo disponible se calcula, no se guarda.
3. **Idempotencia:** cada operación lleva `idempotencyKey`. Reintentar con la misma clave **no crea** una segunda entrada — devuelve la existente.
4. **No negativo por débito:** un débito (redención o regalo) se valida contra el saldo disponible **antes** de escribir; si no alcanza, `err(InsufficientBalance)` y no se escribe.
5. **Todo valor pasa por aquí:** cualquier crédito/débito de recompensas es una entrada. No hay bonus, descuento ni transferencia fuera del ledger.

### Dominio (`modules/rewards/domain/`)

Agregado raíz: **`WalletLedger`** (por `WalletId`, uno por cuenta). Contiene la secuencia de `LedgerEntry` y valida antes de anexar.

**`LedgerEntry`** (inmutable): `entryId`, `walletId`, `kind: EntryKind`, `amount: RewardPoints` (entero **con signo**), `reference: EntryReference` (`OrderRef` | `CouponRef` | `ReferralRef` | `GiftRef` | `AdjustmentRef`), `idempotencyKey`, `occurredAt`.

**`EntryKind`:**

- `EARNED_PURCHASE` — crédito al completar un pedido (incluye recompra y earn variable del hook)
- `REDEEMED_ORDER` — débito por gastar saldo en checkout
- `COUPON_CREDIT` — crédito por cupón (incluye bienvenida, dirigidos, BOGO)
- `REFERRAL_BONUS_REFERRER` / `REFERRAL_BONUS_REFEREE` — créditos de referido
- `GIFT_DEBIT` — débito en quien **envía** saldo a otra persona
- `GIFT_CREDIT` — crédito en quien **recibe** el regalo
- `ADJUSTMENT` — crédito/débito manual, milestone o corrección

**Puerto** (`domain/repositories/rewards-ledger-repository.ts`):

```ts
export interface RewardsLedgerRepository {
  append(entry: LedgerEntry): Promise<void>;
  listByWallet(walletId: WalletId): Promise<LedgerEntry[]>;
  findByIdempotencyKey(walletId: WalletId, key: string): Promise<LedgerEntry | null>;
}
```

**Errores:** `InsufficientBalance`, `CouponNotFound`, `CouponAlreadyRedeemed`, `ReferralAlreadyGranted`, `GiftToSelfNotAllowed`, `WalletNotFound` — cada uno con `code`.

### Aplicación (`modules/rewards/application/`)

Use cases (devuelven `Result`, idempotentes vía `idempotencyKey`):

- `CreditPurchaseRewardsUseCase({ walletId, orderId, orderTotal, points, idempotencyKey })` — anexa `EARNED_PURCHASE` (el monto lo calcula quien llama; el hook pasa el earn variable ya resuelto).
- `RedeemRewardsUseCase({ walletId, orderId, points, idempotencyKey })` — valida saldo; anexa `REDEEMED_ORDER` (negativo) o `err(InsufficientBalance)`.
- `ApplyCouponUseCase({ walletId, couponCode, idempotencyKey })` — valida cupón, anexa `COUPON_CREDIT`.
- `GrantReferralBonusUseCase({ referrerWalletId, refereeWalletId, referralId })` — anexa **dos** entradas, cada una con `idempotencyKey` derivado de `referralId`.
- `GiftWalletCreditUseCase({ fromWalletId, toWalletId, points, giftId })` — **operación atómica de dos entradas enlazadas**: valida saldo del emisor, anexa `GIFT_DEBIT` (fromWallet) y `GIFT_CREDIT` (toWallet), ambas con `idempotencyKey` derivado de `giftId`. Prohíbe regalarse a sí mismo (`GiftToSelfNotAllowed`).
- `GetWalletBalanceUseCase({ walletId })` → `WalletBalanceDto`.
- `GetWalletHistoryUseCase({ walletId })` → `LedgerEntryDto[]` ordenado — **la vista estrella de la demo**.

DTOs: `WalletBalanceDto { walletId, balance, unit }`, `LedgerEntryDto { id, kind, amount, reason, occurredAt }`.

### Infraestructura (`modules/rewards/infrastructure/`)

- `InMemoryRewardsLedgerRepository` — adapter de referencia (array append, filtro por `walletId`, lookup por `idempotencyKey`).
- `InMemoryCouponRegistry` — códigos precargados para la demo (incluye un cupón tipo BOGO). No requiere bounded context propio en el MVP.
- `di/rewards-container.ts` — composition root manual: instancia adapters e inyecta por constructor a los use cases vía factories `make…()`. Sin decoradores ni `reflect-metadata`.

### Verificación del módulo rewards

- `GetWalletBalanceUseCase` **siempre** iguala la suma de `listByWallet`. No hay otra fuente de verdad.
- Repetir cualquier use case con el mismo `idempotencyKey` no cambia el número de entradas ni el balance.
- Regalar/redimir más que el saldo disponible → `err(InsufficientBalance)`, sin escribir.
- `GiftWalletCreditUseCase` escribe **exactamente dos** entradas y la suma de ambas es cero (el punto no se crea ni se destruye, se transfiere).
- Ningún archivo de `rewards/domain/` o `rewards/application/` importa `next`, `react` ni `infrastructure/`.

---

## Mecanismos de abordamiento al cliente

Un "hook" no es un cupón: es un **loop** (Disparador → Acción → Recompensa **variable** → Inversión). El valor está en el loop, no en promociones sueltas. Distinguir dos capas:

- **Mecanismos de valor** (dan/quitan crédito en el Ledger): earn, cupón, referido, regalo, redención. El *combustible*.
- **Mecanismos de canal** (cómo avisas al cliente): push (SW ya tiene handlers), badge de saldo in-app, email. Cómo *entregas* el combustible.

### Los cinco mecanismos del MVP (todos demostrables en móvil)

1. **Referido** — comparte enlace → el referido se registra/compra → ambos reciben crédito. Único loop viral demostrable; el bono se dispara con el **primer pedido completado** del referido, con **segundo bono** cuando el referido **recompra**.
2. **Crédito de bienvenida** — al registrarse, `COUPON_CREDIT` con expiración corta. Convierte visitante → primera compra.
3. **Earn por compra** — cashback al wallet. Calibrado a **margen fino de grocery: 1–2%** o por umbral de frecuencia/canasta, **no** cashback generoso (te funde).
4. **Cupón dirigido vía push** — formato **BOGO** (2x1 / "lleva 3 paga 2"), lenguaje que el comprador de Florida ya conoce. Canal + valor + Ledger en un gesto.
5. **Redención en checkout** — toggle "usar mi saldo" que descuenta del total y escribe `REDEEMED_ORDER`.

> **Apéndice — canales externos (FUERA del MVP, no demostrables en la app):** ads pagados, SEO, redes sociales, email/SMS masivo, alianzas locales. Nombrarlos en el plan de go-to-market, **no** construirlos aquí. Nota estratégica: los referidos *amplifican* pero no *originan* la primera cohorte; un lanzamiento real necesita un canal semilla que la demo no muestra.

### Enfoque supermercado (grocery cambia el diseño)

- **Frecuencia alta, margen fino:** la gente compra comida semanalmente, pero el margen neto ronda 1–3%. Por eso el earn es chico y/o por umbral, no porcentaje alto.
- **Retención = hábito, no campaña:** el mecanismo que más retiene es la **recompra en un tap + canasta recurrente**. Es el motor concreto (ver el hook y "Canasta recurrente"). Cupones y referidos son combustible.
- **KPI = frecuencia y tamaño de canasta**, no la conversión única. Diseñar earn/redeem para premiar "pediste N veces este mes" o "canasta > $X".
- **Cultura de cupón local:** el formato BOGO es el lenguaje esperado del comprador de supermercado en Florida.
- **Estacionalidad:** segmento "dormido/en riesgo" incluye residentes de temporada que se van del estado ("snowbird"); el reenganche estacional es un caso real.
- **Gatillo de temporada de huracanes:** la demanda de comestibles se dispara antes de una tormenta; un momento "prepara tu despensa" con push + cupón es un abordamiento propio de Florida. Modelarlo como un disparador de campaña, opcional en el MVP.

### Neutralidad de segmento e i18n

- **Código agnóstico al segmento.** El dominio **no** conoce nacionalidad, etnia ni idioma. `GIFT_*`, wallet de hogar y demás primitivas son neutras.
- **i18n desde el día uno.** Todo el copy vive en diccionarios por locale (`es`, `en` mínimo; `ht`, `pt` como packs). Prohibido hardcodear texto en componentes o dominio. Retrofitear i18n después es caro.
- **La cabeza de playa es configuración, no dominio.** A qué segmento se mensajea la demo (copy, cupones destacados, locale por defecto) vive en una capa de config/segmento. Cambiar de segmento = cambiar config, no reescribir dominio.
- **Default de la demo:** segmento **"hogares que mandan mercado a los suyos"** (conducta de remesa/ayuda familiar, transversal a varias diásporas de Florida), con locale por defecto `es` y `en` disponible. Es un *default de config*, no una suposición horneada.

---

## Hook de retención — `modules/engagement`

Implementa el loop de recompra para **clientes nuevos y actuales**: un solo loop con dos puertas de entrada. Los nuevos entran por la **escalera de bienvenida** y quedan depositados en la misma **racha** que corren los actuales. No son dos sistemas.

### El loop (modelo de hook)

- **Disparador:** push / badge in-app ("tu recompensa semanal está lista", "tu racha rompe en 2 días").
- **Acción (mínima fricción):** *recomprar en un tap* la última canasta.
- **Recompensa variable:** el earn que cae al wallet **no es fijo** (a veces 1%, a veces sorpresa 5% o BOGO). La variabilidad engancha; lo predecible aburre.
- **Inversión:** cada pedido sube la racha y el saldo → costo de cambio. Saldo + racha = valor guardado que no se quiere abandonar.

### Motor `evento → política → (entradas + disparadores)`

`engagement` reacciona a eventos de dominio y, según el estado del cliente, decide qué entrada escribir en el Ledger (llamando use cases de `rewards` por su puerto) y qué disparador emitir.

### Estado del cliente (proyección, no mutable)

Derivado del Ledger + historial de pedidos: `orderCount`, `lastOrderAt`, `currentStreak` (semanas consecutivas con pedido), `balance`. Se recalcula, nunca se persiste como número editable.

### Eventos que alimentan el motor

- `CustomerRegistered { customerId, walletId }`
- `OrderCompleted { orderId, customerId, walletId, total, itemCount, placedAt }`
- `InactivityDetected { customerId, daysSince }` — emitido por un job programado

### Políticas (montos de ejemplo — ajustar al margen 1–2%)

Nuevos (escalera de activación):
- `CustomerRegistered` → `COUPON_CREDIT` bienvenida $5, expira +7 días. Push de bienvenida.
- 1er `OrderCompleted` → earn variable + desbloquea cupón de 2º pedido ("2º pedido en 7 días → +$8"). Si al día 5 no hay 2º pedido → push recordatorio.
- 2º pedido en la ventana → bono e **inicia la racha** (entran al loop de existentes).

Existentes (racha):
- `OrderCompleted` a ≤7 días del anterior → `currentStreak++` + earn **variable** (tiers ponderados: 70% base 1%, 25% 3%, 5% sorpresa 5%/BOGO).
- Hito de racha (cada 4 semanas) → `ADJUSTMENT` de bono milestone + push de logro.
- `InactivityDetected` (p. ej. 10 días) → `COUPON_CREDIT` dirigido, expiry corto + push "tu racha rompe, +$X para volver" (aversión a la pérdida).

### Recompensa variable, pero reproducible para la demo

**No usar random puro.** Derivar el tier de un **hash determinista de `orderId`** → se *siente* aleatorio para el usuario pero es reproducible en el demo (garantizas que "este pedido dispara la sorpresa"). Sin esto, no puedes demostrar la variabilidad en vivo sin depender de la suerte. Use case: `ResolveRewardTier(orderId) → tier`.

### Idempotencia + append-only

Cada recompensa es una entrada con `idempotencyKey = eventId`. Reprocesar un evento **no** duplica el premio. La racha se recalcula desde el Ledger + pedidos.

### Disparadores en el tiempo + demo

Los eventos por tiempo (expiración de crédito, inactividad, nudge del día 5) necesitan un **scheduler** (cron / edge function) que emita `InactivityDetected`. Para la demo, agregar un **botón "avanzar el tiempo N días"** (server action) que simula el job sin esperar días reales. Sin eso, el hook no es demostrable en minutos.

### Mapa evento → política → entrada → disparador

| Evento | Política | Entrada al Ledger | Disparador |
|---|---|---|---|
| Registro | Bienvenida | `COUPON_CREDIT` $5 (expira 7d) | push + badge |
| 1er pedido | Desbloqueo 2º | `EARNED_PURCHASE` variable | push día 5 |
| Recompra ≤7d | Racha + variable | `EARNED_PURCHASE` variable | badge racha |
| Racha 4 sem | Milestone | `ADJUSTMENT` bono | push logro |
| Inactivo 10d | Rescate | `COUPON_CREDIT` corto | push aversión |

### Use cases a implementar

`HandleCustomerRegistered`, `HandleOrderCompleted`, `HandleInactivityDetected`, `ResolveRewardTier`, `GetEngagementStateProjection`. Del lado `rewards`, reutiliza `ApplyCoupon` / `CreditPurchaseRewards`.

---

## Ideas de valor sobre el Ledger

El activo diferenciador es que el ledger sea **append-only**: no un saldo, sino un **stream de comportamiento atribuible e inmutable**. Las ideas de mayor valor son las que **solo** funcionan por eso. Priorizadas para el MVP:

### 1. "Regala mercado" — transferencia de saldo entre clientes (héroe de la demo)

Ya modelado arriba como `GiftWalletCreditUseCase` (`GIFT_DEBIT` + `GIFT_CREDIT` enlazadas por `giftId`). Es adquisición viral (el que recibe abre cuenta para reclamar), emocional y difícil de copiar sin un ledger append-only atribuible. Framear como **conducta** ("manda mercado a los tuyos"), no como etnia. Flujo de demo: A regala $10 → aparece `GIFT_DEBIT` en A y `GIFT_CREDIT` en B → B lo ve en su historial al instante.

### 2. Wallet de hogar compartido — "la canasta familiar"

Varios `customerId` escriben sobre un mismo `WalletId`. El append-only maneja escrituras concurrentes sin condiciones de carrera (cada quien anexa; el balance es la suma). Multiplica el costo de cambio: se tiene que ir todo el hogar, no una persona. Modelar la relación cliente↔wallet como muchos-a-uno; el resto del ledger no cambia.

### 3. Canasta recurrente — el motor estructural

Suscripción a la canasta semanal: genera un pedido recurrente con **earn potenciado** vs. compra suelta. Es lo que estructuralmente baja el churn en grocery. Cada ciclo escribe su `EARNED_PURCHASE`. Modelar como un pedido programado que dispara `OrderCompleted` y entra al hook como recompra.

### 4. Promos retroactivas + ledger auditable como confianza

Dos superpoderes del append-only: (a) **retroactivo** — lanzar "todos los que compraron esta semana reciben +$3" *anexando* entradas, sin migración ni recomputar saldos; (b) **auditable** — mostrar al cliente su historial completo e inmutable ("nunca perdiste un punto"). Confianza como feature. El historial (`GetWalletHistoryUseCase`) ya es esta vista.

### Banco de ideas (segundo nivel — no inflar el MVP)

- **Seguro de racha:** gastar saldo para *proteger* una racha → le da un uso al saldo más allá del descuento.
- **Compra en grupo por edificio/condominio:** referido que acredita a un pool compartido → descuento por volumen. Adquisición comunitaria.
- **Redondeo solidario** a un banco de comida de Florida como sink de saldo con causa.
- **Precio congelado** de un básico para miembros, financiado con wallet.
- **"Tu cashback te fía" (micro-BNPL):** potente pero **pisa terreno regulatorio de crédito al consumo** — no en el MVP, anotarlo como visión.

---

## Regla de oro: la integridad del Ledger no se rompe

Reemplaza a la antigua (instalabilidad PWA). Todo cambio que toque recompensas debe preservar:

1. **Append-only:** nunca `update`/`delete` de entradas; correcciones = `ADJUSTMENT`.
2. **Balance = proyección:** ningún saldo persistido mutable.
3. **Idempotencia:** toda escritura lleva `idempotencyKey` y es segura ante reintentos.
4. **Conservación en transferencias:** un regalo escribe dos entradas que suman cero.
5. **Todo pasa por el ledger:** ningún crédito/débito ocurre fuera de él.

Si un cambio viola cualquiera, la tarea no está terminada.

---

## PWA (secundaria — debe seguir funcionando)

Ya **no** es la regla de oro, pero la app debe seguir instalable y navegable. Mantener funcionando sin invertir en pulido extra:

1. **Web App Manifest** — `app/manifest.ts` (`/manifest.webmanifest`). Mínimos: `display: "standalone"`, `start_url` válido, iconos 192×192 y 512×512 PNG, al menos uno `purpose: "maskable"`, `theme_color`/`background_color` acordes al branding de supermercado.
2. **Service Worker** — `public/sw.js`, registrado desde `components/pwa-installer.tsx` (montado en `app/layout.tsx`). Precache del app shell mínimo; navegaciones network-first con fallback a `/offline`; assets stale-while-revalidate. Subir `CACHE_VERSION` ante cualquier cambio. **No cachear** wallet/checkout/APIs autenticadas.
3. **iOS / iPadOS:** `apple-touch-icon` en `app/apple-icon.png` (180×180 PNG sin transparencia), `appleWebApp.capable: true`, respetar safe areas. Instalación manual (Compartir → "Agregar a la pantalla de inicio").
4. **Android / Chromium:** manifest + SW válidos disparan `beforeinstallprompt`; capturarlo para un botón propio.

> Iconos actuales = placeholders. Reemplazar por arte de supermercado (mantener tamaños; maskable con zona de seguridad).

---

## Mobile-first / i18n / navegador

- **Mobile-first:** diseñar y probar primero en móvil (~360–430px), luego escalar. El escritorio funciona bien pero no dicta el layout.
- UX móvil: áreas táctiles ≥ 44px, checkout corto, navegación al alcance del pulgar, wallet a un tap, legible sin zoom.
- **i18n:** todo texto desde diccionarios; selector de idioma accesible; `es`/`en` mínimo. Nada de copy hardcodeado.
- Rendimiento móvil: `next/image`, evitar bundles pesados.
- Nada depende de estar instalado: comprar, cupón, referido, regalo, recompra, redimir y ver el ledger funcionan también en pestaña de navegador.

---

## Estructura de carpetas (referencia)

```
app/
  [locale]/             # rutas localizadas (i18n)
    layout.tsx          # metadata + viewport (incl. apple-web-app) + <PwaInstaller/>
    page.tsx            # home pública (catálogo de verduras con imagen)
    wallet/page.tsx     # saldo + historial (el Ledger visible) + "regala mercado"
    checkout/...        # checkout con earn/redeem sobre el wallet
    offline/page.tsx    # fallback offline servido por el SW
  manifest.ts           # Web App Manifest → /manifest.webmanifest
  apple-icon.png        # apple-touch-icon 180x180
  icon.png              # icono base 512
i18n/                   # diccionarios por locale (es, en, ht, pt) + config
shared/                 # shared kernel (agnóstico de dominio)
  domain/  application/
modules/                # bounded contexts (hexagonal + DDD)
  catalog/              # productos (verduras con imagen) — referencia
  rewards/              # Ledger append-only — columna vertebral
    domain/             # WalletLedger, LedgerEntry, EntryKind (incl. GIFT_*),
                        #   RewardsLedgerRepository (puerto), errores
    application/        # credit, redeem, apply-coupon, grant-referral, gift,
                        #   get-balance, get-history + DTOs
    infrastructure/     # InMemoryRewardsLedgerRepository, InMemoryCouponRegistry,
                        #   di/rewards-container.ts
  ordering/             # pedidos/checkout; dispara earn/redeem sobre rewards
  engagement/           # hook de retención (evento → política → entrada + trigger)
    domain/             # políticas, estado del cliente (proyección)
    application/        # Handle* use cases, ResolveRewardTier, GetEngagementState
    infrastructure/     # scheduler adapter, di/engagement-container.ts
components/
  store/                # cards, chips, navs de tienda
  wallet/               # badge de saldo, lista del ledger, racha, regalar mercado
  pwa-installer.tsx     # 'use client': registra el SW + botón instalar (Android)
public/
  sw.js                 # service worker (offline)
  icon-*.png            # iconos del manifest (any + maskable)
next.config.ts          # headers de seguridad + Cache-Control de /sw.js
```

> Carpetas **eliminadas**: todo lo de `subscription`/`recipes`.

---

## Verificación antes de terminar una tarea

En orden de prioridad:

1. **Integridad del Ledger** (regla de oro): append-only, balance = proyección, idempotencia, conservación en regalos, todo valor pasa por el ledger. Ver "Verificación del módulo rewards".
2. **Flujos de la demo** en móvil, cada uno reflejando el wallet al instante: comprar (earn), cupón/BOGO, referido, **regala mercado**, recompra en un tap, redención, y el hook (bienvenida → racha → rescate por inactividad con el botón "avanzar tiempo").
3. **Neutralidad de segmento + i18n:** ningún texto hardcodeado; `es`/`en` funcionan; el dominio no contiene suposiciones de nacionalidad/etnia/idioma.
4. **Arquitectura:** `npx tsc --noEmit` y `npm run build` sin errores. Ningún archivo bajo `domain/` o `application/` (de cualquier módulo) importa `next`, `react` ni `infrastructure/`. Reemplazar un adapter en `di/<context>-container.ts` no requiere tocar `domain/` ni `application/`. Ningún módulo importa el `domain/` de otro.
5. **Sin restos del pivote:** no quedan referencias a postres, "por encargo/sin stock", suscripción ni recetas.
6. **PWA (secundaria):** `/manifest.webmanifest` y `/sw.js` accesibles; instalable en Android e iOS; app shell offline; funciona en escritorio sin instalar.

Si algún punto de 1–5 falla, la tarea no está completa. El punto 6 no debe bloquear la demo de retención, pero no debe quedar roto.