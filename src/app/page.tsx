import Link from "next/link";
import { ArrowRight, Calculator, FileText, PenTool } from "lucide-react";
import { BocetoPortada } from "@/components/BocetoPortada";
import { Comparador } from "@/components/Comparador";
import { AnilloIlustracion } from "@/components/AnilloIlustracion";
import { calcularCotizacion, cotizacionInicial, formatoMoneda } from "@/lib/cotizacion";
import { COLORES_LAPIZ, metalPorId } from "@/lib/materiales";

const PARA_QUIEN = [
  "Joyeros independientes",
  "Talleres de alta joyería",
  "Modeladores CAD",
  "Tiendas de anillos de compromiso",
  "Gemólogos",
  "Marcas de autor",
];

const PREGUNTAS = [
  {
    p: "¿Necesito saber dibujar o usar CAD?",
    r: "No. Basta un boceto rápido, aunque sea de líneas sueltas, o una foto de tu cuaderno. Los colores del lápiz le indican a la IA qué material es cada trazo: oro, platino, oro rosa, zafiro, rubí o esmeralda.",
  },
  {
    p: "¿El render sirve para fabricar la pieza?",
    r: "El render es para decidir y vender: muestra a tu cliente cómo se verá la joya. Para fabricarla, el plano técnico que genera NYVORA le da a tu modelador CAD una base clara, pero las medidas finales las define el taller.",
  },
  {
    p: "¿Cómo se calcula el precio?",
    r: "Con tus números: peso del metal según su ley y el precio spot del día, merma de fundición, piedras por quilate, horas de taller, engaste y tu margen sobre el precio de venta. Puedes estimar el peso de una argolla a partir de la talla, el ancho y el grosor.",
  },
  {
    p: "¿Dónde se guardan mis diseños?",
    r: "En esta primera versión, en tu propio navegador. Nada se sube a otro servidor salvo el boceto que envías a la IA para generar el render. Las cuentas con nube compartida llegan en la siguiente fase.",
  },
  {
    p: "¿Qué inteligencia artificial usa?",
    r: "NYVORA usa los modelos de imagen más avanzados: Nano Banana Pro de Google y GPT Image 2 de OpenAI, con renders a 2K. Tu clave queda en el servidor y nunca llega al navegador.",
  },
];

function MiniCotizacion() {
  const datos = cotizacionInicial("USD");
  const r = calcularCotizacion(datos);
  const tarjetas = [
    { t: "Metal", v: r.metal },
    { t: "Piedras", v: r.piedras },
    { t: `Margen (${datos.margenPct}%)`, v: r.margen },
  ];
  return (
    <div className="tarjeta p-5 sm:p-6" aria-label="Ejemplo de cotización">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tarjetas.map((x) => (
          <div key={x.t} className="rounded-xl border border-linea p-3 text-center">
            <p className="etiqueta text-[0.6rem] tracking-[0.1em] whitespace-nowrap">{x.t}</p>
            <p className="cifra mt-1 text-xl">{formatoMoneda(x.v, "USD")}</p>
          </div>
        ))}
        <div className="rounded-xl bg-noche p-3 text-center text-white">
          <p className="etiqueta text-[0.6rem] tracking-[0.1em] whitespace-nowrap text-oro-claro">Precio final</p>
          <p className="cifra mt-1 text-xl">{formatoMoneda(r.precio, "USD")}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <dl className="rounded-xl border border-linea p-4 text-sm">
          <p className="titulo-display mb-2 text-lg">Diseño</p>
          {[
            ["Metal", metalPorId(datos.metalId).nombre],
            ["Peso", `${datos.pesoGramos} g`],
            ["Taller", `${datos.horas} h estimadas`],
            ["Talla", "7 (US)"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-linea/70 py-1.5 last:border-0">
              <dt className="text-humo">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="rounded-xl border border-linea p-4 text-sm">
          <p className="titulo-display mb-2 text-lg">Piedras</p>
          {datos.piedras.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b border-linea/70 py-1.5 last:border-0">
              <span>
                {p.cantidad} × {p.quilates.toFixed(2)} ct <span className="text-humo">diamante</span>
              </span>
              <span className="font-medium">{formatoMoneda(p.cantidad * p.quilates * p.precioQuilate, "USD")}</span>
            </div>
          ))}
          <p className="mt-3 text-xs text-humo">Valores de ejemplo: cada joyero pone sus precios.</p>
        </div>
      </div>
    </div>
  );
}

