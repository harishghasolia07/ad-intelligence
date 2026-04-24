"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";

type BrandSummary = {
  id: string;
  name: string;
  websiteUrl: string;
  _count?: {
    competitors: number;
  };
};

type Ad = {
  id: string;
  sourceUrl: string | null;
  adText: string | null;
  headline: string | null;
  format: string;
  assets: Array<{ id: string; imageUrl: string; sortOrder: number }>;
  analysis: {
    hookLine: string | null;
    cta: string | null;
    messagingAngle: string | null;
    visualStyle: string | null;
    hasPeople: boolean | null;
    hasTextOverlay: boolean | null;
    productionStyle: string | null;
    productVisibility: string | null;
    creativeCategory: string | null;
    summary: string | null;
  } | null;
};

type Competitor = {
  id: string;
  name: string;
  ads: Ad[];
};

type BrandDetail = {
  id: string;
  name: string;
  websiteUrl: string;
  profileCategory: string | null;
  profilePosition: string | null;
  profileTone: string | null;
  profileAudience: string | null;
  profileValueProps: string | null;
  profileVisual: string | null;
  profileSummary: string | null;
  competitors: Competitor[];
  chatMessages: Array<{ id: string; role: string; content: string }>;
};

type DashboardProps = {
  initialBrands: BrandSummary[];
  initialBrand: BrandDetail | null;
};

async function parseJson(response: Response) {
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message ?? "Request failed");
  }
  return json;
}

