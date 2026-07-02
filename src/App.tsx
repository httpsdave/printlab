import {
  Activity,
  ArrowDown,
  BarChart3,
  CheckCircle2,
  Clock3,
  Fingerprint,
  History,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Menu,
  RefreshCw,
  Sparkles,
  Upload,
  UserPlus,
  X,
  AlertCircle,
  Mail,
  Lock
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { classifyFingerprint, Prediction } from "./model";

type HistoryItem = {
  id: string;
  fileName: string;
  label: string;
  confidence: number;
  createdAt: string;
};

type Stage = "idle" | "reading" | "preparing" | "analyzing" | "complete" | "error";
type ToastMessage = { id: string; type: "success" | "error" | "info"; message: string };

const STORAGE_KEY = "printlab-history";

const navItems = [
  { href: "#predict", label: "Predict" },
  { href: "#history", label: "History" },
];

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setHistory(JSON.parse(saved) as HistoryItem[]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const currentStep = useMemo(() => {
    if (stage === "reading") return "Reading image";
    if (stage === "preparing") return "Preparing scan";
    if (stage === "analyzing") return "Running classifier";
    if (stage === "complete") return "Prediction ready";
    if (stage === "error") return "Needs another image";
    return "Waiting for upload";
  }, [stage]);

  async function runPrediction(file: File) {
    setPredictions([]);
    setFileName(file.name);
    setStage("reading");
    setProgress(18);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return objectUrl;
    });

    const image = new Image();
    image.src = objectUrl;

    try {
      await image.decode();
      setStage("preparing");
      setProgress(45);
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      setStage("analyzing");
      setProgress(72);

      const result = await classifyFingerprint(image);
      setPredictions(result);
      setProgress(100);
      setStage("complete");
      
      addToast("success", "Prediction completed successfully.");

      const top = result[0];
      if (top) {
        setHistory((items) => [
          {
            id: crypto.randomUUID(),
            fileName: file.name,
            label: top.label,
            confidence: top.confidence,
            createdAt: new Date().toISOString(),
          },
          ...items,
        ].slice(0, 8));
      }
    } catch (predictionError) {
      setStage("error");
      setProgress(100);
      const msg = predictionError instanceof Error ? predictionError.message : "The classifier could not process this image.";
      addToast("error", msg);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStage("error");
      addToast("error", "Please upload a fingerprint scan as an image file.");
      return;
    }

    void runPrediction(file);
    event.target.value = "";
  }

  function resetUpload() {
    setStage("idle");
    setProgress(0);
    setPredictions([]);
    setFileName("");
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }
  
  function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignedIn(true);
    setAuthModal(null);
    addToast("success", authModal === "login" ? "Successfully logged in!" : "Account created successfully!");
  }

  function handleLogout() {
    setSignedIn(false);
    addToast("info", "You have been logged out.");
  }

  const isWorking = stage === "reading" || stage === "preparing" || stage === "analyzing";
  const topPrediction = predictions[0];

  return (
    <div className="min-h-screen bg-slate-50 text-ink overflow-x-hidden relative">
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`animate-slide-up flex items-center gap-3 rounded-lg p-4 shadow-floating bg-white border-l-4 ${toast.type === "success" ? "border-green-500" : toast.type === "error" ? "border-red-500" : "border-printblue-500"}`}>
            {toast.type === "success" && <CheckCircle2 className="text-green-500" size={20} />}
            {toast.type === "error" && <AlertCircle className="text-red-500" size={20} />}
            {toast.type === "info" && <Activity className="text-printblue-500" size={20} />}
            <p className="text-sm font-medium text-slate-800">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Auth Modal */}
      {authModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={() => setAuthModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-floating p-8 animate-slide-up">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition" onClick={() => setAuthModal(null)}>
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 mb-6">
              <span className="grid size-10 place-items-center rounded-xl bg-printblue-500 text-white shadow-soft">
                <Fingerprint size={24} />
              </span>
              <h2 className="text-2xl font-bold text-ink">{authModal === "login" ? "Welcome Back" : "Create Account"}</h2>
            </div>
            <form onSubmit={handleAuthSubmit} className="grid gap-4">
              {authModal === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required type="text" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-printblue-500 focus:outline-none focus:ring-1 focus:ring-printblue-500" placeholder="John Doe" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required type="email" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-printblue-500 focus:outline-none focus:ring-1 focus:ring-printblue-500" placeholder="example@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required type="password" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-printblue-500 focus:outline-none focus:ring-1 focus:ring-printblue-500" placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" className="w-full mt-2 rounded-lg bg-accent-500 py-3 font-semibold text-white shadow-card transition hover:bg-accent-600 hover:shadow-soft">
                {authModal === "login" ? "Log In" : "Sign Up"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
              {authModal === "login" ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setAuthModal(authModal === "login" ? "signup" : "login")} className="font-semibold text-printblue-600 hover:underline">
                {authModal === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="fixed left-0 top-0 z-50 h-1.5 w-full bg-printblue-50">
        <div
          className="h-full bg-printblue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header className="fixed inset-x-0 top-0 z-40 bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3 font-bold text-ink">
            <span className="grid size-10 place-items-center rounded-xl bg-printblue-500 text-white shadow-soft">
              <Fingerprint size={24} />
            </span>
            <span className="text-2xl tracking-tight">PrintLab</span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            {navItems.map((item) => (
              <a key={item.href} className="transition hover:text-printblue-600" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            {signedIn ? (
              <button onClick={handleLogout} className="text-sm font-medium text-slate-600 hover:text-printblue-600 transition">Log out</button>
            ) : (
              <>
                <button onClick={() => setAuthModal("login")} className="text-sm font-medium text-slate-600 hover:text-printblue-600 transition">Log In</button>
                <button onClick={() => setAuthModal("signup")} className="inline-flex items-center justify-center rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-accent-600 hover:shadow-floating">
                  Sign Up
                </button>
              </>
            )}
          </div>

          <button
            aria-label="Open navigation"
            className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Nav */}
      <div
        className={`fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm transition-opacity md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-80 max-w-[86vw] border-l border-slate-200 bg-white p-6 shadow-floating transition-transform duration-300 md:hidden ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <Fingerprint className="text-printblue-500" />
            PrintLab
          </div>
          <button
            aria-label="Close navigation"
            className="grid size-10 place-items-center rounded-lg bg-slate-100"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              className="rounded-lg px-4 py-3 font-medium text-slate-700 transition hover:bg-printblue-50 hover:text-printblue-600"
              href={item.href}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-8 grid gap-3">
          {signedIn ? (
            <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="w-full rounded-lg bg-slate-100 py-3 font-semibold text-slate-700">Log out</button>
          ) : (
            <>
              <button onClick={() => { setAuthModal("login"); setMobileOpen(false); }} className="w-full rounded-lg border border-slate-200 py-3 font-semibold text-slate-700">Log In</button>
              <button onClick={() => { setAuthModal("signup"); setMobileOpen(false); }} className="w-full rounded-lg bg-accent-500 py-3 font-semibold text-white">Sign Up</button>
            </>
          )}
        </div>
      </aside>

      <main id="top">
        <section className="relative flex min-h-[95vh] items-center pt-20">
          {/* Diagonal Wavy Background */}
          <div className="absolute inset-0 bg-hero-pattern bg-printblue-600 z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-printblue-500 to-printblue-700 opacity-90 z-0 bg-hero-pattern"></div>
          
          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 items-center">
            <div className="max-w-2xl text-white">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-md">
                <Activity size={16} className="text-accent-400" />
                Advanced Pattern Recognition
              </div>
              <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-[4.5rem]">
                Precision Fingerprint Analysis
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100 max-w-xl">
                Experience next-generation biometric classification. Upload a scanned fingerprint and our AI engine instantly predicts likely blood types with ranked confidence scores.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-4 font-bold text-white shadow-floating transition hover:-translate-y-1 hover:bg-accent-600"
                  href="#predict"
                >
                  Start Prediction <ArrowDown size={20} />
                </a>
                <a
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/20 bg-white/5 px-6 py-4 font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                  href="#history"
                >
                  View History <Clock3 size={20} />
                </a>
              </div>
            </div>

            <div className="relative min-h-[500px] hidden lg:flex items-center justify-center">
              {/* Floating Graphic Element */}
              <div className="absolute w-[450px] h-[450px] rounded-full bg-printblue-400/20 blur-3xl animate-soft-pulse"></div>
              
              <div className="relative animate-float z-20 w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-2 shadow-floating backdrop-blur-md">
                <img
                  alt="Fingerprint scan concept"
                  className="w-full h-auto rounded-xl object-cover mix-blend-overlay opacity-80"
                  src="/assets/printlab-hero.png"
                />
                
                <div className="absolute -bottom-8 -left-8 w-64 rounded-xl border border-slate-200 bg-white p-5 shadow-floating">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Model Classes</p>
                    <BarChart3 className="text-printblue-500" size={18} />
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"].map((type) => (
                      <span
                        key={type}
                        className="rounded-lg bg-slate-50 py-2 text-center text-sm font-bold text-printblue-700"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="predict" className="scroll-mt-24 py-20 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[4fr_6fr] lg:px-8">
            <div className="flex flex-col justify-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-printblue-600">Prediction Engine</span>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                Upload & Analyze
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Our lightweight TFLite model processes the image entirely in your browser. No sensitive biometric data is sent to our servers.
              </p>

              <div id="guide" className="mt-10 grid gap-5 scroll-mt-24">
                {[
                  ["Clear Image", "Upload one well-lit image. JPG, PNG, WebP supported."],
                  ["Centered Focus", "Ensure the fingertip ridges are highly visible with minimal background."],
                  ["Guidance Only", "Results are probabilistic model outputs, not medical fact."],
                ].map(([title, body], index) => (
                  <div key={title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:shadow-floating">
                    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-printblue-50 text-lg font-bold text-printblue-600">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-ink">{title}</h3>
                      <p className="mt-1 leading-relaxed text-slate-600">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-floating sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-printblue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative grid gap-8 lg:grid-cols-2">
                
                {/* Upload Section */}
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-bold text-ink mb-4">Input Scan</h3>
                  <button
                    className="group relative flex-grow min-h-[320px] w-full flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-printblue-200 bg-slate-50/50 p-6 text-center transition hover:border-printblue-500 hover:bg-printblue-50/30"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    {previewUrl ? (
                      <img
                        alt="Preview"
                        className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:scale-105"
                        src={previewUrl}
                      />
                    ) : null}
                    
                    {isWorking && <div className="absolute inset-0 bg-printblue-900/20 backdrop-blur-[2px]"></div>}
                    
                    <div className="relative rounded-xl bg-white/95 p-6 shadow-card backdrop-blur-sm z-10 transition group-hover:shadow-floating">
                      {isWorking ? (
                        <Loader2 className="mx-auto animate-spin text-printblue-600" size={40} />
                      ) : previewUrl ? (
                        <CheckCircle2 className="mx-auto text-green-500" size={40} />
                      ) : (
                        <ImagePlus className="mx-auto text-printblue-500" size={40} />
                      )}
                      <p className="mt-4 font-bold text-ink text-lg">
                        {previewUrl ? fileName : "Select image"}
                      </p>
                      <p className="mt-2 text-sm text-slate-500 font-medium">
                        {previewUrl ? "Click to change" : "Click to browse files"}
                      </p>
                    </div>
                    
                    {isWorking && (
                      <div className="absolute inset-x-0 top-0 h-1 animate-scan-line bg-printblue-500 shadow-[0_0_15px_rgba(0,85,255,0.8)] z-20" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChange}
                    type="file"
                  />
                  
                  <div className="mt-4 flex gap-3">
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-printblue-600 px-4 py-3.5 font-bold text-white shadow-card transition hover:bg-printblue-700 disabled:opacity-50"
                      disabled={isWorking}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={18} /> Upload
                    </button>
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-printblue-600"
                      onClick={resetUpload}
                    >
                      <RefreshCw size={18} /> Reset
                    </button>
                  </div>
                </div>

                {/* Results Section */}
                <div className="flex flex-col rounded-xl bg-slate-50 border border-slate-100 p-6 h-full shadow-inner">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Analysis Status</p>
                      <h3 className="text-xl font-bold text-ink mt-1">{currentStep}</h3>
                    </div>
                    <span className={`grid size-12 place-items-center rounded-xl bg-white shadow-card ${stage === 'complete' ? 'text-green-500' : 'text-printblue-500'}`}>
                      {stage === "complete" ? <CheckCircle2 size={24} /> : <Activity size={24} className={isWorking ? "animate-soft-pulse" : ""} />}
                    </span>
                  </div>

                  {topPrediction ? (
                    <div className="mb-6 animate-slide-up rounded-xl bg-white p-5 shadow-card border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Top Match</p>
                      <div className="mt-3 flex items-end justify-between gap-4">
                        <p className="text-6xl font-black text-printblue-600 tracking-tighter">{topPrediction.label}</p>
                        <div className="text-right pb-1.5">
                          <p className="text-2xl font-bold text-ink">{(topPrediction.confidence * 100).toFixed(1)}%</p>
                          <p className="text-xs font-medium text-slate-500">Confidence</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 rounded-xl border-2 border-dashed border-slate-200 bg-white/50 p-6 text-center text-sm font-medium leading-relaxed text-slate-500">
                      Upload a fingerprint scan to view the predictive analysis results and confidence rankings here.
                    </div>
                  )}

                  <div className="grid gap-3 flex-grow content-start">
                    {predictions.slice(1, 4).map((prediction) => (
                      <div key={prediction.label} className="rounded-lg bg-white p-3.5 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                          <span>{prediction.label}</span>
                          <span>{(prediction.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-printblue-400 transition-all duration-1000"
                            style={{ width: `${Math.max(prediction.confidence * 100, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="history" className="scroll-mt-24 py-20 bg-white border-t border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-printblue-600">Session Data</span>
                <h2 className="mt-4 text-4xl font-bold tracking-tight text-ink">Recent Scans</h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-600">
                  {signedIn ? "Your recent prediction history is synced and available below." : "Predictions are stored locally in your browser. Create an account to sync across devices."}
                </p>
              </div>
              {!signedIn && (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3.5 font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:bg-accent-600"
                  onClick={() => setAuthModal("signup")}
                >
                  <LockKeyhole size={18} /> Create Account
                </button>
              )}
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {history.length ? (
                history.map((item, i) => (
                  <article key={item.id} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-floating hover:border-printblue-200" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="grid size-10 place-items-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-printblue-50 group-hover:text-printblue-500 transition-colors">
                        <History size={18} />
                      </div>
                      <span className="rounded-lg bg-printblue-50 px-3 py-1.5 text-sm font-bold text-printblue-700">
                        {item.label}
                      </span>
                    </div>
                    <h3 className="truncate text-lg font-bold text-ink">{item.fileName}</h3>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Match</p>
                        <p className="font-bold text-ink text-xl">{(item.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Clock3 size={14} />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center md:col-span-2 lg:col-span-4">
                  <Activity className="mx-auto text-slate-300 mb-4" size={48} />
                  <h3 className="text-lg font-bold text-ink">No Recent Scans</h3>
                  <p className="mt-2 text-slate-500">Run a prediction to see your history here.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
