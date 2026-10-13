import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { generarImagen, proveedorConfigurado, proveedoresDisponibles } from "./ia.ts";
import { construirInstruccion, construirPrompt, ESPEC_INICIAL } from "./prompts.ts";

const BOCETO = { mime: "image/png", base64: Buffer.from("boceto").toString("base64") };
let llamadas: { url: string; init: RequestInit }[] = [];

/** Responde en orden: cada llamada a fetch consume la siguiente respuesta de la lista. */
function simularFetch(...respuestas: { cuerpo: unknown; status?: number }[]) {
  llamadas = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    const { cuerpo, status = 200 } = respuestas[Math.min(llamadas.length - 1, respuestas.length - 1)];
    return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

const pngDePrueba = async (lado: number) =>
  (await sharp({ create: { width: lado, height: lado, channels: 3, background: "#d9c58f" } }).png().toBuffer()).toString("base64");

const form = (i: number) => llamadas[i].init.body as FormData;
const cuerpoGemini = (i: number) => JSON.parse(String(llamadas[i].init.body));

beforeEach(() => {
  for (const k of ["OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "NYVORA_IMAGE_PROVIDER", "OPENAI_IMAGE_MODEL", "GEMINI_IMAGE_MODEL", "FAL_KEY", "NYVORA_MOTOR_ENDPOINT", "NYVORA_MOTOR_LORA", "NYVORA_MOTOR_ESCALA"]) {
    delete process.env[k];
  }
});

test("sin claves no hay proveedor (modo demo)", () => {
  assert.equal(proveedorConfigurado(), null);
  assert.deepEqual(proveedoresDisponibles(), []);
});

test("con las dos claves va primero Gemini, salvo que se elija otro", () => {
  process.env.OPENAI_API_KEY = "o";
  assert.equal(proveedorConfigurado(), "openai");
  process.env.GEMINI_API_KEY = "g";
  assert.equal(proveedorConfigurado(), "gemini");
  assert.deepEqual(proveedoresDisponibles(), ["gemini", "openai"]);
  process.env.NYVORA_IMAGE_PROVIDER = "openai";
  assert.equal(proveedorConfigurado(), "openai");
});

test("OpenAI: calidad máxima pide gpt-image-2 a 2048 px en alta calidad y devuelve JPEG", async () => {
  process.env.OPENAI_API_KEY = "sk-prueba";
  simularFetch({ cuerpo: { data: [{ b64_json: await pngDePrueba(2048) }] } });
  const salida = await generarImagen("openai", "prompt", BOCETO, "maxima");
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].url, "https://api.openai.com/v1/images/edits");
  assert.equal((llamadas[0].init.headers as Record<string, string>).Authorization, "Bearer sk-prueba");
  assert.equal(form(0).get("model"), "gpt-image-2");
  assert.equal(form(0).get("size"), "2048x2048");
  assert.equal(form(0).get("quality"), "high");
  assert.ok(form(0).get("image") instanceof Blob);
  assert.match(salida.dataUrl, /^data:image\/jpeg;base64,/);
  assert.equal(salida.lado, 2048);
  assert.equal(salida.modelo, "gpt-image-2");
});

test("OpenAI: si el tamaño o el modelo no existen, prueba el siguiente", async () => {
  process.env.OPENAI_API_KEY = "sk-prueba";
  simularFetch(
    { cuerpo: { error: { message: "Invalid size '2048x2048'" } }, status: 400 },
    { cuerpo: { error: { message: "The model `gpt-image-2` does not exist" } }, status: 404 },
    { cuerpo: { data: [{ b64_json: await pngDePrueba(1024) }] } },
  );
  const salida = await generarImagen("openai", "prompt", BOCETO, "maxima");
  assert.deepEqual(
    llamadas.map((_, i) => `${form(i).get("model")} ${form(i).get("size")}`),
    ["gpt-image-2 2048x2048", "gpt-image-2 1024x1024", "gpt-image-1.5 2048x2048"],
  );
  assert.equal(salida.modelo, "gpt-image-1.5");
});

test("OpenAI: un error que no es de modelo se muestra tal cual, sin más intentos", async () => {
  process.env.OPENAI_API_KEY = "sk-prueba";
  simularFetch({ cuerpo: { error: { message: "Your organization must be verified to use this model" } }, status: 403 });
  await assert.rejects(generarImagen("openai", "prompt", BOCETO), /OpenAI \(gpt-image-2\): Your organization must be verified/);
  assert.equal(llamadas.length, 1);
});

