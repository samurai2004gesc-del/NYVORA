# NYVORA

**Del boceto a la joya, en minutos.** NYVORA es una plataforma de IA para joyeros: convierte bocetos en
renders fotorrealistas, genera planos técnicos, cotiza cada pieza al gramo y prepara propuestas de lujo
para el cliente.

Está inspirada en [Facet Flow](docs/investigacion-facetflow.md) (diseño de joyería con IA para el gremio),
con identidad, textos y código propios, y en español.

## Qué hay en esta primera versión

| Sección | Ruta | Qué hace |
| --- | --- | --- |
| Portada | `/` | Presentación del producto con un lienzo para dibujar. «Visualizar mi pieza» lleva el boceto al estudio. |
| Estudio | `/estudio` | Lienzo con lápices de materiales (oro, oro blanco/platino, oro rosa, zafiro, rubí, esmeralda, tinta), grosor, deshacer, borrar y **subir foto de un boceto en papel**. Eliges pieza, metal, piedra, talla, estilo y notas, y la IA genera el **render**. Desde el render se pide el **plano técnico** (tres vistas, línea negra). Guardar, descargar y cotizar. |
| Cotizador | `/cotizador` | Metal por ley y precio spot (USD/g) con merma, **estimador de peso de argollas** (talla US/MX, ancho, grosor), piedras por quilate, horas de taller, engaste, otros costos, margen sobre precio de venta, IVA y moneda (USD, MXN, EUR con tipo de cambio). |
| Colección | `/coleccion` | Todas tus piezas guardadas, con imagen y precio. |
| Propuesta | `/propuesta/[id]` | Página para el cliente: imágenes, ficha, nota editable, inversión con desglose opcional (el margen se reparte entre partidas). «Imprimir / PDF». |

### La IA de imágenes

| Motor | Modelo | Variable |
| --- | --- | --- |
| Google **Nano Banana Pro** | `gemini-3-pro-image` | `GEMINI_API_KEY` |
| OpenAI **GPT Image 2** | `gpt-image-2` | `OPENAI_API_KEY` |

- Son los dos modelos más fuertes en fotorrealismo a octubre de 2026. Con las dos claves, el estudio deja
  elegir el motor (por defecto Nano Banana Pro, el más fiel en realismo) para comparar resultados.
- **Calidad máxima (2K)** por defecto: 2048 × 2048 px, calidad alta. También hay una opción rápida a 1K.
- Si la cuenta no tiene acceso a un modelo, NYVORA baja solo al siguiente (Nano Banana 2 → Nano Banana,
  o GPT Image 1.5 → GPT Image 1). Bajo la imagen se ve qué modelo y resolución la generaron.
- El servidor convierte cada render a JPEG al 92 % para que quepa en el límite de 4.5 MB de Vercel sin
  perder detalle.
- Las instrucciones para la IA (`src/lib/prompts.ts`) piden construcción real (garras, galerías, engastes),
  óptica real de piedras y fotografía macro con apilado de foco, y prohíben el aspecto de render 3D.
- Las claves viven solo en el servidor de Vercel. Sin claves, el estudio entra en **modo demostración**:
  se puede dibujar, guardar bocetos y usar el cotizador, pero no se generan renders.

> Por ahora las piezas se guardan **en el navegador** (IndexedDB). Las propuestas se comparten en PDF.
> Cuentas, nube y enlaces compartibles están en la hoja de ruta.

## Publicarlo en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new) e importa el repositorio `samurai2004gesc-del/NYVORA`.
2. **Application Preset**: Next.js (Vercel lo detecta solo). Deja el **Root Directory** como está (`./`) y no
   cambies los comandos de build.
3. En **Environment Variables** agrega (ver `.env.example`):
   - `GEMINI_API_KEY` **o** `OPENAI_API_KEY`: con una basta; con las dos puedes comparar motores.
   - `NYVORA_ACCESS_CODE`: un código que se pide en el estudio antes de generar imágenes. **Ponlo**: sin él,
     cualquiera que encuentre tu URL podría gastar tus créditos de IA.
4. Pulsa **Deploy**.

Notas:

- Vercel publica en producción la rama `main`; cada push a `main` vuelve a desplegar solo. Las demás ramas
  reciben una URL de *preview*.
- El plan **Hobby** de Vercel es para uso personal y no comercial. Cuando NYVORA cobre a clientes, pasa al
  plan **Pro**.
- **Gemini**: la clave se crea en [Google AI Studio](https://aistudio.google.com/apikey); Nano Banana Pro
  requiere facturación activa. **OpenAI**: para GPT Image 2 hay que verificar la organización en
  platform.openai.com. Según fuentes de terceros, Nano Banana Pro cobra unos 0.13 USD por imagen a 2K;
  revisa los precios actuales de cada proveedor antes de abrirlo al público.
- Un render a 2K tarda entre 30 y 90 segundos. La función tiene un límite de 300 s, que el plan Hobby
  admite con Fluid Compute (activado por defecto en proyectos nuevos).
- Si cambian los nombres de los modelos, ajústalos sin tocar código con `OPENAI_IMAGE_MODEL` o
  `GEMINI_IMAGE_MODEL`.

## Trabajar en local

Requiere Node.js 20.9 o superior.

```bash
git clone https://github.com/samurai2004gesc-del/NYVORA.git
cd NYVORA
npm install
cp .env.example .env.local   # pon aquí tu clave de IA (opcional)
npm run dev                  # http://localhost:3000
```

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (lo mismo que hace Vercel) |
| `npm test` | Pruebas del cotizador, de los prompts y de la conexión con Gemini/OpenAI |
| `npm run typecheck` | Revisión de tipos de TypeScript |

## Cómo está hecho

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4** + TypeScript.
- Tipografías Cormorant Garamond y Manrope servidas desde el propio proyecto (paquetes Fontsource).
- `src/lib/cotizacion.ts`: todas las fórmulas del cotizador, en funciones puras con pruebas.
- `src/lib/materiales.ts`: metales (ley y densidad), piedras, tallas, estilos, colores del lápiz y precios
  spot de referencia (13 oct 2026: oro ≈ 4 160 USD/oz, platino ≈ 1 680, plata ≈ 60).
- `src/lib/prompts.ts`: instrucciones para la IA (render y plano técnico).
- `src/lib/ia.ts` y `src/app/api/render/route.ts`: la llamada a Gemini u OpenAI, la cadena de modelos de
  respaldo, la conversión a JPEG, la validación de la imagen y el código de acceso.
- `src/lib/coleccion.ts`: la colección en IndexedDB y la compresión de imágenes.

## Hoja de ruta

1. **Cuentas y nube**: inicio de sesión (Clerk o Supabase Auth), base de datos (Neon o Supabase) y
   Vercel Blob para las imágenes → colección en cualquier dispositivo y propuestas con enlace para el cliente.
2. **Precio spot automático** desde una API de metales, y límite de renders por usuario.
3. **Concierge**: chat experto en joyería para pensar diseños y responder a clientes.
4. **Buscador de piedras** conectado a inventarios de proveedores, con botón «Solicitar».
5. **Planes y pagos** (Stripe), equipos y propuestas con el logo de cada joyería.
6. Del render al **modelo 3D** como punto de partida para CAD.
