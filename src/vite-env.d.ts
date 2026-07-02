/// <reference types="vite/client" />

import type * as tf from "@tensorflow/tfjs";

type PrintLabTFLiteModel = {
  predict(input: tf.Tensor): tf.Tensor | tf.Tensor[];
};

type PrintLabTFLiteRuntime = {
  loadTFLiteModel(modelUrl: string): Promise<PrintLabTFLiteModel>;
  setWasmPath?(path: string): void;
};

declare global {
  interface Window {
    tf: typeof tf;
    tflite?: PrintLabTFLiteRuntime;
  }
}