test("Gemini: pide Nano Banana Pro a 2K, ignora las imágenes de razonamiento y devuelve JPEG", async () => {
  process.env.GEMINI_API_KEY = "g-prueba";
  const borrador = await pngDePrueba(256);
  const final = await pngDePrueba(2048);
  simularFetch({
    cuerpo: {
      candidates: [
        {
          content: {
            parts: [
              { thought: true, inlineData: { mimeType: "image/png", data: borrador } },
              { text: "listo" },
              { inlineData: { mimeType: "image/png", data: final } },
            ],
          },
        },
      ],
    },
  });
  const salida = await generarImagen("gemini", "prompt", BOCETO, "maxima");
  assert.match(llamadas[0].url, /models\/gemini-3-pro-image:generateContent$/);
  assert.equal((llamadas[0].init.headers as Record<string, string>)["x-goog-api-key"], "g-prueba");
  const cuerpo = cuerpoGemini(0);
  assert.equal(cuerpo.contents[0].parts[1].inline_data.data, BOCETO.base64);
  assert.deepEqual(cuerpo.generationConfig.imageConfig, { aspectRatio: "1:1", imageSize: "2K" });
  assert.match(salida.dataUrl, /^data:image\/jpeg;base64,/);
  assert.equal(salida.lado, 2048);
});

test("Gemini: si el modelo no existe, baja al siguiente", async () => {
  process.env.GEMINI_API_KEY = "g-prueba";
  simularFetch(
    { cuerpo: { error: { message: "models/gemini-3-pro-image is not found for API version v1beta" } }, status: 404 },
    { cuerpo: { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: await pngDePrueba(64) } }] } }] } },
  );
  const salida = await generarImagen("gemini", "prompt", BOCETO, "estandar");
  assert.equal(llamadas.length, 2);
  assert.equal(cuerpoGemini(0).generationConfig.imageConfig.imageSize, "1K");
  assert.match(llamadas[1].url, /gemini-3\.1-flash-image:generateContent$/);
  assert.equal(salida.modelo, "gemini-3.1-flash-image");
});

test("Gemini: si el modelo no acepta el tamaño, repite sin pedirlo", async () => {
  process.env.GEMINI_API_KEY = "g-prueba";
  simularFetch(
    { cuerpo: { error: { message: "Invalid value at 'generation_config.image_config.image_size'" } }, status: 400 },
    { cuerpo: { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: await pngDePrueba(64) } }] } }] } },
  );
  const salida = await generarImagen("gemini", "prompt", BOCETO, "maxima");
  assert.match(llamadas[1].url, /gemini-3-pro-image:generateContent$/);
  assert.equal(cuerpoGemini(1).generationConfig.imageConfig, undefined);
  assert.equal(salida.modelo, "gemini-3-pro-image");
});

test("Gemini: si no hay imagen, explica el motivo", async () => {
  process.env.GEMINI_API_KEY = "g-prueba";
  simularFetch({ cuerpo: { candidates: [{ finishReason: "IMAGE_SAFETY", content: { parts: [] } }] } });
  await assert.rejects(generarImagen("gemini", "prompt", BOCETO), /IMAGE_SAFETY/);
});

test("los prompts incluyen los materiales, la construcción real y la fotografía", () => {
  const p = construirPrompt("render", { ...ESPEC_INICIAL, metalId: "pt950", notas: "halo de pavé" });
  assert.match(p, /polished platinum/);
  assert.match(p, /round brilliant cut/);
  assert.match(p, /halo de pavé/);
  assert.match(p, /focus-stacked/);
  assert.match(p, /floating or unsupported stones/);
  assert.match(construirPrompt("tecnico", ESPEC_INICIAL), /orthographic views/);
});

test("motor propio: aparece solo con FAL_KEY y endpoint, y no es el de por defecto si hay otros", () => {
  process.env.FAL_KEY = "fal";
  assert.deepEqual(proveedoresDisponibles(), []);
  process.env.NYVORA_MOTOR_ENDPOINT = "fal-ai/modelo/edit/lora";
  assert.deepEqual(proveedoresDisponibles(), ["nyvora"]);
  process.env.GEMINI_API_KEY = "g";
  assert.deepEqual(proveedoresDisponibles(), ["gemini", "nyvora"]);
  assert.equal(proveedorConfigurado(), "gemini");
});