export function BrandoraDashboard({ initialBrands, initialBrand }: DashboardProps) {
  const [brands, setBrands] = useState<BrandSummary[]>(initialBrands);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(initialBrand?.id ?? "");
  const [selectedBrand, setSelectedBrand] = useState<BrandDetail | null>(initialBrand);

  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [competitorsInput, setCompetitorsInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [status, setStatus] = useState<string>("Ready");
  const [busy, setBusy] = useState(false);

  const competitorCount = selectedBrand?.competitors.length ?? 0;

  const canAddCompetitors = competitorCount < 3;

  async function loadBrands() {
    const res = await fetch("/api/brands", { cache: "no-store" });
    const json = await parseJson(res);
    setBrands(json.brands);
    return json.brands as BrandSummary[];
  }

  async function loadBrandDetail(brandId: string) {
    const res = await fetch(`/api/brands/${brandId}`, { cache: "no-store" });
    const json = await parseJson(res);
    setSelectedBrand(json.brand);
  }

  async function onSwitchBrand(brandId: string) {
    setSelectedBrandId(brandId);
    if (!brandId) {
      setSelectedBrand(null);
      return;
    }

    try {
      await loadBrandDetail(brandId);
      setStatus("Brand loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load brand detail");
    }
  }

  async function onCreateBrand(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("Analyzing website and creating brand profile...");

    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brandName, websiteUrl }),
      });

      const json = await parseJson(res);
      setBrandName("");
      setWebsiteUrl("");
      setSelectedBrandId(json.brand.id);
      await loadBrands();
      await loadBrandDetail(json.brand.id);
      setStatus("Brand created.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create brand");
    } finally {
      setBusy(false);
    }
  }

  async function onAddCompetitors(event: FormEvent) {
    event.preventDefault();
    if (!selectedBrand) {
      return;
    }

    setBusy(true);
    setStatus("Saving competitors...");

    try {
      const competitors = competitorsInput
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      const res = await fetch(`/api/brands/${selectedBrand.id}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitors }),
      });

      await parseJson(res);
      setCompetitorsInput("");
      await loadBrandDetail(selectedBrand.id);
      await loadBrands();
      setStatus("Competitors saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save competitors");
    } finally {
      setBusy(false);
    }
  }

  async function onIngest(reanalyze = false) {
    if (!selectedBrand) {
      return;
    }

    setBusy(true);
    setStatus(reanalyze ? "Re-analyzing competitor ads..." : "Ingesting competitor ads...");

    try {
      const res = await fetch(`/api/brands/${selectedBrand.id}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perCompetitorLimit: 8, reanalyze }),
      });
      const json = await parseJson(res);
      await loadBrandDetail(selectedBrand.id);
      setStatus(`Ingestion complete: ${json.stats.map((x: { competitorName: string; fetched: number }) => `${x.competitorName} (${x.fetched})`).join(", ")}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ingestion failed");
    } finally {
      setBusy(false);
    }
  }

  async function onChat(event: FormEvent) {
    event.preventDefault();
    if (!selectedBrand || !chatInput.trim()) {
      return;
    }

    const message = chatInput.trim();
    setChatInput("");
    setBusy(true);
    setStatus("Generating grounded response...");

    try {
      const res = await fetch(`/api/brands/${selectedBrand.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      await parseJson(res);
      await loadBrandDetail(selectedBrand.id);
      setStatus("Response generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="brandora-shell">
      <aside className="control-panel">
        <h1 className="headline">Brandora</h1>
        <p className="subhead">Competitive ad intelligence for grounded creative strategy.</p>

        <section className="panel-block">
          <h2>Create Brand</h2>
          <form onSubmit={onCreateBrand} className="stack">
            <input
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder="Brand name"
              required
            />
            <input
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://brand.com"
              type="url"
              required
            />
            <button disabled={busy} type="submit">
              Add Brand
            </button>
          </form>
        </section>

        <section className="panel-block">
          <h2>Switch Brand</h2>
          <select
            value={selectedBrandId}
            onChange={(event) => {
              void onSwitchBrand(event.target.value);
            }}
            disabled={brands.length === 0}
          >
            <option value="">Select a brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </section>

        <section className="panel-block">
          <h2>Add Competitors</h2>
          <form onSubmit={onAddCompetitors} className="stack">
            <textarea
              value={competitorsInput}
              onChange={(event) => setCompetitorsInput(event.target.value)}
              placeholder="nike, adidas, puma"
              rows={3}
              disabled={!selectedBrand || !canAddCompetitors}
            />
            <button disabled={!selectedBrand || !canAddCompetitors || busy} type="submit">
              Save Competitors
            </button>
          </form>
          <p className="hint">Max 3 competitors per brand. Current: {competitorCount}</p>
        </section>

        <section className="panel-block stack">
          <h2>Ingestion</h2>
          <button disabled={!selectedBrand || busy} onClick={() => onIngest(false)} type="button">
            Fetch + Analyze Ads
          </button>
          <button disabled={!selectedBrand || busy} onClick={() => onIngest(true)} type="button">
            Re-run Analysis
          </button>
        </section>

        <div className="status">{status}</div>
      </aside>

      <main className="workspace-panel">
        <header className="workspace-header">
          <p>{selectedBrand ? `${selectedBrand.name} - ${selectedBrand.websiteUrl}` : "No brand selected"}</p>
        </header>

        {!selectedBrand && <p className="empty">Create or select a brand to begin.</p>}

        {selectedBrand && (
          <>
            <section className="profile-card">
              <h2>Brand Profile</h2>
              <div className="profile-grid">
                <p>
                  <strong>Category:</strong> {selectedBrand.profileCategory ?? "-"}
                </p>
                <p>
                  <strong>Positioning:</strong> {selectedBrand.profilePosition ?? "-"}
                </p>
                <p>
                  <strong>Tone:</strong> {selectedBrand.profileTone ?? "-"}
                </p>
                <p>
                  <strong>Audience:</strong> {selectedBrand.profileAudience ?? "-"}
                </p>
                <p>
                  <strong>Value Props:</strong> {selectedBrand.profileValueProps ?? "-"}
                </p>
                <p>
                  <strong>Visual Style:</strong> {selectedBrand.profileVisual ?? "-"}
                </p>
              </div>
              <p className="summary">{selectedBrand.profileSummary}</p>
            </section>

            <section className="ads-section">
              <h2>Competitor Ads + Analysis</h2>
              {selectedBrand.competitors.length === 0 && <p className="empty">No competitors added yet.</p>}

              {selectedBrand.competitors.map((competitor) => (
                <article key={competitor.id} className="competitor-group">
                  <h3>{competitor.name}</h3>
                  {competitor.ads.length === 0 && <p className="empty">No ads fetched yet.</p>}

                  <div className="ad-grid">
                    {competitor.ads.map((ad) => (
                      <div className="ad-card" key={ad.id}>
                        <div className="asset-row">
                          {ad.assets.slice(0, 3).map((asset) => (
                            <Image
                              key={asset.id}
                              src={asset.imageUrl}
                              alt="Ad creative"
                              width={220}
                              height={160}
                              unoptimized
                            />
                          ))}
                        </div>

                        <div className="copy-block">
                          <p>
                            <strong>Format:</strong> {ad.format}
                          </p>
                          <p>
                            <strong>Headline:</strong> {ad.headline ?? "-"}
                          </p>
                          <p>
                            <strong>Copy:</strong> {ad.adText ?? "-"}
                          </p>
                          {ad.sourceUrl && (
                            <p>
                              <a href={ad.sourceUrl} target="_blank" rel="noreferrer">
                                View source ad
                              </a>
                            </p>
                          )}
                        </div>

                        <div className="analysis-block">
                          <p>
                            <strong>Hook:</strong> {ad.analysis?.hookLine ?? "-"}
                          </p>
                          <p>
                            <strong>CTA:</strong> {ad.analysis?.cta ?? "-"}
                          </p>
                          <p>
                            <strong>Angle:</strong> {ad.analysis?.messagingAngle ?? "-"}
                          </p>
                          <p>
                            <strong>Visual:</strong> {ad.analysis?.visualStyle ?? "-"}
                          </p>
                          <p>
                            <strong>People:</strong> {ad.analysis?.hasPeople === null ? "unknown" : ad.analysis?.hasPeople ? "yes" : "no"}
                          </p>
                          <p>
                            <strong>Text Overlay:</strong> {ad.analysis?.hasTextOverlay === null ? "unknown" : ad.analysis?.hasTextOverlay ? "yes" : "no"}
                          </p>
                          <p>
                            <strong>Production:</strong> {ad.analysis?.productionStyle ?? "-"}
                          </p>
                          <p>
                            <strong>Product Visibility:</strong> {ad.analysis?.productVisibility ?? "-"}
                          </p>
                          <p>
                            <strong>Category:</strong> {ad.analysis?.creativeCategory ?? "-"}
                          </p>
                          <p>
                            <strong>Summary:</strong> {ad.analysis?.summary ?? "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            <section className="chat-section">
              <h2>Creative Intelligence Chat</h2>
              <form onSubmit={onChat} className="chat-form">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  rows={3}
                  placeholder="Ask: What hooks are competitors overusing?"
                  required
                />
                <button disabled={busy} type="submit">
                  Ask Brandora
                </button>
              </form>

              <div className="chat-log">
                {selectedBrand.chatMessages.length === 0 && <p className="empty">No chat history yet.</p>}
                {selectedBrand.chatMessages.map((msg) => (
                  <div key={msg.id} className={`chat-bubble ${msg.role}`}>
                    <p className="role">{msg.role}</p>
                    <p>{msg.content}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
