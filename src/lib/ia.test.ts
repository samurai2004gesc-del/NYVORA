import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { generarImagen, proveedorConfigurado } from "./ia.ts";
import { construirPrompt, ESPEC_INICIAL } from "./prompts.ts";

const PNG = { mime: "image/png", base64: Buffer.from("boceto").toString("base64") };
let llamadas: { url: string; init: RequestInit }[] = [];

function simularFetch(respuesta: unknown, status = 200) {
  llamadas = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    return new Response(JSON.stringify(respuesta), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

beforeEach(() => {
  for (const k of ["OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "NYVORA_IMAGE_PROVIDER", "OPENAI_IMAGE_MODEL", "GEMINI_IMAGE_MODEL"]) {
    delete process.env[k];
  }
});

test("sin claves no hay proveedor (modo demo)", () => {
  assert.equal(proveedorConfigurado(), null);
});

test("elige el proveedor según las claves y la preferencia", () => {
  process.env.GEMINI_API_KEY = "g";
  assert.equal(proveedorConfigurado(), "gemini");
  process.env.OPENAI_API_KEY = "o";
  assert.equal(proveedorConfigurado(), "openai");
  process.env.NYVORA_IMAGE_PROVIDER = "gemini";
  assert.equal(proveedorConfigurado(), "gemini");
});

test("OpenAI: manda el boceto como edición y devuelve un data URL JPEG", async () => {
  process.env.OPENAI_API_KEY = "sk-prueba";
  simularFetch({ data: [{ b64_json: "QUJD" }] });
  const salida = await generarImagen("openai", "prompt", PNG);
  assert.equal(llamadas[0].url, "https://api.openai.com/v1/images/edits");
  assert.equal((llamadas[0].init.headers as Record<string, string>).Authorization, "Bearer sk-prueba");
  const form = llamadas[0].init.body as FormData;
  assert.equal(form.get("model"), "gpt-image-1");
  assert.equal(form.get("output_format"), "jpeg");
  assert.ok(form.get("image") instanceof Blob);
  assert.equal(salida.dataUrl, "data:image/jpeg;base64,QUJD");
});

test("OpenAI: un error de la API se convierte en un mensaje legible", async () => {
  process.env.OPENAI_API_KEY = "sk-prueba";
  simularFetch({ error: { message: "Your organization must be verified" } }, 403);
  await assert.rejects(generarImagen("openai", "prompt", PNG), /OpenAI: Your organization must be verified/);
});

test("Gemini: manda texto e imagen y lee la imagen de la respuesta", async () => {
  process.env.GEMINI_API_KEY = "g-prueba";
  simularFetch({ candidates: [{ content: { parts: [{ text: "listo" }, { inlineData: { mimeType: "image/png", data: "WFla" } }] } }] });
  const salida = await generarImagen("gemini", "prompt", PNG);
  assert.match(llamadas[0].url, /models\/gemini-2\.5-flash-image:generateContent$/);
  assert.equal((llamadas[0].init.headers as Record<string, string>)["x-goog-api-key"], "g-prueba");
  const cuerpo = JSON.parse(String(llamadas[0].init.body));
  assert.equal(cuerpo.contents[0].parts[1].inline_data.data, PNG.base64);
  assert.equal(salida.dataUrl, "data:image/png;base64,WFla");
});

test("Gemini: si no hay imagen, explica el motivo", async () => {
  process.env.GEMINI_API_KEY = "g-prueba";
  simularFetch({ candidates: [{ finishReason: "IMAGE_SAFETY", content: { parts: [] } }] });
  await assert.rejects(generarImagen("gemini", "prompt", PNG), /IMAGE_SAFETY/);
});

test("los prompts incluyen los materiales elegidos y las notas", () => {
  const p = construirPrompt("render", { ...ESPEC_INICIAL, metalId: "pt950", notas: "halo de pavé" });
  assert.match(p, /polished platinum/);
  assert.match(p, /round brilliant cut/);
  assert.match(p, /halo de pavé/);
  assert.match(construirPrompt("tecnico", ESPEC_INICIAL), /orthographic views/);
});