test("motor propio: manda boceto, instrucción y LoRA a fal.ai y descarga la imagen", async () => {
  process.env.FAL_KEY = "fal-prueba";
  process.env.NYVORA_MOTOR_ENDPOINT = "/fal-ai/modelo/edit/lora/";
  process.env.NYVORA_MOTOR_LORA = "https://v3.fal.media/files/nyvora.safetensors";
  const png = Buffer.from(await pngDePrueba(1024), "base64");
  llamadas = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    if (url.startsWith("https://fal.run/")) {
      return Response.json({ images: [{ url: "https://v3.fal.media/files/render.png" }] });
    }
    return new Response(png, { headers: { "Content-Type": "image/png" } });
  }) as typeof fetch;

  const instruccion = construirInstruccion(ESPEC_INICIAL);
  const salida = await generarImagen("nyvora", instruccion, BOCETO);
  assert.equal(llamadas[0].url, "https://fal.run/fal-ai/modelo/edit/lora");
  assert.equal((llamadas[0].init.headers as Record<string, string>).Authorization, "Key fal-prueba");
  const cuerpo = JSON.parse(String(llamadas[0].init.body));
  assert.equal(cuerpo.prompt, instruccion);
  assert.equal(cuerpo.image_url, `data:image/png;base64,${BOCETO.base64}`);
  assert.deepEqual(cuerpo.loras, [{ path: "https://v3.fal.media/files/nyvora.safetensors", scale: 1 }]);
  assert.equal(llamadas[1].url, "https://v3.fal.media/files/render.png");
  assert.match(salida.dataUrl, /^data:image\/jpeg;base64,/);
  assert.equal(salida.proveedor, "nyvora");
});

test("la instrucción corta describe la pieza y siempre empieza igual", () => {
  const i = construirInstruccion({ ...ESPEC_INICIAL, metalId: "au18r" });
  assert.match(i, /^Turn this jewelry sketch into a photorealistic studio product photo/);
  assert.match(i, /rose gold/);
});

test("Gemini: si el plan gratuito no incluye el modelo, baja al siguiente y avisa claro", async () => {
  process.env.GEMINI_API_KEY = "g-prueba";
  const sinPlan = (m: string) => ({
    cuerpo: { error: { message: `You exceeded your current quota. * Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: ${m}` } },
    status: 429,
  });
  simularFetch(sinPlan("gemini-3-pro-image"), sinPlan("gemini-3.1-flash-image"), sinPlan("gemini-2.5-flash-image"));
  await assert.rejects(generarImagen("gemini", "prompt", BOCETO, "maxima"), (e: Error & { status?: number }) => {
    assert.match(e.message, /plan gratuito, que no incluye gemini-3-pro-image/);
    assert.match(e.message, /Set up billing/);
    assert.equal(e.status, 402);
    return true;
  });
  // Un intento por modelo: con «limit: 0» no tiene sentido reintentar otro tamaño del mismo.
  assert.deepEqual(llamadas.map((l) => l.url.match(/models\/([^:]+)/)![1]), ["gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"]);
});

test("Gemini: si el siguiente modelo sí entra en el plan, genera con él", async () => {
  process.env.GEMINI_API_KEY = "g-prueba";
  simularFetch(
    { cuerpo: { error: { message: "Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-3-pro-image" } }, status: 429 },
    { cuerpo: { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: await pngDePrueba(64) } }] } }] } },
  );
  const salida = await generarImagen("gemini", "prompt", BOCETO, "maxima");
  assert.equal(salida.modelo, "gemini-3.1-flash-image");
});

test("cuotas: sin saldo o con demasiadas peticiones se explica sin reintentar", async () => {
  process.env.OPENAI_API_KEY = "sk-prueba";
  simularFetch({ cuerpo: { error: { message: "You exceeded your current quota", code: "insufficient_quota" } }, status: 429 });
  await assert.rejects(generarImagen("openai", "prompt", BOCETO), /OpenAI no tiene saldo/);
  assert.equal(llamadas.length, 1);

  process.env.GEMINI_API_KEY = "g-prueba";
  simularFetch({ cuerpo: { error: { message: "Resource has been exhausted (e.g. check quota). Please retry in 95.2s." } }, status: 429 });
  await assert.rejects(generarImagen("gemini", "prompt", BOCETO), /Vuelve a intentarlo en unos 2 min/);
  assert.equal(llamadas.length, 1);
});
