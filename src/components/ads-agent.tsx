"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  BarChart3,
  Check,
  ChevronRight,
  KeyRound,
  Loader2,
  LogOut,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readApiResponse } from "@/lib/api-client";
import type { AdsAccount, Creative, KeywordIdea } from "@/lib/types";

type Config = {
  demoMode: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
};
type FormState = {
  customerId: string;
  company: string;
  description: string;
  url: string;
  seeds: string;
  locationId: string;
  languageId: string;
  minimumVolume: number;
  campaignName: string;
  dailyBudget: number;
  confirmation: string;
};
type SetForm = React.Dispatch<React.SetStateAction<FormState>>;
type BasicActionProps = { onBack(): void; onNext(): void };
const steps = ["Campaign brief", "Keyword review", "Ad creative", "Deploy"];
const money = (micros: number, currency = "AUD") =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(micros / 1_000_000);

export function AdsAgent() {
  const [config, setConfig] = useState<Config | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<AdsAccount[]>([]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [keywords, setKeywords] = useState<KeywordIdea[]>([]);
  const [creative, setCreative] = useState<Creative | null>(null);
  const [result, setResult] = useState<{
    resourceName: string;
    status: string;
  } | null>(null);
  const [projectId, setProjectId] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    company: "Brand Shop",
    description:
      "Brand Shop is a digital marketing and ecommerce growth agency helping online stores improve their Google Ads performance, increase qualified traffic, and generate more sales. Services include Google Ads campaign strategy, keyword research, campaign setup, ad copy creation, conversion tracking guidance, and ongoing optimisation for ecommerce and Shopify businesses.",
    url: "https://brandshop.com.au",
    seeds: "ecommerce marketing, google ads agency, shopify marketing",
    locationId: "2036",
    languageId: "1000",
    minimumVolume: 100,
    campaignName: "Brand Shop | Search",
    dailyBudget: 50,
    confirmation: "",
  });

  const selected = useMemo(
    () =>
      keywords.filter(
        (item) =>
          item.selected &&
          !item.negative &&
          item.monthlySearches >= form.minimumVolume,
      ),
    [keywords, form.minimumVolume],
  );
  const account = accounts.find((item) => item.id === form.customerId);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((value: Config) => {
        setConfig(value);
        if (!value.demoMode && value.supabaseUrl && value.supabaseAnonKey) {
          const supabase = createClient(
            value.supabaseUrl,
            value.supabaseAnonKey,
          );
          setClient(supabase);
          supabase.auth
            .getSession()
            .then(({ data }) => setToken(data.session?.access_token || ""));
        }
      });
  }, []);

  useEffect(() => {
    if (!config || (!config.demoMode && !token)) return;
    const requestHeaders = token
      ? { authorization: `Bearer ${token}` }
      : undefined;
    fetch("/api/accounts", { headers: requestHeaders })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Could not load Google Ads accounts");
        setAccounts(data.accounts);
        setForm((old) => ({
          ...old,
          customerId: old.customerId || data.accounts[0]?.id || "",
        }));
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load Google Ads accounts",
        ),
      );
  }, [config, token]);

  const headers = () => ({
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  });
  async function call(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: { ...headers(), ...(init?.headers || {}) },
    });
    return readApiResponse(response);
  }
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!client) return setError("Supabase is not configured");
    const { data, error: authError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) return setError(authError.message);
    setToken(data.session.access_token);
  }
  async function research() {
    setBusy("research");
    setError("");
    try {
      const data = await call("/api/research", {
        method: "POST",
        body: JSON.stringify({
          customerId: form.customerId,
          company: form.company,
          description: form.description,
          url: form.url,
          seeds: form.seeds
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          locationIds: [form.locationId],
          languageId: form.languageId,
          minimumVolume: form.minimumVolume,
        }),
      });
      setKeywords(data.keywords);
      setProjectId(data.projectId || "");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research failed");
    } finally {
      setBusy("");
    }
  }
  async function generate() {
    setBusy("creative");
    setError("");
    try {
      const data = await call("/api/creative", {
        method: "POST",
        body: JSON.stringify({
          company: form.company,
          description: form.description,
          finalUrl: form.url,
          keywords: selected.map((item) => item.text),
          projectId,
        }),
      });
      setCreative(data.creative);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creative generation failed");
    } finally {
      setBusy("");
    }
  }
  async function deploy() {
    if (!creative) return;
    setBusy("deploy");
    setError("");
    try {
      const data = await call("/api/campaign", {
        method: "POST",
        body: JSON.stringify({
          confirmation: form.confirmation,
          projectId,
          campaign: {
            customerId: form.customerId,
            campaignName: form.campaignName,
            dailyBudgetMicros: Math.round(form.dailyBudget * 1_000_000),
            locationIds: [form.locationId],
            languageId: form.languageId,
            finalUrl: form.url,
            groups: [
              {
                name: `${form.company} — Core Search`,
                keywords: selected.map((item) => ({
                  text: item.text,
                  matchType: "PHRASE",
                })),
                negativeKeywords: keywords
                  .filter((item) => item.negative)
                  .map((item) => item.text),
                creative,
              },
            ],
          },
        }),
      });
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Campaign creation failed");
    } finally {
      setBusy("");
    }
  }

  if (!config) return <Loading label="Loading workspace" />;
  if (!config.demoMode && !token)
    return (
      <Login
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        onSubmit={signIn}
        error={error}
      />
    );

  return (
    <main className="min-h-screen">
      <div className="bg-[#fdc808] px-5 py-2 text-center text-sm font-bold text-black">
        Brand Shop Google Ads campaign workspace
      </div>
      <header className="border-b border-[#ededed] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="text-[24px] font-bold leading-[31px] text-black">
                Brand Shop
              </div>
              <div className="text-[15px] font-normal leading-[22px] text-[#2a2a2a]">
                Google Ads AI Agent
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {config.demoMode && (
              <span className="rounded-[5px] bg-[#fdc808] px-3 py-1 text-xs font-bold text-black">
                DEMO MODE
              </span>
            )}
            <span className="hidden text-sm text-[#7e7e7e] sm:inline">
              {config.demoMode ? "Demo Administrator" : email}
            </span>
            {!config.demoMode && (
              <button
                className="secondary !p-2"
                onClick={() => client?.auth.signOut().then(() => setToken(""))}
                aria-label="Sign out"
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-7">
          <p className="mb-2 text-sm font-bold uppercase tracking-[.18em] text-black">
            Campaign workspace
          </p>
          <h1 className="max-w-3xl text-[30px] font-bold leading-[39px] text-black">
            Build a safer search campaign
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] font-normal leading-[28px] text-[#2a2a2a]">
            Research demand, remove irrelevant intent, create compliant ads, and
            deploy only after final review.
          </p>
        </div>
        <nav className="mb-7 grid gap-2 sm:grid-cols-4" aria-label="Workflow">
          {steps.map((label, index) => (
            <button
              key={label}
              onClick={() => index <= step && setStep(index)}
              className={`flex items-center gap-3 rounded-[5px] border px-4 py-3 text-left text-sm font-bold ${step === index ? "border-[#fdc808] bg-[#fdc808] text-black" : index < step ? "border-[#fdc808] bg-[#fff8d6] text-black" : "border-[#ededed] bg-white text-[#7e7e7e]"}`}
            >
              <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-white/20">
                {index < step ? <Check size={15} /> : index + 1}
              </span>
              {label}
            </button>
          ))}
        </nav>
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-[5px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          >
            {error}
          </div>
        )}
        {step === 0 && (
          <Brief
            form={form}
            setForm={setForm}
            accounts={accounts}
            busy={busy === "research"}
            onSubmit={research}
          />
        )}
        {step === 1 && (
          <Keywords
            keywords={keywords}
            setKeywords={setKeywords}
            threshold={form.minimumVolume}
            selectedCount={selected.length}
            busy={busy === "creative"}
            onBack={() => setStep(0)}
            onNext={generate}
          />
        )}
        {step === 2 && creative && (
          <CreativeReview
            creative={creative}
            setCreative={setCreative}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && creative && (
          <Deploy
            form={form}
            setForm={setForm}
            account={account}
            keywords={selected}
            creative={creative}
            busy={busy === "deploy"}
            result={result}
            onBack={() => setStep(2)}
            onDeploy={deploy}
          />
        )}
      </div>
    </main>
  );
}

function BrandMark() {
  return <div className="brand-mark" aria-label="Brand Shop logo">BS</div>;
}

function Loading({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex items-center gap-3 font-bold text-[#2a2a2a]">
        <Loader2 className="animate-spin" /> {label}
      </div>
    </div>
  );
}
function Login(props: {
  email: string;
  password: string;
  setEmail(v: string): void;
  setPassword(v: string): void;
  onSubmit(e: React.FormEvent): void;
  error: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form className="card w-full max-w-md p-8" onSubmit={props.onSubmit}>
        <div className="mb-6 flex items-center gap-3">
          <BrandMark />
          <KeyRound className="text-black" />
        </div>
        <h1>Team sign in</h1>
        <p className="mb-6 mt-2 text-[17px] leading-[28px] text-[#2a2a2a]">
          Use your Brand Shop invitation credentials.
        </p>
        {props.error && (
          <p className="mb-4 rounded-[5px] bg-red-50 p-3 text-sm text-red-700">
            {props.error}
          </p>
        )}
        <label className="label">Email</label>
        <input
          className="field mb-4"
          type="email"
          value={props.email}
          onChange={(e) => props.setEmail(e.target.value)}
          required
        />
        <label className="label">Password</label>
        <input
          className="field mb-6"
          type="password"
          value={props.password}
          onChange={(e) => props.setPassword(e.target.value)}
          required
        />
        <button className="primary w-full">Sign in</button>
      </form>
    </main>
  );
}

function Brief({
  form,
  setForm,
  accounts,
  busy,
  onSubmit,
}: {
  form: FormState;
  setForm: SetForm;
  accounts: AdsAccount[];
  busy: boolean;
  onSubmit(): void;
}) {
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((old) => ({ ...old, [key]: value }));
  return (
    <section className="card p-5 sm:p-7">
      <div className="mb-6 flex items-start gap-3">
        <Sparkles className="mt-1 text-black" />
        <div>
          <h2 className="text-[30px] font-bold leading-[39px] text-black">
            Tell the agent what you are advertising
          </h2>
          <p className="text-[17px] leading-[28px] text-[#2a2a2a]">
            Use factual information. The AI will not invent offers or
            guarantees.
          </p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Google Ads account">
          <select
            className="field"
            value={form.customerId}
            onChange={(e) => update("customerId", e.target.value)}
          >
            {accounts.map((a: AdsAccount) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.id})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Company or product">
          <input
            className="field"
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
          />
        </Field>
        <Field label="Landing-page URL">
          <input
            className="field"
            type="url"
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
          />
        </Field>
        <Field label="Seed keywords, separated by commas">
          <input
            className="field"
            value={form.seeds}
            onChange={(e) => update("seeds", e.target.value)}
          />
        </Field>
        <Field label="Google location criterion ID">
          <input
            className="field"
            value={form.locationId}
            onChange={(e) => update("locationId", e.target.value)}
          />
          <small className="text-[#7e7e7e]">
            Australia: 2036 · United States: 2840
          </small>
        </Field>
        <Field label="Language criterion ID">
          <input
            className="field"
            value={form.languageId}
            onChange={(e) => update("languageId", e.target.value)}
          />
          <small className="text-[#7e7e7e]">English: 1000</small>
        </Field>
        <Field label={`Minimum monthly searches: ${form.minimumVolume}`}>
          <input
            className="w-full accent-[#fdc808]"
            type="range"
            min="0"
            max="1000"
            step="10"
            value={form.minimumVolume}
            onChange={(e) => update("minimumVolume", Number(e.target.value))}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Business, service and offer description">
            <textarea
              className="field min-h-28"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          className="primary flex items-center gap-2"
          onClick={onSubmit}
          disabled={busy || !form.customerId}
        >
          {busy ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Search size={18} />
          )}
          Research keywords
        </button>
      </div>
    </section>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Keywords({
  keywords,
  setKeywords,
  threshold,
  selectedCount,
  busy,
  onBack,
  onNext,
}: {
  keywords: KeywordIdea[];
  setKeywords: React.Dispatch<React.SetStateAction<KeywordIdea[]>>;
  threshold: number;
  selectedCount: number;
  busy: boolean;
} & BasicActionProps) {
  const toggle = (index: number, key: "selected" | "negative") =>
    setKeywords((old: KeywordIdea[]) =>
      old.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]: !item[key],
              ...(key === "negative" && !item.negative
                ? { selected: false }
                : {}),
            }
          : item,
      ),
    );
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b border-[#ededed] p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-black">Review keyword opportunities</h2>
          <p className="text-sm text-[#2a2a2a]">
            {selectedCount} selected above {threshold} monthly searches
          </p>
        </div>
        <span className="rounded-[5px] bg-[#fff8d6] px-3 py-2 text-sm font-bold text-black">
          AI relevance applied
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-[#f8f8f8] text-left text-xs uppercase tracking-wide text-[#2a2a2a]">
            <tr>
              <th className="p-4">Use</th>
              <th className="p-4">Keyword</th>
              <th className="p-4">Monthly searches</th>
              <th className="p-4">Competition</th>
              <th className="p-4">Top bid</th>
              <th className="p-4">Relevance</th>
              <th className="p-4">Negative</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((k: KeywordIdea, i: number) => (
              <tr
                key={k.text}
                className={`border-t border-[#ededed] ${k.monthlySearches < threshold ? "opacity-45" : ""}`}
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#fdc808]"
                    checked={k.selected}
                    onChange={() => toggle(i, "selected")}
                  />
                </td>
                <td className="p-4 font-bold">
                  {k.text}
                  <div className="mt-1 text-xs font-normal text-[#7e7e7e]">
                    {k.intent}
                  </div>
                </td>
                <td className="p-4 font-semibold">
                  {k.monthlySearches.toLocaleString()}
                </td>
                <td className="p-4">{k.competition}</td>
                <td className="p-4">{money(k.highTopPageBidMicros)}</td>
                <td className="p-4">
                  <span
                    className={`rounded-[5px] px-2 py-1 text-xs font-bold ${k.relevance >= 70 ? "bg-[#fff8d6] text-black" : "bg-red-50 text-red-800"}`}
                  >
                    {k.relevance}%
                  </span>
                </td>
                <td className="p-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-red-600"
                    checked={k.negative}
                    onChange={() => toggle(i, "negative")}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Actions
        back={onBack}
        next={onNext}
        nextLabel="Generate ad creative"
        disabled={!selectedCount || busy}
        busy={busy}
      />
    </section>
  );
}

function CreativeReview({
  creative,
  setCreative,
  onBack,
  onNext,
}: {
  creative: Creative;
  setCreative: React.Dispatch<React.SetStateAction<Creative | null>>;
} & BasicActionProps) {
  const setItem = (type: "headlines" | "descriptions", i: number, v: string) =>
    setCreative((old) =>
      old
        ? { ...old, [type]: old[type].map((x, j) => (i === j ? v : x)) }
        : old,
    );
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
      <div className="card p-5 sm:p-7">
        <h2 className="text-xl font-bold">Responsive Search Ad</h2>
        <p className="mb-6 text-sm text-[#2a2a2a]">
          Edit every asset before deployment.
        </p>
        <h3 className="mb-3 font-bold">Headlines</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {creative.headlines.map((v: string, i: number) => (
            <label key={i}>
              <input
                className="field"
                value={v}
                maxLength={30}
                onChange={(e) => setItem("headlines", i, e.target.value)}
              />
              <span className="float-right mt-1 text-xs text-[#7e7e7e]">
                {v.length}/30
              </span>
            </label>
          ))}
        </div>
        <h3 className="mb-3 mt-7 font-bold">Descriptions</h3>
        <div className="space-y-3">
          {creative.descriptions.map((v: string, i: number) => (
            <label key={i} className="block">
              <textarea
                className="field min-h-20"
                value={v}
                maxLength={90}
                onChange={(e) => setItem("descriptions", i, e.target.value)}
              />
              <span className="float-right text-xs text-[#7e7e7e]">
                {v.length}/90
              </span>
            </label>
          ))}
        </div>
      </div>
      <aside className="card h-fit p-5">
        <h3 className="mb-4 font-bold">Search preview</h3>
        <p className="text-xs text-[#7e7e7e]">
          Sponsored ·{" "}
          {
            new URL(creative.sitelinks[0]?.finalUrl || "https://example.com")
              .hostname
          }
        </p>
        <p className="mt-2 text-xl font-semibold text-black">
          {creative.headlines.slice(0, 3).join(" | ")}
        </p>
        <p className="mt-2 text-sm text-[#2a2a2a]">
          {creative.descriptions[0]}
        </p>
        <div className="mt-5 border-t pt-4">
          <h4 className="mb-2 text-xs font-bold uppercase text-[#2a2a2a]">
            Sitelinks
          </h4>
          {creative.sitelinks.map((s) => (
            <div key={s.text} className="mb-3">
              <div className="font-bold text-black underline decoration-[#fdc808] decoration-2 underline-offset-4">{s.text}</div>
              <div className="text-xs text-[#2a2a2a]">
                {s.description1} · {s.description2}
              </div>
            </div>
          ))}
        </div>
      </aside>
      <div className="lg:col-span-2">
        <Actions back={onBack} next={onNext} nextLabel="Review campaign" />
      </div>
    </section>
  );
}

function Deploy({
  form,
  setForm,
  account,
  keywords,
  creative,
  busy,
  result,
  onBack,
  onDeploy,
}: {
  form: FormState;
  setForm: SetForm;
  account?: AdsAccount;
  keywords: KeywordIdea[];
  creative: Creative;
  busy: boolean;
  result: { resourceName: string; status: string } | null;
  onBack(): void;
  onDeploy(): void;
}) {
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((old) => ({ ...old, [key]: value }));
  if (result)
    return (
      <section className="card p-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[5px] bg-[#fff8d6] text-black">
          <Check size={34} />
        </div>
        <h2 className="text-2xl font-bold">Paused campaign created</h2>
        <p className="mt-2 text-[#2a2a2a]">
          Review it inside Google Ads before enabling it.
        </p>
        <code className="mt-5 inline-block rounded-[5px] bg-[#f8f8f8] p-3 text-xs">
          {result.resourceName}
        </code>
      </section>
    );
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
      <div className="card p-5 sm:p-7">
        <h2 className="text-xl font-bold">Final campaign review</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Campaign name">
            <input
              className="field"
              value={form.campaignName}
              onChange={(e) => update("campaignName", e.target.value)}
            />
          </Field>
          <Field label="Daily budget (account currency)">
            <input
              className="field"
              type="number"
              min="1"
              value={form.dailyBudget}
              onChange={(e) => update("dailyBudget", Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="mt-6 grid gap-3 rounded-[5px] bg-[#f8f8f8] p-4 text-sm">
          <Summary
            label="Account"
            value={`${account?.name || "Selected account"} (${form.customerId})`}
          />
          <Summary
            label="Keywords"
            value={`${keywords.length} phrase-match keywords`}
          />
          <Summary
            label="Negative keywords"
            value="Automatically excluded intent terms"
          />
          <Summary
            label="Ad assets"
            value={`${creative.headlines.length} headlines · ${creative.descriptions.length} descriptions`}
          />
          <Summary label="Status" value="PAUSED (locked)" />
        </div>
        <div className="mt-6 rounded-[5px] border border-[#fdc808] bg-[#fff8d6] p-4">
          <label className="label !text-black">
            Type CREATE PAUSED CAMPAIGN to confirm
          </label>
          <input
            className="field"
            value={form.confirmation}
            onChange={(e) => update("confirmation", e.target.value)}
          />
        </div>
      </div>
      <aside className="card h-fit p-5">
        <div className="flex items-center gap-2 text-black">
          <ShieldCheck />
          <h3 className="font-bold">Deployment safeguards</h3>
        </div>
        <ul className="mt-4 space-y-3 text-sm text-[#2a2a2a]">
          <li>✓ Admin permission required</li>
          <li>✓ Campaign status forced to Paused</li>
          <li>✓ Google character limits validated</li>
          <li>✓ Explicit confirmation required</li>
        </ul>
        <button
          className="primary mt-6 flex w-full items-center justify-center gap-2"
          onClick={onDeploy}
          disabled={busy || form.confirmation !== "CREATE PAUSED CAMPAIGN"}
        >
          {busy ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Megaphone size={18} />
          )}
          Create paused campaign
        </button>
      </aside>
      <div className="lg:col-span-2">
        <button className="secondary" onClick={onBack}>
          Back to creative
        </button>
      </div>
    </section>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#2a2a2a]">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}
function Actions({
  back,
  next,
  nextLabel,
  disabled = false,
  busy = false,
}: {
  back(): void;
  next(): void;
  nextLabel: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[#ededed] p-5">
      <button className="secondary" onClick={back}>
        Back
      </button>
      <button
        className="primary flex items-center gap-2"
        onClick={next}
        disabled={disabled}
      >
        {busy ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <BarChart3 size={18} />
        )}{" "}
        {nextLabel}
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
