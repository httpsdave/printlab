import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

export type Prediction = {
  label: string;
  confidence: number;
};

type TFLiteModel = {
  predict(input: tf.Tensor): tf.Tensor | tf.Tensor[];
};

type TFLiteRuntime = {
  loadTFLiteModel(modelUrl: string): Promise<TFLiteModel>;
  setWasmPath?(path: string): void;
};

const CLASS_NAMES = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"];
const IMAGE_SIZE = 128;
const MODEL_URL = "/model/bloodtype_classifier.tflite";
const TFLITE_SCRIPT_URL = "/vendor/tf-tflite.min.js";
const TFLITE_WASM_PATH = "/vendor/";

let runtimePromise: Promise<TFLiteRuntime> | null = null;
let modelPromise: Promise<TFLiteModel> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Unable to load the TFLite runtime."));
    document.head.appendChild(script);
  });
}

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      window.tf = tf;
      await loadScript(TFLITE_SCRIPT_URL);
      const runtime = window.tflite;

      if (!runtime?.loadTFLiteModel) {
        throw new Error("The TFLite runtime loaded, but the model loader was not available.");
      }

      runtime.setWasmPath?.(window.location.origin + TFLITE_WASM_PATH);
      return runtime;
    })();
  }

  return runtimePromise;
}

function loadModel() {
  if (!modelPromise) {
    modelPromise = loadRuntime().then((runtime) => runtime.loadTFLiteModel(MODEL_URL));
  }

  return modelPromise;
}

function softmax(values: number[]) {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

function normalizeScores(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const looksLikeProbabilities = values.every((value) => value >= 0 && value <= 1) && total > 0.98 && total < 1.02;

  return looksLikeProbabilities ? values : softmax(values);
}

export async function classifyFingerprint(image: HTMLImageElement): Promise<Prediction[]> {
  await tf.setBackend("webgl");
  await tf.ready();
  const model = await loadModel();

  const output = tf.tidy(() => {
    const input = tf.browser
      .fromPixels(image, 3)
      .resizeBilinear([IMAGE_SIZE, IMAGE_SIZE], true)
      .toFloat()
      .div(255)
      .expandDims(0);

    const result = model.predict(input) as tf.Tensor | tf.Tensor[];
    return Array.isArray(result) ? result[0].clone() : result.clone();
  });

  const rawScores = Array.from(await output.data());
  output.dispose();

  return normalizeScores(rawScores)
    .map((confidence, index) => ({
      label: CLASS_NAMES[index] ?? `Class ${index + 1}`,
      confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
