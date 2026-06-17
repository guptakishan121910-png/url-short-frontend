import { BarChart3, Check, Copy, ExternalLink, Link2, RefreshCw } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { type Analytics, type Link, createLink, fetchAnalytics, fetchLinks } from "./api";

export function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>();
  const [analytics, setAnalytics] = useState<Analytics>();
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const selectedLink = useMemo(
    () => links.find((link) => link.code === selectedCode) ?? links[0],
    [links, selectedCode]
  );

  useEffect(() => {
    void loadLinks();
  }, []);

  useEffect(() => {
    if (!selectedLink) {
      setAnalytics(undefined);
      return;
    }

    void loadAnalytics(selectedLink.code);
  }, [selectedLink?.code]);

  const refreshCurrentData = useCallback(async () => {
    try {
      const data = await fetchLinks();
      setLinks(data.links);

      if (selectedCode) {
        const exists = data.links.some((link) => link.code === selectedCode);
        setSelectedCode(exists ? selectedCode : data.links[0]?.code);
        if (exists) {
          await loadAnalytics(selectedCode);
        }
      }
    } catch {
      // Silent refresh should not interrupt the form while the user is typing.
    }
  }, [selectedCode]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshCurrentData();
    }, 5000);

    function refreshWhenVisible() {
      if (!document.hidden) {
        void refreshCurrentData();
      }
    }

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshCurrentData]);

  async function loadLinks(preferredCode?: string) {
    setStatus("loading");
    setError("");

    try {
      const data = await fetchLinks();
      setLinks(data.links);
      setSelectedCode((current) => preferredCode ?? current ?? data.links[0]?.code);
    } catch (requestError) {
      setError(getMessage(requestError));
    } finally {
      setStatus("idle");
    }
  }

  async function loadAnalytics(code: string) {
    try {
      const data = await fetchAnalytics(code);
      setAnalytics(data.analytics);
      setLinks((current) =>
        current.map((link) =>
          link.code === code ? { ...link, clickCount: data.analytics.totalClicks } : link
        )
      );
    } catch (requestError) {
      setError(getMessage(requestError));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");

    try {
      const link = await createLink({ url, alias: alias || undefined });
      setLinks((current) => [link, ...current]);
      setSelectedCode(link.code);
      setAnalytics({
        totalClicks: 0,
        daily: [],
        referrers: [],
        devices: []
      });
      setUrl("");
      setAlias("");
      await loadLinks(link.code);
      await loadAnalytics(link.code);
    } catch (requestError) {
      setError(getMessage(requestError));
    } finally {
      setStatus("idle");
    }
  }

  async function copyShortUrl(link: Link) {
    await navigator.clipboard.writeText(link.shortUrl);
    setCopiedCode(link.code);
    window.setTimeout(() => setCopiedCode(""), 1400);
  }

  return (
    <main className="shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Trim</p>
            <h1>Short links </h1>
            <p className="subtitle">Create short links, track clicks, and keep analytics easy to read.</p>
          </div>
          <button className="iconButton" onClick={() => void loadLinks()} title="Refresh links">
            <RefreshCw size={18} />
          </button>
        </header>

        <form className="creator" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Long URL
            <input
              required
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <label>
            Custom alias
            <input
              placeholder="optional"
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              maxLength={32}
            />
          </label>
          <button className="primary" disabled={status === "saving"}>
            <Link2 size={18} />
            {status === "saving" ? "Creating..." : "Create"}
          </button>
        </form>

        {error ? <div className="error">{error}</div> : null}

        <section className="contentGrid">
          <div className="panel linksPanel">
            <div className="panelHeader">
              <h2>Links</h2>
              <span>{links.length} total</span>
            </div>

            <div className="linkList">
              {links.length === 0 && status !== "loading" ? (
                <div className="empty">Create your first short link to see it here.</div>
              ) : null}

              {links.map((link) => (
                <button
                  className={link.code === selectedLink?.code ? "linkRow active" : "linkRow"}
                  key={link.code}
                  onClick={() => setSelectedCode(link.code)}
                >
                  <span>
                    <strong>/{link.code}</strong>
                    <small>{link.originalUrl}</small>
                  </span>
                  <b>{link.clickCount}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="panel detailPanel">
            {selectedLink ? (
              <>
                <div className="panelHeader">
                  <div>
                    <h2>/{selectedLink.code}</h2>
                    <a href={selectedLink.shortUrl} target="_blank" rel="noreferrer">
                      {selectedLink.shortUrl}
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <button
                    className="iconButton"
                    onClick={() => void copyShortUrl(selectedLink)}
                    title={copiedCode === selectedLink.code ? "Copied" : "Copy short URL"}
                  >
                    {copiedCode === selectedLink.code ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="stats">
                  <div>
                    <span>Total clicks</span>
                    <strong>{analytics?.totalClicks ?? selectedLink.clickCount}</strong>
                  </div>
                  <div>
                    <span>Created</span>
                    <strong>{new Date(selectedLink.createdAt).toLocaleDateString()}</strong>
                  </div>
                </div>

                <AnalyticsView analytics={analytics} />
              </>
            ) : (
              <div className="empty large">
                <BarChart3 size={34} />
                Analytics will appear after you create a link.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function AnalyticsView({ analytics }: { analytics?: Analytics }) {
  if (!analytics) {
    return <div className="empty">Loading analytics...</div>;
  }

  const maxDaily = Math.max(...analytics.daily.map((item) => item.clicks), 1);

  return (
    <div className="analyticsGrid">
      <section>
        <h3>Clicks per day</h3>
        <div className="bars">
          {analytics.daily.length === 0 ? <div className="empty">No clicks yet.</div> : null}
          {analytics.daily.map((item) => (
            <div className="barRow" key={item.date}>
              <span>{item.date.slice(5)}</span>
              <div>
                <i style={{ width: `${Math.max((item.clicks / maxDaily) * 100, 6)}%` }} />
              </div>
              <b>{item.clicks}</b>
            </div>
          ))}
        </div>
      </section>

      <Breakdown title="Referrers" rows={analytics.referrers} />
      <Breakdown title="Devices" rows={analytics.devices} />
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ name: string; clicks: number }> }) {
  const total = rows.reduce((sum, row) => sum + row.clicks, 0) || 1;

  return (
    <section>
      <h3>{title}</h3>
      <div className="breakdown">
        {rows.length === 0 ? <div className="empty">No data yet.</div> : null}
        {rows.map((row) => (
          <div className="breakdownRow" key={row.name}>
            <span>{row.name}</span>
            <div>
              <i style={{ width: `${Math.max((row.clicks / total) * 100, 6)}%` }} />
            </div>
            <b>{row.clicks}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}