function PropuestaMuestra() {
  return (
    <div className="tarjeta overflow-hidden" aria-label="Ejemplo de propuesta para cliente">
      <div className="grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="aspect-square bg-marfil">
          <AnilloIlustracion variante="render" id="muestra" />
        </div>
        <div className="flex flex-col p-6">
          <p className="etiqueta">Solitario · Propuesta</p>
          <p className="titulo-display mt-2 text-3xl">Aurora</p>
          <p className="font-display text-lg text-humo italic">Diamante redondo · Oro amarillo 18k</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Talla", "Redonda brillante"],
              ["Metal", "Oro 18k"],
              ["Estilo", "Clásico"],
              ["Engaste", "Cuatro garras"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-linea px-3 py-2">
                <p className="etiqueta text-[0.6rem]">{k}</p>
                <p>{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-6">
            <div>
              <p className="etiqueta text-[0.6rem]">Inversión</p>
              <p className="cifra text-2xl">{formatoMoneda(calcularCotizacion(cotizacionInicial("USD")).precio, "USD")}</p>
            </div>
            <span className="btn btn-primario btn-chico">Aprobar diseño</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Seccion({
  id,
  eyebrow,
  titulo,
  texto,
  puntos,
  visual,
  invertir = false,
}: {
  id?: string;
  eyebrow: string;
  titulo: string;
  texto: string;
  puntos: string[];
  visual: React.ReactNode;
  invertir?: boolean;
}) {
  return (
    <section id={id} className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
      <div className={invertir ? "lg:order-2" : ""}>{visual}</div>
      <div className={invertir ? "lg:order-1" : ""}>
        <p className="etiqueta text-oro-oscuro">{eyebrow}</p>
        <h2 className="titulo-display mt-3 text-4xl sm:text-5xl">{titulo}</h2>
        <p className="mt-5 text-lg leading-relaxed text-tinta-2">{texto}</p>
        <ul className="mt-6 space-y-3">
          {puntos.map((p) => (
            <li key={p} className="flex gap-3 text-tinta-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-oro" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Inicio() {
  return (
    <>
      <section className="relative overflow-hidden">
        <svg className="pointer-events-none absolute -top-40 -right-40 h-[44rem] w-[44rem] text-oro/25" viewBox="0 0 400 400" fill="none" aria-hidden="true">
          {[190, 150, 110, 70].map((r) => (
            <circle key={r} cx="200" cy="200" r={r} stroke="currentColor" strokeWidth="0.6" />
          ))}
          <path d="M200 0V400M0 200H400M59 59L341 341M341 59L59 341" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 6" />
        </svg>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
          <div>
            <p className="etiqueta text-oro-oscuro">Inteligencia para alta joyería</p>
            <h1 className="titulo-display mt-5 text-[2.9rem] sm:text-6xl lg:text-7xl">
              Del boceto a la joya, <em className="text-oro-oscuro">en minutos.</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-tinta-2">
              NYVORA convierte tus bocetos en renders fotorrealistas, calcula el costo real de cada pieza y prepara propuestas que tus
              clientes quieren aprobar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/estudio" className="btn btn-primario">
                Abrir el estudio <ArrowRight size={16} />
              </Link>
              <Link href="/cotizador" className="btn btn-secundario">
                Cotizar una pieza
              </Link>
            </div>
            <ul className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-linea pt-6 text-sm text-tinta-2">
              <li className="flex flex-col gap-1.5">
                <PenTool size={18} className="text-oro" /> Render con IA
              </li>
              <li className="flex flex-col gap-1.5">
                <Calculator size={18} className="text-oro" /> Precio al gramo
              </li>
              <li className="flex flex-col gap-1.5">
                <FileText size={18} className="text-oro" /> Propuesta en PDF
              </li>
            </ul>
          </div>
          <BocetoPortada />
        </div>
      </section>

      <section className="border-y border-linea bg-papel py-6" aria-label="Para quién es NYVORA">
        <p className="etiqueta mb-4 text-center">Hecho para</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="flex w-max animate-desliza gap-12 pr-12">
            {[...PARA_QUIEN, ...PARA_QUIEN].map((t, i) => (
              <span key={i} className="flex items-center gap-12 font-display text-2xl whitespace-nowrap text-tinta-2" aria-hidden={i >= PARA_QUIEN.length}>
                {t}
                <span className="h-1.5 w-1.5 rotate-45 bg-oro" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </section>

      <Seccion
        id="producto"
        eyebrow="I · Diseña y visualiza"
        titulo="Tu boceto, convertido en una joya que ya parece real."
        texto="Dibuja en el lienzo o sube la foto de tu cuaderno. La IA respeta tu silueta y la transforma en un render de estudio, con metal pulido y piedras con fuego."
        puntos={[
          `Lápices que son materiales: ${COLORES_LAPIZ.slice(0, 6)
            .map((c) => c.nombre.split(" /")[0].toLowerCase())
            .join(", ")}.`,
          "Elige tipo de pieza, metal, piedra, talla y estilo, o escribe tus notas.",
          "Genera el plano técnico en tres vistas para tu modelador CAD.",
        ]}
        visual={<Comparador />}
      />

      <Seccion
        eyebrow="II · Cotiza"
        titulo="Cotizaciones exactas, en segundos."
        texto="Metal según su ley y el precio spot, merma de fundición, piedras por quilate, horas de taller, engaste y tu margen. Todo se recalcula mientras escribes."
        puntos={[
          "Estimador de peso para argollas a partir de la talla, el ancho y el grosor.",
          "Dólares, pesos mexicanos o euros, con tu tipo de cambio.",
          "Margen sobre el precio de venta y el multiplicador que ya usas en el taller.",
        ]}
        visual={<MiniCotizacion />}
        invertir
      />

      <Seccion
        eyebrow="III · Presenta y vende"
        titulo="Propuestas de lujo, listas para tu cliente."
        texto="Guarda cada pieza en tu colección con su render, su plano y su precio. Con un clic se convierte en una propuesta elegante para imprimir o enviar en PDF."
        puntos={[
          "Nombre, descripción y ficha de la pieza editables.",
          "Muestra solo el precio final o el desglose completo.",
          "Del concepto al cierre sin salir de NYVORA.",
        ]}
        visual={<PropuestaMuestra />}
      />

      <section className="border-t border-linea bg-papel">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="titulo-display text-center text-4xl sm:text-5xl">Cómo funciona</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ["I", "Traza", "Dibuja la idea con los lápices de materiales o sube la foto de tu boceto en papel."],
              ["II", "Visualiza", "Elige metal, piedra y estilo. La IA genera el render y, si lo necesitas, el plano técnico."],
              ["III", "Cotiza y presenta", "Calcula el precio con tus costos reales y comparte una propuesta impecable."],
            ].map(([n, t, d]) => (
              <li key={n} className="rounded-2xl border border-linea bg-marfil p-7">
                <span className="font-display text-3xl text-oro">{n}</span>
                <h3 className="titulo-display mt-3 text-2xl">{t}</h3>
                <p className="mt-2 leading-relaxed text-tinta-2">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="titulo-display text-center text-4xl sm:text-5xl">Preguntas frecuentes</h2>
        <div className="mt-10 divide-y divide-linea border-y border-linea">
          {PREGUNTAS.map((q) => (
            <details key={q.p} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl">
                {q.p}
                <span className="text-oro transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-tinta-2">{q.r}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-noche text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6">
          <h2 className="titulo-display max-w-2xl text-4xl sm:text-5xl">
            Tu próxima pieza empieza <em className="text-oro-claro">con un trazo.</em>
          </h2>
          <p className="mt-4 max-w-xl text-white/70">Abre el estudio, dibuja tu idea y mírala convertida en joya.</p>
          <Link href="/estudio" className="btn btn-oro mt-8 px-8 py-3.5">
            Empezar a diseñar <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
